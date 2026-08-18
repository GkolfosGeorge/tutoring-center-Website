import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { registerLoginAttempt, clearLoginAttempts } from "@/lib/rateLimiter";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

class RateLimitedSignin extends CredentialsSignin {
  constructor(retryAfterSeconds: number) {
    super();
    // Ο κωδικός περνάει στο URL redirect (error=CredentialsSignin&code=...) και
    // διαβάζεται client-side από το signIn() ώστε να δείξουμε πόσα λεπτά απομένουν.
    this.code = `rate-limited-${Math.ceil(retryAfterSeconds / 60)}`;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) return null;

        const ip = getClientIp(request);
        const ipKey = `ip:${ip}`;
        const userKey = `user:${credentials.username}`;

        const ipCheck = registerLoginAttempt(ipKey);
        const userCheck = registerLoginAttempt(userKey);
        if (ipCheck.blocked || userCheck.blocked) {
          throw new RateLimitedSignin(Math.max(ipCheck.retryAfterSeconds, userCheck.retryAfterSeconds));
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
          include: { studentProfile: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        clearLoginAttempts(ipKey);
        clearLoginAttempts(userKey);

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          studentProfileId: user.studentProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.studentProfileId = (user as any).studentProfileId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as any).username = token.username;
      (session.user as any).role = token.role;
      (session.user as any).studentProfileId = token.studentProfileId;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
