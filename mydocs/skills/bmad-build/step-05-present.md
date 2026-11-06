{% if workflow.route != "oneshot" %}
---
---

# Step 5: Present

## RULES

- NEVER auto-push.
- Result/Evidence records and terminal reporting are nonblocking and separate from local commit/remote publication authority. Preserve user work and actual failed/unverified/approval-blocked status; completion is not action approval.

## INSTRUCTIONS

### Mark Plan Built

Record actual results, changed paths, verification/review outcomes, residual risks and unverified limitations in the existing plan/evidence first. Preserve baseline, frozen intent, ticket/dependencies, cumulative counter, first blocked cause and append-only logs. Set `built` only when required verification and records are complete and no unresolved core gap, unapproved required HIGH action, exhausted counted loop or actual blocker remains. Otherwise retain/set blocked with cause/triage/unverified evidence and HALT without false success.

### Commit and Complete

Check existing local commit permission separately: LOW/MEDIUM/autonomy/readiness/built does not grant it. Without permission leave own changes uncommitted and record that limitation, not withheld results or a fake commit. With permission commit only authorized own reviewed changes identified by baseline, target before-content and Implementation Notes, never pre-existing user content/unrelated installation or repo-wide git add. Preserve user/run commits. An explicitly required authorized commit failure HALTs blocked with its actual cause. Remote publication, PR/Merge/Release authority is unchanged. Do not require globally clean termination; unrelated dirty/untracked user work stays unchanged while actual ownership/permission/metadata conflicts block affected required operations.

{{ workflow.open_plan }}

### Display Summary

Display a very short completion summary — one or two sentences — including:

- What changed.
- The verification and review result, including whether anything was deferred.
- Any unverified or uncommitted limitations, without presenting blocked work as successful.
- The commit hash, if one was created.

Do not list changed files, repeat details from the plan, or narrate the process unless the user asks.

Offer applicable next actions in one short line: when version control and a remote are available, create a pull request (and push first if needed); use `bmad-walkthrough`; or make another change.

Workflow complete. HALT as normal terminal completion; no routine result/Stage consent wait.

## On Complete

If anything appears below, follow it as the final terminal instruction before exiting; otherwise exit normally.

{{ workflow.on_complete }}
{% endif %}
