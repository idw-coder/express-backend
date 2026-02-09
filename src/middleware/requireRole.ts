import { Request, Response, NextFunction } from 'express'

/** 役割の優先度（数値が大きいほど権限が高い） */
const ROLE_ORDER: Record<string, number> = {
  user: 0,
  editor: 1,
  admin: 2,
}

/**
 * ログイン済みかつ、req.user.role が指定した role 以上であることを要求する。
 * authMiddleware の後に使用すること。
 * @param minRole 必要な最小 role（'user' | 'editor' | 'admin'）
 */
export function requireRole(minRole: keyof typeof ROLE_ORDER) {
  const minLevel = ROLE_ORDER[minRole] ?? -1
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.userId == null) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const userLevel = ROLE_ORDER[req.user.role] ?? -1
    if (userLevel < minLevel) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
