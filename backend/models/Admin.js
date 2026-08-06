const bcrypt = require('bcryptjs');
const store = require('../store');

const EMAIL_RX = /^\S+@\S+\.\S+$/;

const DEFAULT_SETTINGS = {
  gstDefault: false,
  gstRate: 18,
  currency: '₹',
  theme: 'dark',
  paymentDueDays: 7,
  deadlineAlertDays: 7,
};

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const Admin = {
  count: () => store.admins.count(),

  findById: (id) => store.admins.findById(id),

  findFirst: () => store.admins.find({}, { sort: 'createdAt', limit: 1 })[0] || null,

  findByEmail: (email) =>
    store.admins.findOne({ email: String(email || '').toLowerCase().trim() }),

  create({ name, email, password }) {
    if (!name || !String(name).trim()) fail('Name is required');
    const mail = String(email || '').toLowerCase().trim();
    if (!EMAIL_RX.test(mail)) fail('Please provide a valid email');
    if (!password || String(password).length < 6) fail('Password must be at least 6 characters');
    if (Admin.findByEmail(mail)) fail('An account with this email already exists', 409);

    return store.admins.insert({
      name: String(name).trim(),
      email: mail,
      password: bcrypt.hashSync(String(password), 10),
      company: 'WebTrack Studio',
      phone: '',
      address: '',
      settings: { ...DEFAULT_SETTINGS },
    });
  },

  verifyPassword: (admin, entered) => bcrypt.compareSync(String(entered || ''), admin.password),

  setPassword(admin, newPassword) {
    if (!newPassword || String(newPassword).length < 6) fail('Password must be at least 6 characters');
    return store.admins.update(admin, { password: bcrypt.hashSync(String(newPassword), 10) });
  },

  updateProfile(admin, { name, email, company, phone, address, settings }) {
    const patch = {};
    if (name !== undefined) {
      if (!String(name).trim()) fail('Name is required');
      patch.name = String(name).trim();
    }
    if (email !== undefined) {
      const mail = String(email).toLowerCase().trim();
      if (!EMAIL_RX.test(mail)) fail('Please provide a valid email');
      patch.email = mail;
    }
    if (company !== undefined) patch.company = String(company).trim();
    if (phone !== undefined) patch.phone = String(phone).trim();
    if (address !== undefined) patch.address = String(address).trim();
    if (settings && typeof settings === 'object') {
      patch.settings = { ...DEFAULT_SETTINGS, ...admin.settings, ...settings };
    }
    return store.admins.update(admin, patch);
  },

  /** Public shape — never leaks the password hash. */
  shape: (admin) => ({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    company: admin.company,
    phone: admin.phone,
    address: admin.address,
    settings: { ...DEFAULT_SETTINGS, ...admin.settings },
  }),
};

module.exports = Admin;
