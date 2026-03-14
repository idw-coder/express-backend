import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express MySQL Docker API',
      version: '1.0.0',
      description: 'ノート・クイズ管理アプリケーションの REST API',
    },
    servers: [
      {
        url: '/api',
        description: 'API サーバー',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT トークンを Authorization ヘッダーに設定',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Note: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            title: { type: 'string' },
            content: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        QuizCategory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string' },
            category_name: { type: 'string' },
            description: { type: 'string', nullable: true },
            thumbnail_path: { type: 'string', nullable: true },
            display_order: { type: 'integer', nullable: true },
          },
        },
        QuizTag: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string' },
            name: { type: 'string' },
          },
        },
        QuizChoice: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            choice_text: { type: 'string' },
            is_correct: { type: 'boolean' },
            display_order: { type: 'integer', nullable: true },
          },
        },
        Quiz: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string' },
            category_id: { type: 'integer' },
            question: { type: 'string' },
            explanation: { type: 'string', nullable: true },
            choices: {
              type: 'array',
              items: { $ref: '#/components/schemas/QuizChoice' },
            },
            tags: {
              type: 'array',
              items: { $ref: '#/components/schemas/QuizTag' },
            },
          },
        },
        QuizHistory: {
          type: 'object',
          properties: {
            quizId: { type: 'integer' },
            categoryId: { type: 'integer' },
            isCorrect: { type: 'boolean' },
            answeredAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
