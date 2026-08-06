/**
 * WebTrack data store — same public API either way, two backends underneath:
 *
 *  - Supabase (Postgres), used automatically whenever SUPABASE_URL /
 *    SUPABASE_SERVICE_ROLE_KEY are set. A real shared database, so data
 *    survives across Vercel's separate serverless instances and cold
 *    starts instead of living in one container's ephemeral /tmp.
 *  - The local JSON file (backend/data/webtrack.json), used automatically
 *    when no Supabase credentials are configured — e.g. local `npm run dev`.
 *    Exactly the same behaviour as before.
 *
 * Every route/model calls store.<collection>.find/insert/update/delete
 * synchronously, assuming `db` already holds the current data. To keep that
 * contract while still being correct on serverless:
 *   - reload() re-fetches everything fresh at the start of every request
 *     (see the middleware in server.js), so no request ever reads data left
 *     over from a different container.
 *   - mutations mark their collection "dirty" instead of writing
 *     immediately; flushPending() persists only what's dirty, and server.js
 *     calls it right before the response is sent — so a write always lands
 *     before the serverless function can freeze.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLLECTIONS = ['admins', 'clients', 'projects', 'payments', 'domains', 'activities', 'employees', 'employeePayments'];
const emptyDb = () => Object.fromEntries(COLLECTIONS.map((c) => [c, []]));

/** Mongo-style 24-char hex id, so ids look and slice the same as before. */
const oid = () => crypto.randomBytes(12).toString('hex');

const nowIso = () => new Date().toISOString();

/** Normalises anything date-ish to an ISO string (or null). */
function toDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

let db = emptyDb();
let dirty = new Set();

function markDirty(name) {
  if (name) dirty.add(name);
  else COLLECTIONS.forEach((c) => dirty.add(c));
}

/* ── Backend selection ────────────────────────────────────────────── */
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/* ── Supabase (Postgres) backend ──────────────────────────────────── *
 * One table per collection (see backend/store/supabase.sql for the exact
 * schema), each row shaped as { id text primary key, doc jsonb }. `doc`
 * holds the full record exactly as the rest of the app already expects it
 * (_id, createdAt, updatedAt, ...) — so matches()/applySort() below don't
 * need to know or care which backend is active.
 *
 * The service_role key is required (not the anon key): it's what lets this
 * trusted backend server bypass Row Level Security and do full CRUD. It
 * must never be sent to the frontend or used anywhere in browser code.
 */
let supabase = null;
if (USE_SUPABASE) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** collection name → Postgres table name (snake_case). */
const TABLES = {
  admins: 'admins',
  clients: 'clients',
  projects: 'projects',
  payments: 'payments',
  domains: 'domains',
  activities: 'activities',
  employees: 'employees',
  employeePayments: 'employee_payments',
};

async function supabaseLoad() {
  const next = emptyDb();
  await Promise.all(
    COLLECTIONS.map(async (name) => {
      const { data, error } = await supabase.from(TABLES[name]).select('doc');
      if (error) throw new Error(`Supabase load failed for "${name}": ${error.message}`);
      next[name] = (data || []).map((row) => row.doc);
    })
  );
  db = next;
}

/** Full collection replace (delete-all then re-insert) — same "whole
 *  collection is one unit" semantics as the file/Firestore backends, so
 *  there's no per-row diffing to get wrong. Fine at this app's scale. */
async function supabaseFlush(names) {
  await Promise.all(
    [...names].map(async (name) => {
      const table = TABLES[name];
      const { error: delErr } = await supabase.from(table).delete().neq('id', '');
      if (delErr) throw new Error(`Supabase clear failed for "${name}": ${delErr.message}`);

      const rows = db[name];
      if (!rows.length) return;
      const { error: insErr } = await supabase.from(table).insert(rows.map((r) => ({ id: r._id, doc: r })));
      if (insErr) throw new Error(`Supabase insert failed for "${name}": ${insErr.message}`);
    })
  );
}

/* ── Local JSON file backend ──────────────────────────────────────── */
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'webtrack.json');
const TMP_FILE = `${DATA_FILE}.tmp`;
let fileLoaded = false;

function fileLoad() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      db = { ...emptyDb(), ...parsed };
    } else {
      db = emptyDb();
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    }
  } catch (err) {
    console.error(`⚠️  Could not read ${DATA_FILE} (${err.message}) — starting with an empty database.`);
    db = emptyDb();
  }
}

/** Atomic write: temp file first, then rename, so a crash can't truncate the data. */
function fileFlush() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TMP_FILE, JSON.stringify(db, null, 2));
    fs.renameSync(TMP_FILE, DATA_FILE);
  } catch (err) {
    console.error('💾  Failed to save the database:', err.message);
  }
}

/* ── Unified reload / flush ───────────────────────────────────────── *
 * reload() re-reads everything fresh on Supabase (small dataset, cheap —
 * this is what keeps two different serverless instances from disagreeing).
 * On the file backend it's a no-op after the first call, since the same
 * process already holds the authoritative in-memory copy, same as before.
 */
async function reload() {
  if (USE_SUPABASE) {
    await supabaseLoad();
  } else if (!fileLoaded) {
    fileLoad();
    fileLoaded = true;
  }
}

/** Persists every collection touched since the last flush. */
async function flushPending() {
  if (!dirty.size) return;
  const names = dirty;
  dirty = new Set();
  if (USE_SUPABASE) {
    await supabaseFlush(names);
  } else {
    fileFlush();
  }
}

/** Marks a collection dirty (or every collection, if called with no name). */
function save(name) {
  markDirty(name);
}

/** Marks dirty and flushes immediately — for scripts (seed.js) that run
 *  outside the request/response cycle and have no middleware to flush for them. */
async function saveNow(name) {
  markDirty(name);
  await flushPending();
}

/* ── Filtering ─────────────────────────────────────────────── */
function valueMatches(actual, expected) {
  if (expected instanceof RegExp) return expected.test(actual == null ? '' : String(actual));

  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Object.entries(expected).every(([op, target]) => {
      switch (op) {
        case '$gte':
          return new Date(actual) >= new Date(target);
        case '$lte':
          return new Date(actual) <= new Date(target);
        case '$gt':
          return new Date(actual) > new Date(target);
        case '$lt':
          return new Date(actual) < new Date(target);
        case '$ne':
          return String(actual) !== String(target);
        case '$in':
          return target.includes(actual);
        default:
          return false;
      }
    });
  }

  if (expected === null) return actual === null || actual === undefined;
  return String(actual) === String(expected);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some((sub) => matches(doc, sub));
    if (key === '$and') return expected.every((sub) => matches(doc, sub));
    return valueMatches(doc[key], expected);
  });
}

/** Supports Mongo-style sort strings: 'name', '-createdAt', '-createdAt name'. */
function applySort(rows, sort) {
  if (!sort) return rows;
  const keys = sort.split(/\s+/).filter(Boolean).map((k) => (k.startsWith('-') ? [k.slice(1), -1] : [k, 1]));

  return [...rows].sort((a, b) => {
    for (const [key, dir] of keys) {
      const av = a[key];
      const bv = b[key];
      // Null / undefined always sort last, whichever direction we're going.
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;

      const an = typeof av === 'number' ? av : Date.parse(av);
      const bn = typeof bv === 'number' ? bv : Date.parse(bv);
      let cmp;
      if (!Number.isNaN(an) && !Number.isNaN(bn)) cmp = an - bn;
      else cmp = String(av).localeCompare(String(bv));

      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });
}

/* ── Collection ────────────────────────────────────────────── */
class Collection {
  constructor(name) {
    this.name = name;
  }

  get rows() {
    return db[this.name];
  }

  find(filter = {}, { sort, limit } = {}) {
    let rows = this.rows.filter((d) => matches(d, filter));
    rows = applySort(rows, sort);
    return limit ? rows.slice(0, limit) : rows;
  }

  findOne(filter = {}) {
    return this.rows.find((d) => matches(d, filter)) || null;
  }

  findById(id) {
    if (!id) return null;
    return this.rows.find((d) => d._id === String(id)) || null;
  }

  count(filter = {}) {
    return filter && Object.keys(filter).length ? this.find(filter).length : this.rows.length;
  }

  insert(doc) {
    const now = nowIso();
    const record = { _id: oid(), createdAt: now, updatedAt: now, ...doc };
    record._id = record._id || oid();
    this.rows.push(record);
    markDirty(this.name);
    return record;
  }

  /** Applies a patch to a live document and stamps updatedAt. */
  update(doc, patch = {}) {
    Object.assign(doc, patch, { updatedAt: nowIso() });
    markDirty(this.name);
    return doc;
  }

  /** Persists in-place mutations made directly on a document. */
  touch(doc) {
    doc.updatedAt = nowIso();
    markDirty(this.name);
    return doc;
  }

  deleteOne(filter = {}) {
    const rows = this.rows;
    const i = rows.findIndex((d) => matches(d, filter));
    if (i === -1) return 0;
    rows.splice(i, 1);
    markDirty(this.name);
    return 1;
  }

  deleteMany(filter = {}) {
    const rows = this.rows;
    const keep = rows.filter((d) => !matches(d, filter));
    const removed = rows.length - keep.length;
    rows.length = 0;
    rows.push(...keep);
    if (removed) markDirty(this.name);
    return removed;
  }
}

const store = {
  admins: new Collection('admins'),
  clients: new Collection('clients'),
  projects: new Collection('projects'),
  payments: new Collection('payments'),
  domains: new Collection('domains'),
  activities: new Collection('activities'),
  employees: new Collection('employees'),
  employeePayments: new Collection('employeePayments'),

  oid,
  toDate,
  nowIso,
  save,
  saveNow,
  reload,
  flushPending,
  DATA_FILE,
  usingSupabase: USE_SUPABASE,

  async init() {
    await reload();
    const counts = COLLECTIONS.map((c) => `${db[c].length} ${c}`).join(', ');
    console.log(`🗄️   Data store ready → ${USE_SUPABASE ? 'Supabase (' + process.env.SUPABASE_URL + ')' : DATA_FILE}`);
    console.log(`    ${counts}`);
    return store;
  },

  /** Wipes everything except admin accounts (used by the seeder). */
  resetBusinessData() {
    ['clients', 'projects', 'payments', 'domains', 'activities', 'employees', 'employeePayments'].forEach((c) => {
      db[c].length = 0;
      markDirty(c);
    });
  },
};

module.exports = store;
