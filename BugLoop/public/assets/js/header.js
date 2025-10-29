// ===== header.js (patched, FINAL with resizer fix) =====
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

  function getActiveTabName() {
    const fromDOM = extensionPanel?.dataset.activeTab;
    if (fromDOM) return fromDOM;
    const fromContainer = container?.querySelector('.tab-content[data-tab]')?.dataset?.tab;
    if (fromContainer) return fromContainer;
    const fromStore = sessionStorage.getItem(ACTIVE_KEY);
    if (fromStore) return fromStore;
    return null;
  }

  function setActiveIcon(name) {
    clearNonHomeTabActives();
    if (!name) return;
    const selectedIcon = document.querySelector(`.sidebar-icon[data-tab="${name}"]`);
    selectedIcon?.classList.add('active');
    if (extensionPanel) extensionPanel.dataset.activeTab = name;
    sessionStorage.setItem(ACTIVE_KEY, name);
  }

  function restoreActive() {
    const name = getActiveTabName();
    if (name) setActiveIcon(name);
  }

  if (extensionPanel?.classList.contains('open')) {
    sidePanel?.classList.add('open');
    sidePanel?.style.setProperty('pointer-events', 'auto');
    restoreActive();
  } else {
    sidePanel?.classList.remove('open');
    sidePanel?.style.setProperty('pointer-events', 'none');
  }

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

  const PANEL_QS_CATEGORY = 'p_category';
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
      attachPanelResizer(); // ✅ 패널 교체 후 리사이저 재활성화
    }

    setActiveIcon(selectedTab);
  }

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
      bindPanelInnerEvents();
      attachPanelResizer(); // ✅ 부분 렌더 후 리사이저 재활성화
    } catch (err) {
      console.error(err);
    }
  }

  function bindPanelInnerEvents() {
    const root =
      document.querySelector('.tab-container #sidebar-table') ||
      document.querySelector('.tab-container #sidebar-table-template');
    if (!root) return;

    root.querySelectorAll('a[data-panel-link="category"]').forEach(a => {
      a.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) return;
        e.preventDefault();
        const cat = a.getAttribute('data-category') || new URL(a.href, location.origin).searchParams.get('category') || 'all';
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
  }

  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const selectedTab = icon.dataset.tab;
      if (selectedTab === 'write' || selectedTab === 'home' || selectedTab === 'settings') return;
      if (icon.classList.contains('toggle-extension')) return;
      e.preventDefault();
      openTab(selectedTab);
    });
  });

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
      restoreActive();
    } else {
      document.body.classList.remove('panel-open');
      sidePanel?.classList.remove('open');
      sidePanel?.style.setProperty('pointer-events', 'none');
      clearNonHomeTabActives();
    }
  });

  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const isSearch = path.includes('/search') || searchParams.has('q');
  const isFiltered = searchParams.has('category');

  if (isSearch || isFiltered) {
    requestAnimationFrame(() => setTimeout(() => openTab('search'), 10));
  }
  if (typeof isWrite !== 'undefined' && isWrite) {
    requestAnimationFrame(() => setTimeout(() => openTab('search'), 10));
  }

  const initialState = getPanelStateFromURL();
  if (initialState) {
    pushPanelStateToURL(initialState, true);
    loadPanelHTML(initialState);
  } else {
    bindPanelInnerEvents();
    attachPanelResizer(); // ✅ 초기 로드 시 리사이저 연결
  }
});

// ==== 리사이저 함수 정의 ====
function attachPanelResizer() {
  const root   = document.documentElement;
  const panel  = document.getElementById('mini-lecture');
  const resizer= document.getElementById('panel-resizer');
  if (!panel || !resizer) return;

  window.__panelResizerCtl?.abort?.();
  const ctl = new AbortController();
  window.__panelResizerCtl = ctl;

  let dragging = false;
  let startY = 0, startH = 0;

  const getCur = () => {
    const v = getComputedStyle(root).getPropertyValue('--panel-h').trim();
    const px = parseInt(v || '0', 10);
    return Number.isFinite(px) && px > 0
      ? px
      : parseInt(getComputedStyle(panel).height, 10) || 300;
  };

  const setH = (h) => {
    const clamped = Math.max(20, Math.min(800, h|0));
    root.style.setProperty('--panel-h', clamped + 'px');
  };

  const onDown = (e) => {
    dragging = true;
    document.body.classList.add('resizing');
    startY = e.clientY;
    startH = getCur();
  };

  const onMove = (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    setH(startH + dy);
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('resizing');
  };

  resizer.addEventListener('mousedown', onDown, { signal: ctl.signal });
  window.addEventListener('mousemove', onMove, { signal: ctl.signal });
  window.addEventListener('mouseup', onUp, { signal: ctl.signal });
}
