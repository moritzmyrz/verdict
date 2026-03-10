"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { getTrpcErrorMessage } from "~/lib/trpc-error-message";
import { api } from "~/trpc/react";

const timePresets = [
  { label: "3+2 Blitz", timeClass: "blitz" as const, baseMs: 3 * 60_000, incrementMs: 2_000 },
  { label: "5+0 Blitz", timeClass: "blitz" as const, baseMs: 5 * 60_000, incrementMs: 0 },
  { label: "10+0 Rapid", timeClass: "rapid" as const, baseMs: 10 * 60_000, incrementMs: 0 },
];

const defaultPreset = timePresets[0]!;

export function PlayClient() {
  const router = useRouter();
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const openLobbies = api.lobby.listOpen.useQuery();
  const createLobby = api.lobby.create.useMutation({
    onError: (error) => {
      setFeedbackError(getTrpcErrorMessage(error, "Could not create lobby. Please try again."));
    },
  });
  const joinByCode = api.lobby.joinByCode.useMutation({
    onSuccess: ({ gameId }) => {
      router.push(`/game/${gameId}`);
    },
    onError: (error) => {
      setFeedbackError(getTrpcErrorMessage(error, "Could not join lobby. Please try again."));
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Play</h1>
        <p className="text-muted-foreground">Create a lobby or join one with an invite code.</p>
      </header>

      {feedbackError ? (
        <Alert variant="destructive">
          <AlertTitle>Action failed</AlertTitle>
          <AlertDescription>{feedbackError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create lobby</CardTitle>
          <CardDescription>Choose a preset and generate a private invite code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {timePresets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant={preset.label === selectedPreset.label ? "default" : "outline"}
                onClick={() => {
                  setFeedbackError(null);
                  setSelectedPreset(preset);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            disabled={createLobby.isPending}
            onClick={async () => {
              setFeedbackError(null);
              const lobby = await createLobby.mutateAsync({
                rated: true,
                visibility: "private",
                ...selectedPreset,
              });
              setCreatedInviteCode(lobby.inviteCode);
              setInviteCodeInput(lobby.inviteCode);
            }}
          >
            {createLobby.isPending ? "Creating..." : "Create private lobby"}
          </Button>
          {createdInviteCode ? (
            <p className="text-sm text-muted-foreground">
              Invite code: <Badge className="ml-2">{createdInviteCode}</Badge>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join by invite code</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            value={inviteCodeInput}
            onChange={(event) => {
              setFeedbackError(null);
              setInviteCodeInput(event.target.value.toUpperCase());
            }}
            placeholder="ABC123"
            maxLength={8}
          />
          <Button
            type="button"
            onClick={() => joinByCode.mutate({ inviteCode: inviteCodeInput })}
            disabled={joinByCode.isPending || inviteCodeInput.length < 6}
          >
            {joinByCode.isPending ? "Joining..." : "Join"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open lobbies</CardTitle>
          <CardDescription>Join any currently open public lobby.</CardDescription>
        </CardHeader>
        <CardContent>
          {openLobbies.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : openLobbies.data && openLobbies.data.length > 0 ? (
            <ul className="space-y-2">
              {openLobbies.data.map((lobby) => (
                <li
                  key={lobby.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-sm">
                    {Math.round(lobby.baseMs / 60000)}+{Math.round(lobby.incrementMs / 1000)}{" "}
                    {lobby.timeClass}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFeedbackError(null);
                      joinByCode.mutate({ inviteCode: lobby.inviteCode });
                    }}
                  >
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No open lobbies yet.</p>
          )}
        </CardContent>
      </Card>

      <footer>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
