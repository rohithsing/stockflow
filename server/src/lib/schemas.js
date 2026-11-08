import { z } from 'zod';

/** Empty strings coming from HTML forms should mean "not provided", not 0. */
const blankToNull = (value) =>
  value === '' || value === undefined || value === null ? null : value;

/** Same as above, but numeric strings from form inputs become real numbers. */
const blankToNullNumber = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed === '' || trimmed === undefined || trimmed === null) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
};

const optionalMoney = z.preprocess(
  blankToNullNumber,
  z
    .number({ error: 'Must be a number' })
    .min(0, 'Cannot be negative')
    .max(99999999, 'That looks too large')
    .nullable()
);

const optionalThreshold = z.preprocess(
  blankToNullNumber,
  z
    .number({ error: 'Must be a number' })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .nullable()
);

export const signupSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
    organizationName: z
      .string()
      .trim()
      .min(2, 'Organization name is required')
      .max(120, 'Keep this under 120 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160, 'Keep this under 160 characters'),
  sku: z.string().trim().min(1, 'SKU is required').max(64, 'Keep this under 64 characters'),
  description: z.preprocess(blankToNull, z.string().trim().max(2000).nullable()),
  quantityOnHand: z.coerce
    .number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative'),
  costPrice: optionalMoney,
  sellingPrice: optionalMoney,
  lowStockThreshold: optionalThreshold,
});

export const productUpdateSchema = productSchema.partial();

export const stockAdjustmentSchema = z.object({
  delta: z.coerce
    .number({ error: 'Enter a number' })
    .int('Use whole units')
    .refine((value) => value !== 0, 'Enter a non-zero amount'),
  note: z.preprocess(blankToNull, z.string().trim().max(240, 'Keep the note short').nullable()),
});

export const settingsSchema = z.object({
  defaultLowStockThreshold: z.coerce
    .number({ error: 'Must be a number' })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(1000000, 'That looks too large'),
});
