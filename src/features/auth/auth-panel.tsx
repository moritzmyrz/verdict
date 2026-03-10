"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { getAuthErrorMessage } from "~/features/auth/auth-errors";
import { authClient } from "~/server/better-auth/client";

type AuthMode = "sign-in" | "sign-up";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGithubPending, setIsGithubPending] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email and password are required.");
      return;
    }

    if (isSignUp && !name.trim()) {
      setErrorMessage("Name is required to create an account.");
      return;
    }

    setIsPending(true);

    try {
      if (isSignUp) {
        const response = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
          callbackURL: "/",
        });

        if (response.error) {
          setErrorMessage(getAuthErrorMessage(response.error, "Could not create account."));
          return;
        }
      } else {
        const response = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });

        if (response.error) {
          setErrorMessage(getAuthErrorMessage(response.error, "Could not sign in."));
          return;
        }
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "Authentication failed. Please try again."));
    } finally {
      setIsPending(false);
    }
  }

  async function handleGithubSignIn() {
    setErrorMessage(null);
    setIsGithubPending(true);

    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "GitHub sign-in failed. Please try again."));
      setIsGithubPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isSignUp ? "Create account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Create a Verdict account with your email and password."
            : "Sign in to create lobbies, play games, and track progress."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Authentication error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-3" onSubmit={handleCredentialsSubmit}>
          {isSignUp ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Magnus Carlsen"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isPending || isGithubPending}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending || isGithubPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending || isGithubPending}
            />
          </div>

          <Button className="w-full" type="submit" disabled={isPending || isGithubPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <Separator />

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGithubSignIn}
          disabled={isPending || isGithubPending}
        >
          {isGithubPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Continue with GitHub
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setMode(isSignUp ? "sign-in" : "sign-up");
              setErrorMessage(null);
            }}
            disabled={isPending || isGithubPending}
          >
            {isSignUp ? "Sign in instead" : "Create one"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
