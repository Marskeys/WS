// ===== header.js (patched, FINAL + 리사이저 재활성화 완전본) =====
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
    const fromDOM = extensionPanel?.dataset.activeTab;
    if (fromDOM) return fromDOM;
    const fromContainer = container?.querySelector('.tab-content[data-tab]')?.dataset?.tab;
    if (fromContainer) return fromContainer;
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

  // ✅ sidePanel 초기 처리
  if (extensionPanel?.classList.contains('open')) {
    sidePanel?.classList.add('open');
    sidePanel?.style.setProperty('pointer-events', 'auto');
    restoreActive();
  } else {
    sidePanel?.classList.remove('open');
    sidePanel?.style.setProperty('pointer-events', 'none');
  }

  // ==== 언어 드롭다운 ====
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

  // ==== URL 상태 ====
  const PANEL_QS_CATEGORY = 'p_category';
  const PANEL_QS_Q = 'p_q';
  const PANEL_QS_PAGE = 'p_page';

  function getPanelStateFromURL() {
    const usp = new URLSearchParams(location.search);
    const state = {
      category: usp.get(PANEL_QS_CATEGORY),
      q: usp.get(PANEL_QS_Q),
      page: parseInt(usp.get(PANEL_QS_PAGE) || '1', 10)
    };
    if (!state.category && !state.q) return null;
    if (!Number.isFinite(state.page) || state.page < 1) state.page = 1;
    return state;
  }

  function pushPanelStateToURL(state, replace = false) {
    const usp = new URLSearchParams(location.search);
    usp.delete(PANEL_QS_CATEGORY);
    usp.delete(PANEL_QS_Q);
    usp.delete(PANEL_QS_PAGE);

    if (state.category) usp.set(PANEL_QS_CATEGORY, state.category);
    if (state.q) usp.set(PANEL_QS_Q, state.q);
    if (state.page && state.page > 1) usp.set(PANEL_QS_PAGE, String(state.page));

    const newUrl = location.pathname + (usp.toString() ? `?${usp.toString()}` : '') + location.hash;
    const fn = replace ? 'replaceState' : 'pushState';
    history[fn](state, '', newUrl);
  }

  // ==== 탭 열기 ====
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
      const tmpl = clone.querySelector('#sidebar-table-template');
      if (tmpl) tmpl.id = 'sidebar-table';
      bindLangDropdown(clone);
      if (typeof bindPanelInnerEvents === 'function') bindPanelInnerEvents();
    }

    setActiveIcon(selectedTab);
  }

  // ==== 패널 HTML 로드 ====
  async function loadPanelHTML(state) {
    try {
      openTab('search');

      let sidebarTable =
        document.querySelector('.tab-container #sidebar-table') ||
        document.querySelector('.tab-container #sidebar-table-template');
      if (!sidebarTable) return;
      if (sidebarTable.id === 'sidebar-table-template') sidebarTable.id = 'sidebar-table';

      const lang = sidebarTable.dataset.lang || location.pathname.split('/').filter(Boolean)[0] || 'ko';
      const base = state.q
        ? `/${lang}/search?panel=1&q=${encodeURIComponent(state.q)}`
        : `/${lang}/?panel=1&category=${encodeURIComponent(state.category || 'all')}`;
      const url = state.page && state.page > 1 ? `${base}&page=${state.page}` : base;

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

      // ✅ 새 스크립트 실행
      sidebarTable.querySelectorAll("script").forEach((oldScript) => {
        const newScript = document.createElement("script");
        if (oldScript.src) newScript.src = oldScript.src;
        else newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
        oldScript.remove();
      });

      bindPanelInnerEvents();

      // 🧩 [수정 추가] 리사이저 재활성화
      setTimeout(() => window.attachPanelResizer(), 50);

    } catch (err) {
      console.error(err);
    }
  }

  // ==== 내부 이벤트 ====
  function bindPanelInnerEvents() {
    const root =
      document.querySelector('.tab-container #sidebar-table') ||
      document.querySelector('.tab-container #sidebar-table-template');
    if (!root) return;

    root.querySelectorAll('a[data-panel-link="category"]').forEach(a => {
      a.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) return;
        e.preventDefault();
        const cat = a.getAttribute('data-category') ||
          new URL(a.href, location.origin).searchParams.get('category') || 'all';
        const state = { category: cat, q: null, page: 1 };
        pushPanelStateToURL(state);
        loadPanelHTML(state);
      }, { once: true });
    });

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
  }

  // ==== 리사이저 초기화 ====
  // 🧩 [수정 추가] 함수로 전역화
  window.attachPanelResizer = function () {
    const panel = document.querySelector('#mini-lecture');
    const resizer = document.querySelector('#panel-resizer');
    if (!panel || !resizer) return;

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

    console.log('✅ attachPanelResizer(): 리사이저 이벤트 바인딩 완료');
  };

  // 🧩 초기 DOM 로드시 실행
  window.attachPanelResizer();
});
