import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Download, Trash2, Edit2, FileSpreadsheet, FileText,
  Calendar, IndianRupee, Wallet, Check, X, Loader2, UserPlus, ArrowUpRight,
  TrendingUp, TrendingDown, PiggyBank, Percent,
} from 'lucide-react';
import { PageTransition, Modal, Input, Select, EmptyState, ConfirmDialog, SkeletonCard } from '../components/ui';
import { RevenueVsExpenseChart } from '../components/Charts';
import { teamApi } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { money, fmtDate, toInputDate, initials, avatarGradient } from '../lib/format';
import { exportTeamTable } from '../lib/exportUtils';

const ROLES = [
  'UI/UX Designer',
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Mobile App Developer',
  'Video Editor',
  'Graphic Designer',
  'SEO Specialist',
  'Content Writer',
  'Project Manager',
  'Other',
];

export default function Team() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Employee Modal (Add / Edit)
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', role: 'Full-Stack Developer' });
  const [empBusy, setEmpBusy] = useState(false);
  const [empError, setEmpError] = useState('');

  // Delete Employee Dialog
  const [toDeleteEmp, setToDeleteEmp] = useState(null);
  const [deletingEmp, setDeletingEmp] = useState(false);

  // Month Cell / Payment History Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { employee, monthIdx, monthName, year }
  const [cellPayments, setCellPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // New Payment Form in Cell Modal
  const [payForm, setPayForm] = useState({ amount: '', date: toInputDate(new Date()), note: '' });
  const [payBusy, setPayBusy] = useState(false);
  const [payNoteTouched, setPayNoteTouched] = useState(false);

  // Editing existing payment inside Cell Modal
  const [editingPayId, setEditingPayId] = useState(null);
  const [editPayForm, setEditPayForm] = useState({ amount: '', date: '', note: '' });
  const [editPayNoteTouched, setEditPayNoteTouched] = useState(false);

  const loadMatrix = useCallback(() => {
    setLoading(true);
    teamApi
      .getMatrix({ year })
      .then(setData)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load team data'))
      .finally(() => setLoading(false));
  }, [year, toast]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  /* ── Employee Form Handlers ─────────────────────────── */
  const openAddEmployee = () => {
    setEditingEmp(null);
    setEmpForm({ name: '', role: 'Full-Stack Developer' });
    setEmpError('');
    setEmpModalOpen(true);
  };

  const openEditEmployee = (emp) => {
    setEditingEmp(emp);
    setEmpForm({ name: emp.name, role: emp.role || 'Team Member' });
    setEmpError('');
    setEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.name.trim()) return setEmpError('Employee name is required');

    setEmpBusy(true);
    try {
      if (editingEmp) {
        await teamApi.updateEmployee(editingEmp._id, empForm);
        toast.success(`Updated ${empForm.name}`);
      } else {
        await teamApi.createEmployee(empForm);
        toast.success(`Added ${empForm.name} to the team`);
      }
      setEmpModalOpen(false);
      loadMatrix();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not save employee');
    } finally {
      setEmpBusy(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!toDeleteEmp) return;
    setDeletingEmp(true);
    try {
      await teamApi.deleteEmployee(toDeleteEmp._id);
      toast.success(`${toDeleteEmp.name} and their payment history were deleted.`);
      setToDeleteEmp(null);
      loadMatrix();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not delete employee');
    } finally {
      setDeletingEmp(false);
    }
  };

  /* ── Payment Cell History Handlers ─────────────────── */
  const openCellModal = (emp, monthIdx, monthName) => {
    setActiveCell({ employee: emp, monthIdx, monthName, year });
    // Default date to mid of that month
    const defaultDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-15`;
    setPayForm({ amount: '', date: defaultDate, note: '' });
    setPayNoteTouched(false);
    setEditingPayId(null);
    setPayModalOpen(true);

    setLoadingPayments(true);
    teamApi
      .listPayments({ employeeId: emp._id, year, month: monthIdx })
      .then(setCellPayments)
      .catch((e) => toast.error(e.friendlyMessage || 'Could not load payment entries'))
      .finally(() => setLoadingPayments(false));
  };

  const reloadCellPayments = async () => {
    if (!activeCell) return;
    const list = await teamApi.listPayments({
      employeeId: activeCell.employee._id,
      year: activeCell.year,
      month: activeCell.monthIdx,
    });
    setCellPayments(list);
    loadMatrix(); // auto recalculate overall table!
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter an amount greater than 0');
    if (!payForm.note.trim()) {
      setPayNoteTouched(true);
      return toast.error('Please provide a reason for this expense.');
    }

    setPayBusy(true);
    try {
      await teamApi.addPayment({
        employeeId: activeCell.employee._id,
        amount,
        date: payForm.date || new Date().toISOString(),
        note: payForm.note,
      });
      toast.success(`${money(amount)} added for ${activeCell.employee.name}`);
      setPayForm({ ...payForm, amount: '', note: '' });
      setPayNoteTouched(false);
      await reloadCellPayments();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not add payment entry');
    } finally {
      setPayBusy(false);
    }
  };

  const startEditPayment = (p) => {
    setEditingPayId(p._id);
    setEditPayForm({
      amount: String(p.amount),
      date: toInputDate(p.date),
      note: p.note || '',
    });
    setEditPayNoteTouched(false);
  };

  const handleSaveEditPayment = async (pId) => {
    const amount = Number(editPayForm.amount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (!editPayForm.note.trim()) {
      setEditPayNoteTouched(true);
      return toast.error('Please provide a reason for this expense.');
    }

    try {
      await teamApi.updatePayment(pId, {
        amount,
        date: editPayForm.date,
        note: editPayForm.note,
      });
      toast.success('Payment entry updated');
      setEditingPayId(null);
      await reloadCellPayments();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not update payment entry');
    }
  };

  const handleDeletePayment = async (pId) => {
    try {
      await teamApi.deletePayment(pId);
      toast.success('Payment entry removed');
      await reloadCellPayments();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not delete payment entry');
    }
  };

  /* ── Export Handler ─────────────────────────────────── */
  const handleExport = (format) => {
    if (!data || !data.employees?.length) return toast.error('No team data to export.');
    try {
      exportTeamTable(data, format);
      toast.success(`Exported team payment table to ${format.toUpperCase()}.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cellTotalInModal = useMemo(
    () => cellPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [cellPayments]
  );

  return (
    <PageTransition className="space-y-4">
      {/* ── Toolbar ── */}
      <section className="glass-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="chip-brand mb-2">Team & Payroll</span>
            <h1 className="font-display text-2xl font-bold tracking-tight">Team Management</h1>
            <p className="mt-1 text-xs text-dim">
              Track team members, monthly payouts, and payment history in a spreadsheet-style table.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
              <Calendar size={14} className="text-faint" />
              <span className="text-xs font-semibold text-dim">Year:</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={() => handleExport('xlsx')} className="btn-ghost" title="Export to Excel">
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button onClick={() => handleExport('csv')} className="btn-ghost" title="Export to CSV">
              <FileText size={15} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={openAddEmployee} className="btn-primary">
              <UserPlus size={16} /> Add Employee
            </button>
          </div>
        </div>
      </section>

      {/* ── Business Overview (P&L) ── */}
      {!loading && data && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-semibold">Business Overview</h2>
            <span className="text-[11px] text-faint">— revenue vs team payroll for {year}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="glass-card px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                <TrendingUp size={12} className="text-emerald-400" /> Revenue
              </p>
              <p className="mt-1 font-display text-xl font-bold text-emerald-400">{money(data.pnl?.revenue || 0)}</p>
            </div>
            <div className="glass-card px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                <TrendingDown size={12} className="text-rose-400" /> Team Expense
              </p>
              <p className="mt-1 font-display text-xl font-bold text-rose-400">{money(data.pnl?.expense || 0)}</p>
            </div>
            <div className="glass-card px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                <PiggyBank size={12} className={data.pnl?.netProfit >= 0 ? 'text-brand-300' : 'text-rose-400'} /> Net Profit
              </p>
              <p className={`mt-1 font-display text-xl font-bold ${data.pnl?.netProfit >= 0 ? 'text-brand-300' : 'text-rose-400'}`}>
                {money(data.pnl?.netProfit || 0)}
              </p>
            </div>
            <div className="glass-card px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                <Percent size={12} className="text-amber-400" /> Profit Margin
              </p>
              <p className="mt-1 font-display text-xl font-bold text-amber-400">
                {(data.pnl?.marginPercent ?? 0).toFixed(1)}%
              </p>
            </div>
          </div>

          {data.pnl?.monthly?.some((m) => m.revenue || m.expense) && (
            <RevenueVsExpenseChart data={data.pnl.monthly} />
          )}
        </section>
      )}

      {/* ── Stat Cards ── */}
      {!loading && data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass-card px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">Team Members</p>
            <p className="mt-1 font-display text-xl font-bold text-brand-300">{data.employees?.length || 0}</p>
          </div>
          <div className="glass-card px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">Total Paid ({year})</p>
            <p className="mt-1 font-display text-xl font-bold text-emerald-400">{money(data.totals?.grandTotal || 0)}</p>
          </div>
          <div className="glass-card px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">Active Months</p>
            <p className="mt-1 font-display text-xl font-bold text-cyan-300">
              {data.totals?.colTotals?.filter((t) => t > 0).length || 0} / 12
            </p>
          </div>
          <div className="glass-card px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">Monthly Average</p>
            <p className="mt-1 font-display text-xl font-bold text-amber-400">
              {money(Math.round((data.totals?.grandTotal || 0) / 12))}
            </p>
          </div>
        </div>
      )}

      {/* ── Spreadsheet Payment Table ── */}
      {loading ? (
        <SkeletonCard className="h-80" />
      ) : !data?.employees?.length ? (
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title="No team members added yet"
            message="Add employees to start tracking monthly stipends and payouts."
            action={
              <button onClick={openAddEmployee} className="btn-primary mt-2">
                <UserPlus size={16} /> Add your first employee
              </button>
            }
          />
        </div>
      ) : (
        <section className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-faint sticky left-0 z-20 bg-slate-900/90 backdrop-blur-md">
                    Employee
                  </th>
                  {data.months.map((m, mIdx) => {
                    const monthPnl = data.pnl?.monthly?.[mIdx];
                    const hasData = monthPnl && (monthPnl.revenue || monthPnl.expense);
                    return (
                      <th key={m} className="p-3.5 text-right font-bold uppercase tracking-wider text-faint min-w-[85px]">
                        <span className="inline-flex items-center gap-1.5">
                          {hasData && (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${monthPnl.profit >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              title={`${monthPnl.profit >= 0 ? 'Profitable' : 'Loss'}: ${money(monthPnl.profit)} net`}
                            />
                          )}
                          {m}
                        </span>
                      </th>
                    );
                  })}
                  <th className="p-3.5 text-right font-bold uppercase tracking-wider text-brand-300 min-w-[100px] bg-brand-500/10">
                    Total
                  </th>
                  <th className="p-3.5 text-center font-bold uppercase tracking-wider text-faint w-[90px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.employees.map((emp) => {
                  const empRowTotal = data.totals?.rowTotals?.[emp._id] || 0;

                  return (
                    <tr key={emp._id} className="group hover:bg-white/[0.03] transition-colors">
                      {/* Employee Column */}
                      <td className="p-3.5 font-medium sticky left-0 z-10 bg-slate-950/80 backdrop-blur-md group-hover:bg-slate-900/90 transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${avatarGradient(
                              emp.name
                            )} text-[11px] font-bold text-white shadow-md`}
                          >
                            {initials(emp.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm text-slate-100">{emp.name}</p>
                            <p className="truncate text-[10.5px] text-faint">{emp.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* 12 Months Cells */}
                      {data.months.map((mName, mIdx) => {
                        const cell = data.matrix?.[emp._id]?.[mIdx] || { total: 0, count: 0 };
                        const hasVal = cell.total > 0;

                        return (
                          <td
                            key={mName}
                            onClick={() => openCellModal(emp, mIdx, mName)}
                            className="p-3 text-right cursor-pointer transition-colors hover:bg-brand-500/15"
                          >
                            {hasVal ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="font-semibold text-emerald-400 text-[13px]">
                                  {money(cell.total)}
                                </span>
                                {cell.count > 1 && (
                                  <span className="text-[9.5px] text-faint bg-white/10 px-1.5 rounded-full">
                                    {cell.count} payments
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-faint hover:text-white/50">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Row Total */}
                      <td className="p-3.5 text-right font-bold text-sm text-emerald-300 bg-brand-500/5">
                        {money(empRowTotal)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => openEditEmployee(emp)}
                            className="p-1.5 rounded-lg text-faint hover:bg-white/10 hover:text-white transition"
                            title="Edit Employee"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setToDeleteEmp(emp)}
                            className="p-1.5 rounded-lg text-faint hover:bg-rose-500/15 hover:text-rose-400 transition"
                            title="Delete Employee"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer Totals Row */}
              <tfoot>
                <tr className="border-t-2 border-brand-500/30 bg-slate-900/90 font-bold">
                  <td className="p-3.5 font-bold text-sm text-white uppercase tracking-wider sticky left-0 z-20 bg-slate-900/90 backdrop-blur-md">
                    Total
                  </td>
                  {data.months.map((mName, mIdx) => {
                    const colTotal = data.totals?.colTotals?.[mIdx] || 0;
                    return (
                      <td key={mName} className="p-3.5 text-right font-bold text-sm text-emerald-400">
                        {colTotal > 0 ? money(colTotal) : '—'}
                      </td>
                    );
                  })}
                  {/* Bottom Right Corner: Grand Overall Total */}
                  <td className="p-3.5 text-right font-black text-base text-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-500/30">
                    {money(data.totals?.grandTotal || 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* ── Employee Modal (Add / Edit) ── */}
      <Modal
        open={empModalOpen}
        onClose={() => setEmpModalOpen(false)}
        title={editingEmp ? `Edit ${editingEmp.name}` : 'Add Employee'}
        subtitle="Specify team member details"
        size="md"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEmpModalOpen(false)} disabled={empBusy}>
              Cancel
            </button>
            <button type="submit" form="emp-form" className="btn-primary" disabled={empBusy}>
              {empBusy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              {editingEmp ? 'Save changes' : 'Add Employee'}
            </button>
          </>
        }
      >
        <form id="emp-form" onSubmit={handleSaveEmployee} className="space-y-4">
          <Input
            label="Name *"
            placeholder="e.g. Sarang"
            value={empForm.name}
            onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
            error={empError}
            autoFocus
          />
          <Select
            label="Role"
            options={ROLES.map((r) => ({ value: r, label: r }))}
            value={empForm.role}
            onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
          />
        </form>
      </Modal>

      {/* ── Delete Employee Dialog ── */}
      <ConfirmDialog
        open={!!toDeleteEmp}
        onClose={() => setToDeleteEmp(null)}
        onConfirm={handleDeleteEmployee}
        busy={deletingEmp}
        title={`Delete ${toDeleteEmp?.name || 'employee'}?`}
        message="This will permanently remove the employee and all their associated monthly payment entries. This action cannot be undone."
        confirmLabel="Delete employee"
      />

      {/* ── Month Cell Payment History Modal ── */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title={
          activeCell
            ? `Payments for ${activeCell.employee.name} — ${activeCell.monthName} ${activeCell.year}`
            : 'Month Payments'
        }
        subtitle="Manage payments for this month (multiple payments supported)"
        size="lg"
      >
        {activeCell && (
          <div className="space-y-5">
            {/* Add Payment Form */}
            <form onSubmit={handleAddPayment} className="glass-card p-4 space-y-3.5 bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                + Add Payment Entry
              </p>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Input
                  label="Amount (₹) *"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="5000"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                />
                <Input
                  label="Date *"
                  type="date"
                  value={payForm.date}
                  onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                />
                <Input
                  label="Reason for spending *"
                  placeholder="e.g. Client meeting travel expenses"
                  value={payForm.note}
                  onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                  error={payNoteTouched && !payForm.note.trim() ? 'Please provide a reason for this expense.' : ''}
                  onBlur={() => setPayNoteTouched(true)}
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={payBusy} className="btn-primary btn-sm">
                  {payBusy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Add Payment
                </button>
              </div>
            </form>

            {/* Total Paid in Month Banner */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
              <span className="text-xs font-medium text-dim">Total Paid in {activeCell.monthName}:</span>
              <span className="font-display text-lg font-bold text-emerald-400">
                {money(cellTotalInModal)}
              </span>
            </div>

            {/* List of Payments for this Month */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">
                Payment History ({cellPayments.length})
              </p>
              {loadingPayments ? (
                <div className="py-8 text-center text-xs text-faint">Loading payments…</div>
              ) : !cellPayments.length ? (
                <p className="rounded-xl border border-dashed border-white/12 py-6 text-center text-xs text-faint">
                  No payments recorded for {activeCell.monthName} {activeCell.year} yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {cellPayments.map((p) => {
                    const isEditingThis = editingPayId === p._id;

                    if (isEditingThis) {
                      return (
                        <li key={p._id} className="rounded-xl bg-white/10 p-3.5 ring-1 ring-brand-400/40 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Input
                              label="Amount (₹)"
                              type="number"
                              min="0"
                              value={editPayForm.amount}
                              onChange={(e) => setEditPayForm({ ...editPayForm, amount: e.target.value })}
                            />
                            <Input
                              label="Date"
                              type="date"
                              value={editPayForm.date}
                              onChange={(e) => setEditPayForm({ ...editPayForm, date: e.target.value })}
                            />
                            <Input
                              label="Reason for spending *"
                              placeholder="e.g. Client meeting travel expenses"
                              value={editPayForm.note}
                              onChange={(e) => setEditPayForm({ ...editPayForm, note: e.target.value })}
                              error={editPayNoteTouched && !editPayForm.note.trim() ? 'Please provide a reason for this expense.' : ''}
                              onBlur={() => setEditPayNoteTouched(true)}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingPayId(null)}
                              className="btn-ghost btn-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditPayment(p._id)}
                              className="btn-primary btn-sm"
                            >
                              <Check size={13} /> Save
                            </button>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={p._id}
                        className="group flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3.5 ring-1 ring-white/8 transition hover:bg-white/8"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
                            <IndianRupee size={14} />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-emerald-400">{money(p.amount)}</p>
                            <p className="text-[11px] text-faint">{fmtDate(p.date)}</p>
                            {p.note && <p className="mt-0.5 text-[13px] font-medium text-dim">{p.note}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => startEditPayment(p)}
                            className="p-1.5 rounded-lg text-faint hover:bg-white/10 hover:text-white transition"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p._id)}
                            className="p-1.5 rounded-lg text-faint hover:bg-rose-500/15 hover:text-rose-400 transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
