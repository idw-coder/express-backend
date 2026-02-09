import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Quiz } from './Quiz'

@Entity('quiz_choice')
export class QuizChoice {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number

  @Column({ type: 'bigint', unsigned: true, name: 'quiz_id' })
  quizId!: number

  @Column({ type: 'text', name: 'choice_text' })
  choiceText!: string

  @Column({ type: 'tinyint', width: 1, name: 'is_correct' })
  isCorrect!: boolean

  @Column({ type: 'int', nullable: true, name: 'display_order' })
  displayOrder?: number

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date

  @ManyToOne(() => Quiz, (quiz) => quiz.choices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz!: Quiz
}
