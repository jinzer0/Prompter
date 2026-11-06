{% if workflow.route not in ("oneshot", "full", "auto") %}{{ halt("workflow.route must be oneshot, full, or auto, not " ~ workflow.route) }}{% endif %}
{% if workflow.review not in ("none", "quick", "thorough", "auto") %}{{ halt("workflow.review must be none, quick, thorough, or auto, not " ~ workflow.review) }}{% endif %}
# Build New Preview Workflow

**Goal:** Turn user intent into a hardened, reviewable artifact.

Read the applicable `AGENTS.md` common risk policy and carry it through every step. Classify risk by impact, reversibility, security, data, and external effects, never file/line counts. Clear LOW/MEDIUM requests authorize their Scope: plan, implementation, verification, repair, review, records, and Stage transitions need no general consent. HIGH requires explicit approval of the particular decision/action before it occurs; reuse sufficient existing approval and hold only the unapproved/refused action. `full`/`oneshot` and review level describe workflow depth, not risk or authority. Reuse sufficient plans, decisions, and evidence. Small independent LOW work (including explicit BMAD invocations) takes step 1's minimal branch before plan creation.

Checkpoints are nonblocking status/evidence records. Only genuine intent ambiguity, HIGH approval, explicit halt-after-planning, actual capability/permission/ownership conflict, runtime safety limits, or terminal completion requires a halt. Preserve existing Git permissions and user-owned changes; unrelated dirty/untracked work is not a gate. Records grant no commit/publication/merge/release authority.

Preserve the existing counted intent_gap/bad_plan review loops: read persistent `review_loop_iteration` (missing only = 0), increment and persist before testing `>5`, and set `status: blocked` before additional loopback/implementation when exceeded, retaining the counter, blocked reason, finding/triage, and unverified evidence. Do not finalize as built/done or successful. Failure resume never resets this counter or deletes the plan to bypass it. Only normally completed, separately requested fresh follow-up work is distinct from the same failed loop.

**CRITICAL:** If a step directs you to another snapshot file, read it fully and follow it. No exceptions.

Subagents, when the capability is available, are an important part of this workflow. Use them as directed by the workflow steps.
If you need an explicit user instruction to run them, ask once now for the whole workflow run.

## READY FOR DEVELOPMENT STANDARD

A plan is "Ready for Development" when:

- **Actionable**: Every task has a file path and specific action.
- **Logical**: Tasks ordered by dependency.
- **Testable**: All ACs use Given/When/Then, and each is a check the implementer can prove it met without pointing at code.
- **Complete**: No placeholders or TBDs.
- **Sufficient**: No known requirement, acceptance, dependency, or implementation gaps remain unresolved.
- **Coherent**: No unresolved ambiguities or internal contradictions.

## SCOPE STANDARD

A plan should target a **single user-facing goal** within **900–1600 tokens**:

- **Single goal**: One cohesive feature, even if it spans multiple layers/files. Multi-goal means >=2 **top-level independent shippable deliverables** — each could be reviewed, tested, and merged as a separate PR without breaking the others. Never count surface verbs, "and" conjunctions, or noun phrases. Never split cross-layer implementation details inside one user goal.
  - Split: "add dark mode toggle AND refactor auth to JWT AND build admin dashboard"
  - Don't split: "add validation and display errors" / "support drag-and-drop AND paste AND retry"
- **900–1600 tokens**: Advisory range for work needing a plan; smaller sufficient plans are valid and above 1600 merits a context-rot warning, not a choice wait.
- **Neither limit is a gate.** Keep cohesive Scope intact; split only when dependencies or genuinely unresolved scope choices require it.

## Conventions

- Every operational cross-file reference in this workflow is an absolute snapshot path. Open it directly; do not resolve it relative to a skill directory.
- `{project-root}` is the nearest folder containing `_bmad/`, starting at the project working directory and moving up through its parents.
- `{active_initiative}` is the value printed by `uv run {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root} --key core.active_initiative`, read once before step 1. When it is unset, drop `/{active_initiative}` from every path.
- Whenever this workflow captures or records a version-control revision, obtain the full canonical identifier directly from version control and preserve it verbatim.

## On Activation

### Step 1: Execute Prepend Steps

Execute each of these steps in order before proceeding (`_None._` means skip):

{{ workflow.activation_steps_prepend }}

### Step 2: Load Persistent Facts

Treat every entry below as foundational context you carry for the rest of the workflow run. Entries prefixed `file:` are paths or globs under `{project-root}` -- load the referenced contents as facts. All other entries are facts verbatim (`_None._` means none):

{{ workflow.persistent_facts }}

### Step 3: Execute Append Steps

Execute each of these steps in order (`_None._` means skip):

{{ workflow.activation_steps_append }}

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution:

- **Micro-file Design**: Each step is self-contained and followed exactly
- **Just-In-Time Loading**: Only load the current step file
- **Sequential Enforcement**: Complete steps in order, no skipping
- **State Tracking**: Persist progress via plan frontmatter and in-memory variables
- **Append-Only Building**: Build artifacts incrementally

### Step Processing Rules

1. **READ COMPLETELY**: Read the entire step file before acting
2. **FOLLOW SEQUENCE**: Execute sections in order
3. **RECORD CHECKPOINTS**: Continue within authorized Scope; wait only for the specific unresolved decision or actual safety blocker
4. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules (NO EXCEPTIONS)

- **NEVER** load multiple step files simultaneously
- **ALWAYS** read entire step file before execution
- **NEVER** skip steps or optimize the sequence
- **ALWAYS** follow the exact instructions in the step file
- **ALWAYS** preserve actual safety halts and explicit halt-after-planning; ordinary checkpoints do not wait for human input

## FIRST STEP

Read fully and follow: `{{ rendered("step-01-clarify-and-route.md") }}` to begin the workflow.
