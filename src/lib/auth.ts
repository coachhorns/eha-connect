import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const normalizedEmail = credentials.email.toLowerCase().trim()

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { accounts: { select: { provider: true } } },
        })

        if (!user) {
          throw new Error('Invalid email or password')
        }

        if (!user.password) {
          const hasGoogle = user.accounts.some((a) => a.provider === 'google')
          if (hasGoogle) {
            throw new Error('This account uses Google Sign-In. Please sign in with Google instead.')
          }
          throw new Error('Invalid email or password')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roleSelected: user.roleSelected,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.roleSelected = (user as any).roleSelected ?? false
      }
      // For OAuth users, fetch role + roleSelected from database if not set
      if (account?.provider === 'google' && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, roleSelected: true },
        })
        token.role = dbUser?.role || 'PARENT'
        token.roleSelected = dbUser?.roleSelected ?? false
      }
      // Re-fetch from DB when session is manually refreshed
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, roleSelected: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.roleSelected = dbUser.roleSelected
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.roleSelected = (token.roleSelected as boolean) ?? false
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',

    error: '/auth/error',
  },
}
