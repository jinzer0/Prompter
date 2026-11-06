# Step 2: Plan

## RULES

- No general intermediate plan approvals; specific HIGH action authority remains required.
- Token budgets on every route are advisory: above 1600 tokens record a context-rot warning and preserve intent/Evidence, never wait for token-budget consent or change Scope just to satisfy a count.
- Apply `AGENTS.md` common risk policy: clear LOW/MEDIUM Scope proceeds autonomously, HIGH requires explicit approval of the particular decision/action, not blanket plan consent. Reuse sufficient existing decisions/approval. Checkpoints are records, not consent. Preserve explicit halt-after-planning and actual ambiguity/safety halts.
- Every update to an existing plan preserves ticket identity, dependencies, baseline revision, frozen intent, status history, evidence/logs, and persistent `review_loop_iteration`. Never reset the counter on failed/interrupted resume or replan (missing only = 0), delete the plan to evade the existing `>5` cap, or disguise blocked work as fresh/built work. A separately requested fresh follow-up after normal completion is different from retrying the same failed loop.
- **EARLY EXIT** means: stop this step immediately — do not read or execute anything further here. Read and fully follow the target file instead. Return here ONLY if a later step explicitly says to loop back.

## INSTRUCTIONS

1. Existing-plan check. If `{plan_file}` exists, read it and capture the verbatim `<frozen-after-approval>...</frozen-after-approval>` block as `preserved_intent`, plus operational frontmatter and evidence/logs. Preserve blocked/dropped state and reason and HALT; an already exceeded counter cannot be bypassed by status changes. Otherwise `preserved_intent` is empty. Read any supplied sufficient plan/decisions as reusable context; do not generate a duplicate plan. Return to step 1's minimal branch if investigation confirms small independent LOW work with no active failure loop or plan/dependency requirement.
2. Investigate the codebase. When you can, send deep searches to subagents and wait for them in this turn. Tell them to return short summaries only, so this session does not fill up with their notes. Keep only what the work needs: the specific files, symbols or lines, what to reuse, and what not to change. Write that into the Code Map. Do not retell the investigation when implementation starts — the plan already has it.

   Do not ask the human during investigation. When something is unclear, look in the repository, planning artifacts, or history first. Keep looking until you know, or until those sources have nothing more to say. Leave any remaining choice for the next step.

   Then score the change's `risk` for `{plan_file}` frontmatter: `low`, `medium`, or `high`, by impact, reversibility, security, data, and external effects, not file/LOC count, route, review level, or Stage completion. For a ticket from the tree, start from `risk` in `tickets.py find`'s output and raise it when the investigation shows more; go below it only when the user says so. Write `risk` wherever this step writes `{plan_file}`.

   Before any oneshot/full implementation dispatch, settle genuine intent gaps using repository evidence first, then ask only the unresolved human-owned choice. For HIGH, identify the particular action/decision, Scope, and approval evidence. Reuse explicit sufficient approval; otherwise hold that action and request its approval immediately before execution. Refusal/silence/route/status/review depth is not approval; independent safe work may continue, but never retry an exhausted failure loop. If the user explicitly requested halt-after-planning, finish the applicable plan, mark it ready only when coherent, report readiness separately from pending HIGH authority, and stop without implementation.
{% if workflow.route == "oneshot" %}
3. Reuse and supplement a sufficient existing plan; otherwise read `{{ rendered("plan-template.md") }}` fully and write `{plan_file}`. Retain existing frontmatter/evidence rather than filling template defaults over it.
   Set `route: 'oneshot'`, `route_source: 'pinned'`, and `status: 'in-progress'`, resolving a new plan's `date` to the current system date.
   If `preserved_intent` is non-empty, use it as the frozen block.
   If explicitly asked to halt after planning, use `ready-for-dev` instead of `in-progress` only after readiness/intent gaps are settled, report the plan and any pending HIGH authority, and HALT without dispatch. If not ready, retain `draft` and resolve only genuine questions. Existing plans retain their creation date, baseline, ticket, counter, and evidence.
   **EARLY EXIT** → `{{ rendered("step-oneshot.md") }}`.
{% elif workflow.route == "full" %}
3. Set `route: 'full'` and `route_source: 'pinned'`, then continue.
{% else %}
3. {{ workflow.route_selection }}

   For oneshot: reuse and supplement a sufficient existing plan; otherwise read `{{ rendered("plan-template.md") }}` fully and write `{plan_file}`. Retain existing frontmatter/evidence rather than filling template defaults over it.
   Set `route: 'oneshot'`, `route_source: 'auto'`, and `status: 'in-progress'`, resolving a new plan's `date` to the current system date.
   If `preserved_intent` is non-empty, use it as the frozen block.
   If explicitly asked to halt after planning, use `ready-for-dev` instead of `in-progress` only after readiness/intent gaps are settled, report the plan and any pending HIGH authority, and HALT without dispatch. If not ready, retain `draft` and resolve only genuine questions. Existing plans retain their creation date, baseline, ticket, counter, and evidence.
   **EARLY EXIT** → `{{ rendered("step-oneshot.md") }}`.

   For full, set `route: 'full'` and `route_source: 'auto'`, then continue.
{% endif %}
{% if workflow.route != "oneshot" %}
4. Reuse a sufficient existing plan and supplement only known gaps within Scope. Otherwise read `{{ rendered("plan-template.md") }}` fully and fill it out from intent/investigation, resolving a new plan's `date` to the current system date. Put investigation into `## Code Map`: paths, symbols or lines, reuse, and what not to change. Implementation should work from that evidence without repeating the investigation. If there are intent gaps, add `## Open Questions` with the choice, options, and implications; never assume an answer in frozen intent. If `preserved_intent` is non-empty, retain it verbatim unless the human explicitly renegotiated intent. Retain existing operational frontmatter and append-only logs/evidence; only genuinely new work initializes template fields. Write/update `{plan_file}` without duplicating a sufficient supplied plan.
5. Self-review against READY FOR DEVELOPMENT standard. For anything important that's missing: if the repository can tell you, go look and fix the plan; if a human has to decide, add an `## Open Questions` entry. Do not invent the answer.
6. Resolve genuine intent gaps before the checkpoint.
   - **Token count** (see SCOPE STANDARD). Above 1600 tokens, report the count and an advisory context-rot warning. Compress repetition while preserving intent/evidence or propose a dependency-aware split, but do not wait for a token-budget choice, change Scope, or generate deferred-work artifacts merely to meet a budget.
   - **Open Questions.** Present every entry as a numbered question with its options and what each option means, and HALT for the human's answers. Write each answer into the `<frozen-after-approval>` block as a decision and delete the entry. An answer may expose a new intent gap — add it and ask again. When the last entry is gone, delete the section.

### CHECKPOINT 1

Only when Open Questions is empty.

Present summary, with the plan's `risk` and the reason for it. Display the plan file path in whatever form is clickable where you are presenting it (e.g. code citation in chat, CWD-relative path with no leading `/` in terminal). If unsure, use CWD-relative path.

If token count exceeded 1600, include the count and advisory warning without waiting for consent.

After presenting the summary, display this note:

---

The plan is a readiness/evidence record, not blanket action approval. Existing sufficient decisions are reused; optional `bmad-advanced-elicitation` or `bmad-party-mode` does not block clear Scope execution.

---

Before transition, re-read `{plan_file}` from disk. If missing, HALT without recreating it, changing status, or proceeding. If changed externally, preserve those edits and recheck readiness/Scope; unresolved ownership or intent conflicts halt only the affected work. Set `ready-for-dev` only when the readiness standard and Open Questions are satisfied; preserve counter, baseline, ticket, and evidence. Everything inside `<frozen-after-approval>` is then locked and only the human can renegotiate it; readiness is not HIGH consent.

For clear LOW/MEDIUM within requested Scope, continue directly to NEXT without plan/ready/Stage consent. For HIGH, reuse explicit approval for the same action/decision and Scope; otherwise hold the unapproved/refused action, record the reason, and ask only for that decision before executing it. Continue independent safe work when possible. If explicitly instructed to halt after planning, report `ready-for-dev` and any pending authority, then HALT without implementing. A requested plan review is work to perform, not a general approval gate.

## NEXT

Read fully and follow `{{ rendered("step-03-implement.md") }}`
{% endif %}
