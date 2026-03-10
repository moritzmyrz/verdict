"use client";

import { authClient } from "~/server/better-auth/client";

export function SignInButton() {
  return (
    <button
      type="button"
      className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium hover:bg-blue-600"
      onClick={async () => {
        await authClient.signIn.social({
          provider: "github",
          callbackURL: "/",
        });
      }}
    >
      Sign in with GitHub
    </button>
  );
}
