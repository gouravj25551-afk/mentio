import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createNotificationSafely } from "@/features/notifications/service";
import { sendEmailSafely } from "@/services/email/send";
import { absoluteUrl, mentorApprovedEmail, mentorRejectedEmail } from "@/services/email/templates";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("Not permitted", 403);
    // Check the role in the database, not just the session token, so a demoted admin loses access immediately.
    const actor = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (actor?.role !== "ADMIN") return apiError("Not permitted", 403);
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action: "APPROVE" | "REJECT" | "SUSPEND" | "FEATURE" | "UNFEATURE" };
    const mentor = await db.mentorProfile.findUnique({ where: { id }, include: { user: true } });
    if (!mentor) return apiError("Mentor not found", 404);

    const updates: Record<string, any> = {};
    let notifType: "MENTOR_APPROVED" | "MENTOR_REJECTED" | "SYSTEM" = "SYSTEM";
    let actionType: any = "APPROVE_MENTOR";
    switch (body.action) {
      case "APPROVE": updates.status = "APPROVED"; updates.approvedAt = new Date(); notifType = "MENTOR_APPROVED"; actionType = "APPROVE_MENTOR"; break;
      case "REJECT": updates.status = "REJECTED"; updates.featured = false; notifType = "MENTOR_REJECTED"; actionType = "REJECT_MENTOR"; break;
      case "SUSPEND": updates.status = "SUSPENDED"; updates.featured = false; actionType = "SUSPEND_USER"; break;
      case "FEATURE":
        if (mentor.status !== "APPROVED") return apiError("Only approved mentors can be featured", 400);
        updates.featured = true; actionType = "FEATURE_MENTOR"; break;
      case "UNFEATURE": updates.featured = false; actionType = "UNFEATURE_MENTOR"; break;
      default: return apiError("Unknown action", 400);
    }
    const [updated] = await db.$transaction([
      db.mentorProfile.update({ where: { id }, data: updates }),
      db.adminAction.create({ data: { actorId: session.user.id, targetId: mentor.userId, type: actionType } }),
    ]);
    // The status change is committed; notification and email failures are logged, not surfaced.
    await createNotificationSafely({
      userId: mentor.userId,
      type: notifType,
      title: `Your mentor status is now ${updated.status}`,
      link: "/dashboard/mentor",
    });
    if (body.action === "APPROVE") {
      await sendEmailSafely("mentor approved", {
        to: mentor.user.email,
        ...mentorApprovedEmail({ name: mentor.user.name, dashboardUrl: absoluteUrl(env.NEXT_PUBLIC_APP_URL, "/dashboard/mentor") }),
      });
    } else if (body.action === "REJECT") {
      await sendEmailSafely("mentor rejected", { to: mentor.user.email, ...mentorRejectedEmail({ name: mentor.user.name }) });
    }
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
