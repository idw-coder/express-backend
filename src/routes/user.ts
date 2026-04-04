import { Router } from 'express';
import { AppDataSource } from '../datasource';
import { User } from '../entities/User';
import { UserMeta } from '../entities/UserMeta';
import bcrypt from 'bcrypt';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
// import { sendVerificationEmail } from '../utils/verification';

const router = Router();

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
