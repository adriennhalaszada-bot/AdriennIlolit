import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, subcategoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res) => {
  const categories = await db.query.categoriesTable.findMany({
    orderBy: (c, { asc }) => asc(c.order),
  });
  const subcategories = await db.query.subcategoriesTable.findMany();
  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    description: cat.description,
    subcategories: subcategories
      .filter((s) => s.categoryId === cat.id)
      .map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  }));
  res.json(result);
});

router.get("/categories/:slug", async (req, res) => {
  const cat = await db.query.categoriesTable.findFirst({
    where: eq(categoriesTable.slug, req.params.slug),
  });
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const subcategories = await db.query.subcategoriesTable.findMany({
    where: eq(subcategoriesTable.categoryId, cat.id),
  });
  res.json({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    description: cat.description,
    subcategories: subcategories.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
    })),
  });
});

export default router;
