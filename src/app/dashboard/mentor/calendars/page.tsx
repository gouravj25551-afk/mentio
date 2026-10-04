import { requireRole } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calendarService } from "@/services/calendar";

export default async function CalendarsPage() {
  const user = await requireRole(["MENTOR", "ADMIN"]);
  const mentor = await db.mentorProfile.findUnique({ where: { userId: user.id }, include: { calendars: true } });
  if (!mentor) return <p className="text-sm text-muted-foreground">Finish onboarding first.</p>;

  const providers = [
    {
      key: "CAL_COM" as const,
      name: "Cal.com",
      description: "Sync your Cal.com event types. Students see your real availability.",
      authUrl: calendarService.providers.cal_com.authUrl(),
      configured: calendarService.providers.cal_com.configured(),
    },
    {
      key: "CALENDLY" as const,
      name: "Calendly",
      description: "Pull your scheduling link into Mentio. Keep one calendar, two surfaces.",
      authUrl: calendarService.providers.calendly.authUrl(),
      configured: calendarService.providers.calendly.configured(),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Calendar integrations</h1>
        <p className="text-sm text-muted-foreground">
          If a provider is connected, Mentio uses its availability and meeting links. Otherwise, the built-in scheduler takes over.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((p) => {
          const existing = mentor.calendars.find((c) => c.provider === p.key);
          return (
            <Card key={p.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {p.name}
                  {existing?.active ? <Badge variant="success">Connected</Badge> : <Badge variant="secondary">Not connected</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.description}</p>
                {!p.configured ? (
                  <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    Platform credentials for {p.name} aren't configured. Set them in <code>.env</code> to enable OAuth.
                  </p>
                ) : null}
                {existing ? (
                  <form action={`/api/calendars/${p.key.toLowerCase().replace("_", "-")}/disconnect`} method="post">
                    <Button variant="outline" type="submit">Disconnect</Button>
                  </form>
                ) : (
                  <Button asChild variant="brand" disabled={!p.authUrl}>
                    <a href={p.authUrl ?? "#"}>Connect {p.name}</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
