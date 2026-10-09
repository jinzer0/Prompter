# `working/` 폴더 규칙

## 목적

필요한 Stage의 상태·검증·Evidence를 기록하고 다음 단계에 인계한다.

## 답하는 질문

- "어디까지 했는가?"
- "검증은 통과했는가?"
- "다음 단계에 어떤 영향을 주는가?"

## 작성 시점

필요한 Stage 구현과 검증 후 다음 단계로 넘어갈 때 비차단 Checkpoint로 작성한다.
실패·차단·미검증 Evidence도 기록하되 완료로 선언하지 않는다. `AGENTS.md`의
위험 기반 정책에 따라 명확한 Scope 안의 검증·수정·기록·Stage 전환은 응답 대기 없이
진행하며, HIGH 결정/행동이나 큰 Scope 변경만 직전에 명시 승인한다. 같은 결정의
기존 승인 기록을 재사용한다.

작은 독립 LOW에는 형식 Stage나 별도 보고 파일을 강제하지 않는다. 검증·결과/제약을
보고하고 기존 Issue가 있으면 연결하며 명시 요청된 산출물은 작성한다. 충분한 기존
계획을 참조하고 존재하는 필요한 기록만 연결한다. Stage 수의 고정 최소/최대는 없다.

## 허용 파일명

`task_{milestone}_{이슈번호}_stage{N}.md`

## 사용 템플릿

`mydocs/_templates/stage_report.md`

## 반드시 포함할 내용

- 단계 목적
- 산출물
- 본문 변경 정도 또는 무손실 여부
- 검증 결과
- 잔여 위험
- 다음 단계 영향
- Scope·상태·Evidence·인계 및 필요한 HIGH 결정 승인 (해당 시)

## 두면 안 되는 내용

- 최종 결과보고서
- 아직 검증 실패인 단계의 완료 선언
- 미승인 HIGH 결정/행동이나 큰 Scope 변경 (범위 내 계획 보완은 자율)
- 실제 충돌·필수 권한 부족·실패 또는 runtime safety HALT를 완료로 위장한 기록

## 다음 세션 AI가 복원해야 할 맥락

마지막 단계의 실제 상태와 검증 Evidence, 남은 위험, 다음 단계에서 이어받을 조건,
필요한 결정의 승인 근거. Checkpoint는 human consent나 runtime 안전/정상 종료 HALT가
아니다. 기존 finite safety cap·영속 counter·동일 실패 resume 누적·counted review >5
blocked 종료를 유지한다. 보고서 작성과 local commit·원격 게시 권한은 별개이며,
권한이 없어도 Evidence를 남기고 사용자 변경을 보존한다.
