import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm'
import { Quiz } from './Quiz'

@Entity('quiz_category')
export class QuizCategory {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string

  @Column({ type: 'varchar', length: 255, name: 'category_name' })
  categoryName!: string

  @Column({ type: 'bigint', unsigned: true, name: 'author_id' })
  authorId!: number

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'thumbnail_path' })
  thumbnailPath?: string

  @Column({ type: 'int', nullable: true, name: 'display_order' })
  displayOrder?: number

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt?: Date

  @OneToMany(() => Quiz, (quiz) => quiz.category)
  quizzes!: Quiz[]
}
