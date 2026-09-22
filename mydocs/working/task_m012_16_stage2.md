# Task #16 Stage 2 보고서 — 반복 스타일 primitive 적용

## 변경

- backup export/import 및 backup panel parts의 반복 muted surface 일부를 `MutedWell`로 교체했다.
- 반복 helper copy 일부를 `HelperText`로, mono metadata label 일부를 `MetaLabel`로 교체했다.
- `dt/dd`, `label`, `output` 등 기존 semantic 구조는 유지했다.

## 검증

- `npm run typecheck` 통과.
- `npm run lint` 통과. 기존 Biome config deprecation info만 출력됐다.
- `git diff --check` 통과.
