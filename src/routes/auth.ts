import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AppDataSource } from '../datasource'
import { User } from '../entities/User'
import { UserMeta } from '../entities/UserMeta'
import { authMiddleware } from '../middleware/auth'

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

export default router