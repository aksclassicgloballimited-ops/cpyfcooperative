import { z } from "zod";

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  password: z.string().min(8),
  category: z.enum(["APPEARANCE", "NON_APPEARANCE"]),
  weeklyTarget: z.coerce.number().positive(),
  dateOfBirth: z.string().min(1),
  gender: z.string().trim().min(1),
  address: z.string().trim().min(3),
  state: z.string().trim().min(2),
  localGovernment: z.string().trim().min(2),
  nationality: z.string().trim().min(2),
  occupation: z.string().trim().min(2),
  incomeRange: z.string().trim().min(1),
  emergencyName: z.string().trim().min(2),
  emergencyPhone: z.string().trim().min(7),
  emergencyRelationship: z.string().trim().min(2),
  nomineeName: z.string().trim().min(2),
  nomineePhone: z.string().trim().min(7),
  nomineeRelationship: z.string().trim().min(2),
  nomineeAddress: z.string().trim().min(3),
  passportPhoto: z.string().min(1),
  identificationDocument: z.string().min(1),
  termsAccepted: z.literal("true"),
});

export const loanApplicationSchema = z.object({
  type: z.enum(["PROPERTY", "BUSINESS", "EMERGENCY"]),
  amount: z.coerce.number().positive(),
  purpose: z.string().trim().min(10),
});
