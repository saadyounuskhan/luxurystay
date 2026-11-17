import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password needs a number'),
  phone: z.string().trim().optional(),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: 'Please accept the privacy policy' }) }),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').optional(),
  phone: z.string().trim().max(30).optional(),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'New password needs a letter').regex(/\d/, 'New password needs a number'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, { message: 'New password must be different', path: ['newPassword'] });
