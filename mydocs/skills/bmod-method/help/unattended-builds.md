# Unattended builds

Use this when the user asks about `bmad-build-auto`, building tickets with no human present, a blocked run, or what to check after a run.

## What one run does

- One invocation works only within its clear Scope, reuses sufficient plans/decisions, verifies/reviews/repairs and records Evidence without routine approval waits. Load AGENTS policy: small independent LOW needs verification/result/limitations reporting, not new ticket/branch/plan/report/PR; honor explicit outputs. HIGH/material Scope actions still need recorded explicit approval; missing/denied approval blocks that action with independent safe work allowed. Unattended silence is never consent.
- Its review is `quick` by default. Passing `thorough` in the invocation suits a ticket that is unusually risky or makes many design decisions.
- It builds only what the invocation names and never picks work itself; given nothing, it halts `unclear intent`. It never moves on to a second ticket. Something else chooses each ticket and runs the loop: the user, a script, an AI coding session starting one worker per ticket, or an orchestrator such as bmad-loop, which does not dispatch from the ticket tree yet.
- It needs instructed subagents and, under version control, ownership and a branch fitting the epic. Actual target overlap/ownership separation failure or required Git permission/metadata conflict blocks; unrelated tracked dirty/untracked installation does not. Preserve before-content baseline and only own changes in initial/patch/rederive diffs and reverts. Do not stage just to generate a diff.

## Accepted inputs

- A ticket from the tree, named as a ticket (`ticket 1.2`, or a ticket's title), or a ticket file. A bare ref or title is not taken as a ticket. It builds from the entry, its epic file, and the entry's story file when it has one, and never writes a ticket file.
- Free text or a path to an intent file.
- A plan an earlier run wrote.
- "Halt after planning" stops at `ready-for-dev` as explicitly requested. Readiness and `plan_checkpoint`/`done_checkpoint` are state/Evidence, not blanket human consent. The run itself never reads those checkpoint fields; existing hitl/unknown/dependency and external permissions remain separate.

## Where the plan goes

- A ticket's plan sits beside `tickets.toml`, or in `backlog/` for a backlog ticket, at the path `tickets.py find` returns, with `ticket` and `baseline_revision` in its frontmatter. Other work gets `{output_folder}/{active_initiative}/plan-<slug>.md`, or `{output_folder}/plan-<slug>.md` with no initiative active.
- A successful run ends at `built`, which the board shows as review. Only the user or an orchestrator marks the ticket done, with `tickets.py mark <ref> done`.
- This is the repo store. On a tracker store, `next` and `mark` refuse, so name the ticket and move it through `bmad-ticket`.

## Resume follows the plan's status

- `draft`: plans.
- `ready-for-dev`, `in-progress`: implements.
- `in-review`: reviews.
- `built`, `done`: only a separately requested fresh follow-up after verified normal completion resets the counter for a new pass; failed/blocked/interrupted work never qualifies.
- `blocked`: halts at once.

## Blocked runs

`blocked` records an actual unresolved intent, safety, verification, permission or ownership condition, not Stage completion or unrelated dirt. Named tickets preserve mark/status/first blocked reason and Auto Run Result. Other needed plans/results use the usual output paths; small independent LOW without a required file reports actual status/Evidence/limitations in the response or existing record. Common reasons:

- `unclear intent`, `intent gap`: the input cannot answer a question the run hit.
- `no subagents`.
- `ticket not resolved`: `find` failing on the reference.
- `implementation verification failed`.
- `review repair loop exceeded 5 iterations`: preserve the existing counted bad_plan loop. Read persistent `review_loop_iteration` (missing only=0), increment, persist, then check `>5`: 4→5 proceeds, 5→6 records `blocked`, first reason/finding/triage/verification-incomplete Evidence and stops before additional implementation/loopback. Do not present it as built/done.
- `blocked plan supplied`: the plan is still marked blocked.
- `dropped plan supplied`: the ticket was dropped; the plan stays `dropped` and nothing is built.
- Actual target overlap/ownership separation failure, branch mismatch or required permission/metadata failure, never unrelated dirty/untracked files alone.

A blocked/dropped plan preserves its first reason and halts dispatch. Resolve the actual cause before a permitted resume, preserving baseline, triage, Evidence and cumulative `review_loop_iteration` for the same failed loop across draft/in-progress/in-review/retry. A >5 failed loop remains terminated; changing status, deleting the plan or resetting the counter cannot create a fresh run to evade the cap. Independent safe work does not restart that loop.

## The saved patch on an intent-gap halt

When review halts on `intent gap`, the run saves the attempted change as a patch file beside the plan, names the path in the plan, and reverts the code. If the patch reads the intent correctly, the user runs `git apply` on it, sets the plan's status to `in-review`, and dispatches again. If it was wrong, they fix the intent and start fresh.

## What to read afterwards

- `status` in the plan's frontmatter, or `tickets.py status`. Chat output is not proof of success.
- `followup_review_recommended`: true when review fixed a high finding or two or more medium ones. It is a suggestion; dispatching the ticket again gives another pass.
- `risk` in the frontmatter: `low`, `medium`, or `high`, the ticket's risk confirmed or raised at planning. `bmad-build` writes it too. A CI process can read it to decide how much review a change gets; BMad ships no such process.
- `deferred` in the frontmatter: real findings that were not this ticket's problem. Nothing files them; the user decides whether to make tickets.
- `Auto Run Result`: summary, review findings, verification, residual risks.
- Result/Evidence and verification are recorded before local commit authority is checked. Without existing commit permission report uncommitted work; with it commit only authorized own changes and preserve user commits/files. An explicitly required authorized commit failure blocks that operation. Unrelated dirty/untracked files may remain on normal termination; global clean tree is not required. Publication/PR/Merge/Release remain separately authorized; unverified/HIGH-unapproved/cap-exceeded work never becomes built/done.
- After the epic's last ticket, recommend `bmad-retrospective`.

## When it fits

- Fits: decisions and patterns are settled, tickets are well specified, and someone reads the results.
- Use `bmad-build` for attended clarification of thin intent or HIGH/material Scope decisions. Clear Scope plans and Stage transitions themselves require no repeat approval. Do not offer auto to a user who is present. Existing normal terminal HALT and explicit halt-after-planning remain.
