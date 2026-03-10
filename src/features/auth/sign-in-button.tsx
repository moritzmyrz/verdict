"use client";

import { Button } from "~/components/ui/button";
import { authClient } from "~/server/better-auth/client";

export function SignInButton() {
  return (
    <Button
      type="button"
      onClick={async () => {
        await authClient.signIn.social({
          provider: "github",
          callbackURL: "/",
        });
      }}
    >
      Sign in with GitHub
    </Button>
  );
}
