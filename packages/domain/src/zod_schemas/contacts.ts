import {z} from "zod";
import { Relationship } from "@project/db";

export const EmergencyContactRelationshipSchema = z
  .enum([
    Relationship.PARENT,
    Relationship.SPOUSE,
    Relationship.SIBLING,
    Relationship.FRIEND,
    Relationship.OTHER,
  ])
  .optional();

export const CreateEmergencyContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(30, "First name must be 30 characters or fewer."),
  lastName: z.string().trim().min(1, "Last name is required.").max(30, "Last name must be 30 characters or fewer."),
  phoneNumber: z
    .string()
    .trim()
    .max(20, "Phone number must be 20 characters or fewer.")
    .refine((value) => {
      // Letters are rejected before the digits are counted: stripping first
      // would reduce "abc5551234567" to ten digits and let it through.
      // Allowed is what people actually type, plus a leading country code.
      if (!/^\+?[\d\s().-]+$/.test(value)) return false;
      // Digits only, so (561) 309-3489 and 5613093489 are the same number.
      // 11 digits is allowed when it is the US country code: +1 561 309 3489.
      const digits = value.replace(/\D/g, "");
      return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
    }, "Enter a 10-digit US phone number."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  relationship: EmergencyContactRelationshipSchema,
  isPrimary: z.boolean().default(false),
});

export type CreateEmergencyContactInput = z.infer<typeof CreateEmergencyContactSchema>;

export const UpdateContactSchema = CreateEmergencyContactSchema.extend({
  id: z.string().trim().min(1, "Contact ID is required."),
});

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;