import { z } from "zod";

import { isValidTimezone } from "@/lib/time";
import { validateMeetingLink } from "@/lib/meeting-links";
import { validateAvailability } from "@/lib/booking-rules";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");
export const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(72, "Must be at most 72 characters")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[0-9]/, "Must include a number");

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
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

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "Links must start with https://");

// Social handles are interpolated into profile URLs, so only plain handle characters are allowed.
const handle = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9._-]+$/.test(v), "Use just your handle, without a link");

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  headline: z.string().trim().max(140).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(80).optional(),
  timezone: z.string().max(80).refine(isValidTimezone, "Pick a valid timezone").optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  // https only: a stored `javascript:` URL would run in a visitor's browser.
  website: httpsUrl.or(z.literal("")).optional(),
  twitter: handle(60).optional(),
  instagram: handle(60).optional(),
  linkedin: handle(80).optional(),
  github: handle(60).optional(),
});

export const mentorProfileSchema = z.object({
  headline: z.string().trim().min(10, "Headline must be at least 10 characters").max(140),
  bio: z.string().trim().min(40, "Bio must be at least 40 characters").max(4000),
  experience: z.string().trim().min(20, "Experience must be at least 20 characters").max(4000),
  // Free beta: no provider can charge, so a price can't be set (see src/services/payments).
  rateCents: z.number().int().min(0).max(0, "Paid sessions aren't available yet during the beta.").default(0),
  currency: z.string().length(3).default("USD"),
  sessionLength: z.number().int().min(15).max(240).default(30),
  responseTimeHrs: z.number().int().min(1).max(168).default(24),
  timezone: z.string().refine(isValidTimezone, "Pick a valid timezone").default("UTC"),
  categoryIds: z.array(z.string().min(1)).min(1, "Pick at least one category").max(5),
  skillIds: z.array(z.string().min(1)).max(20).default([]),
  achievements: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  portfolio: z.array(httpsUrl).max(10).default([]),
  acceptingBookings: z.boolean().default(true),
  twitter: handle(60).optional().default(""),
  instagram: handle(60).optional().default(""),
  linkedin: handle(80).optional().default(""),
  github: handle(60).optional().default(""),
});

export const meetingLinkSchema = z.object({
  // Empty string clears the link.
  meetingLink: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const r = validateMeetingLink(v);
      if (!r.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.error });
        return z.NEVER;
      }
      return r.url;
    }),
});

export const availabilitySchema = z
  .object({
    slots: z
      .array(
        z.object({
          weekday: z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]),
          startMinutes: z.number().int().min(0).max(1440),
          endMinutes: z.number().int().min(0).max(1440),
        }),
      )
      .max(50),
  })
  .superRefine((v, ctx) => {
    const problem = validateAvailability(v.slots);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem, path: ["slots"] });
  });

export const bookingSchema = z.object({
  mentorProfileId: z.string().min(1),
  startsAt: z.string().datetime({ message: "Pick a valid date and time." }),
  topic: z.string().trim().min(2, "Tell the mentor what you'd like to cover").max(140),
  notes: z.string().trim().max(2000).optional(),
});

export const bookingCompleteSchema = z.object({
  outcome: z.enum(["COMPLETED", "NO_SHOW"]).default("COMPLETED"),
});

export const savedMentorSchema = z.object({ mentorProfileId: z.string().min(1) });

export const bookingCancelSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});

export const bookingRescheduleSchema = z.object({
  startsAt: z.string().datetime(),
});

export const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const discoverySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  skill: z.string().optional(),
  sort: z.enum(["recommended", "rating", "sessions", "newest"]).default("recommended"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(12),
});
