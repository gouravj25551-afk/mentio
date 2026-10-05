import { z } from "zod";

import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { createNotification } from "@/features/notifications/service";
import type { AdminActionType, MentorStatus, Prisma } from "@prisma/client";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "FEATURE", "UNFEATURE"]),
  reason: z.string().trim().max(500).optional(),
});

const ACTIONS: Record<
  z.infer<typeof bodySchema>["action"],
  { type: AdminActionType; data: Prisma.MentorProfileUpdateInput; notifyType?: "MENTOR_APPROVED" | "MENTOR_REJECTED" | "SYSTEM" }
> = {
  APPROVE: { type: "APPROVE_MENTOR", data: { status: "APPROVED", approvedAt: new Date() }, notifyType: "MENTOR_APPROVED" },
  REJECT: { type: "REJECT_MENTOR", data: { status: "REJECTED", featured: false }, notifyType: "MENTOR_REJECTED" },
  SUSPEND: { type: "SUSPEND_USER", data: { status: "SUSPENDED", featured: false }, notifyType: "SYSTEM" },
  FEATURE: { type: "FEATURE_MENTOR", data: { featured: true } },
  UNFEATURE: { type: "UNFEATURE_MENTOR", data: { featured: false } },
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Server-side admin check against the database, not the (possibly stale) JWT.
    const admin = await requireApiUser("ADMIN");
    const { id } = await ctx.params;
    const { action, reason } = bodySchema.parse(await readJson(req));

    const mentor = await db.mentorProfile.findUnique({
      where: { id },
      include: { categories: { select: { categoryId: true } } },
    });
    if (!mentor) throw notFound("Mentor not found.");

    if (action === "APPROVE") {
      // Never approve the empty placeholder profile created at sign-up.
      const incomplete =
        mentor.headline.trim().length < 10 || mentor.bio.trim().length < 40 || mentor.experience.trim().length < 20 || mentor.categories.length === 0;
      if (incomplete) throw conflict("This profile is incomplete: it needs a headline, bio, experience and at least one category.");
    }
    if (action === "FEATURE" && mentor.status !== "APPROVED") throw conflict("Only approved mentors can be featured.");

    const spec = ACTIONS[action];
    const [updated] = await db.$transaction([
      db.mentorProfile.update({ where: { id }, data: spec.data, select: { id: true, status: true, featured: true } }),
      db.adminAction.create({ data: { actorId: admin.id, targetId: mentor.userId, type: spec.type, reason: reason || null } }),
    ]);

    if (spec.notifyType) {
      const statusText: Record<MentorStatus, string> = {
        PENDING: "pending review",
        APPROVED: "approved — you're now visible to students",
        REJECTED: "not approved",
        SUSPENDED: "suspended",
      };
      await createNotification({
        userId: mentor.userId,
        type: spec.notifyType,
        title: `Your mentor profile is ${statusText[updated.status]}`,
        body: reason || undefined,
        link: "/dashboard/mentor",
      });
    }
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
