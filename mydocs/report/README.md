# `report/` 폴더 규칙

## 목적

task 전체의 계획-실행-검증 사이클을 닫고 장기 보관한다.

## 답하는 질문

- "결과가 무엇인가?"
- "수용 기준을 만족했는가?"
- "무엇이 남았는가?"

## 작성 시점

task 결과와 수용 기준별 검증 상태를 정리할 때 작성한다. 완료 선언과 PR 생성에는
통합 검증 통과가 필요하지만 실패·차단·미검증 결과도 정확히 기록한다. 형식 Stage나
단계 보고서 커밋을 일률적인 사전 조건으로 두지 않는다.

`AGENTS.md`의 위험 기반 정책에 따라 명확한 Scope 내 검증·수정·결과/Evidence 기록은
비차단이다. local commit 허가나 원격 push/PR 승인 부재로 기록을 중단하지 않는다.
최종 local commit은 기존 명시 승인 권한을 별도로 확인하며, 원격 push·PR 생성도
해당 행동의 명시 승인 후 수행한다. 같은 결정의 기존 승인 기록은 재사용한다.
HIGH 결정/행동·큰 Scope 변경과 기존 merge/close/release 권한 경계는 유지한다.

작은 독립 LOW는 검증·결과/제약 보고로 충분하며 별도 최종 보고 파일이나 PR을
강제하지 않는다. 기존 Issue가 있으면 연결하고 명시 요청한 산출물은 작성한다.
충분한 기존 계획을 참조하고 존재하는 필요한 계획·Stage·Evidence만 연결하며,
없는 기록을 PR 때문에 만들거나 가짜 링크를 남기지 않는다.

## 허용 파일명

`task_{milestone}_{이슈번호}_report.md`

## 사용 템플릿

`mydocs/_templates/final_report.md`

## 반드시 포함할 내용

- 작업 요약
- 변경 파일 목록과 영향 범위
- 변경 전후 비교
- 검증 결과
- 잔여 위험과 후속 작업
- Scope·최종 상태·Evidence·인계 및 필요한 HIGH/게시 결정 승인 (해당 시)
- 미커밋·미게시 상태와 검증 실패·미수행·제약 (해당 시)

## 두면 안 되는 내용

- 진행 중 단계 보고
- 미검증 결과의 완료 선언
- PR 리뷰 화면용 짧은 본문만 있는 문서

## 다음 세션 AI가 복원해야 할 맥락

task의 실제 최종 상태, merge 전 검증 근거, 후속 작업 후보와 승인/권한 상태.
Checkpoint는 human consent나 runtime 안전/정상 종료 HALT가 아니다. 실제 충돌·실패와
기존 finite safety cap·영속 counter·동일 실패 resume 누적·counted review >5 blocked
종료를 유지한다. unrelated dirty/untracked를 보존하며 전체 clean tree를 정상 종료의
일률 조건으로 두지 않는다.
