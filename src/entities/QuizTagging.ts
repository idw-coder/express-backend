import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm'
import { Quiz } from './Quiz'
import { QuizTag } from './QuizTag'

@Entity('quiz_tagging')
@Index(['quizId', 'quizTagId'], { unique: true })
export class QuizTagging {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number

  @Column({ name: 'quiz_id', type: 'bigint', unsigned: true })
  quizId!: number

  @Column({ name: 'quiz_tag_id', type: 'bigint', unsigned: true })
  quizTagId!: number

  @ManyToOne(() => Quiz)
  @JoinColumn({ name: 'quiz_id' })
  quiz!: Quiz

  @ManyToOne(() => QuizTag)
  @JoinColumn({ name: 'quiz_tag_id' })
  quizTag!: QuizTag
}