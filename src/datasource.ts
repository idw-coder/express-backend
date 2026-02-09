import { DataSource } from 'typeorm'
import { User } from './entities/User'
import { UserMeta } from './entities/UserMeta'
import { Note } from './entities/Note'
import { QuizCategory } from './entities/QuizCategory'
import { Quiz } from './entities/Quiz'
import { QuizChoice } from './entities/QuizChoice'

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'mysql',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'myapp',
  charset: 'utf8mb4',
  // DB_SYNCHRONIZE=true のときのみ true（未設定時は false。本番では必ず false にすること）
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  logging: true,
  entities: [User, UserMeta, Note, QuizCategory, Quiz, QuizChoice],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
})  