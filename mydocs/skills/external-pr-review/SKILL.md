---
name: external-pr-review
description: |
  외부 기여자 PR 검토 절차를 적용한다.
  PR 정보 수집, mydocs/pr/pr_{N}_review.md 작성, 검증, pr_{N}_report.md 작성,
  처리 완료 시 archives/ 이동을 수행한다. 외부 기여자 PR 전용 (내부 타스크에는 사용 금지).
---

# 외부 기여자 PR 검토

## 트리거

- 작업지시자가 "PR #N 리뷰" 또는 "외부 PR 검토"를 명시 지시한 경우
- 본 SKILL을 직접 호출한 경우

## 사전 조건

- 검토 대상 PR이 외부 기여자 fork에서 본 저장소 `master`(또는 합의된 base)로 열린 상태
- 내부 타스크 PR(`publish/task{N}`)에는 본 SKILL 사용 금지 — 내부 타스크는 일반 단계 절차로 검토
- `gh` CLI 인증
- 명확한 검토 요청의 Scope 안에서 안전한 검토·추가 검증·수정·기록은 자율 진행한다. 충분한 기존 계획을 참조·보완하며 같은 계획/결정 승인을 반복하지 않는다. 외부 게시·merge·close와 local commit 권한은 별개다.
- unrelated dirty/untracked는 보존한다. 실제 변경 겹침·소유권 분리 불가·branch/필수 권한/metadata 충돌만 해당 작업을 보류하고 독립 안전 검토는 계속한다.

## 절차

1. PR 메타 수집
   ```bash
   gh pr view {N} --json number,title,state,baseRefName,headRefName,headRepository,mergeable,mergeStateStatus,reviewDecision,labels,body
   gh pr diff {N}
   gh pr checks {N}
   ```
   - 이슈 연결, base/head, mergeable, CI 상태 모두 확인
2. 검토 문서 작성: `mydocs/pr/pr_{N}_review.md`
   - 중앙 템플릿 `mydocs/_templates/external_pr_review.md`를 기준으로 작성한다.
   - 템플릿을 읽을 수 없는 경우에만 다음 최소 섹션을 fallback으로 사용한다:
     - PR 정보 (번호, 작성자, base/head, 연결 이슈)
     - 변경 요약
     - 영향 범위와 호환성 (FFI, build, 문서)
     - 코드/문서 점검 결과
     - 검증 계획 (필요한 추가 검증)
     - 권고 (merge / 수정 요청 / 닫기)
     - Scope·검토 상태·Evidence·인계 및 필요한 HIGH/외부 게시 결정 승인
3. 검토 방향과 Evidence를 비차단 Checkpoint로 기록하고 Scope 내 안전 검토를 계속한다. HIGH 행동이나 큰 Scope 변경만 직전 명시 승인하며 같은 결정의 기존 승인을 재사용한다. Checkpoint는 human consent나 runtime 안전/정상 종료 HALT가 아니다.
4. 충분한 기존 계획을 참조·보완하고 필요 시에만 수정·검증 계획 문서 작성: `mydocs/pr/pr_{N}_review_impl.md`
   - 중앙 템플릿 `mydocs/_templates/external_pr_review_impl.md`를 기준으로 작성한다.
   - 본 저장소에서 추가 검증을 직접 수행할 때 사용
   - Scope 내 계획·추가 검증·안전 수정·기록은 응답 대기 없이 진행한다.
5. 검증 수행 (해당하는 경우만)
    - 검증은 변경 유형에 따라 Prompter의 기존 검증 지침을 적용한다: 관련 테스트를 우선 실행하고, 가능한 경우 `npm run typecheck`와 `npm run lint`를 실행하며, 해당하는 경우 `npm run build` 또는 `npm run test:smoke`를 실행한다.
    - 실패는 Scope 안에서 자율 수정·재검증하고 실패/미수행 Evidence를 남긴다. 실제 충돌·필수 권한 부족·해결 불가 실패와 기존 finite safety cap·영속 counter·동일 실패 resume 누적·counted review >5 blocked 종료는 유지하며 우회하지 않는다.
6. 최종 보고서 작성: `mydocs/pr/pr_{N}_report.md`
   - 중앙 템플릿 `mydocs/_templates/external_pr_report.md`를 기준으로 작성한다.
   - 검토 결과, 검증 결과, 최종 권고, GitHub PR 코멘트 본문(또는 링크)
   - local commit/외부 게시 권한이 없어도 기록한다. 미커밋·미게시·실패/검증 한계를 정확히 남긴다.
7. 작업지시자 승인 후 GitHub PR에 코멘트/리뷰 등록 (merge 결정은 작업지시자가 수행)
8. 승인된 외부 처리 완료 확인 후 자기 검토 문서만 보관 이동 (아래 `git mv`는 기존 staging 권한이 허용될 때만 사용하며, 미커밋 기록에도 같은 보관 위치를 적용)
   ```bash
   git mv mydocs/pr/pr_{N}_review.md mydocs/pr/archives/
   git mv mydocs/pr/pr_{N}_review_impl.md mydocs/pr/archives/  # 존재 시
   git mv mydocs/pr/pr_{N}_report.md mydocs/pr/archives/
   ```
9. 기존 local commit 권한이 허용할 때만 자기 변경을 단일 또는 단계별 커밋 (외부 PR 검토는 내부 단계 형식 강제 아님)
   ```bash
   git commit -m "PR #{N} 검토: {요약}"
   ```

## 검증

- `mydocs/pr/pr_{N}_review.md`가 `mydocs/_templates/external_pr_review.md`의 필수 섹션을 채움
- `mydocs/pr/pr_{N}_review_impl.md`를 작성했다면 `mydocs/_templates/external_pr_review_impl.md`의 필수 섹션을 채움
- `mydocs/pr/pr_{N}_report.md`가 `mydocs/_templates/external_pr_report.md`의 필수 섹션을 채움
- 권고 결정이 명시됨 (merge / 수정 / 닫기 중 하나)
- 처리 완료 후 작성된 PR 검토 문서가 `mydocs/pr/archives/`에 존재

## 절대 하지 말 것

- 내부 타스크 PR(`publish/task{N}`)에 본 SKILL 적용
- 외부 PR을 작업지시자 승인 없이 merge 또는 close
- 작업지시자 승인 없이 GitHub 코멘트/리뷰 게시, 기존 local commit 권한 확대 또는 사용자 변경 staging/되돌리기
- 외부 기여자 fork의 코드를 본 저장소에 직접 cherry-pick (PR 절차 생략)
- 내부 단계 절차(`_stage{N}.md`, `_report.md`) 형식을 외부 PR 문서에 강제 적용

## 호출 방법

- Codex: `$external-pr-review` 또는 `/skills` 메뉴
- Claude Code: `/external-pr-review`
