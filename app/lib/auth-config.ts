import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { appLogger } from '@/lib/logger';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        appLogger.auth('login', undefined, {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        });

        if (!credentials?.email || !credentials?.password) {
          appLogger.auth('failed_login', undefined, { reason: 'missing_credentials' });
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          });

          appLogger.debug('User lookup result', {
            found: !!user,
            hasPassword: !!user?.password,
            role: user?.role
          });

          if (!user || !user.password) {
            appLogger.auth('failed_login', undefined, { 
              reason: 'user_not_found_or_no_password',
              email: credentials.email 
            });
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            appLogger.auth('failed_login', user.id, { 
              reason: 'invalid_password',
              email: user.email 
            });
            return null;
          }

          appLogger.auth('login', user.id, { email: user.email });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          appLogger.error('Authentication error', error as Error, {
            email: credentials?.email
          });
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    // Session timeout settings
    maxAge: 8 * 60 * 60, // 8 hours in seconds (default)
    updateAge: 60 * 60, // Update session every hour
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin  
      if (new URL(url).origin === baseUrl) return url;
      // Default redirect to dashboard after successful login
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
};