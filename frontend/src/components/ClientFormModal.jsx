import { useEffect, useState } from 'react';
import { Loader2, UserPlus, Globe, Wallet, Building2 } from 'lucide-react';
import { Modal, Input } from './ui';
import { clientApi } from '../lib/api';
import { useToast } from '../context/ToastContext';

const BLANK = {
  name: '', phone: '', email: '', source: 'Direct',
  websiteName: '', websiteUrl: '',
  totalPrice: '', receivedAmount: '',
  domainName: '', domainPrice: '',
};

function Step({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500/25 to-cyanic-400/20 text-brand-300 ring-1 ring-brand-400/25">
          <Icon size={14} />
        </span>
        <h4 className="text-[13px] font-semibold">{title}</h4>
        <span className="hr-soft flex-1" />
      </div>
      {children}
    </section>
  );
}

/**
 * Streamlined form to create a client with essential fields only.
 * Additional details are editable on the client's detail page.
 */
export default function ClientFormModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(BLANK);
    setErrors({});
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Client name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const created = await clientApi.create({
        ...form,
        websiteName: form.websiteName.trim() || `${form.name.trim()} Website`,
        totalPrice: Number(form.totalPrice) || 0,
        receivedAmount: Number(form.receivedAmount) || 0,
        domainPrice: Number(form.domainPrice) || 0,
      });
      toast.success(`${created.name} added — their detail page is ready.`);
      onCreated?.(created);
      onClose();
    } catch (err) {
      toast.error(err.friendlyMessage || 'Could not create the client');
    } finally {
      setBusy(false);
    }
  };

  const total = Math.max(Number(form.totalPrice) || 0, 0);
  const received = Math.max(Number(form.receivedAmount) || 0, 0);
  const pendingAmount = Math.max(total - received, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a new client"
      subtitle="Just the essentials — the rest is editable on their detail page."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="client-form" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            Create client
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="space-y-7">
        <Step icon={UserPlus} title="Client details">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Full name *"
              placeholder="Rahul Mehta"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              autoFocus
            />
            <Input
              label="Phone *"
              placeholder="+91 98200 11223"
              value={form.phone}
              onChange={set('phone')}
              error={errors.phone}
            />
            <Input
              wrapClass="sm:col-span-2"
              label="Email"
              type="email"
              placeholder="rahul@company.com"
              value={form.email}
              onChange={set('email')}
            />
          </div>
        </Step>

        <Step icon={Building2} title="Website / project">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Website name"
              placeholder="Leave blank to use the client's name"
              value={form.websiteName}
              onChange={set('websiteName')}
            />
            <Input label="Website URL" placeholder="https://example.com" value={form.websiteUrl} onChange={set('websiteUrl')} />
          </div>
        </Step>

        <Step icon={Wallet} title="Payment">
          <div className="space-y-3.5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Input
                label="Total price (₹)"
                type="number"
                min="0"
                step="any"
                placeholder="45000"
                value={form.totalPrice}
                onChange={set('totalPrice')}
              />
              <Input
                label="Received amount (₹)"
                type="number"
                min="0"
                step="any"
                placeholder="20000"
                value={form.receivedAmount}
                onChange={set('receivedAmount')}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-faint">Pending amount (₹)</span>
                <span className="text-[11.5px] text-faint">Auto: total − received</span>
              </div>
              <span className="font-display text-lg font-bold text-rose-400">
                ₹{pendingAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-faint">
            Pending and payment status update automatically — add further payments from the client's detail page.
          </p>
        </Step>

        <Step icon={Globe} title="Domain">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input label="Domain name" placeholder="example.com" value={form.domainName} onChange={set('domainName')} />
            <Input
              label="Domain price (₹)"
              type="number"
              min="0"
              step="any"
              placeholder="899"
              value={form.domainPrice}
              onChange={set('domainPrice')}
            />
          </div>
        </Step>
      </form>
    </Modal>
  );
}


