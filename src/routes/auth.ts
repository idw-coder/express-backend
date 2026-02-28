import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppDataSource } from '../datasource'
import { User } from '../entities/User'
import { UserMeta } from '../entities/UserMeta'
import { authMiddleware } from '../middleware/auth'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'


const router = Router()

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

// ログインユーザーの情報を取得する
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

// ログインユーザーの情報を更新する
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
        await userRepo.save(user)
      }

      return done(null, user)
    } catch (err) {
      return done(err as Error)
    }
  }
))

// Googleログイン開始
router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'], session: false }))

// Googleコールバック
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


export default router