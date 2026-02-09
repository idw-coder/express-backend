import { Request, Response, NextFunction } from 'express'

/**
 * JSON レスポンス時に Content-Type に charset=utf-8 を付与するミドルウェア。
 * 日本語などのマルチバイト文字の文字化けを防ぐ。
 */
export function jsonCharsetMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json.bind(res)
  res.json = function (body?: unknown): Response {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return originalJson(body)
  }
  next()
}
