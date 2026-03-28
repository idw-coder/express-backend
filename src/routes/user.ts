import { Router } from 'express';
import { AppDataSource } from '../datasource';
import { User } from '../entities/User';
import { UserMeta } from '../entities/UserMeta';
import bcrypt from 'bcrypt';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
// import { sendVerificationEmail } from '../utils/verification';

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: 全ユーザー一覧取得
 *     description: 全ユーザーの一覧を取得します。Bearer認証および管理者（admin）ロールが必要です。
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
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       name: { type: string }
 *                       email: { type: string }
 *                       role: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 */
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const userMetaRepository = AppDataSource.getRepository(UserMeta);

    const users = await userRepository.find();

    const usersWithRole = await Promise.all(
      users.map(async (user) => {
        const roleMeta = await userMetaRepository.findOne({
          where: { userId: user.id, metaKey: 'role' },
        });
        const { password: _, ...userWithoutPassword } = user;
        return { ...userWithoutPassword, role: roleMeta?.metaValue || 'user' };
      }),
    );

    res.json({ users: usersWithRole });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: ユーザー登録
 *     description: 新規ユーザーを登録します。認証不要（会員登録用）。ロールはデフォルトで"user"になります。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 description: ユーザー名
 *               email:
 *                 type: string
 *                 format: email
 *                 description: メールアドレス
 *               password:
 *                 type: string
 *                 description: パスワード
 *     responses:
 *       201:
 *         description: 登録成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *                 role:
 *                   type: string
 *                   example: "user"
 *                   emailVerified: false
 *       400:
 *         description: 必須パラメータ不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Name, email, and password are required"
 *       409:
 *         description: ユーザーが既に存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "User already exists"
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const userRepository = AppDataSource.getRepository(User);
    const userMetaRepository = AppDataSource.getRepository(UserMeta);

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
    });
    await userRepository.save(user);

    // try {
    //   await sendVerificationEmail(user.id, user.email);
    // } catch (mailError) {
    //   console.error('Verification email failed:', mailError);
    // }

    const userMeta = userMetaRepository.create({
      userId: user.id,
      metaKey: 'role',
      metaValue: 'user',
    });
    await userMetaRepository.save(userMeta);

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      user: userWithoutPassword,
      role: 'user',
      emailVerified: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
