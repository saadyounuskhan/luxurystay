import { useState } from 'react';
import { motion } from 'motion/react';
import { useGet, useAction } from '../../api/hooks';
import { api } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { pkr, label } from '../../utils/format';
import { assetUrl, coverOf } from '../../utils/media';
import { Card, Button, Spinner, PageHeader, Badge, Table, Td, Modal, Field, inputCls, Msg, Empty } from '../../components/common/ui';
import ModelViewer from '../../components/public/ModelViewer';
import Panorama360 from '../../components/public/Panorama360';

// Admin manages all hotels. Manager manages rooms of own hotel only.
export default function RoomsManagePage() {
  const user = useAuthStore((s) => s.user);
  const { data: types = [], isLoading } = useGet(['staffRoomTypes'], '/room-types/manage');
  const { data: rooms = [] } = useGet(['rooms'], '/rooms');
  const { data: branches = [] } = useGet(['branches'], '/branches');
  const [editType, setEditType] = useState(null);
  const [addRoom, setAddRoom] = useState(false);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState({});
  const ok = (r) => setMsg({ text: r.message });
  const fail = (e) => setMsg({ text: e, error: true });
  const inv = [['staffRoomTypes'], ['roomTypes'], ['rooms']];

  const upload = useAction(({ id, files }) => { const fd = new FormData(); [...files].forEach((f) => fd.append('images', f)); return api.post(`/room-types/${id}/images`, fd); }, { invalidate: inv, onSuccess: ok, onError: fail });
  const uploadModel = useAction(({ id, file }) => { const fd = new FormData(); fd.append('model', file); return api.post(`/room-types/${id}/model`, fd); }, { invalidate: inv, onSuccess: ok, onError: fail });
  const uploadPano = useAction(({ id, file }) => { const fd = new FormData(); fd.append('images', file); return api.post(`/room-types/${id}/panorama`, fd); }, { invalidate: inv, onSuccess: ok, onError: fail });
  const [pano, setPano] = useState(null);
  const removeImg = useAction(({ id, img }) => api.delete(`/room-types/${id}/images/${img}`), { invalidate: inv, onSuccess: ok, onError: fail });
  const toggleRoom = useAction((r) => api.patch(`/rooms/${r._id}`, { isOutOfOrder: !r.isOutOfOrder }), { invalidate: inv, onSuccess: ok, onError: fail });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Inventory" title="Rooms and room types">
        <Button variant="outline" onClick={() => setAddRoom(true)}>Add room</Button>
        <Button variant="gold" onClick={() => setEditType({})}>New room type</Button>
      </PageHeader>
      <Msg text={msg.text} error={msg.error} />
      {isLoading ? <Spinner /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {types.map((t, i) => (
            <motion.div key={t._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="grid sm:grid-cols-[200px_1fr]">
                <div className="relative h-44 bg-ivory sm:h-full">
                  {coverOf(t) ? <img src={coverOf(t)} alt={t.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">No photo</span>}
                  {!t.isActive && <span className="absolute left-2 top-2"><Badge status="cancelled">Hidden</Badge></span>}
                </div>
                <div className="p-5">
                  <p className="text-xs text-muted">{t.branch?.city}</p>
                  <h3 className="font-display text-2xl font-semibold text-navy">{t.name}</h3>
                  <p className="text-sm">{pkr(t.basePrice)} / night · {t.sizeSqm} m² · {t.capacity?.adults} adults</p>
                  <p className="text-xs text-muted">{rooms.filter((r) => r.roomType?._id === t._id).length} rooms · {t.images.length} photos · {t.panoramaUrl ? '360° ready' : 'no 360°'} · {t.model3dUrl ? '3D ready' : 'no 3D'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" className="h-9" onClick={() => setEditType(t)}>Edit</Button>
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-navy px-3 text-sm text-navy hover:bg-ivory">
                      Add photos<input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => e.target.files.length && upload.mutate({ id: t._id, files: e.target.files })} />
                    </label>
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-navy px-3 text-sm text-navy hover:bg-ivory">
                      Upload 3D (.glb)<input type="file" accept=".glb,.gltf" className="sr-only" onChange={(e) => e.target.files[0] && uploadModel.mutate({ id: t._id, file: e.target.files[0] })} />
                    </label>
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-navy px-3 text-sm text-navy hover:bg-ivory">
                      Upload 360° photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files[0] && uploadPano.mutate({ id: t._id, file: e.target.files[0] })} />
                    </label>
                    {t.model3dUrl && <Button variant="ghost" className="h-9" onClick={() => setPreview(t)}>Preview 3D</Button>}
                    {t.panoramaUrl && <Button variant="ghost" className="h-9" onClick={() => setPano(t)}>Preview 360°</Button>}
                  </div>
                </div>
              </div>
              {t.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-t border-line p-3">
                  {t.images.map((img) => (
                    <div key={img._id} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                      <img src={assetUrl(img.url)} alt="" className="h-full w-full object-cover" />
                      <button aria-label="Remove photo" onClick={() => window.confirm('Remove this photo?') && removeImg.mutate({ id: t._id, img: img._id })}
                        className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-sm text-[#8A2414]">×</button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Card title={`All rooms (${rooms.length})`}>
        {rooms.length === 0 ? <Empty /> : (
          <Table head={['Room', 'Floor', 'Type', 'Status', 'Condition', 'In service', '']} minWidth={700}>
            {rooms.map((r) => (
              <tr key={r._id}>
                <Td className="font-medium">{r.number}</Td><Td>{r.floor}</Td><Td>{r.roomType?.name}</Td>
                <Td><Badge status={r.status} /></Td><Td><Badge status={r.condition} /></Td>
                <Td>{r.isOutOfOrder ? <Badge status="cancelled">Out of order</Badge> : <Badge status="available">Yes</Badge>}</Td>
                <Td className="text-right"><Button variant="outline" className="h-9" onClick={() => toggleRoom.mutate(r)}>{r.isOutOfOrder ? 'Put back in service' : 'Take out of service'}</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <TypeModal type={editType} branches={branches} isAdmin={user.role === 'admin'} onClose={() => setEditType(null)} onDone={(t) => { setEditType(null); setMsg({ text: t }); }} />
      <AddRoomModal open={addRoom} types={types} onClose={() => setAddRoom(false)} onDone={(t) => { setAddRoom(false); setMsg({ text: t }); }} />
      <Modal open={!!pano} title={pano ? `${pano.name} · 360°` : ''} onClose={() => setPano(null)}>
        {pano && <Panorama360 src={pano.panoramaUrl} height={340} />}
        <p className="mt-2 text-xs text-muted">Tip: a real 360° photo is 2:1 in shape (for example 4096 × 2048).</p>
      </Modal>
      <Modal open={!!preview} title={preview ? `${preview.name} · 3D` : ''} onClose={() => setPreview(null)}>
        {preview && <ModelViewer src={preview.model3dUrl} alt={preview.name} height={360} />}
      </Modal>
    </div>
  );
}

function TypeModal({ type, branches, isAdmin, onClose, onDone }) {
  const isNew = type && !type._id;
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const current = { name: '', description: '', basePrice: '', sizeSqm: '', bedType: 'King', adults: 2, children: 0, amenities: '', branch: '', isActive: true, view: '', ...(type?._id ? { ...type, adults: type.capacity?.adults, children: type.capacity?.children, amenities: type.amenities?.join(', '), branch: type.branch?._id } : {}), ...f };
  const save = useAction((b) => (isNew ? api.post('/room-types', b) : api.patch(`/room-types/${type._id}`, b)), {
    invalidate: [['staffRoomTypes'], ['roomTypes']], onSuccess: (r) => { setF({}); onDone(r.message); }, onError: setErr,
  });
  const set = (e) => setF({ ...f, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = () => {
    if (!current.name || !current.basePrice) return setErr('Name and price are required');
    if (isNew && isAdmin && !current.branch) return setErr('Choose a hotel');
    save.mutate({
      name: current.name, description: current.description, basePrice: Number(current.basePrice), sizeSqm: Number(current.sizeSqm) || undefined,
      bedType: current.bedType, view: current.view, isActive: current.isActive, branch: current.branch || undefined,
      capacity: { adults: Number(current.adults), children: Number(current.children) },
      amenities: String(current.amenities).split(',').map((a) => a.trim()).filter(Boolean),
    });
  };
  return (
    <Modal open={!!type} title={isNew ? 'New room type' : `Edit ${type?.name || ''}`} onClose={() => { setF({}); onClose(); }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Name" id="t-n"><input id="t-n" name="name" className={inputCls} value={current.name} onChange={set} /></Field></div>
        {isNew && isAdmin && <div className="col-span-2"><Field label="Hotel" id="t-b"><select id="t-b" name="branch" className={inputCls} value={current.branch} onChange={set}><option value="">Choose…</option>{branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></Field></div>}
        <Field label="Price per night (PKR)" id="t-p"><input id="t-p" name="basePrice" type="number" className={inputCls} value={current.basePrice} onChange={set} /></Field>
        <Field label="Size (m²)" id="t-s"><input id="t-s" name="sizeSqm" type="number" className={inputCls} value={current.sizeSqm} onChange={set} /></Field>
        <Field label="Bed" id="t-bd"><select id="t-bd" name="bedType" className={inputCls} value={current.bedType} onChange={set}>{['King', 'Queen', 'Twin', 'Double'].map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="View" id="t-v"><input id="t-v" name="view" className={inputCls} value={current.view} onChange={set} placeholder="City view" /></Field>
        <Field label="Adults" id="t-a"><input id="t-a" name="adults" type="number" min="1" className={inputCls} value={current.adults} onChange={set} /></Field>
        <Field label="Children" id="t-c"><input id="t-c" name="children" type="number" min="0" className={inputCls} value={current.children} onChange={set} /></Field>
        <div className="col-span-2"><Field label="Amenities (comma separated)" id="t-am"><input id="t-am" name="amenities" className={inputCls} value={current.amenities} onChange={set} placeholder="Wi-Fi, AC, Mini bar" /></Field></div>
        <div className="col-span-2"><Field label="Description" id="t-d"><textarea id="t-d" name="description" rows={3} className={`${inputCls} h-auto py-2`} value={current.description} onChange={set} /></Field></div>
        <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" checked={!!current.isActive} onChange={set} className="h-4 w-4" />Show on website</label>
      </div>
      <Msg text={err} error />
      <Button className="mt-4 w-full" disabled={save.isPending} onClick={submit}>{isNew ? 'Create room type' : 'Save changes'}</Button>
      {isNew && <p className="mt-2 text-xs text-muted">After creating, add photos and a 3D model from the card.</p>}
    </Modal>
  );
}

function AddRoomModal({ open, types, onClose, onDone }) {
  const [f, setF] = useState({ roomType: '', number: '', floor: '' });
  const [err, setErr] = useState('');
  const save = useAction((b) => api.post('/rooms', b), { invalidate: [['rooms'], ['staffRoomTypes']], onSuccess: (r) => { setF({ roomType: '', number: '', floor: '' }); onDone(r.message); }, onError: setErr });
  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setErr(''); };
  return (
    <Modal open={open} title="Add a room" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Field label="Room type" id="r-t"><select id="r-t" name="roomType" className={inputCls} value={f.roomType} onChange={set}><option value="">Choose…</option>{types.map((t) => <option key={t._id} value={t._id}>{t.branch?.city} · {t.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Room number" id="r-n"><input id="r-n" name="number" className={inputCls} value={f.number} onChange={set} placeholder="207" /></Field>
          <Field label="Floor" id="r-f"><input id="r-f" name="floor" type="number" className={inputCls} value={f.floor} onChange={set} placeholder="2" /></Field>
        </div>
        <Msg text={err} error />
        <Button disabled={save.isPending} onClick={() => (!f.roomType || !f.number || f.floor === '' ? setErr('Fill all fields') : save.mutate({ ...f, floor: Number(f.floor) }))}>Add room</Button>
      </div>
    </Modal>
  );
}
