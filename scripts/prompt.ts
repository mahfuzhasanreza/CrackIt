import { createInterface } from "node:readline";

/** Read a line from the terminal without echoing it. */
export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    // readline has no public "mute" option; suppress echo while the user types.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (!muted) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

/**
 * Get a new password: from CRACKIT_PASSWORD (non-interactive, e.g. CI) or by prompting twice.
 */
export async function readNewPassword(): Promise<string> {
  const fromEnv = process.env.CRACKIT_PASSWORD;
  if (fromEnv) return fromEnv;
  if (!process.stdin.isTTY) {
    throw new Error("No TTY: set CRACKIT_PASSWORD to provide the password non-interactively.");
  }
  const first = await promptHidden("New password: ");
  const second = await promptHidden("Repeat password: ");
  if (first !== second) throw new Error("Passwords do not match.");
  return first;
}
