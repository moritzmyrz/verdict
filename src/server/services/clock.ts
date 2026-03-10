type ClockArgs = {
  remainingMs: number;
  lastClockStartedAt: Date | null;
  now: Date;
};

export function computeRemainingMs({
  remainingMs,
  lastClockStartedAt,
  now,
}: ClockArgs) {
  if (!lastClockStartedAt) {
    return remainingMs;
  }

  const elapsed = Math.max(now.getTime() - lastClockStartedAt.getTime(), 0);
  return Math.max(remainingMs - elapsed, 0);
}

export function applyIncrement(remainingMs: number, incrementMs: number) {
  return Math.max(remainingMs + incrementMs, 0);
}
