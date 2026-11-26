import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            WEBHOOK_VERIFY_TOKEN: "test_verify_token",
            INSTAGRAM_APP_SECRET: "test_app_secret",
            INSTAGRAM_ACCESS_TOKEN: "test_ig_access_token",
          },
        },
      },
    },
  },
});