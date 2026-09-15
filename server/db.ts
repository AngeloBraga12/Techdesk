import { getConnectionString } from '@netlify/database'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL ?? getConnectionString()

if (!connectionString) {
  throw new Error('A database connection string is required to initialize Prisma.')
}

const adapter = new PrismaPg({ connectionString })
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
