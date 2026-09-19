import { z } from "zod";

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  password: z.string().min(8),
  category: z.enum(["APPEARANCE", "NON_APPEARANCE"]),
  weeklyTarget: z.coerce.number().positive(),
});

export const loanApplicationSchema = z.object({
  type: z.enum(["PROPERTY", "BUSINESS", "EMERGENCY"]),
  amount: z.coerce.number().positive(),
  purpose: z.string().trim().min(10),
});
