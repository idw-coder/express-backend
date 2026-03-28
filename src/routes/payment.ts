import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { AppDataSource } from '../datasource'
import { User } from '../entities/User'
import { Payment } from '../entities/Payment'
import { authMiddleware } from '../middleware/auth'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Stripe が管理する「顧客オブジェクト」。
 * 顧客に紐付けて決済履歴・支払い方法・サブスクリプションなどを一元管理できる。
 */
async function getOrCreateStripeCustomer(user: User): Promise<string> {
  // すでに Stripe Customer が作成済みであればその ID をそのまま返す（重複作成を防ぐ）
  if (user.stripeCustomerId) {
    return user.stripeCustomerId
  }

  /**
   * Stripe API に新しい Customer オブジェクトを作成するメソッド。
   * 作成に成功すると Customer オブジェクトが返され、customer.id に
   * "cus_xxxxxxxxxx" 形式の一意な顧客 ID が格納される。
   */
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user.id) },
  })

  const userRepo = AppDataSource.getRepository(User)
  user.stripeCustomerId = customer.id
  await userRepo.save(user)

  return customer.id
}

/**
 * @openapi
 * /payment/checkout:
 *   post:
 *     tags: [Payment]
 *     summary: Stripe Checkout Session を作成
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [priceId]
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe Price ID
 *               quantity:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Checkout Session URL を返却
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *       400:
 *         description: パラメータ不正
 */
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { priceId, quantity = 1 } = req.body

    if (!priceId) {
      res.status(400).json({ error: 'priceId は必須です' })
      return
    }

    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { id: req.user!.userId } })

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' })
      return
    }

    const customerId = await getOrCreateStripeCustomer(user)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId: String(user.id),
      },
    })

    const paymentRepo = AppDataSource.getRepository(Payment)
    const payment = paymentRepo.create({
      userId: user.id,
      stripeSessionId: session.id,
      status: 'pending',
      amount: 0,
      currency: 'jpy',
    })
    await paymentRepo.save(payment)

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    res.status(500).json({ error: '決済セッションの作成に失敗しました' })
  }
})

/**
 * @openapi
 * /payment/subscription:
 *   post:
 *     tags: [Payment]
 *     summary: サブスクリプション用 Checkout Session を作成
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [priceId]
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe Price ID（recurring）
 *     responses:
 *       200:
 *         description: Checkout Session URL を返却
 */
router.post('/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { priceId } = req.body

    if (!priceId) {
      res.status(400).json({ error: 'priceId は必須です' })
      return
    }

    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { id: req.user!.userId } })

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' })
      return
    }

    const customerId = await getOrCreateStripeCustomer(user)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId: String(user.id),
      },
    })

    const paymentRepo = AppDataSource.getRepository(Payment)
    const payment = paymentRepo.create({
      userId: user.id,
      stripeSessionId: session.id,
      status: 'pending',
      amount: 0,
      currency: 'jpy',
      description: 'subscription',
    })
    await paymentRepo.save(payment)

    res.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Subscription error:', error)
    res.status(500).json({ error: 'サブスクリプションセッションの作成に失敗しました' })
  }
})

/**
 * @openapi
 * /payment/portal:
 *   post:
 *     tags: [Payment]
 *     summary: Stripe Customer Portal セッションを作成
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer Portal URL を返却
 */
router.post('/portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User)
    const user = await userRepo.findOne({ where: { id: req.user!.userId } })

    if (!user) {
      res.status(404).json({ error: 'ユーザーが見つかりません' })
      return
    }

    if (!user.stripeCustomerId) {
      res.status(400).json({ error: 'Stripe顧客情報が見つかりません' })
      return
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/payment`,
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    res.status(500).json({ error: 'ポータルセッションの作成に失敗しました' })
  }
})

/**
 * @openapi
 * /payment/history:
 *   get:
 *     tags: [Payment]
 *     summary: 決済履歴を取得
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 決済履歴一覧
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const paymentRepo = AppDataSource.getRepository(Payment)
    const [payments, total] = await paymentRepo.findAndCount({
      where: { userId: req.user!.userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    })

    res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Payment history error:', error)
    res.status(500).json({ error: '決済履歴の取得に失敗しました' })
  }
})

/**
 * @openapi
 * /payment/status/{sessionId}:
 *   get:
 *     tags: [Payment]
 *     summary: 決済ステータスを確認
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 決済ステータス
 */
router.get('/status/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string }
    const paymentRepo = AppDataSource.getRepository(Payment)
    const payment = await paymentRepo.findOne({
      where: {
        stripeSessionId: sessionId,
        userId: req.user!.userId,
      },
    })

    if (!payment) {
      res.status(404).json({ error: '決済情報が見つかりません' })
      return
    }

    res.json({ payment })
  } catch (error) {
    console.error('Payment status error:', error)
    res.status(500).json({ error: '決済ステータスの取得に失敗しました' })
  }
})

export default router
