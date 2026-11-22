import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingLinkForm } from "@/components/dashboard/meeting-link-form";
import Link from "next/link";
import { ALLOWED_MEETING_HOSTS } from "@/lib/meeting-links";
import { connectionHealth, PROVIDERS, type ProviderSlug } from "@/services/calendar/oauth";
import { env } from "@/lib/env";

export const metadata = { title: "Calendars & meeting link" };

const MESSAGES: Record<string, string> = {
  state: "That connection attempt couldn't be verified. Please try again.",
  denied: "The connection was cancelled.",
  token: "The provider didn't accept the connection. Please try again.",
  unavailable: "This integration isn't available.",
  forbidden: "Only mentors can connect a calendar.",
};

export default async function CalendarsPage({ searchParams }: { searchParams: Promise<{ error?: string; connected?: string }> }) {
  const user = await requireRole("MENTOR");
  const { error, connected: connectionCreated } = await searchParams;
  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id }, include: { calendars: true } });
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding first.</p>;

  // Only providers an operator has explicitly enabled are shown at all.
  const providers = await Promise.all(
    (Object.entries(PROVIDERS) as [ProviderSlug, (typeof PROVIDERS)[ProviderSlug]][])
      .filter(([, p]) => p.enabled())
      .map(async ([slug, p]) => {
        const conn = mentor.calendars.find((c) => c.provider === p.provider);
        return { slug, name: p.name, health: conn ? await connectionHealth(conn) : null };
      }),
  );
  const hasAvailability = (await db.availability.count({ where: { mentorProfileId: mentor.id } })) > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Calendars &amp; meeting link</h1>
        <p className="text-sm text-muted-foreground">
          Students always book (and later pay) on Mentio, inside the free hours you set. Connect Cal.com or Calendly and
          anything booked there is hidden here automatically, so you are never double-booked.
        </p>
      </div>

      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{MESSAGES[error] ?? "Something went wrong."}</p> : null}
      {connectionCreated ? <p role="status" className="rounded-md bg-muted p-3 text-sm">Connected.</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Your free hours
            {hasAvailability ? <Badge variant="success">Set</Badge> : <Badge variant="warning">Not set</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {hasAvailability
              ? "Students pick from these weekly hours, in their own timezone. A booked slot disappears for everyone else."
              : "You have no free hours yet, so students can't book you. Add your weekly hours first."}
          </p>
          <Button asChild variant={hasAvailability ? "outline" : "brand"}><Link href="/dashboard/mentor/availability">{hasAvailability ? "Edit free hours" : "Set free hours"}</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Your own link
            {mentor.meetingLink ? <Badge variant="success">In use</Badge> : <Badge variant="secondary">Mentio rooms</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MeetingLinkForm initial={mentor.meetingLink ?? ""} hosts={ALLOWED_MEETING_HOSTS} />
          <p className="text-xs text-muted-foreground">
            This is the private Join link for Mentio bookings. Mentio doesn&apos;t add anything to your calendar.
          </p>
        </CardContent>
      </Card>

      {providers.length === 0 ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Cal.com &amp; Calendly <Badge variant="secondary">Coming soon</Badge></CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Calendar sync isn&apos;t switched on yet. Until then, keep your Mentio free hours up to date.</p></CardContent>
        </Card>
      ) : null}

      {providers.map((p) => (
        <Card key={p.slug}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {p.name}
              {p.health === "connected" ? <Badge variant="success">Connected</Badge> : p.health ? <Badge variant="warning">Reconnect needed</Badge> : <Badge variant="secondary">Not connected</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Connect {p.name} so meetings booked there hide the same times on Mentio. Your Mentio free hours stay the source of truth.</p>
            {p.health === "connected" ? <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Webhook URL: {env.NEXT_PUBLIC_APP_URL}/api/webhooks/calendars/{p.slug}. Add it to {p.name} using the app signing secret configured for Mentio.</p> : null}
            {p.health ? (
              <form action={`/api/calendars/${p.slug}/disconnect`} method="post">
                <Button variant="outline" type="submit">Disconnect</Button>
              </form>
            ) : null}
            {p.health !== "connected" ? (
              <Button asChild variant="brand"><a href={`/api/calendars/${p.slug}/connect`}>{p.health ? "Reconnect" : "Connect"} {p.name}</a></Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
