import type { BackupEnvelope } from "../ipc-types.js"
import { backupExtraPayloadFields } from "./backup-payload-extra-fields.js"
import { backupRowFields } from "./backup-payload-field-utils.js"
import type { SensitivePayloadField } from "./library-payload-fields.js"

export function backupPayloadFields(backup: BackupEnvelope): readonly SensitivePayloadField[] {
  const fields: SensitivePayloadField[] = [
    ...backupRowFields({
      entityType: "backup_envelope",
      values: [
        ["appName", "Backup app name", backup.appName],
        ["backupType", "Backup type", backup.backupType],
        ["exportedByAppVersion", "Backup app version", backup.exportedByAppVersion],
      ],
    }),
    ...backupRowFields({
      entityType: "backup_metadata",
      values: [["sourceSummary", "Backup source summary", backup.metadata.sourceSummary]],
    }),
  ]

  if ("projects" in backup.data) {
    fields.push(
      ...backup.data.projects.flatMap((project) =>
        backupRowFields({
          entityType: "project",
          entityId: project.id,
          values: [
            ["id", "Backup project ID", project.id],
            ["name", "Backup project name", project.name],
            ["description", "Backup project description", project.description],
            ["techStack", "Backup project tech stack", project.techStack],
            ["defaultAgent", "Backup project default agent", project.defaultAgent],
          ],
        }),
      ),
    )
  }
  if ("promptAssets" in backup.data) {
    fields.push(
      ...backup.data.promptAssets.flatMap((asset) =>
        backupRowFields({
          entityType: "prompt_asset",
          entityId: asset.id,
          values: [
            ["id", "Backup prompt asset ID", asset.id],
            ["projectId", "Backup prompt asset project reference", asset.projectId],
            ["title", "Backup prompt asset title", asset.title],
            ["scenario", "Backup prompt asset scenario", asset.scenario],
            ["targetAgent", "Backup prompt asset target agent", asset.targetAgent],
            ["currentVersionId", "Backup asset version", asset.currentVersionId],
            ["parentPromptId", "Backup prompt asset parent prompt reference", asset.parentPromptId],
            ["parentPromptVersionId", "Backup asset parent version", asset.parentPromptVersionId],
            ["derivationType", "Backup prompt asset derivation type", asset.derivationType],
          ],
        }),
      ),
      ...backup.data.promptVersions.flatMap((version) =>
        backupRowFields({
          entityType: "prompt_version",
          entityId: version.id,
          values: [
            ["id", "Backup prompt version ID", version.id],
            ["promptAssetId", "Backup prompt version asset reference", version.promptAssetId],
            ["originalInput", "Backup prompt version original input", version.originalInput],
            ["compiledPrompt", "Backup prompt version compiled prompt", version.compiledPrompt],
            ["assumptions", "Backup prompt version assumptions", version.assumptions],
            ["questions", "Backup prompt version questions", version.questions],
            ["answers", "Backup prompt version answers", version.answers],
            ["acceptanceCriteria", "Backup version acceptance", version.acceptanceCriteria],
            ["validationCommands", "Backup version validation", version.validationCommands],
          ],
        }),
      ),
      ...backup.data.tags.flatMap((tag) =>
        backupRowFields({
          entityType: "tag",
          entityId: tag.id,
          values: [
            ["id", "Backup tag ID", tag.id],
            ["name", "Backup tag name", tag.name],
          ],
        }),
      ),
      ...backup.data.promptTags.flatMap((link) =>
        backupRowFields({
          entityType: "prompt_tag_link",
          entityId: `${link.promptAssetId}:${link.tagId}`,
          values: [
            ["promptAssetId", "Backup prompt tag prompt reference", link.promptAssetId],
            ["tagId", "Backup prompt tag tag reference", link.tagId],
          ],
        }),
      ),
    )
  }
  if ("harnessTemplates" in backup.data) {
    fields.push(
      ...backup.data.harnessTemplates.flatMap((template) =>
        backupRowFields({
          entityType: "harness_template",
          entityId: template.id,
          values: [
            ["id", "Backup harness template ID", template.id],
            ["name", "Backup harness template name", template.name],
            ["scenario", "Backup harness template scenario", template.scenario],
            ["targetAgent", "Backup harness template target agent", template.targetAgent],
            ["templateBody", "Backup harness template body", template.templateBody],
            ["requiredFields", "Backup harness template required fields", template.requiredFields],
            ["clarificationPolicy", "Backup harness policy", template.clarificationPolicy],
          ],
        }),
      ),
    )
  }
  return [...fields, ...backupExtraPayloadFields(backup)]
}
