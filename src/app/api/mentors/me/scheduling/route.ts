import { z } from "zod";
import { apiCatch, apiOk, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";

const bodySchema = z.object({
  mode: z.enum(["INTERNAL", "CAL_COM", "CALENDLY"]),
  bookingUrl: z.string().url().max(300).optional(),
});

export async function PUT(req: Request) {
  try {
    const user = await requireApiUser("MENTOR");
    const body = bodySchema.parse(await readJson(req));
    const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id }, include: { calendars: true } });
    if (!mentor) throw notFound("Mentor profile not found.");
    if (body.mode === "INTERNAL") {
      await db.mentorProfile.update({ where: { id: mentor.id }, data: { schedulingMode: "INTERNAL" } });
      return apiOk({ mode: "INTERNAL" });
    }
    const provider = body.mode === "CAL_COM" ? "CAL_COM" : "CALENDLY";
    const connection = mentor.calendars.find((c) => c.provider === provider && c.active);
    if (!connection) throw conflict("Connect this provider before making it your booking method.");
    const url = new URL(body.bookingUrl ?? "");
    const host = url.hostname.toLowerCase();
    const allowed = provider === "CAL_COM" ? host === "cal.com" || host.endsWith(".cal.com") : host === "calendly.com" || host.endsWith(".calendly.com");
    if (url.protocol !== "https:" || !allowed) throw conflict("Use this provider's HTTPS booking page URL.");
    await db.$transaction([
      db.calendarConnection.update({ where: { id: connection.id }, data: { eventTypeUrl: url.toString() } }),
      db.mentorProfile.update({ where: { id: mentor.id }, data: { schedulingMode: body.mode } }),
    ]);
    return apiOk({ mode: body.mode, bookingUrl: url.toString() });
  } catch (err) {
    return apiCatch(err);
  }
}
