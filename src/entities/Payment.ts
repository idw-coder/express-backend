// TODO: stripe@17.7.0（古いバージョン）で実装しているため、将来的に最新の安定版へアップグレードすること
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { User } from "./User";

@Entity()
export class Payment {
  @PrimaryGeneratedColumn({ type: "bigint", unsigned: true })
  id!: number;

  @Column({ type: "bigint", unsigned: true })
  userId!: number;

  // Stripe Checkout セッションID（初回）/ inv_{invoice.id}（定期更新時）
  @Column({ type: "varchar", length: 255, unique: true })
  stripeSessionId!: string;

  // Stripe PaymentIntent ID（決済完了後に付与）
  @Column({ type: "varchar", length: 255, nullable: true })
  stripePaymentIntentId?: string;

  // 決済ステータス（pending / completed / expired / failed）
  @Column({ type: "varchar", length: 50 })
  status!: string;

  // 決済金額
  @Column({ type: "int", unsigned: true })
  amount!: number;

  // 通貨コード（jpy）
  @Column({ type: "varchar", length: 10, default: "jpy" })
  currency!: string;

  // 決済の補足説明
  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  // レコード作成日時
  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  // レコード更新日時
  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  // User エンティティとのリレーション
  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;
}
