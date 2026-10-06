---
name: Prompter
description: 코딩·에이전트 프롬프트의 탐색과 편집을 우선하는 macOS 네이티브 작업 공간
status: final
updated: 2026-10-05
sources:
  - https://github.com/jinzer0/Prompter/issues/31
  - https://github.com/erictli/scratch
  - mydocs/plans/task_m012_31.md
colors:
  shell-light: '#f7f8f8'
  shell-dark: '#08090a'
  panel-light: '#ffffff'
  panel-dark: '#0f1011'
  raised-light: '#f3f4f5'
  raised-dark: '#191a1b'
  muted-panel-light: '#e9eaec'
  muted-panel-dark: '#141516'
  primary-light: '#08090a'
  primary-dark: '#f7f8f8'
  secondary-light: '#62666d'
  secondary-dark: '#d0d6e0'
  tertiary-light: '#8a8f98'
  tertiary-dark: '#8a8f98'
  border-subtle-light: '#d0d6e0'
  border-subtle-dark: '#ffffff0d'
  border-light: '#bfc4cd'
  border-dark: '#ffffff14'
  accent-light: '#5e6ad2'
  accent-dark: '#7170ff'
  accent-hover-light: '#4f5bc5'
  accent-hover-dark: '#828fff'
  tint-light: '#5e6ad214'
  tint-dark: '#7170ff1a'
  success-light: '#16833a'
  success-dark: '#27a644'
typography:
  body: { fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Segoe UI", sans-serif', fontSize: 14px, fontWeight: '400', lineHeight: '1.5', letterSpacing: '0' }
  title: { fontSize: 24px, fontWeight: '510', lineHeight: '1.25', letterSpacing: '-0.012em' }
  section: { fontSize: 16px, fontWeight: '590', lineHeight: '1.35', letterSpacing: '-0.006em' }
  label: { fontSize: 14px, fontWeight: '590', lineHeight: '1.4', letterSpacing: '0' }
  caption: { fontSize: 12px, fontWeight: '510', lineHeight: '1.4', letterSpacing: '0.02em' }
  micro: { fontSize: 11px, fontWeight: '510', lineHeight: '1.35', letterSpacing: '0.06em' }
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14px, lineHeight: '1.5' }
rounded:
  sm: 4px
  md: 5px
  lg: 10px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
components:
  Button: { backgroundLight: '{colors.tint-light}', backgroundDark: '{colors.tint-dark}', foregroundLight: '{colors.primary-light}', foregroundDark: '{colors.primary-dark}', radius: '{rounded.md}', paddingInline: '{spacing.3}' }
  Input: { radius: '{rounded.md}', paddingInline: '{spacing.3}', fontSize: '{typography.body.fontSize}' }
  Textarea: { radius: '{rounded.md}', padding: '{spacing.4}', fontSize: '{typography.body.fontSize}' }
  Badge: { radius: '{rounded.full}', paddingInline: '{spacing.2}' }
  Select: { radius: '{rounded.md}', paddingInline: '{spacing.3}' }
  Card: { radius: '{rounded.sm}', padding: '{spacing.4}' }
  Tabs: { radius: '{rounded.md}', paddingInline: '{spacing.3}' }
  Empty State: { padding: '{spacing.4}', foregroundLight: '{colors.secondary-light}', foregroundDark: '{colors.secondary-dark}' }
  SidebarItem: { radius: '{rounded.md}', paddingInline: '{spacing.3}' }
  Panel: { backgroundLight: '{colors.panel-light}', backgroundDark: '{colors.panel-dark}', padding: '{spacing.4}' }
  Alert Dialog: { radius: '{rounded.lg}', padding: '{spacing.6}' }
  Privacy Finding List: { gap: '{spacing.3}', padding: '{spacing.4}' }
  Window Chrome: { backgroundLight: '{colors.raised-light}', backgroundDark: '{colors.raised-dark}' }
  Prompt Row: { padding: '{spacing.4}', foregroundLight: '{colors.primary-light}', foregroundDark: '{colors.primary-dark}' }
  Prompt Editor: { gap: '{spacing.2}', padding: '{spacing.6}' }
  Compiler: { padding: '{spacing.6}', backgroundLight: '{colors.shell-light}', backgroundDark: '{colors.shell-dark}' }
  Settings Row: { paddingBlock: '{spacing.4}', gap: '{spacing.6}' }
---

## Brand & Style

조용하고 조밀한 네이티브 도구다. 웹페이지처럼 창 안에 큰 카드를 띄우지 않고 제목 막대·도구 막대·내용을 연속된 표면으로 읽게 한다. Scratch에서는 창 통합감만 참고하며 기능·색·맞춤 창 버튼을 복제하지 않는다.

Issue31에서 승인된 A안은 **사이드바 / 목록 / 오른쪽 본문+컴파일러**다. 오른쪽 상단은 선택한 프롬프트의 현재 본문·복사·새 버전 저장, 하단은 보조 컴파일러다. 행동 계약은 [EXPERIENCE](docs/ux/EXPERIENCE.md), 단계·범위 근거는 [승인 계획](mydocs/plans/task_m012_31.md)에 둔다. 여기서 계획을 재서술하지 않는다.

이 문서는 승인된 UX 방향의 구현 기준이며 기능 구현·출시 완료 선언이 아니다. 시각 기준은 이 파일, 행동 기준은 EXPERIENCE가 소유한다. 계약과 정적 시안이 충돌하면 계약을 우선한다.

## Colors

모든 색은 기존 팔레트에서 상속한다. `-light`/`-dark`는 동등한 역할의 쌍이다. 반투명 테두리·강조 배경은 기존 RGBA를 8자리 hex로 표기했다(알파 0.05→0d, 0.08→14, 0.10→1a의 8비트 반올림). 새 색상 계열을 추가하지 않는다.

| 역할 | 사용 규칙 |
|---|---|
| shell / panel | 창 바탕과 본문을 구분한다. 테마 전환 시 둘 다 적용하고 본문만 밝게 바꾸지 않는다. |
| raised / muted-panel | 탐색·입력·읽기 전용 영역의 단계 차이다. 장식용 카드 층을 만들지 않는다. |
| primary / secondary | 본문·버튼은 primary, 설명·메타데이터·placeholder는 secondary를 쓴다. |
| tertiary | 비필수 장식·비활성 표현에만 제한한다. 필수 안내나 작은 일반 텍스트에 쓰지 않는다. |
| border / border-subtle | 컨트롤과 열 경계를 구분한다. 약한 선만으로 조작 가능 여부를 전달하지 않는다. |
| accent / accent-hover / tint | 선택 표시·포커스·주요 동작의 테두리와 옅은 배경에 쓴다. 작은 글자 전용 색으로 고정하지 않는다. |
| success | 연결 성공을 텍스트와 함께 보조한다. 초록색만으로 저장 성공을 주장하지 않는다. |

작은 일반 텍스트의 목표는 4.5:1 이상이다. 기존 light tertiary/흰색은 3.25:1, `#f7f8f8`/accent는 light 4.42:1·dark 3.61:1로 실패한다. 따라서 버튼은 tonal 배경+primary 글자, 작은 설명은 `{colors.secondary-light}` / `{colors.secondary-dark}`로 한다. 선택된 설정 항목도 accent 글자 대신 primary 글자와 선택 표시를 조합한다. 모든 배경·상태의 합성 대비는 구현에서 별도 확인해야 하며 접근성 인증을 주장하지 않는다.

## Typography

시스템 글꼴 `{typography.body.fontFamily}`가 우선이다. 제목·라벨·caption은 같은 글꼴을 상속하고, 프롬프트 본문은 `{typography.body.fontSize}` 아래로 줄이지 않는다. 12px caption과 11px micro는 보조 메타데이터·상태에만 사용하며 핵심 오류·동작 설명을 작게 숨기지 않는다.

패널 제목은 section, 화면 제목은 title, 조작 라벨은 label을 사용한다. mono는 토큰·컴파일 결과처럼 고정폭이 필요한 곳에만 쓴다. 특정 외부 폰트 설치나 OpenType 기능을 필수 전제로 삼지 않는다. 좁은 창에서도 글자 축소보다 줄바꿈·영역 내부 스크롤을 우선한다.

## Layout & Spacing

기존 4px 기본 간격과 14px 본문 규칙은 유지한다. 인접 조작은 `{spacing.2}`, 내부 여백은 `{spacing.3}` / `{spacing.4}`, 영역 간 구분은 `{spacing.6}`를 기본으로 한다.

- 기본 창은 **1180×760**, 최소 창은 **1024×720**이다. 지원 범위에서 Library의 세 열이 모두 보이고 shell 가로 스크롤이 없어야 한다. 기존 1040px 최소 콘텐츠 폭·의도적 가로 스크롤 규칙은 대체한다.
- 시안의 sidebar 188px·목록 280px·나머지 유동 폭은 구현 시작점이지 고정 승인값이 아니다. 각 열의 최소 콘텐츠 폭을 해제하고 긴 제목·경로를 줄바꿈하거나 생략하되 전체 값 접근 수단을 제공한다. 오른쪽 도구 줄은 필요하면 줄바꿈하며 본문·복사·저장 우선순위를 유지한다.
- 목록과 긴 본문·컴파일 옵션은 영역 내부에서 세로로 스크롤한다. 컴파일러가 길어져 본문 접근을 밀어내지 않게 하고, 추가 옵션은 명시적 펼치기로 제공한다. 스크롤 가능 영역의 초점과 키보드 접근을 유지하며 복사·저장 등 주요 행동을 잘라내지 않는다.
- Insights와 Privacy Center는 사이드바를 남기고 목록·오른쪽 영역을 대체하는 기존 예외다. Settings는 승인된 별도 설정 화면이다. 세 화면에서 숨긴 Library 작업 공간의 선택·편집·컴파일 상태를 보존한다. Library 자체의 3패널은 숨기지 않는다.
- 창 치수 외 목업의 열 너비·막대 높이·세부 반경·컨트롤 크기는 제안 시작점이다. 본문 크기·4px 간격 상속 규칙과 충돌하는 목업 수치는 채택하지 않는다. 실제 macOS 창 프레임과 콘텐츠 가용 폭의 대응은 구현에서 확인한다.

[Library 시안](docs/ux/mockups/key-library.html)은 세 열과 본문 우선 배치를, [Settings 시안](docs/ux/mockups/key-settings.html)은 작업 공간과 분리된 설정을 보여 준다.

## Elevation & Depth

계층은 표면 톤과 가는 경계선으로 만든다. 창 안쪽 전체를 감싸는 여백·둥근 카드·그림자·분위기용 glow를 제거한다. tint는 상태 표시용으로만 유지한다. `{colors.border-subtle-light}` / `{colors.border-subtle-dark}`는 열 분리, border 쌍은 입력 경계에 사용한다. 별도 부유 그림자로 중요도를 과장하지 않는다.

확인 화면은 기존 HTML `<dialog>` 공용 래퍼의 top layer를 사용하고 뒤의 내용을 비활성화한다. 경고도 새 빨간 팔레트 없이 제목·원인·행동으로 전달한다. [미저장 시안](docs/ux/mockups/key-unsaved.html)은 배경 유지·안전한 취소·저장 실패 안내를 보여 준다.

## Shapes

작은 표시에는 `{rounded.sm}`, 입력·버튼에는 `{rounded.md}`, 확인 영역에는 `{rounded.lg}`를 시작점으로 쓴다. `{rounded.full}`은 Badge에 한정한다. 주요 패널은 둥근 외곽 카드로 만들지 않는다. OS 창 모서리와 traffic lights의 모양·색은 시스템 소유이며, 시안의 회색 원은 제품 설계 지시가 아니다.

## Components

아래 이름은 EXPERIENCE의 Component Patterns와 동일하다. 기존 로컬 래퍼는 유지하고 합성 영역 이름이 신규 구현 컴포넌트 생성을 강제하지 않는다. 기본 표면·글자는 현재 테마의 panel/primary 쌍, 설명은 secondary 쌍을 상속한다.

| 이름 | 시각·상태 규칙 |
|---|---|
| Button | native button 래퍼의 default·secondary·ghost를 유지한다. 28/32px 높이 시작점, tonal+primary 글자, hover는 표면 변화, focus는 accent 윤곽, disabled는 텍스트와 비활성 의미를 함께 제공한다. 저장 중에는 진행 문구를 표시한다. |
| Input | 32px 높이 시작점, `{rounded.md}`와 `{spacing.3}`를 사용한다. 보이는 라벨과 읽을 수 있는 placeholder, 포커스 윤곽, 입력 옆 오류 문구를 갖춘다. |
| Textarea | 편집 본문과 생성 결과의 라벨을 분리한다. 160px 최소 높이는 시작점이며 body 14px를 유지한다. editable·read-only·disabled를 설명과 표면으로 구분하고 읽기 전용 결과도 선택 가능하게 한다. |
| Badge | neutral·accent·success 변형과 22px 높이 시작점을 유지한다. 버전·상태는 텍스트를 포함하고 색만으로 구별하지 않는다. |
| Select | 기존 native select 래퍼, 32px 높이 시작점과 Input 정렬을 유지한다. 선택 차원의 라벨·선택값·focus·disabled가 읽혀야 한다. 시안의 세 테마 옵션 표현은 새 라디오 컴포넌트 도입을 요구하지 않는다. |
| Card | 기존 header·title·description·content 구조를 보존한다. 필요한 설정·결과 묶음에만 평평한 tonal 구분을 쓰고 shell을 감싸는 카드로 쓰지 않는다. |
| Tabs | 28px 높이 시작점, active는 tint와 primary 글자, focus는 독립된 윤곽이다. 비활성 패널 제목도 읽을 수 있게 한다. |
| Empty State | 제목·설명·다음 행동을 작은 tonal 영역에 표시한다. 빈 결과와 로딩·실패를 같은 문구로 표현하지 않는다. |
| SidebarItem | 프로젝트·태그·기능 진입 행이다. 28px 최소 높이 시작점과 읽을 수 있는 이름, hover·선택·focus를 구별한다. 설정 진입은 아래 고정 탐색 영역에서 찾을 수 있다. |
| Panel | 이름 있는 header·content·선택 footer를 가진 평평한 영역이다. Library 세 열은 표시하고 예외 화면에서도 복귀 맥락을 잃지 않는다. |
| Alert Dialog | 제목·변경 영향·행동을 구분한다. 미저장 이동은 버리기/취소/저장, 본문 교체는 적용/취소를 제공한다. 취소의 초기 포커스를 시각화하며 오류는 같은 영역에 남긴다. 마스킹된 보안 확인 내용을 그대로 보존한다. |
| Privacy Finding List | 심각도 수와 엔티티별 masked 결과를 기존 순서로 묶는다. idle·scanning·ready·error와 검사 비활성 사유를 텍스트로 제공한다. |
| Window Chrome | OS 제목 막대와 앱 도구 영역을 tonal로 연결한다. native traffic lights를 덮거나 모방하지 않으며 드래그 영역이 조작 요소를 침범하지 않는다. |
| Prompt Row | 제목·요약·버전·태그를 표시한다. 선택은 tint·가장자리 표시·텍스트 상태를 조합하고 키보드 focus와 구별한다. 범위는 선택한 프로젝트다. |
| Prompt Editor | 제목·버전·복사·새 버전 저장·복제하여 저장·본문·저장 상태 순으로 묶는다. 컴파일러보다 위에 두며 dirty·saving·saved·error를 본문 가까이에 표시한다. |
| Compiler | 핵심 입력·프로젝트 바인딩을 먼저 보여 주고 추가 옵션과 별도 결과 preview를 구분한다. 로딩·오류·unbound 안내와 명시적 편집에 적용 동작을 결과 옆에 둔다. |
| Settings Row | 왼쪽 라벨·설명, 오른쪽 기존 제어를 정렬한다. 좁아지면 줄바꿈하고 저장 중·저장 실패·현재 적용 테마를 텍스트로 분리한다. |

## Do's and Don'ts

| Do | Don't |
|---|---|
| 시스템/밝게/어둡게 모두 기존 팔레트로 연결하고 현재 선택과 실제 적용 상태를 설명한다. | 기존 `app_theme`와 별개 저장소·중복 테마 설정을 만들지 않는다. |
| 복사·새 버전 저장·복제하여 저장을 구분하고 현재 본문을 먼저 보여 준다. | 컴파일 결과를 자동 적용·자동 저장하거나 프롬프트를 실행하지 않는다. |
| 접근 가능한 관리·버전·품질·내보내기 진입을 남긴다. | 단순한 시안에 안 보인다는 이유로 기능을 숨기거나 죽은 별칭을 남기지 않는다. |
| focus를 유지하고 기본 전환은 기존 150ms ease-out 색·테두리 변화만 사용한다. | 장식 모션을 추가하거나 reduced motion에서 필수 정보를 전환 효과에 의존하지 않는다. |
| 네이티브 닫기·확대/축소·잠금·비밀 정보 경계를 보존한다. | renderer 스크린샷만으로 OS 드래그·창 제어가 검증됐다고 주장하지 않는다. |
