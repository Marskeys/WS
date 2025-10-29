// ===== header.js (patched, FINAL) =====
document.addEventListener('DOMContentLoaded', () => {
  // ==== 요소 선택 ====
  const icons = document.querySelectorAll('.sidebar-icon[data-tab]');
  const extensionPanel = document.querySelector('.sidebar-extension-panel');
  const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
  const toggleIcon = toggleExtensionBtn?.querySelector('i');
  const container = document.querySelector('.tab-container');
  const loginBtn = document.getElementById('login');
  const loginFormContainer = document.getElementById('login-form-container');
  const sidePanel = document.querySelector('.side-panel.main-panel-only');
  const settingsIcon = document.querySelector('a[data-tab="settings"]');
  const rightControls = document.getElementById('right-controls');

  let blinkRemoved = false;

  // ==== 활성 탭 상태 저장 키 ====
  const ACTIVE_KEY = 'sidebar.activeTab';

  // ==== 홈/글쓰기/토글 제외한 탭 판단 ====
  const isNonHomeTabIcon = (el) =>
    el?.dataset?.tab && el.dataset.tab !== 'home' && el.dataset.tab !== 'write' && !el.classList.contains('toggle-extension');

  function clearNonHomeTabActives() {
    icons.forEach(i => { if (isNonHomeTabIcon(i)) i.classList.remove('active'); });
  }

  // ==== 현재 보이는 탭 이름 추정 ====
  function getActiveTabName() {
    // 1) 래퍼에 저장된 최근 탭
    const fromDOM = extensionPanel?.dataset.activeTab;
    if (fromDOM) return fromDOM;

    // 2) 컨테이너의 현재 콘텐츠 루트(.tab-content[data-tab])
    const fromContainer = container?.querySelector('.tab-content[data-tab]')?.dataset?.tab;
    if (fromContainer) return fromContainer;

    // 3) 세션 저장값
    const fromStore = sessionStorage.getItem(ACTIVE_KEY);
    if (fromStore) return fromStore;

    return null;
  }

  // ==== 아이콘 활성화 적용(+상태 저장) ====
  function setActiveIcon(name) {
    clearNonHomeTabActives();
    if (!name) return;
    const selectedIcon = document.querySelector(`.sidebar-icon[data-tab="${name}"]`);
    selectedIcon?.classList.add('active');
    if (extensionPanel) extensionPanel.dataset.activeTab = name;
    sessionStorage.setItem(ACTIVE_KEY, name);
  }

  // ==== 패널 다시 열릴 때 활성 탭 복구 ====
  function restoreActive() {
    const name = getActiveTabName();
    if (name) setActiveIcon(name);
  }

  // ✅ sidePanel 초기 처리 (처음부터 열려 있을 수 있으므로)
  if (extensionPanel?.classList.contains('open')) {
    sidePanel?.classList.add('open');
    sidePanel?.style.setProperty('pointer-events', 'auto');
    restoreActive(); // 처음부터 열려있다면 아이콘 동기화
  } else {
    sidePanel?.classList.remove('open');
    sidePanel?.style.setProperty('pointer-events', 'none');
  }

  // ==== 언어 드롭다운 이벤트 바인딩 함수 ====
  function bindLangDropdown(context = document) {
    const $ = (sel, root = context) => root.querySelector(sel);
    const langToggle = $('#langToggle');
    const langMenu = $('#langMenu');
    if (langToggle && langMenu) {
      const onToggle = (e) => {
        e.preventDefault();
        langMenu.classList.toggle('show');
      };
      const onDoc = (e) => {
        if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
          langMenu.classList.remove('show');
        }
      };
      langToggle.addEventListener('click', onToggle);
      document.addEventListener('click', onDoc);
    }
  }

  // ==== 패널 전용 상태(URL 쿼리) 관리 ====
  const PANEL_QS_CATEGORY = 'p_category'; // 패널 전용 쿼리 (경로는 유지)
  const PANEL_QS_Q        = 'p_q';
  const PANEL_QS_PAGE     = 'p_page';

  function getPanelStateFromURL() {
    const usp = new URLSearchParams(location.search);
    const state = {
      category: usp.get(PANEL_QS_CATEGORY),
      q:        usp.get(PANEL_QS_Q),
      page:     parseInt(usp.get(PANEL_QS_PAGE) || '1', 10)
    };
    if (!state.category && !state.q) return null;
    if (!Number.isFinite(state.page) || state.page < 1) state.page = 1;
    return state;
  }

  function pushPanelStateToURL(state, replace = false) {
    const usp = new URLSearchParams(location.search);
    // 기존 패널 키 제거
    usp.delete(PANEL_QS_CATEGORY);
    usp.delete(PANEL_QS_Q);
    usp.delete(PANEL_QS_PAGE);

    if (state.category) usp.set(PANEL_QS_CATEGORY, state.category);
    if (state.q)        usp.set(PANEL_QS_Q, state.q);
    if (state.page && state.page > 1) usp.set(PANEL_QS_PAGE, String(state.page));

    const newUrl = location.pathname + (usp.toString() ? `?${usp.toString()}` : '') + location.hash;
    const fn = replace ? 'replaceState' : 'pushState';
    history[fn](state, '', newUrl);
  }

  // ==== 탭 열기 함수 ====
  function openTab(selectedTab) {
    if (!extensionPanel?.classList.contains('open')) {
      extensionPanel?.classList.add('open');
      document.body.classList.add('panel-open');
      toggleIcon?.classList.replace('fa-chevron-right', 'fa-chevron-left');
      sidePanel?.classList.add('open');
      sidePanel?.style.setProperty('pointer-events', 'auto');
    }

    const original = document.querySelector(`.tab-content[data-tab="${selectedTab}"]`);
    if (original && container) {
      const clone = original.cloneNode(true);
      clone.style.display = 'block';
      container.replaceChildren(clone);

      // 템플릿 id → 런타임 id로 교체
      const tmpl = clone.querySelector('#sidebar-table-template');
      if (tmpl) tmpl.id = 'sidebar-table';

      bindLangDropdown(clone);
      if (typeof bindPanelInnerEvents === 'function') bindPanelInnerEvents();
    }

    // 상태 & 아이콘 활성화 저장
    setActiveIcon(selectedTab);
  }

  // ==== 패널 HTML 부분 렌더 로더 ====
  async function loadPanelHTML(state) {
    try {
      // 검색/카테고리 전용 탭 시각화
      openTab('search');

      let sidebarTable =
        document.querySelector('.tab-container #sidebar-table') ||
        document.querySelector('.tab-container #sidebar-table-template');
      if (!sidebarTable) return;
      if (sidebarTable.id === 'sidebar-table-template') {
        sidebarTable.id = 'sidebar-table';
      }

      const lang = sidebarTable.dataset.lang || location.pathname.split('/').filter(Boolean)[0] || 'ko';
      const base = state.q
        ? `/${lang}/search?panel=1&q=${encodeURIComponent(state.q)}`
        : `/${lang}/?panel=1&category=${encodeURIComponent(state.category || 'all')}`;
      const url = state.page && state.page > 1 ? `${base}&page=${state.page}` : base;

      // 패널 열림 보장
      if (!extensionPanel?.classList.contains('open')) {
        extensionPanel?.classList.add('open');
        document.body.classList.add('panel-open');
        sidePanel?.classList.add('open');
        sidePanel?.style.setProperty('pointer-events', 'auto');
      }

      const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
      if (!res.ok) throw new Error(`panel fetch failed: ${res.status}`);
      const html = await res.text();
      sidebarTable.innerHTML = html;

      // ✅ 새로 삽입된 script 태그 수동 실행
sidebarTable.querySelectorAll("script").forEach((oldScript) => {
  const newScript = document.createElement("script");
  if (oldScript.src) {
    newScript.src = oldScript.src;
  } else {
    newScript.textContent = oldScript.textContent;
  }
  document.body.appendChild(newScript);
  oldScript.remove();
});



      // 새 DOM 이벤트 바인딩
      bindPanelInnerEvents();
    } catch (err) {
      console.error(err);
    }
  }

  // ==== 패널 내부 이벤트 가로채기 (탭/검색/페이지네이션) ====
  function bindPanelInnerEvents() {
    const root =
      document.querySelector('.tab-container #sidebar-table') ||
      document.querySelector('.tab-container #sidebar-table-template');
    if (!root) return;

    // 카테고리 탭
    root.querySelectorAll('a[data-panel-link="category"]').forEach(a => {
      a.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) return; // 새탭 허용
        e.preventDefault();
        const cat = a.getAttribute('data-category') || new URL(a.href, location.origin).searchParams.get('category') || 'all';
        const state = { category: cat, q: null, page: 1 };
        pushPanelStateToURL(state);
        loadPanelHTML(state);
      }, { once: true });
    });

    // 폴백: href만 있는 경우
    root.querySelectorAll('.tabs a[href*="?category="]:not([data-panel-link="category"])').forEach(a => {
      a.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) return;
        e.preventDefault();
        const cat = new URL(a.href, location.origin).searchParams.get('category') || 'all';
        const state = { category: cat, q: null, page: 1 };
        pushPanelStateToURL(state);
        loadPanelHTML(state);
      }, { once: true });
    });

    // 검색 폼
    root.querySelectorAll('form[data-panel-search="1"]').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const q = (fd.get('q') || '').toString().trim();
        if (!q) return;
        const state = { q, category: null, page: 1 };
        pushPanelStateToURL(state);
        loadPanelHTML(state);
      }, { once: true });
    });

    // 폴백: 일반 검색 폼
    root.querySelectorAll('form.search-form:not([data-panel-search="1"])').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const q = (fd.get('q') || '').toString().trim();
        if (!q) return;
        const state = { q, category: null, page: 1 };
        pushPanelStateToURL(state);
        loadPanelHTML(state);
      }, { once: true });
    });

    // 페이지네이션
    root.querySelectorAll('.pagination a.page-link').forEach(a => {
      a.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) return;
        e.preventDefault();
        const u = new URL(a.href, location.origin);
        const page = parseInt(u.searchParams.get('page') || '1', 10);

        const cur = getPanelStateFromURL() || {};
        const state = {
          q: cur.q || null,
          category: cur.category || (cur.q ? null : 'all'),
          page: Number.isFinite(page) && page > 1 ? page : 1
        };
        pushPanelStateToURL(state);
        loadPanelHTML(state);
      }, { once: true });
    });
  }

  // ==== 탭 클릭 ====
  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const selectedTab = icon.dataset.tab;
      if (selectedTab === 'write' || selectedTab === 'home' || selectedTab === 'settings') {
        return;
      }
      if (icon.classList.contains('toggle-extension')) return;
      e.preventDefault();
      openTab(selectedTab);
    });
  });

  // ==== 패널 토글 ====
  toggleExtensionBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const isNowOpen = extensionPanel?.classList.toggle('open');
    toggleIcon?.classList.toggle('fa-chevron-left');
    toggleIcon?.classList.toggle('fa-chevron-right');

    if (!blinkRemoved) {
      toggleExtensionBtn.classList.remove('blink-highlight');
      blinkRemoved = true;
    }

    if (isNowOpen) {
      document.body.classList.add('panel-open');
      sidePanel?.classList.add('open');
      sidePanel?.style.setProperty('pointer-events', 'auto');
      // 👉 다시 열릴 때 마지막 탭 아이콘 복구
      restoreActive();
    } else {
      document.body.classList.remove('panel-open');
      sidePanel?.classList.remove('open');
      sidePanel?.style.setProperty('pointer-events', 'none');
      // 패널 닫힐 때 아이콘은 지우되, 상태(extensionPanel.dataset.activeTab)는 보존
      clearNonHomeTabActives();
    }
  });

  // ==== 컨테이너 변경 감지 → 아이콘 동기화 ====
  if (container) {
    const mo = new MutationObserver(() => {
      if (extensionPanel?.classList.contains('open')) {
        const name = container.querySelector('.tab-content[data-tab]')?.dataset?.tab;
        if (name) setActiveIcon(name);
      }
    });
    mo.observe(container, { childList: true, subtree: false });
  }

  // ==== URL 기반 탭 초기 열기 ====
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const isSearch = path.includes('/search') || searchParams.has('q');
  const isFiltered = searchParams.has('category');

  // 검색/필터일 때 자동 오픈
  if (isSearch || isFiltered) {
    requestAnimationFrame(() => setTimeout(() => openTab('search'), 10));
  }
  // 글쓰기 컨텍스트일 때(전역 isWrite가 true라면) 검색 탭 열기
  if (typeof isWrite !== 'undefined' && isWrite) {
    requestAnimationFrame(() => setTimeout(() => openTab('search'), 10));
  }

  // 패널 전용 상태 있으면 부분 렌더
  const initialState = getPanelStateFromURL();
  if (initialState) {
    pushPanelStateToURL(initialState, true);
    loadPanelHTML(initialState);
  } else {
    bindPanelInnerEvents(); // 서버 렌더 기본 테이블에 바인딩
  }

  // ==== 로그인 버튼 ====
  if (loginBtn && loginFormContainer) {
    loginBtn.addEventListener('click', () => {
      loginFormContainer.classList.toggle('hidden');
    });
  }

  // ==== 언어 드롭다운 초기 바인딩 ====
  bindLangDropdown(document);

  // ==== 설정 아이콘 & right-controls ====
  function syncSettingsVisual() {
    const open = rightControls?.classList.contains('is-active');
    settingsIcon?.classList.toggle('is-active', open); // 색상은 이 클래스로만
    settingsIcon?.classList.remove('active');          // 탭용 active 잔존 제거
    settingsIcon?.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (!open) settingsIcon?.blur();
  }

  // 데스크톱 초기값: 켜두기(기존 의도 유지)
  if (settingsIcon && rightControls && window.innerWidth >= 1024) {
    rightControls.classList.add('is-active');
    syncSettingsVisual();
  }

  settingsIcon?.addEventListener('click', (e) => {
    e.preventDefault();
    rightControls?.classList.toggle('is-active');
    syncSettingsVisual();
  });

  // 외부 스크립트/리사이즈 등으로 클래스 변경 시 동기화
  if (settingsIcon && rightControls) {
    const mo = new MutationObserver(() => syncSettingsVisual());
    mo.observe(rightControls, { attributes: true, attributeFilter: ['class'] });
  }

  // ==== 히스토리 뒤/앞으로 ====
  window.addEventListener('popstate', () => {
    const st = getPanelStateFromURL();
    if (st) {
      loadPanelHTML(st);
    } else {
      bindPanelInnerEvents();
      // 패널 상태가 사라졌다면, 현재 보이는 탭 기준으로 아이콘 동기화
      restoreActive();
    }
  });
});


// ===== lang-menu 포탈: 중복 초기화/헤더 교체/다크 전환까지 안정화 =====
(function () {
  if (window.__langPortalInit) return; // 중복 방지
  window.__langPortalInit = true;

  let dd, menu, placeholder = null, inBody = false;

  const qs = (s, r = document) => r.querySelector(s);
  const find = () => {
    dd = qs('.language-dropdown');
    menu = dd && qs('.lang-menu', dd);
    return !!(dd && menu);
  };

  // 위치 계산(두 번의 rAF로 레이아웃 안정 후 측정)
  const raf2 = cb => requestAnimationFrame(() => requestAnimationFrame(cb));
  function place() {
    if (!dd || !menu) return;
    const r = dd.getBoundingClientRect();
    // 메뉴가 body로 나간 뒤 처음엔 width가 0일 수 있어 숨긴 채 측정
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    const mw = menu.offsetWidth || 220; // 최소 가정
    const vw = document.documentElement.clientWidth;

    let left = Math.round(r.right - mw); // 오른쪽 정렬
    if (left < 8) left = Math.min(Math.round(r.left), vw - mw - 8); // 화면 밖 방지

    menu.style.position = 'fixed';
    menu.style.top = Math.round(r.bottom) + 'px';
    menu.style.left = left + 'px';
    menu.style.zIndex = '2147483000';       // 최상단
    menu.style.pointerEvents = 'auto';
    menu.style.visibility = 'visible';
  }

  function open() {
    if (inBody || !menu) return;
    placeholder = document.createComment('lang-menu-placeholder');
    dd.replaceChild(placeholder, menu);
    document.body.appendChild(menu);
    inBody = true;
    raf2(place);
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
  }

  function close() {
    if (!inBody || !menu || !placeholder) return;
    placeholder.parentNode && placeholder.parentNode.replaceChild(menu, placeholder);
    inBody = false;
    menu.removeAttribute('style'); // 원복
    window.removeEventListener('scroll', place);
    window.removeEventListener('resize', place);
  }

  function toggle(toOpen) { (toOpen ? open : close)(); }

  // 트리거(캡쳐 단계로 한 번만 받기)
  function onTrigger(e) {
    if (!dd) return;
    // 메뉴 내부 클릭은 무시
    if (menu && menu.contains(e.target)) return;
    if (!dd.contains(e.target)) return;

    const expanded = dd.getAttribute('aria-expanded') === 'true';
    dd.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    toggle(!expanded);
  }

  function outside(e) {
    if (!inBody) return;
    if (menu.contains(e.target) || dd.contains(e.target)) return;
    dd.setAttribute('aria-expanded', 'false');
    close();
  }

  // 바인딩/재바인딩
  function bind() {
    document.removeEventListener('click', onTrigger, true);
    document.removeEventListener('mousedown', outside, true);
    if (!find()) return;
    document.addEventListener('click', onTrigger, true);
    document.addEventListener('mousedown', outside, true);
  }

  bind();

  // 헤더 교체/다크 전환 감지 → 재바인딩/재배치
  const mo = new MutationObserver((muts) => {
    let needRebind = false, needPlace = false;
    for (const m of muts) {
      if (m.type === 'childList') {
        // 헤더가 교체되면 dd/menu 참조가 끊김 → 리바인딩
        if (!document.contains(dd) || !document.contains(menu)) {
          close();
          needRebind = true;
          break;
        }
      } else if (m.type === 'attributes' &&
                 m.target === document.documentElement &&
                 m.attributeName === 'class') {
        // html.dark 토글 시 위치 재계산
        if (inBody) needPlace = true;
      }
    }
    if (needRebind) bind();
    if (needPlace) raf2(place);
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  mo.observe(document.body, { childList: true, subtree: true });
})();

// ==== 패널 백드롭 생성 (중복 방지) ====
let backdrop = document.querySelector('.panel-backdrop');
if (!backdrop) {
  backdrop = document.createElement('div');
  backdrop.className = 'panel-backdrop';
  document.body.appendChild(backdrop);

  // 딤 영역을 클릭하면 패널 닫기
  backdrop.addEventListener('click', () => {
    if (extensionPanel?.classList.contains('open')) {
      toggleExtensionBtn?.click(); // 기존 토글 로직 재사용
    }
  });
}

// ==== 리사이저 다시 활성화 ====
const panel = document.querySelector('#mini-lecture');
const resizer = panel?.querySelector('.panel-resizer');

if (panel && resizer) {
  let isResizing = false;
  let startY, startHeight;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = parseInt(window.getComputedStyle(panel).height, 10);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dy = e.clientY - startY;
    const newHeight = startHeight + dy;
    panel.style.height = `${Math.max(120, newHeight)}px`;
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

