import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { QuizController } from '../controllers/QuizController'
import { QuizCategoryController } from '../controllers/QuizCategoryController'
import { QuizHistoryController } from '../controllers/QuizHistoryController'
import { QuizCsvController } from '../controllers/QuizCsvController'

const router = Router()
const controller = new QuizController()
const categoryController = new QuizCategoryController()
const historyController = new QuizHistoryController()
const csvController = new QuizCsvController()

/**
 * @openapi
 * /quiz/categories:
 *   get:
 *     tags: [Quiz - カテゴリ]
 *     summary: カテゴリ一覧取得
 *     description: クイズカテゴリの一覧を取得します。認証不要です。
 *     responses:
 *       200:
 *         description: カテゴリ一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizCategory'
 */
router.get('/categories', (req, res) => categoryController.getCategories(req, res))

/**
 * @openapi
 * /quiz/categories:
 *   post:
 *     tags: [Quiz - カテゴリ]
 *     summary: カテゴリ作成
 *     description: 新規クイズカテゴリを作成します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, category_name]
 *             properties:
 *               slug:
 *                 type: string
 *                 description: スラッグ（URL用識別子）
 *               category_name:
 *                 type: string
 *                 description: カテゴリ名
 *               description:
 *                 type: string
 *                 description: 説明
 *               thumbnail_path:
 *                 type: string
 *                 description: サムネイル画像パス
 *               display_order:
 *                 type: integer
 *                 description: 表示順
 *     responses:
 *       201:
 *         description: カテゴリ作成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizCategory'
 */
router.post('/categories', authMiddleware, (req, res) => categoryController.createCategory(req, res))

/**
 * @openapi
 * /quiz/categories/{id}:
 *   put:
 *     tags: [Quiz - カテゴリ]
 *     summary: カテゴリ更新
 *     description: 指定IDのクイズカテゴリを更新します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: カテゴリID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug:
 *                 type: string
 *               category_name:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail_path:
 *                 type: string
 *               display_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: カテゴリ更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizCategory'
 *       404:
 *         description: カテゴリが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/categories/:id', authMiddleware, (req, res) => categoryController.updateCategory(req, res))

/**
 * @openapi
 * /quiz/categories/{id}:
 *   delete:
 *     tags: [Quiz - カテゴリ]
 *     summary: カテゴリ削除
 *     description: 指定IDのクイズカテゴリを削除します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: カテゴリID
 *     responses:
 *       200:
 *         description: カテゴリ削除成功
 *       404:
 *         description: カテゴリが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/categories/:id', authMiddleware, (req, res) => categoryController.deleteCategory(req, res))

/**
 * @openapi
 * /quiz/tags:
 *   get:
 *     tags: [Quiz - タグ]
 *     summary: タグ一覧取得
 *     description: クイズタグの一覧を取得します。認証不要です。
 *     responses:
 *       200:
 *         description: タグ一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizTag'
 */
router.get('/tags', (req, res) => controller.getTags(req, res))

/**
 * @openapi
 * /quiz/tags:
 *   post:
 *     tags: [Quiz - タグ]
 *     summary: タグ作成
 *     description: 新規クイズタグを作成します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, name]
 *             properties:
 *               slug:
 *                 type: string
 *                 description: スラッグ
 *               name:
 *                 type: string
 *                 description: タグ名
 *     responses:
 *       201:
 *         description: タグ作成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizTag'
 */
router.post('/tags', authMiddleware, (req, res) => controller.createTag(req, res))

/**
 * @openapi
 * /quiz/tags/{tagId}:
 *   put:
 *     tags: [Quiz - タグ]
 *     summary: タグ更新
 *     description: 指定IDのクイズタグを更新します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *         description: タグID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: タグ更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizTag'
 *       404:
 *         description: タグが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/tags/:tagId', authMiddleware, (req, res) => controller.updateTag(req, res))

/**
 * @openapi
 * /quiz/tags/{tagId}:
 *   delete:
 *     tags: [Quiz - タグ]
 *     summary: タグ削除
 *     description: 指定IDのクイズタグを削除します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *         description: タグID
 *     responses:
 *       200:
 *         description: タグ削除成功
 *       404:
 *         description: タグが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/tags/:tagId', authMiddleware, (req, res) => controller.deleteTag(req, res))

/**
 * @openapi
 * /quiz/category/{categoryId}/quizzes:
 *   get:
 *     tags: [Quiz]
 *     summary: カテゴリ別クイズ一覧取得
 *     description: 指定カテゴリのクイズ一覧を取得します。タグやキーワードで絞り込みが可能です。認証不要です。
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: カテゴリID
 *       - in: query
 *         name: tagSlug
 *         schema:
 *           type: string
 *         description: タグスラッグで絞り込み
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: キーワード検索
 *     responses:
 *       200:
 *         description: クイズ一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   slug:
 *                     type: string
 *                   question:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/QuizTag'
 */
router.get('/category/:categoryId/quizzes', (req, res) =>
  controller.getQuizzesByCategory(req, res)
)

/**
 * @openapi
 * /quiz/category/{categoryId}/tags:
 *   get:
 *     tags: [Quiz - タグ]
 *     summary: カテゴリ別タグ一覧取得
 *     description: 指定カテゴリに紐づくタグ一覧を取得します。認証不要です。
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: カテゴリID
 *     responses:
 *       200:
 *         description: タグ一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizTag'
 */
router.get('/category/:categoryId/tags', (req, res) =>
  controller.getTagsByCategory(req, res)
)

/**
 * @openapi
 * /quiz/csv/sample:
 *   get:
 *     tags: [Quiz - CSV]
 *     summary: CSVサンプルダウンロード
 *     description: クイズインポート用のCSVサンプルファイルをダウンロードします。認証不要です。
 *     responses:
 *       200:
 *         description: CSVファイル
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/csv/sample', (req, res) => csvController.sampleCsv(req, res))

/**
 * @openapi
 * /quiz/csv/export:
 *   get:
 *     tags: [Quiz - CSV]
 *     summary: CSVエクスポート
 *     description: クイズデータをCSV形式でエクスポートします。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: カテゴリIDで絞り込み（任意）
 *     responses:
 *       200:
 *         description: CSVファイル
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/csv/export', authMiddleware, (req, res) => csvController.exportCsv(req, res))

/**
 * @openapi
 * /quiz/csv/import:
 *   post:
 *     tags: [Quiz - CSV]
 *     summary: CSVインポート
 *     description: CSV文字列からクイズデータを一括インポートします。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [csv]
 *             properties:
 *               csv:
 *                 type: string
 *                 description: CSVデータ文字列
 *     responses:
 *       200:
 *         description: インポート結果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 created_count:
 *                   type: integer
 *                 updated_count:
 *                   type: integer
 *                 error_count:
 *                   type: integer
 *                 created_tags_count:
 *                   type: integer
 *                 created:
 *                   type: array
 *                   items:
 *                     type: object
 *                 updated:
 *                   type: array
 *                   items:
 *                     type: object
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 created_tags:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/csv/import', authMiddleware, (req, res) => csvController.importCsv(req, res))

/**
 * @openapi
 * /quiz/history:
 *   get:
 *     tags: [Quiz - 回答履歴]
 *     summary: 回答履歴取得
 *     description: ログインユーザーの回答履歴を取得します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 回答履歴一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuizHistory'
 */
router.get('/history', authMiddleware, (req, res) => historyController.getHistory(req, res))

/**
 * @openapi
 * /quiz/history:
 *   post:
 *     tags: [Quiz - 回答履歴]
 *     summary: 回答1件追加
 *     description: クイズの回答履歴を1件追加します。同一回答が存在する場合は重複メッセージを返します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quizId, categoryId, isCorrect, answeredAt]
 *             properties:
 *               quizId:
 *                 type: integer
 *                 description: クイズID
 *               categoryId:
 *                 type: integer
 *                 description: カテゴリID
 *               isCorrect:
 *                 type: boolean
 *                 description: 正解かどうか
 *               answeredAt:
 *                 type: string
 *                 format: date-time
 *                 description: 回答日時
 *     responses:
 *       201:
 *         description: 回答追加成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *       200:
 *         description: 重複データ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: already exists
 */
router.post('/history', authMiddleware, (req, res) => historyController.addAnswer(req, res))

/**
 * @openapi
 * /quiz/history/sync:
 *   post:
 *     tags: [Quiz - 回答履歴]
 *     summary: 回答履歴一括同期
 *     description: 複数の回答履歴を一括で同期します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/QuizHistory'
 *     responses:
 *       200:
 *         description: 同期結果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 synced:
 *                   type: integer
 *                   description: 同期された回答数
 */
router.post('/history/sync', authMiddleware, (req, res) => historyController.syncHistory(req, res))

/**
 * @openapi
 * /quiz/{quizId}:
 *   get:
 *     tags: [Quiz]
 *     summary: クイズ詳細取得
 *     description: 指定IDのクイズ詳細（選択肢・タグ含む）を取得します。認証不要です。
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *         description: クイズID
 *     responses:
 *       200:
 *         description: クイズ詳細
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: クイズが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:quizId', (req, res) => controller.getQuizDetail(req, res))

/**
 * @openapi
 * /quiz:
 *   post:
 *     tags: [Quiz]
 *     summary: クイズ作成
 *     description: 新規クイズを作成します。Bearer認証が必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_id, slug, question, choices]
 *             properties:
 *               category_id:
 *                 type: integer
 *                 description: カテゴリID
 *               slug:
 *                 type: string
 *                 description: スラッグ
 *               question:
 *                 type: string
 *                 description: 問題文
 *               explanation:
 *                 type: string
 *                 description: 解説
 *               choices:
 *                 type: array
 *                 description: 選択肢
 *                 items:
 *                   type: object
 *                   required: [choice_text, is_correct]
 *                   properties:
 *                     choice_text:
 *                       type: string
 *                     is_correct:
 *                       type: boolean
 *                     display_order:
 *                       type: integer
 *               tags:
 *                 type: array
 *                 description: タグスラッグの配列
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: クイズ作成成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 */
router.post('/', authMiddleware, (req, res) => controller.createQuiz(req, res))

/**
 * @openapi
 * /quiz/{quizId}:
 *   put:
 *     tags: [Quiz]
 *     summary: クイズ更新
 *     description: 指定IDのクイズを更新します。Bearer認証およびeditor以上のロールが必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *         description: クイズID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: integer
 *               slug:
 *                 type: string
 *               question:
 *                 type: string
 *               explanation:
 *                 type: string
 *               choices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     choice_text:
 *                       type: string
 *                     is_correct:
 *                       type: boolean
 *                     display_order:
 *                       type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: クイズ更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       404:
 *         description: クイズが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:quizId', authMiddleware, requireRole('editor'), (req, res) => controller.updateQuiz(req, res))

/**
 * @openapi
 * /quiz/{quizId}:
 *   delete:
 *     tags: [Quiz]
 *     summary: クイズ削除
 *     description: 指定IDのクイズを削除します。Bearer認証およびeditor以上のロールが必要です。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: integer
 *         description: クイズID
 *     responses:
 *       200:
 *         description: クイズ削除成功
 *       404:
 *         description: クイズが見つかりません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:quizId', authMiddleware, requireRole('editor'), (req, res) => controller.deleteQuiz(req, res))

export default router
