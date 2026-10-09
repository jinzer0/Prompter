# 단계 보고서 템플릿

이 파일은 필요한 `mydocs/working/task_{milestone}_{issue}_stage{stage}.md` 작성용 중앙 템플릿이다. 단계 보고서는 구현·검증·Evidence·잔여 위험·인계의 비차단 Checkpoint다. AGENTS 정책에 따라 작은 독립 LOW에는 형식 Stage/파일을 강제하지 않고 검증·결과·제약을 보고한다. 충분한 기존 기록은 참조하며 없는 계획/Issue 링크는 생략한다. 명시 산출물 요청은 이행한다.

GitHub Issue: [#{issue}](https://github.com/jinzer0/Prompter/issues/{issue})
구현계획서: [`task_{milestone}_{issue}_impl.md`](../plans/task_{milestone}_{issue}_impl.md)
Stage: {stage}

## 단계 목적

{이번 Stage가 해결하려던 목적과 구현계획서상 위치를 적는다.}

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `{path}` | {변경 요약} |

## 본문 변경 정도 / 본문 무손실 여부

{문서 작업이면 원문 보존 여부와 재작성 범위를 적는다. 코드 작업이면 해당 없음 또는 API/동작 보존 여부를 적는다.}

## 검증 결과

실행 명령:

```bash
{검증 명령}
```

결과:

- {OK/MISS와 핵심 출력 요약}

## 잔여 위험

- {남은 위험. 없으면 `없음`으로 적는다.}

## 다음 단계 영향

- {다음 Stage에서 이어받아야 할 맥락. 없으면 `없음`으로 적는다.}

## 상태 / 위험 결정

- Stage {stage} 검증 완료와 Evidence 기록 후 Scope 안 다음 단계는 자율 진행한다. 실패/미검증을 완료로 기록하지 않는다.
- HIGH/큰 Scope 결정만 행동 직전 명시 승인하고 기존 동일 결정 승인을 참조한다. 미승인/거절 행동만 보류하고 독립 안전 작업은 계속한다.
- 기존 finite safety cap·counter·실패 resume·blocked 종료를 보존한다. 기록 자체는 local commit/게시/Merge/Release 권한이 아니다.
