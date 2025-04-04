// app/lib/authOptions.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import db from "../../prisma/db";
import { Account } from "@prisma/client";
import { refreshGoogleToken } from "@/app/utils/googleTokenRefresh";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "your@email.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name:
            `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
            user.email,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Add user ID to the token when it's available
      if (user) {
        token.userId = user.id;
      }
      
      // If this is a sign-in event from a provider that gives access/refresh tokens
      if (account && user) {
        if (account.provider === "google") {
          token.provider = account.provider;
          token.access_token = account.access_token;
          token.expires_at = account.expires_at;
          token.refresh_token = account.refresh_token;
        }
      }

      // Check if the access token has expired
      const shouldRefreshToken = 
        token.provider === "google" &&
        token.expires_at && 
        Date.now() > (token.expires_at as number) * 1000;

      // If token is expired and we have a refresh token, refresh it
      if (shouldRefreshToken && token.refresh_token) {
        console.log("JWT callback: Token expired, attempting refresh");
        try {
          // Find the account in the database
          const userAccount = await db.account.findFirst({
            where: {
              userId: token.userId as string,
              provider: "google",
            },
          });

          if (userAccount) {
            const refreshedAccount = await refreshGoogleToken(userAccount as Account);
            
            if (refreshedAccount) {
              // Update the token with the new values
              token.access_token = refreshedAccount.access_token;
              token.expires_at = refreshedAccount.expires_at;
              console.log("JWT callback: Successfully refreshed token");
            } else {
              console.error("JWT callback: Failed to refresh token");
            }
          }
        } catch (error) {
          console.error("Error refreshing access token:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.accessToken = token.access_token as string;
        session.provider = token.provider as string;
      }

      return session;
    },

    async signIn({ user, account }) {
      if (user?.email && account) {
        try {
          // Check if user exists
          let existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Create new user
            existingUser = await db.user.create({
              data: {
                id: user.id!, // Use the ID from the authentication
                email: user.email,
                firstname: user.name?.split(" ")[0] || null,
                lastname: user.name?.split(" ")[1] || null,
              },
            });
            console.log('Created new user:', existingUser.id);
          } else if (existingUser.id !== user.id) {
            // Important: If the existing user has a different ID, we need to use that ID
            // instead of the one from the authentication to maintain data consistency
            console.log('User exists but with different ID. Using existing ID:', existingUser.id);
            // Set the user ID to match what's in the database
            user.id = existingUser.id;
          }

          // IMPORTANT FIX: Always link the OAuth account to the user
          if (account.provider === 'google') {
            console.log('Linking Google account to user:', existingUser.id);
            
            // First check if there's already an account record
            const existingAccount = await db.account.findFirst({
              where: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });

            // Update or create the account
            if (existingAccount) {
              // Update the existing account
              await db.account.update({
                where: {
                  id: existingAccount.id,
                },
                data: {
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  refresh_token: account.refresh_token,
                  scope: account.scope,
                  token_type: account.token_type,
                  id_token: account.id_token,
                  userId: existingUser.id, // Link to the correct user
                },
              });
              console.log('Updated existing Google account record');
            } else {
              // Create a new account record
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  refresh_token: account.refresh_token,
                  scope: account.scope,
                  token_type: account.token_type,
                  id_token: account.id_token,
                },
              });
              console.log('Created new Google account record');
            }
          }

          return true;
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }

      return true;
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
  debug: process.env.NODE_ENV === 'development',
};