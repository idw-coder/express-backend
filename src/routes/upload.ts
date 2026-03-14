import { Router, Request, Response } from 'express'
import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 認証必須
router.use(authMiddleware)

// 許可するカテゴリ（将来の拡張に対応）
const ALLOWED_CATEGORIES = ['notes', 'avatars'] as const
type Category = (typeof ALLOWED_CATEGORIES)[number]

// 許可するMIMEタイプ
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

// ファイルサイズ上限: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * multer ストレージ設定
 * 保存先: uploads/{category}/{YYYY-MM}/{ユニークファイル名}
 */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const category = req.params.category as Category
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const uploadDir = path.join(process.cwd(), 'uploads', category, yearMonth)

    // ディレクトリがなければ再帰的に作成
    fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    // 衝突回避: タイムスタンプ + ランダム文字列 + 元の拡張子
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  },
})

/**
 * ファイルフィルター: 許可されたMIMEタイプのみ受け付ける
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`許可されていないファイル形式です: ${file.mimetype}`))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

/**
 * @openapi
 * /upload/{category}:
 *   post:
 *     tags: [Upload]
 *     summary: ファイルアップロード
 *     description: カテゴリ別に画像ファイルをアップロードします。Bearer認証が必要です。許可形式はJPEG/PNG/GIF/WebP、最大5MBです。
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [notes, avatars]
 *         description: アップロード先カテゴリ（notes=ノート用、avatars=アバター用）
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: アップロードする画像ファイル（image/jpeg, image/png, image/gif, image/webp、最大5MB）
 *     responses:
 *       201:
 *         description: アップロード成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: "アップロード先の相対URL（例: /uploads/notes/2026-03/xxx.png）"
 *       400:
 *         description: バリデーションエラー（無効なカテゴリ、不正なファイル形式、サイズ超過、ファイル未指定）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidCategory:
 *                 summary: 無効なカテゴリ
 *                 value:
 *                   error: "無効なカテゴリです。許可: notes, avatars"
 *               invalidFileType:
 *                 summary: 不正なファイル形式
 *                 value:
 *                   error: 許可されていないファイル形式です
 *               fileTooLarge:
 *                 summary: ファイルサイズ超過
 *                 value:
 *                   error: ファイルサイズが上限（5MB）を超えています
 *               noFile:
 *                 summary: ファイル未指定
 *                 value:
 *                   error: ファイルが指定されていません
 */
router.post('/:category', (req: Request, res: Response) => {
  const category = req.params.category

  // カテゴリのバリデーション
  if (!ALLOWED_CATEGORIES.includes(category as Category)) {
    res.status(400).json({
      error: `無効なカテゴリです。許可: ${ALLOWED_CATEGORIES.join(', ')}`,
    })
    return
  }

  // multer でファイルを処理
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'ファイルサイズが上限（5MB）を超えています' })
        return
      }
      res.status(400).json({ error: err.message })
      return
    }
    if (err) {
      res.status(400).json({ error: err.message })
      return
    }
    if (!req.file) {
      res.status(400).json({ error: 'ファイルが指定されていません' })
      return
    }

    /**
     * アップロード先の相対パスからURLを構築
     * 
     * path.relative()
     * 第一引数には基準となるパスを指定する
     * 第二引数には相対パスを指定する
     * 
     * cwd()
     * 現在のワーキングディレクトリを取得する
     * 
     */
    const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/')
    const url = `/${relativePath}`

    res.status(201).json({ url })
  })
})

export default router
