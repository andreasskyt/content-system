/**
 * Claude access via the Claude Code CLI instead of the metered Anthropic API.
 *
 * `new Anthropic()` reads ANTHROPIC_API_KEY and bills per token. The CLI
 * authenticates with the Max subscription's OAuth session, so pipeline runs
 * cost nothing extra. ANTHROPIC_API_KEY is stripped from the child env because
 * its presence silently flips the CLI back to API billing.
 */

import { spawn } from "child_process";
import os from "os";

export type Msg = { role: "user" | "assistant"; content: string };

export interface AskClaudeOptions {
  messages: Msg[];
  system?: string;
  /** CLI alias ("sonnet", "haiku", "opus") or a full model id. */
  model?: string;
}

/** The CLI takes one prompt, so multi-turn exchanges are flattened with markers. */
function flatten(messages: Msg[]): string {
  if (messages.length === 1) return messages[0].content;
  return messages
    .map((m) => `<turn role="${m.role}">\n${m.content}\n</turn>`)
    .join("\n\n");
}

export async function askClaude({
  messages,
  system,
  model = "sonnet",
}: AskClaudeOptions): Promise<string> {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--model",
    model,
    "--max-turns",
    "1",
  ];
  if (system) args.push("--system-prompt", system);

  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  // A failed run still prints a JSON result body, and that body carries the
  // only useful diagnostic — so the exit code is inspected after parsing, not
  // before.
  const { code, out, err } = await new Promise<{
    code: number | null;
    out: string;
    err: string;
  }>((resolve, reject) => {
    const child = spawn(process.env.CLAUDE_CLI_PATH ?? "claude", args, {
      env,
      // Neutral cwd keeps CLAUDE.md auto-discovery out of the prompt.
      cwd: os.tmpdir(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) =>
      reject(new Error(`Could not run the claude CLI: ${e.message}`))
    );
    child.on("close", (code) => resolve({ code, out, err }));

    child.stdin.write(flatten(messages));
    child.stdin.end();
  });

  let payload: { result?: string; is_error?: boolean };
  try {
    payload = JSON.parse(out);
  } catch {
    throw new Error(
      `claude CLI exited ${code} without a JSON result: ${
        err.trim() || out.trim() || "(no output)"
      }`
    );
  }

  if (payload.is_error || code !== 0) {
    const msg = payload.result ?? "unknown error";
    if (/authenticate|OAuth/i.test(msg)) {
      throw new Error(
        `Claude CLI is not signed in — run \`claude login\` in a terminal. (${msg})`
      );
    }
    throw new Error(`claude CLI error: ${msg}`);
  }

  return (payload.result ?? "").trim();
}
