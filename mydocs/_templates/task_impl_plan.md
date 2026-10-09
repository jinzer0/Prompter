# 구현계획서 템플릿

이 파일은 필요한 `mydocs/plans/task_{milestone}_{issue}_impl.md` 작성용 중앙 템플릿이다. 충분한 기존 계획을 참조·보완하며 중복 생성하지 않는다. 작은 독립 LOW에는 이 파일·Issue·브랜치·Stage·PR를 강제하지 않고 검증·결과·제약을 보고한다. AGENTS 정책에 따라 명확한 MEDIUM Scope 실행/기록은 비차단이며 HIGH/큰 Scope 결정만 직전 명시 승인한다. 명시 산출물 요청은 이행한다.

수행계획서: [`task_{milestone}_{issue}.md`](task_{milestone}_{issue}.md)
GitHub Issue: [#{issue}](https://github.com/jinzer0/Prompter/issues/{issue})
마일스톤: M{milestone}

## 단계 개요

아래 Stage 1~3은 선택 예시다. 고정 최소/최대 수 없이 복잡도·위험·의존성·검증 경계에 필요한 Stage와 행만 남긴다. 존재하는 계획/Issue만 링크한다.

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | {제목} | `{path}` | `{검증 요약}` |
| 2 | {제목} | `{path}` | `{검증 요약}` |
| 3 | {제목} | `{path}` | `{검증 요약}` |

## 문서 위치 확인

수행계획서의 "문서 위치 판단"과 실제 Stage 산출물 경로가 일치하는지 확인한다. 문서 생성/이동/수정이 없으면 `해당 없음`과 이유를 적는다.

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| `{path 또는 해당 없음}` | `{path}` | `{path}` | OK/MISS | {Scope 안 보정은 기록, 새 루트/큰 Scope 결정은 승인} |

## Stage 1 — {제목}

### 산출물

신규:

- `{path}`

수정:

- `{path}`

### 변경 내용

- {구체적으로 무엇을 만들거나 고칠지 적는다.}

### 검증

```bash
{검증 명령}
git diff --check
```

### 커밋

```text
Task #{issue} Stage 1: {핵심 내용 요약}
```

## Stage 2 — {제목}

### 산출물

- `{path}`

### 변경 내용

- {구체적으로 무엇을 만들거나 고칠지 적는다.}

### 검증

```bash
{검증 명령}
git diff --check
```

### 커밋

```text
Task #{issue} Stage 2: {핵심 내용 요약}
```

## Stage 3 — {제목}

### 산출물

- `{path}`

### 변경 내용

- {구체적으로 무엇을 만들거나 고칠지 적는다.}

### 검증

```bash
{검증 명령}
git diff --check
```

### 커밋

```text
Task #{issue} Stage 3: {핵심 내용 요약}
```

## 검증

- 각 Stage 검증 명령은 단계 보고서 작성 전에 실행한다.
- 실패한 검증은 단계 완료로 처리하지 않는다.
- Scope 안 계획/tasks·문서 위치 보정과 실패 수정·재검증은 기존 계획/Evidence에 기록하며 자율 진행한다. HIGH/큰 Scope 이탈만 해당 결정 직전 승인한다.
- 기존 finite safety cap·영속 counter·동일 실패 resume 누적·blocked 원인/검증 미완료 Evidence와 실제 실패 종료는 유지한다. plan 삭제/counter reset으로 우회하지 않는다.

## 커밋

- local commit은 기존 별도 권한이 있을 때 자기 변경과 실제 존재하는 단계 기록만 묶는다. 권한이 없어도 검증/결과 기록은 수행하고 미커밋 상태를 보고한다. 원격 게시·Merge·Release 권한은 확대하지 않는다.
- 커밋 메시지는 `Task #{issue} Stage {N}: {핵심 내용 요약}` 형식을 따른다.

## 단계 의존성

- Stage 2는 Stage 1의 산출물 확정 후 진행한다.
- Stage 3이 필요한 경우 Stage 2의 검증과 비차단 Evidence 기록 후 진행한다. Stage 완료 자체는 승인 사유가 아니다.

## 위험과 대응

- **{리스크 이름}**: {대응}

## 위험 결정 / 승인 기록

- {HIGH/큰 Scope 결정·범위·근거·승인 기록 참조. 일반 Stage/검증/수정/기록은 승인 대기 없음. 미승인/거절 행동만 보류하고 독립 안전 작업 계속.}
