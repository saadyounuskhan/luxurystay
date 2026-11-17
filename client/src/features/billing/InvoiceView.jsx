import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useGet, downloadFile } from '../../api/hooks';
import { pkr, fmtDate, label } from '../../utils/format';
import { Button, Spinner } from '../../components/common/ui';

// A4-style invoice on screen. "Print" uses the browser; "Download PDF" gets the server PDF.
export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGet(['invoice', id], `/invoices/${id}`);
  if (isLoading || !data) return <Spinner />;
  const { invoice: inv, folio, reservation: r, payments, company } = data;
  const paid = folio.balance <= 0;

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
        <Button onClick={() => window.print()}>Print</Button>
        <Button variant="gold" onClick={() => downloadFile(`/invoices/${id}/pdf?download=1`, `${inv.number}.pdf`)}>Download PDF</Button>
      </div>

      <motion.article id="invoice" initial={{ opacity: 0, y: 20, rotateX: 6 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.6 }} style={{ transformPerspective: 1200 }}
        className="relative mx-auto max-w-[820px] overflow-hidden rounded-2xl border border-line bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 bg-navy px-10 py-8 text-[#E9DDBF]">
          <div>
            <p className="font-display text-4xl font-semibold text-white">LuxuryStay</p>
            <p className="text-[10px] tracking-[0.4em] text-gold">HOSPITALITY</p>
            <p className="mt-2 text-xs text-[#C7CBD8]">{company.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-white">{inv.kind === 'final' ? 'TAX INVOICE' : 'PRO-FORMA INVOICE'}</p>
            <p className="mt-1 text-xs text-[#C7CBD8]">{r.branch?.name}<br />{r.branch?.address}<br />{r.branch?.phone} · {company.email}</p>
          </div>
        </header>
        <div className="h-1 bg-gold" />

        <div className="px-10 py-8">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[['Invoice no.', inv.number], ['Issue date', fmtDate(inv.issuedAt)], ['Booking', r.code], ['NTN', company.ntn]].map(([k, v]) => (
              <div key={k}><dt className="text-[10px] uppercase tracking-wider text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-ivory p-5">
              <p className="text-[10px] font-semibold tracking-wider text-gold-dark">BILLED TO</p>
              <p className="mt-1 text-lg font-semibold">{inv.guest?.name}</p>
              <p className="text-sm text-muted">{inv.guest?.email}<br />{inv.guest?.phone}</p>
            </div>
            <div className="rounded-xl border border-line bg-ivory p-5">
              <p className="text-[10px] font-semibold tracking-wider text-gold-dark">STAY DETAILS</p>
              <p className="mt-1 text-lg font-semibold">{r.roomType?.name} · Room {r.room?.number}</p>
              <p className="text-sm text-muted">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}<br />{r.nights} night(s) · {r.adults} adult(s){r.children ? `, ${r.children} child(ren)` : ''}</p>
            </div>
          </div>

          <table className="mt-8 w-full text-sm">
            <thead><tr className="bg-navy text-left text-xs text-white"><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5">Qty</th><th className="px-3 py-2.5">Rate</th><th className="px-3 py-2.5 text-right">Amount</th></tr></thead>
            <tbody>
              {folio.items.map((it, k) => (
                <tr key={it._id} className={k % 2 ? '' : 'bg-[#FBF8F1]'}>
                  <td className="px-3 py-2.5">{it.description || label(it.type)}</td><td className="px-3 py-2.5">{it.qty}</td>
                  <td className="px-3 py-2.5">{pkr(it.unitPrice)}</td><td className="px-3 py-2.5 text-right">{pkr(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="relative h-24 w-48">
              {paid && <div className="absolute inset-0 flex -rotate-12 items-center justify-center rounded-xl border-4 border-[#1F5A2E] text-4xl font-bold text-[#1F5A2E]">PAID</div>}
            </div>
            <dl className="w-full max-w-xs text-sm">
              <div className="flex justify-between py-1 text-muted"><dt>Subtotal</dt><dd>{pkr(folio.subtotal)}</dd></div>
              {folio.discount > 0 && <div className="flex justify-between py-1 text-muted"><dt>Discount</dt><dd>− {pkr(folio.discount)}</dd></div>}
              <div className="flex justify-between py-1 text-muted"><dt>Sales tax ({folio.taxRate}%)</dt><dd>{pkr(folio.taxAmount)}</dd></div>
              <div className="my-2 flex justify-between rounded-lg bg-navy px-3 py-2.5 font-semibold text-white"><dt>Total</dt><dd>{pkr(folio.total)}</dd></div>
              <div className="flex justify-between py-1"><dt>Amount paid</dt><dd>{pkr(folio.paid)}</dd></div>
              <div className={`flex justify-between py-1 font-semibold ${paid ? 'text-[#1F5A2E]' : 'text-[#8A2414]'}`}><dt>Balance due</dt><dd>{pkr(folio.balance)}</dd></div>
            </dl>
          </div>

          {payments.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-semibold tracking-wider text-gold-dark">PAYMENTS RECEIVED</p>
              {payments.map((p) => (
                <p key={p._id} className="flex justify-between border-b border-line py-1.5 text-sm">
                  <span>{fmtDate(p.createdAt)} · {p.method.toUpperCase()}{p.receivedBy ? ` · by ${p.receivedBy.name}` : ''}</span><span>{pkr(p.amount)}</span>
                </p>
              ))}
            </div>
          )}

          <footer className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">
            <p>Check-out 12:00. All amounts in Pakistani Rupees and include applicable taxes. This is a computer-generated invoice.</p>
            <p className="mt-2 font-display text-base italic text-gold-dark">Thank you for staying with LuxuryStay. We look forward to welcoming you again.</p>
            <p className="mt-1">{company.website} · {company.email} · {company.phone}</p>
          </footer>
        </div>
      </motion.article>
    </div>
  );
}
