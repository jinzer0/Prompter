import type { ProjectContextCompilerBuildResult, ProjectContextProfile } from "../ipc-contract.js"

type ProjectContextSection = {
  readonly heading: string
  readonly value: string | null
}

function nonEmptySection(section: ProjectContextSection): boolean {
  return section.value !== null && section.value.trim().length > 0
}

function appendSection(lines: string[], section: ProjectContextSection): void {
  if (section.value === null) {
    return
  }

  lines.push(section.heading, "", section.value, "")
}

function profileSections(profile: ProjectContextProfile): readonly ProjectContextSection[] {
  return [
    { heading: "### Summary", value: profile.summary },
    { heading: "### Tech Stack", value: profile.techStack },
    { heading: "### Architecture Notes", value: profile.architectureNotes },
    { heading: "### Coding Conventions", value: profile.codingConventions },
    { heading: "### Constraints", value: profile.constraints },
    { heading: "### Forbidden Actions", value: profile.forbiddenActions },
    { heading: "### Acceptance Defaults", value: profile.acceptanceDefaults },
    { heading: "### Validation Commands", value: profile.validationCommands },
    { heading: "### Security Notes", value: profile.securityNotes },
    { heading: "### Testing Notes", value: profile.testingNotes },
    { heading: "### Additional Context", value: profile.additionalContext },
    { heading: "### Package Manager", value: profile.packageManager },
    { heading: "### Default Branch", value: profile.defaultBranch },
    { heading: "### Repository Path", value: profile.repoPath },
  ]
}

export function buildProjectContextForCompiler(
  profile: ProjectContextProfile,
): ProjectContextCompilerBuildResult {
  const sections = profileSections(profile).filter(nonEmptySection)
  const sectionNames = ["## Project Context Profile", ...sections.map((section) => section.heading)]
  const lines = ["## Project Context Profile", "", `Profile: ${profile.name}`, ""]

  for (const section of sections) {
    appendSection(lines, section)
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    context: lines.join("\n").trimEnd(),
    sectionNames,
    warnings: [],
  }
}
