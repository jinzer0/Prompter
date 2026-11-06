# Writing a ticket

A ticket starts from what is known: what exists when it is done, how it will be verified, what must not change, and what is already decided. Reuse sufficient existing intent, plans, and approvals; a small independent LOW needs verification and a result, not a forced ticket or Issue. When a ticket is needed or requested, ask only what remains unsettled, offering a default for each, then draft into the ticket tree. Under an epic with a breakdown, the ticket is an entry, with the keys `{skill-root}/assets/tickets-template.toml` shows, placed where it goes in the build order; it gets a file now only when it carries full criteria, and otherwise `pull` writes one when it is reviewed or published. A standalone ticket is a file in `backlog/`. Either takes its `id` from `next_id` in `uv run {skill-root}/scripts/tickets.py --project-root {project-root} status <folder>`. Open only the template for the type: `{workflow.initiative_template}`, `{workflow.epic_template}`, `{workflow.story_template}`, `{workflow.spike_template}`, or `{workflow.bug_template}`. Its placeholders say what each section holds; its example is the level of detail to match, not copied.

## Each fact lives in one place

The input (PRD, brief, notes) owns the product argument. Reference a level's requirement source rather than duplicating it. The container owns Description, Outcome, Done when, Boundaries, References, Notes. An epic's `covers` records the parent requirement ids it owns, and every id it assigns locally — in Requirements or its own spec — maps to one of them. An initiative's `covers` records its source ids. Adding a local spec does not replace upstream coverage; update affected references and child mappings with it.

A story under an epic is one slice of its build order: `covers` cites ids from the epic's requirement source, and its description says what it delivers toward them. Several stories can cover one requirement. Where full criteria are written ("Reviewing or refining an existing ticket" says when), add criteria for what changes and for the failure paths, boundaries, and binding decisions; point at the source for the rest.

## Rules the template cannot carry

- Acceptance criteria, where they are written, in the template's format: each is a check the implementer can prove it met without pointing at code, and together they are enough that building the wrong thing cannot pass. Behavior that must stay as it is goes under Boundaries.
- Every sentence is short and declarative, in common words and the project's own vocabulary: the reader has only the ticket. Say each thing once, with no invented term, filler, or metaphor. When the user's text misses this or the criteria rules, offer the rewrite with the reason and let the user decide; show what is missing, not only what is written.
- A reference is a line in References, `type — location, section`: location is a path from `{project-root}`, or a url for a remote source, and is opened before it is cited. Name the nearest document, not the documents behind it. `reference` in the store's `tickets` table, read at activation, says what else that store needs; the repo store has none.
- No source-code paths or snippets; the builder reads the repo. A snippet stays only when it is the decision itself, not an illustration of it. A path the user wants recorded goes in Notes.
- A UI ticket links its design in References; criteria stay functional, layout lives in the design. No design and user-facing: offer `bmad-ux` first; declined, say the builder will guess the layout unless they add details in Notes.
- `hitl: true` only when a person must do part of the work; say which step in the Description, and spell known steps out in the criteria or Notes.
- Risk on every ticket: `low`, `medium`, or `high`, the business impact if this change is wrong, proposed with a one-line reason; the user's value wins. A high-risk ticket names one check outside its own criteria in Notes: a person who confirms, a suite beyond the ticket's tests, a monitor. The build confirms or raises the risk in its plan, which is where a CI process reads it to decide how much review a change gets.
- Severity on a bug, as the bug template defines it. An `estimate` is recorded only when the user gives one: on the entry or in the ticket's frontmatter, carried to a tracker as the store's `fields` says. Never propose one.
- A bug carries a reproduction and a cause hypothesis, never a fix. Missing steps: ask; unclear: tighten until someone else could follow them. Run them when cheap; if the behavior already holds, say so with evidence and create nothing. Criteria include tests for the condition found and fixed, and name the other valid outcome: proof no change is needed.
- A spike names the question, who waits on the answer, and where it is recorded. A spike is `hitl`. When tickets in more than one epic wait on the answer, it is a decision several epics adopt: handle it per `slice.md`, not as a spike inside one of them.
- Notes holds what is not in the repo or the source and what is unsettled, each line marked, and only what is local to this ticket. Anything touching more than one ticket lives in the parent's Notes and is referenced; an unknown that gates work goes to the user, and becomes a spike its dependents list in `after` only when they ask for one. `Assumption:` — offer each; confirmed, it becomes a dated decision; corrected, the ticket changes. `Open question:` — answering it is part of the ticket's work when it starts. `Unknown:` — it gates the start, and `tickets.py next` lists the ticket under `blocked` while the line is there; settle it with the user before the build begins, as a dated decision. Never resolve any of them by guessing.

## Reviewing or refining an existing ticket

Resolve what the user names with `uv run {skill-root}/scripts/tickets.py --project-root {project-root} find [<folder>] <ref>`: `<epic id>.<entry id>`, an entry id inside the epic folder, a tracker id, a file name, or an unbroken phrase from the title. When its `story_file` is null, pull the file with `tickets.py pull <epic folder> <id>` (same `--project-root`); `pull` writes a fixed layout, not the template. A done or dropped ticket and its plan are the record: do not reshape them to a newer template.

Full acceptance criteria are written here only for a bug, a ticket with no epic, and an entry that carries `refine = true`, which is set when the user asks for full criteria on that entry and is never proposed for a story. `tickets.py next` lists these under `ready_to_refine`. An epic's other stories go to the build as they are: the builder reuses sufficient existing plans or writes the criteria within Scope, asking only about unresolved intent or approval-requiring actions. They are reviewed only when the user asks, and a request to refine one of them is a review unless the user asks for full criteria.

Where a change is written:

| Change | Written to |
|---|---|
| description, `Verify:`, criteria, references, notes | the file |
| `title`, `type`, `after`, `hitl` | the file and the entry both; the file's `after` and `hitl` win, and `tickets.py status` reports a difference in either as `drift` |
| full criteria asked for on a story | `refine = true` on the entry, `refined: false` in the file |
| order | the tables in `tickets.toml` |

Once the ticket is published, every change also goes through `write`.

**Review** — the next story by default, several or all on request. Read the file, its source, and the finished siblings and their plans. Improve the description, `Verify:`, references, notes, order, and prerequisites autonomously within clear Scope; run the set check in `validate.md` on the revised draft when they change. Ask only for unresolved decisions or material Scope restructuring. A review sets neither `status` nor `refined`: the file is intent that is ready for the build, which plans the story's criteria from the epic's Requirements and Done when and the story's description and `Verify:` check, which it may extend and never weaken.

**Refine** — before the ticket starts. Read the ticket, its source, the finished siblings and the plans beside them, and the code it will touch at the revision the work starts from. Where the source contradicts the code or another source, add `Source conflict: <id or section> — <what the source says> vs <what was found>` to the Notes of the container whose source it is and tell the user, offering to pass the correction to `bmad-spec` when the source is a BMad spec; a ticket covering that id stays `refined: false` until a `Decision:` line settles it. Confirm its prerequisites are done or in review, resolve questions that prevent implementation, and expand it per its type's template and "Rules the template cannot carry": criteria, boundaries, references, and decisions. Set `refined: true` when it passes self-review in full within clear Scope, without routine human reapproval. A HIGH decision/action still needs explicit approval before that action; record and reuse the same decision's approval, or hold only that action and continue safe independent work.

**A ticket that already carries full criteria, or a container** — read it and open what it references; query its remote state if it is published to a tracker. Reuse sufficient existing criteria and plans without asking the user to agree again; check against the current requirement source and references, and settle only questions that prevent implementation. A container may end in a re-slice per `slice.md`.

A clear LOW/MEDIUM request authorizes these local changes and starting within its Scope; no extra reply is required. Publication remains separately authorized unless the user asks for it too. Refinement itself changes neither status nor assignee: preserve identity and any existing `status`, `tracker_status`, and assignee.

## Self-review checkpoint

Read it back at its current level of detail: an entry needs its description and verification approach; a refined ticket needs runnable acceptance criteria and settled prerequisites. Check size (one agent session plans and finishes it), wording, references, and source consistency. Fix what you find; mention changes to the user's intent.

## After local refinement

Save the local record and Evidence without a routine approval wait. On the repo store, the `write` verb's commit remains subject to existing commit authority; lack of that authority does not block local recording. On a tracker the ticket stays in the tree until separately authorized publication per `board.md`. A ticket written or refined with full criteria carries `refined: true` after the self-review above, and gets the single-ticket check in `validate.md` before any build starts it. Checkpoints are not consent and do not clear hitl, unknown, prerequisites, capability failures, or runtime safety blocks.
