import { z } from "zod";

export const emailSchema = z.string().email().toLowerCase();
export const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(100)
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[0-9]/, "Must include a number");

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["STUDENT", "MENTOR"]).default("STUDENT"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  headline: z.string().max(140).optional(),
  bio: z.string().max(2000).optional(),
  location: z.string().max(80).optional(),
  timezone: z.string().max(80).optional(),
  languages: z.array(z.string()).max(10).optional(),
  website: z.string().url().or(z.literal("")).optional(),
  twitter: z.string().max(60).optional(),
  linkedin: z.string().max(80).optional(),
  github: z.string().max(60).optional(),
});

export const mentorProfileSchema = z.object({
  headline: z.string().min(10).max(140),
  bio: z.string().min(40).max(4000),
  experience: z.string().min(20).max(4000),
  rateCents: z.number().int().min(0).max(5_000_000), // paise (₹50,000 max)
  currency: z.literal("INR").default("INR"),
  sessionLength: z.number().int().min(15).max(240).default(30),
  responseTimeHrs: z.number().int().min(1).max(168).default(24),
  categoryIds: z.array(z.string()).min(1),
  skillIds: z.array(z.string()).default([]),
  achievements: z.array(z.string()).max(10).default([]),
  portfolio: z.array(z.string().url()).max(10).default([]),
  acceptingBookings: z.boolean().default(true),
});

export const availabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        weekday: z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]),
        startMinutes: z.number().int().min(0).max(1440),
        endMinutes: z.number().int().min(0).max(1440),
      })
    )
    .max(50),
});

export const bookingSchema = z.object({
  mentorProfileId: z.string().min(1),
  startsAt: z.string().datetime(),
  topic: z.string().min(2).max(140),
  notes: z.string().max(2000).optional(),
});

export const bookingCancelSchema = z.object({
  reason: z.string().max(400).optional(),
});

export const bookingRescheduleSchema = z.object({
  startsAt: z.string().datetime(),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const discoverySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  skill: z.string().optional(),
  sort: z.enum(["recommended", "rating", "sessions", "newest"]).default("recommended"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(12),
});
