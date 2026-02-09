import { Request, Response } from 'express'
import { AppDataSource } from '../datasource'
import { QuizCategory } from '../entities/QuizCategory'
import { Quiz } from '../entities/Quiz'
import { QuizChoice } from '../entities/QuizChoice'

export class QuizController {
  /** カテゴリ一覧取得（deleted_at IS NULL、display_order 昇順） */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const repo = AppDataSource.getRepository(QuizCategory)
      const categories = await repo.find({
        order: { displayOrder: 'ASC' },
      })
      const list = categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        category_name: c.categoryName,
        description: c.description ?? undefined,
        thumbnail_path: c.thumbnailPath ?? undefined,
        display_order: c.displayOrder ?? undefined,
      }))
      res.json(list)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /** 指定カテゴリの問題一覧（deleted_at IS NULL、id 昇順。選択肢は含めない） */
  async getQuizzesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = Number(req.params.categoryId)
      if (!Number.isFinite(categoryId)) {
        res.status(400).json({ error: 'Invalid category id' })
        return
      }

      const categoryRepo = AppDataSource.getRepository(QuizCategory)
      const category = await categoryRepo.findOne({ where: { id: categoryId } })
      if (!category) {
        res.status(404).json({ error: 'Category not found' })
        return
      }

      const quizRepo = AppDataSource.getRepository(Quiz)
      const quizzes = await quizRepo.find({
        where: { categoryId },
        order: { id: 'ASC' },
      })
      const list = quizzes.map((q) => ({
        id: q.id,
        slug: q.slug,
        question: q.question,
      }))
      res.json(list)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /** 指定問題の詳細と選択肢（deleted_at IS NULL、選択肢は display_order 昇順） */
  async getQuizDetail(req: Request, res: Response): Promise<void> {
    try {
      const quizId = Number(req.params.quizId)
      if (!Number.isFinite(quizId)) {
        res.status(400).json({ error: 'Invalid quiz id' })
        return
      }

      const quizRepo = AppDataSource.getRepository(Quiz)
      const quiz = await quizRepo.findOne({
        where: { id: quizId },
        relations: ['choices'],
      })
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' })
        return
      }

      const choices = (quiz.choices ?? [])
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((c) => ({
          id: c.id,
          choice_text: c.choiceText,
          is_correct: c.isCorrect,
          display_order: c.displayOrder ?? undefined,
        }))

      res.json({
        id: quiz.id,
        slug: quiz.slug,
        category_id: quiz.categoryId,
        question: quiz.question,
        explanation: quiz.explanation ?? undefined,
        choices,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /** クイズ新規作成（認証必須。author_id は req.user.userId） */
  async createQuiz(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (userId == null) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const { category_id, slug, question, explanation, choices } = req.body as {
        category_id?: number
        slug?: string
        question?: string
        explanation?: string
        choices?: Array<{ choice_text: string; is_correct: boolean; display_order?: number }>
      }
      if (!category_id || !slug || !question) {
        res.status(400).json({ error: 'category_id, slug, question are required' })
        return
      }
      const choicesList = Array.isArray(choices) ? choices : []
      if (choicesList.length === 0) {
        res.status(400).json({ error: 'At least one choice is required' })
        return
      }

      const categoryRepo = AppDataSource.getRepository(QuizCategory)
      const category = await categoryRepo.findOne({ where: { id: Number(category_id) } })
      if (!category) {
        res.status(404).json({ error: 'Category not found' })
        return
      }

      const quizRepo = AppDataSource.getRepository(Quiz)
      const existing = await quizRepo.findOne({ where: { slug } })
      if (existing) {
        res.status(409).json({ error: 'Quiz with this slug already exists' })
        return
      }

      const quiz = quizRepo.create({
        slug,
        categoryId: Number(category_id),
        authorId: userId,
        question,
        ...(explanation != null && explanation !== '' ? { explanation } : {}),
      })
      await quizRepo.save(quiz)

      const choiceRepo = AppDataSource.getRepository(QuizChoice)
      for (let i = 0; i < choicesList.length; i++) {
        const c = choicesList[i]
        if (c == null) continue
        const choice = choiceRepo.create({
          quizId: quiz.id,
          choiceText: c.choice_text,
          isCorrect: Boolean(c.is_correct),
          displayOrder: c.display_order ?? i + 1,
        })
        await choiceRepo.save(choice)
      }

      const saved = await quizRepo.findOne({
        where: { id: quiz.id },
        relations: ['choices'],
      })
      if (!saved) {
        res.status(201).json({ id: quiz.id, slug: quiz.slug, message: 'Created' })
        return
      }
      const choiceList = (saved.choices ?? [])
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((c) => ({
          id: c.id,
          choice_text: c.choiceText,
          is_correct: c.isCorrect,
          display_order: c.displayOrder ?? undefined,
        }))
      res.status(201).json({
        id: saved.id,
        slug: saved.slug,
        category_id: saved.categoryId,
        question: saved.question,
        explanation: saved.explanation ?? undefined,
        choices: choiceList,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /** クイズ更新（認証必須。本人のみ） */
  async updateQuiz(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (userId == null) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const quizId = Number(req.params.quizId)
      if (!Number.isFinite(quizId)) {
        res.status(400).json({ error: 'Invalid quiz id' })
        return
      }

      const quizRepo = AppDataSource.getRepository(Quiz)
      const quiz = await quizRepo.findOne({
        where: { id: quizId },
        relations: ['choices'],
      })
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' })
        return
      }

      const { category_id, slug, question, explanation, choices } = req.body as {
        category_id?: number
        slug?: string
        question?: string
        explanation?: string
        choices?: Array<{ choice_text: string; is_correct: boolean; display_order?: number }>
      }

      if (category_id != null) {
        const categoryRepo = AppDataSource.getRepository(QuizCategory)
        const category = await categoryRepo.findOne({ where: { id: Number(category_id) } })
        if (!category) {
          res.status(404).json({ error: 'Category not found' })
          return
        }
        quiz.categoryId = Number(category_id)
      }
      if (slug !== undefined) quiz.slug = slug
      if (question !== undefined) quiz.question = question
      if (explanation !== undefined) quiz.explanation = explanation
      await quizRepo.save(quiz)

      if (Array.isArray(choices) && choices.length > 0) {
        const choiceRepo = AppDataSource.getRepository(QuizChoice)
        await choiceRepo.delete({ quizId: quiz.id })
        for (let i = 0; i < choices.length; i++) {
          const c = choices[i]
          if (c == null) continue
          const choice = choiceRepo.create({
            quizId: quiz.id,
            choiceText: c.choice_text,
            isCorrect: Boolean(c.is_correct),
            displayOrder: c.display_order ?? i + 1,
          })
          await choiceRepo.save(choice)
        }
      }

      const updated = await quizRepo.findOne({
        where: { id: quiz.id },
        relations: ['choices'],
      })
      if (!updated) {
        res.json({ id: quiz.id, message: 'Updated' })
        return
      }
      const choiceList = (updated.choices ?? [])
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
        .map((c) => ({
          id: c.id,
          choice_text: c.choiceText,
          is_correct: c.isCorrect,
          display_order: c.displayOrder ?? undefined,
        }))
      res.json({
        id: updated.id,
        slug: updated.slug,
        category_id: updated.categoryId,
        question: updated.question,
        explanation: updated.explanation ?? undefined,
        choices: choiceList,
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /** クイズ削除（ソフトデリート。認証必須。本人のみ） */
  async deleteQuiz(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (userId == null) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const quizId = Number(req.params.quizId)
      if (!Number.isFinite(quizId)) {
        res.status(400).json({ error: 'Invalid quiz id' })
        return
      }

      const quizRepo = AppDataSource.getRepository(Quiz)
      const quiz = await quizRepo.findOne({ where: { id: quizId } })
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' })
        return
      }

      await quizRepo.softRemove(quiz)
      res.json({ message: 'Quiz deleted' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
