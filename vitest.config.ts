import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

const migrations = await readD1Migrations("./migrations");
const migrationsJson = JSON.stringify(migrations);

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            WEBHOOK_VERIFY_TOKEN: "test_verify_token",
            INSTAGRAM_APP_SECRET: "test_app_secret",
            INSTAGRAM_ACCESS_TOKEN: "test_ig_access_token",
            MIGRATIONS_JSON: migrationsJson,
          },
          d1Databases: ["DB"],
        },
      },
    },
  },
});