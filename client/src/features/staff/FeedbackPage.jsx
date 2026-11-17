import { useState } from 'react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { fmtDate } from '../../utils/format';
import { Card, Button, Spinner, PageHeader, Empty, inputCls } from '../../components/common/ui';

export default function FeedbackPage() {
  const { data = [], isLoading } = useGet(['feedback'], '/feedback');
  const [reply, setReply] = useState({});
  const send = useAction(({ id, text }) => api.post(`/feedback/${id}/reply`, { text }), { invalidate: [['feedback']] });
  const avg = data.length ? (data.reduce((s, f) => s + f.rating, 0) / data.length).toFixed(1) : '—';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={`${data.length} reviews · average ${avg}★`} title="Guest feedback" />
      {isLoading ? <Spinner /> : data.length === 0 ? <Empty /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((f) => (
            <Card key={f._id}>
              <div className="flex justify-between"><span className="text-gold" aria-label={`${f.rating} stars`}>{'★'.repeat(f.rating)}<span className="text-[#D3CBB8]">{'★'.repeat(5 - f.rating)}</span></span><span className="text-xs text-muted">{fmtDate(f.createdAt)}</span></div>
              <p className="mt-2">{f.comment || <em className="text-muted">No comment</em>}</p>
              <p className="mt-1 text-sm text-muted">— {f.guest?.name}</p>
              {f.reply?.text ? (
                <p className="mt-3 rounded-lg bg-ivory p-3 text-sm"><span className="font-medium">Reply:</span> {f.reply.text}</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <label className="sr-only" htmlFor={`rp-${f._id}`}>Reply</label>
                  <input id={`rp-${f._id}`} className={inputCls} placeholder="Write a reply" value={reply[f._id] || ''} onChange={(e) => setReply({ ...reply, [f._id]: e.target.value })} />
                  <Button onClick={() => reply[f._id] && send.mutate({ id: f._id, text: reply[f._id] })}>Send</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
