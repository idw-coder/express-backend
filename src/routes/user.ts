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

router.patch('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const userMetaRepository = AppDataSource.getRepository(UserMeta);
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, role } = req.body;

    if (name) user.name = name.trim();
    if (email) {
      const existing = await userRepository.findOne({ where: { email: email.trim() } });
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      user.email = email.trim();
    }
    await userRepository.save(user);

    if (role) {
      let roleMeta = await userMetaRepository.findOne({
        where: { userId: user.id, metaKey: 'role' },
      });
      if (roleMeta) {
        roleMeta.metaValue = role;
      } else {
        roleMeta = userMetaRepository.create({
          userId: user.id,
          metaKey: 'role',
          metaValue: role,
        });
      }
      await userMetaRepository.save(roleMeta);
    }

    const currentRole = await userMetaRepository.findOne({
      where: { userId: user.id, metaKey: 'role' },
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, role: currentRole?.metaValue || 'user' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (req.user!.userId === user.id) {
      return res.status(400).json({ error: '自分自身は削除できません' });
    }
    await userRepository.remove(user);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
