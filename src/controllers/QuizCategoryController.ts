import { Request, Response } from "express";
import { AppDataSource } from "../datasource";
import { QuizCategory } from "../entities/QuizCategory";

export class QuizCategoryController {
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (userId == null) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { slug, category_name, description, thumbnail_path, display_order } =
        req.body as {
          slug?: string;
          category_name?: string;
          description?: string;
          thumbnail_path?: string;
          display_order?: number;
        };

      if (!slug || !category_name) {
        res.status(400).json({ error: "slug and category_name are required" });
        return;
      }

      const repo = AppDataSource.getRepository(QuizCategory);
      const existing = await repo.findOne({ where: { slug } });
      if (existing) {
        res.status(409).json({ error: "Category with this slug already exists" });
        return;
      }

      const category = repo.create({
        slug,
        categoryName: category_name,
        authorId: userId,
        ...(description != null ? { description } : {}),
        ...(thumbnail_path != null ? { thumbnailPath: thumbnail_path } : {}),
        ...(display_order != null ? { displayOrder: display_order } : {}),
      });
      await repo.save(category);

      res.status(201).json({
        id: category.id,
        slug: category.slug,
        category_name: category.categoryName,
        description: category.description ?? undefined,
        thumbnail_path: category.thumbnailPath ?? undefined,
        display_order: category.displayOrder ?? undefined,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(QuizCategory);
      const categories = await repo.find({ order: { displayOrder: "ASC" } });
      const list = categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        category_name: c.categoryName,
        description: c.description ?? undefined,
        thumbnail_path: c.thumbnailPath ?? undefined,
        display_order: c.displayOrder ?? undefined,
      }));
      res.json(list);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (userId == null) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const categoryId = Number(req.params.id);
      if (!Number.isFinite(categoryId)) {
        res.status(400).json({ error: "Invalid category id" });
        return;
      }

      const repo = AppDataSource.getRepository(QuizCategory);
      const category = await repo.findOne({ where: { id: categoryId } });
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      const { slug, category_name, description, thumbnail_path, display_order } =
        req.body as {
          slug?: string;
          category_name?: string;
          description?: string;
          thumbnail_path?: string;
          display_order?: number;
        };

      if (slug !== undefined) category.slug = slug;
      if (category_name !== undefined) category.categoryName = category_name;
      if (description !== undefined) category.description = description;
      if (thumbnail_path !== undefined) category.thumbnailPath = thumbnail_path;
      if (display_order !== undefined) category.displayOrder = display_order;

      await repo.save(category);

      res.json({
        id: category.id,
        slug: category.slug,
        category_name: category.categoryName,
        description: category.description ?? undefined,
        thumbnail_path: category.thumbnailPath ?? undefined,
        display_order: category.displayOrder ?? undefined,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (userId == null) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const categoryId = Number(req.params.id);
      if (!Number.isFinite(categoryId)) {
        res.status(400).json({ error: "Invalid category id" });
        return;
      }

      const repo = AppDataSource.getRepository(QuizCategory);
      const category = await repo.findOne({ where: { id: categoryId } });
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }

      await repo.softRemove(category);
      res.json({ message: "Category deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}