const store = require('../store');

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

/**
 * `note` doubles as the mandatory "reason for spending" — every payout must
 * say what it's for, so Expense History / Team records / P&L reports always
 * have something meaningful to show. Required on create; if an edit touches
 * it, it can't be blanked out either — but editing amount/date alone doesn't
 * force re-entering it.
 */
function clean(input = {}, { partial = false } = {}) {
  const out = {};
  const has = (k) => input[k] !== undefined;

  if (has('employeeId') || !partial) out.employeeId = String(input.employeeId || '');

  if (has('amount') || !partial) {
    const amt = Number(input.amount);
    if (!amt || amt <= 0) fail('Amount must be greater than 0');
    out.amount = amt;
  }

  if (has('date') || !partial) {
    const d = store.toDate(input.date);
    if (!d) fail('Valid date is required');
    out.date = d;
  }

  if (has('note') || !partial) {
    const note = String(input.note || '').trim();
    if (!note) fail('Please provide a reason for this expense.');
    out.note = note;
  }

  return out;
}

const EmployeePayment = {
  find: (filter, opts) => store.employeePayments.find(filter, opts),

  findById: (id) => store.employeePayments.findById(id),

  findByEmployee: (employeeId) => store.employeePayments.find({ employeeId: String(employeeId) }),

  create(input = {}) {
    return store.employeePayments.insert(clean(input, { partial: false }));
  },

  update(doc, input = {}) {
    return store.employeePayments.update(doc, clean(input, { partial: true }));
  },

  delete(id) {
    return store.employeePayments.deleteOne({ _id: String(id) });
  },
};

module.exports = EmployeePayment;
