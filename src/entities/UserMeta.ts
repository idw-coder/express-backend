import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm'
import { User } from './User'

@Entity()
@Unique(['userId', 'metaKey']) // userIdとmetaKeyの組み合わせは一意
@Index(['metaKey']) //
export class UserMeta {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number

  @Column({ type: 'bigint', unsigned: true })
  userId!: number

  @Column({ type: 'varchar', length: 255 })
  metaKey!: string

  @Column({ type: 'text', nullable: true })
  metaValue?: string

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date

  @ManyToOne(() => User, (user) => user.userMeta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User
}