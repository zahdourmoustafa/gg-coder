/**
 * Connection file for local companion tools (tappy).
 *
 * The daemon already answers on a loopback port guarded by a per-launch bearer
 * token, but both live only in the Rust shell's memory, so nothing else on the
 * machine can reach the agent the user has open. This writes them to
 * `~/.gg/app-connections/<pid>.json` (directory 0700, file 0600) while the
 * daemon is listening, and removes it on shutdown.
 *
 * Trust: anything that can read this file already runs as the user and can
 * read `~/.gg/auth.json` — the provider credentials themselves — so the file
 * grants nothing the user's own processes did not already have. On Windows the
 * profile directory's default ACL gives the same per-user isolation; the POSIX
 * modes are a no-op there.
 *
 * A crash leaves the file behind, so readers must check `pid` is alive, and
 * the next daemon to start prunes files whose process is gone.
 */

import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import path from "node:path";

/** Bumped only on a breaking change to the file's shape. */
export const CONNECTION_FILE_VERSION = 1;

export interface AppConnection {
  version: typeof CONNECTION_FILE_VERSION;
  pid: number;
  host: string;
  port: number;
  token: string;
  startedAt: string;
}

export function connectionsDir(agentDir: string): string {
  return path.join(agentDir, "app-connections");
}

export function connectionFilePath(agentDir: string, pid: number): string {
  return path.join(connectionsDir(agentDir), `${pid}.json`);
}

/** True when a process with this id exists (EPERM still means it exists). */
export function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Write the file atomically (temp + rename), so a reader never sees half a
 * token. Returns a synchronous remover safe to call from an `exit` hook.
 */
export async function writeConnectionFile(
  agentDir: string,
  connection: AppConnection,
): Promise<() => void> {
  const dir = connectionsDir(agentDir);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const target = connectionFilePath(agentDir, connection.pid);
  const staging = `${target}.${process.hrtime.bigint()}.tmp`;
  await writeFile(staging, `${JSON.stringify(connection)}\n`, { mode: 0o600 });
  await rename(staging, target);
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    try {
      unlinkSync(target);
    } catch {
      // Already gone (pruned by another daemon, or the user deleted it).
    }
  };
}

/** Remove files left by daemons that died without running their teardown. */
export async function pruneStaleConnectionFiles(
  agentDir: string,
  alive: (pid: number) => boolean = processAlive,
): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(connectionsDir(agentDir));
  } catch {
    return 0;
  }
  let pruned = 0;
  for (const name of entries.sort()) {
    const match = /^(\d+)\.json$/.exec(name);
    if (!match?.[1] || alive(Number(match[1]))) continue;
    await rm(path.join(connectionsDir(agentDir), name), { force: true });
    pruned += 1;
  }
  return pruned;
}

/** Parse one file; undefined for anything malformed. Used by tests and companions. */
export async function readConnectionFile(file: string): Promise<AppConnection | undefined> {
  try {
    const raw = JSON.parse(await readFile(file, "utf8")) as Partial<AppConnection>;
    if (
      raw.version !== CONNECTION_FILE_VERSION ||
      typeof raw.pid !== "number" ||
      typeof raw.host !== "string" ||
      typeof raw.port !== "number" ||
      typeof raw.token !== "string" ||
      raw.token.length === 0
    ) {
      return undefined;
    }
    return raw as AppConnection;
  } catch {
    return undefined;
  }
}
