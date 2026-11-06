---
plan_file: '' # set at runtime once a route resolves it; some HALT branches exit before it is set
ticket_args: '' # set at runtime to the arguments `tickets.py find` resolved the ticket with (its folder, when one was passed, then the ref); HALT passes them to `mark`
followup_pass: '' # set at runtime when a `built` or `done` plan is re-dispatched for a follow-up review pass; empty on a first pass
---

# Step 1: Clarify and Route

## RULES

- Treat the invocation intent and sufficient existing plan as input; reuse the plan and approval records rather than forcing step-02 plan generation. Load AGENTS common risk/Scope policy first.
- Before any HIGH/material Scope action or resume dispatch, require explicit recorded approval; reuse existing approval for the same decision. Missing/denied approval holds that action only, with independent safe work allowed. `ready-for-dev`, route and auto mode never substitute for HIGH consent.
- Every resume preserves baseline, frozen intent, ticket identity/prerequisites/dependencies, status/first blocked reason, logs/Evidence and persistent `review_loop_iteration`. Failed/interrupted/draft/in-progress/in-review resume never resets the same loop's counter. Missing counter alone means 0; an already >5 failed loop stays blocked rather than becoming a fresh follow-up through status changes or plan deletion.
- **EARLY EXIT** means: stop this step immediately, then read and follow the target file. Return here only if a later step explicitly says to loop back.

## Intent check (do this first)

Use the invocation prompt as the intent.

The invocation prompt names a ticket from the tree when it calls a reference a ticket (such as `ticket 1.2`, a ticket file's name, or a ticket's title), or points to a file whose frontmatter `type` is `story`, `spike`, or `bug`, whatever its `status`. A ref or title it does not present as a ticket is not one. Resolve a named ticket's plan, entry, and prerequisites with `uv run {project-root}/_bmad/method/scripts/tickets.py --project-root {project-root} find <ref>`; for a ticket file, pass its folder before its file name. Non-zero exit → HALT with status `blocked` and blocking condition `ticket not resolved`, with find's error. Otherwise follow **Ticket resolution** (below).

If the invocation prompt explicitly points to an existing plan file with recognized `status` frontmatter, set `plan_file` and read its persistent counter/first blocked reason. An already `>5` same failed loop HALTs blocked before re-entry, preserving the counter, reason/triage and verification-incomplete Evidence; status changes never turn it into fresh work. Otherwise **EARLY EXIT** to the appropriate step:
- `draft` → `{{ rendered("step-02-plan.md") }}`
- `ready-for-dev` or `in-progress` → `{{ rendered("step-03-implement.md") }}`
- `in-review` → `{{ rendered("step-04-review.md") }}`
- `blocked` → HALT with status `blocked` and blocking condition `blocked plan supplied`.
- `dropped` → HALT with status `blocked` and blocking condition `dropped plan supplied`.
- `built` or `done` → only for a separately requested fresh follow-up after verified normal completion, set `review_loop_iteration` to `0` in the frontmatter and `followup_pass` to `true`, then **EARLY EXIT** to `{{ rendered("step-04-review.md") }}`. Never apply this reset to an interrupted/failed/blocked loop or use status changes to evade its cumulative counter.

Otherwise, treat the invocation prompt as starting intent. This may be a story ID, ticket ID, file path, short description, or longer free-form intent. Do not infer workflow state from non-plan files.
If the invocation prompt does not contain enough intent to identify what to implement, HALT with status `blocked` and blocking condition `unclear intent`.

One ticket per invocation: never read another entry, and never advance to a different ticket regardless of outcome.

### Ticket resolution

This runs on the output of `tickets.py find` for one ticket. Set `ticket_args` to the arguments find resolved it with. Find's `description`, `verify`, `references`, `notes`, and `unknown` are the intent, together with `epic_file` and what that file's References name when it is not null, and `story_file` when it is not null. Never write to a ticket file, and never run `pull`; only HALT runs `mark`.

- When the file at find's `plan` exists on disk, treat it as a plan file the invocation prompt pointed to and route it by its `status` (above).
- Otherwise set `plan_file` to find's `plan`; the plan's frontmatter carries `ticket` set to find's `id`, or to the stem of find's `story_file` when `id` is null, never its `ref`. Continue to INSTRUCTIONS, skipping item 5.

## INSTRUCTIONS

1. Load context.
   - **A ticket from the tree** — when **Ticket resolution** set `plan_file`: the entry, its epic file and what that file's References name, and the story file when there is one are already the intent. For continuity, read the plans beside `plan_file` whose `ticket` is one of find's `after` ids that is a plain number (an entry of the same epic; a ref such as `1.5` is another epic's). Carry forward each one's **Code Map**, **Design Notes**, **Implementation Notes**, **Plan Change Log**, and **Tasks & Acceptance**, where present, as continuity context for step-02.
   - **Anything else:**
     - List `{{ config.output_folder }}/{active_initiative}/`, then `{{ config.output_folder }}/`.
     - If the invocation prompt points to an unformatted plan or intent file, ingest that file. Do not scan for unrelated intent files.
     - Planning documents sit in folders by type, main file named after the folder. Typical ones:
       - **PRD** (`prd-*/prd-*.md`) — product requirements and success criteria
       - **Architecture** (`architecture-*/architecture-*.md`) — technical design decisions and constraints
       - **UX/Design** (`ux-*/`, with `DESIGN.md` and `EXPERIENCE.md`) — user experience and interaction design
       - **Product Brief** (`brief-*/brief-*.md`) — project vision and scope
       - **Spec** (`spec-*/spec-*.md`) — the capability contract
     - Scan the listing for folders matching these patterns. If any look relevant to the current intent, load them selectively — you don't need all of them, but you need the right constraints and requirements rather than guessing from code alone.
2. Resolve intent from the invocation prompt and loaded artifacts. Do not fantasize or leave open questions. If the intent cannot be resolved, HALT with status `blocked` and the unresolved questions as blocking condition.
3. Version control sanity check. If version control is unavailable, skip this check. Otherwise capture the existing tracked dirty and untracked baseline and before-content of target files, including pre-existing untracked installation. Unrelated dirty/untracked files are not a blocker and must not be cleaned, staged, committed, or reverted. Only actual target overlap/ownership that cannot be separated, branch mismatch, or required VCS permission/metadata failure blocks that action. For a ticket, judge the branch against the epic, not the story. Do not require an index refresh or metadata write just to inspect; check permission when the actual write is required. Record the real conflict/reason and preserve user work.
4. Multi-goal warning. If the intent appears to contain multiple independently shippable goals, carry `multiple-goals` forward so step-02 can add it to `{plan_file}` frontmatter `warnings`. Do not split or block.
5. Before setting a new plan file, apply the small independent LOW path: perform the requested scoped change or analysis, verify observable behavior, and report results/Evidence/limitations (link an existing Issue if present), then HALT with the factual terminal status. No new Issue/branch/ticket/plan/report file/PR or automatic Git operation is required; honor explicit requested outputs. Preserve any explicitly named ticket identity/dependencies/status record. For larger LOW/clear MEDIUM reuse an existing sufficient plan and same approval; route readiness is not consent. HIGH without recorded decision/action approval stays blocked, with independent safe work allowed. Only unresolved core intent is an intent gap.

6. Set the plan file when a plan is needed.

   If loaded evidence supplies a sufficient existing plan for this Scope, set `plan_file` to that existing file's path, including a supplied HW/non-BMAD plan without recognized status frontmatter. Reuse that path rather than create a second plan. Step-02 supplements only necessary operational fields in place, preserving existing intent/content, decisions, baseline/status/first blocked reason, persistent counter and append-only logs/Evidence. An unreadable or ownership-conflicting supplied path blocks the affected action; never silently generate a replacement.

   Otherwise, only when no sufficient existing plan is available, derive a valid kebab-case slug from the clarified intent. If the intent references a tracking identifier (story number, issue number, ticket ID), lead the slug with it (e.g. `3-2-digest-delivery`, `gh-47-fix-auth`). If `{{ config.output_folder }}/{active_initiative}/plan-{slug}.md` already exists: if its status is `draft`, treat it as the same work and resume it (set `plan_file` to that path, **EARLY EXIT** → `{{ rendered("step-02-plan.md") }}`); otherwise append `-2`, `-3`, etc. Set `plan_file` = `{{ config.output_folder }}/{active_initiative}/plan-{slug}.md`.

## NEXT

Read fully and follow `{{ rendered("step-02-plan.md") }}`
