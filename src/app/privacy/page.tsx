import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container max-w-3xl py-16">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Legal</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: October 6, 2026</p>
        <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
          <p>Mentio helps people discover and book mentorship conversations. This policy explains the information we collect and how we use it.</p>
          <h2>Information we collect</h2>
          <p>We collect account details, profile information, booking details, availability, reviews, and messages needed to operate the service. We also receive basic technical information needed to secure and improve the site.</p>
          <h2>How we use information</h2>
          <p>We use this information to authenticate accounts, publish approved mentor profiles, schedule sessions, send service emails, prevent abuse, and provide support.</p>
          <h2>Sharing</h2>
          <p>Public mentor profile information is visible to visitors. We share only the information needed with service providers such as hosting, database, email, and meeting providers. We do not sell personal information.</p>
          <h2>Your choices</h2>
          <p>You may update your profile or request account deletion by contacting the Mentio team. Some records may be retained where required for security, legal, or accounting purposes.</p>
          <h2>Contact</h2>
          <p>For privacy questions, contact the Mentio administrator through the support address listed on the site.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
