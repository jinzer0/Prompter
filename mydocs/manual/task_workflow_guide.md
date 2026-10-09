# 타스크 진행 절차 매뉴얼

본 매뉴얼은 하이퍼-워터폴 방법론에서 타스크를 진행하는 절차, 타스크 번호와 커밋 메시지 명명 규칙, 작업 시간 결정 규칙, 승인 간주 조건을 정의한다. GitHub Issue를 받아 작업을 시작하거나 단계 종료, 최종 보고, PR 게시, merge 후 정리를 수행하기 전에 읽는다. 문서 폴더 위치는 `document_structure_guide.md`, 브랜치 세부 운용은 `git_workflow_guide.md`에서 다룬다.

## 핵심 용어

- **수행계획서**: 작업 목적, 범위, 예상 단계, 검증 계획과 필요한 위험 결정을 정리하는 문서. 충분한 기존 계획을 참조·보완한다.
- **구현계획서**: Scope 안의 수행계획을 필요한 단계 단위로 나누고 각 단계의 산출물·검증·커밋 메시지를 정리한 문서. 계획 문서 자체에 일률 승인을 요구하지 않는다.
- **단계별 완료보고서**: 한 단계가 끝났을 때 `mydocs/working/`에 남기는 `_stage{N}.md` 보고서.
- **최종 결과보고서**: 모든 단계가 끝난 뒤 `mydocs/report/`에 남기는 `_report.md` 보고서.
- **Scope**: 요청의 목표·대상·수용 기준·제약. 명확한 LOW/MEDIUM 요청 자체가 해당 범위 승인이다.
- **Checkpoint**: 상태·검증·Evidence·인계를 남기는 비차단 기록. 특정 위험 결정/행동에 대한 Human Approval이나 runtime 안전 차단과 구분한다.
- **승인 간주 조건**: HIGH 결정/행동·범위를 특정한 같은 스레드의 명시 지시를 인정하고 동일 결정의 기존 승인 기록을 재사용하는 기준.

BMAD는 의도·요구·설계·수용 기준·적정 계획, Hyper-Waterfall은 실행·상태·영속화·Evidence·검증·인계를 담당한다. 같은 계획/승인 문서를 중복 생성하지 않는다.

## 문서 출력 형식

계획서, 단계 보고서, 최종 보고서, 오늘할일, 외부 PR 검토 문서는 `mydocs/_templates/`의 중앙 템플릿을 기준으로 작성한다. Skill은 절차와 검증을 정의하고, 중앙 템플릿은 출력 형식을 정의한다. 둘이 어긋나면 같은 PR에서 함께 수정한다.

GitHub Issue와 Pull Request는 GitHub 플랫폼 산출물이다. 새 task 이슈는 `.github/ISSUE_TEMPLATE/task.yml`을 입력 프롬프트 형식으로 사용하고, PR 본문은 `.github/pull_request_template.md`를 출력 형식으로 사용한다.

PR 본문의 `검증` 섹션은 `.github/pull_request_template.md`의 `자동 검증`, `수동/시나리오 검증`, `CI/원격 검증`, `검증 한계` 구조를 따른다. 실행한 명령만 나열하지 않고 검증 결과와 근거를 함께 적으며, 실행하지 않은 검증은 표에 남기지 않고 `검증 한계` 또는 `남은 리스크`로 분리한다.

## 프레임워크 lifecycle 작업

Hyper-Waterfall 방법론 자체를 새 저장소에 설치하거나 기존 적용 저장소를 새 version으로 업데이트하는 작업은 먼저 framework lifecycle 판단을 거친다. 판단 기준과 일반 task 전환 규칙은 [`framework_lifecycle_guide.md`](framework_lifecycle_guide.md)를 따른다.

- 신규 적용 판단: `docs/agent-entrypoint.md`, `docs/lifecycle/adoption.md`, `templates/manifest.json`
- 기존 업데이트 판단: `docs/agent-entrypoint.md`, `docs/lifecycle/update.md`, `.hyper-waterfall/version.json`, 목표 GitHub Release/tag의 manifest, `docs/migrations/`
- 업데이트 PR 전환: `docs/lifecycle/update_pr.md`
- release/tag와 update protocol: [`release_update_protocol.md`](release_update_protocol.md)

Lifecycle 판단 결과가 승인되어 실제 파일 변경으로 넘어가면, 그때부터 이 매뉴얼의 일반 타스크 절차를 적용한다. 승인 전에는 manifest diff에 포함된 파일을 대상 저장소에 적용하지 않는다.

## 타스크 번호 관리

- **GitHub Issues**를 타스크 번호로 사용한다. 자동 채번으로 중복 방지.
- **마일스톤 표기**: `M{버전}` (예: M100=v1.0.0, M05x=v0.5.x)
- 새 타스크 등록: 새 Issue 추적이 필요한 작업은 [`task-register`](../skills/task-register/SKILL.md) Skill로 중복 이슈, milestone, label을 확인하고 기존 원격 게시 권한에 따라 GitHub Issue를 만든다. 작은 독립 LOW에는 새 Issue를 강제하지 않는다.
- 타스크 시작: 기존 이슈 번호와 기록을 재사용한다. 브랜치·오늘할일·계획이 필요한 작업에 [`task-start`](../skills/task-start/SKILL.md) Skill을 적용한다.
- 브랜치명: `local/task{issue번호}` (예: `local/task1`)
- PR 생성용 원격 브랜치명: `publish/task{issue번호}` (예: `publish/task1`)
- 커밋 메시지 규칙:
  - 기본형: `Task #{issue번호}: 내용`
  - 단계 커밋: `Task #{issue번호} Stage {N}: 내용`
  - 세부 하위 단계 허용: `Task #{issue번호} [Stage {N.M}]: 내용`
  - 단계 완료보고서 또는 최종 보고서와 함께 묶는 커밋: `Task #{issue번호} Stage {N} + 최종 보고서: 내용`
- `mydocs/orders/`에서 `M100 #1` 형식으로 마일스톤+이슈 참조
- 이슈 close는 작업지시자 승인 또는 PR merge 확인 후에만 수행한다. 승인된 close에 `gh issue close {번호}`를 사용하거나 PR merge로 닫을 때 `closes #번호`를 사용한다.

## 위험에 비례하는 타스크 진행 절차

아래는 필요한 추적 작업의 흐름이며 모든 작업에 적용하는 의무 순서가 아니다. 위험은 파일 수·줄 수가 아니라 영향·가역성·보안·데이터·외부 부작용으로 판단한다. Prompter 고유 규칙은 `AGENTS.md`의 운영 정책보다 우선한다.

- **LOW**: 사전/계획 승인 없이 실행하고 검증·결과·제약을 보고한다. 작은 독립 LOW는 새 Issue·브랜치·오늘할일·계획/보고 파일·PR·형식 Stage 없이 진행할 수 있다. 기존 Issue가 있으면 결과에 연결하고 명시 요청된 산출물은 작성한다.
- **MEDIUM**: 명확한 요청이 해당 Scope 승인이다. 범위 내 계획·구현·테스트·리뷰·수정·기록·Stage 전환은 응답 대기 없이 자율 진행한다. 핵심 요구가 불명확하면 해당 결정만 질문한다.
- **HIGH**: 중대한 구조·보안·인증/권한·호환성 파괴·데이터 삭제·파괴적 migration·운영 배포·중대한 외부 영향·고비용·큰 Scope 이탈은 해당 결정/행동 직전 명시 승인받는다. 미승인/거절 행동과 의존 작업만 보류하고 독립 안전 작업은 계속한다.

1. 필요한 경우 기존 Issue를 사용하거나 기존 게시 권한에 따라 `task-register`로 등록한다.
2. 추적에 필요한 경우 `task-start`로 `local/task{issue번호}` 브랜치·오늘할일을 준비하고 기존 기록을 재사용한다.
3. 충분한 기존 수행/구현계획을 참조·보완한다. 별도 계획이 필요할 때만 작성하며 Stage 수에 고정 최소/최대 수를 강제하지 않는다.
4. Scope 안에서 구현·검증·수정을 진행하고 필요한 Stage 결과를 `mydocs/working/`의 `_stage{N}.md`에 기록한다. 일반 Stage 전환이나 검증 기록은 승인 대기가 아니다.
5. 완료 결과·Evidence·미검증·제약을 보고하고 필요한 최종 결과보고서(`mydocs/report/`의 `_report.md`)와 기존 오늘할일을 갱신한다. 미완료·blocked를 성공으로 기록하지 않는다.
6. local commit 권한이 있는 경우 자기 소스와 해당 단계/최종 기록을 타스크 브랜치에서 함께 커밋한다. 기록 작성은 commit 권한이 아니며 권한이 없으면 미커밋 결과와 제약을 남긴다.
7. 원격 게시 권한이 있는 경우 `publish/task{issue번호}`로 push 후 `master` 대상 Open PR을 생성하고 존재하는 기록만 연결한다. 없는 계획/Stage를 PR 때문에 만들지 않는다.
8. 필요한 HIGH 승인 피드백은 `mydocs/feedback/` 등 기존 기록에 보존한다. 테스트 통과가 승인·게시·merge 권한을 대신하지 않는다.
9. 기존 merge 권한에 따라 PR merge를 확인한 후 이슈 close와 오늘할일 상태를 정리한다. 작업지시자가 별도로 승인한 이슈 close도 가능하다.
10. PR merge와 이슈 close 후 `master`로 돌아오고 더 이상 필요 없는 `local/task{issue번호}`·임시 worktree·merge된 `publish/task{issue번호}` 등 자기 부산물만 기존 Git 권한에 따라 정리한다.

unrelated dirty/untracked는 시작/완료 차단 사유가 아니다. 실제 변경 겹침·소유권 분리 불가·branch/필요 권한/metadata 충돌만 해당 작업을 보류한다. baseline과 변경 전 내용으로 자기 diff만 검토·재생성·revert하고 허용된 자기 변경만 commit한다. 사용자/다른 작업자 변경은 보존하며 전체 clean tree를 정상 종료 조건으로 강제하지 않는다.

## 작업 규칙

- 작업 시간의 시작과 종료는 작업지시자가 결정한다. 에이전트가 임의로 작업 종료를 제안하거나 시간을 한정하지 않는다.

## 승인 간주 조건

- 명확한 LOW/MEDIUM 요청은 해당 Scope 승인이다. HIGH는 같은 스레드에서 해당 결정/행동·범위를 특정한 명시 지시가 필요하다. 침묵·auto 모드·Stage 완료·단순 Checkpoint는 승인이 아니다.
- 동일 결정은 기존 승인 기록을 참조하며 다시 승인받지 않는다. 승인 결정·범위·근거·결과를 기존 기록에 남긴다. 핵심 결과 변경이나 큰 Scope 확장은 승인 전 구현하지 않는다.
- 플랫폼 Tool Permission과 기존 local commit·원격 게시·PR·Merge·Release·강제 Git 작업 및 framework lifecycle 승인은 별도이며 이 정책은 이를 확대하지 않는다.

## FAQ / 흔한 실수

### 단계 검증이 실패했을 때

실패한 명령·오류·수정 방향·검증 미완료 Evidence를 기록하고 Scope 안에서 자율 수정·재검증한다. 실패를 완료 보고나 성공 커밋으로 위장하지 않는다. 범위 내 단계 재분할·계획 보완은 자율이며 핵심 결과 변경이나 큰 Scope 확장만 승인받는다. 기존 finite safety cap·영속 counter·동일 실패 resume 누적과 실제 차단/정상 종료 HALT는 유지한다. 기존 counted review loop의 >5는 blocked 원인·triage·검증 미완료 Evidence를 남기고 추가 loopback 전에 종료한다. plan 삭제·counter reset·상태 변경으로 같은 실패 loop를 우회하지 않는다. 독립 안전 작업 지속은 종료된 실패 loop 재시작 권한이 아니다.

### 단계를 몇 개로 나눌지 애매할 때

고정 최소/최대 Stage 수는 없다. 위험·복잡도·의존성에 비례해 한 번에 검증하고 보고할 수 있는 크기로 나눈다. 작은 독립 LOW에는 형식 Stage를 만들지 않으며 충분한 기존 계획을 재사용한다.

### HIGH 승인 없이 위험 행동을 시작했을 때

해당 행동과 의존 작업을 멈추고 사실·영향·필요한 결정을 기록한다. 자기 변경만 분리하며 사용자 작업을 되돌리거나 승인 없이 파괴적 Git 보정을 하지 않는다. 독립 안전 작업은 계속한다. LOW/명확한 MEDIUM의 Scope 내 Stage 전환에는 별도 승인이 필요하지 않다.

## SKILL 호출 표시 안내

하이퍼-워터폴 SKILL 절차를 적용할 때는 실제 절차 실행 전에 사용자에게 한 줄로 알린다. 이는 Scope 안에서 적용하는 절차를 투명하게 표시하는 비차단 안내이며 별도 응답 대기나 HIGH 승인·Tool Permission·Git 권한을 대신하지 않는다.

권장 형식:

- `task-register 스킬을 호출합니다.`
- `task-start 스킬을 호출합니다.`
- `task-stage-report 스킬을 호출합니다.`
- `task-final-report 스킬로 진행합니다.`
- `pr-merge-cleanup 스킬을 호출합니다.`
- `external-pr-review 스킬을 호출합니다.`
- `todo 스킬을 호출합니다.`

이 표시는 해당 하이퍼-워터폴 절차를 적용할 때 사용한다.

README의 "핵심 SKILL 상세" 표는 각 Skill의 사용자-facing 요약이고, 이 섹션은 실제 호출 표시 원칙이다. Skill 추가, 삭제, 이름 변경, 호출 시점 변경이 생기면 README 표와 이 섹션을 같은 PR에서 함께 확인한다.

문서 구조 정책 검토나 manual 문서 중립성 판단은 그 자체로 별도 SKILL 호출 표시 대상이 아니다. 그 판단 결과로 이슈 등록, 타스크 시작, 단계 종료 같은 core Skill 절차를 실행할 때만 해당 Skill 호출 표시를 사용한다.

`task-final-report`는 필요한 최종 보고서와 검증 기록을 작성하고 게시 권한이 있을 때 위 PR 본문 검증 구조까지 맞춰 Open PR을 게시하는 절차다. 게시/commit 권한이 없어도 결과 기록은 계속하며 작은 독립 LOW에 이 Skill이나 PR을 강제하지 않는다.

설치·업데이트 lifecycle 판단 자체는 별도 하이퍼-워터폴 절차 호출 표시 대상이 아니다. 다만 그 결과로 GitHub Issue를 등록하거나 타스크를 시작하면 `task-register`, `task-start` 등 실제로 적용하는 core Skill의 호출 표시 원칙을 따른다.

## 관련 매뉴얼

- [`document_structure_guide.md`](document_structure_guide.md): 수행계획서, 단계 보고서, 최종 보고서 위치, 파일명, 중앙 템플릿 정책.
- [`git_workflow_guide.md`](git_workflow_guide.md): `local/taskN`, `publish/taskN`, `master` 브랜치 운용과 PR 게시.
- [`framework_lifecycle_guide.md`](framework_lifecycle_guide.md): 신규 적용, 기존 업데이트, 업데이트 PR 전환 기준.
- [`release_update_protocol.md`](release_update_protocol.md): release/tag와 update protocol.
- [`agent_code_hyperfall_rule_conflict.md`](agent_code_hyperfall_rule_conflict.md): 하이퍼-워터폴 규칙과 에이전트 기본 동작이 충돌하는 지점.
