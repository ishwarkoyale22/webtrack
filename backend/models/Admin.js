const bcrypt = require('bcryptjs');
const store = require('../store');

const EMAIL_RX = /^\S+@\S+\.\S+$/;

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const Admin = {
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
    });
  },

  verifyPassword: (admin, entered) => bcrypt.compareSync(String(entered || ''), admin.password),

  /** Public shape — never leaks the password hash. */
  shape: (admin) => ({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    company: admin.company,
    phone: admin.phone,
    address: admin.address,
  }),
};

module.exports = Admin;
