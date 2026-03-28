# Stripe 決済機能 実装ドキュメント

## 概要

Stripe Checkout を利用した決済機能をバックエンドに追加。
単発決済・サブスクリプション・Customer Portal・Webhook による非同期ステータス更新に対応。

---

## 実装済みの内容

### 1. パッケージ追加

```bash
npm install stripe
```

- `stripe` v20.4.1（API Version: `2026-02-25.clover`）

### 2. 新規ファイル

| ファイル | 説明 |
|---|---|
| `src/entities/Payment.ts` | 決済履歴エンティティ |
| `src/routes/payment.ts` | 決済関連 API（認証必須） |
| `src/routes/webhook.ts` | Stripe Webhook ハンドラー |

### 3. 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/entities/User.ts` | `stripeCustomerId` カラムを追加 |
| `src/datasource.ts` | `Payment` エンティティを登録 |
| `src/index.ts` | `payment`, `webhook` ルートを登録 |
| `.env` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` を追加 |
| `package.json` | `stripe` 依存を追加 |

### 4. DB スキーマ変更

#### User テーブル（変更）

| カラム | 型 | 説明 |
|---|---|---|
| `stripeCustomerId` | `VARCHAR(255) NULL UNIQUE` | Stripe 顧客 ID |

#### Payment テーブル（新規）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | `BIGINT UNSIGNED PK AUTO_INCREMENT` | 主キー |
| `userId` | `BIGINT UNSIGNED` | User への外部キー |
| `stripeSessionId` | `VARCHAR(255) UNIQUE` | Checkout Session ID |
| `stripePaymentIntentId` | `VARCHAR(255) NULL` | PaymentIntent ID |
| `status` | `VARCHAR(50)` | `pending` / `completed` / `failed` / `expired` |
| `amount` | `INT UNSIGNED` | 決済金額（最小通貨単位） |
| `currency` | `VARCHAR(10) DEFAULT 'jpy'` | 通貨コード |
| `description` | `VARCHAR(255) NULL` | 説明 |
| `createdAt` | `DATETIME` | 作成日時 |
| `updatedAt` | `DATETIME` | 更新日時 |

### 5. API エンドポイント

すべて `/api/payment` 配下。認証（Bearer トークン）が必要。

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/payment/checkout` | 単発決済の Checkout Session 作成 |
| `POST` | `/api/payment/subscription` | サブスクリプション用 Checkout Session 作成 |
| `POST` | `/api/payment/portal` | Customer Portal セッション作成 |
| `GET` | `/api/payment/history` | 決済履歴取得（ページネーション対応） |
| `GET` | `/api/payment/status/:sessionId` | 個別決済のステータス確認 |
| `POST` | `/api/webhook/stripe` | Stripe Webhook（認証不要・raw body） |

#### リクエスト・レスポンス例

**POST /api/payment/checkout**

```json
// Request
{
  "priceId": "price_xxxxxxxxxxxxx",
  "quantity": 1
}

// Response
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**POST /api/payment/subscription**

```json
// Request
{
  "priceId": "price_xxxxxxxxxxxxx"
}

// Response
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**GET /api/payment/history?page=1&limit=20**

```json
// Response
{
  "payments": [
    {
      "id": 1,
      "userId": 1,
      "stripeSessionId": "cs_test_...",
      "stripePaymentIntentId": "pi_...",
      "status": "completed",
      "amount": 1000,
      "currency": "jpy",
      "description": null,
      "createdAt": "2026-03-23T10:00:00.000Z",
      "updatedAt": "2026-03-23T10:01:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 6. Webhook 処理

| イベント | 処理内容 |
|---|---|
| `checkout.session.completed` | Payment の status → `completed`、金額・通貨・PaymentIntent ID を更新 |
| `checkout.session.expired` | Payment の status → `expired` |
| `payment_intent.payment_failed` | Payment の status → `failed` |
| `customer.subscription.deleted` | ログ出力（拡張ポイント） |
| `invoice.payment_succeeded` | ログ出力（拡張ポイント） |
| `invoice.payment_failed` | ログ出力（拡張ポイント） |

### 7. 決済フロー

```
[フロントエンド]                    [バックエンド]                    [Stripe]
     |                                  |                              |
     |  POST /api/payment/checkout      |                              |
     |  { priceId, quantity }           |                              |
     |--------------------------------->|                              |
     |                                  |  Stripe Customer 取得/作成   |
     |                                  |----------------------------->|
     |                                  |<-----------------------------|
     |                                  |                              |
     |                                  |  Checkout Session 作成       |
     |                                  |----------------------------->|
     |                                  |<-----------------------------|
     |                                  |                              |
     |                                  |  Payment レコード保存        |
     |                                  |  (status: pending)           |
     |                                  |                              |
     |  { url, sessionId }              |                              |
     |<---------------------------------|                              |
     |                                  |                              |
     |  url にリダイレクト              |                              |
     |------------------------------------------------------->|       |
     |                                  |                      |       |
     |                                  |                      | 決済処理
     |                                  |                      |       |
     |  success_url にリダイレクト      |   Webhook 通知       |       |
     |<--------------------------------------------------------|       |
     |                                  |<-----------------------------|
     |                                  |  Payment status 更新         |
     |                                  |  (status: completed)         |
     |                                  |                              |
     |                                  |  { received: true }          |
     |                                  |----------------------------->|
```

---

## これからやること

### 1. 環境変数の設定

`.env` ファイルの以下の値を実際の Stripe キーに置き換える：

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx     # Stripe ダッシュボード → API keys
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx   # Stripe CLI or ダッシュボード → Webhooks
```

### 2. マイグレーションの生成と実行

```bash
# マイグレーション生成（User に stripeCustomerId 追加 + Payment テーブル作成）
npm run migration:generate --name=AddPaymentAndStripeCustomer

# マイグレーション実行
npm run migration:run
```

### 3. Stripe ダッシュボードでの商品・価格設定

1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. **Products** → **Add product** で商品を作成
3. 価格（Price）を設定し、表示される `price_xxx` ID をフロントエンドで使用

### 4. Webhook の設定

#### ローカル開発（Stripe CLI を使用）

```bash
# Stripe CLI をインストール
brew install stripe/stripe-cli/stripe

# ログイン
stripe login

# Webhook をローカルに転送
stripe listen --forward-to localhost:8888/api/webhook/stripe

# 表示される whsec_xxx を .env の STRIPE_WEBHOOK_SECRET に設定
```

#### 本番環境

1. Stripe Dashboard → **Developers** → **Webhooks**
2. エンドポイント URL: `https://your-domain.com/api/webhook/stripe`
3. 監視するイベント:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.payment_failed`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 5. フロントエンド実装

以下のページ・機能を実装する：

- **決済ページ**: `POST /api/payment/checkout` を呼び、返された `url` にリダイレクト
- **決済成功ページ** (`/payment/success`): クエリパラメータ `session_id` で `GET /api/payment/status/:sessionId` を確認
- **決済キャンセルページ** (`/payment/cancel`): キャンセル時の案内を表示
- **決済履歴ページ**: `GET /api/payment/history` で一覧表示
- **Customer Portal ボタン**: `POST /api/payment/portal` を呼び、返された `url` にリダイレクト

### 6. 追加で検討すべき機能

- [ ] 返金処理（Refund API の組み込み）
- [ ] サブスクリプションのステータス管理（`customer.subscription.updated` イベントの処理）
- [ ] 領収書メールの送信
- [ ] 管理者向け決済一覧 API
- [ ] 決済金額の事前検証（改ざん防止）
- [ ] レート制限（決済エンドポイントへの連続リクエスト防止）
- [ ] テストカードでの動作確認（`4242 4242 4242 4242`）
