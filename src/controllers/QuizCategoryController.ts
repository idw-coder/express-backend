import { Request, Response } from "express";
import { AppDataSource } from "../datasource";
import { QuizCategory } from "../entities/QuizCategory";

export class QuizCategoryController {
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
}