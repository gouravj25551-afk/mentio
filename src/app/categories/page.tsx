import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { CategoryGrid } from "@/components/landing/categories";
import { PageIntro } from "@/components/shared/page-intro";
import { Empty } from "@/components/ui/empty";
import { listCategoriesWithCounts } from "@/features/mentors/queries";

export const metadata = { title: "Categories" };
// Reads the database on each request so `next build` never needs a database connection.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <PageIntro eyebrow="Categories" title="What do you want to" accent="grow in?" description="Pick a path to see the mentors who can help you with it." />
        {categories.length === 0 ? (
          <Empty title="Categories are coming soon" description="We're setting things up. Check back shortly." className="mx-auto mt-10 max-w-[1100px]" />
        ) : (
          <CategoryGrid categories={categories} heading={false} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
