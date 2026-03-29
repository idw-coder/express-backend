import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppDataSource } from '../datasource'
import { User } from '../entities/User'
import { UserMeta } from '../entities/UserMeta'
import { authMiddleware } from '../middleware/auth'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
// import { sendVerificationEmail } from '../utils/verification'


const router = Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: ログイン
 *     description: メールアドレスとパスワードでログインし、JWTトークンを取得します。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: メールアドレス
 *               password:
 *                 type: string
 *                 description: パスワード
 *     responses:
 *       200:
 *         description: ログイン成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWTトークン
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string }
 *       400:
 *         description: リクエストパラメータ不正
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: メールアドレスとパスワードは必須です
 *       401:
 *         description: 認証失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: メールアドレスまたはパスワードが正しくありません
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'メールアドレスとパスワードは必須です' })
      return
    }

    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { email } })

    if (!user) {
      res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' })
      return
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' })
      return
    }

    // if (!user.emailVerified) {
    //   res.status(403).json({ error: 'メールアドレスが確認されていません。登録時に送信された確認メールをご確認ください。' })
    //   return
    // }

    const metaRepo = AppDataSource.getRepository(UserMeta)
    const roleMeta = await metaRepo.findOne({
      where: { userId: user.id, metaKey: 'role' }
    })
    const role = roleMeta?.metaValue || 'user'

    /**
     * JWT発行
     * sign()の第一引数にはペイロードを指定する
     * 第二引数にはシークレットキーを指定する
     * 第三引数にはオプションを指定する
     * expiresIn: トークンの有効期限を指定する
     * algorithm: 暗号化アルゴリズムを指定する
     * 
     */
    const token = jwt.sign(
      { userId: user.id, email: user.email, role },
      process.env.JWT_SECRET || 'your-super-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'サーバーエラーが発生しました' })
  }
})

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: ログインユーザー情報取得
 *     description: 認証済みユーザーの情報を取得します。Bearerトークンが必要です。
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 role:
 *                   type: string
 *                   description: ユーザーロール
 *       404:
 *         description: ユーザーが見つからない
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: ユーザーが見つかりません
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { id: req.user!.userId } })

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' })
      return
    }

    const metaRepo = AppDataSource.getRepository(UserMeta)
    const roleMeta = await metaRepo.findOne({
      where: { userId: user.id, metaKey: 'role' }
    })

    const { password: _, ...userWithoutPassword } = user
    res.json({
      user: userWithoutPassword,
      role: roleMeta?.metaValue || 'user'
    })
  } catch (error) {
    console.error('Me error:', error)
    res.status(500).json({ error: 'サーバーエラーが発生しました' })
  }
})

/**
 * @openapi
 * /auth/me:
 *   patch:
 *     tags: [Auth]
 *     summary: ログインユーザー情報更新
 *     description: 認証済みユーザーの情報を更新します。Bearerトークンが必要です。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 名前
 *               email:
 *                 type: string
 *                 format: email
 *                 description: メールアドレス
 *               currentPassword:
 *                 type: string
 *                 description: 現在のパスワード（パスワード変更時のみ必須）
 *               newPassword:
 *                 type: string
 *                 description: 新しいパスワード（6文字以上）
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: バリデーションエラー
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: 現在のパスワードが正しくない
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: メールアドレス重複
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: このメールアドレスはすでに使用されています
 */
router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body

    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { id: req.user!.userId } })

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' })
      return
    }

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: '名前を入力してください' })
        return
      }
      user.name = name.trim()
    }

    if (email !== undefined) {
      if (!email.trim()) {
        res.status(400).json({ error: 'メールアドレスを入力してください' })
        return
      }
      const existing = await userRepo.findOne({ where: { email: email.trim() } })
      if (existing && existing.id !== user.id) {
        res.status(409).json({ error: 'このメールアドレスはすでに使用されています' })
        return
      }
      user.email = email.trim()
    }

    if (newPassword !== undefined) {
      if (!currentPassword) {
        res.status(400).json({ error: '現在のパスワードを入力してください' })
        return
      }
      const isValid = await bcrypt.compare(currentPassword, user.password)
      if (!isValid) {
        res.status(401).json({ error: '現在のパスワードが正しくありません' })
        return
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: '新しいパスワードは6文字以上で入力してください' })
        return
      }
      user.password = await bcrypt.hash(newPassword, 10)
    }

    await userRepo.save(user)

    const { password: _, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Update me error:', error)
    res.status(500).json({ error: 'サーバーエラーが発生しました' })
  }
})

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const userRepo = AppDataSource.getRepository(User)
      const userMetaRepo = AppDataSource.getRepository(UserMeta)

      const email = profile.emails?.[0]?.value
      if (!email) return done(new Error('Googleアカウントにメールアドレスがありません'))

      // 既存ユーザーをgoogleIdで検索
      let user = await userRepo.findOne({ where: { googleId: profile.id } })

      if (!user) {
        // メールアドレスで既存ユーザーを検索（通常登録済みの場合は連携）
        user = await userRepo.findOne({ where: { email } })
      }

      if (!user) {
        // 新規ユーザー作成
        user = userRepo.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          password: null as any,
          emailVerified: true,
        })
        await userRepo.save(user)

        const userMeta = userMetaRepo.create({
          userId: user.id,
          metaKey: 'role',
          metaValue: 'user',
        })
        await userMetaRepo.save(userMeta)
      } else if (!user.googleId) {
        // 既存ユーザーにgoogleIdを紐付け
        user.googleId = profile.id
        user.emailVerified = true
        await userRepo.save(user)
      }

      return done(null, user)
    } catch (err) {
      return done(err as Error)
    }
  }
))

// router.get('/verify-email', async (req: Request, res: Response) => {
//   try {
//     const { token } = req.query
//
//     if (!token || typeof token !== 'string') {
//       res.status(400).json({ error: 'トークンが必要です' })
//       return
//     }
//
//     const userMetaRepo = AppDataSource.getRepository(UserMeta)
//     const userRepo = AppDataSource.getRepository(User)
//
//     const tokenMeta = await userMetaRepo.findOne({
//       where: { metaKey: 'emailVerificationToken', metaValue: token }
//     })
//
//     if (!tokenMeta) {
//       res.status(400).json({ error: '無効なトークンです' })
//       return
//     }
//
//     const expiresMeta = await userMetaRepo.findOne({
//       where: { userId: tokenMeta.userId, metaKey: 'emailVerificationExpires' }
//     })
//
//     if (!expiresMeta || new Date(expiresMeta.metaValue!) < new Date()) {
//       res.status(400).json({ error: 'トークンの有効期限が切れています' })
//       return
//     }
//
//     const user = await userRepo.findOne({ where: { id: tokenMeta.userId } })
//     if (!user) {
//       res.status(404).json({ error: 'ユーザーが見つかりません' })
//       return
//     }
//
//     user.emailVerified = true
//     await userRepo.save(user)
//
//     await userMetaRepo.remove([tokenMeta, expiresMeta!])
//
//     res.json({ message: 'メールアドレスの確認が完了しました' })
//   } catch (error) {
//     console.error('Verify email error:', error)
//     res.status(500).json({ error: 'サーバーエラーが発生しました' })
//   }
// })

// router.post('/send-verification', authMiddleware, async (req: Request, res: Response) => {
//   try {
//     const userRepo = AppDataSource.getRepository(User)
//     const user = await userRepo.findOne({ where: { id: req.user!.userId } })
//
//     if (!user) {
//       res.status(404).json({ error: 'ユーザーが見つかりません' })
//       return
//     }
//
//     if (user.emailVerified) {
//       res.status(400).json({ error: 'すでにメール確認済みです' })
//       return
//     }
//
//     await sendVerificationEmail(user.id, user.email)
//
//     res.json({ message: '確認メールを再送しました' })
//   } catch (error) {
//     console.error('Send verification error:', error)
//     res.status(500).json({ error: 'サーバーエラーが発生しました' })
//   }
// })

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth ログイン開始
 *     description: Google OAuth認証を開始し、Googleの認証画面にリダイレクトします。
 *     responses:
 *       302:
 *         description: Google認証画面へリダイレクト
 */
router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'], session: false }))

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth コールバック
 *     description: Google認証完了後のコールバック。JWTトークンをクエリパラメータでフロントエンドにリダイレクトします。
 *     responses:
 *       302:
 *         description: フロントエンドの認証コールバックURLへリダイレクト（tokenクエリ付き）
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as unknown as User
      const metaRepo = AppDataSource.getRepository(UserMeta)
      const roleMeta = await metaRepo.findOne({ where: { userId: user.id, metaKey: 'role' } })
      const role = roleMeta?.metaValue || 'user'

      const token = jwt.sign(
        { userId: user.id, email: user.email, role },
        process.env.JWT_SECRET || 'your-super-secret-key',
        { expiresIn: '7d' }
      )

      // JWTをクエリパラメータでフロントに渡す
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`)
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=google`)
    }
  }
)

// テストメール送信
router.post('/test-mail', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { to } = req.body
    if (!to) {
      res.status(400).json({ error: '送信先メールアドレスが必要です' })
      return
    }

    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mailserver',
      port: parseInt(process.env.SMTP_PORT || '25'),
      secure: false,
      tls: { rejectUnauthorized: false },
    })

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@ntorelabo.com',
      to,
      subject: 'テスト送信',
      text: 'Postfixからのテストメールです。',
    })

    res.json({ message: 'メール送信成功', messageId: info.messageId })
  } catch (error: any) {
    console.error('Test mail error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router