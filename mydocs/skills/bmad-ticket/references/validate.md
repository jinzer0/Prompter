# Validating tickets

The checks are in `{skill-root}/references/validate-checks.md`, one section per scope: Ticket, Set, Tree, Dependencies, Closure. Agents that were not in this conversation run them; each is given that file's path and the names of its sections, and reads them there. `tickets.py` reads only the prerequisites that were written; one that is missing is for these agents to find.

- **A proposed set of epics, a proposed epic breakdown, or a re-slice:** on the draft, before recording it or requesting a necessary Scope decision. This always runs; no path, mode, or setting skips it. First walk the draft through the Dependencies section yourself and fix what that finds, then give the agent the corrected draft as text. Record what the check changed and confirmed, and continue within clear Scope without routine reapproval. Run it again when changes add, remove, merge, or reorder items. At initiative slicing, check the tree's scope ownership without requiring stories or full detail in future epics.
- **A refined ticket:** before execution.
- **A container:** before closure, its implemented coverage and Done when.

How:

- One subagent per epic: its container, the draft breakdown or `tickets.toml`, every child ticket including completed work, requirement source and companions, and the sections Ticket, Set, and Dependencies. One subagent for the tree: the initiative, the draft or written epic envelopes, source, and the sections Tree and Dependencies. A single ticket: one subagent with its source and the section Ticket. Closure: the section Closure.
- A team's own checks are in `{workflow.checks}`, one array per scope with the same names; give each agent the entries for its sections as text.
- Where tickets carry full criteria (`refined: true`), say which they are and point the agent at "Rules the template cannot carry" in `{skill-root}/references/ticket.md` for the criteria and risk rules. Once `tickets.toml` exists, give the full `tickets.py status` command for the folder.
- Merge findings into fix (mechanical), suggest (a guideline, with its reason), or ask (needs the user). Resolve coverage gaps, missing prerequisites, and contradictions before the affected work proceeds. Make supported in-Scope corrections without routine reapproval; the user decides unresolved intent and material Scope changes. Explicit approval is required before a HIGH decision/action, reusing the same decision's existing approval. Hold only unapproved or denied actions and continue safe independent work.
- A declined suggestion recorded as a `Decision:` line is not raised again unless new evidence changes its basis.

The user may request any scope independently.

Validation is a state/Evidence checkpoint, not blanket Human Approval. Reuse sufficient plans, criteria, and approval records without creating another ticket or Issue. A small independent LOW outside a needed ticket tree uses focused verification and a result, not forced validation artifacts. Preserve actual hitl, unknown, prerequisites, capability/permission failures, cancellation/drop, external publication and Issue-close authority, finite safety caps and persistent counters (including the existing >5 counted review-loop block), and normal termination. Do not reset a failed-resume counter, clear a block, or report incomplete validation as success to bypass runtime safety.
