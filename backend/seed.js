/**
 * Seeds the admin account plus a realistic demo dataset into the JSON store.
 *   npm run seed           → wipes clients/projects/payments/domains/activities, keeps admin
 *   npm run seed -- --keep → only ensures the admin account exists
 */
require('dotenv').config();
const dayjs = require('dayjs');

const store = require('./store');
const Admin = require('./models/Admin');
const Client = require('./models/Client');
const Project = require('./models/Project');
const Payment = require('./models/Payment');
const Domain = require('./models/Domain');
const Activity = require('./models/Activity');
const Employee = require('./models/Employee');
const EmployeePayment = require('./models/EmployeePayment');

const KEEP_DATA = process.argv.includes('--keep');

const ago = (m, d = 0) => dayjs().subtract(m, 'month').subtract(d, 'day').toISOString();
const ahead = (d) => dayjs().add(d, 'day').toISOString();

const DEMO = [
  {
    name: 'Rahul Mehta', phone: '+91 98200 11223', email: 'rahul@spicebazaar.in', source: 'Referral',
    company: 'Spice Bazaar', address: 'Andheri West, Mumbai', gstin: '27AABCS1429B1ZQ',
    notes: 'Wants a food-delivery style menu with online ordering in phase 2.',
    project: { websiteName: 'Spice Bazaar Restaurant', websiteUrl: 'https://spicebazaar.in', stage: 'Live', priority: 'Medium', deadline: ago(1, 5), notes: 'Delivered on time. AMC discussion pending.' },
    payment: { totalPrice: 45000, gstEnabled: true, gstRate: 18, dueDate: ago(0, 20), history: [
      { amount: 20000, date: ago(3), method: 'UPI', note: 'Advance' },
      { amount: 20000, date: ago(2), method: 'Bank Transfer', note: 'Milestone 2' },
      { amount: 13100, date: ago(1), method: 'Bank Transfer', note: 'Final + GST' },
    ] },
    domain: { domainName: 'spicebazaar.in', price: 899, provider: 'GoDaddy', purchaseDate: ago(4), expiryDate: ahead(240) },
    createdAt: ago(5),
  },
  {
    name: 'Priya Nair', phone: '+91 99400 55621', email: 'priya@nairdentalcare.com', source: 'Social Media',
    company: 'Nair Dental Care', address: 'T. Nagar, Chennai',
    notes: 'Very responsive on WhatsApp. Needs appointment booking form.',
    project: { websiteName: 'Nair Dental Care', websiteUrl: '', stage: 'Development', priority: 'High', deadline: ahead(4), notes: 'Booking form + Google reviews widget in progress.' },
    payment: { totalPrice: 32000, gstEnabled: false, gstRate: 18, dueDate: ahead(3), history: [
      { amount: 15000, date: ago(1), method: 'UPI', note: 'Advance 50%' },
    ] },
    domain: { domainName: 'nairdentalcare.com', price: 1150, provider: 'Namecheap', purchaseDate: ago(1), expiryDate: ahead(320) },
    createdAt: ago(2),
  },
  {
    name: 'Arjun Desai', phone: '+91 90040 77812', email: 'arjun@desaibuilders.co.in', source: 'Direct',
    company: 'Desai Builders', address: 'Satellite, Ahmedabad', gstin: '24AAGCD9021K1Z5',
    notes: 'Premium real-estate portfolio site. Wants 3D walkthrough embed.',
    project: { websiteName: 'Desai Builders Portfolio', websiteUrl: '', stage: 'Design', priority: 'High', deadline: ahead(18), notes: 'Homepage concept approved, inner pages in review.' },
    payment: { totalPrice: 85000, gstEnabled: true, gstRate: 18, dueDate: ago(0, 4), history: [
      { amount: 30000, date: ago(1, 10), method: 'Bank Transfer', note: 'Kickoff' },
    ] },
    domain: { domainName: 'desaibuilders.co.in', price: 749, provider: 'BigRock', purchaseDate: ago(1), expiryDate: ahead(25) },
    createdAt: ago(2, 10),
  },
  {
    name: 'Sneha Kulkarni', phone: '+91 88880 34567', email: 'sneha@bloomyoga.studio', source: 'Referral',
    company: 'Bloom Yoga Studio', address: 'Koregaon Park, Pune',
    notes: 'Small budget, wants a clean one-pager with class schedule.',
    project: { websiteName: 'Bloom Yoga Studio', websiteUrl: '', stage: 'Testing', priority: 'Medium', deadline: ahead(2), notes: 'Client reviewing staging link.' },
    payment: { totalPrice: 18000, gstEnabled: false, gstRate: 18, dueDate: ahead(10), history: [
      { amount: 9000, date: ago(0, 25), method: 'UPI', note: 'Advance' },
      { amount: 9000, date: ago(0, 3), method: 'UPI', note: 'Balance' },
    ] },
    domain: { domainName: 'bloomyoga.studio', price: 1999, provider: 'Google Domains', purchaseDate: ago(1), expiryDate: ahead(300) },
    createdAt: ago(1, 5),
  },
  {
    name: 'Imran Sheikh', phone: '+91 70210 99887', email: 'imran@sheikhmotors.in', source: 'Social Media',
    company: 'Sheikh Motors', address: 'Banjara Hills, Hyderabad',
    notes: 'Used-car listing site. Needs inventory upload panel later.',
    project: { websiteName: 'Sheikh Motors Listings', websiteUrl: '', stage: 'Discovery', priority: 'Low', deadline: ahead(40), notes: 'Requirement doc shared, waiting on content.' },
    payment: { totalPrice: 55000, gstEnabled: true, gstRate: 18, dueDate: ahead(30), history: [] },
    domain: { domainName: '', price: 0, provider: '', purchaseDate: null, expiryDate: null },
    createdAt: ago(0, 12),
  },
  {
    name: 'Kavita Rao', phone: '+91 97400 12345', email: 'kavita@raolegal.in', source: 'Direct',
    company: 'Rao Legal Associates', address: 'Indiranagar, Bengaluru', gstin: '29AACCR5566P1ZX',
    notes: 'Law firm site. Strict on typography and tone.',
    project: { websiteName: 'Rao Legal Associates', websiteUrl: 'https://raolegal.in', stage: 'Live', priority: 'Medium', deadline: ago(0, 40), notes: 'Live since last month. Renewal due next year.' },
    payment: { totalPrice: 60000, gstEnabled: true, gstRate: 18, dueDate: ago(0, 15), history: [
      { amount: 35000, date: ago(4), method: 'Cheque', note: 'Advance' },
      { amount: 25000, date: ago(2), method: 'Bank Transfer', note: 'Part payment' },
    ] },
    domain: { domainName: 'raolegal.in', price: 899, provider: 'GoDaddy', purchaseDate: ago(5), expiryDate: ahead(180) },
    createdAt: ago(6),
  },
];

function run() {
  store.init();

  const email = (process.env.ADMIN_EMAIL || 'admin@webtrack.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Admin';

  let admin = Admin.findByEmail(email);
  if (!admin) {
    admin = Admin.create({ name, email, password });
    console.log(`👤  Admin created  →  ${email} / ${password}`);
  } else {
    console.log(`👤  Admin already exists  →  ${email}`);
  }

  if (KEEP_DATA) {
    console.log('↩️   --keep passed, demo data untouched.');
    store.saveNow();
    return;
  }

  store.resetBusinessData();
  console.log('🧹  Cleared existing demo data');

  for (const d of DEMO) {
    const client = Client.create({
      name: d.name, phone: d.phone, email: d.email, source: d.source,
      company: d.company, address: d.address || '', gstin: d.gstin || '', notes: d.notes,
    });
    client.createdAt = d.createdAt; // back-date so growth charts look real
    store.save();

    Project.create(client._id, d.project);
    Payment.create(client._id, d.payment);
    Domain.create(client._id, d.domain);

    Activity.create({
      client: client._id, type: 'client', action: 'Client created',
      message: `${d.name} was added as a new client (source: ${d.source}).`, createdAt: d.createdAt,
    });
    Activity.create({
      client: client._id, type: 'project', action: 'Project created',
      message: `Project "${d.project.websiteName}" started at ${d.project.stage} stage.`, createdAt: d.createdAt,
    });
    d.payment.history.forEach((h) =>
      Activity.create({
        client: client._id, type: 'payment', action: 'Payment received',
        message: `₹${h.amount.toLocaleString('en-IN')} received via ${h.method}. ${h.note}`,
        meta: { amount: h.amount, method: h.method }, createdAt: h.date,
      })
    );

    console.log(`   ✓ ${d.name} — ${d.project.websiteName}`);
  }

  // Seed Team / Employee demo data
  const currentYear = dayjs().year();
  const emp1 = Employee.create({ name: 'Sarang', role: 'UI/UX Designer' });
  const emp2 = Employee.create({ name: 'Ishwar', role: 'Full-Stack Developer' });
  const emp3 = Employee.create({ name: 'Aryan', role: 'Video Editor' });

  EmployeePayment.create({ employeeId: emp1._id, amount: 8000, date: `${currentYear}-01-15T10:00:00.000Z`, note: 'Jan stipend' });
  EmployeePayment.create({ employeeId: emp1._id, amount: 5000, date: `${currentYear}-02-15T10:00:00.000Z`, note: 'Feb stipend' });
  EmployeePayment.create({ employeeId: emp1._id, amount: 3000, date: `${currentYear}-03-15T10:00:00.000Z`, note: 'Mar stipend' });

  EmployeePayment.create({ employeeId: emp2._id, amount: 5000, date: `${currentYear}-01-18T10:00:00.000Z`, note: 'Jan stipend' });
  EmployeePayment.create({ employeeId: emp2._id, amount: 4000, date: `${currentYear}-02-18T10:00:00.000Z`, note: 'Feb stipend' });
  EmployeePayment.create({ employeeId: emp2._id, amount: 6000, date: `${currentYear}-03-18T10:00:00.000Z`, note: 'Mar stipend' });

  EmployeePayment.create({ employeeId: emp3._id, amount: 3000, date: `${currentYear}-01-20T10:00:00.000Z`, note: 'Jan stipend' });
  EmployeePayment.create({ employeeId: emp3._id, amount: 7000, date: `${currentYear}-02-20T10:00:00.000Z`, note: 'Feb stipend' });
  EmployeePayment.create({ employeeId: emp3._id, amount: 2000, date: `${currentYear}-03-20T10:00:00.000Z`, note: 'Mar stipend' });

  store.saveNow();
  console.log(`\n✅  Seeded ${DEMO.length} clients & 3 team members with payment records.`);
  console.log(`    Login →  ${email}  /  ${password}\n`);
}

try {
  run();
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
