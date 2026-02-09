import "reflect-metadata";
import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import { AppDataSource } from "./datasource";
import userRouter from "./routes/user";
import authRouter from "./routes/auth";
import noteRouter from "./routes/note";
import uploadRouter from "./routes/upload";
import quizRouter from "./routes/quiz";
import { jsonCharsetMiddleware } from "./middleware/jsonCharset";
import cors from "cors";

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));
const port = process.env.BACKEND_PORT || 8888;

// データベース接続
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
  })
  .catch((error: Error) => console.log("Database connection error:", error));

app.use(cors());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true, // Cookie方式に切り替える際に必要
}))

app.use(express.json());
// app.use(jsonCharsetMiddleware); // 文字化け検証用に一時無効化
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/notes', noteRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/quiz', quizRouter);

// アップロードファイルの静的配信
app.use('/uploads', express.static(path.join(process.cwd(), "uploads")));

// Viteビルド成果物の静的ファイル配信
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/", (req, res) => {
  res.json({ message: "health check" });
});

// DB疎通確認用エンドポイント
app.get("/db", async (req: Request, res: Response) => {
  try {
    await AppDataSource.query("SELECT 1");
    res.json({ message: "Database connection successful" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Database connection failed", details: error });
  }
});

app.get("/view-test", (req, res) => {
  res.render("index");
});

// SPA フォールバック: /api 以外の未マッチルートは index.html を返す
app.use((req, res, next) => {
  // API ルートや既存のルートでない場合、index.html を返す
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  } else {
    next();
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
