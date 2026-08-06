const store = require('../store');

function clean(input = {}) {
  const out = {};
  if (input.name !== undefined) {
    const name = String(input.name || '').trim();
    if (!name) {
      const err = new Error('Employee name is required');
      err.status = 400;
      throw err;
    }
    out.name = name;
  }
  if (input.role !== undefined) {
    out.role = String(input.role || '').trim() || 'Team Member';
  }
  return out;
}

const Employee = {
  find: (filter, opts) => store.employees.find(filter, opts),

  findById: (id) => store.employees.findById(id),

  create(input = {}) {
    return store.employees.insert({
      name: '',
      role: 'Team Member',
      ...clean(input),
    });
  },

  update(doc, input = {}) {
    return store.employees.update(doc, clean(input));
  },

  delete(id) {
    const _id = String(id);
    store.employeePayments.deleteMany({ employeeId: _id });
    return store.employees.deleteOne({ _id });
  },
};

module.exports = Employee;
