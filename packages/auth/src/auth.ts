import type {} from "./types/next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@project/db";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { getVerifiedGitHubEmail } from "./github-email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/", error: "/" },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: { params: { scope: "read:user user:email" } },
      allowDangerousEmailAccountLinking: true,
      profile: async (profile, tokens) => {
        if (!tokens.access_token) {
          throw new Error("GitHub did not return an access token");
        }

        const email = await getVerifiedGitHubEmail(tokens.access_token);
        return {
          id: String(profile.id),
          name: profile.name ?? profile.login,
          email,
          emailVerified: new Date(),
          image: profile.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { phoneNumber: true },
        });
        session.user.phoneNumber = currentUser?.phoneNumber ?? null;
      }
      return session;
    },
  },
});
