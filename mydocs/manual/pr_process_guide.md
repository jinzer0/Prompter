# PR 처리 가이드

## 목적

이 문서는 `Prompter` 저장소의 PR 처리 절차를 찾기 위한 entrypoint다. 내부 task PR 작성, PR 생성 명령, 외부 기여자 PR 검토는 역할별 세부 문서를 따른다.

브랜치 흐름과 merge 전략은 [`git_workflow_guide.md`](git_workflow_guide.md)를 따른다.

## 범위

- 내부 task PR 본문 작성 기준 안내
- PR 생성 명령과 문서 링크 규칙 안내
- 외부 기여 PR 검토 절차 안내
- 검토 완료 후 아카이브 위치 안내

## 기본 원칙

- 내부 task PR 본문은 `.github/pull_request_template.md`를 따른다.
- 내부 task PR 본문은 실제 결과·검증·제약의 요약으로 작성하고 최종 결과 보고서가 있으면 이를 압축한다.
- PR 본문에는 실제 실행한 검증만 적고, 명령 나열이 아니라 검증 결과 요약과 근거를 함께 남긴다.
- 현재 PR이 직접 수행하는 issue는 `대상 타스크`에 적는다.
- `관련 이슈`는 선행, 후속, Epic, upstream, 참고 PR/issue처럼 PR 이해에 필요한 맥락을 적는다.
- 외부 기여 PR은 코드 변경과 문서 변경을 함께 검토한다.
- 별도 외부 PR 검토 파일이 필요한 경우 `mydocs/pr/` 위치·명명을 사용하고 충분한 기존 계획/검토/승인 기록을 참조·보완한다.
- 검토 문서는 재현 가능해야 하며, 실행한 검증 명령/결과를 포함한다.
- 작은 독립 LOW는 검증·결과·제약 보고만으로 충분하며 계획/Stage/보고 파일이나 PR을 강제하지 않는다. 명시 요청된 산출물은 작성한다. PR 본문에는 실제 존재하는 기록만 링크하고 생략한 계획/Stage의 가짜 링크를 만들지 않는다.
- 명확한 MEDIUM 요청은 Scope 승인이다. 범위 내 검토·계획·추가 검증·수정·기록·Stage 전환과 Checkpoint는 응답 대기 없이 진행한다. HIGH 결정/행동·큰 Scope 확장만 명시 승인받고 미승인/거절 행동과 의존 작업만 보류하며 독립 안전 작업은 계속한다.
- GitHub 코멘트/리뷰·PR 게시·merge·close 및 기존 local commit·브랜치·rebase/merge recovery·강제 삭제·release 권한은 별도다. 검토 권고나 결과 기록이 이를 확대하지 않으며 기존 runtime cap·누적 resume·blocked 규칙도 유지한다.

## 세부 문서

| 주제 | 문서 | 사용 시점 |
|---|---|---|
| 내부 task PR 본문 작성 | [`internal_pr_guide.md`](internal_pr_guide.md) | 게시 권한에 따라 `master` 대상 Open PR 본문을 작성할 때. 존재하는 결과 기록만 참조 |
| PR 생성 명령과 문서 링크 | [`pr_command_guide.md`](pr_command_guide.md) | `publish/task{번호}` push, `gh pr create`, PR 본문 문서 링크를 만들 때 |
| 외부 기여자 PR 검토 | [`external_pr_review_guide.md`](external_pr_review_guide.md) | 외부 contributor fork PR을 검토하고 `mydocs/pr/` 문서를 남길 때 |

## 내부 task와 외부 PR 경계

- 내부 task PR은 기존 GitHub Issue와 `local/task{번호}`/`publish/task{번호}` 브랜치 정책을 따르며 실제 존재하는 수행/구현계획·단계/최종 결과·Evidence만 참조한다.
- 외부 기여자 PR은 내부 task 단계 문서 형식을 강제하지 않는다. 필요한 기록에 `mydocs/pr/`의 `pr_{번호}_review.md`, `pr_{번호}_review_impl.md`, `pr_{번호}_report.md` 형식을 적용하며 충분한 기존 기록을 재사용한다.
- 외부 PR 검토 중 내부 후속 수정은 규모·위험·의존성에 따라 별도 Issue 추적/내부 task 분리를 판단한다. 작은 독립 LOW에는 새 Issue나 파일을 강제하지 않으며 원격 Issue 생성은 기존 게시 권한을 따른다.

## 머지 전후 확인

내부 task PR의 merge 전후 정리는 [`task-final-report`](../skills/task-final-report/SKILL.md), [`pr-merge-cleanup`](../skills/pr-merge-cleanup/SKILL.md), [`pr_command_guide.md`](pr_command_guide.md)를 따른다.

외부 기여 PR의 검토, 최종 권고, 아카이브는 [`external_pr_review_guide.md`](external_pr_review_guide.md)와 [`external-pr-review`](../skills/external-pr-review/SKILL.md)를 따른다.

## 관련 매뉴얼

- [`git_workflow_guide.md`](git_workflow_guide.md): 브랜치 흐름과 merge 전략.
- [`task_workflow_guide.md`](task_workflow_guide.md): 내부 task의 수행, 구현, 단계 보고, 최종 보고 흐름.
- [`document_structure_guide.md`](document_structure_guide.md): `mydocs/pr/`, `working/`, `report/` 폴더 경계.
