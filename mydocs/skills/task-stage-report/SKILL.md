---
name: task-stage-report
description: |
  하이퍼-워터폴 타스크의 단계 종료 절차를 적용한다.
  필요한 단계별 상태 보고서(`_stage{N}.md`) 작성, 권한이 있는 경우 단계 소스와 보고서 묶음 커밋,
  단계 검증 명령 실행을 수행한다. 한 단계가 끝나고 다음 단계 진입 직전에 호출.
---

# 하이퍼-워터폴 단계 종료 보고

## 트리거

- 작업지시자가 "Stage {N} 마무리", "단계 보고서 작성"을 명시 지시한 경우
- 본 SKILL을 직접 호출한 경우

## 사전 조건

- 요청의 Scope와 수용 기준이 명확하고 기존의 충분한 계획을 참조·보완함 (새 구현 계획서나 고정 Stage 수를 강제하지 않음)
- 작은 독립 LOW에는 본 절차를 강제하지 않으며 명시 요청된 보고서는 작성함
- 완료 기록은 현재 단계 작업과 검증이 끝났을 때만 작성함. 미완료/실패 Evidence 기록은 항상 가능함
- 브랜치와 local commit은 기존 Git 권한과 사용자 변경 보호 규칙을 따름

## 절차

1. 단계별 검증 명령 실행 (구현 계획서의 해당 단계 "검증" 섹션 그대로)
   - 결과를 보고서에 인용할 수 있도록 출력 보존
   - Scope 내 실패는 자율 수정·재검증한다. 실제 충돌·필수 권한 부족·해결 불가 실패는 해당 작업을 보류하고 기록한다. 기존 finite safety cap·영속 counter·동일 실패 resume 누적과 counted review >5 blocked 종료를 유지하며 우회하지 않는다.
2. 단계 보고서 작성: `mydocs/working/task_m{milestone}_{N}_stage{S}.md`
   - 중앙 템플릿 `mydocs/_templates/stage_report.md`를 기준으로 작성한다.
   - 템플릿을 읽을 수 없는 경우에만 다음 최소 섹션을 fallback으로 사용한다:
     - 단계 목적
     - 산출물 (파일 목록 + 라인 수 또는 요약)
     - 본문 변경 정도 / 본문 무손실 여부 (해당 시)
     - 검증 결과 (위 1번 출력 인용)
     - 잔여 위험
     - 다음 단계 영향
     - 다음 단계 상태·Evidence·인계 및 필요한 HIGH 결정 승인 (일반 Stage 전환은 비차단)
3. 변경 점검
   ```bash
   git status --short
   git diff --check
   ```
4. 기존 local commit 권한이 허용할 때만 자기 단계 소스 + 보고서 묶음 커밋. 권한이 없어도 보고서/Evidence는 작성하고 미커밋 상태를 기록한다.
   ```bash
   git add {단계 산출 파일들} mydocs/working/task_m{milestone}_{N}_stage{S}.md
   git commit -m "Task #{N} Stage {S}: {핵심 내용 요약}"
   ```
   - 하위 단계: `Task #{N} [Stage {S.M}]: 내용`
   - 최종 단계 + 최종 보고서 묶음: `Task #{N} Stage {S} + 최종 보고서: 내용` (이 경우 별도 SKILL `task-final-report`로 처리 권장)
5. 단계 보고서와 검증 결과를 비차단 Checkpoint로 보고하고 Scope 내 다음 단계로 진행한다. HIGH 행동/큰 Scope 변경만 직전에 명시 승인하며 같은 결정의 기존 승인을 재사용한다. Checkpoint는 human consent나 runtime 안전/정상 종료 HALT가 아니다.

## 검증

- 커밋했다면 `git log --oneline -1`이 단계 커밋 메시지 표준 형식 충족
- `mydocs/working/task_m{milestone}_{N}_stage{S}.md` 존재
- 단계 보고서가 `mydocs/_templates/stage_report.md`의 필수 섹션을 채움
- 완료 판정에는 단계별 검증 통과가 필요함 (실패 시 미완료로 기록하고 실패·수정·미검증 Evidence를 남김)

## 절대 하지 말 것

- 검증 실패를 완료/통과로 기록하거나 실패 상태에서 완료 커밋
- 단계 산출물과 보고서를 분리해 별도 커밋 (한 단계는 한 커밋 원칙)
- 미승인 HIGH 행동/큰 Scope 변경 진행 또는 실제 충돌·실패·safety HALT 우회

## 호출 방법

- Codex: `$task-stage-report` 또는 `/skills` 메뉴
- Claude Code: `/task-stage-report`
