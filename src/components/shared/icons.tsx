import {
  Boxes, Brain, BriefcaseBusiness, ClipboardList, Code2, Compass, GitBranch, Github, Globe, Instagram, Laptop, Linkedin,
  Palette, Rocket, Sparkles, Sun, Twitter, type LucideIcon,
} from "lucide-react";

import type { SocialKind } from "@/lib/socials";

// Category.icon stores a lucide name. Only these are bundled; anything else falls back.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Code2, GitBranch, Sun, Boxes, Brain, Palette, Compass, Rocket, ClipboardList, BriefcaseBusiness, Laptop,
};

export function CategoryIcon({ name, className, style }: { name?: string | null; className?: string; style?: React.CSSProperties }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Sparkles;
  return <Icon className={className} style={style} aria-hidden />;
}

export const SOCIAL_ICONS: Record<SocialKind, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  twitter: Twitter,
  instagram: Instagram,
  website: Globe,
};
