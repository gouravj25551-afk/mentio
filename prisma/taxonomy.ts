/* eslint-disable no-console */
// Baseline categories and skills. Idempotent and safe to run in production:
// it only upserts taxonomy rows and never creates users, bookings or reviews.
import { PrismaClient } from "@prisma/client";

const CATEGORIES = [
  { slug: "software-engineering", name: "Software Engineering", icon: "Code2", color: "#6366F1", description: "Backend, frontend, systems and full-stack engineering." },
  { slug: "open-source", name: "Open Source", icon: "GitBranch", color: "#F97316", description: "Contribute to and maintain open-source projects." },
  { slug: "gsoc", name: "GSoC", icon: "Sun", color: "#EAB308", description: "Google Summer of Code mentors and alumni." },
  { slug: "lfx", name: "LFX", icon: "Boxes", color: "#06B6D4", description: "Linux Foundation mentorship and CNCF projects." },
  { slug: "ai-ml", name: "AI/ML", icon: "Brain", color: "#A855F7", description: "Applied ML, LLMs, and research." },
  { slug: "design", name: "Design", icon: "Palette", color: "#EC4899", description: "Product and brand design." },
  { slug: "product", name: "Product Management", icon: "Compass", color: "#10B981", description: "PM strategy, roadmaps, user research." },
  { slug: "startups", name: "Startup Building", icon: "Rocket", color: "#EF4444", description: "Zero-to-one founder guidance." },
  { slug: "interview-prep", name: "Interview Prep", icon: "ClipboardList", color: "#3B82F6", description: "Coding and system design interviews." },
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

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const db = new PrismaClient();
  try {
    for (const [order, c] of CATEGORIES.entries()) {
      await db.category.upsert({ where: { slug: c.slug }, update: { ...c, order }, create: { ...c, order } });
    }
    for (const name of SKILLS) {
      const slug = slugify(name);
      await db.skill.upsert({ where: { slug }, update: { name }, create: { slug, name } });
    }
    console.log(`Taxonomy ready: ${CATEGORIES.length} categories, ${SKILLS.length} skills.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Taxonomy upsert failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
