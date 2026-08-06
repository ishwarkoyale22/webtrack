/**
 * WebTrack data store — a small file-backed JSON database.
 *
 * No database server, no native modules, no extra npm packages: everything
 * lives in backend/data/webtrack.json and persists across restarts. The API
 * exposed here covers exactly what the routes need (find / insert / update /
 * delete with simple filters and sorting).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'webtrack.json');
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'webtrack.json');
const TMP_FILE = `${DATA_FILE}.tmp`;

const COLLECTIONS = ['admins', 'clients', 'projects', 'payments', 'domains', 'activities', 'employees', 'employeePayments'];
const emptyDb = () => Object.fromEntries(COLLECTIONS.map((c) => [c, []]));

let db = null;
let flushTimer = null;

/** Mongo-style 24-char hex id, so ids look and slice the same as before. */
const oid = () => crypto.randomBytes(12).toString('hex');

const nowIso = () => new Date().toISOString();

/** Normalises anything date-ish to an ISO string (or null). */
function toDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function load() {
  if (db) return db;
  try {
    if (!fs.existsSync(DATA_FILE) && fs.existsSync(DEFAULT_DATA_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.copyFileSync(DEFAULT_DATA_FILE, DATA_FILE);
    }
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
  return db;
}

/** Atomic write: temp file first, then rename, so a crash can't truncate the data. */
function flush() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TMP_FILE, JSON.stringify(db, null, 2));
    fs.renameSync(TMP_FILE, DATA_FILE);
  } catch (err) {
    console.error('💾  Failed to save the database:', err.message);
  }
}

/** Debounced save — a burst of writes in one request costs a single flush. */
function save() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 40);
}

function saveNow() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flush();
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
    return load()[this.name];
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
    save();
    return record;
  }

  /** Applies a patch to a live document and stamps updatedAt. */
  update(doc, patch = {}) {
    Object.assign(doc, patch, { updatedAt: nowIso() });
    save();
    return doc;
  }

  /** Persists in-place mutations made directly on a document. */
  touch(doc) {
    doc.updatedAt = nowIso();
    save();
    return doc;
  }

  deleteOne(filter = {}) {
    const rows = this.rows;
    const i = rows.findIndex((d) => matches(d, filter));
    if (i === -1) return 0;
    rows.splice(i, 1);
    save();
    return 1;
  }

  deleteMany(filter = {}) {
    const rows = this.rows;
    const keep = rows.filter((d) => !matches(d, filter));
    const removed = rows.length - keep.length;
    rows.length = 0;
    rows.push(...keep);
    save();
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
  DATA_FILE,

  init() {
    load();
    const counts = COLLECTIONS.map((c) => `${db[c].length} ${c}`).join(', ');
    console.log(`🗄️   Data store ready → ${DATA_FILE}`);
    console.log(`    ${counts}`);
    return store;
  },

  /** Wipes everything except admin accounts (used by the seeder). */
  resetBusinessData() {
    ['clients', 'projects', 'payments', 'domains', 'activities', 'employees', 'employeePayments'].forEach((c) => {
      load()[c].length = 0;
    });
    saveNow();
  },
};

// Never lose a debounced write on shutdown.
['exit', 'SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => {
    if (db) saveNow();
    if (sig !== 'exit') process.exit(0);
  })
);

module.exports = store;
