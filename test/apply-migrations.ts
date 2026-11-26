import type { D1Migration } from "cloudflare:test";
import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll } from "vitest";
import type { Env } from "../src/env";

beforeAll(async () => {
  const testEnv = env as unknown as Env & { MIGRATIONS_JSON?: string };
  const raw = testEnv.MIGRATIONS_JSON;
  if (!raw) {
    throw new Error("MIGRATIONS_JSON binding missing");
  }
  const migrations = JSON.parse(raw) as D1Migration[];
  await applyD1Migrations(testEnv.DB, migrations);
});