import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const CashierPinLoginSchema = z.object({
  terminalId: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be between 4 and 6 digits'),
});

export const OpenShiftSchema = z.object({
  terminalId: z.string().min(1),
  openingFloat: z.number().min(0),
});

export const CloseShiftSchema = z.object({
  countedCash: z.number().min(0),
  notes: z.string().optional(),
});

export const BarcodeLookupSchema = z.object({
  barcode: z.string().min(1),
  branchId: z.string().min(1),
});

export const CreateSaleSchema = z.object({
  offlineId: z.string().optional(),
  branchId: z.string().min(1),
  shiftId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      barcode: z.string().min(1),
      qty: z.number().positive(),
      weightKg: z.number().optional(),
      unitPrice: z.number().min(0),
      discountAmount: z.number().min(0).default(0),
    })
  ).min(1),
  payments: z.array(
    z.object({
      method: z.enum(['CASH', 'CARD', 'SPLIT_CASH', 'SPLIT_CARD']),
      amount: z.number().positive(),
      cashTendered: z.number().optional(),
      changeGiven: z.number().optional(),
      reference: z.string().optional(),
    })
  ).min(1),
});

export const PayHereInitSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.literal('LKR').default('LKR'),
  customerName: z.string().default('Counter Customer'),
  customerEmail: z.string().email().default('cashier@mysupermarket.lk'),
  customerPhone: z.string().default('0770000000'),
});
