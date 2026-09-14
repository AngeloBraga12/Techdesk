import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL or NETLIFY_DB_URL is required for Prisma.')
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
