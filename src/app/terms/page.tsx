import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="container max-w-3xl py-16">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Legal</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: October 6, 2026</p>
        <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
          <p>By using Mentio, you agree to use the service lawfully, respectfully, and only for genuine mentorship conversations.</p>
          <h2>Accounts</h2>
          <p>Keep your credentials secure and provide accurate information. You are responsible for activity on your account. Mentors must represent their experience honestly.</p>
          <h2>Mentor profiles and bookings</h2>
          <p>Mentor profiles are reviewed before publication. Students and mentors must attend confirmed sessions or communicate promptly about changes. Mentio may suspend accounts that create safety, fraud, or abuse risks.</p>
          <h2>Free beta</h2>
          <p>Mentio is currently a free beta. Paid sessions are not available until a payment provider, refunds, and related terms are formally introduced.</p>
          <h2>Content and conduct</h2>
          <p>Do not upload unlawful, abusive, deceptive, or infringing content. You retain ownership of content you submit and grant Mentio permission to display it as needed to operate the service.</p>
          <h2>Service availability</h2>
          <p>Mentio is provided as a beta service and may change or become unavailable while we improve it. We do not guarantee outcomes from a mentorship session.</p>
          <h2>Contact</h2>
          <p>Questions about these terms can be sent to the Mentio administrator through the support address listed on the site.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
