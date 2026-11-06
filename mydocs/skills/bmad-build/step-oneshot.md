{% if workflow.route != "full" %}
{% if workflow.review == "auto" %}
{% set review = "quick" %}
{% else %}
{% set review = workflow.review %}
{% endif %}
# Step One-Shot: Implement, Review, Present

You reach this step from step 2, or from step 1 when resuming a plan whose `route` is `oneshot`. `{plan_file}` already exists.

## RULES

- Do not push to a remote unless the user asks.
- Do not edit anything inside `<frozen-after-approval>` in `{plan_file}`.
- Review subagents must use the same model level as this session.
- Start all review subagents in this turn and wait for all of them to finish. Do not run them in the background or end your turn before they return.
- Clear LOW/MEDIUM Scope implementation/verification/replan/repair/records needs no routine consent. HIGH/material Scope actions require explicit recorded approval of that action/decision, reusing sufficient existing approval. Hold only unapproved/denied actions and core intent gaps; independent safe work continues. Route/review/readiness is not authority. No new counted-loop cap is introduced in oneshot.

## INSTRUCTIONS

### Implement

Verify `{plan_file}` is a non-empty existing path; if missing, HALT without recreating it or implementing. Preserve existing blocked/dropped/exhausted failed-loop reasons before any state transition. Resolve gaps from repository evidence first; only genuine core intent gaps require numbered human choices and HALT. Update frozen intent only for the human's explicit renegotiated decision, not an agent assumption.

Capture `baseline_revision` (current HEAD, or `NO_VCS` if version control is unavailable) into `{plan_file}` frontmatter before making any changes. If `baseline_revision` already holds a value (resumed run), preserve it.

Read plan state before implementation: preserve blocked/dropped reasons and any persistent counted failure counter/evidence from an existing full-route loop. An already `>5` failed loop remains blocked before implementation; interrupted/draft/in-progress/in-review/failed resume never resets it, deletes the plan or changes status to bypass it. Normally completed, separately requested fresh follow-up is distinct from retrying that failed loop. Capture target before-content and dirty/untracked ownership, including existing user installation, and record own touched paths/ownership in Implementation Notes. Honor explicit halt-after-planning without coding.

Retain original target before-content on resume, not this run's already edited state. Detect intervening user edits before diff rewrites/reverts and preserve them; never restore entire files over another owner's changes. Uncertain separation blocks the actual overlap. Finding severity is not action risk or approval authority.

Build the change from `{plan_file}`. The Intent section is what you implement. As you work, add notes to `## Implementation Notes`: decisions you made, files you changed, surprises.

{% if workflow.route == "oneshot" %}
**When to stop.** Stop coding if the request left out something the user would notice in the result. Write the gap in `## Implementation Notes`, then ask the human — do not guess.
{% else %}
**When to stop and replan.** Stop coding if the request left out something the user would notice in the result. Write the gap in `## Implementation Notes`. Then update `{plan_file}`: add back `## Code Map` (filled in from what you learned while implementing) and `## Open Questions` (one question per gap), set `route: 'full'` and `status: 'draft'`. Go back to `{{ rendered("step-02-plan.md") }}` step 6.
{% endif %}

### Verify

Run the plan's Verification commands or manual checks before finalizing, even when review is `none`. Fix/reverify failures within approved Scope without routine consent. Audit any I/O & Edge-Case Matrix against tests actually run and passed; missing/skipped coverage is not evidence. Never change human-owned expectations to match code; hold genuine ambiguity. If required verification/audit cannot pass or run, retain the cause and unverified evidence, mark blocked and HALT, not built. Prepare/read an own-change diff using baseline, target before-content and notes; preserve this ownership boundary on every verification repair, review patch, rederive and revert, including pre-existing user content in untracked files.

### Review

{% if workflow.review == "none" %}
Write `review: 'none'`, `review_source: 'pinned'`, and `lenses_ran: []` to `{plan_file}` frontmatter.
{% elif workflow.review == "auto" %}
Write `review: 'quick'` and `review_source: 'auto'` to `{plan_file}` frontmatter.
{% else %}
Write `review: '{{ workflow.review }}'` and `review_source: 'pinned'` to `{plan_file}` frontmatter.
{% endif %}
{% if review != "none" %}

Read `{baseline_revision}` and target before-content/ownership from Implementation Notes. Write/read a unified diff of only this run's own scoped changes to a unique system temp file; set `{diff_file}` to its absolute path and `{claims_file}` = `{plan_file}`. Include own new files, never unrelated untracked installation or pre-existing user content in patched untracked files. Missing/NO_VCS baseline requires before-content and ownership evidence, not a wider diff. Unseparable overlap blocks the affected work. Do not git add/commit to generate the diff; every patch/rederive/revert retains this boundary.

Runtime placeholders: `{diff_file}`, `{claims_file}`, and `{plan_file}` are paths, substituted absolute so a lens can read them; a launch prompt never carries diff text. `{verbatim_intent}` is the `## Intent` section of `{plan_file}` (inside `<frozen-after-approval>`), substituted inline as text. Before launching a lens, expand its skill-root placeholder to this skill's absolute installed directory; never leave that placeholder unresolved in a child prompt.

Say which review lenses you are skipping, then start every active lens before reading any results. Run them at the same time when you can. Fill in runtime placeholders first. When a lens tells you to launch a reviewer subagent, launch it with that prompt text. Do not read the reviewer's instruction file yourself. For any other customized instruction, do what it says:

{% if review == "thorough" %}
{{ workflow.thorough_lenses }}
{% else %}
{{ workflow.quick_lenses }}
{% endif %}

If a lens needs subagents and you cannot launch them, write the full prompt for each lens beside `{plan_file}`, named after it with the lens id appended (with placeholders filled in, not just file paths). Stop and ask the user to run each prompt in a separate session and paste back the findings.

Write `lenses_ran` — the ids launched, in launch order — to `{plan_file}` frontmatter.

### Classify

Wait until every review lens has reported. Then judge each finding. Ignore severity labels from reviewers — you decide.

For each finding:

- **Check the claim.** Go to the cited file and line. Does the problem the reviewer describes actually happen? Read surrounding code and callers until you can say yes or no. A nearby issue does not answer this one. Judge whether the bug is real, not whether the suggested fix sounds good. Code that fails loudly on a state you have not shown the program can reach is correct, not a bug.

- **Pick one verdict:**
  - `high` (intolerable), `medium` (tolerable), or `low` (cosmetic or negligible) — the problem is real. Rate it by harm to users or developers. For developer-only issues, say where it will hurt. Vague complaints like "this is messy" are not `high`/`medium`/`low` — use `false` or `maybe-false`. When unsure how bad, pick the higher grade.
  - `false` — you checked and the problem does not happen. Say what you found that disproves it.
  - `maybe-false` — you could not tell. Say what you would need to check. Use this only when the code and diff are not enough to decide.

- Write down every finding with its verdict and evidence. Do not drop any.

Reject `false` findings.

Reject `low` findings when users or developers would rarely hit the problem in normal use and the fix would add more than a simple correction or deletion.

Group what remains by root cause — two findings go together only if the same bug caused both. Same file or same fix is not enough. For each group, keep the worst verdict (`high` > `medium` > `low` > `maybe-false`). If a group has verified `high`, `medium`, or `low` members, route by the worst of those — not `defer` just because one member is `maybe-false`.

For each group:

- **patch** — This change caused or exposed the problem. The smallest fix is simple, adds no new public API, and does not guard code paths you did not show are reachable. Fix it now.
- **repair/replan** — Same as patch, but the smallest fix needs more work. Repair or supplement non-frozen plan sections autonomously within approved Scope, preserving frozen intent, evidence and counter. Hold genuine core gaps or unapproved HIGH/material Scope actions for that specific decision; complexity alone is not a consent gate. Reverify required checks and regenerate/read only the owned diff after all patches/repairs; unresolved required failures HALT blocked with cause/unverified evidence. Do not invent a new counted loop/cap here or reset an inherited counter.
- **defer** — Everything else: old bugs not caused by this change, ideas for later, groups where every member is `maybe-false` and would be `medium` or `high` if true (record that severity marked unverified, and what would prove it; if it would only be `low`, reject it). CLAUDE.md, AGENTS.md, rules, or specs filenames alone do not defer explicitly approved Scope changes; require approval only for actual HIGH/material Scope decisions. Add one entry to `{{ config.output_folder }}/{active_initiative}/deferred-work.md`:

  ```markdown
  - source_plan: `{plan_file}`
    summary: <one sentence>
    evidence: <why this is real; for maybe-false, what would prove it>
  ```

  Do not edit old entries or check for duplicates.
{% endif %}

### Finalize Plan

Update `{plan_file}`:

1. Record actual results, changed paths, verification outcomes/limitations and residual risks in existing Implementation Notes, independently of commit/publication authority. Set `status: 'built'` only if required verification and records are complete and no unresolved core gap, unapproved required HIGH action, or actual blocker remains; otherwise retain blocked reason and unverified evidence, not false success.
2. If review found anything, append to `## Review Triage Log` without deleting prior rows, with one line per finding: verdict, route, action and evidence. For `false`, the disproof. For `maybe-false`, what would settle it. For rejected `low`, why it was not worth fixing.

### Commit

Check existing local commit permission separately; LOW/MEDIUM/autonomy/status does not grant it. Without permission leave own changes uncommitted and record that limitation without withholding results. With permission commit only authorized own reviewed changes, never user content/unrelated installation or repo-wide git add. Preserve existing user/run commits. If an explicitly required authorized commit fails, HALT blocked with the actual cause. No global clean-tree requirement; unrelated dirty/untracked user work remains unchanged. Remote publication, PR/Merge/Release permissions are unchanged.

### Present

{{ workflow.open_plan }}

Give the user a short summary — one or two sentences:

- What changed.
- Review result, including anything deferred.
- Verification performed and any unverified limitations; uncommitted work when permission is absent.
- Commit hash, if you made one.

Do not list files, repeat the plan, or walk through what you did unless asked.

Offer next steps in one line: create a PR (push first if needed) when git and a remote exist; use `bmad-walkthrough`; or make another change.

HALT as normal terminal completion, without requesting routine completion consent. Unverified/unapproved/blocked work must not be reported successful.

Workflow complete.

## On Complete

If anything appears below, do it before exiting. Otherwise exit.

{{ workflow.on_complete }}
{% endif %}
