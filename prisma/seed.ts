/* eslint-disable no-console */
import { PrismaClient, Role, MentorStatus, Weekday, BookingStatus, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// DEVELOPMENT-ONLY demo data. It creates fake mentors, fake reviews and an admin
// account, so it must never run against a real database.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "i-understand-this-creates-fake-users") {
  console.error("Refusing to seed: NODE_ENV=production. This script creates fake users and an admin account.");
  process.exit(1);
}
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/(localhost|127\.0\.0\.1|\[::1\])/.test(dbUrl) && process.env.SEED_ALLOW_REMOTE !== "true") {
  console.error("Refusing to seed a non-local database. Set SEED_ALLOW_REMOTE=true if this is a disposable dev/staging DB.");
  process.exit(1);
}

const db = new PrismaClient();

// Random per run (or set SEED_PASSWORD): no fixed, publicly-known credentials.
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? `Seed-${randomBytes(9).toString("base64url")}1a`;

const CATEGORIES = [
  { slug: "software-engineering", name: "Software Engineering", icon: "Code2", color: "#6366F1", description: "Backend, frontend, systems and full-stack engineering." },
  { slug: "open-source", name: "Open Source", icon: "GitBranch", color: "#F97316", description: "Contribute to and maintain open-source projects." },
  { slug: "gsoc", name: "GSoC", icon: "Sun", color: "#EAB308", description: "Google Summer of Code mentors and alumni." },
  { slug: "lfx", name: "LFX", icon: "Boxes", color: "#06B6D4", description: "Linux Foundation mentorship and CNCF projects." },
  { slug: "ai-ml", name: "AI/ML", icon: "Brain", color: "#A855F7", description: "Applied ML, LLMs, and research." },
  { slug: "design", name: "Design", icon: "Palette", color: "#EC4899", description: "Product and brand design." },
  { slug: "product", name: "Product Management", icon: "Compass", color: "#10B981", description: "PM strategy, roadmaps, user research." },
  { slug: "startups", name: "Startup Building", icon: "Rocket", color: "#EF4444", description: "0→1 founders, YC-style guidance." },
  { slug: "interview-prep", name: "Interview Prep", icon: "ClipboardList", color: "#3B82F6", description: "FAANG and system design interviews." },
  { slug: "career", name: "Career Guidance", icon: "BriefcaseBusiness", color: "#8B5CF6", description: "Switch, grow, and plan your career." },
  { slug: "freelancing", name: "Freelancing", icon: "Laptop", color: "#14B8A6", description: "Build an independent consulting practice." },
];

const SKILLS = [
  "TypeScript", "React", "Next.js", "Node.js", "Go", "Rust", "Python", "Kubernetes",
  "Postgres", "System Design", "GraphQL", "AWS", "GCP", "Docker", "LangChain",
  "LLMs", "RAG", "Fine-tuning", "Figma", "Design Systems", "User Research",
  "Product Strategy", "Roadmapping", "Analytics", "Pitching", "Fundraising",
  "GSoC Proposal", "CNCF", "Linux Kernel", "Open Source", "Technical Writing",
  "Interview Coaching", "DSA", "Leetcode", "Behavioral Interviews",
];

const MENTORS = [
  { name: "Aarav Mehta", email: "aarav@mentio.test", headline: "Senior SWE @ Stripe · Ex-Google", cats: ["software-engineering", "interview-prep"], skills: ["TypeScript", "System Design", "DSA"], rate: 0, rating: 4.9, featured: true },
  { name: "Priya Rao", email: "priya@mentio.test", headline: "GSoC Org Admin · Open Source Maintainer", cats: ["gsoc", "open-source"], skills: ["Open Source", "GSoC Proposal", "Python"], rate: 0, rating: 4.8, featured: true },
  { name: "Diego Martinez", email: "diego@mentio.test", headline: "LFX Mentor · CNCF Contributor", cats: ["lfx", "open-source"], skills: ["Kubernetes", "Go", "CNCF"], rate: 0, rating: 4.9, featured: true },
  { name: "Hannah Chen", email: "hannah@mentio.test", headline: "Microsoft SWE Intern Alum · Full-time @ Microsoft", cats: ["interview-prep", "career"], skills: ["Interview Coaching", "DSA", "System Design"], rate: 0, rating: 4.7, featured: true },
  { name: "Omar Yusuf", email: "omar@mentio.test", headline: "AI Engineer @ Anthropic", cats: ["ai-ml"], skills: ["LLMs", "LangChain", "RAG"], rate: 0, rating: 4.95, featured: true },
  { name: "Lena Fischer", email: "lena@mentio.test", headline: "Design Lead @ Linear", cats: ["design"], skills: ["Design Systems", "Figma"], rate: 0, rating: 4.9, featured: true },
  { name: "Rahul Shah", email: "rahul@mentio.test", headline: "YC Founder · Ex-Uber PM", cats: ["startups", "product"], skills: ["Product Strategy", "Fundraising", "Pitching"], rate: 0, rating: 4.85, featured: false },
  { name: "Sofia Garcia", email: "sofia@mentio.test", headline: "Staff PM @ Notion", cats: ["product"], skills: ["Product Strategy", "Roadmapping", "User Research"], rate: 0, rating: 4.8, featured: false },
  { name: "Kenji Watanabe", email: "kenji@mentio.test", headline: "Google Intern · CS @ Tokyo", cats: ["interview-prep", "career"], skills: ["DSA", "Leetcode", "Behavioral Interviews"], rate: 0, rating: 4.6, featured: false },
  { name: "Zara Khan", email: "zara@mentio.test", headline: "ML Research · PhD Stanford", cats: ["ai-ml"], skills: ["LLMs", "Fine-tuning", "Python"], rate: 0, rating: 4.9, featured: false },
  { name: "Marcus Johnson", email: "marcus@mentio.test", headline: "Freelance Full-stack · $200K/yr independent", cats: ["freelancing", "software-engineering"], skills: ["Next.js", "Node.js", "Postgres"], rate: 0, rating: 4.75, featured: false },
  { name: "Elena Rossi", email: "elena@mentio.test", headline: "Design Engineer @ Vercel", cats: ["design", "software-engineering"], skills: ["React", "Design Systems", "TypeScript"], rate: 0, rating: 4.88, featured: false },
  { name: "David Park", email: "david@mentio.test", headline: "Linux Kernel Contributor · LFX Mentor", cats: ["lfx", "open-source"], skills: ["Linux Kernel", "Rust", "Open Source"], rate: 0, rating: 4.9, featured: false },
  { name: "Amina Diop", email: "amina@mentio.test", headline: "Career Coach · 500+ switchers mentored", cats: ["career"], skills: ["Interview Coaching", "Behavioral Interviews"], rate: 0, rating: 4.95, featured: false },
  { name: "Noah Williams", email: "noah@mentio.test", headline: "Founding Engineer · Series A Startup", cats: ["startups", "software-engineering"], skills: ["TypeScript", "Postgres", "AWS"], rate: 0, rating: 4.8, featured: false },
  { name: "Chloe Dubois", email: "chloe@mentio.test", headline: "UX Researcher @ Figma", cats: ["design", "product"], skills: ["User Research", "Figma"], rate: 0, rating: 4.7, featured: false },
  { name: "Ravi Patel", email: "ravi@mentio.test", headline: "DevOps Lead · CKAD, CKA", cats: ["software-engineering"], skills: ["Kubernetes", "Docker", "AWS", "GCP"], rate: 0, rating: 4.78, featured: false },
  { name: "Isabella Ferreira", email: "isabella@mentio.test", headline: "Content Creator · 100K YouTube Devs", cats: ["freelancing", "career"], skills: ["Technical Writing"], rate: 0, rating: 4.65, featured: false },
  { name: "Lucas Silva", email: "lucas@mentio.test", headline: "GraphQL Core Contributor", cats: ["open-source", "software-engineering"], skills: ["GraphQL", "TypeScript", "Node.js"], rate: 0, rating: 4.82, featured: false },
  { name: "Nadia Volkova", email: "nadia@mentio.test", headline: "Growth PM · B2B SaaS", cats: ["product", "startups"], skills: ["Product Strategy", "Analytics"], rate: 0, rating: 4.75, featured: false },
];

async function main() {
  console.log("🌱 Seeding Mentio…");

  // --- Admin ---
  const adminPassword = await bcrypt.hash(SEED_PASSWORD, 10);
  const admin = await db.user.upsert({
    where: { email: "admin@mentio.test" },
    update: { passwordHash: adminPassword },
    create: {
      email: "admin@mentio.test",
      name: "Mentio Admin",
      role: Role.ADMIN,
      passwordHash: adminPassword,
      emailVerified: new Date(),
      image: `https://api.dicebear.com/7.x/initials/svg?seed=Mentio%20Admin`,
      profile: { create: { timezone: "UTC" } },
    },
  });

  // --- Demo student ---
  const demoPassword = adminPassword;
  await db.user.upsert({
    where: { email: "student@mentio.test" },
    update: { passwordHash: adminPassword },
    create: {
      email: "student@mentio.test",
      name: "Alex Student",
      role: Role.STUDENT,
      passwordHash: demoPassword,
      emailVerified: new Date(),
      image: `https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Student`,
      profile: { create: { timezone: "America/Los_Angeles" } },
    },
  });

  // --- Categories ---
  const categoryMap: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, color: c.color, description: c.description, order: i },
      create: { ...c, order: i },
    });
    categoryMap[c.slug] = row.id;
  }

  // --- Skills ---
  const skillMap: Record<string, string> = {};
  for (const s of SKILLS) {
    const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const row = await db.skill.upsert({
      where: { slug },
      update: { name: s },
      create: { slug, name: s },
    });
    skillMap[s] = row.id;
  }

  // --- Mentors ---
  const mentorRecords: { profileId: string; userId: string }[] = [];
  for (const m of MENTORS) {
    const slug = m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const password = adminPassword;
    const user = await db.user.upsert({
      where: { email: m.email },
      update: { passwordHash: adminPassword },
      create: {
        email: m.email,
        name: m.name,
        role: Role.MENTOR,
        passwordHash: password,
        emailVerified: new Date(),
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name)}`,
        profile: {
          create: {
            headline: m.headline,
            bio: `${m.name} — ${m.headline}. Passionate about mentoring the next generation of builders.`,
            timezone: "UTC",
            languages: ["English"],
          },
        },
      },
    });

    const mentorProfile = await db.mentorProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: m.headline,
        averageRating: m.rating,
        rateCents: m.rate,
        featured: m.featured,
      },
      create: {
        userId: user.id,
        slug,
        headline: m.headline,
        bio: `I'm ${m.name}. ${m.headline}. I love mentoring students who want to break into top companies, ship real open-source, and grow fast. Expect a focused, honest conversation.`,
        experience: `5+ years at top companies. Previously mentored 50+ students into roles at FAANG and funded startups.`,
        achievements: [
          "Mentored 50+ students into FAANG roles",
          "Spoke at 3 international conferences",
          "Open source contributions to major projects",
        ],
        portfolio: [`https://github.com/${slug}`, `https://${slug}.dev`],
        rateCents: m.rate,
        currency: "USD",
        sessionLength: 30,
        responseTimeHrs: 12,
        averageRating: m.rating,
        totalReviews: 10 + Math.floor(Math.random() * 40),
        totalSessions: 20 + Math.floor(Math.random() * 100),
        featured: m.featured,
        status: MentorStatus.APPROVED,
        approvedAt: new Date(),
        acceptingBookings: true,
      },
    });

    // categories
    for (const cat of m.cats) {
      await db.mentorCategory.upsert({
        where: { mentorProfileId_categoryId: { mentorProfileId: mentorProfile.id, categoryId: categoryMap[cat] } },
        update: {},
        create: { mentorProfileId: mentorProfile.id, categoryId: categoryMap[cat] },
      });
    }
    // skills
    for (const sk of m.skills) {
      await db.mentorSkill.upsert({
        where: { mentorProfileId_skillId: { mentorProfileId: mentorProfile.id, skillId: skillMap[sk] } },
        update: {},
        create: { mentorProfileId: mentorProfile.id, skillId: skillMap[sk] },
      });
    }

    // availability — M–F, 9am to 5pm
    const weekdays: Weekday[] = [Weekday.MON, Weekday.TUE, Weekday.WED, Weekday.THU, Weekday.FRI];
    await db.availability.deleteMany({ where: { mentorProfileId: mentorProfile.id } });
    for (const w of weekdays) {
      await db.availability.create({
        data: {
          mentorProfileId: mentorProfile.id,
          weekday: w,
          startMinutes: 9 * 60,
          endMinutes: 17 * 60,
        },
      });
    }

    mentorRecords.push({ profileId: mentorProfile.id, userId: user.id });
  }

  // --- Students ---
  const studentIds: string[] = [];
  for (let i = 1; i <= 50; i++) {
    const name = `Student ${String(i).padStart(2, "0")}`;
    const email = `student${i}@mentio.test`;
    const user = await db.user.upsert({
      where: { email },
      update: { passwordHash: adminPassword },
      create: {
        email,
        name,
        role: Role.STUDENT,
        passwordHash: demoPassword,
        emailVerified: new Date(),
        image: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`,
        profile: { create: { timezone: "UTC" } },
      },
    });
    studentIds.push(user.id);
  }

  // --- Bookings + reviews ---
  const now = Date.now();
  const COMMENTS = [
    "Game-changer. Walked me through my offer negotiation like a pro.",
    "Honest, direct feedback. Fixed my resume in 30 minutes.",
    "Got my GSoC proposal to a shortlist-ready state.",
    "Exactly the push I needed to apply to the right programs.",
    "Loved the system design walkthrough — super clear.",
    "Changed how I think about product entirely.",
    "Realistic plan, no fluff. Already implementing day one.",
  ];
  for (const m of mentorRecords) {
    if ((await db.booking.count({ where: { mentorProfileId: m.profileId } })) > 0) continue; // already seeded
    for (let b = 0; b < 3; b++) {
      const studentId = studentIds[Math.floor(Math.random() * studentIds.length)];
      const past = b < 2;
      const offsetDays = past ? -1 - b * 2 : 2 + b * 3;
      const start = new Date(now + offsetDays * 86400000);
      start.setHours(14, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      const status = past ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED;
      const booking = await db.booking.create({
        data: {
          studentId,
          mentorProfileId: m.profileId,
          startsAt: start,
          endsAt: end,
          status,
          topic: ["Resume review", "Career strategy", "Interview prep", "GSoC proposal", "Portfolio feedback"][b % 5],
          notes: "Looking forward to our chat!",
          meetingUrl: `https://meet.jit.si/mentio-seed-${randomBytes(6).toString("hex")}`,
          paymentStatus: "NOT_REQUIRED",
        },
      });
      if (status === BookingStatus.COMPLETED && Math.random() > 0.3) {
        await db.review.create({
          data: {
            bookingId: booking.id,
            mentorProfileId: m.profileId,
            authorId: studentId,
            rating: 4 + Math.round(Math.random()),
            comment: COMMENTS[Math.floor(Math.random() * COMMENTS.length)],
          },
        });
      }
    }
  }

  // --- Notifications for admin and demo student ---
  await db.notification.createMany({
    data: [
      { userId: admin.id, type: NotificationType.SYSTEM, title: "Welcome to Mentio", body: "You're the admin — manage mentors and users from your dashboard.", link: "/dashboard/admin" },
    ],
  });

  console.log("✅ Seeded:");
  console.log(`   ${CATEGORIES.length} categories, ${SKILLS.length} skills`);
  console.log(`   ${MENTORS.length} mentors, 50 students`);
  console.log("   Dev-only logins (password is random for this run):");
  console.log(`     Admin   → admin@mentio.test / ${SEED_PASSWORD}`);
  console.log(`     Student → student@mentio.test / ${SEED_PASSWORD}`);
  console.log(`     Mentor  → aarav@mentio.test / ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
