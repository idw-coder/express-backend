import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm'
  import { User } from './User'
  
  @Entity()
  export class Note {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id!: number
  
    @Column({ type: 'bigint', unsigned: true, name: 'user_id' })
    userId!: number
  
    @Column({ type: 'varchar', length: 255, default: '' })
    title!: string
  
    @Column({ type: 'text', nullable: true })
    content?: string
  
    @CreateDateColumn({ type: 'datetime', name: 'created_at' })
    createdAt!: Date
  
    @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
    updatedAt!: Date
  
    @DeleteDateColumn({ type: 'datetime', name: 'deleted_at' })
    deletedAt?: Date
  
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User
  }