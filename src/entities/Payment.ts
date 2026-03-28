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

  @Column({ type: "varchar", length: 255, unique: true })
  stripeSessionId!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  stripePaymentIntentId?: string;

  @Column({ type: "varchar", length: 50 })
  status!: string;

  @Column({ type: "int", unsigned: true })
  amount!: number;

  @Column({ type: "varchar", length: 10, default: "jpy" })
  currency!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user!: User;
}
