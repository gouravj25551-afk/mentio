// Turns a profile's stored social handles into safe, display-ready links.
// Handles are validated on save (see validators.ts); this also tolerates a
// pasted full URL or a leading "@" so older rows still render correctly.

export type SocialKind = "linkedin" | "github" | "twitter" | "instagram" | "website";

export type SocialLink = { kind: SocialKind; label: string; handle: string; href: string };

type SocialProfile = {
  linkedin?: string | null;
  github?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  website?: string | null;
} | null | undefined;

const BASE: Record<Exclude<SocialKind, "website">, { label: string; url: (h: string) => string; host: RegExp }> = {
  linkedin: { label: "LinkedIn", url: (h) => `https://www.linkedin.com/in/${h}`, host: /linkedin\.com\/in\//i },
  github: { label: "GitHub", url: (h) => `https://github.com/${h}`, host: /github\.com\//i },
  twitter: { label: "X", url: (h) => `https://x.com/${h}`, host: /(twitter|x)\.com\//i },
  instagram: { label: "Instagram", url: (h) => `https://www.instagram.com/${h}`, host: /instagram\.com\//i },
};

function cleanHandle(raw: string, host: RegExp) {
  let h = raw.trim();
  const m = h.match(new RegExp(`${host.source}([^/?#]+)`, "i"));
  if (m) h = m[m.length - 1];
  h = h.replace(/^@/, "").replace(/\/+$/, "");
  return /^[A-Za-z0-9._-]{1,80}$/.test(h) ? h : null;
}

export function socialLinks(profile: SocialProfile): SocialLink[] {
  if (!profile) return [];
  const out: SocialLink[] = [];
  for (const kind of ["linkedin", "github", "twitter", "instagram"] as const) {
    const raw = profile[kind];
    if (!raw) continue;
    const handle = cleanHandle(raw, BASE[kind].host);
    if (handle) out.push({ kind, label: BASE[kind].label, handle: kind === "linkedin" ? handle : `@${handle}`, href: BASE[kind].url(handle) });
  }
  if (profile.website) {
    try {
      const u = new URL(profile.website);
      if (u.protocol === "https:") out.push({ kind: "website", label: "Website", handle: u.host.replace(/^www\./, ""), href: u.toString() });
    } catch {
      // ignore malformed URLs
    }
  }
  return out;
}
