import { z } from 'zod';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use date format YYYY-MM-DD');

export const availabilitySchema = z.object({
  branch: id, checkIn: date, checkOut: date,
  adults: z.coerce.number().int().min(1).max(6).default(1),
});

export const reservationSchema = z.object({
  roomType: id, checkIn: date, checkOut: date,
  adults: z.coerce.number().int().min(1).max(6).default(1),
  children: z.coerce.number().int().min(0).max(4).default(0),
  specialRequests: z.string().max(500).optional(),
  promoCode: z.string().trim().max(30).optional(),
  guest: id.optional(), // receptionist books for an existing guest
  walkIn: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional() }).optional(),
});

export const folioItemSchema = z.object({
  type: z.enum(['food', 'laundry', 'transport', 'other']),
  description: z.string().min(2).max(120),
  qty: z.coerce.number().int().min(1).default(1),
  unitPrice: z.coerce.number().min(1),
});

export const paymentSchema = z.object({
  reservation: id,
  amount: z.coerce.number().min(1),
  method: z.enum(['cash', 'card']).default('card'),
});

export const serviceSchema = z.object({
  type: z.enum(['room_service', 'laundry', 'wake_up', 'transport', 'housekeeping', 'late_checkout', 'other']),
  details: z.string().max(500).optional(),
  scheduledAt: z.string().optional(),
});

export const maintenanceSchema = z.object({
  room: id,
  title: z.string().min(3).max(120),
  description: z.string().max(1000).optional(),
  category: z.enum(['electrical', 'plumbing', 'ac', 'furniture', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const feedbackSchema = z.object({
  reservation: id,
  rating: z.coerce.number().int().min(1).max(5),
  categories: z.object({ cleanliness: z.number().min(1).max(5), service: z.number().min(1).max(5), food: z.number().min(1).max(5), value: z.number().min(1).max(5) }).partial().optional(),
  comment: z.string().max(1000).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(120).default('General'),
  message: z.string().trim().min(10, 'Message is too short').max(2000),
  branch: id.optional(),
});
