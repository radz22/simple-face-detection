import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logOptions: Array<'query' | 'error' | 'warn'> =
  process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logOptions,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
