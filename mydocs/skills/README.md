# `skills/` 폴더 규칙

## 목적

Codex와 Claude Code가 호출하는 하이퍼-워터폴 Skill 본문을 보관한다.

## 답하는 질문

"정형 절차를 수행할 때 어떤 순서와 검증을 따라야 하는가?"

## 작성 시점

task 시작, 단계 종료, 최종 보고, PR merge cleanup, 외부 PR 검토 같은 정형 절차가 바뀔 때.

## 허용 파일명

`mydocs/skills/{skill-name}/SKILL.md`

## 사용 템플릿

Skill 본문은 도구별 Skill 형식을 따른다. 산출물 문서를 만들 때는 `mydocs/_templates/`의 해당 템플릿을 참조한다.

## 적용 조건과 승인 경계

- `AGENTS.md`의 위험 기반 정책을 따른다. 명확한 LOW/MEDIUM 요청은 해당 Scope 승인으로, 범위 내 계획·구현·검증·리뷰·수정·기록·Stage 전환은 응답 대기 없이 진행한다.
- 작은 독립 LOW는 검증·결과/제약 보고로 충분하다. 새 Issue·브랜치·오늘할일·계획/보고 파일·PR·형식 Stage나 자동 Git 작업을 강제하지 않는다. 기존 Issue가 있으면 연결하고 명시 요청된 산출물은 작성한다.
- BMAD의 충분한 기존 계획을 참조·보완하고 Hyper-Waterfall은 상태·Evidence·검증·인계를 기록한다. 같은 계획/승인 문서를 재생성하지 않고 필요한 기존 기록만 연결한다. Stage 수의 고정 최소/최대는 없다.
- Checkpoint는 비차단 기록이며 human consent나 runtime 안전/정상 종료 HALT가 아니다. HIGH 결정/행동과 큰 Scope 변경만 직전에 명시 승인하고 같은 결정의 기존 승인 기록을 재사용한다.
- Issue 생성, local commit, 원격 push·PR·코멘트/리뷰 게시, merge·close·release 및 강제 Git 작업은 기존 각 Skill/프로젝트 권한을 그대로 따른다. Scope 승인이나 문서 작성 권한이 이를 확대하지 않는다. milestone/label 제한도 유지한다.
- 결과/Evidence 기록은 commit/게시 허가와 독립적으로 수행하고 미커밋·미게시·실패·미검증을 정확히 남긴다. 실제 충돌·필수 권한 부족·해결 불가 실패와 기존 finite safety cap·영속 counter·동일 실패 resume 누적·counted review >5 blocked 종료는 우회하지 않는다.
- unrelated dirty/untracked는 보존하며 실제 변경 겹침·소유권 분리 불가·branch/권한/metadata 충돌만 해당 작업을 보류한다. 사용자 변경을 staging·되돌리지 않는다.

## 반드시 포함할 내용

- 트리거
- 사전 조건
- 절차
- 검증
- 절대 하지 말 것
- 호출 방법

## 두면 안 되는 내용

- 특정 task 결과
- 특정 모델 전용 장황한 프롬프트
- 다른 Skill과 충돌하는 절차

## 다음 세션 AI가 복원해야 할 맥락

언제 어떤 Skill을 호출하고, 어떤 산출물을 어떤 템플릿으로 만들어야 하는지.

## 인식 경로

- 진실 원천: `mydocs/skills/{skill-name}/SKILL.md`
- Codex 인식 경로: `.agents/skills/` (저장소 루트 심볼릭 링크 -> `mydocs/skills`)
- Claude Code 인식 경로: `.claude/skills/` (저장소 루트 심볼릭 링크 -> `mydocs/skills`)
