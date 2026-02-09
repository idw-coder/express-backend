import { Router } from 'express'
import { QuizController } from '../controllers/QuizController'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'

const router = Router()
const controller = new QuizController()

router.get('/categories', (req, res) => controller.getCategories(req, res))
router.get('/category/:categoryId/quizzes', (req, res) =>
  controller.getQuizzesByCategory(req, res)
)
router.get('/:quizId', (req, res) => controller.getQuizDetail(req, res))

router.post('/', authMiddleware, (req, res) => controller.createQuiz(req, res))
router.put('/:quizId', authMiddleware, requireRole('editor'), (req, res) => controller.updateQuiz(req, res))
router.delete('/:quizId', authMiddleware, requireRole('editor'), (req, res) => controller.deleteQuiz(req, res))

export default router
