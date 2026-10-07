# Task #35 Stage 1 보고서 — v0.1.2 버전·signed 배포 계약 정합화

GitHub Issue: [#35](https://github.com/jinzer0/Prompter/issues/35)
구현계획서: [task_m012_35_impl.md](../plans/task_m012_35_impl.md)
Stage: 1

## 단계 목적 및 승인

작업지시자의 “구현계획 및 Stage 1 — v0.1.2 버전·배포 계약·회귀 테스트 정합화 실행 승인”에 따라 버전과 기존 signed 경로·fixture·안내를 준비했다. 작업은 전용 Prompter-task35 / local/task35에서 수행했다. Stage 2 전체 gates, 실제 Apple 제출, 원격 push/PR/merge 및 tag/Release/배포는 실행하지 않았다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| package.json, package-lock.json | 프로젝트/root package 버전만 0.1.2. dependency·script·allowScripts 그대로 |
| scripts/macos/release-version-preflight.mjs, release-support.mjs | signed 허용 버전은 정확히 0.1.2, legacy 0.1.1 허용 없음 |
| tests/macos-release-contract.test.ts | production 0.1.2 및 한국어 trust 안내 계약 |
| tests/support/macos-coordinator-fixtures.mjs, macos-coordinator-support.mjs, macos-package-fixtures.mjs | signed 정상 fixture·candidate/evidence/asset 및 mutation sentinel 경로 정합화 |
| tests/package-macos-coordinator-boundaries.test.mjs | legacy/future/빈/blank/prefix/number/null/boolean/object/array와 missing version 거절, 외부 명령·candidate 생성 및 npm build/downstream mutation 부재 |
| coordinator app-recovery/artifact-drift/cached-accepted/dmg-app-refresh/dmg-recovery/final-receipts/signing-fingerprint-recovery/signing-target-recovery/success 테스트 | 기존 재개·드리프트·소유권·서명·receipt 의미 유지하며 signed 0.1.2 경로/파일명 갱신 |
| README.md | maintainer 준비 설명 0.1.2 및 #35 경계, 공개 설치 v0.1.1 유지 |
| docs/release-macos.md | 한국어 maintainer 안내, 0.1.2 정확한 gate/경로 및 과거 #6/#7과 현재 #35의 승인 경계 구분 |
| docs/qa-checklist.md | 후보/ZIP/DMG/evidence/plist 버전 정합화, 제품 UX 항목 유지 |
| mydocs/orders/20261007.md 및 이 보고 | 승인·Stage 1 결과·다음 승인 대기 |

## 본문 변경 정도 / 동작 보존

- 기존 exact-version 숫자만 변경하며 coordinator trust/ARM64/clean worktree/symlink/소유권/notary Accepted-log/재개/rollback 자체 로직은 변경하지 않았다.
- package/lockfile을 JSON 비교하여 root version 두 곳 외 dependency resolution·스크립트 변경 없음을 확인했다.
- 일반 assembleMacOSApp/plist/archive 및 ZIP staple 거절 예제의 0.1.1은 실제 signed gate가 아닌 임의 fixture 입력이므로 유지했다. 무차별 문자열 치환은 하지 않았다.
- release guide는 한국어로 정리하되 credential 비기록·trust 경로·별도 app/DMG 공증·receipt schema·재개 시 Accepted 재확인·checksum/allowlist 경계를 유지했다.
- 새 공식 문서 생성/이동 없이 승인된 기존 README/docs 위치만 수정했다. docs/plan/plan.md 및 docs/draft는 변경하지 않았다.
- 원본 master tracked 변경 없음과 사용자 BMAD/미추적 자료 보존을 확인했다.

## 검증 결과

실행 명령:

```bash
npm ci
# union 변경 code/json 17파일에 Biome format 1회
./node_modules/.bin/vitest run tests/macos-release-contract.test.ts tests/package-macos-*.test.mjs
npm run electron:install
npm run native:node
./node_modules/.bin/vitest run tests/macos-release-contract.test.ts tests/package-macos-*.test.mjs
npm run typecheck
npm run lint
git diff --check
```

- 최초 focused 실행: **30파일 중 2실패, 319개 중 2실패**. npm ci 후 Electron.app 설치가 없어 실제 설치 프레임워크 발견 및 production staging fixture prerequisite가 실패했다. 제품 gate/fixture 오류로 숨기거나 테스트를 제거하지 않았다.
- 기존 electron:install/native:node 스크립트로 설치·native prerequisites를 준비한 뒤 동일 focused union 재실행: **30파일/319개 모두 PASS**.
- typecheck: Electron/renderer/tests 모두 PASS.
- lint: **597파일**, fixes 없음, deprecated info 1건 유지, exit 0.
- diff-check: PASS. 변경 union formatter는 상위 인스턴스가 1회 수행했다. 하위 구현 에이전트는 gates/formatter/native rebuild를 실행하지 않았다.
- npm install-script 정책에 의한 esbuild/fsevents 6 package 차단·deprecated 경고, native 컴파일 경고, Biome recommended deprecated info는 유지했다. 허용 정책을 완화하지 않았다.
- focused 테스트는 synthetic Apple runner와 read-only binary discovery 근거다. 실제 Developer ID 서명·Apple 제출·공증 성공을 주장하지 않는다.

## 잔여 위험

- 의존성 PR은 보류, 기존 취약점 위험 미해소. 안전성/해소를 주장하지 않는다.
- 전체 Vitest/fresh build/Electron smoke는 Stage 2 승인 후 실행한다. 이번 focused 통과는 이를 대체하지 않는다.
- actual signing inputs/Keychain/notary 가용성 및 설치 손동작은 아직 확인하지 않았다. 후보 ZIP/DMG/receipt는 생성하지 않았다.
- 공개 README 설치 링크는 실제 v0.1.1이며 v0.1.2 게시 완료를 주장하지 않는다.

## 다음 단계 영향 및 승인 요청

Stage 1 산출물·검증 결과 승인과 Stage 2의 typecheck/lint/전체 Vitest/fresh build/전체 Electron smoke 실행 승인을 요청한다. Stage 2 보고를 commit한 뒤 Stage 3 별도 승인에서 실제 후보 source commit을 고정한다. Apple 제출·공개 tag/Release/upload는 각 후속 단계의 별도 승인까지 실행하지 않는다.
