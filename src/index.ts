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
import paymentRouter from "./routes/payment";
import stripeWebhookRouter from "./routes/stripe-webhook";
import cors from "cors";
import passport from 'passport'
import fs from 'fs'

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

app.use(passport.initialize())

// Stripe Webhook は raw body が必要なため、express.json() より前に登録
app.use('/api/webhook', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json());

const openapiSpec = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'openapi.json'), 'utf-8')
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiSpec);
});

app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html><head>
  <title>Express MySQL Docker API</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>body { margin: 0; padding: 0; }</style>
</head><body>
  <redoc spec-url="/api-docs.json"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body></html>`);
});

app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/notes', noteRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/payment', paymentRouter);

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
