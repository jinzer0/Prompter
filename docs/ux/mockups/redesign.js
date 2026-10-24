/* 디자인 전용 프레젠테이션. Electron/DB/키/네트워크/클립보드/저장소 접근 없음. */
;(() => {
  const params = new URLSearchParams(location.search)
  const initialView = document.body.dataset.initialView === "settings" ? "settings" : "library"
  const state = {
    view: initialView,
    theme: ["light", "dark", "system"].includes(params.get("theme"))
      ? params.get("theme")
      : "system",
    size: params.get("size") === "minimum" ? "minimum" : "default",
    sample: "default",
    search: "",
    board: false,
    dirty: false,
    body: "당신은 macOS 앱을 만드는 숙련된 엔지니어입니다.\n\n변경할 코드를 먼저 읽고, 사용자가 하려는 일을 이해하세요. 기존 기능과 보안 경계를 유지하면서 가장 단순하고 명확한 해결책을 제안하세요.\n\n작업 원칙\n• 요청 범위 안에서 필요한 부분만 수정합니다.\n• 실패하거나 취소해도 작성 중인 내용을 잃지 않습니다.\n• 변경한 동작을 검증하고, 남은 제약을 설명합니다.",
    request: "사용자가 작성한 요구사항을 구현 가능한 프롬프트로 정리해 주세요.",
  }
  const media = matchMedia("(prefers-color-scheme: dark)")
  const root = document.querySelector("#mockup")
  const titles = {
    library: "라이브러리",
    settings: "설정",
    insights: "Insights",
    privacy: "Privacy Center",
    managers: "프로젝트 관리",
  }
  let focusBeforeDialog
  const button = (label, action, extra = "") =>
    `<button type="button" data-action="${action}" ${extra}>${label}</button>`
  const nav = (label, view, symbol) =>
    `<button type="button" class="nav-item ${state.view === view ? "active" : ""}" data-action="navigate" data-view="${view}" ${state.view === view ? 'aria-current="page"' : ""}><span class="symbol" aria-hidden="true">${symbol}</span>${label}</button>`
  const option = (value, text, selected) =>
    `<option value="${value}" ${value === selected ? "selected" : ""}>${text}</option>`
  const row = (title, description, control) =>
    `<div class="settings-row"><div><div class="row-title">${title}</div><p>${description}</p></div><div class="row-control">${control}</div></div>`
  const group = (label, rows) =>
    `<h2 class="group-label">${label}</h2><div class="settings-group">${rows}</div>`
  function applyTheme() {
    document.documentElement.dataset.theme =
      state.theme === "system" ? (media.matches ? "dark" : "light") : state.theme
    document.documentElement.dataset.size = state.size
  }
  function sidebar() {
    return `<aside class="sidebar" aria-label="작업 공간 탐색">
      <div class="traffic" role="img" aria-label="macOS 창 제어의 비작동 표현"><i></i><i></i><i></i></div>
      <div class="brand"><span class="mark" aria-hidden="true">›_</span>Prompter</div>
      ${nav("라이브러리", "library", "▤")}
      <div class="nav-label">프로젝트</div>
      <button type="button" class="nav-item" data-action="navigate" data-view="library"><span class="project-dot"></span>Prompter<span class="count">4</span></button>
      ${nav("프로젝트 관리", "managers", "⊞")}
      <div class="nav-label">태그</div>
      <button type="button" class="nav-item" data-action="tag"># 코드 검토</button>
      <button type="button" class="nav-item" data-action="tag"># 사용자 경험</button>
      <div class="sidebar-bottom">${nav("Insights", "insights", "◴")}${nav("Privacy Center", "privacy", "◇")}${nav("설정", "settings", "⚙")}</div>
    </aside>`
  }
  function empty(type, area) {
    if (type === "loading")
      return `<div class="empty-state" role="status" aria-label="불러오는 중"><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton short"></span><p>${area}을 불러오는 중입니다.</p></div>`
    if (type === "error")
      return `<div class="empty-state" role="alert"><span class="empty-icon error-text" aria-hidden="true">!</span><h3>불러오지 못했습니다</h3><p>작성한 내용은 유지됩니다.<br>오류와 복구 동작의 시각 예시입니다.</p>${button("다시 시도 · 시안", "reset")}</div>`
    return `<div class="empty-state"><span class="empty-icon" aria-hidden="true">▤</span><h3>${area === "목록" ? "아직 프롬프트가 없습니다" : "여기서 시작하세요"}</h3><p>프로젝트에 프롬프트를 추가하면<br>목록에서 선택하고 바로 편집할 수 있습니다.</p>${button("새 프롬프트 · 시안", "new", 'class="primary"')}</div>`
  }
  function library() {
    const rows = [
      ["명확한 코드 변경 요청", "구현 전에 맥락과 제약을 확인합니다.", "버전 3 · 코드 검토"],
      ["네이티브 UI 리팩토링", "사용자의 흐름에 집중하는 화면", "버전 2 · 사용자 경험"],
      ["실패 경로 검토", "오류와 취소에도 안전하게", "버전 4 · 코드 검토"],
      ["프로젝트 맥락 정리", "일관된 결과를 만드는 기초 정보", "버전 1 · 프로젝트"],
    ]
    const listState = ["empty", "loading", "error"].includes(state.sample)
    return `<div class="library">
      <section class="prompt-list" aria-label="프롬프트 목록">
        <div class="list-heading flex between"><h2>프롬프트</h2>${button("+", "new", 'class="quiet" aria-label="새 프롬프트 시안"')}</div>
        <input class="list-search" type="search" aria-label="프롬프트 검색 시안" placeholder="프롬프트 검색" autocomplete="off">
        <div class="list-items">${listState ? empty(state.sample, "목록") : rows.map((r, i) => `<button type="button" class="prompt-row ${i === 0 ? "selected" : ""}" data-action="select-prompt" data-index="${i}"><strong>${r[0]}</strong><p>${r[1]}</p><small>${r[2]}</small></button>`).join("")}<p class="meta search-empty" hidden>검색 결과가 없습니다.</p></div>
        <div class="list-footer">${listState ? "상태 표현 예시" : "4개의 프롬프트 · 최근 수정순"}</div>
      </section>
      <section class="editor-stack" aria-label="본문과 보조 컴파일러">
        <div class="editor-surface" aria-label="본문 편집 영역">
          ${
            listState
              ? empty(state.sample, "본문")
              : `<div class="editor-heading flex between"><h1>명확한 코드 변경 요청</h1><span class="pill">버전 3</span></div>
          <p class="editor-subtitle">Prompter <span aria-hidden="true"> / </span> 코드 검토</p>
          <div class="editor-toolbar flex">${button("복사", "copy")}${button("새 버전 저장", "save", 'class="primary"')}${button("더보기 ···", "more", 'aria-haspopup="menu" aria-expanded="false" aria-controls="more-menu"')}</div>
          <div class="menu" id="more-menu" role="menu" aria-label="프롬프트 보조 동작" hidden>${["복제하여 저장", "버전 이력 · 비교", "태그 관리", "내보내기", "품질 검토"].map((label) => button(label, "menu-example", 'role="menuitem" tabindex="-1"')).join("")}<small>기존 기능의 진입점 유지</small></div>
          <label class="meta" for="prompt-body" hidden>프롬프트 본문</label><textarea class="editor-text" id="prompt-body" aria-label="프롬프트 본문 시안" spellcheck="false"></textarea>
          <div class="editor-footer flex between"><span><i class="status-dot"></i><span id="dirty-label">${state.dirty ? "저장하지 않은 변경" : "저장됨 · 오늘 10:42"}</span></span><span>새 버전 저장 ⌘S</span></div>`
          }
        </div>
        <section class="compiler-surface" aria-label="보조 컴파일러">
          <div class="compiler-heading flex between"><h2>프롬프트 컴파일러</h2><span class="meta">Prompter에 연결됨</span></div>
          <textarea class="compiler-input" id="compiler-request" aria-label="본문과 별개의 컴파일 요청 시안" spellcheck="false"></textarea>
          <details class="compiler-options"><summary>추가 옵션</summary><div class="option-grid"><label>시나리오<select aria-label="시나리오 시안"><option>코드 작성</option></select></label><label>대상 에이전트<select aria-label="대상 에이전트 시안"><option>기존 선택지 유지</option></select></label></div><p class="meta">템플릿 · 하네스 · 프로젝트 컨텍스트는 기존 진입점 유지</p></details>
          <div class="compiler-bottom flex between"><small>본문을 바꾸거나 자동 저장하지 않습니다.</small>${button(state.sample === "result" ? "결과 보기 · 시안" : "생성 결과 예시", "preview", 'class="primary"')}</div>
        </section>
      </section>
    </div>`
  }
  function settings() {
    return `<div class="page-heading"><h1>설정</h1><p>익숙한 작업 공간을, 나에게 맞게.</p></div>
      ${group(
        "화면 및 기본값",
        row(
          "화면 모양",
          "시스템 설정을 기본으로 따릅니다.",
          `<div class="theme-buttons" aria-label="시안 테마">${[
            ["system", "시스템"],
            ["light", "라이트"],
            ["dark", "다크"],
          ]
            .map(([value, label]) =>
              button(
                label,
                "theme",
                `data-theme="${value}" aria-pressed="${state.theme === value}"`,
              ),
            )
            .join("")}</div>`,
        ) +
          row(
            "작성 기본값",
            "시나리오와 대상 에이전트의 기존 설정",
            button("기본값 보기", "defaults", 'aria-label="기본값 시안 보기"'),
          ),
      )}
      ${group("보안 및 개인정보", row("OpenAI API 키", "키 내용은 표시하지 않습니다.", '<span class="pill">등록 상태 예시</span>') + row("앱 잠금", "민감한 작업 공간을 안전하게 보호합니다.", button("잠금 화면 예시", "lock")) + row("Privacy Center", "검사와 조치는 사용자가 직접 시작합니다.", button("열기", "navigate", 'data-view="privacy" aria-label="Privacy Center 시안 열기"')))}
      ${group("데이터 관리", row("백업 및 가져오기", "내보내기 · 검증 미리보기 · 충돌 확인", button("흐름 보기", "backup")) + row("수동 정리", "검사 → 미리보기 → 사용자 확인", button("흐름 보기", "maintenance")))}
      <p class="support-note">이 화면은 설정을 저장하거나 키를 조회하지 않습니다.<br>라이브러리로 돌아가도 작성 중인 본문·컴파일 요청을 유지하는 배치입니다.</p>`
  }
  function supporting() {
    if (state.view === "settings") return settings()
    if (state.view === "insights")
      return `<div class="page-heading"><h1>Insights</h1><p>내 라이브러리의 상태를 읽기 전용으로 살펴봅니다.</p></div>${group("라이브러리 상태", row("건강도", "기존 정보 순서를 그대로 유지합니다.", '<span class="pill">예시 데이터</span>') + row("품질", "저장된 품질 리뷰를 기준으로 표시", '<span class="meta">저장된 리뷰 3개</span>') + row("최근 활동", "최근 저장 및 변경 내용", '<span class="meta">오늘 · 새 버전 2개</span>'))}${group("구성 살펴보기", row("태그 · 템플릿", "관련 항목으로 안전하게 이동", button("라이브러리 보기", "navigate", 'data-view="library"')) + row("프로젝트 컨텍스트", "저장된 프로젝트 설정", button("관리 화면 보기", "navigate", 'data-view="managers"')) + row("수동 정리 가능 여부", "진입만으로 검사를 시작하지 않습니다.", '<span class="meta">설정에서 직접 실행</span>'))}<p class="support-note">조회 예시입니다. 검사·파일 읽기·LLM 호출·데이터 변경은 발생하지 않습니다.</p>`
    if (state.view === "privacy")
      return `<div class="page-heading"><h1>Privacy Center</h1><p>민감한 정보를 직접 확인하고, 필요한 조치만 선택합니다.</p></div>${group("수동 검사", row("검사 범위", "사용자 요청 전에는 검사하지 않습니다.", button("검사 결과 예시", "privacy-example")) + row("검사 상태", "이 시안은 검사나 파일 읽기를 수행하지 않습니다.", '<span class="pill">대기 중 예시</span>'))}${group("가려진 결과 표현", row("프로젝트 컨텍스트 · 1건", "•••••••• · 민감한 원문은 노출하지 않음", button("관련 관리 화면", "navigate", 'data-view="managers"')) + row("확인 안내", "오탐일 수 있습니다. 이동만으로 수정·삭제하지 않습니다.", '<span class="meta">직접 확인 필요</span>'))}<p class="support-note">기존 경고·동의 흐름과 마스킹 경계를 보존합니다. 자동 조치 없음.</p>`
    return `<div class="page-heading"><h1>프로젝트 관리</h1><p>맥락과 템플릿을 정돈하고, 원래 작업으로 돌아갑니다.</p></div>${group("Prompter", row("프로젝트 컨텍스트", "프로필·값·바인딩과 기존 편집 흐름 유지", button("편집 상태 보기", "manager-example")) + row("프롬프트 템플릿", "생성·편집·선택·계보", button("상세 보기", "manager-example")) + row("하네스 템플릿", "기존 설정과 관리 진입점 유지", button("상세 보기", "manager-example")))}${group("상세 · 관리 패턴", row("명시적 저장", "저장 전 변경과 실패 시 초안을 보존", '<span class="pill">그룹 + 행 재사용</span>') + row("삭제 및 참조 갱신", "삭제 확인·선택 항목 변경을 명시적으로 처리", button("확인 예시", "delete-example")))}<p class="support-note">단순 조회 목록은 그룹·행 패턴을 재사용합니다. 복잡한 컨텍스트 편집 및 버전 비교의 세부 시안은 추가 승인 대상으로 남겨 둡니다.</p>`
  }
  function board() {
    const coverage = [
      [
        "창 · 탐색",
        "두 크기/두 테마 · 긴 콘텐츠 · 포커스",
        "Library/Settings 시안에 포함. 창 제어는 중립색 비작동 표현, 실제 macOS 검증은 제품 단계.",
      ],
      [
        "Library · 본문 · 더보기",
        "기본/빈/로딩/오류 · 미저장 · 키보드",
        "현재 시안. 메뉴의 모든 도착점 유지, 복사·저장 실제 동작 없음.",
      ],
      [
        "컴파일러",
        "요청 · 추가 옵션 · 결과 · dirty 적용 확인",
        "결과/옵션 시안 포함. 기존 정적/LLM·바인딩·템플릿/하네스/컨텍스트 선택 보존. 긴 결과 및 unbound/재연결 경고는 제품 전 추가 상태 시안 필요.",
      ],
      [
        "Settings",
        "화면/기본값 · 키/잠금 · 백업/정리",
        "현재 시안. 백업/정리 위험 단계는 공통 확인 패턴 적용, 충돌 해결 상세는 추가 승인 시안 필요.",
      ],
      [
        "프로젝트·컨텍스트·템플릿·하네스",
        "목록/선택/편집/저장실패/삭제/갱신",
        "그룹·행 조회 예시 포함. 복잡한 편집기·계보·변경된 참조는 추가 시안 필요.",
      ],
      [
        "버전 · 태그 · 내보내기 · 품질",
        "이력/비교·태그·OS 취소·unavailable/missing-key",
        "더보기 도착점 유지. 버전 비교·품질 상세는 추가 시안 필요, OS 소유 창은 교체하지 않음.",
      ],
      [
        "Insights",
        "상태/품질/활동/태그/템플릿/컨텍스트/정리가능",
        "기존 정보 순서 보존한 읽기 전용 예시. 로딩·빈·오류는 공통 상태 재사용, 자동 작업 금지.",
      ],
      [
        "Privacy Center",
        "idle/disabled/scanning/ready/error · masked",
        "수동/마스킹 결과 예시. 동의·검사 전송 경고는 추가 시안 승인 필요. 원문·자동 조치 없음.",
      ],
      [
        "잠금",
        "숨김/잠금해제/인증실패/보안저장불가",
        "잠금 시안에서 sidebar와 민감 본문 비노출. 인증 실패 문구는 공통 오류 체계, 실제 인증 없음.",
      ],
      [
        "대화상자 · 공통 상태",
        "미저장/교체/삭제/오류·초기초점·Escape",
        "미저장·컴파일 결과·확인 예시 포함. 위험별 실제 버튼 의미는 기존 계약 보존.",
      ],
    ]
    const tokens = [
      ["배경", "--shell", "#eef1ef", "#171d1a"],
      ["사이드바", "--sidebar", "#e9eeea", "#171e1a"],
      ["주요 표면", "--surface", "#ffffff", "#202923"],
      ["보조 표면", "--raised", "#f5f7f5", "#29332c"],
      ["본문", "--ink", "#202b26", "#e7eee9"],
      ["보조 글자", "--secondary", "#526359", "#adbab1"],
      ["민트 강조", "--accent", "#216449", "#9bd7b3"],
      ["강조 위 글자", "--on-accent", "#ffffff", "#142b1f"],
      ["선택 표면", "--tint", "#dfeee5", "#2c4335"],
      ["오류", "--danger", "#933f35", "#f3b2a8"],
    ]
    return `<section class="reference-board" id="reference-board" aria-label="시안 적용표와 후보 토큰" ${state.board ? "" : "hidden"}>
      <h1>시안 v1 · 검토 범위와 후보값</h1><p>디자인 제작 완료와 사용자 디자인 승인은 다릅니다. 아래 추가 시안은 전체 UI 범위에서 제외된 것이 아니라 고유 결정을 확인할 후속 대상입니다.</p>
      <h2>전체 화면 · 상태 적용표</h2><div class="table-wrap"><table><thead><tr><th>표면</th><th>보존할 상태</th><th>이번 시안과 후속 판단</th></tr></thead><tbody>${coverage.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <h2>색상 후보 · 승인 전</h2><div class="table-wrap"><table><thead><tr><th>역할</th><th>토큰</th><th>라이트</th><th>다크</th></tr></thead><tbody>${tokens.map((r) => `<tr>${r.map((c) => `<td><code>${c}</code></td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <h2>형태 · 밀도 후보</h2><p>그룹 곡률 16px · 컨트롤 8px · 창 표현 14px · 시스템 글꼴 · 본문 14px/1.85 · 제목 19–23px · 보조 정보 12px. 그룹 간격 12px, 내부 18–24px. 그림자 light 0 10px 30px #142b1f14 / dark #00000033. 모두 승인 전 제안값입니다.</p>
      <h2>검토 순서</h2><p>Library/Settings 라이트·다크와 최소 창 → 더보기/옵션/결과 → 미저장/오류/잠금 → 보조 화면/추가 시안 판단 → 정확한 토큰 승인 → 별도 제품 구현 승인.</p>
      <p>FluidVoice의 부드러운 그룹 표현, Scratch의 창 통합감을 참고했습니다. Baalda는 전체 화면 이미지를 확보하지 못해 외관을 추정하지 않았습니다. 참고 앱의 기능이나 기술 스택을 도입하지 않습니다.</p>
    </section>`
  }
  function render() {
    applyTheme()
    root.innerHTML = `<header class="review-controls" aria-label="시안 검토 도구">
      <div class="flex"><strong>Prompter <span class="meta">/ 재설계 시안 v1</span></strong><label>테마 <select id="review-theme">${option("system", "시스템", state.theme)}${option("light", "라이트", state.theme)}${option("dark", "다크", state.theme)}</select></label><label>크기 <select id="review-size">${option("default", "1180 × 760", state.size)}${option("minimum", "1024 × 720", state.size)}</select></label></div>
      <div class="flex"><label>상태 <select id="review-state">${[
        ["default", "기본"],
        ["empty", "비어 있음"],
        ["loading", "로딩"],
        ["error", "오류"],
        ["result", "컴파일 결과"],
        ["unsaved", "미저장 확인"],
        ["locked", "잠금"],
      ]
        .map(([v, t]) => option(v, t, state.sample))
        .join(
          "",
        )}</select></label>${button("적용표 · 후보 토큰", "board", `aria-expanded="${state.board}" aria-controls="reference-board"`)}</div>
    </header><p class="review-caption"><strong>시각 검토 전용 · 제품 아님</strong> — 저장·생성·검사·인증을 실행하지 않습니다. 색상·곡률·그림자는 승인 전 후보값입니다.</p>
    <main class="app" aria-label="Prompter 재설계 시안">
      ${state.sample === "locked" ? `<section class="lock-screen"><span class="mark" aria-hidden="true">›_</span><h1>작업 공간이 잠겨 있습니다</h1><p>민감한 내용은 잠금 해제 후에 표시됩니다.</p>${button("잠금 해제 표현 닫기", "reset", 'class="primary"')}<small>시각 예시 · 실제 인증은 실행하지 않습니다.</small></section>` : `${sidebar()}<div class="workspace"><div class="windowbar"><div class="trail">Prompter<span>/</span>${titles[state.view]}</div><span class="meta">${state.view === "library" ? "로컬 라이브러리" : "작업 공간을 유지합니다"}</span></div>${state.view === "library" ? library() : `<section class="supporting" aria-label="${titles[state.view]} 시안"><div class="supporting-inner">${["empty", "loading", "error"].includes(state.sample) ? empty(state.sample, titles[state.view]) : supporting()}</div></section>`}</div>`}
    </main><p class="review-caption status-message" role="status" aria-live="polite" id="message">레이아웃·표면·상태만 검토하는 로컬 예시입니다. ${state.size === "minimum" ? "최소" : "기본"} 창 크기 표현.</p>
    ${board()}<dialog id="mock-dialog" aria-labelledby="dialog-title"></dialog>`
    const body = document.querySelector("#prompt-body")
    if (body) body.value = state.body
    const request = document.querySelector("#compiler-request")
    if (request) request.value = state.request
    const search = document.querySelector(".list-search")
    if (search) {
      search.value = state.search
      filterRows()
    }
  }
  function message(text) {
    document.querySelector("#message").textContent = text
  }
  function filterRows() {
    const rows = [...document.querySelectorAll(".prompt-row")]
    let visible = 0
    for (const r of rows) {
      r.hidden = !r.textContent.toLowerCase().includes(state.search.toLowerCase())
      if (!r.hidden) visible++
    }
    const empty = document.querySelector(".search-empty")
    if (empty) empty.hidden = rows.length === 0 || visible > 0
  }
  function dialog(title, content, buttons) {
    focusBeforeDialog = document.activeElement
    const d = document.querySelector("#mock-dialog")
    d.innerHTML = `<h2 id="dialog-title">${title}</h2>${content}<div class="dialog-actions">${buttons}</div>`
    d.showModal()
    d.querySelector("button")?.focus()
    d.addEventListener(
      "close",
      () => {
        if (focusBeforeDialog?.isConnected) focusBeforeDialog.focus()
      },
      { once: true },
    )
  }
  function closeDialog() {
    document.querySelector("#mock-dialog").close()
  }
  function closeMenu(restoreFocus = false) {
    const menu = document.querySelector("#more-menu")
    if (!menu || menu.hidden) return
    menu.hidden = true
    const trigger = document.querySelector('[data-action="more"]')
    trigger.setAttribute("aria-expanded", "false")
    if (restoreFocus) trigger.focus()
  }
  function showUnsaved() {
    dialog(
      "변경한 내용을 저장할까요?",
      "<p>저장하지 않은 변경이 있습니다. 취소하면 본문을 그대로 유지합니다. 실제 저장·이동은 수행하지 않는 확인 시안입니다.</p>",
      button("취소", "close-dialog") +
        button("버리기 표현", "discard-example") +
        button("새 버전 저장 표현", "save-example", 'class="primary"'),
    )
  }
  function preview() {
    dialog(
      "컴파일 결과 · 본문과 별도",
      '<p>생성 결과를 확인한 뒤 명시적으로 적용합니다. 아래는 고정된 예시이며 네트워크·LLM 호출은 없습니다.</p><div class="preview-text"># 목표\n기존 기능과 보안을 지키며 macOS 화면을 개선합니다.\n\n# 제약\n데이터와 작성 중인 내용을 보존합니다.\n\n# 수용 기준\n변경한 동작을 검증하고 결과를 보고합니다.</div>',
      button("닫기", "close-dialog") +
        button("편집에 적용 표현", "apply-example", 'class="primary"'),
    )
  }
  document.addEventListener("input", (event) => {
    if (event.target.id === "prompt-body") {
      state.body = event.target.value
      state.dirty = true
      document.querySelector("#dirty-label").textContent = "저장하지 않은 변경"
    }
    if (event.target.id === "compiler-request") state.request = event.target.value
    if (event.target.matches(".list-search")) {
      state.search = event.target.value
      filterRows()
    }
  })
  document.addEventListener("change", (event) => {
    const id = event.target.id
    if (id === "review-theme") state.theme = event.target.value
    else if (id === "review-size") state.size = event.target.value
    else if (id === "review-state") {
      state.sample = event.target.value
      if (state.sample === "unsaved") state.dirty = true
    } else return
    render()
    document.getElementById(id)?.focus()
    if (id === "review-state" && state.sample === "unsaved") showUnsaved()
    if (id === "review-state" && state.sample === "result") preview()
  })
  document.addEventListener("focusout", (event) => {
    const menu = document.querySelector("#more-menu")
    if (menu?.contains(event.target) && !menu.contains(event.relatedTarget)) closeMenu()
  })
  document.addEventListener("pointerdown", (event) => {
    const menu = document.querySelector("#more-menu")
    if (!menu || menu.hidden || menu.contains(event.target)) return
    // Let an open trigger toggle the menu without focusout closing it first.
    if (event.target.closest('[data-action="more"]') && event.button === 0) event.preventDefault()
    else closeMenu()
  })
  document.addEventListener("click", (event) => {
    if (!event.target.closest('#more-menu, [data-action="more"]')) closeMenu()
    const b = event.target.closest("button[data-action]")
    if (!b) return
    const action = b.dataset.action
    if (action === "navigate") {
      state.view = b.dataset.view
      state.sample = "default"
      render()
      document.querySelector('.nav-item[aria-current="page"]')?.focus()
    } else if (action === "theme") {
      state.theme = b.dataset.theme
      render()
      document.querySelector(`[data-action="theme"][data-theme="${state.theme}"]`)?.focus()
    } else if (action === "board") {
      state.board = !state.board
      document.querySelector("#reference-board").hidden = !state.board
      b.setAttribute("aria-expanded", String(state.board))
      if (state.board) document.querySelector("#reference-board").scrollIntoView({ block: "start" })
    } else if (action === "more") {
      const menu = document.querySelector("#more-menu")
      if (!menu.hidden) closeMenu(true)
      else {
        menu.hidden = false
        b.setAttribute("aria-expanded", "true")
        menu.querySelector("button")?.focus()
      }
    } else if (action === "close-dialog") closeDialog()
    else if (action === "preview") preview()
    else if (action === "save")
      dialog(
        "새 버전 저장 표현",
        "<p>시안에서는 버전을 만들지 않습니다. 제품에서는 현재 편집 내용을 같은 프롬프트의 새 버전으로 명시적으로 저장합니다.</p>",
        button("확인", "close-dialog", 'class="primary"'),
      )
    else if (action === "copy")
      message("복사 버튼의 위치 예시입니다. 클립보드에는 접근하지 않았습니다.")
    else if (action === "reset") {
      state.sample = "default"
      render()
    } else if (action === "lock") {
      state.sample = "locked"
      render()
    } else if (action === "apply-example") {
      closeDialog()
      if (state.dirty)
        dialog(
          "편집 내용을 바꿀까요?",
          "<p>저장하지 않은 편집 내용이 있습니다. 제품에서는 확인한 뒤에만 결과로 바꿉니다. 취소하면 기존 본문과 결과를 유지합니다. 이 시안은 실제 적용하지 않습니다.</p>",
          button("취소", "close-dialog") + button("바꾸기 표현", "save-example", 'class="primary"'),
        )
      else message("명시적 적용 위치 예시입니다. 고정 예시를 실제 본문에 적용하지 않았습니다.")
    } else if (["discard-example", "save-example"].includes(action)) {
      closeDialog()
      message("확인 선택의 시각 예시입니다. 실제 본문·버전은 바꾸지 않았습니다.")
    } else if (action === "select-prompt") {
      if (state.dirty) showUnsaved()
      else message("선택 행 표현입니다. 데모 본문은 고정이며 실제 선택·읽기 작업을 하지 않습니다.")
    } else if (action === "menu-example") {
      closeMenu(true)
      dialog(
        `${b.textContent} · 진입점`,
        "<p>기존 기능으로 연결되는 이름과 위치를 유지합니다. 상세 기능을 실행하지 않는 메뉴 시안입니다. 복잡한 버전 비교·품질 상세는 추가 시안으로 확인합니다.</p>",
        button("닫기", "close-dialog"),
      )
    } else if (action === "backup")
      dialog(
        "백업 · 가져오기 흐름",
        "<p>내보내기 또는 파일 선택 → 검증 미리보기 → 충돌 확인 → 명시적 가져오기. 파일 읽기·쓰기·가져오기는 실행하지 않습니다. 충돌 해결 상세 배치는 후속 시안 승인 대상입니다.</p>",
        button("닫기", "close-dialog"),
      )
    else if (action === "maintenance")
      dialog(
        "수동 정리 흐름",
        "<p>검사 → 조치 미리보기 → 사용자 확인 → 선택한 조치만 수행. 시안에서는 검사·저장·삭제를 실행하지 않습니다.</p>",
        button("취소", "close-dialog"),
      )
    else if (action === "delete-example")
      dialog(
        "삭제 확인 표현",
        "<p>위험 동작은 확인 없이 실행하지 않습니다. 실제 항목은 삭제하지 않는 시각 예시입니다.</p>",
        button("취소", "close-dialog") + button("삭제 표현 · 비작동", "save-example"),
      )
    else if (action === "manager-example")
      dialog(
        "관리 편집 패턴",
        "<p>큰 주제 표면 안에서 편집 행·명시적 저장·오류를 배치합니다. 복잡한 컨텍스트 편집과 계보는 전체 UI 구현 전에 별도 시안으로 확인합니다.</p>",
        button("닫기", "close-dialog"),
      )
    else if (action === "privacy-example")
      message("가려진 검사 결과의 시각 예시만 표시 중입니다. 실제 검사는 실행하지 않았습니다.")
    else if (action === "defaults")
      dialog(
        "작성 기본값",
        "<p>기존 시나리오·대상 에이전트 선택과 저장 의미를 보존합니다. 이 시안에서는 기본값을 조회하거나 변경하지 않습니다.</p>",
        button("닫기", "close-dialog"),
      )
    else if (action === "new")
      dialog(
        "새 프롬프트 진입점",
        "<p>새 프롬프트 생성 위치의 시각 예시입니다. 실제 데이터는 생성하지 않습니다.</p>",
        button("닫기", "close-dialog"),
      )
    else if (action === "tag")
      message("태그 탐색 위치의 시각 예시입니다. 실제 라이브러리는 조회하지 않습니다.")
  })
  document.addEventListener("keydown", (event) => {
    const activeDialog = document.querySelector("#mock-dialog[open]")
    if (activeDialog && event.key === "Tab") {
      const controls = [...activeDialog.querySelectorAll("button:not(:disabled)")]
      const current = controls.indexOf(document.activeElement)
      const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
      event.preventDefault()
      controls[next]?.focus()
      return
    }
    const menu = document.querySelector("#more-menu")
    if (
      menu &&
      !menu.hidden &&
      !activeDialog &&
      menu.contains(document.activeElement) &&
      ["Escape", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault()
      if (event.key === "Escape") {
        closeMenu(true)
        return
      }
      const items = [...menu.querySelectorAll("button")]
      const i = items.indexOf(document.activeElement)
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (i + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length
      items[next].focus()
    }
  })
  media.addEventListener("change", applyTheme)
  render()
})()
