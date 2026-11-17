import { Router } from 'express';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { STAFF, DESK, MGMT } from '../utils/scope.js';
import * as room from '../controllers/room.controller.js';
import * as resv from '../controllers/reservation.controller.js';
import * as bill from '../controllers/billing.controller.js';
import * as ops from '../controllers/ops.controller.js';
import * as admin from '../controllers/admin.controller.js';
import * as report from '../controllers/report.controller.js';
import * as contact from '../controllers/contact.controller.js';
import * as extra from '../controllers/extras.controller.js';
import * as ai from '../controllers/ai.controller.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import rateLimit from 'express-rate-limit';
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30 });
import { uploadImages, uploadModel } from '../middleware/upload.js';
import * as v from '../validators/booking.schema.js';

const r = Router();
const guest = authorize('guest');
const staff = authorize(...STAFF);
const desk = authorize(...DESK);
const mgmt = authorize(...MGMT);
const adminOnly = authorize('admin');
const anyone = protect;

// ---------- Public ----------
r.get('/branches', room.listBranches);
r.get('/room-types', room.listRoomTypes);
r.get('/room-types/manage', protect, mgmt, room.manageRoomTypes);
r.get('/room-types/:id', room.getRoomType);
r.get('/availability', validate(v.availabilitySchema, 'query'), room.availability);
r.get('/feedback/public', ops.publicFeedback);
r.get('/public/stats', contact.publicStats);
r.post('/contact', validate(v.contactSchema), contact.sendMessage);
r.get('/payments/config', bill.paymentConfig);
r.get('/availability/calendar', extra.calendar);
r.get('/room-types/:id/reviews', extra.roomReviews);
r.get('/promos/validate', extra.validatePromo);
r.post('/concierge', chatLimiter, extra.concierge);
r.get('/ai/status', ai.aiStatus);
r.post('/ai/chat', chatLimiter, optionalAuth, ai.chat);

// ---------- Rooms ----------
r.post('/branches', protect, adminOnly, room.createBranch);
r.patch('/branches/:id', protect, adminOnly, room.updateBranch);
r.post('/room-types', protect, mgmt, room.createRoomType);
r.patch('/room-types/:id', protect, mgmt, room.updateRoomType);
r.post('/room-types/:id/images', protect, mgmt, uploadImages, room.addRoomTypeImages);
r.delete('/room-types/:id/images/:imageId', protect, mgmt, room.removeRoomTypeImage);
r.post('/room-types/:id/model', protect, mgmt, uploadModel, room.setRoomTypeModel);
r.post('/room-types/:id/panorama', protect, mgmt, uploadImages, room.setRoomTypePanorama);
r.get('/rooms', protect, staff, room.listRooms);
r.post('/rooms', protect, mgmt, room.createRoom);
r.patch('/rooms/:id', protect, staff, room.updateRoom);
r.get('/front-desk/tape-chart', protect, desk, room.tapeChart);
r.get('/front-desk/today', protect, desk, resv.frontDesk);

// ---------- Reservations ----------
r.post('/reservations', protect, authorize('guest', ...DESK), validate(v.reservationSchema), resv.create);
r.get('/reservations/me', protect, guest, resv.mine);
r.get('/reservations/current', protect, guest, resv.current);
r.get('/reservations', protect, desk, resv.list);
r.get('/reservations/:id', protect, resv.getOne);
r.post('/reservations/:id/cancel', protect, authorize('guest', ...DESK), resv.cancel);
r.post('/reservations/:id/check-in', protect, desk, resv.checkIn);
r.post('/reservations/:id/check-out', protect, desk, resv.checkOut);
r.patch('/reservations/:id/move', protect, desk, extra.moveReservation);

// ---------- Billing ----------
r.get('/folios/:reservationId', protect, bill.getFolio);
r.post('/folios/:reservationId/items', protect, desk, validate(v.folioItemSchema), bill.addItem);
r.delete('/folios/:reservationId/items/:itemId', protect, desk, bill.removeItem);
r.patch('/folios/:reservationId/discount', protect, mgmt, bill.setDiscount);
r.post('/payments', protect, authorize('guest', ...DESK), validate(v.paymentSchema), bill.pay);
r.post('/payments/stripe/checkout', protect, guest, bill.stripeCheckout);
r.get('/payments/stripe/verify', protect, bill.stripeVerify);
r.get('/invoices', protect, bill.listInvoices);
r.post('/invoices', protect, bill.createInvoice);
r.get('/invoices/:id', protect, bill.getInvoice);
r.get('/invoices/:id/pdf', protect, bill.invoicePdf);

// ---------- Guest services, housekeeping, maintenance ----------
r.post('/service-requests', protect, guest, validate(v.serviceSchema), ops.createService);
r.get('/service-requests', protect, ops.listServices);
r.patch('/service-requests/:id', protect, staff, ops.updateService);
r.get('/housekeeping/tasks', protect, staff, ops.listTasks);
r.post('/housekeeping/tasks', protect, mgmt, ops.createTask);
r.patch('/housekeeping/tasks/:id', protect, staff, ops.updateTask);
r.post('/maintenance', protect, validate(v.maintenanceSchema), ops.createTicket);
r.get('/maintenance', protect, ops.listTickets);
r.patch('/maintenance/:id', protect, staff, ops.updateTicket);

// ---------- Feedback & notifications ----------
r.post('/feedback', protect, guest, validate(v.feedbackSchema), ops.createFeedback);
r.get('/feedback', protect, ops.listFeedback);
r.post('/feedback/:id/reply', protect, mgmt, ops.replyFeedback);
r.get('/notifications', anyone, ops.myNotifications);
r.patch('/notifications/read-all', anyone, ops.markAllRead);
r.patch('/notifications/:id/read', anyone, ops.markRead);

// ---------- Reports ----------
r.get('/reports/kpis', protect, staff, report.kpis);
r.get('/reports/forecast', protect, mgmt, report.forecast);
r.get('/reports/export', protect, mgmt, report.exportBookings);
r.get('/pricing/suggestions', protect, mgmt, report.pricingSuggestions);
r.post('/pricing/approve', protect, mgmt, report.approvePrice);
r.get('/promos', protect, mgmt, extra.listPromos);
r.post('/promos', protect, mgmt, extra.createPromo);
r.patch('/promos/:id', protect, mgmt, extra.updatePromo);
r.get('/night-audit', protect, mgmt, extra.listAudits);
r.post('/night-audit/run', protect, mgmt, extra.runAudit);
r.get('/night-audit/:id/pdf', protect, mgmt, extra.auditPdf);
r.get('/activity', protect, mgmt, extra.activity);

// ---------- Users, guests, settings ----------
r.get('/users', protect, mgmt, admin.listUsers);
r.post('/users', protect, adminOnly, admin.createUser);
r.patch('/users/:id', protect, adminOnly, admin.updateUser);
r.get('/guests', protect, desk, admin.listGuests);
r.get('/guests/me/export', protect, guest, admin.exportMyData);
r.delete('/guests/me', protect, guest, admin.deleteMyAccount);
r.patch('/guests/me/profile', protect, guest, admin.updateMyProfile);
r.get('/guests/:id', protect, desk, admin.getGuest);
r.get('/settings', protect, admin.getSettings);
r.patch('/settings', protect, adminOnly, admin.updateSettings);
r.get('/audit-logs', protect, adminOnly, admin.listAudit);
r.get('/contact', protect, desk, contact.listMessages);
r.patch('/contact/:id', protect, desk, contact.updateMessage);

export default r;
