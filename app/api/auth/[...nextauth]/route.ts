import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // 1) Try local user authentication first
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (user) {
          const isPasswordValid = await compare(
            credentials.password,
            user.password,
          );

          if (isPasswordValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }
        }

        // 2) Fallback: attempt to authenticate against Hestia for customers
        // Find customer by email
        const customer = await prisma.customer.findUnique({
          where: { email: credentials.email },
        });

        if (customer && customer.hestiaUsername) {
          // 2a) Allow customer login using stored panel password (no Hestia login needed)
          const isStoredPasswordHashed =
            customer.hestiaPassword.startsWith("$2");
          const isStoredPasswordValid = isStoredPasswordHashed
            ? await compare(credentials.password, customer.hestiaPassword)
            : credentials.password === customer.hestiaPassword;

          if (isStoredPasswordValid) {
            const randomPass = Math.random().toString(36) + Date.now();
            const { hash } = await import("bcryptjs");
            const hashed = await hash(randomPass, 10);

            const upserted = await prisma.user.upsert({
              where: { email: credentials.email },
              update: {
                name: customer.name || credentials.email,
                password: hashed,
                role: "USER",
              },
              create: {
                email: credentials.email,
                name: customer.name || credentials.email,
                password: hashed,
                role: "USER",
              },
            });

            return {
              id: upserted.id,
              email: upserted.email,
              name: upserted.name,
              role: upserted.role,
            };
          }

          // 2b) Fallback: attempt to authenticate against Hestia for customers
          const { HESTIA_HOST = "100.86.108.93", HESTIA_PORT = "8083" } =
            process.env;
          const { HestiaAPI } = await import("@/lib/hestia-api");

          const hestia = new HestiaAPI({
            host: HESTIA_HOST,
            port: HESTIA_PORT,
            user: customer.hestiaUsername,
            password: credentials.password,
          });

          // Non-destructive command to verify credentials
          const result = await hestia.listDomains(customer.hestiaUsername);

          if (result.success) {
            const randomPass = Math.random().toString(36) + Date.now();
            const { hash } = await import("bcryptjs");
            const hashed = await hash(randomPass, 10);

            const upserted = await prisma.user.upsert({
              where: { email: credentials.email },
              update: {
                name: customer.name || credentials.email,
                password: hashed,
                role: "USER",
              },
              create: {
                email: credentials.email,
                name: customer.name || credentials.email,
                password: hashed,
                role: "USER",
              },
            });

            return {
              id: upserted.id,
              email: upserted.email,
              name: upserted.name,
              role: upserted.role,
            };
          }
        }

        throw new Error("Invalid email or password");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
