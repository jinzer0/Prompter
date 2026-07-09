import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "tests/electron-contract.test.ts",
      "tests/electron-search-contract.test.ts",
      "tests/phase5-prompt-compiler-contract.test.ts",
      "tests/phase8-export-contract.test.ts",
      "tests/electron-migration.test.ts",
      "tests/openai-key-store.test.ts",
      "tests/llm-prompt-compiler.test.ts",
      "tests/phase9-contract.test.ts",
      "tests/electron-persistence.test.ts",
      "tests/electron-search-contract.test.ts",
      "tests/electron-search-persistence.test.ts",
      "tests/prompt-compiler.test.ts",
      "tests/prompt-version-diff.test.ts",
      "tests/prompt-scope.test.ts",
      "tests/prompt-export-formatters.test.ts",
      "tests/ui-utils.test.ts",
    ],
    environment: "node",
  },
})
