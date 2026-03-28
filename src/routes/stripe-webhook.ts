import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { AppDataSource } from '../datasource'
import { Payment } from '../entities/Payment'
import { User } from '../entities/User'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover' as any,
})

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

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      console.log(`Subscription cancelled: ${subscription.id}`)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice

      // 初回請求（checkout.session.completed で処理済み）はスキップ
      if (invoice.billing_reason === 'subscription_create') {
        console.log(`Initial invoice skipped: ${invoice.id}`)
        break
      }

      // 2回目以降の定期課金を Payment に記録
      // Stripe API 2026-02-25.clover 以降、invoice.subscription は廃止された。
      // サブスクリプション ID は invoice.parent.subscription_details.subscription に移動している。
      const subscriptionId = invoice.parent?.subscription_details?.subscription
      if (subscriptionId && invoice.customer) {
        const userRepo = AppDataSource.getRepository(User)
        const user = await userRepo.findOne({
          where: { stripeCustomerId: invoice.customer as string },
        })

        if (user) {
          // Stripe API 2026-02-25.clover 以降、invoice.payment_intent は廃止された。
          // PaymentIntent ID は confirmation_secret.client_secret の "_secret_" より前の部分から取得できる。
          // 例: "pi_abc123_secret_xyz" → "pi_abc123"
          const clientSecret = invoice.confirmation_secret?.client_secret
          const paymentIntentId = clientSecret?.split('_secret_')[0]

          const payment = paymentRepo.create({
            userId: user.id,
            stripeSessionId: `inv_${invoice.id}`,
            ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
            status: 'completed',
            amount: invoice.amount_paid ?? 0,
            currency: invoice.currency ?? 'jpy',
            description: 'subscription_renewal',
          })
          await paymentRepo.save(payment)
        }
      }

      console.log(`Invoice paid: ${invoice.id}`)
      break
    }

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
