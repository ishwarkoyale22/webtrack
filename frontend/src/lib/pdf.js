import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtDate, dayjs } from './format';

const BRAND = [124, 77, 255];
const CYAN = [34, 211, 238];
const INK = [17, 24, 51];
const MUTED = [120, 130, 160];

/** jsPDF's core fonts are Latin-1 — swap ₹ for "Rs." so nothing renders as a blank box. */
const rs = (n) => `Rs. ${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function header(doc, { title, admin, serial, date }) {
  const W = doc.internal.pageSize.getWidth();

  // Gradient-ish banner (two overlapping bars — jsPDF has no real gradients)
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(...CYAN);
  doc.setGState(new doc.GState({ opacity: 0.28 }));
  doc.triangle(W * 0.55, 0, W, 0, W, 42, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(admin?.company || 'WebTrack Studio', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = [admin?.email, admin?.phone, admin?.address].filter(Boolean).join('  •  ');
  if (lines) doc.text(lines, 14, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(title.toUpperCase(), W - 14, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`#${serial}`, W - 14, 27, { align: 'right' });
  doc.text(fmtDate(date), W - 14, 33, { align: 'right' });
}

function billTo(doc, client, y) {
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BILL TO', 14, y);

  doc.setTextColor(...INK);
  doc.setFontSize(13);
  doc.text(client.name || '—', 14, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90, 98, 125);
  const rows = [client.company, client.address, client.phone, client.email, client.gstin ? `GSTIN: ${client.gstin}` : '']
    .filter(Boolean);
  rows.forEach((t, i) => doc.text(String(t), 14, y + 14 + i * 5));

  return y + 16 + rows.length * 5;
}

function totalsBlock(doc, startY, rows) {
  const W = doc.internal.pageSize.getWidth();
  const x = W - 90;
  let y = startY;

  rows.forEach((r) => {
    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(r.bold ? 11.5 : 10);
    doc.setTextColor(...(r.bold ? INK : MUTED));
    doc.text(r.label, x, y);
    doc.setTextColor(...(r.accent ? BRAND : r.bold ? INK : [70, 78, 105]));
    doc.text(r.value, W - 14, y, { align: 'right' });
    y += r.bold ? 8 : 6.5;
  });

  return y;
}

function footer(doc, note) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setDrawColor(230, 232, 242);
  doc.line(14, H - 26, W - 14, H - 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(note, 14, H - 19, { maxWidth: W - 28 });
  doc.text('Generated with WebTrack', W - 14, H - 12, { align: 'right' });
}

function lineItems(client) {
  const p = client.payment || {};
  const items = [
    {
      desc: `Website design & development — ${client.project?.websiteName || 'Website Project'}`,
      qty: 1,
      rate: p.totalPrice || 0,
    },
  ];
  if (client.domain?.domainName && client.domain?.price > 0) {
    items.push({ desc: `Domain registration — ${client.domain.domainName}`, qty: 1, rate: client.domain.price });
  }
  return items;
}

/**
 * Invoice — reflects what has actually been received and what is still due.
 */
export function generateInvoice(client, admin, { download = true } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const p = client.payment || {};
  const serial = `INV-${dayjs().format('YYYYMM')}-${String(client._id || '').slice(-5).toUpperCase()}`;

  header(doc, { title: 'Invoice', admin, serial, date: new Date() });
  const afterBill = billTo(doc, client, 56);

  const items = lineItems(client);
  autoTable(doc, {
    startY: Math.max(afterBill + 4, 84),
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: items.map((it, i) => [i + 1, it.desc, it.qty, rs(it.rate), rs(it.rate * it.qty)]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fontSize: 9.5, textColor: [55, 62, 88] },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const subtotal = items.reduce((a, i) => a + i.rate * i.qty, 0);
  const gst = p.gstEnabled ? (p.totalPrice * (p.gstRate || 0)) / 100 : 0;
  const grand = subtotal + gst;
  const received = p.received || 0;
  const pending = Math.max(grand - received, 0);

  let y = totalsBlock(doc, doc.lastAutoTable.finalY + 12, [
    { label: 'Subtotal', value: rs(subtotal) },
    ...(p.gstEnabled ? [{ label: `GST (${p.gstRate}%)`, value: rs(gst) }] : []),
    { label: 'Grand Total', value: rs(grand), bold: true },
    { label: 'Received', value: rs(received) },
    { label: 'Balance Due', value: rs(pending), bold: true, accent: true },
  ]);

  if (p.history?.length) {
    autoTable(doc, {
      startY: y + 8,
      head: [['Payment History', 'Method', 'Note', 'Amount']],
      body: p.history.map((h) => [fmtDate(h.date), h.method, h.note || '—', rs(h.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [17, 24, 51], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [70, 78, 105] },
      columnStyles: { 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY;
  }

  const status = pending <= 0 && grand > 0 ? 'PAID IN FULL' : received > 0 ? 'PARTIALLY PAID' : 'PAYMENT PENDING';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...(pending <= 0 && grand > 0 ? [16, 150, 100] : BRAND));
  doc.text(status, 14, Math.min(y + 12, doc.internal.pageSize.getHeight() - 34));

  footer(doc, 'Thank you for your business. Please include the invoice number with your payment reference.');

  const filename = `Invoice-${(client.name || 'client').replace(/\s+/g, '-')}-${dayjs().format('YYYYMMDD')}.pdf`;
  if (download) doc.save(filename);
  return { doc, filename, dataUrl: doc.output('datauristring') };
}

/**
 * Quotation — the proposed price before any money changes hands.
 */
export function generateQuotation(client, admin, { download = true, validDays = 15 } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const p = client.payment || {};
  const serial = `QTN-${dayjs().format('YYYYMM')}-${String(client._id || '').slice(-5).toUpperCase()}`;

  header(doc, { title: 'Quotation', admin, serial, date: new Date() });
  const afterBill = billTo(doc, client, 56);

  const items = lineItems(client);
  autoTable(doc, {
    startY: Math.max(afterBill + 4, 84),
    head: [['#', 'Scope of Work', 'Qty', 'Rate', 'Amount']],
    body: items.map((it, i) => [i + 1, it.desc, it.qty, rs(it.rate), rs(it.rate * it.qty)]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fontSize: 9.5, textColor: [55, 62, 88] },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const subtotal = items.reduce((a, i) => a + i.rate * i.qty, 0);
  const gst = p.gstEnabled ? (p.totalPrice * (p.gstRate || 0)) / 100 : 0;

  const y = totalsBlock(doc, doc.lastAutoTable.finalY + 12, [
    { label: 'Subtotal', value: rs(subtotal) },
    ...(p.gstEnabled ? [{ label: `GST (${p.gstRate}%)`, value: rs(gst) }] : []),
    { label: 'Estimated Total', value: rs(subtotal + gst), bold: true, accent: true },
  ]);

  const terms = [
    `This quotation is valid for ${validDays} days from the date of issue.`,
    '50% advance is required to begin work; the balance is due before go-live.',
    `Timeline: as per the agreed project schedule${client.project?.deadline ? ` (target ${fmtDate(client.project.deadline)})` : ''}.`,
    'Content, images and third-party licences are to be provided by the client unless stated otherwise.',
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text('Terms & Conditions', 14, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  terms.forEach((t, i) => doc.text(`${i + 1}.  ${t}`, 14, y + 17 + i * 5.5, { maxWidth: 180 }));

  footer(doc, 'We look forward to working with you. Reply to this quotation to confirm and we will get started.');

  const filename = `Quotation-${(client.name || 'client').replace(/\s+/g, '-')}-${dayjs().format('YYYYMMDD')}.pdf`;
  if (download) doc.save(filename);
  return { doc, filename, dataUrl: doc.output('datauristring') };
}
