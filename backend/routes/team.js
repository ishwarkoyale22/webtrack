const express = require('express');
const Employee = require('../models/Employee');
const EmployeePayment = require('../models/EmployeePayment');
const Payment = require('../models/Payment');
const { round2 } = require('../utils/money');
const dayjs = require('dayjs');

const router = express.Router();

/** Revenue actually received in each calendar month of `year` (Jan..Dec), from every client's payment history. */
function revenueByMonthForYear(year) {
  const byMonth = Array(12).fill(0);
  Payment.find().forEach((p) => {
    (p.history || []).forEach((h) => {
      const d = dayjs(h.date);
      if (d.year() === year) byMonth[d.month()] += Number(h.amount) || 0;
    });
  });
  return byMonth.map(round2);
}

/** GET /api/team/employees */
router.get('/employees', (req, res, next) => {
  try {
    const employees = Employee.find({}, { sort: 'name' });
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

/** POST /api/team/employees */
router.post('/employees', (req, res, next) => {
  try {
    const { name, role } = req.body || {};
    const created = Employee.create({ name, role });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** PUT /api/team/employees/:id */
router.put('/employees/:id', (req, res, next) => {
  try {
    const emp = Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const updated = Employee.update(emp, req.body || {});
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/team/employees/:id */
router.delete('/employees/:id', (req, res, next) => {
  try {
    const emp = Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    Employee.delete(req.params.id);
    res.json({ message: `Employee ${emp.name} deleted`, _id: req.params.id });
  } catch (err) {
    next(err);
  }
});

/** GET /api/team/payments?employeeId=&year=&month= */
router.get('/payments', (req, res, next) => {
  try {
    const { employeeId, year, month } = req.query;
    let payments = EmployeePayment.find({}, { sort: '-date' });

    if (employeeId) {
      payments = payments.filter((p) => String(p.employeeId) === String(employeeId));
    }
    if (year) {
      const y = Number(year);
      payments = payments.filter((p) => dayjs(p.date).year() === y);
    }
    if (month !== undefined && month !== '' && month !== null) {
      const m = Number(month); // 0-11
      payments = payments.filter((p) => dayjs(p.date).month() === m);
    }

    res.json(payments);
  } catch (err) {
    next(err);
  }
});

/** POST /api/team/payments */
router.post('/payments', (req, res, next) => {
  try {
    const { employeeId, amount, date, note } = req.body || {};
    if (!employeeId || !Employee.findById(employeeId)) {
      return res.status(400).json({ message: 'Valid employee ID is required' });
    }

    const created = EmployeePayment.create({ employeeId, amount, date, note });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** PUT /api/team/payments/:id */
router.put('/payments/:id', (req, res, next) => {
  try {
    const pay = EmployeePayment.findById(req.params.id);
    if (!pay) return res.status(404).json({ message: 'Payment entry not found' });

    const updated = EmployeePayment.update(pay, req.body || {});
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/team/payments/:id */
router.delete('/payments/:id', (req, res, next) => {
  try {
    const pay = EmployeePayment.findById(req.params.id);
    if (!pay) return res.status(404).json({ message: 'Payment entry not found' });

    EmployeePayment.delete(req.params.id);
    res.json({ message: 'Payment entry deleted', _id: req.params.id });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/team/matrix?year=2026
 * Computes monthly totals per employee, total per employee, total per month, and grand overall total.
 */
router.get('/matrix', (req, res, next) => {
  try {
    const year = Number(req.query.year) || dayjs().year();
    const employees = Employee.find({}, { sort: 'name' });
    const allPayments = EmployeePayment.find({});

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Map employeeId -> monthIndex (0..11) -> list of payments & total
    const matrix = {};
    const rowTotals = {};
    const colTotals = Array(12).fill(0);
    let grandTotal = 0;

    employees.forEach((emp) => {
      matrix[emp._id] = Array.from({ length: 12 }, () => ({ total: 0, count: 0, entries: [] }));
      rowTotals[emp._id] = 0;
    });

    allPayments.forEach((p) => {
      const pDate = dayjs(p.date);
      if (pDate.year() === year && matrix[p.employeeId]) {
        const mIdx = pDate.month();
        const cell = matrix[p.employeeId][mIdx];
        cell.entries.push(p);
        cell.total += Number(p.amount) || 0;
        cell.count += 1;

        rowTotals[p.employeeId] += Number(p.amount) || 0;
        colTotals[mIdx] += Number(p.amount) || 0;
        grandTotal += Number(p.amount) || 0;
      }
    });

    // ── P&L summary ─────────────────────────────────────────────────────
    // Expense is broken into categories so other costs (domains, tools,
    // ads, ...) can be added later without reshaping this response —
    // `payroll` is the only category that exists today.
    const revenue = revenueByMonthForYear(year);
    const totalRevenue = round2(revenue.reduce((a, b) => a + b, 0));
    const expenseBreakdown = { payroll: round2(grandTotal) };
    const totalExpense = round2(Object.values(expenseBreakdown).reduce((a, b) => a + b, 0));
    const netProfit = round2(totalRevenue - totalExpense);
    const marginPercent = totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0;

    const monthlyPnl = months.map((label, i) => ({
      month: label,
      revenue: revenue[i],
      expense: round2(colTotals[i]),
      profit: round2(revenue[i] - colTotals[i]),
    }));

    res.json({
      year,
      months,
      employees,
      matrix,
      totals: {
        rowTotals,
        colTotals,
        grandTotal,
      },
      pnl: {
        revenue: totalRevenue,
        expense: totalExpense,
        expenseBreakdown,
        netProfit,
        marginPercent,
        monthly: monthlyPnl,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
