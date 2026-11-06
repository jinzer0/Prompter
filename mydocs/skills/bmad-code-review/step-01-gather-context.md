---
diff_file: '' # set at runtime: path to the diff file
claims_file: '' # set at runtime (path or empty)
plan_file: '' # set at runtime (path or empty)
review_mode: '' # set at runtime: full or no-plan
---

# Step 1: Gather Context

## RULES

- The triggering prompt and the conversation before it name the review target — act on them; do not start from a blank slate.
- Writing `{diff_file}` and the claims file is the only change this step may make. Otherwise it is read-only.

## INSTRUCTIONS

1. **Find the review target.** Check in this order and stop searching at the first that identifies it, then continue directly to instruction 3 without target reconfirmation. Use instruction 2 only when no target can be identified:
   - **Request or recent conversation.** A PR (resolve via `gh pr view`; if that fails, ask for a SHA or branch), commit, branch, commit range, staged or uncommitted changes, a provided diff or file list, or a plan file. A plan sets `plan_file`; a non-empty frontmatter `baseline_revision` other than `NO_VCS` makes the diff source the **plan baseline** — otherwise say so and continue, since a plan without one does not identify the diff.
   - **The ticket tree.** Run `uv run {project-root}/_bmad/method/scripts/tickets.py --project-root {project-root} status`. On a non-zero exit, continue. Otherwise offer the `tickets` rows whose `state` is `review`, `<ref>` and `<title>` each, plus a choice of another target, and HALT for the user's pick. With none, or another target chosen, continue. For a picked ticket, run `tickets.py find <ref>` (same command form) and treat its `plan` as a plan file from the request.
   - **Current git state.** If HEAD is not on the default branch, confirm: "I see HEAD is `<short-sha>` on `<branch>` — do you want to review this branch's changes?" If confirmed, it is a branch diff against the default branch.
   - **Ask.** Go to instruction 2.

2. Only when no review target was identified, HALT and ask the user what to review: uncommitted changes, staged changes, a branch diff (which base), a commit range, or a provided diff or file list. A clear target skips this fallback question.

3. Write the diff to `{diff_file}`, a uniquely-named temp file outside the repository, so concurrent reviews cannot collide. Include only the task's own changes or the user's designated review target. A plan baseline uses `baseline_revision` within that Scope, not every repository change. Distinguish preexisting user content and untracked baseline from this task's changes using the recorded baseline and before-content; include untracked files only when owned by the task or explicitly designated. A branch diff runs from the merge-base (`<base>...HEAD`), so later commits on the base do not show up as reverted. A file list likewise includes only designated changes; ask about the affected scope if ownership cannot be separated. Unrelated dirty/untracked content is not a blocker and must not be staged, rewritten, or reverted to obtain a review diff. If the source does not resolve, HALT and ask for a valid one; if the diff is empty, HALT — there is nothing to review. The review lenses read that file; the diff text is never pasted into their prompts. Read `{diff_file}` yourself when you need the diff later in this workflow.

4. **Write the claims file.** Collect the change's own narrative: for a plan baseline, branch diff, or commit range, the commit messages it covers (`git log <base>..<head>`, where a plan baseline's head is `HEAD`); for other sources, whatever description of the change the user or conversation supplied. Write it verbatim to another uniquely-named temp file outside the repository and set `claims_file` to its path, or `''` if there is none. Do not analyze or summarize it — it is input for one review lens, kept in a separate temp file so the other lenses never see it. No Git staging is required.

5. **Set the plan context.**
   - The request or conversation explicitly says there is no plan → `review_mode` = `no-plan`, `plan_file` = `''`. Do not ask.
   - `plan_file` is set → verify it is readable; `review_mode` = `full`. If unreadable, report the failure and ask for a readable path or an explicit no-plan review; do not silently substitute context.
   - Otherwise, reuse a clearly identified existing plan from the conversation or ticket if available. If none is identified, record `review_mode` = `no-plan`, `plan_file` = `''` and continue; absence of a plan is not an approval gate or a reason to generate a duplicate plan. Ask only when conflicting plan contexts materially affect the review.

6. If `review_mode` = `full` and `{plan_file}`'s frontmatter has a `context` list, load each referenced doc and warn about any that cannot be found.

7. If `{diff_file}` exceeds about 3000 lines, record a nonblocking size warning and continue the designated review. If chunking was requested or the user accepts the option, use a clear first group, rebuild `{diff_file}` within the same owned/designated Scope, and list remaining groups for follow-up. Ask only if the grouping is materially ambiguous; obtain explicit approval before high-cost or material Scope expansion rather than treating size alone as an approval gate.

### CHECKPOINT

Record a summary before proceeding: review Scope and baseline/ownership exclusions, diff stats (files changed, lines added/removed), `{review_mode}`, and loaded plan/context docs (if any). With a clear target and context, continue without confirmation. Unresolved target ambiguity, unreadable required input, or unavailable required capability blocks only the affected review work. HIGH or material Scope decisions require explicit approval before action; reuse existing approval for the same decision. This read-only review grants no platform, local commit, publication, Merge, or Release authority.

## NEXT

Read fully and follow `{{ rendered("step-02-review.md") }}`
