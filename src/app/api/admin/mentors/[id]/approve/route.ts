import { auth } from "@/lib/auth";
import { apiCatch, apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { createNotification } from "@/features/notifications/service";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") return apiError("Not permitted", 403);
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action: "APPROVE" | "REJECT" | "SUSPEND" | "FEATURE" | "UNFEATURE" };
    const mentor = await db.mentorProfile.findUnique({ where: { id }, include: { user: true } });
    if (!mentor) return apiError("Mentor not found", 404);

    const updates: Record<string, any> = {};
    let notifType: "MENTOR_APPROVED" | "MENTOR_REJECTED" | "SYSTEM" = "SYSTEM";
    let actionType: any = "APPROVE_MENTOR";
    switch (body.action) {
      case "APPROVE": updates.status = "APPROVED"; updates.approvedAt = new Date(); notifType = "MENTOR_APPROVED"; actionType = "APPROVE_MENTOR"; break;
      case "REJECT": updates.status = "REJECTED"; notifType = "MENTOR_REJECTED"; actionType = "REJECT_MENTOR"; break;
      case "SUSPEND": updates.status = "SUSPENDED"; actionType = "SUSPEND_USER"; break;
      case "FEATURE": updates.featured = true; actionType = "FEATURE_MENTOR"; break;
      case "UNFEATURE": updates.featured = false; actionType = "UNFEATURE_MENTOR"; break;
      default: return apiError("Unknown action", 400);
    }
    const [updated] = await db.$transaction([
      db.mentorProfile.update({ where: { id }, data: updates }),
      db.adminAction.create({ data: { actorId: session.user.id, targetId: mentor.userId, type: actionType } }),
    ]);
    await createNotification({
      userId: mentor.userId,
      type: notifType,
      title: `Your mentor status is now ${updated.status}`,
      link: "/dashboard/mentor",
    });
    return apiOk(updated);
  } catch (err) {
    return apiCatch(err);
  }
}
