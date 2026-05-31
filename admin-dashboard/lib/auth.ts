import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import api from './api';

export type AdminRole = 'super_admin' | 'moderator' | 'analyst';

declare module 'next-auth' {
  interface User {
    role?: AdminRole;
    accessToken?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      role: AdminRole;
      accessToken: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: AdminRole;
    accessToken?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'swapskills-admin-secret-dev-only',
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const response = await api.post('/api/v1/admin/auth/login', {
            username: credentials.username,
            password: credentials.password,
          });

          const { admin, token } = response.data.data;

          return {
            id: String(admin.id),
            name: admin.name,
            role: admin.role,
            accessToken: token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnLogin = nextUrl.pathname === '/login';

      if (isOnDashboard) {
        if (!isLoggedIn) return false; // Redirect to login
        return true;
      }

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as AdminRole;
        session.user.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
