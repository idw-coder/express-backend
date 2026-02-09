import { Router } from "express";
import { AppDataSource } from "../datasource";
import { User } from "../entities/User";
import { UserMeta } from "../entities/UserMeta";
import bcrypt from "bcrypt";

const router = Router();

/**
 * ロールはデフォルトで"user"になる
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }
    const userRepository = AppDataSource.getRepository(User);
    const userMetaRepository = AppDataSource.getRepository(UserMeta);

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
    });
    await userRepository.save(user);

    const userMeta = userMetaRepository.create({
      userId: user.id,
      metaKey: "role",
      metaValue: "user",
    });
    await userMetaRepository.save(userMeta);

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
        user: userWithoutPassword,
        role: "user",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;