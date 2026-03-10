"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

const timePresets = [
  { label: "3+2 Blitz", timeClass: "blitz" as const, baseMs: 3 * 60_000, incrementMs: 2_000 },
  { label: "5+0 Blitz", timeClass: "blitz" as const, baseMs: 5 * 60_000, incrementMs: 0 },
  { label: "10+0 Rapid", timeClass: "rapid" as const, baseMs: 10 * 60_000, incrementMs: 0 },
];

const defaultPreset = timePresets[0]!;

export function PlayClient() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset);

  const openLobbies = api.lobby.listOpen.useQuery();
  const createLobby = api.lobby.create.useMutation();
  const joinByCode = api.lobby.joinByCode.useMutation({
    onSuccess: ({ gameId }) => {
      router.push(`/game/${gameId}`);
    },
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 text-zinc-100">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Play</h1>
        <p className="text-zinc-400">Create a lobby or join one with an invite code.</p>
      </header>

      <section className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="mb-3 text-lg font-medium">Create lobby</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {timePresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`rounded-md px-3 py-2 text-sm ${
                preset.label === selectedPreset.label
                  ? "bg-blue-700 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
              onClick={() => setSelectedPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm hover:bg-emerald-600"
          disabled={createLobby.isPending}
          onClick={async () => {
            const lobby = await createLobby.mutateAsync({
              rated: true,
              visibility: "private",
              ...selectedPreset,
            });
            setInviteCode(lobby.inviteCode);
          }}
        >
          {createLobby.isPending ? "Creating..." : "Create private lobby"}
        </button>
        {inviteCode ? (
          <p className="mt-3 text-sm text-zinc-300">
            Invite code: <span className="font-semibold">{inviteCode}</span>
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="mb-3 text-lg font-medium">Join by invite code</h2>
        <div className="flex gap-3">
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            className="w-full rounded-md border border-white/10 bg-zinc-800 px-3 py-2 outline-none"
            placeholder="ABC123"
          />
          <button
            type="button"
            className="rounded-md bg-blue-700 px-4 py-2 text-sm hover:bg-blue-600"
            onClick={() => joinByCode.mutate({ inviteCode })}
            disabled={joinByCode.isPending || inviteCode.length < 6}
          >
            Join
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-900 p-4">
        <h2 className="mb-3 text-lg font-medium">Open lobbies</h2>
        <ul className="space-y-2">
          {openLobbies.data?.map((lobby) => (
            <li
              key={lobby.id}
              className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2"
            >
              <span className="text-sm">
                {Math.round(lobby.baseMs / 60000)}+{Math.round(lobby.incrementMs / 1000)}{" "}
                {lobby.timeClass}
              </span>
              <button
                type="button"
                className="rounded bg-zinc-800 px-2 py-1 text-xs hover:bg-zinc-700"
                onClick={() => joinByCode.mutate({ inviteCode: lobby.inviteCode })}
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
