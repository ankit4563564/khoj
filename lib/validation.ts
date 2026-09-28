import { z } from "zod";
export const COLLEGE_DOMAIN = "rvu.edu.in";
export const collegeEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .refine(
    (email) => email.split("@")[1] === COLLEGE_DOMAIN,
    "Use your @rvu.edu.in email address.",
  );
export const category = z.enum([
  "Audio",
  "Drinkware",
  "Bag",
  "Electronics",
  "Keys",
  "Watch",
  "Other",
]);
export const campusLocation = z.enum([
  "Library",
  "Academic block",
  "Cafeteria",
  "Sports centre",
  "Hostel",
  "Main gate",
  "Other campus location",
]);
export const itemInput = z.object({
  name: z.string().trim().min(1).max(80),
  category,
  detail: z.string().trim().min(8).max(500),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  colour: z.string().trim().max(50).optional(),
});
export const actionInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("mark_lost"),
    itemId: z.uuid(),
    location: z.string().max(120).optional(),
    lostAt: z.iso.datetime().optional(),
  }),
  z.object({
    action: z.literal("claim"),
    reportId: z.uuid(),
    itemId: z.uuid(),
    answer: z.string().trim().min(8).max(500),
  }),
  z.object({
    action: z.literal("verify"),
    matchId: z.uuid(),
    answer: z.string().trim().min(8).max(500),
  }),
  z.object({
    action: z.literal("review"),
    matchId: z.uuid(),
    approve: z.boolean(),
  }),
  z.object({ action: z.literal("confirm_return"), recoveryId: z.uuid() }),
  z.object({
    action: z.literal("reward"),
    recoveryId: z.uuid(),
    skip: z.boolean(),
    upi: z
      .string()
      .regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/)
      .max(100)
      .optional(),
  }),
]);
export const finderInput = z.object({
  reportId: z.uuid(),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  action: z.enum(["status", "confirm_return", "confirm_reward"]),
});
export function safeRedirectPath(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/campus";
}
