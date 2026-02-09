import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Request型を拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number
        email: string
        role: string
      }
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '認証トークンがありません' })
      return
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      res.status(401).json({ error: '認証トークンがありません' })
      return
    }
    /**
     * verify()
     * 第一引数にはトークンを指定する
     * 第二引数にはシークレットキーを指定する
     * 
     * 検証に成功したら、トークンに埋め込まれたペイロード（{ userId, email, role }）をオブジェクトとして返します。
     */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-super-secret-key'
    ) as unknown as { userId: number; email: string; role: string }

    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'トークンが無効です' })
  }
}