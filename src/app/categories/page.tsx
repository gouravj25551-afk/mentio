import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { Categories } from "@/components/landing/categories";
import { Empty } from "@/components/ui/empty";
import { db } from "@/lib/db";

export const metadata = { title: "Categories" };
// Reads the database on each request so `next build` never needs a database connection.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({ orderBy: { order: "asc" } });
  return (
    <>
      <SiteHeader />
      <main className="container pb-20 pt-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Categories</div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Browse by what you want to grow in.</h1>
        </div>
        {categories.length === 0 ? (
          <Empty title="Categories are coming soon" description="We're setting things up. Check back shortly." className="mt-10" />
        ) : (
          <Categories categories={categories} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
