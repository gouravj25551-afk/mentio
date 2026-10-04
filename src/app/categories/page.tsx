import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { Categories } from "@/components/landing/categories";
import { db } from "@/lib/db";

export const metadata = { title: "Categories" };

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
        <Categories categories={categories} />
      </main>
      <SiteFooter />
    </>
  );
}
