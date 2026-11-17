import { useState } from 'react';
import { Link } from 'react-router';
import { useGet, openPdf, downloadFile } from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import { pkr, fmtDate } from '../../utils/format';
import { Card, Button, Spinner, Empty, PageHeader, Table, Td, Badge, inputCls, Kpi } from '../../components/common/ui';

// Admin, manager and receptionist see hotel invoices. Guests see only their own.
export default function InvoicesPage() {
  const role = useAuthStore((s) => s.user.role);
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useGet(['invoices'], '/invoices', { q: q || undefined });
  const base = role === 'guest' ? '/guest' : '/staff';
  const total = data.reduce((s, i) => s + (i.folio?.total || 0), 0);
  const due = data.reduce((s, i) => s + Math.max(0, i.folio?.balance || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Billing" title="Invoices" />
      {role !== 'guest' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi i={0} label="Invoices" value={data.length} />
          <Kpi i={1} label="Invoiced amount" value={pkr(total)} />
          <Kpi i={2} label="Still due" value={pkr(due)} />
        </div>
      )}
      <Card>
        {role !== 'guest' && (
          <div className="mb-4"><label className="sr-only" htmlFor="inv-q">Search</label>
            <input id="inv-q" className={`${inputCls} max-w-xs`} placeholder="Search invoice number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        )}
        {isLoading ? <Spinner /> : data.length === 0 ? <Empty text={role === 'guest' ? 'Your invoices appear here after check-out, or ask reception for one any time.' : 'No invoices found'} /> : (
          <Table head={['Invoice', 'Type', role === 'guest' ? 'Booking' : 'Guest', 'Date', 'Total', 'Status', '']} minWidth={820}>
            {data.map((i) => (
              <tr key={i._id}>
                <Td className="font-medium">{i.number}</Td>
                <Td><Badge status={i.kind === 'final' ? 'checked_out' : 'pending'}>{i.kind === 'final' ? 'Tax invoice' : 'Pro-forma'}</Badge></Td>
                <Td>{role === 'guest' ? i.reservation?.code : <>{i.guest?.name}<div className="text-xs text-muted">{i.reservation?.code}</div></>}</Td>
                <Td>{fmtDate(i.issuedAt)}</Td>
                <Td>{pkr(i.folio?.total)}</Td>
                <Td><Badge status={i.folio?.balance > 0 ? 'pending' : 'paid'}>{i.folio?.balance > 0 ? `Due ${pkr(i.folio.balance)}` : 'Paid'}</Badge></Td>
                <Td className="whitespace-nowrap text-right">
                  <Link to={`${base}/invoices/${i._id}`} className="mr-1 inline-flex h-9 items-center rounded-lg bg-navy px-3 text-sm text-white">View</Link>
                  <Button variant="ghost" className="h-9" onClick={() => openPdf(`/invoices/${i._id}/pdf`)}>PDF</Button>
                  <Button variant="ghost" className="h-9" onClick={() => downloadFile(`/invoices/${i._id}/pdf?download=1`, `${i.number}.pdf`)}>Download</Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
