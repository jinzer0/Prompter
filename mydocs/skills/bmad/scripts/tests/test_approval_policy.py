"""Risk-policy source/generated-instruction contracts, not agent enforcement tests.

Oracle: approved revision G5, AC.scenario-01..10, AC.loop-boundary,
AC.git-ownership and VP. Real production render() resolves all Jinja branches.
No policy classifier, simulated agent, test-only helper, or destructive action is
used. Temporary Git commands only establish the ownership fixture's baseline.
Run with Python 3.11+ and the production Jinja dependency; no helpers import.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
SKILLS = SCRIPTS.parents[1]
REPO = SKILLS.parents[1]
BUILDS = ("bmad-build", "bmad-build-auto")
ROUTES = ("full", "oneshot", "auto")
REVIEWS = ("quick", "thorough", "none", "auto")
FLAGS = re.I | re.S
COMPILE_TOKEN = re.compile(r"\{\{\s*(?:config|workflow)\.|\{\{\s*rendered\(|\{%")

# Import actual installed renderer, without importing test_render_skill's missing
# cross-platform helpers or creating interpreter caches in the host install.
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPTS))
import render_skill as rs  # noqa: E402


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def markdown(directory: Path) -> dict[str, str]:
    return {p.relative_to(directory).as_posix(): read(p) for p in sorted(directory.rglob("*.md"))}


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


class ApprovalPolicyTests(unittest.TestCase):
    """Each named AC checks executable instructions at their relevant step."""

    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="bmad-approval-policy-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.outer = Path(cls.temp.name)
        cls.project = cls.outer / "project"
        (cls.project / "_bmad" / "custom").mkdir(parents=True)
        (cls.project / "nested" / "cwd").mkdir(parents=True)
        template = read(SCRIPTS.parent / "assets" / "config.template.toml")
        (cls.project / "_bmad" / "config.toml").write_text(
            template.replace("{directory_name}", cls.project.name), encoding="utf-8"
        )
        cls.skills = {}
        cls.source = {}
        for name in (*BUILDS, "bmad-code-review"):
            copy = cls.outer / "skills" / name
            shutil.copytree(SKILLS / name, copy, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
            cls.skills[name] = copy
            cls.source[name] = markdown(copy)
        cls.snapshots = {}
        for name, route, review in itertools.product(BUILDS, ROUTES, REVIEWS):
            entry = rs.render(
                cls.project, cls.skills[name],
                assignments=[f"workflow.route={route}", f"workflow.review={review}"],
            )
            cls.snapshots[name, route, review] = (entry, markdown(entry.parent))
        cls.root_policy = read(REPO / "AGENTS.md")

    def surfaces(self, filename, *, names=BUILDS, routes=ROUTES, reviews=REVIEWS):
        """Visit source plus each generated branch where the step is present."""
        for name in names:
            self.assertIn(filename, self.source[name], name)
            yield (name, "source", filename), self.source[name][filename]
            for route, review in itertools.product(routes, reviews):
                _, files = self.snapshots[name, route, review]
                if filename in files:
                    yield (name, route, review, filename), files[filename]

    def obligation(self, text, *patterns):
        """Require obligations together in a paragraph, not scattered keywords.

        Synonyms permit policy authors to improve prose without fixing wording
        to this test. Positive checks are paired with forbidden legacy gates.
        """
        blocks = re.split(r"\n\s*\n", text)
        matching = [block for block in blocks if all(re.search(p, block, FLAGS) for p in patterns)]
        self.assertTrue(matching, f"No local instruction satisfies {patterns!r}\n{text}")
        return matching[0]

    def reject(self, text, pattern):
        self.assertIsNone(re.search(pattern, text, FLAGS), f"Legacy/unsafe directive: {pattern}\n{text}")

    def section(self, text, heading):
        match = re.search(rf"(?m)^(#{{2,4}})\s+{re.escape(heading)}\s*$", text)
        self.assertIsNotNone(match, f"Missing section {heading!r}")
        end = re.search(r"(?m)^#{1,4}\s+", text[match.end():])
        return text[match.end():match.end() + end.start()] if end else text[match.end():]

    def test_scenario_01_typo_low_minimal_before_plan_creation(self):
        self.obligation(self.root_policy, r"LOW", r"작은|small", r"강제.*않|일률.*없|not.*require")
        self.obligation(self.root_policy, r"LOW", r"검증|verif", r"보고|report", r"기존 Issue|existing.*issue")
        for label, text in self.surfaces("step-01-clarify-and-route.md"):
            with self.subTest(surface=label):
                low = self.obligation(text, r"small.*LOW|LOW.*small", r"verif", r"report|result", r"no|without|not")
                self.assertLess(text.index(low), text.lower().rfind("set the plan file"))
                self.obligation(text, r"existing.*(?:issue|ticket)", r"link|retain|preserv|refer")
                self.obligation(text, r"LOW", r"(?:no|without|not|unnecessary).*(?:plan|issue|branch)")

    def test_scenario_02_local_bug_autonomous_implementation_and_verification(self):
        for filename in ("step-03-implement.md", "step-oneshot.md"):
            names = BUILDS if filename == "step-03-implement.md" else ("bmad-build",)
            for label, text in self.surfaces(filename, names=names):
                with self.subTest(surface=label):
                    self.obligation(text, r"LOW|MEDIUM|Scope", r"autonom|without.*(?:approval|consent)|no.*general.*approval")
                    self.obligation(text, r"verif|test|check", r"run|perform")
                    self.obligation(text, r"risk|HIGH", r"approval|effect|impact")
                    self.reject(text, r"No human interaction: do not ask questions or wait for approval")

    def test_scenario_03_medium_request_reuses_sufficient_plan_without_scope_reapproval(self):
        for filename in ("step-01-clarify-and-route.md", "step-02-plan.md"):
            for label, text in self.surfaces(filename):
                with self.subTest(surface=label):
                    self.obligation(text, r"existing|sufficient", r"plan", r"reuse|refer|supplement|preserv")
                    self.reject(text, r"even detailed, plan-like intent is input.*not authority.*plan generation")
                    self.reject(text, r"HALT and give the user a choice:\s*- \*\*Approve and continue")
        for label, text in self.surfaces("step-02-plan.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"LOW|MEDIUM", r"Scope|request", r"approval|authoriz|consent", r"no|without|nonblocking|autonom")
                self.obligation(text, r"1600|token", r"advisory|warning|nonblocking|not.*gate")
                self.obligation(text, r"halt-after-planning", r"HALT|stop|honor|preserv")

    def test_auto_sufficient_non_bmad_plan_binds_path_before_new_plan_fallback(self):
        for label, text in self.surfaces("step-01-clarify-and-route.md", names=("bmad-build-auto",)):
            with self.subTest(surface=label):
                binding = self.obligation(
                    text, r"sufficient existing plan", r"set `plan_file`", r"existing file.*path",
                    r"HW/non-BMAD", r"without recognized status", r"supplements only",
                    r"preserving.*intent/content", r"baseline/status", r"counter", r"Evidence",
                )
                fallback = self.obligation(
                    text, r"Otherwise", r"no sufficient existing plan", r"derive.*slug",
                )
                self.assertLess(text.index(binding), text.index(fallback))
                self.obligation(binding, r"unreadable|ownership", r"blocks", r"never.*replacement")

    def test_scenario_04_stage_transition_checkpoint_is_nonblocking_evidence(self):
        stage = read(SKILLS / "task-stage-report" / "SKILL.md")
        self.obligation(stage, r"Checkpoint", r"비차단|nonblocking", r"다음 단계|next.*stage")
        self.obligation(stage, r"검증|verif", r"실패|fail", r"미완료|incomplete|unfinished")
        for label, text in self.surfaces("workflow.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"Checkpoint", r"nonblocking", r"evidence|status")
                self.obligation(text, r"Stage", r"LOW|MEDIUM", r"no|without|autonom")
                self.reject(text, r"ALWAYS.*halt at checkpoints and wait for human input")

    def test_scenario_05_test_failure_repairs_and_reverifies_without_false_success(self):
        for label, text in self.surfaces("step-03-implement.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"fail", r"fix|repair", r"re.?run|re.?verif", r"Scope|scope")
                self.obligation(text, r"fail", r"cannot.*(?:fix|pass|run)|unresolv|unfixable", r"HALT|blocked")
        for label, text in self.surfaces("step-oneshot.md", names=("bmad-build",)):
            with self.subTest(surface=label):
                self.obligation(text, r"verif|test", r"fail", r"fix|repair", r"re.?run|re.?verif")
        for label, text in self.surfaces("step-04-review.md", reviews=("quick", "thorough", "auto")):
            with self.subTest(surface=label):
                self.obligation(text, r"patch", r"fix|repair")
                self.obligation(text, r"verif", r"fail", r"HALT|blocked")

    def test_scenario_06_high_architecture_unapproved_denied_and_prior_approval(self):
        # Three decision states are instruction contracts, not test-generated
        # policy decisions. A ready status or auto route cannot supply consent.
        self.obligation(self.root_policy, r"HIGH", r"구조|architecture", r"명시.*승인|explicit.*approval")
        for label, text in self.surfaces("workflow.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"HIGH", r"explicit", r"before|prior|immediately")
                self.obligation(text, r"unapproved|not.approved|missing approval", r"hold|block|stop|do not")
                self.obligation(text, r"denied|refused|reject", r"action|decision", r"hold|not|block|stop")
                self.obligation(text, r"approval", r"reuse|already.approved|existing.*approval", r"same|particular|decision|scope")
                self.obligation(text, r"safe|independent", r"continue|proceed|hold only")
        for label, text in self.surfaces("step-01-clarify-and-route.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"HIGH", r"explicit", r"before|prior|immediately")
                self.obligation(text, r"approval", r"reuse|already.approved|existing.*approval", r"same|particular|decision|scope")
                self.obligation(text, r"ready-for-dev", r"HIGH", r"not|never|regardless|no.*consent")
        for label, text in self.surfaces("step-03-implement.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"HIGH", r"explicit", r"before|prior")
        for name in BUILDS:
            marker = "frozen-after-approval" if name == "bmad-build" else "intent-contract"
            self.assertIn(marker, self.source[name]["plan-template.md"])
            for label, text in self.surfaces("step-03-implement.md", names=(name,)):
                with self.subTest(surface=label):
                    self.obligation(text, re.escape(marker), r"read-only|do not.*(?:edit|modify)|preserv")

    def test_scenario_07_production_deletion_is_high_and_requires_action_gate(self):
        # Intent: "Delete production customer data" is data only. Inspect the
        # real destructive-action gates; no deletion or policy simulation runs.
        self.obligation(self.root_policy, r"HIGH", r"데이터 삭제|data delet|destruct", r"직전.*승인|before.*approval|명시 승인")
        for label, text in self.surfaces("workflow.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"risk", r"data", r"impact|reversib|external")
                self.obligation(text, r"HIGH", r"explicit", r"before|prior", r"decision|action")
        for label, text in self.surfaces("step-03-implement.md"):
            with self.subTest(action_gate=label):
                self.obligation(text, r"HIGH", r"explicit", r"before|prior", r"action|decision")

    def test_hw_manuals_share_scope_checkpoint_and_retained_safety_contracts(self):
        for name in ("agent_code_hyperfall_rule_conflict.md", "task_workflow_guide.md"):
            with self.subTest(manual=name):
                text = read(REPO / "mydocs/manual" / name)
                self.obligation(text, r"LOW", r"작은|small", r"강제.*않|없이|not.*requir", r"검증|verif", r"보고|report")
                self.obligation(text, r"MEDIUM", r"Scope", r"요청|request", r"대기 없이|자율|without.*wait")
                self.obligation(text, r"HIGH", r"직전|before", r"명시.*승인|explicit.*approval", r"독립 안전|independent.*safe")
                self.obligation(text, r"Checkpoint", r"비차단|nonblocking", r"Evidence|검증", r"Human Approval|명시.*동의|승인이 아니다")
                self.obligation(text, r"기존.*계획", r"참조|재사용|보완", r"중복|재생성.*않|같은 계획")
                self.obligation(text, r">5", r"counter", r"resume", r"blocked", r"미완료|incomplete", r"우회.*않|우회하지")
                self.obligation(text, r"unrelated dirty/untracked", r"자기 diff", r"baseline", r"clean tree", r"강제하지")
                self.obligation(text, r"local commit", r"Merge", r"Release", r"별도|확대하지")
        structure = read(REPO / "mydocs/manual/document_structure_guide.md")
        self.obligation(structure, r"위치.*독자|위치·독자", r"기존 계획|결과", r"비차단", r"작은 LOW", r"강제하지")
        self.obligation(structure, r"공식.*루트", r"새 채택", r"큰 Scope", r"직전.*승인")
        self.obligation(structure, r"명명|파일명", r"생성 의무.*아니|모든 작업.*아니", r"LOW", r"명시.*산출물")
        for name in ("agent_code_hyperfall_rule_conflict.md", "task_workflow_guide.md", "document_structure_guide.md"):
            self.obligation(read(REPO / "mydocs/manual" / name), r"BMAD", r"의도", r"계획", r"Hyper-Waterfall", r"상태", r"Evidence", r"검증", r"인계")

    def test_hw_templates_and_folder_indexes_do_not_reintroduce_ceremony(self):
        paths = [REPO / "mydocs/_templates" / name for name in
                 ("task_plan.md", "task_impl_plan.md", "stage_report.md", "final_report.md")]
        paths += [REPO / "mydocs" / name / "README.md" for name in ("plans", "working", "report", "skills")]
        for path in paths:
            with self.subTest(contract_source=path):
                text = read(path)
                self.obligation(text, r"작은.*LOW", r"검증", r"보고", r"강제하지|강제.*않")
                self.obligation(text, r"기존.*계획|기존.*기록", r"참조|보완|재사용", r"충분|존재|없는")
                self.obligation(text, r"HIGH", r"명시.*승인|승인 기록|동일 승인", r"Scope")
                self.obligation(text, r"기록|보고서|계획 작성", r"local commit", r"권한", r"별도|별개|아니|부여하지|확대하지|없어도")
                self.obligation(text, r"명시.*(?:요청|산출물)", r"작성|이행")
        for name in ("task_plan.md", "task_impl_plan.md"):
            text = read(REPO / "mydocs/_templates" / name)
            self.obligation(text, r"Stage", r"고정", r"최소/최대|최소.*최대", r"없이|아니|강제하지")
        for name in ("stage_report.md", "final_report.md"):
            text = read(REPO / "mydocs/_templates" / name)
            self.obligation(text, r"실패|미검증|미완료", r"완료", r"않|아니|위장하지")
            self.obligation(text, r"cap", r"HIGH|counter", r"종료|보존|초과")

    def test_hw_execution_skills_keep_minimal_route_and_record_authority_separate(self):
        for name in ("task-register", "task-start", "task-stage-report", "task-final-report"):
            with self.subTest(skill=name):
                text = read(SKILLS / name / "SKILL.md")
                self.obligation(text, r"LOW", r"작은|독립", r"강제하지|강제.*않")
                self.obligation(text, r"Scope|기록|보고서", r"권한", r"별개|별도|부여하지|확대하지|아니|없어도")
        for name in ("task-start", "task-stage-report", "task-final-report"):
            with self.subTest(execution=name):
                text = read(SKILLS / name / "SKILL.md")
                self.obligation(text, r"기존", r"계획|기록", r"참조|보완|재사용")
                self.obligation(text, r"Checkpoint", r"비차단", r"Scope|다음 단계")
                self.obligation(text, r"cap", r"counter", r"resume", r"blocked", r"우회|유지")
        register = read(SKILLS / "task-register/SKILL.md")
        self.obligation(register, r"Scope", r"Issue 생성", r"권한", r"별개|명시.*승인")
        external = read(SKILLS / "external-pr-review/SKILL.md")
        self.obligation(external, r"Scope", r"안전", r"자율", r"기존 계획", r"게시", r"권한.*별개")
        self.obligation(external, r"Checkpoint", r"비차단", r"HIGH", r"직전.*승인", r"재사용")
        self.obligation(external, r"검증", r"실패", r"counter", r"resume", r">5", r"blocked")
        self.obligation(external, r"local commit", r"게시 권한", r"없어도 기록", r"실패|한계")

    def test_pr_templates_and_guides_preserve_publication_and_real_record_boundaries(self):
        paths = [REPO / "mydocs/_templates" / name for name in ("external_pr_review.md", "external_pr_review_impl.md")]
        paths += [REPO / "mydocs/manual" / name for name in
                  ("git_workflow_guide.md", "pr_process_guide.md", "internal_pr_guide.md")]
        for path in paths:
            with self.subTest(pr_contract=path):
                text = read(path)
                self.obligation(text, r"LOW", r"작은|독립", r"강제하지|강제.*않")
                self.obligation(text, r"기존.*(?:계획|기록)", r"참조|보완|재사용")
                self.obligation(text, r"없는|생략한|존재하는", r"기록|계획|Stage|문서", r"링크", r"않|존재|실제|가짜")
                self.obligation(text, r"HIGH", r"Scope", r"승인", r"보류")
                self.obligation(text, r"기록|권고", r"local commit", r"게시|merge|close", r"별도|별개|아니|확대하지")

    def test_code_review_clear_target_no_plan_continues_owned_review_in_generated_branches(self):
        skill = self.skills["bmad-code-review"]
        surfaces = [("source", self.source["bmad-code-review"]["step-01-gather-context.md"])]
        workflows = [("source", self.source["bmad-code-review"]["workflow.md"])]
        for review in ("quick", "thorough"):
            entry = rs.render(self.project, skill, assignments=[f"workflow.review={review}"])
            surfaces.append((review, read(entry.parent / "step-01-gather-context.md")))
            workflows.append((review, read(entry)))
        for label, text in workflows:
            with self.subTest(workflow=label):
                self.obligation(text, r"checkpoint", r"without waiting|nonblocking", r"Scope.*clear|clear.*Scope", r"capability.*fail", r"HIGH", r"explicit approval")
                self.obligation(text, r"review", r"not grant", r"publication", r"Merge", r"Release")
                self.reject(text, r"ALWAYS.*halt at checkpoints and wait for human input")
        for label, text in surfaces:
            with self.subTest(branch=label):
                self.obligation(text, r"clear target", r"continue", r"without confirmation|nonblocking")
                self.obligation(text, r"no-plan", r"none.*identified|no.*plan", r"continue", r"not.*(?:gate|reason)|do not ask")
                # The fallback question must not be an unconditional numbered
                # instruction after a target was already found in item 1.
                self.reject(text, r"(?m)^\s*2\.\s*HALT\.\s*Ask the user what to review")
                self.obligation(text, r"ask|HALT", r"target", r"unresolved|no.*target|not.*identif|otherwise|only")
                self.obligation(text, r"diff", r"own|designated", r"baseline", r"untracked", r"preexisting|before-content")
                self.obligation(text, r"unrelated dirty/untracked", r"not.*blocker", r"not.*(?:staged|rewritten|reverted)")
                self.obligation(text, r"3000", r"nonblocking", r"continue", r"HIGH|high-cost", r"explicit approval")
                self.obligation(text, r"unreadable|unavailable", r"blocks", r"affected")
                self.obligation(text, r"HIGH", r"before action", r"reuse", r"publication", r"Merge", r"Release")

    def test_recon_low_inline_explicit_artifacts_high_cost_and_bounded_evidence(self):
        run = read(SKILLS / "bmad-deep-recon/references/run.md")
        self.obligation(run, r"small independent LOW", r"without requested.*artifacts", r"bounded", r"cited answer", r"limitations", r"do not.*(?:folder|plan|memlog)")
        self.obligation(run, r"explicitly requested.*artifacts", r"existing", r"workspace|doc_workspace", r"never reseed.*user content")
        self.obligation(run, r"checkpoint", r"nonblocking", r"reus", r"high-cost", r"explicit approval", r"permission failures")
        self.obligation(run, r"round cap", r"open questions", r"never.*dropped")
        self.obligation(run, r"budgets.*spent|budget.*spent", r"stop spawning", r"synthesize", r"open questions", r"approval")
        self.obligation(run, r"headless", r"retain", r"evidence", r"hold.*unapproved")
        selection = read(SKILLS / "bmad-deep-recon/references/selection.md")
        self.obligation(selection, r"requirements frame", r"reuse", r"nonblocking", r"safe", r"do not reconfirm")
        self.obligation(selection, r"high-cost", r"explicit approval", r"not authority", r"purchase", r"publish", r"Merge", r"Release")

    def test_ticket_checkpoints_do_not_clear_human_unknown_dependency_or_publication_blocks(self):
        ticket = read(SKILLS / "bmad-ticket/references/ticket.md")
        self.obligation(ticket, r"LOW/MEDIUM", r"authorizes", r"Scope", r"no extra reply", r"publication", r"separately")
        self.obligation(ticket, r"checkpoint", r"not consent", r"hitl", r"unknown", r"prerequisites", r"runtime safety")
        self.obligation(ticket, r"hitl: true", r"person must", r"which step")
        self.obligation(ticket, r"Unknown:", r"gates the start", r"blocked", r"never.*guess")
        self.obligation(ticket, r"refinement", r"preserve identity", r"status", r"tracker_status", r"assignee")
        board = read(SKILLS / "bmad-ticket/references/board.md")
        self.obligation(board, r"checkpoint", r"not.*consent", r"HIGH", r"denied", r"safe independent")
        self.obligation(board, r"drift", r"hitl", r"do not remove.*prerequisite|do not remove.*human step")
        self.obligation(board, r"ready_to_start", r"prerequisites", r"gated_by", r"no.*unknown")
        self.obligation(board, r"checkpoint|built", r"not authorize", r"Issue close", r"approval|PR merge")
        validation = read(SKILLS / "bmad-ticket/references/validate.md")
        self.obligation(validation, r"checkpoint", r"not blanket Human Approval", r"hitl", r"unknown", r"prerequisites", r"publication", r"persistent counters")
        self.obligation(validation, r"do not reset", r"failed-resume", r"incomplete.*success", r"runtime safety")
        slicing = read(SKILLS / "bmad-ticket/references/slice.md")
        self.obligation(slicing, r"existing epics", r"revise.*Scope", r"not.*regenerate", r"material.*approval")

    def test_scenario_08_out_of_scope_feature_is_held_not_smuggled_into_repair(self):
        for label, text in self.surfaces("step-03-implement.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"Scope|scope", r"expan|outside|change|material", r"approval", r"before|hold|do not")
        for label, text in self.surfaces("step-04-review.md", reviews=("quick", "thorough", "auto")):
            with self.subTest(surface=label):
                self.obligation(text, r"intent_gap", r"intent", r"cannot|incomplete|unresolved")
                self.obligation(text, r"bad_plan", r"outside|non-frozen", r"intent-contract|frozen-after-approval")
        for label, text in self.surfaces("step-01-clarify-and-route.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"ticket", r"identity", r"prerequisite|dependenc")
                self.obligation(text, r"unknown|unresolved", r"block|HALT|hold")

    def test_scenario_09_verification_records_are_nonblocking_not_git_authority(self):
        report = read(SKILLS / "task-final-report" / "SKILL.md")
        self.obligation(report, r"기록|보고서|Evidence", r"권한.*없|미커밋|commit.*permission")
        self.obligation(report, r"검증|verif", r"실패|미수행|미검증|not.run|unverified")
        for label, text in self.surfaces("step-04-review.md", names=("bmad-build-auto",)):
            with self.subTest(surface=label):
                final = self.section(text, "Finalize")
                self.obligation(final, r"record|result|evidence", r"commit|permission|authorit", r"without|even|separate|independent|no")
                self.obligation(final, r"verif", r"outcome|fail|unverified|not.run")
        for label, text in self.surfaces("workflow.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"record", r"commit", r"no|not|separate|grant")

    def test_scenario_10_merge_release_and_publication_keep_separate_authority(self):
        self.obligation(self.root_policy, r"commit", r"Merge", r"Release", r"별도|확대.*않|separate")
        for label, text in self.surfaces("workflow.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"record|completion|LOW|MEDIUM", r"merge", r"release", r"no|not|separate|grant")
        for filename, names in (("step-05-present.md", ("bmad-build",)),
                                ("step-oneshot.md", ("bmad-build",)),
                                ("step-04-review.md", ("bmad-build-auto",))):
            for label, text in self.surfaces(filename, names=names):
                with self.subTest(surface=label):
                    self.obligation(text, r"commit", r"permission|authoriz|authority", r"only|if|existing")
                    self.reject(text, r"If git is available and there are uncommitted changes, commit")
                    self.reject(text, r"If version control is available and the tree is dirty, create a local commit")
        for path in (SKILLS / "pr-merge-cleanup" / "SKILL.md", REPO / "mydocs/manual/release_update_protocol.md"):
            with self.subTest(permission_source=path):
                self.assertRegex(read(path), r"승인|명시|approval|permission")

    def test_all_status_resume_preserves_intent_baseline_counter_and_first_blocker(self):
        for label, text in self.surfaces("step-01-clarify-and-route.md"):
            with self.subTest(surface=label):
                for status in ("draft", "ready-for-dev", "in-progress", "in-review", "built", "done", "blocked", "dropped"):
                    self.assertIn(status, text)
                self.obligation(text, r"resume", r"baseline", r"intent", r"preserv|retain")
                self.obligation(text, r"blocked|dropped", r"reason", r"preserv|retain|first|original")
                self.obligation(text, r"review_loop_iteration", r"resume", r"never.*reset|do not.*reset|preserv|retain")
                self.obligation(text, r"ticket", r"non.zero|unresolved|not resolved", r"HALT|block")
                if label[1] != "source":
                    self.obligation(text, r"draft", r"step-02-plan\.md")
                    implementation = "step-oneshot" if label[0] == "bmad-build" and label[1] == "oneshot" else "step-03-implement"
                    self.obligation(text, r"ready-for-dev", r"in-progress", implementation + r"\.md")
                    if label[0] == "bmad-build-auto" or label[1] != "oneshot":
                        self.obligation(text, r"in-review", r"step-04-review\.md")
                    self.obligation(text, r"blocked", r"HALT|block|hold")
                    self.obligation(text, r"dropped", r"HALT|block|hold")
        for label, text in self.surfaces("step-03-implement.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"plan_file", r"missing|empty", r"HALT|blocked")
                self.obligation(text, r"baseline_revision", r"resume|resum|already", r"preserv")
        for label, text in self.surfaces("step-02-plan.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"intent|frozen", r"preserv", r"resume|draft|existing")

    def test_counted_loop_4_5_6_order_persistence_block_before_loopback(self):
        # AC.loop-boundary: read +1 persist before >5 means 4->5 is inside the
        # bound, 5->6 persists then blocks, and existing 6 cannot restart. These
        # checks inspect that instruction sequence; they do not execute a loop.
        for label, text in self.surfaces("step-04-review.md", reviews=("quick", "thorough", "auto")):
            with self.subTest(surface=label):
                paragraph = self.obligation(text, r"read", r"review_loop_iteration", r"increment", r"write.*back|persist", r"exceeds?\s*5|>\s*5")
                sequence = (r"read.*?review_loop_iteration", r"increment", r"write.*?back|persist", r"exceeds?\s*5|>\s*5", r"blocked")
                offset = 0
                for instruction in sequence:
                    match = re.search(instruction, paragraph[offset:], FLAGS)
                    self.assertIsNotNone(match, f"Out-of-order {instruction}: {paragraph}")
                    offset += match.end()
                self.obligation(paragraph, r"missing", r"0")
                if label[0] == "bmad-build":
                    self.obligation(paragraph, r"intent_gap", r"bad_plan", r"before each.*loopback")
                else:
                    self.obligation(paragraph, r"before.{0,80}bad_plan.{0,80}loopback")
                self.obligation(paragraph, r"before", r"(?:additional|further|another|next).*(?:loopback|implementation|re.deriv)")
                self.obligation(paragraph, r"blocked", r"reason|non.convergence", r"triage", r"unverified|incomplete|unfinished|not.*verif")
        # No invented attended oneshot cap: its review has no counted replan.
        for review in REVIEWS:
            _, files = self.snapshots["bmad-build", "oneshot", review]
            self.assertNotIn("step-04-review.md", files)
        help_text = read(SKILLS / "bmod-method/help/unattended-builds.md")
        self.obligation(help_text, r"5|>5", r"blocked|block", r"counter|iteration|review_loop_iteration", r"resume|resum")

    def test_failed_loop_resume_cannot_reset_or_masquerade_as_fresh_followup(self):
        for label, text in self.surfaces("step-01-clarify-and-route.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"failed|interrupted", r"resume|resum", r"counter|review_loop_iteration", r"preserv|never.*reset|retain")
                self.obligation(text, r"exceed|>\s*5", r"blocked|block", r"preserv|retain|not|never")
                self.obligation(text, r"completed|built|done", r"fresh|follow.up", r"same.*fail|failed.*loop|not.*bypass|never.*bypass")
        for label, text in self.surfaces("step-02-plan.md"):
            with self.subTest(surface=label):
                self.obligation(text, r"review_loop_iteration|counter", r"preserv|retain", r"resume|resum|replan")

    def test_auto_dirty_ownership_initial_patch_rederive_and_finalize_instructions(self):
        for label, text in self.surfaces("step-01-clarify-and-route.md", names=("bmad-build-auto",)):
            with self.subTest(surface=label):
                self.obligation(text, r"unrelated", r"dirty|untracked", r"not|never|no|preserv")
                self.obligation(text, r"overlap|ownership|conflict", r"HALT|block|hold")
                self.obligation(text, r"metadata|permission", r"HALT|block|hold")
                self.reject(text, r"require a clean working tree|HALT on a dirty tree|git add --refresh -- \.")
        for label, text in self.surfaces("step-03-implement.md", names=("bmad-build-auto",)):
            with self.subTest(surface=label):
                self.obligation(text, r"diff", r"own|owned|Scope", r"baseline|before")
                self.obligation(text, r"untracked", r"pre.existing|original|baseline", r"content|bytes|change")
        for label, text in self.surfaces("step-04-review.md", names=("bmad-build-auto",)):
            with self.subTest(surface=label):
                if label[1] == "source" or label[2] != "none":
                    initial = self.section(text, "Stage the Diff")
                    self.obligation(initial, r"diff", r"own|owned|Scope", r"baseline|before")
                    self.obligation(initial, r"unrelated", r"untracked|dirty|user", r"exclude|not|preserv")
                    self.obligation(initial, r"git add", r"not|never|no")
                    self.obligation(text, r"patch", r"rewrite|regenerat", r"diff", r"own|owned|ownership")
                    self.obligation(text, r"bad_plan|re.deriv", r"own|owned|ownership", r"diff|revert")
                final = self.section(text, "Finalize")
                self.obligation(final, r"commit", r"own|owned", r"permission|authoriz|authority")
                self.obligation(final, r"unrelated", r"dirty|untracked", r"normal|complete|final|not|preserv")
                self.reject(final, r"Verify the version-controlled working copy is clean|finalization left repository dirty")
                self.reject(text, r"unified diff of all changes since.*untracked files included")

    def test_render_leaves_temporary_tracked_dirty_untracked_and_owned_bytes_untouched(self):
        with tempfile.TemporaryDirectory(prefix="bmad-owned-diff-") as temp:
            project = Path(temp) / "project"
            project.mkdir()
            shutil.copytree(self.project / "_bmad/custom", project / "_bmad/custom")
            shutil.copy2(self.project / "_bmad/config.toml", project / "_bmad/config.toml")
            def git(*args):
                return subprocess.run(["git", "--no-optional-locks", *args], cwd=project, check=True, capture_output=True)
            git("init", "--quiet")
            (project / ".gitignore").write_text("_bmad/render/\nignored-install/\n", encoding="utf-8")
            (project / "unrelated.txt").write_text("original user content\n", encoding="utf-8")
            (project / "owned.txt").write_text("original owned baseline\n", encoding="utf-8")
            git("add", ".gitignore", "unrelated.txt", "owned.txt")
            git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture baseline")
            (project / "unrelated.txt").write_text("user dirty tracked content\n", encoding="utf-8")
            (project / "owned.txt").write_text("scope-owned change\n", encoding="utf-8")
            untracked = project / "_bmad/preexisting-install.txt"
            untracked.write_text("preexisting user installation\n", encoding="utf-8")
            untracked_owned = project / "_bmad/preexisting-owned.txt"
            original_untracked = b"original user-owned installation content\n"
            untracked_owned.write_bytes(original_untracked + b"scope-owned addition\n")
            ignored = project / "ignored-install/user.txt"
            ignored.parent.mkdir()
            ignored.write_text("ignored user installation\n", encoding="utf-8")
            protected = (project / "unrelated.txt", project / "owned.txt", untracked, untracked_owned, ignored, project / ".git/index")
            before = {p: p.read_bytes() for p in protected}
            status = git("status", "--porcelain", "--untracked-files=all").stdout
            self.assertIn(b" M unrelated.txt", status)
            self.assertIn(b"?? _bmad/preexisting-install.txt", status)
            for route, review in itertools.product(ROUTES, REVIEWS):
                entry = rs.render(project, self.skills["bmad-build-auto"], assignments=[f"workflow.route={route}", f"workflow.review={review}"])
                self.assertTrue(entry.is_file())
                self.assertEqual({p: p.read_bytes() for p in protected}, before)
                self.assertEqual(git("status", "--porcelain", "--untracked-files=all").stdout, status)
        # Rendering preserves bytes; instruction checks above establish the
        # proposed ownership obligations. No agent diff/commit was performed.

    def test_real_generated_route_review_matrix_and_nested_lens_links(self):
        for (name, route, review), (entry, files) in self.snapshots.items():
            with self.subTest(skill=name, route=route, review=review):
                all_text = "\n".join(files.values())
                self.assertIsNone(COMPILE_TOKEN.search(all_text))
                if name == "bmad-build":
                    self.assertEqual("step-oneshot.md" in files, route != "full")
                    self.assertEqual("step-03-implement.md" in files, route != "oneshot")
                    self.assertEqual("step-04-review.md" in files, route != "oneshot")
                    active_steps = (["step-oneshot.md"] if route == "oneshot" else ["step-04-review.md"] if route == "full" else ["step-oneshot.md", "step-04-review.md"])
                else:
                    active_steps = ["step-04-review.md"]
                    implementation = files["step-03-implement.md"]
                    self.assertEqual("#### Oneshot" in implementation, route != "full")
                    self.assertEqual("#### Full" in implementation, route != "oneshot")
                for filename in active_steps:
                    step = files[filename]
                    if review == "none":
                        self.assertIn("lenses_ran: []", step)
                        self.assertNotIn("### Classify", step)
                        self.assertNotIn("Quick (`quick`)", step)
                    else:
                        effective = review
                        if review == "auto":
                            effective = "quick" if filename == "step-oneshot.md" or route == "oneshot" else "thorough" if name == "bmad-build" or route == "full" else "both"
                        self.assertEqual("Quick (`quick`)" in step, effective in ("quick", "both"))
                        for nested in ("review-prompts/edge-case-hunter.md", "review-prompts/verification-gap.md"):
                            self.assertEqual((entry.parent / nested).as_posix() in step, effective in ("thorough", "both"))
                self._assert_manifest_and_links(entry, self.skills[name], files)

    def _assert_manifest_and_links(self, entry, skill, files):
        manifest = json.loads(read(entry.parent / "manifest.json"))
        inputs = manifest["inputs"]
        self.assertEqual(manifest["project_root"], str(entry.parents[5].resolve()))
        self.assertEqual(inputs["project_root"], manifest["project_root"])
        self.assertEqual(inputs["skill_root"], str(skill.resolve()))
        self.assertEqual(inputs["renderer_sha256"], digest(SCRIPTS.joinpath("render_skill.py").read_bytes()))
        self.assertEqual(manifest["root_hash"], digest(manifest["project_root"].encode())[:12])
        self.assertEqual(inputs["source_sha256"], {name: digest(text.encode()) for name, text in markdown(skill).items() if name != "SKILL.md"})
        self.assertEqual(manifest["outputs"], {name: digest(text.encode()) for name, text in files.items()})
        identity = json.dumps(inputs, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        self.assertEqual(entry.parent.name, digest(identity)[:20])
        self.assertEqual(manifest["generation_hash"], entry.parent.name)
        links = re.findall(re.escape(entry.parent.as_posix()) + r"/([^`\s)\"<>]+\.md)", "\n".join(files.values()))
        self.assertTrue(links, "No operational snapshot links")
        for target in links:
            self.assertIn(target, files)
            self.assertTrue((entry.parent / target).is_file())
        self.assertNotIn("/pending/", "\n".join(files.values()))

    def test_nested_cwd_real_render_reuses_same_root_bound_generation(self):
        program = (
            "import sys; from pathlib import Path; "
            "sys.path.insert(0, sys.argv[1]); import render_skill; "
            "print(render_skill.render(Path(sys.argv[2]), Path(sys.argv[3]), "
            "assignments=['workflow.route=auto', 'workflow.review=thorough']))"
        )
        for name in BUILDS:
            with self.subTest(skill=name):
                result = subprocess.run(
                    [sys.executable, "-B", "-c", program, str(SCRIPTS), str(self.project), str(self.skills[name])],
                    cwd=self.project / "nested/cwd", capture_output=True, text=True, check=False,
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                expected, files = self.snapshots[name, "auto", "thorough"]
                self.assertEqual(result.stdout.strip(), str(expected))
                self._assert_manifest_and_links(expected, self.skills[name], files)

    def test_new_source_generation_is_root_bound_and_preserves_old_generation(self):
        skill = self.outer / "generation-skills/bmad-build-auto"
        shutil.copytree(self.skills["bmad-build-auto"], skill)
        entry = rs.render(self.project, skill, assignments=["workflow.review=thorough"])
        previous = {p.relative_to(entry.parent): p.read_bytes() for p in entry.parent.rglob("*") if p.is_file()}
        workflow = skill / "workflow.md"
        workflow.write_text(read(workflow) + "\n<!-- fixture source revision -->\n", encoding="utf-8")
        changed = rs.render(self.project, skill, assignments=["workflow.review=thorough"])
        self.assertNotEqual(entry.parent, changed.parent)
        self.assertEqual({p.relative_to(entry.parent): p.read_bytes() for p in entry.parent.rglob("*") if p.is_file()}, previous)
        self._assert_manifest_and_links(changed, skill, markdown(changed.parent))
        other = self.outer / "other-root"
        shutil.copytree(self.project / "_bmad/custom", other / "_bmad/custom")
        shutil.copy2(self.project / "_bmad/config.toml", other / "_bmad/config.toml")
        second = rs.render(other, skill, assignments=["workflow.review=thorough"])
        self.assertNotEqual(second.parent.parent.name, changed.parent.parent.name)
        self._assert_manifest_and_links(second, skill, markdown(second.parent))
        self.assertNotIn(changed.parent.as_posix(), "\n".join(markdown(second.parent).values()))

    def test_code_review_quick_thorough_and_invalid_overrides_remain_guarded(self):
        skill = self.skills["bmad-code-review"]
        for review in ("quick", "thorough"):
            with self.subTest(review=review):
                entry = rs.render(self.project, skill, assignments=[f"workflow.review={review}"])
                files = markdown(entry.parent)
                self._assert_manifest_and_links(entry, skill, files)
                text = "\n".join(files.values())
                self.assertIsNone(COMPILE_TOKEN.search(text))
                self.assertEqual("Quick (`quick`)" in text, review == "quick")
                self.assertEqual((entry.parent / "review-prompts/edge-case-hunter.md").as_posix() in text, review == "thorough")
        for name, assignment in (("bmad-build", "workflow.route=bogus"), ("bmad-build-auto", "workflow.review=bogus"), ("bmad-code-review", "workflow.review=none")):
            with self.subTest(name=name, override=assignment):
                with self.assertRaisesRegex(rs.RenderError, "workflow\\.(route|review) must be"):
                    rs.render(self.project, self.skills[name], assignments=[assignment])
        with self.assertRaisesRegex(rs.RenderError, "missing customization parameter"):
            rs.render(self.project, self.skills["bmad-build"], assignments=["workflow.nonexistent=true"])

    def test_security_source_escape_and_corrupt_snapshot_are_not_bypassed(self):
        skill = self.outer / "security-skills/bmad-build"
        shutil.copytree(self.skills["bmad-build"], skill)
        outside = self.outer / "outside.md"
        outside.write_text("not a trusted source\n", encoding="utf-8")
        workflow = skill / "workflow.md"
        original = workflow.read_bytes()
        workflow.unlink()
        workflow.symlink_to(outside)
        with self.assertRaisesRegex(rs.RenderError, "escapes skill directory"):
            rs.render(self.project, skill)
        workflow.unlink()
        workflow.write_bytes(original)
        entry = rs.render(self.project, skill)
        entry.write_text(read(entry) + "corrupt\n", encoding="utf-8")
        with self.assertRaisesRegex(rs.RenderError, "hash mismatch"):
            rs.render(self.project, skill)
        self.assertTrue(read(entry).endswith("corrupt\n"))


if __name__ == "__main__":
    unittest.main()
