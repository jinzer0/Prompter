# Implementation skills in detail

Read this when the question is about `bmad-build`, `bmad-build-auto`, or `bmad-correct-course`. For running stories without a human, see `help/unattended-builds.md`.

Both builds load AGENTS common risk/Scope policy. Small independent LOW needs scoped work, verification and result/limitations reporting (existing Issue if present), not a new ticket/branch/plan/report/PR. Honor explicit outputs. Clear MEDIUM Scope plans, implements, tests, reviews, repairs, records and transitions autonomously; reuse sufficient existing plans and same decision approval. HIGH/material Scope actions require explicit recorded approval even unattended; absent/denied approval blocks that action, not independent safe work. Checkpoint/readiness/route/review level is not consent or local commit/publication/Merge/Release permission.

Preserve the existing counted review loop and persistent `review_loop_iteration`: read (missing only=0), increment, persist, then check `>5`. 4→5 remains allowed; 5→6 records blocked reason/triage/verification-incomplete Evidence and stops before additional loopback. Same failed resume stays cumulative; plan deletion/counter reset/status changes never bypass `review repair loop exceeded 5 iterations`. Only a separately requested fresh follow-up after verified normal completion resets the counter. Actual failure and normal terminal HALT remain distinct from removed routine approval waits.

**`bmad-build`** — one session of delivery: clarifies intent, plans, implements, reviews, and presents a commit.
- Takes: free text however brief; a ticket from the tree, named by a ref such as `1.2`, its file, or its title; nothing, for the next ready ticket of the active initiative; a plan to resume; any other file as intent; or the recent conversation.
- Pick when: any feature, story, bug fix, or meaningful change. Risky/foundational actions need the recorded HIGH decision approval, not blanket reapproval of the whole plan or every Stage.
- Not when: typo-level or config edits, or edits the user is directing line by line.
- Size: one session is one goal, roughly 500 changed lines, not counting tests, in a handful of files. Start it in a fresh chat.
- Its review: built in and done by agents. By default it runs a quick review with one lens; a thorough review runs four independent lenses. The user can say `none`, `quick`, or `thorough`; depth is separate from approval. It repairs clear Scope findings autonomously and escalates unresolved core intent/HIGH/material Scope. It commits only with existing separate local commit authority, preserves user changes, and never pushes without separate publication authority.
- Writes when needed: reuse a sufficient existing plan; otherwise a ticket's plan beside `tickets.toml`/`backlog/` at find's path with identity/status preserved. Other needed plans use `{output_folder}/{active_initiative}/plan-<slug>.md`; deferred goals use `deferred-work.md`. Drop the initiative component when unset. Small independent LOW need not create these files. Done state is evidence-backed; external Issue close remains separately authorized.

**`bmad-build-auto`** — one unattended build of one ticket, for a loop or script that dispatches it.
- Do not offer it for attended work. It never infers HIGH approval: unresolved intent/required capability/permission blocks with a named reason. It needs instructed subagents and takes one ticket, free text or an intent file. Under version control only actual overlap/ownership/branch/required permission/metadata conflict blocks; unrelated dirty/untracked installation is preserved, not a global clean-tree requirement. Diff generation/rewrite/revert covers only own scoped changes using before-content baseline; record-writing and local commit/publication authority are separate.
- Fits when: decisions and patterns are stable and the tickets are well specified.
- Writes: the same plans as `bmad-build`.

**`bmad-correct-course`** — assesses a significant midstream change.
- Gives: a change proposal covering impact across PRD, epics, architecture, and UX; a recommended path (adjust, roll back, or cut scope); and proposed edits. It drafts the edits to the PRD, architecture, UX, and stories and does not apply them: the user applies those through the owning skills. Its handoff lists the added, removed, resequenced, or rescoped epics and stories for the user to apply with `bmad-ticket`.
- Pick when: a ticket exposes something that reaches across artifacts, such as a technical limit, a new or misread requirement, a pivot, or a failed approach.
- Not when: there is neither a PRD nor a spec (it halts). A change that touches only the spec → update it with `bmad-spec`. A change that only re-slices tickets → `bmad-ticket`.
- Reads: the PRD or spec, plus architecture and UX when present. It reads no epics file or ticket tree; the user describes the affected epics and stories.
- Writes: `{output_folder}/{active_initiative}/change-<slug>/change-<slug>.md`.
