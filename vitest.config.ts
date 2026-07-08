import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "tests/electron-contract.test.ts",
      "tests/electron-migration.test.ts",
      "tests/electron-persistence.test.ts",
      "tests/prompt-compiler.test.ts",
      "tests/prompt-scope.test.ts",
      "tests/ui-utils.test.ts",
    ],
    environment: "node",
  },
})
