const store = require('../store');

function clean(input = {}) {
  const out = {};
  if (input.employeeId !== undefined) out.employeeId = String(input.employeeId || '');
  if (input.amount !== undefined) {
    const amt = Number(input.amount);
    if (!amt || amt <= 0) {
      const err = new Error('Amount must be greater than 0');
      err.status = 400;
      throw err;
    }
    out.amount = amt;
  }
  if (input.date !== undefined) {
    const d = store.toDate(input.date);
    if (!d) {
      const err = new Error('Valid date is required');
      err.status = 400;
      throw err;
    }
    out.date = d;
  }
  if (input.note !== undefined) out.note = String(input.note || '').trim();
  return out;
}

const EmployeePayment = {
  find: (filter, opts) => store.employeePayments.find(filter, opts),

  findById: (id) => store.employeePayments.findById(id),

  findByEmployee: (employeeId) => store.employeePayments.find({ employeeId: String(employeeId) }),

  create(input = {}) {
    return store.employeePayments.insert({
      employeeId: '',
      amount: 0,
      date: store.nowIso(),
      note: '',
      ...clean(input),
    });
  },

  update(doc, input = {}) {
    return store.employeePayments.update(doc, clean(input));
  },

  delete(id) {
    return store.employeePayments.deleteOne({ _id: String(id) });
  },
};

module.exports = EmployeePayment;
