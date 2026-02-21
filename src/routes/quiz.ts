import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { QuizController } from '../controllers/QuizController'
import { QuizCategoryController } from '../controllers/QuizCategoryController'
import { QuizHistoryController } from '../controllers/QuizHistoryController'

const router = Router()
const controller = new QuizController()
const categoryController = new QuizCategoryController()
const historyController = new QuizHistoryController()

router.get('/categories', (req, res) => categoryController.getCategories(req, res))
router.get('/tags', (req, res) => controller.getTags(req, res))
router.post('/tags', authMiddleware, (req, res) => controller.createTag(req, res))
router.put('/tags/:tagId', authMiddleware, (req, res) => controller.updateTag(req, res))
router.delete('/tags/:tagId', authMiddleware, (req, res) => controller.deleteTag(req, res))
router.get('/category/:categoryId/quizzes', (req, res) =>
  controller.getQuizzesByCategory(req, res)
)
router.get('/category/:categoryId/tags', (req, res) =>
  controller.getTagsByCategory(req, res)
)
router.get('/history', authMiddleware, (req, res) => historyController.getHistory(req, res))
router.post('/history', authMiddleware, (req, res) => historyController.addAnswer(req, res))
router.post('/history/sync', authMiddleware, (req, res) => historyController.syncHistory(req, res))

router.get('/:quizId', (req, res) => controller.getQuizDetail(req, res))

router.post('/', authMiddleware, (req, res) => controller.createQuiz(req, res))
router.put('/:quizId', authMiddleware, requireRole('editor'), (req, res) => controller.updateQuiz(req, res))
router.delete('/:quizId', authMiddleware, requireRole('editor'), (req, res) => controller.deleteQuiz(req, res))

export default router
