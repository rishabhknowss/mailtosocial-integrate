import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique identifier */
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
    provider?: string;
  }

  interface User {
    id: string;
  }
} 