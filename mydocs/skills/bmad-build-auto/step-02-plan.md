# Step 2: Plan

## RULES

- No routine human interaction for clear LOW/MEDIUM Scope. HIGH/material Scope decisions require recorded explicit approval: if missing/denied, block that action and retain independent safe work. Auto mode never infers consent.

## INSTRUCTIONS

1. Reuse an existing sufficient plan rather than regenerate it. Draft resume check: if `{plan_file}` exists with `status: draft`, capture its verbatim `<intent-contract>...</intent-contract>` as `preserved_intent_contract`. Otherwise this is empty. Preserve existing baseline, `review_loop_iteration`, status/first blocked reason, ticket, logs and Evidence on every replan/resume; missing counter alone means 0. Never reset the same failed loop.
2. Investigate codebase. _Read the code yourself for narrow, localized tasks. Isolate deep exploration in synchronous subagents: instruct them to give you distilled summaries only, and plan from those summaries._ Decide which findings actually matter for execution — the specific files, symbols/lines, reuse points, and read-only constraints — and carry those forward for the Code Map. This is where the investigation lands: the plan preserves it so it is never re-narrated to the implementer at dispatch time.

   Score `risk` as `low`, `medium`, or `high` from AGENTS impact/reversibility/security/data/external effects, not LOC/file count. For a ticket start from find's risk and only raise it. Record Scope and the reused decision/approval evidence in existing notes; readiness, route and review selection are not HIGH approval.
{% if workflow.route == "oneshot" or workflow.route == "full" %}
3. The route is `{{ workflow.route }}`; `route_source` is `pinned`.
{% else %}
3. {{ workflow.route_selection }}

   `route_source` is `auto`.
{% endif %}
4. Read `{{ rendered("plan-template.md") }}` fully, preserving all frontmatter fields and resolving `date` to the current system date.
   - **Oneshot:** set `route: 'oneshot'`.
   - **Full:** set `route: 'full'`. Put what you learned into `## Code Map`: paths, symbols or lines, what to reuse, and what not to change. The subagent should be able to work from the plan without being told any of it again.

   Set `route_source` from step 3 and `risk` from step 2.

   If `{preserved_intent_contract}` is non-empty, substitute it for the `<intent-contract>` block before writing `{plan_file}`. Self-check against the route's READY FOR DEVELOPMENT standard.
5. If intent gaps exist, do not fantasize and do not leave open questions. Multiple defensible readings of the intent that lead to observably different outcomes, with nothing in the intent to select between them, are an intent gap — do not resolve one by picking a reading. HALT with status `blocked`, blocking condition `intent gap`, and include the unanswered questions and evidence gathered.
6. Warning check. If step-01 carried `multiple-goals`, add it to `{plan_file}` frontmatter `warnings`. If `{plan_file}` exceeds 1600 tokens, add `oversized` to frontmatter `warnings`. Continue either way.

### READY-FOR-DEVELOPMENT GATE

Re-read `{{ rendered("workflow.md") }}`, then re-read `{plan_file}` from disk and verify the plan meets the READY FOR DEVELOPMENT standard.

- **If the file is missing:** HALT with status `blocked` and blocking condition `plan file disappeared before implementation`.
- **If the plan meets the standard:** set `{plan_file}` frontmatter status to `ready-for-dev`. If the invocation prompt directs a halt after planning (standard phrasing: `Halt after planning.` — accept any clear equivalent), HALT with status `ready-for-dev`; otherwise continue to step 3.
- **If the plan does not meet the standard:** repair it once, then re-read it from disk and verify again. If it now meets the standard, apply the **If the plan meets the standard** handling above, including the halt-after-planning check. If it still does not meet the standard, HALT with status `blocked`, blocking condition `plan failed ready-for-development standard`, and include the failing criteria and evidence gathered.

## NEXT

Read fully and follow `{{ rendered("step-03-implement.md") }}`
