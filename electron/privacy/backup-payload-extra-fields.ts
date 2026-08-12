import type { BackupEnvelope } from "../ipc-types.js"
import { backupRowFields } from "./backup-payload-field-utils.js"
import type { SensitivePayloadField } from "./library-payload-fields.js"

export function backupExtraPayloadFields(backup: BackupEnvelope): readonly SensitivePayloadField[] {
  const fields: SensitivePayloadField[] = []
  if ("projectContextProfiles" in backup.data) {
    fields.push(
      ...backup.data.projectContextProfiles.flatMap((profile) =>
        backupRowFields({
          entityType: "project_context",
          entityId: profile.id,
          values: [
            ["id", "Backup project context ID", profile.id],
            ["projectId", "Backup project context project reference", profile.projectId],
            ["name", "Backup project context name", profile.name],
            ["summary", "Backup project context summary", profile.summary],
            ["techStack", "Backup project context tech stack", profile.techStack],
            ["architectureNotes", "Backup context architecture", profile.architectureNotes],
            ["codingConventions", "Backup context conventions", profile.codingConventions],
            ["constraints", "Backup project context constraints", profile.constraints],
            ["forbiddenActions", "Backup context forbidden actions", profile.forbiddenActions],
            ["acceptanceDefaults", "Backup context defaults", profile.acceptanceDefaults],
            ["validationCommands", "Backup context validation", profile.validationCommands],
            ["securityNotes", "Backup project context security notes", profile.securityNotes],
            ["additionalContext", "Backup context additional context", profile.additionalContext],
            ["testingNotes", "Backup project context testing notes", profile.testingNotes],
            ["packageManager", "Backup project context package manager", profile.packageManager],
            ["defaultBranch", "Backup project context default branch", profile.defaultBranch],
            ["repoPath", "Backup project context repository path", profile.repoPath],
          ],
        }),
      ),
    )
  }
  if ("promptTemplates" in backup.data) {
    fields.push(
      ...backup.data.promptTemplates.flatMap((template) =>
        backupRowFields({
          entityType: "prompt_template",
          entityId: template.id,
          values: [
            ["id", "Backup prompt template ID", template.id],
            ["name", "Backup prompt template name", template.name],
            ["description", "Backup prompt template description", template.description],
            ["sourcePromptAssetId", "Backup template asset", template.sourcePromptAssetId],
            ["sourcePromptVersionId", "Backup template version", template.sourcePromptVersionId],
            ["scenario", "Backup prompt template scenario", template.scenario],
            ["targetAgent", "Backup prompt template target agent", template.targetAgent],
            ["templateBody", "Backup prompt template body", template.templateBody],
          ],
        }),
      ),
    )
  }
  if ("promptQualityReviews" in backup.data) {
    fields.push(
      ...backup.data.promptQualityReviews.flatMap((review) =>
        backupRowFields({
          entityType: "prompt_quality_review",
          entityId: review.id,
          values: [
            ["id", "Backup quality review ID", review.id],
            ["promptVersionId", "Backup quality review version reference", review.promptVersionId],
            ["source", "Backup quality review source", review.source],
            ["reviewMode", "Backup quality review mode", review.reviewMode],
            ["grade", "Backup quality review grade", review.grade],
            ["dimensionScores", "Backup quality review dimension scores", review.dimensionScores],
            ["strengths", "Backup quality review strengths", review.strengths],
            ["issues", "Backup quality review issues", review.issues],
            ["suggestions", "Backup quality review suggestions", review.suggestions],
            ["missingSections", "Backup quality review missing sections", review.missingSections],
            ["warnings", "Backup quality review warnings", review.warnings],
            [
              "recommendedClarifyingQuestions",
              "Backup review questions",
              review.recommendedClarifyingQuestions,
            ],
            ["scoreExplanation", "Backup review explanation", review.scoreExplanation],
            ["snapshot", "Backup quality review snapshot", review.snapshot],
            ["improvedPromptDraft", "Backup review prompt", review.improvedPromptDraft],
          ],
        }),
      ),
    )
  }
  return fields
}
