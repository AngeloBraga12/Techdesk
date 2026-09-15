import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

// Netlify Functions run through Lambda compatibility. In that runtime the
// database connection must be supplied explicitly to the Postgres adapter.
// NETLIFY_DB_URL is automatically exposed by Netlify Database to Functions.
const connectionString = process.env.NETLIFY_DB_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Database connection is not configured. NETLIFY_DB_URL or DATABASE_URL is required.')
}

const adapter = new PrismaPg({ connectionString })
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
