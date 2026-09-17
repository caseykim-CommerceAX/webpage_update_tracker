import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  EndpointState,
  RunDocument,
  RunIndexDocument,
  StateDocument,
  TargetsDocument,
} from "@/lib/json-types";

const dataDirectory = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.TRACKER_DATA_DIR ?? "data");

function dataPath(...segments: string[]) {
  return resolve(dataDirectory, ...segments);
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  rmSync(path, { force: true });
  renameSync(temporaryPath, path);
}

export function getTargetsDocument() {
  return readJson<TargetsDocument>(dataPath("targets.json"));
}

export function getStateDocument(): StateDocument {
  const path = dataPath("state.json");
  if (!existsSync(path)) return { schemaVersion: 1, updatedAt: nowIso(), endpoints: {} };
  return readJson<StateDocument>(path);
}

export function getRunIndex(): RunIndexDocument {
  const path = dataPath("run-index.json");
  if (!existsSync(path)) return { schemaVersion: 1, updatedAt: nowIso(), runs: [] };
  return readJson<RunIndexDocument>(path);
}

export function getRunDocument(runId: string) {
  const path = dataPath("runs", `${runId}.json`);
  return existsSync(path) ? readJson<RunDocument>(path) : null;
}

export function saveStateDocument(document: StateDocument) {
  writeJson(dataPath("state.json"), document);
}

export function saveRunDocument(document: RunDocument) {
  writeJson(dataPath("runs", `${document.run.id}.json`), document);
}

export function saveRunIndex(document: RunIndexDocument) {
  writeJson(dataPath("run-index.json"), document);
}

export function acquireRunLock() {
  const path = dataPath("scan.lock");
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const staleBefore = Date.now() - 30 * 60 * 1000;
    if (statSync(path).mtimeMs < staleBefore) rmSync(path, { force: true });
  }
  let descriptor: number;
  try {
    descriptor = openSync(path, "wx");
  } catch {
    throw new Error("다른 진단이 실행 중입니다. 완료 후 다시 시도해 주세요.");
  }
  writeFileSync(descriptor, `${process.pid}\n`, "utf8");
  closeSync(descriptor);
  return () => rmSync(path, { force: true });
}

export function emptyEndpointState(): EndpointState {
  return {
    launchedAt: null,
    liveCompletedAt: null,
    lastChangedAt: null,
    latest: null,
    lastSuccessful: null,
  };
}

export function createId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
