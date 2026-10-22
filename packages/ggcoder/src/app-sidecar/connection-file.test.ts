import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  CONNECTION_FILE_VERSION,
  connectionFilePath,
  connectionsDir,
  processAlive,
  pruneStaleConnectionFiles,
  readConnectionFile,
  writeConnectionFile,
  type AppConnection,
} from "./connection-file.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function agentDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "gg-conn-"));
  tempDirs.push(dir);
  return dir;
}

function connection(pid: number): AppConnection {
  return {
    version: CONNECTION_FILE_VERSION,
    pid,
    host: "127.0.0.1",
    port: 49153,
    token: "secret-token",
    startedAt: "2026-10-22T00:00:00.000Z",
  };
}

describe("connection file", () => {
  it("writes a readable file and removes it once", async () => {
    const dir = await agentDir();
    const remove = await writeConnectionFile(dir, connection(4242));
    const file = connectionFilePath(dir, 4242);

    expect(await readConnectionFile(file)).toEqual(connection(4242));
    expect(await readdir(connectionsDir(dir))).toEqual(["4242.json"]);

    remove();
    remove();
    expect(await readdir(connectionsDir(dir))).toEqual([]);
  });

  it.skipIf(process.platform === "win32")("is private to the user", async () => {
    const dir = await agentDir();
    await writeConnectionFile(dir, connection(7));
    expect((await stat(connectionFilePath(dir, 7))).mode & 0o777).toBe(0o600);
    expect((await stat(connectionsDir(dir))).mode & 0o777).toBe(0o700);
  });

  it("rejects malformed files", async () => {
    const dir = await agentDir();
    await mkdir(connectionsDir(dir), { recursive: true });
    const file = path.join(connectionsDir(dir), "1.json");
    await writeFile(file, JSON.stringify({ ...connection(1), token: "" }));
    expect(await readConnectionFile(file)).toBeUndefined();
    await writeFile(file, "{not json");
    expect(await readConnectionFile(file)).toBeUndefined();
    await writeFile(file, JSON.stringify({ ...connection(1), version: 99 }));
    expect(await readConnectionFile(file)).toBeUndefined();
  });

  it("prunes only files whose process is gone", async () => {
    const dir = await agentDir();
    await writeConnectionFile(dir, connection(10));
    await writeConnectionFile(dir, connection(20));
    await writeFile(path.join(connectionsDir(dir), "notes.txt"), "keep");

    const pruned = await pruneStaleConnectionFiles(dir, (pid) => pid === 20);

    expect(pruned).toBe(1);
    expect((await readdir(connectionsDir(dir))).sort()).toEqual(["20.json", "notes.txt"]);
  });

  it("treats a missing directory as nothing to prune", async () => {
    expect(await pruneStaleConnectionFiles(path.join(await agentDir(), "absent"))).toBe(0);
  });

  it("knows this process is alive and rejects bad pids", () => {
    expect(processAlive(process.pid)).toBe(true);
    expect(processAlive(0)).toBe(false);
    expect(processAlive(-5)).toBe(false);
  });
});
