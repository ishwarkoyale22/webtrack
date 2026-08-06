const express = require('express');
const dayjs = require('dayjs');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Domain = require('../models/Domain');
const Activity = require('../models/Activity');
const { clientRef } = require('../utils/populate');
const { derivePayment, round2 } = require('../utils/money');

const router = express.Router();

/** Builds an ordered list of the last `n` months as { key: 'YYYY-MM', label: 'Mar 25' }. */
function monthBuckets(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = dayjs().subtract(i, 'month');
    out.push({ key: d.format('YYYY-MM'), label: d.format('MMM YY'), month: d.format('MMMM YYYY') });
  }
  return out;
}

/** Every payment ledger with derived totals and a trimmed client reference. */
function loadLedgers() {
  return Payment.find().map((p) => ({
    ...p,
    ...derivePayment(p),
    client: clientRef(p.client),
  }));
}

const loadProjects = () =>
  Project.find().map((p) => ({ ...p, client: clientRef(p.client, ['name']) }));

const loadDomains = () =>
  Domain.find().map((d) => ({ ...d, client: clientRef(d.client, ['name']) }));

/**
 * GET /api/reports/dashboard
 * Everything the home page needs: stat cards, both charts and the alerts feed.
 */
router.get('/dashboard', (req, res, next) => {
  try {
    const months = Math.min(Number(req.query.months) || 6, 24);
    const ledgers = loadLedgers();
    const projects = loadProjects();
    const domains = loadDomains();
    const totalClients = Client.count();

    const totalRevenue = round2(ledgers.reduce((a, l) => a + l.received, 0));
    const totalPending = round2(ledgers.reduce((a, l) => a + l.pending, 0));
    const totalQuoted = round2(ledgers.reduce((a, l) => a + l.grandTotal, 0));
    const activeProjects = projects.filter((p) => p.stage !== 'Live').length;
    const liveProjects = projects.filter((p) => p.stage === 'Live').length;

    // ── Monthly revenue (bar chart) ────────────────────────────────────────
    const buckets = monthBuckets(months);
    const revenueByMonth = Object.fromEntries(buckets.map((b) => [b.key, 0]));
    ledgers.forEach((l) => {
      (l.history || []).forEach((h) => {
        const k = dayjs(h.date).format('YYYY-MM');
        if (k in revenueByMonth) revenueByMonth[k] += h.amount || 0;
      });
    });
    const monthlyRevenue = buckets.map((b) => ({ month: b.label, key: b.key, revenue: round2(revenueByMonth[b.key]) }));

    // ── Pending vs received (comparison chart) ─────────────────────────────
    const pendingVsReceived = [
      { name: 'Received', value: totalRevenue },
      { name: 'Pending', value: totalPending },
    ];

    const statusSplit = ['Paid', 'Partial', 'Pending'].map((s) => ({
      name: s,
      value: ledgers.filter((l) => l.status === s).length,
    }));

    const stageSplit = Project.STAGES.map((s) => ({
      name: s,
      value: projects.filter((p) => p.stage === s).length,
    }));

    // ── Alerts ────────────────────────────────────────────────────────────
    const alerts = buildAlerts({ ledgers, projects, domains, settings: req.admin?.settings });

    const recentActivity = Activity.recent(12).map((a) => ({
      ...a,
      client: clientRef(a.client, ['name']),
    }));

    res.json({
      stats: {
        totalClients,
        totalRevenue,
        totalPending,
        totalQuoted,
        activeProjects,
        liveProjects,
        collectionRate: totalQuoted ? Math.round((totalRevenue / totalQuoted) * 100) : 0,
      },
      monthlyRevenue,
      pendingVsReceived,
      statusSplit,
      stageSplit,
      alerts,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

/** Shared alert builder — also powers /api/notifications. */
function buildAlerts({ ledgers, projects, domains, settings }) {
  const dueDays = settings?.paymentDueDays ?? 7;
  const deadlineDays = settings?.deadlineAlertDays ?? 7;
  const alerts = [];
  const now = dayjs();

  ledgers.forEach((l) => {
    if (l.pending <= 0 || !l.client) return;
    const due = l.dueDate ? dayjs(l.dueDate) : null;
    const diff = due ? due.diff(now, 'day') : null;

    if (due && diff < 0) {
      alerts.push({
        id: `pay-over-${l._id}`, kind: 'payment', severity: 'critical',
        title: 'Payment overdue',
        message: `${l.client.name} — ₹${l.pending.toLocaleString('en-IN')} pending, ${Math.abs(diff)} day(s) overdue.`,
        clientId: l.client._id, date: due.toISOString(), amount: l.pending,
      });
    } else if (due && diff <= dueDays) {
      alerts.push({
        id: `pay-soon-${l._id}`, kind: 'payment', severity: 'warning',
        title: 'Payment due soon',
        message: `${l.client.name} — ₹${l.pending.toLocaleString('en-IN')} due ${diff === 0 ? 'today' : `in ${diff} day(s)`}.`,
        clientId: l.client._id, date: due.toISOString(), amount: l.pending,
      });
    } else if (!due) {
      alerts.push({
        id: `pay-open-${l._id}`, kind: 'payment', severity: 'info',
        title: 'Payment pending',
        message: `${l.client.name} — ₹${l.pending.toLocaleString('en-IN')} still to collect (no due date set).`,
        clientId: l.client._id, date: null, amount: l.pending,
      });
    }
  });

  projects.forEach((p) => {
    if (!p.deadline || p.stage === 'Live' || !p.client) return;
    const dl = dayjs(p.deadline);
    const diff = dl.diff(now, 'day');
    if (diff < 0) {
      alerts.push({
        id: `dl-over-${p._id}`, kind: 'deadline', severity: 'critical',
        title: 'Deadline missed',
        message: `${p.websiteName} (${p.client.name}) was due ${Math.abs(diff)} day(s) ago — still in ${p.stage}.`,
        clientId: p.client._id, date: dl.toISOString(),
      });
    } else if (diff <= deadlineDays) {
      alerts.push({
        id: `dl-soon-${p._id}`, kind: 'deadline', severity: 'warning',
        title: 'Deadline approaching',
        message: `${p.websiteName} (${p.client.name}) is due ${diff === 0 ? 'today' : `in ${diff} day(s)`} — currently ${p.stage}.`,
        clientId: p.client._id, date: dl.toISOString(),
      });
    }
  });

  (domains || []).forEach((d) => {
    if (!d.expiryDate || !d.client) return;
    const diff = dayjs(d.expiryDate).diff(now, 'day');
    if (diff <= 30) {
      alerts.push({
        id: `dom-${d._id}`, kind: 'domain', severity: diff < 0 ? 'critical' : 'warning',
        title: diff < 0 ? 'Domain expired' : 'Domain expiring',
        message: `${d.domainName || 'Domain'} (${d.client.name}) ${diff < 0 ? `expired ${Math.abs(diff)} day(s) ago` : `expires in ${diff} day(s)`}.`,
        clientId: d.client._id, date: dayjs(d.expiryDate).toISOString(),
      });
    }
  });

  const rank = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || new Date(a.date || 0) - new Date(b.date || 0));
}

/**
 * GET /api/reports
 * Reports page: monthly revenue, client growth, pending vs received, best month.
 */
router.get('/', (req, res, next) => {
  try {
    const months = Math.min(Number(req.query.months) || 12, 24);
    const buckets = monthBuckets(months);
    const ledgers = loadLedgers();
    const clients = Client.find();

    const revenue = Object.fromEntries(buckets.map((b) => [b.key, 0]));
    const payments = Object.fromEntries(buckets.map((b) => [b.key, 0]));
    ledgers.forEach((l) =>
      (l.history || []).forEach((h) => {
        const k = dayjs(h.date).format('YYYY-MM');
        if (k in revenue) {
          revenue[k] += h.amount || 0;
          payments[k] += 1;
        }
      })
    );

    const growth = Object.fromEntries(buckets.map((b) => [b.key, 0]));
    clients.forEach((c) => {
      const k = dayjs(c.createdAt).format('YYYY-MM');
      if (k in growth) growth[k] += 1;
    });

    let running = clients.filter((c) => dayjs(c.createdAt).isBefore(dayjs(`${buckets[0].key}-01`))).length;
    const clientGrowth = buckets.map((b) => {
      running += growth[b.key];
      return { month: b.label, key: b.key, newClients: growth[b.key], totalClients: running };
    });

    const monthlyRevenue = buckets.map((b) => ({
      month: b.label, key: b.key, revenue: round2(revenue[b.key]), payments: payments[b.key],
    }));

    const best = monthlyRevenue.reduce((a, b) => (b.revenue > a.revenue ? b : a), monthlyRevenue[0] || { revenue: 0 });
    const bestMonth = best && best.revenue > 0
      ? { ...best, fullLabel: buckets.find((b) => b.key === best.key)?.month || best.month }
      : null;

    const totalReceived = round2(ledgers.reduce((a, l) => a + l.received, 0));
    const totalPending = round2(ledgers.reduce((a, l) => a + l.pending, 0));

    const sourceSplit = Client.SOURCES.map((s) => ({
      name: s,
      value: clients.filter((c) => c.source === s).length,
    }));

    res.json({
      monthlyRevenue,
      clientGrowth,
      pendingVsReceived: [
        { name: 'Received', value: totalReceived },
        { name: 'Pending', value: totalPending },
      ],
      perClientComparison: ledgers
        .filter((l) => l.client)
        .map((l) => ({ name: l.client.name, received: l.received, pending: l.pending }))
        .sort((a, b) => b.received + b.pending - (a.received + a.pending))
        .slice(0, 10),
      sourceSplit,
      bestMonth,
      totals: {
        totalReceived,
        totalPending,
        avgDealSize: ledgers.length ? round2(ledgers.reduce((a, l) => a + l.grandTotal, 0) / ledgers.length) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, buildAlerts, loadLedgers, loadProjects, loadDomains };
