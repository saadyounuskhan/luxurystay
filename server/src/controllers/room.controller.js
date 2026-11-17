import { Branch, RoomType, Room, Reservation } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { branchFilter } from '../utils/scope.js';
import { audit } from '../middleware/audit.js';
import { emit } from '../services/notify.service.js';
import { publicUrl, removeUpload } from '../middleware/upload.js';
import { searchAvailability, parseStay } from '../services/booking.service.js';

// ---- Branches ----
export const listBranches = async (req, res) => ok(res, await Branch.find({ isActive: true }).sort('city'));
export const createBranch = async (req, res) => ok(res, await Branch.create(req.body), 'Branch created', 201);
export const updateBranch = async (req, res) => ok(res, await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }), 'Branch updated');

// ---- Room types (public can view) ----
export async function listRoomTypes(req, res) {
  const filter = { isActive: true };
  if (req.query.branch) filter.branch = req.query.branch;
  ok(res, await RoomType.find(filter).populate('branch', 'name city').sort('basePrice'));
}

// Staff view: includes hidden room types. Manager sees own hotel only.
export async function manageRoomTypes(req, res) {
  const filter = req.user.role === 'manager' ? { branch: req.user.branch } : {};
  ok(res, await RoomType.find(filter).populate('branch', 'name city').sort({ branch: 1, basePrice: 1 }));
}
export async function getRoomType(req, res) {
  const t = await RoomType.findById(req.params.id).populate('branch', 'name city address phone');
  if (!t) throw new ApiError(404, 'Room type not found');
  const rooms = await Room.countDocuments({ roomType: t._id });
  ok(res, { ...t.toObject(), roomCount: rooms });
}

// Manager can only manage room types of own branch. Admin can manage all.
function checkBranch(req, branchId) {
  if (req.user.role === 'manager' && String(req.user.branch) !== String(branchId)) {
    throw new ApiError(403, 'You can only manage rooms in your own branch');
  }
}
const TYPE_FIELDS = ['name', 'description', 'basePrice', 'capacity', 'bedType', 'sizeSqm', 'amenities', 'isActive', 'view'];
const pickType = (body) => Object.fromEntries(TYPE_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

export async function createRoomType(req, res) {
  const branch = req.user.role === 'manager' ? req.user.branch : req.body.branch;
  if (!branch) throw new ApiError(400, 'Choose a branch');
  if (!req.body.name || !req.body.basePrice) throw new ApiError(400, 'Name and base price are required');
  const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const t = await RoomType.create({ ...pickType(req.body), branch, slug, model3dUrl: '/models/deluxe.glb', panoramaUrl: '/images/360/deluxe.jpg' });
  await audit(req, 'create', 'RoomType', t._id, null, { name: t.name });
  ok(res, t, 'Room type created', 201);
}

export async function updateRoomType(req, res) {
  const t = await RoomType.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Room type not found');
  checkBranch(req, t.branch);
  const before = t.toObject();
  Object.assign(t, pickType(req.body));
  await t.save();
  await audit(req, 'update', 'RoomType', t._id, { basePrice: before.basePrice, name: before.name }, pickType(req.body));
  ok(res, t, 'Room type updated');
}

export async function addRoomTypeImages(req, res) {
  const t = await RoomType.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Room type not found');
  checkBranch(req, t.branch);
  if (!req.files?.length) throw new ApiError(400, 'Choose at least one image');
  req.files.forEach((f) => t.images.push({ url: publicUrl(f, 'rooms') }));
  await t.save();
  ok(res, t, `${req.files.length} image(s) uploaded`);
}

export async function removeRoomTypeImage(req, res) {
  const t = await RoomType.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Room type not found');
  checkBranch(req, t.branch);
  const img = t.images.id(req.params.imageId);
  if (!img) throw new ApiError(404, 'Image not found');
  removeUpload(img.url);
  img.deleteOne();
  await t.save();
  ok(res, t, 'Image removed');
}

export async function setRoomTypeModel(req, res) {
  const t = await RoomType.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Room type not found');
  checkBranch(req, t.branch);
  if (!req.file) throw new ApiError(400, 'Choose a .glb or .gltf file');
  removeUpload(t.model3dUrl);
  t.model3dUrl = publicUrl(req.file, 'models');
  await t.save();
  ok(res, t, '3D model uploaded');
}

export async function setRoomTypePanorama(req, res) {
  const t = await RoomType.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Room type not found');
  checkBranch(req, t.branch);
  if (!req.files?.[0]) throw new ApiError(400, 'Choose a 360° photo (JPG, 2:1 shape)');
  removeUpload(t.panoramaUrl);
  t.panoramaUrl = publicUrl(req.files[0], 'rooms');
  await t.save();
  await audit(req, 'update', 'RoomType', t._id, null, { panorama: true });
  ok(res, t, '360° photo uploaded');
}

// ---- Rooms ----
export async function listRooms(req, res) {
  const filter = { ...branchFilter(req) };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.floor) filter.floor = Number(req.query.floor);
  if (req.query.roomType) filter.roomType = req.query.roomType;
  const rooms = await Room.find(filter).populate('roomType', 'name basePrice slug').sort({ floor: 1, number: 1 });
  ok(res, rooms);
}
export async function createRoom(req, res) {
  const type = await RoomType.findById(req.body.roomType);
  if (!type) throw new ApiError(400, 'Choose a room type');
  checkBranch(req, type.branch);
  if (!req.body.number || req.body.floor === undefined) throw new ApiError(400, 'Room number and floor are required');
  const room = await Room.create({ branch: type.branch, roomType: type._id, number: String(req.body.number).trim(), floor: Number(req.body.floor), notes: req.body.notes });
  await audit(req, 'create', 'Room', room._id, null, { number: room.number });
  emit('room:status', { room: room._id, number: room.number, status: room.status });
  ok(res, room, `Room ${room.number} added`, 201);
}
export async function updateRoom(req, res) {
  const before = await Room.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Room not found');
  const allowed = req.user.role === 'housekeeping' ? ['condition'] : ['status', 'condition', 'isOutOfOrder', 'notes', 'floor', 'number', 'roomType'];
  const changes = Object.fromEntries(allowed.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  if (changes.status === 'available' && before.status === 'occupied') throw new ApiError(400, 'Guest is in this room. Check them out first.');
  if (changes.status === 'occupied') throw new ApiError(400, 'Rooms become occupied only through check-in');
  const room = await Room.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
  await audit(req, 'update', 'Room', room._id, { status: before.status, condition: before.condition }, changes);
  emit('room:status', { room: room._id, number: room.number, status: room.status, condition: room.condition });
  ok(res, room, 'Room updated');
}

// ---- Availability (public) ----
export async function availability(req, res) {
  const { branch, checkIn, checkOut, adults } = req.validated;
  const stay = parseStay(checkIn, checkOut);
  ok(res, await searchAvailability({ branch, ...stay, adults }));
}

// ---- Tape chart: rooms × dates ----
export async function tapeChart(req, res) {
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const days = Math.min(Number(req.query.days) || 14, 31);
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(start.getTime() + days * 86400000);
  const scope = branchFilter(req);
  const rooms = await Room.find(scope).populate('roomType', 'name').sort({ floor: 1, number: 1 });
  const reservations = await Reservation.find({
    ...scope, checkIn: { $lt: end }, checkOut: { $gt: start },
    status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
  }).populate('guest', 'name').select('code room checkIn checkOut status guest');
  ok(res, { from: start, days, rooms, reservations });
}
