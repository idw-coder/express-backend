// TODO: stripe@17.7.0（古いバージョン）で実装しているため、将来的に最新の安定版へアップグレードすること
import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { AppDataSource } from '../datasource'
import { Payment } from '../entities/Payment'
import { User } from '../entities/User'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * @openapi
 * /webhook/stripe:
 *   post:
 *     tags: [Webhook]
 *     summary: Stripe Webhook エンドポイント
 *     description: Stripe からのイベント通知を受け取り、決済ステータスを更新します。
 *     responses:
 *       200:
 *         description: Webhook 処理成功
 *       400:
 *         description: 署名検証失敗
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    res.status(400).json({ error: 'Webhook署名の検証に失敗しました' })
    return
  }

  const paymentRepo = AppDataSource.getRepository(Payment)

  switch (event.type) {
    // チェックアウト完了 → Payment を completed に更新
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      const payment = await paymentRepo.findOne({
        where: { stripeSessionId: session.id },
      })

      if (payment) {
        payment.status = 'completed'
        payment.amount = session.amount_total ?? 0
        payment.currency = session.currency ?? 'jpy'
        payment.stripePaymentIntentId = (session.payment_intent as string) ?? undefined
        await paymentRepo.save(payment)
      }

      console.log(`Payment completed: session=${session.id}`)
      break
    }

    // チェックアウト期限切れ → Payment を expired に更新
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session

      const payment = await paymentRepo.findOne({
        where: { stripeSessionId: session.id },
      })

      if (payment) {
        payment.status = 'expired'
        await paymentRepo.save(payment)
      }

      console.log(`Payment expired: session=${session.id}`)
      break
    }

    // 決済失敗 → Payment を failed に更新
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      const payment = await paymentRepo.findOne({
        where: { stripePaymentIntentId: paymentIntent.id },
      })

      if (payment) {
        payment.status = 'failed'
        await paymentRepo.save(payment)
      }

      console.log(`Payment failed: intent=${paymentIntent.id}`)
      break
    }

    // サブスクリプションキャンセル → ログ記録のみ
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`Subscription cancelled: ${subscription.id}`)
      break
    }

    // ※ Invoice = Stripe がサブスクの課金サイクルごとに自動生成する請求オブジェクト
    // サブスク定期課金の成功 → 2回目以降の更新分を Payment として新規作成
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice

      // 初回請求（checkout.session.completed で処理済み）はスキップ
      if (invoice.billing_reason === 'subscription_create') {
        console.log(`Initial invoice skipped: ${invoice.id}`)
        break
      }

      // 2回目以降の定期課金を Payment に記録
      if (invoice.subscription && invoice.customer) {
        const userRepo = AppDataSource.getRepository(User)
        const user = await userRepo.findOne({
          where: { stripeCustomerId: invoice.customer as string },
        })

        if (user) {
          const payment = paymentRepo.create({
            userId: user.id,
            stripeSessionId: `inv_${invoice.id}`,
            stripePaymentIntentId: (invoice.payment_intent as string) ?? undefined,
            status: 'completed',
            amount: invoice.amount_paid ?? 0,
            currency: invoice.currency ?? 'jpy',
            description: 'subscription_renewal', // 決済の補足説明
          })
          await paymentRepo.save(payment)
        }
      }

      console.log(`Invoice paid: ${invoice.id}`)
      break
    }

    // サブスク定期課金の失敗 → ログ記録のみ（将来的な処理追加想定）
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.log(`Invoice payment failed: ${invoice.id}`)
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

export default router
