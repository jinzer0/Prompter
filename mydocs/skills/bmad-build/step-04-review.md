{% if workflow.route != "oneshot" %}
{% if workflow.review == "auto" %}
{% set review = "thorough" %}
{% else %}
{% set review = workflow.review %}
{% endif %}
# Step 4: Review

## RULES

- All review subagents must run at the same model capability as the current session.
- Run subagents synchronously: launch them together, then wait for all results before continuing.
- Review, replan, repair, verification and evidence within clear LOW/MEDIUM Scope are autonomous. HIGH/material Scope actions need explicit recorded action approval, reused when sufficient; hold only unapproved/denied actions or core intent gaps and continue independent safe work. Frozen intent stays human-owned. Agent-context filenames alone do not require deferral when their actual change is explicitly approved and within Scope.

## INSTRUCTIONS

Before changing status, read existing state and persistent `review_loop_iteration` (missing only = 0). Preserve first blocked cause, frozen intent, baseline, ticket/dependencies and evidence. Blocked/dropped or already `>5` counted failed loops HALT with their reason and unverified evidence before further implementation/loopback; no status/reset/plan-deletion bypass. Interrupted/draft/in-progress/in-review/failed resume remains cumulative. Normally completed, separately requested fresh follow-up is distinct, not authority to restart the same failed loop. Otherwise change status to `in-review`.

{% if workflow.review == "none" %}
Write `review: 'none'`, `review_source: 'pinned'`, and `lenses_ran: []` to `{plan_file}` frontmatter.
{% elif workflow.review == "auto" %}
Write `review: 'thorough'` and `review_source: 'auto'` to `{plan_file}` frontmatter.
{% else %}
Write `review: '{{ workflow.review }}'` and `review_source: 'pinned'` to `{plan_file}` frontmatter.
{% endif %}
{% if review != "none" %}

### Stage the Diff

Read `{baseline_revision}`, step-03 target before-content and ownership evidence from Implementation Notes. Rewrite `{diff_file}` (or a unique system temp file) with only this run's own scoped changes, including own new files but never unrelated untracked installation or pre-existing user content in patched untracked files. Missing/NO_VCS baseline requires before-content/ownership evidence, not a broader diff. Unseparable overlap blocks. Every initial/patch/rederive rewrite and revert uses this same boundary. Lenses read the file; never paste its diff into prompts.

Set `{claims_file}` = `{plan_file}`. The plan is the change's own account of itself. It goes to the edge-case lens as a path, read only after its own tracing, and to the Quick lens for its acceptance criteria; no other lens sees it.

Writing `{diff_file}` is the only change this section makes. Do NOT `git add` anything.

Retain original target before-content on resume. Detect intervening user edits before every rewrite/revert and preserve them; never restore a whole file over another owner's edits. If separation is uncertain, block that actual overlap. Verification finding severity (`high`/`medium`/`low`) is not the action risk classification or approval authority.

### Review

Runtime placeholders: `{diff_file}` is the diff staged above, `{claims_file}` the narrative staged with it, and `{plan_file}` the plan — all paths, substituted absolute so a lens can read them; a launch prompt never carries diff text. `{verbatim_intent}` is the `## Intent` section of `{plan_file}` (inside `<frozen-after-approval>`), substituted inline as text. Before launching a lens, expand its skill-root placeholder to this skill's absolute installed directory; never leave that placeholder unresolved in a child prompt.

Announce skipped lenses first, then launch every active lens before handling any lens's result. Try running all active lenses simultaneously: substitute the runtime placeholders (e.g. `{diff_file}`) into each lens's instruction. When an instruction launches a reviewer subagent, launch that child with the prompt text after placeholder substitution; do not load the reviewer instruction file yourself. For any other customized instruction, execute it as written. Parallel means several blocking calls awaited together in this turn — never backgrounded or detached, never ending the turn to await results. When running lenses as subagents, spawn every reviewer before reading or reacting to any of their output; begin collection and triage only once all are launched.

{% if review == "quick" %}
{{ workflow.quick_lenses }}
{% else %}
{{ workflow.thorough_lenses }}
{% endif %}

If a lens's instruction requires subagents and none are available, for each such lens write beside `{plan_file}`, named after it with the lens id appended, that lens's child prompt with every file it points to — the diff, the claims, the reviewer instruction file — replaced inline by that file's contents, and every other line left exactly as written. That session shares no filesystem with this one, so its prompt has to stand alone; this is the only place you read a reviewer instruction file yourself. Then HALT. Ask the human to run each in a separate session (ideally a different LLM) and paste back the findings.

Write `lenses_ran` — the ids launched, in launch order — to `{plan_file}` frontmatter.

### Classify

1. Once every lens has reported — and not before — render a verdict on each finding, ahead of any deduplication or grouping. Disregard any severity a reviewing subagent assigned — they lack the context to grade.

   If `## Review Triage Log` already has rows — a loopback or a resumed review — check each finding against them first. Same location and same claim as a logged row, and the code there still reads as the row describes: keep the row's verdict and route, write the row again with `carried` in front of the evidence, skip verification, and never patch or defer it again. Verify everything else as below.

   For each finding:
   - A gap finding from the verification-gap lens arrives pre-verified — that lens's evidence rules made it read the tests and run the searches it cites, and triage trusts the claim as filed. Skip verification, render the verdict from the filed evidence, and weigh its filed disposition when routing. Its `Other findings` are verified like everything else.
   - **Verify the finding's claim.** At the cited file and line, does the bad outcome the reviewer describes actually occur? Read beyond the changed lines — follow callers, guards upstream, etc — until you can answer yes or no. A different finding about nearby code does not settle this one. Judge whether the problem is real, not whether the proposed fix is plausible. Code that loudly fails on a situation you never showed the program can reach is correct behavior, not a defect.
   - **Render exactly one verdict** from what verification established — the verdict is the whole triage decision; there is no separate keep-or-dismiss.
     - `high` (intolerable), `medium` (tolerable), `low` (cosmetic or negligible) — the bad outcome is real. Assign severity by how much it hurts end users or developers. For developer-only problems (inconsistent design, eroded invariants, duplicated sources of truth), name where it will cause trouble — which caller will diverge, which rule will break. A vague "this is messy" with no named harm is not a severity grade; use `false` or `maybe-false` instead. When the harm is real but you cannot tell how bad, pick the higher grade.
     - `false` — you checked, and the bad outcome does not happen at the cited location. Write what disproves this specific claim. A true fact about nearby code that does not disprove the claim does not count.
     - `maybe-false` — you could not tell whether the bad outcome happens. Write what you would need to check to find out. Use this only when the diff and surrounding code leave the question open; when they are enough to decide, pick `high`, `medium`, `low`, or `false`.

   - Every finding gets one row in the `## Review Triage Log` section of `{plan_file}` — verdict plus its evidence in a sentence or two; never drop, merge, or silently skip one.

   Reject `false` findings on their refutation.

   Reject `low` findings when it is unlikely that users or developers would meet the defect in everyday use (judged plainly — no proof needed) and the fix is more than a direct correction or deletion — adding guards, branches, parameters, or other complexity.

   Out of scope: reject or defer a finding as out of scope only when the intent itself excludes it — not because the plan's scope section or the shape of the diff says so. If only those would exclude it, keep the finding: the plan drew the line somewhere the intent did not, so it routes to intent_gap or bad_plan, never to patch or defer.

   Reject any finding whose fix is to edit this build's plan.

   All remaining findings continue to grouping.

2. Group the survivors by shared root cause — two findings belong in one entry only when the same defect produced both. Same location alone is not a shared root cause, and neither is a shared fix. An entry carries every member's verified bad outcome and the highest verdict among them (`high` > `medium` > `low` > `maybe-false`).
3. Route each entry into exactly one triage category. A group that includes verified `high`, `medium`, or `low` members routes by its highest such verdict — not to defer just because a member is `maybe-false`. The first three are **this change's problem** — caused or exposed by the current change. The last is **not this change's problem**.
   - **intent_gap** — caused by the change; cannot be resolved from the plan because the captured intent is incomplete. Do not infer intent unless there is exactly one possible reading.
   - **bad_plan** — caused by the change, including direct deviations from the plan. The plan should have been clear enough to prevent it. When in doubt between bad_plan and patch, prefer bad_plan — a plan-level fix is more likely to produce coherent code.
   - **patch** — caused by the change; its smallest fix is trivial, adds no public surface, and guards no state you did not demonstrate. Just part of the diff. A finding whose smallest fix fails any of those conditions routes to intent_gap when the plan does not settle that fix, otherwise to bad_plan.
   - **defer** — pre-existing issue not caused by this change; or an entry whose members are all `maybe-false` and the claim, if true, would be `medium` or `high` — record that severity marked unverified, plus what would settle it (if it would only be `low`, reject it with the same note). Agent-context filenames (CLAUDE.md, AGENTS.md, rules, etc.) alone do not imply defer: route explicitly approved Scope changes normally; hold actual HIGH/material Scope decisions lacking approval.

4. Process entries in cascading order. If intent_gap or bad_plan entries exist, they trigger a loopback — lower entries are moot since code will be re-derived. If neither exists, process patch and defer normally. Before each existing counted intent_gap/bad_plan loopback, read persistent `{plan_file}` frontmatter `review_loop_iteration` (missing only means `0`), increment by 1, and write it back, then test `>5`. 4→5 allows the existing loopback; 5→6 blocks before any additional implementation, revert or loopback. When exceeded, retain counter, set `status: blocked`, preserve the first blocked cause (record non-convergence if absent), append finding/route/triage and required unverified checks/evidence, then HALT and escalate. Never finalize built/done or restart through reset/deletion/status changes.
   - **intent_gap** — Root cause is inside `<frozen-after-approval>`. Revert only this run's owned code changes using captured target before-content, preserving user edits and evidence. Ask only the unresolved core intent decision; do not guess or rewrite frozen intent. Once the human renegotiates it, retain cumulative counter and read fully and follow `{{ rendered("step-02-plan.md") }}` to re-run steps 2–4.
   - **bad_plan** — Root cause is outside `<frozen-after-approval>`. Extract KEEP instructions before reverting only owned code changes to target before-content; preserve user work, frozen intent, evidence and cumulative counter. Respect all `## Plan Change Log` constraints while autonomously amending non-frozen sections within approved Scope. HIGH/material Scope changes require that specific approval, not routine replan consent. Append triggering finding, amendment, known-bad state avoided and KEEP instructions. Read fully and follow `{{ rendered("step-03-implement.md") }}` to re-derive code, then review again using the same owned-diff boundary.
   - **patch** — Auto-fix. These are the only findings that survive loopbacks. Re-engage the step-03 implementation subagent — the same one, addressed by the name or id its launch returned; a fresh launch is not re-engagement. Send it one message, exactly this, with the findings filled in:

     ```text
     Review of your implementation found problems. Fix each one below with the smallest change that does the job.

     Run only the tests that cover the files you edit — nothing wider. Full verification runs on my side after you return. Reply with what you changed.

     - <file> — <what is wrong> — <what the smallest fix must do>
     ```

     If it cannot be continued, apply the patches yourself. Preserve target before-content/user ownership and require specific HIGH/material Scope authority before affected fixes. Re-run plan Verification checks; autonomously repair within Scope, but if required verification cannot pass/run, record cause and unverified evidence and HALT blocked. Rewrite and read `{diff_file}` with only owned scoped changes, never broadening to repo-wide/untracked user content.
   - **defer** — Append one new entry to `{{ config.output_folder }}/{active_initiative}/deferred-work.md` using this format. Do not modify existing entries or look for duplicates.
     ```markdown
     - source_plan: `{plan_file}`
       summary: <one sentence>
       evidence: <why this is real; for a maybe-false finding, what evidence would settle it>
     ```
{% endif %}

## NEXT

Read fully and follow `{{ rendered("step-05-present.md") }}`
{% endif %}
