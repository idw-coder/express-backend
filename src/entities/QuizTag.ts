import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity('quiz_tag')
export class QuizTag {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number

  @Index({ unique: true })
  @Column({ length: 100 })
  slug!: string

  @Column({ length: 100 })
  name!: string
}