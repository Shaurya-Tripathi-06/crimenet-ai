import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const AUTHORIZED_EMAILS = new Set([
  "admin@crimenet.ai",
  "senior@crimenet.ai",
  "investigator@crimenet.ai",
]);

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password(),
  ],

  callbacks: {
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId);

      if (
        !user?.email ||
        !AUTHORIZED_EMAILS.has(user.email.toLowerCase())
      ) {
        throw new Error(
          "This account is not authorized to access CrimeNet.",
        );
      }
    },
  },
});