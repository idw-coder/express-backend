import crypto from 'crypto'
import { AppDataSource } from '../datasource'
import { UserMeta } from '../entities/UserMeta'
import { sendMail } from './mail'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export async function sendVerificationEmail(userId: number, email: string) {
  const userMetaRepository = AppDataSource.getRepository(UserMeta)

  // トークン生成
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後

  // 既存トークンがあれば更新、なければ作成
  await upsertMeta(userMetaRepository, userId, 'emailVerificationToken', token)
  await upsertMeta(userMetaRepository, userId, 'emailVerificationExpires', expires.toISOString())

  // 確認URL
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`

  // メール送信
  await sendMail({
    to: email,
    subject: 'メールアドレスの確認',
    html: `
      <h2>メールアドレスの確認</h2>
      <p>以下のリンクをクリックしてメールアドレスを確認してください。</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>このリンクは24時間有効です。</p>
    `,
  })
}

async function upsertMeta(
  repository: ReturnType<typeof AppDataSource.getRepository<UserMeta>>,
  userId: number,
  metaKey: string,
  metaValue: string
) {
  const existing = await repository.findOne({ where: { userId, metaKey } })
  if (existing) {
    existing.metaValue = metaValue
    await repository.save(existing)
  } else {
    const meta = repository.create({ userId, metaKey, metaValue })
    await repository.save(meta)
  }
}