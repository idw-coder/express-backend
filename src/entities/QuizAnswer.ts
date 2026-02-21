import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'
import { User } from './User'

@Entity('quiz_answers')
@Unique(['userId', 'quizId', 'answeredAt'])
export class QuizAnswer {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number

  @Column({ type: 'bigint', unsigned: true, name: 'user_id' })
  userId!: number

  @Column({ type: 'bigint', unsigned: true, name: 'quiz_id' })
  quizId!: number

  @Column({ type: 'bigint', unsigned: true, name: 'category_id' })
  categoryId!: number

  @Column({ type: 'boolean', name: 'is_correct' })
  isCorrect!: boolean

  @Column({ type: 'datetime', name: 'answered_at' })
  answeredAt!: Date

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User
}
