import { writeFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { openPrompterDatabase } from "../electron/db/connection"
import { DEFAULT_HARNESS_TEMPLATE_IDS } from "../electron/db/default-harness-templates"
import { backupEnvelopeSchema } from "../electron/ipc-contract"
import { fullImportEnvelope } from "./phase16-backup-import-fixtures"
import { createHarness, tempDirectory } from "./phase16-backup-validation-fixtures"

describe("Phase 16 backup validation preview regressions", () => {
  it("maps harness conflicts by source id when a default harness is filtered first", async () => {
    // Given: a harness pack containing a reused default before a user harness whose name collides.
    const directory = await tempDirectory()
    const filePath = join(directory, "mixed-harnesses.json")
    const database = openPrompterDatabase({
      databasePath: join(directory, "mixed-harnesses.sqlite"),
      migrationsFolder: join(process.cwd(), "drizzle"),
    })
    const source = fullImportEnvelope()
    const sourceHarness = source.data.harnessTemplates[0]
    if (sourceHarness === undefined) {
      throw new TypeError("Expected a harness fixture")
    }
    const userHarnessId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    const userHarnessName = "Collision Harness"
    const envelope = backupEnvelopeSchema.parse({
      ...source,
      backupType: "harness_templates",
      metadata: {
        ...source.metadata,
        itemCounts: { ...source.metadata.itemCounts, harnessTemplates: 2 },
      },
      data: {
        harnessTemplates: [
          {
            ...sourceHarness,
            id: DEFAULT_HARNESS_TEMPLATE_IDS.feature,
            name: "Built-in Feature Harness",
          },
          { ...sourceHarness, id: userHarnessId, name: userHarnessName },
        ],
      },
    })
    database.sqlite.exec(
      `insert into harness_templates (id, name, scenario, target_agent, template_body, required_fields, clarification_policy, created_at, updated_at) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '${userHarnessName}', 'feature', 'codex', '{{existing}}', '[]', '{"mode":"ask"}', 1, 1);`,
    )
    await writeFile(filePath, JSON.stringify(envelope), "utf8")

    try {
      const harness = createHarness(filePath, database.db)

      // When: validation builds conflicts from the DB-backed import resolution.
      const result = await harness.service.validateBackupFile()

      // Then: the default warning stays on the default source id and the user conflict stays on the user source id.
      if (result.cancelled) {
        throw new Error("Expected a validation preview")
      }
      expect(result.preview.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "default_harness_template_reused",
            sourceId: DEFAULT_HARNESS_TEMPLATE_IDS.feature,
          }),
        ]),
      )
      expect(result.preview.conflicts).toEqual([
        expect.objectContaining({
          code: "harness_template_name_conflict",
          sourceId: userHarnessId,
          message: `${userHarnessName} already exists and will import as ${userHarnessName} Imported.`,
          resolution: `Create copied harness_template named ${userHarnessName} Imported.`,
        }),
      ])
    } finally {
      database.close()
    }
  })
})
