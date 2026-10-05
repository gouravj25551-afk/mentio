import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock, Globe, Linkedin, Star, Twitter } from "lucide-react";

import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, initials } from "@/lib/utils";
import { getMentorBySlug, getRatingDistribution } from "@/features/mentors/queries";
import { getAvailableSlots } from "@/features/bookings/slots";
import { BookingPanel } from "@/components/booking/booking-panel";
import { SaveMentorButton } from "@/components/mentor/save-button";
import { auth } from "@/lib/auth";

export const revalidate = 30;

export default async function MentorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mentor = await getMentorBySlug(slug);
  if (!mentor) notFound();
  const [slots, dist, session] = await Promise.all([
    getAvailableSlots({ mentorProfileId: mentor.id, days: 14, sessionLength: mentor.sessionLength }),
    getRatingDistribution(mentor.id),
    auth(),
  ]);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);

  return (
    <>
      <SiteHeader />
      <main className="container pb-20 pt-10">
        <Link href="/mentors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All mentors
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={mentor.user.image ?? undefined} alt={mentor.user.name ?? ""} />
                <AvatarFallback className="text-xl">{initials(mentor.user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-semibold tracking-tight">{mentor.user.name}</h1>
                  <BadgeCheck className="h-5 w-5 text-indigo-500" />
                  {mentor.featured ? <Badge variant="brand">Featured</Badge> : null}
                </div>
                <p className="mt-1 text-lg text-muted-foreground">{mentor.headline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <strong className="text-foreground">{mentor.averageRating.toFixed(1)}</strong>
                    <span>({mentor.totalReviews} reviews)</span>
                  </span>
                  <span>·</span>
                  <span>{mentor.totalSessions} sessions</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Responds in {mentor.responseTimeHrs}h</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{mentor.user.profile?.timezone ?? "UTC"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {mentor.categories.map((c) => <Badge key={c.categoryId} variant="brand">{c.category.name}</Badge>)}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {session?.user ? <SaveMentorButton mentorProfileId={mentor.id} /> : null}
                  {mentor.user.profile?.twitter ? <Button asChild variant="outline" size="icon"><a href={`https://twitter.com/${mentor.user.profile.twitter}`} aria-label="Twitter"><Twitter className="h-4 w-4" /></a></Button> : null}
                  {mentor.user.profile?.linkedin ? <Button asChild variant="outline" size="icon"><a href={`https://linkedin.com/in/${mentor.user.profile.linkedin}`} aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a></Button> : null}
                </div>
              </div>
            </div>

            <Tabs defaultValue="about" className="mt-10">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({mentor.totalReviews})</TabsTrigger>
              </TabsList>
              <TabsContent value="about" className="space-y-6">
                <section>
                  <h2 className="font-display text-xl font-semibold">About</h2>
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">{mentor.bio}</p>
                </section>
                <section>
                  <h2 className="font-display text-xl font-semibold">Skills</h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mentor.skills.map((s) => <Badge key={s.skillId} variant="secondary">{s.skill.name}</Badge>)}
                  </div>
                </section>
                {mentor.achievements.length ? (
                  <section>
                    <h2 className="font-display text-xl font-semibold">Achievements</h2>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
                      {mentor.achievements.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </section>
                ) : null}
              </TabsContent>
              <TabsContent value="experience">
                <h2 className="font-display text-xl font-semibold">Experience</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">{mentor.experience}</p>
                {mentor.portfolio.length ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium">Portfolio</div>
                    <ul className="space-y-1 text-sm">
                      {mentor.portfolio.map((p) => <li key={p}><a href={p} target="_blank" rel="noreferrer noopener" className="text-indigo-500 underline-offset-4 hover:underline">{p}</a></li>)}
                    </ul>
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent value="reviews" className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <div className="font-display text-4xl font-semibold">{mentor.averageRating.toFixed(1)}</div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{mentor.totalReviews} reviews</div>
                    </div>
                    <div className="min-w-[200px] flex-1 space-y-1.5">
                      {[5,4,3,2,1].map((n) => (
                        <div key={n} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-3 text-right">{n}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full brand-gradient" style={{ width: `${total ? (dist[n] / total) * 100 : 0}%` }} />
                          </div>
                          <span className="w-6 text-right">{dist[n]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                <div className="space-y-4">
                  {mentor.reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  ) : (
                    mentor.reviews.map((r) => (
                      <Card key={r.id} className="p-5">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={r.author.image ?? undefined} alt="" />
                            <AvatarFallback>{initials(r.author.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">{r.author.name ?? "Student"}</div>
                              <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "stroke-current opacity-30"}`} />
                              ))}
                            </div>
                            {r.comment ? <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p> : null}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <BookingPanel mentor={{ id: mentor.id, name: mentor.user.name ?? "Mentor", sessionLength: mentor.sessionLength, rateCents: mentor.rateCents, currency: mentor.currency }} slots={slots} authenticated={Boolean(session?.user)} />
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
