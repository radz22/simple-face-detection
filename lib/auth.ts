import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { authConfig } from '../auth.config';

// Helper functions that work in both Edge and Node.js runtimes
const getPrisma = async () => {
  try {
    const { prisma } = await import('./prisma');
    return prisma;
  } catch {
    return null;
  }
};

const getBcrypt = async () => {
  try {
    return (await import('bcryptjs')).default;
  } catch {
    return null;
  }
};

// Initialize adapter - will be undefined in Edge runtime (middleware)
// This is OK because middleware doesn't need the adapter
let adapterInstance: any = undefined;

// Use a function to check if we can initialize adapter
// This avoids Edge runtime errors from require/import at top level
const initAdapter = () => {
  try {
    // Dynamic require only works in Node.js runtime
    if (typeof require !== 'undefined') {
      const prismaModule = require('./prisma');
      const adapterModule = require('@auth/prisma-adapter');
      if (prismaModule?.prisma && adapterModule?.PrismaAdapter) {
        return adapterModule.PrismaAdapter(prismaModule.prisma);
      }
    }
  } catch {
    // Edge runtime - adapter not available
  }
  return undefined;
};

// Initialize adapter for API routes (Node.js runtime)
// In middleware (Edge runtime), this will be undefined
adapterInstance = initAdapter();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: adapterInstance,
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const prisma = await getPrisma();
          const bcrypt = await getBcrypt();

          if (!prisma || !bcrypt) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as string) || 'EMPLOYEE';

        // Try to enhance with DB data (Node.js runtime only)
        try {
          const prisma = await getPrisma();
          if (prisma) {
            const dbUser = await prisma.user.findUnique({
              where: { email: session.user.email! },
              select: { id: true, role: true },
            });

            if (dbUser) {
              session.user.id = dbUser.id;
              session.user.role = dbUser.role;
            }
          }
        } catch {
          // Use token data if DB unavailable
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
  },
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    role: string;
  }
}
