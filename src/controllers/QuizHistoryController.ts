import { Request, Response } from 'express'
import { AppDataSource } from '../datasource'
import { QuizAnswer } from '../entities/QuizAnswer'

interface AnswerPayload {
  quizId: number
  categoryId: number
  isCorrect: boolean
  answeredAt: string
}

export class QuizHistoryController {
  async syncHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (userId == null) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { answers } = req.body as { answers?: AnswerPayload[] }
      if (!Array.isArray(answers) || answers.length === 0) {
        res.json({ synced: 0 })
        return
      }

      const repo = AppDataSource.getRepository(QuizAnswer)
      let synced = 0

      for (const a of answers) {
        if (!a.quizId || !a.categoryId || a.isCorrect == null || !a.answeredAt) continue

        // MySQLのdatetime型は秒単位のためミリ秒を切り捨てて比較
        const answeredAt = new Date(a.answeredAt)
        answeredAt.setMilliseconds(0)

        const exists = await repo.findOne({
          where: { userId, quizId: a.quizId, answeredAt },
        })
        if (exists) continue

        try {
          const record = repo.create({
            userId,
            quizId: a.quizId,
            categoryId: a.categoryId,
            isCorrect: a.isCorrect,
            answeredAt,
          })
          await repo.save(record)
          synced++
        } catch (err: unknown) {
          // 一意制約違反（レース条件等）は無視して次へ
          if ((err as { code?: string }).code === 'ER_DUP_ENTRY') continue
          throw err
        }
      }

      res.json({ synced })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async addAnswer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (userId == null) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { quizId, categoryId, isCorrect, answeredAt } = req.body as AnswerPayload
      if (!quizId || !categoryId || isCorrect == null || !answeredAt) {
        res.status(400).json({ error: 'quizId, categoryId, isCorrect, answeredAt are required' })
        return
      }

      const repo = AppDataSource.getRepository(QuizAnswer)
      // MySQLのdatetime型は秒単位のためミリ秒を切り捨て
      const dt = new Date(answeredAt)
      dt.setMilliseconds(0)

      try {
        const record = repo.create({ userId, quizId, categoryId, isCorrect, answeredAt: dt })
        await repo.save(record)
        res.status(201).json({ id: record.id })
      } catch (err: unknown) {
        if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
          res.status(200).json({ message: 'already exists' })
          return
        }
        throw err
      }
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (userId == null) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const repo = AppDataSource.getRepository(QuizAnswer)
      const answers = await repo.find({
        where: { userId },
        order: { answeredAt: 'DESC' },
      })

      res.json(
        answers.map((a) => ({
          quizId: a.quizId,
          categoryId: a.categoryId,
          isCorrect: a.isCorrect,
          answeredAt: a.answeredAt,
        }))
      )
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
