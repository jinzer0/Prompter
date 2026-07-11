import type { CreateHarnessTemplateInput } from "../ipc-types.js"

export const DEFAULT_HARNESS_TEMPLATE_IDS = {
  feature: "12000000-0000-4000-8000-000000000001",
  bugfix: "12000000-0000-4000-8000-000000000002",
  refactor: "12000000-0000-4000-8000-000000000003",
  codeReview: "12000000-0000-4000-8000-000000000004",
  docs: "12000000-0000-4000-8000-000000000005",
  research: "12000000-0000-4000-8000-000000000006",
} as const

export type DefaultHarnessTemplate = CreateHarnessTemplateInput & {
  readonly id: string
}

export const DEFAULT_HARNESS_TEMPLATES = [
  {
    id: DEFAULT_HARNESS_TEMPLATE_IDS.feature,
    name: "Feature Implementation",
    scenario: "feature",
    targetAgent: "generic_agent",
    templateBody: `# Feature Implementation

Title: {{title}}
Scenario: {{scenario}}
Target agent: {{targetAgent}}

## Context
{{projectContext}}

## Request
{{originalInput}}

## Constraints
{{constraints}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Validation
{{validationCommands}}`,
    requiredFields: JSON.stringify(["title", "originalInput"]),
    clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
  },
  {
    id: DEFAULT_HARNESS_TEMPLATE_IDS.bugfix,
    name: "Bug Fix",
    scenario: "bugfix",
    targetAgent: "generic_agent",
    templateBody: `# Bug Fix

Title: {{title}}
Scenario: {{scenario}}
Target agent: {{targetAgent}}

## Bug Report
{{originalInput}}

## Project Context
{{projectContext}}

## Constraints
{{constraints}}

## Validation
{{validationCommands}}

## Notes
{{additionalNotes}}`,
    requiredFields: JSON.stringify(["originalInput"]),
    clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
  },
  {
    id: DEFAULT_HARNESS_TEMPLATE_IDS.refactor,
    name: "Refactor",
    scenario: "refactor",
    targetAgent: "generic_agent",
    templateBody: `# Refactor

Title: {{title}}
Target agent: {{targetAgent}}

## Current State
{{originalInput}}

## Technical Stack
{{techStack}}

## Constraints
{{constraints}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Validation
{{validationCommands}}`,
    requiredFields: JSON.stringify(["originalInput", "constraints"]),
    clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
  },
  {
    id: DEFAULT_HARNESS_TEMPLATE_IDS.codeReview,
    name: "Code Review",
    scenario: "code_review",
    targetAgent: "generic_agent",
    templateBody: `# Code Review

Title: {{title}}
Scenario: {{scenario}}

## Review Target
{{originalInput}}

## Project Context
{{projectContext}}

## Review Constraints
{{constraints}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Additional Notes
{{additionalNotes}}`,
    requiredFields: JSON.stringify(["originalInput"]),
    clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
  },
  {
    id: DEFAULT_HARNESS_TEMPLATE_IDS.docs,
    name: "Documentation",
    scenario: "docs",
    targetAgent: "generic_agent",
    templateBody: `# Documentation

Title: {{title}}
Target agent: {{targetAgent}}

## Documentation Request
{{originalInput}}

## Context
{{projectContext}}

## Audience And Constraints
{{constraints}}

## Acceptance Criteria
{{acceptanceCriteria}}

## Notes
{{additionalNotes}}`,
    requiredFields: JSON.stringify(["title", "originalInput"]),
    clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
  },
  {
    id: DEFAULT_HARNESS_TEMPLATE_IDS.research,
    name: "Research / Planning",
    scenario: "research",
    targetAgent: "generic_agent",
    templateBody: `# Research / Planning

Title: {{title}}
Scenario: {{scenario}}

## Research Goal
{{originalInput}}

## Project Context
{{projectContext}}

## Tech Stack
{{techStack}}

## Constraints
{{constraints}}

## Expected Output
{{acceptanceCriteria}}`,
    requiredFields: JSON.stringify(["originalInput"]),
    clarificationPolicy: JSON.stringify({ mode: "ask_when_missing" }),
  },
] as const satisfies readonly DefaultHarnessTemplate[]
