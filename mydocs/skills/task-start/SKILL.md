---
name: task-start
description: |
  하이퍼-워터폴 타스크 시작 절차를 적용한다.
  위험과 Scope에 따라 기존 이슈·계획을 확인하고 필요한 경우에만
  브랜치, 오늘할일, 수행계획서를 준비한다.
  새 코드/문서 변경을 시작하기 전 진행 단계 정렬 용도.
---

# 하이퍼-워터폴 타스크 시작

## 트리거

- 작업지시자가 "이슈 #N 시작", "타스크 #N 진행"처럼 명시 지시한 경우
- 작업지시자가 본 SKILL을 직접 호출한 경우

## 실행 경로와 사전 조건

- `AGENTS.md`의 위험 기반 정책을 적용한다. 명확한 LOW/MEDIUM 요청은 해당 Scope 승인이다. HIGH 결정/행동과 큰 Scope 변경만 직전에 명시 승인하고, 같은 결정의 기존 승인 기록을 재사용한다.
- 작은 독립 LOW는 아래 준비 절차 전에 구현·검증·결과/제약 보고로 진행한다. 새 Issue·브랜치·오늘할일·계획/보고 파일·PR·형식 Stage나 자동 fetch/checkout/commit을 강제하지 않는다. 기존 Issue가 있으면 연결하고 명시 요청한 산출물은 작성한다.
- BMAD의 충분한 기존 계획을 참조·보완하고, Hyper-Waterfall은 상태·Evidence·검증·인계를 기록한다. 같은 계획을 재생성하지 않는다.
- unrelated dirty/untracked 자체는 차단하지 않는다. 실제 변경 겹침·소유권 분리 불가·branch/권한/metadata 충돌만 해당 작업을 보류하고 독립 안전 작업은 계속한다. 사용자 변경을 보존한다.
- 아래 절차 중 필요한 항목만 적용한다. 이슈 조회에는 이슈 번호와 `gh` 인증이 필요하며, 새 이슈 생성은 별도 `task-register` 권한을 확인한다.

## 절차

1. 기존 이슈가 있으면 정보 확인
   ```bash
   gh issue view {N} --json number,title,milestone,state,body
   ```
2. 새 작업 브랜치가 필요한 경우 기존 Git 권한과 사용자 변경 보호를 확인한 뒤 master 최신화
   ```bash
   git fetch origin
   git checkout master
   git pull --ff-only
   ```
3. 필요한 작업 브랜치 생성. 기존 적합한 브랜치를 재사용하고, 다른 작업자가 메인 worktree를 점유 중이면 분리 worktree 사용:
   ```bash
   # 단일 worktree
   git checkout -b local/task{N}

   # 분리 worktree (권장: 다른 에이전트 비간섭)
   git worktree add ../{repo}-task{N} -b local/task{N} origin/master
   ```
4. 추적이 필요한 경우 오늘할일 갱신: `mydocs/orders/{yyyymmdd}.md`에 행 추가
   - 출력 형식은 `mydocs/_templates/orders.md`를 기준으로 한다.
   - 형식: `| #{N} | {타스크 제목} | 진행중 | M{milestone}, 기존 계획 참조 또는 범위 내 계획 보완 |`
   - 적절한 마일스톤 섹션에 배치 (운영 작업은 "공통 — 운영 작업")
5. 기존 계획을 참조·보완하고 충분한 계획이 없을 때만 필요한 수행계획서 생성: `mydocs/plans/task_m{milestone}_{N}.md`
   - 중앙 템플릿 `mydocs/_templates/task_plan.md`를 기준으로 작성한다.
   - 템플릿을 읽을 수 없는 경우에만 다음 최소 섹션을 fallback으로 사용한다: 목적 / 배경 / Scope(포함·제외·수용 기준·제약) / 기존 계획 참조 / 설계 방향 / 예상 변경 파일 / 위험·복잡도·의존성에 필요한 단계 / 검증 계획 / 리스크 / 필요한 HIGH 결정 승인
   - Stage 수의 고정 최소/최대는 없다. 범위 내 계획·구현·검증·수정·기록은 응답 대기 없이 진행한다.
6. 변경 검증
   ```bash
   git status --short
   git diff --check
   ```
7. 기존 local commit 권한이 허용할 때만 자기 변경을 단일 커밋 (기록 작성 권한이 commit 권한을 부여하지 않음)
   - 아래 예시에서 실제 작성·변경한 파일만 staging한다. 기존 계획 참조만으로 새 파일이나 커밋을 만들지 않는다.
   ```bash
   git add mydocs/plans/task_m{milestone}_{N}.md mydocs/orders/{yyyymmdd}.md
   git commit -m "Task #{N}: 수행 계획서 작성과 오늘할일 갱신"
   ```
8. 계획 참조·상태·Evidence를 비차단 Checkpoint로 보고하고 Scope 내 실행을 계속한다. 핵심 요구가 불명확하면 해당 결정만 질문하고 HIGH 행동은 승인 전 보류한다.

## 검증

- 커밋했다면 `git log --oneline -1`이 해당 커밋 메시지를 보여야 한다
- 작성한 경우 오늘할일에 #{N} 행이 있고 수행계획서가 템플릿의 해당 필수 섹션을 채움
- 재사용한 계획과 생략한 산출물, 검증 결과·제약을 실제 수행 범위에 맞게 보고함

## 절대 하지 말 것

- 미승인 HIGH 결정/행동 또는 큰 Scope 변경 구현
- 실제 충돌·필수 권한 부족·검증 실패를 무시하거나 기존 finite safety cap·영속 counter·동일 실패 resume 누적·>5 blocked 종료를 우회
- 다른 작업자의 미커밋 변경 또는 다른 task 브랜치 working tree 건드리기

## 호출 방법

- Codex: `$task-start` 또는 `/skills` 메뉴에서 `task-start` 선택
- Claude Code: `/task-start`
