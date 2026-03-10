const authErrorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  INVALID_EMAIL: "Enter a valid email address.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
};

function readAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as Record<string, unknown>;
  const message = maybeError.message;
  if (typeof message === "string" && message.length > 0) {
    return message.toUpperCase();
  }

  const code = maybeError.code;
  if (typeof code === "string" && code.length > 0) {
    return code.toUpperCase();
  }

  return null;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  const code = readAuthErrorCode(error);
  if (!code) {
    return fallback;
  }

  return authErrorMessages[code] ?? fallback;
}
