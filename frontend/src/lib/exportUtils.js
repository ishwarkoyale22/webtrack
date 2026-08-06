import * as XLSX from 'xlsx';
import { dayjs, fmtDate } from './format';

function autoWidth(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((key) => ({
    wch: Math.min(
      Math.max(key.length + 2, ...rows.map((r) => String(r[key] ?? '').length + 2)),
      44
    ),
  }));
}

function download(rows, { filename, sheetName = 'Sheet1', format = 'xlsx' }) {
  if (!rows.length) throw new Error('There is nothing to export yet.');

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidth(rows);

  const stamp = dayjs().format('YYYY-MM-DD');
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}

/** Client list → Excel / CSV */
export function exportClients(clients, format = 'xlsx') {
  const rows = clients.map((c) => ({
    Name: c.name,
    Company: c.company || '',
    Phone: c.phone,
    Email: c.email || '',
    Source: c.source,
    Website: c.project?.websiteName || '',
    'Project Stage': c.project?.stage || '',
    Priority: c.project?.priority || '',
    Deadline: c.project?.deadline ? fmtDate(c.project.deadline) : '',
    Domain: c.domain?.domainName || '',
    'Domain Price': c.domain?.price || 0,
    'Total Price': c.payment?.grandTotal ?? 0,
    Received: c.payment?.received ?? 0,
    Pending: c.payment?.pending ?? 0,
    'Payment Status': c.payment?.status || 'Pending',
    GST: c.payment?.gstEnabled ? `Yes (${c.payment.gstRate}%)` : 'No',
    'Added On': fmtDate(c.createdAt),
  }));
  download(rows, { filename: 'WebTrack-Clients', sheetName: 'Clients', format });
}

/** Payment report — one row per payment entry, plus a per-client summary sheet. */
export function exportPayments(ledgers, format = 'xlsx') {
  const rows = [];
  ledgers.forEach((l) => {
    const name = l.client?.name || 'Unknown client';
    if (!l.history?.length) {
      rows.push({
        Client: name,
        Date: '',
        Method: '',
        Note: 'No payments received yet',
        Amount: 0,
        'Total Price': l.grandTotal,
        Received: l.received,
        Pending: l.pending,
        Status: l.status,
      });
      return;
    }
    l.history.forEach((h) => {
      rows.push({
        Client: name,
        Date: fmtDate(h.date),
        Method: h.method,
        Note: h.note || '',
        Amount: h.amount,
        'Total Price': l.grandTotal,
        Received: l.received,
        Pending: l.pending,
        Status: l.status,
      });
    });
  });

  if (format === 'csv') return download(rows, { filename: 'WebTrack-Payments', format });

  const summary = ledgers.map((l) => ({
    Client: l.client?.name || 'Unknown client',
    'Total Price': l.grandTotal,
    Received: l.received,
    Pending: l.pending,
    Status: l.status,
    GST: l.gstEnabled ? `Yes (${l.gstRate}%)` : 'No',
    'Payments Made': l.history?.length || 0,
  }));

  const wb = XLSX.utils.book_new();
  const wsDetail = XLSX.utils.json_to_sheet(rows);
  wsDetail['!cols'] = autoWidth(rows);
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = autoWidth(summary);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Payment History');
  XLSX.writeFile(wb, `WebTrack-Payments-${dayjs().format('YYYY-MM-DD')}.xlsx`);
}

/**
 * Overview table → the exact rows on screen, with the TOTAL row appended
 * so the exported file balances the same way the page does.
 */
export function exportOverview(rows, totals, format = 'xlsx') {
  const body = rows.map((r, i) => ({
    '#': i + 1,
    'Client Name': r.name,
    'Website Name': r.websiteName || '',
    'Domain Name': r.domainName || '',
    'Domain Price': r.domainPrice || 0,
    'Total Price': r.totalPrice || 0,
    'Received Amount': r.received || 0,
    'Pending Amount': r.pending || 0,
    'Payment Status': r.status,
    'Project Stage': r.stage,
  }));

  body.push({
    '#': '',
    'Client Name': 'TOTAL',
    'Website Name': '',
    'Domain Name': '',
    'Domain Price': totals.domainPrice,
    'Total Price': totals.totalPrice,
    'Received Amount': totals.received,
    'Pending Amount': totals.pending,
    'Payment Status': '',
    'Project Stage': '',
  });

  download(body, { filename: 'WebTrack-Overview', sheetName: 'Client Overview', format });
}

/** Reports page → monthly revenue + client growth in one workbook. */
export function exportReport(report, format = 'xlsx') {
  const rows = (report.monthlyRevenue || []).map((m, i) => ({
    Month: m.month,
    Revenue: m.revenue,
    'Payments Received': m.payments ?? 0,
    'New Clients': report.clientGrowth?.[i]?.newClients ?? 0,
    'Total Clients': report.clientGrowth?.[i]?.totalClients ?? 0,
  }));
  download(rows, { filename: 'WebTrack-Report', sheetName: 'Monthly Report', format });
}

export function exportActivities(activities, clientName, format = 'csv') {
  const rows = activities.map((a) => ({
    'Date & Time': dayjs(a.createdAt).format('DD MMM YYYY, hh:mm A'),
    Type: a.type,
    Action: a.action,
    Details: a.message || '',
    By: a.by || 'Admin',
  }));
  download(rows, {
    filename: `WebTrack-Activity-${(clientName || 'client').replace(/\s+/g, '-')}`,
    sheetName: 'Activity Log',
    format,
  });
}

/** Team Payment matrix → Excel / CSV export */
export function exportTeamTable({ employees = [], months = [], matrix = {}, totals = {}, year }, format = 'xlsx') {
  const rows = employees.map((emp) => {
    const row = {
      Employee: emp.name,
      Role: emp.role || 'Team Member',
    };
    months.forEach((m, mIdx) => {
      const cellVal = matrix[emp._id]?.[mIdx]?.total || 0;
      row[m] = cellVal;
    });
    row.Total = totals.rowTotals?.[emp._id] || 0;
    return row;
  });

  const totalRow = {
    Employee: 'Total',
    Role: '',
  };
  months.forEach((m, mIdx) => {
    totalRow[m] = totals.colTotals?.[mIdx] || 0;
  });
  totalRow.Total = totals.grandTotal || 0;

  rows.push(totalRow);

  download(rows, { filename: `WebTrack-Team-Payments-${year}`, sheetName: `Team ${year}`, format });
}

