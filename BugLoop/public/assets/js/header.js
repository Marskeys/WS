/**
 * header.js (FINAL, Consolidated, Dark Mode Fix Applied)
 * - 기존의 모든 JavaScript 로직을 통합하고 정리했습니다.
 * - [핵심 수정] 중복된 코드 블록을 제거하고, AJAX 패널 로딩 시 불필요했던
 * window.rebindThemeToggle() 호출 및 해당 함수 정의를 제거하여
 * 다크 모드 버튼의 이벤트 리스너 문제를 해결했습니다.
 * - 기능 변화는 없으며, DOMContentLoaded 이벤트 리스너를 통합했습니다.
 * - 섹션 7의 initTheme 로직은 localStorage의 테마 상태를 최우선으로 적용합니다.
 */
(function() {
  // 전역 변수 충돌을 피하기 위해 모든 로직을 즉시 실행 함수(IIFE) 안에 배치

  // ***********************************************
  // 1. 메인 패널 및 사이드바 기능 (기존 header.js DOMContentLoaded 로직)
  // ***********************************************
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

    // ==== 언어 드롭다운 이벤트 바인딩 함수 (내부 전용, 별도 포털 로직과 다름) ====
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
  }); // End of DOMContentLoaded

  // ***********************************************
  // 2. 언어 드롭다운 포털 (lang-menu 포탈)
  // ***********************************************
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

  // ***********************************************
  // 3. 패널 백드롭 및 리사이저 로직
  // ***********************************************

  // ==== 패널 백드롭 생성 (중복 방지) ====
  (function() {
    let backdrop = document.querySelector('.panel-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'panel-backdrop';
      document.body.appendChild(backdrop);

      // 딤 영역을 클릭하면 패널 닫기 (메인 로직의 toggleExtensionBtn을 사용해야 함)
      backdrop.addEventListener('click', () => {
        const extensionPanel = document.querySelector('.sidebar-extension-panel');
        const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
        if (extensionPanel?.classList.contains('open')) {
          toggleExtensionBtn?.click(); // 기존 토글 로직 재사용
        }
      });
    }
  })();

  // ==== 리사이저 다시 활성화 ====
  (function() {
    // panel.ejs에 이미 패널 리사이저 로직(initPanelResizer)이 존재하며,
    // 이 섹션은 panel.ejs의 리사이저(id="panel-resizer")와는 다른 클래스(.panel-resizer)를
    // 찾는 것으로 보입니다. 충돌 방지를 위해, 만약 패널이 동적으로 로드될 경우
    // panel.ejs의 initPanelResizer 함수를 사용하도록 위임합니다.
    
    // 만약 header.ejs의 mini-lecture가 아닌 다른 패널을 제어하는 것이 목적이라면 주석 처리하지 않음.
    // mini-lecture 패널 리사이저(id="panel-resizer")는 panel.ejs의 JS로 처리됨.
    
    /*
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
    */
  })();

  // ***********************************************
  // 4. 서브메뉴, 홈 아이콘, 히스토리 API 확장
  // ***********************************************

  // [History API 확장] 'panel:navigated' 이벤트 디스패치
  (function() {
    ['pushState','replaceState'].forEach(fn => {
      const orig = history[fn];
      history[fn] = function(...args){
        const ret = orig.apply(this, args);
        window.dispatchEvent(new Event('panel:navigated'));
        return ret;
      };
    });
  })();

  // [서브메뉴 활성화 동기] - AJAX 환경 지원 및 클릭 시 즉시 활성화
  (function(){
    const stripPath = (p) => (p || location.pathname).replace(/[#?].*$/, '').replace(/\/$/, '');
    
    // 1. 모든 활성화 클래스를 제거하고 현재 경로에 맞춰 다시 적용하는 함수
    const syncMenuActivity = () => {
      const path = stripPath(location.pathname);

      // 모든 활성화 클래스 제거
      document.querySelectorAll('.submenu a.active').forEach(a => a.classList.remove('active'));
      document.querySelectorAll('.menu-label.active-label').forEach(l => l.classList.remove('active-label'));

      // 현재 경로와 일치하는 메뉴 항목 찾기 및 활성화
      document.querySelectorAll('.submenu a').forEach(function(a){
        const href = stripPath(a.getAttribute('href') || '');
        
        if (href === path) {
          a.classList.add('active');
          const label = a.closest('.menu-item-wrapper')?.querySelector('.menu-label');
          if (label) label.classList.add('active-label');
        }
      });
    };

    // 2. 초기 로드 시 실행 (DOMContentLoaded 통합)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncMenuActivity, { once: true });
    } else {
      syncMenuActivity();
    }
    
    // 3. 페이지가 AJAX/history API로 변경되었을 때 재실행
    window.addEventListener('popstate', syncMenuActivity);
    window.addEventListener('panel:navigated', syncMenuActivity); // custom event 활용

    // 4. 서브메뉴 항목 클릭 시 즉시 활성화 스타일 적용 (UX 개선)
    document.querySelectorAll('.submenu a[data-panel-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        // 기존 활성화 제거
        document.querySelectorAll('.submenu a.active').forEach(a => a.classList.remove('active'));
        document.querySelectorAll('.menu-label.active-label').forEach(l => l.classList.remove('active-label'));
        
        // 클릭한 요소 활성화
        e.currentTarget.classList.add('active');
        const label = e.currentTarget.closest('.menu-item-wrapper')?.querySelector('.menu-label');
        if (label) label.classList.add('active-label');
      });
    });
  })();

  // [홈 아이콘 active 동기]
  (function() {
    const homeEls = document.querySelectorAll('.vscode-sidebar a.sidebar-icon[data-tab="home"]:not(.toggle-extension)');
    const stripLang = (p) => {
      const path = (p || location.pathname).replace(/[#?].*$/, '');
      const noLang = path.replace(/^\/(ko|en|fr|zh|ja|es)(?:\/|$)/, '');
      return noLang === '' ? '/' : noLang.replace(/\/$/, '') || '/';
    };
    const isHomePath = (p) => stripLang(p) === '/';
    const setHomeActive = (flag) => {
      homeEls.forEach(el => {
        el.classList.toggle('active', flag);
        el.querySelector('i')?.classList.toggle('active', flag);
      });
    };
    const sync = () => setHomeActive(isHomePath(location.pathname));

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sync, { once: true });
    } else {
      sync();
    }

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-panel-link]');
      if (!a) return;
      const pn = new URL(a.getAttribute('href') || '/', location.origin).pathname;
      setHomeActive(isHomePath(pn));
    });

    window.addEventListener('popstate', sync);
    window.addEventListener('panel:navigated', sync);
  })();

  // ***********************************************
  // 5. 하드웨어 힌트 (Hardware Hint)
  // ***********************************************
  (function(){
    const bubble = document.getElementById('hardware-hint');
    const label  = document.getElementById('hardware-label');
    if (!bubble || !label) return;

    const KEY = 'bugloop.hideHardwareHint';
    const isShown = () => bubble.style.display !== 'none' && bubble.getAttribute('aria-hidden') !== 'true';
    function show(){ bubble.style.display = 'inline-flex'; bubble.setAttribute('aria-hidden','false'); }
    function hide(){ localStorage.setItem(KEY,'1'); bubble.style.display = 'none'; bubble.setAttribute('aria-hidden','true'); label?.focus?.(); }

    if (bubble.parentNode !== document.body) { bubble.style.position = 'fixed'; bubble.style.left = '-9999px'; bubble.style.top = '-9999px'; document.body.appendChild(bubble); }
    bubble.style.pointerEvents = 'none';
    const closeBtn = bubble.querySelector('.hint-close'); if (closeBtn) closeBtn.style.pointerEvents = 'auto';

    function placeBubble(){
      const r = label.getBoundingClientRect();
      bubble.style.left = (Math.round(r.left + 20)) + 'px';
      bubble.style.top  = (Math.round(r.bottom + 8)) + 'px';
      if (!isShown() && localStorage.getItem(KEY) !== '1') show();
    }

    let followRAF = 0;
    function cancelFollow(){ if (followRAF) cancelAnimationFrame(followRAF), followRAF = 0; }
    function startFollow(ms = 600){
      const end = performance.now() + ms;
      cancelFollow();
      const tick = () => { placeBubble(); if (performance.now() < end) followRAF = requestAnimationFrame(tick); };
      followRAF = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', placeBubble, { once:true }); } else { placeBubble(); }
    window.addEventListener('scroll', placeBubble, { capture:true, passive:true });
    window.addEventListener('resize', placeBubble);
    document.querySelector('.toggle-extension')?.addEventListener('click', () => { placeBubble(); startFollow(800); });
    window.addEventListener('panel:navigated', () => { placeBubble(); startFollow(400); });

    const ro = new ResizeObserver(() => placeBubble());
    ['.full-header-container','.main-panel-only','.header-top','body','html'].forEach(sel => { const el=document.querySelector(sel); if (el) ro.observe(el); });

    document.addEventListener('transitionstart', (e) => {
      const targets = ['.sidebar-extension-panel','.full-header-container','.main-panel-only','.header-top'];
      if (targets.some(sel => e.target.matches?.(sel))) {
        placeBubble();
        startFollow((e.elapsedTime ? e.elapsedTime*1000 : 500) + 400);
      }
    }, true);

    closeBtn?.addEventListener('click', hide);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isShown()) hide(); }, true);
    if (localStorage.getItem(KEY) !== '1') show();
  })();

  // ***********************************************
  // 6. 패널 로딩(AJAX) - #mini-lecture 전용 로직
  // ***********************************************
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-panel-link]').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const url = link.getAttribute('href');
        const clickedLabel = link.getAttribute('data-panel-title') 
                          || link.textContent.trim()
                          || 'Info';

        try {
          const res = await fetch(url + '?partial=1', { 
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          const html = await res.text();

          const panel = document.querySelector('#mini-lecture');
          if (!panel) return;

          // ★ 패널 전체 교체
          panel.innerHTML = html;
          // window.rebindThemeToggle() 호출 제거! (다크 모드 버튼 먹통 해결)
          
          // ★ 중요한 부분: "삽입 후" 다시 요소를 찾아서 제목 반영
          const titleEl = document.getElementById('panel-title-connector');
          if (titleEl) {
            titleEl.textContent = clickedLabel; 
          }

          panel.scrollTo(0, 0);

          if (typeof window.initPanelResizer === 'function') window.initPanelResizer(); // panel.ejs의 리사이저 로직 재실행
          if (typeof window.bindPanelScrollTrap === 'function') window.bindPanelScrollTrap();
          
        } catch (err) {
          console.error('패널 로드 오류:', err);
        }
      });
    });
  });

  // ***********************************************
  // 7. 언어 드롭다운(사이드바) + 테마 토글 로직
  // ***********************************************
  (function(){
    const langBtn = document.getElementById('langToggleSidebar');
    const langMenu = document.getElementById('langMenuSidebar');
    const themeToggleBtn = document.getElementById('theme-toggle-sidebar');

    const THEME_KEY = 'bugloop.theme';
    const htmlEl = document.documentElement;

    /* ------------------- ✅ 새 테마 로직 (.dark 클래스 적용) ------------------- */
    const updateTheme = (theme) => {
      const isDark = theme === 'dark';
      
      htmlEl.classList.toggle('dark', isDark);

      localStorage.setItem(THEME_KEY, theme);
      // 아이콘 업데이트 (다크 모드면 해(sun), 라이트 모드면 달(moon))
      themeToggleBtn.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
      themeToggleBtn.setAttribute('aria-label', `테마 전환: 현재 ${isDark ? '다크' : '라이트'} 모드입니다.`);
    };

    // 💡 [수정됨]: localStorage 저장값을 최우선으로 적용하여 새로고침 시 상태가 유지되도록 보장합니다.
    const initTheme = () => {
      const saved = localStorage.getItem(THEME_KEY);
      let initialTheme;

      if (saved) {
        // 저장된 값이 있다면, 무조건 그 값('dark' 또는 'light')을 사용합니다.
        initialTheme = saved;
      } else {
        // 저장된 값이 없다면, 시스템 설정을 확인합니다.
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        initialTheme = prefersDark ? 'dark' : 'light';
      }

      updateTheme(initialTheme);
    };

    const toggleTheme = () => {
      const currentIsDark = htmlEl.classList.contains('dark');
      const nextTheme = currentIsDark ? 'light' : 'dark';
      updateTheme(nextTheme);
    };

    // DOMContentLoaded 이후에 한 번만 바인딩
    themeToggleBtn?.addEventListener('click', toggleTheme);
    themeToggleBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); }
    });

    // 초기 테마 설정
    initTheme();
    /* ---------------------------------------------------- */


    /* ---------- 기존 언어 메뉴 포털 로직 유지 ---------- */
    if (!langBtn || !langMenu) return; // 언어 버튼/메뉴 없으면 이후 로직 스킵

    let isOpen = false;
    let lastFocus = null;

    const openMenu = () => {
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;

      // aria
      langBtn.setAttribute('aria-expanded','true');
      langMenu.setAttribute('aria-hidden','false');

      // body로 포털 이동 + 고정 좌표 계산
      const r = langBtn.getBoundingClientRect();
      const top = Math.round(r.bottom + 6); // 버튼 바로 아래
      const left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 200))); // 화면 밖 방지
      const minW = Math.max(r.width, 160);

      langMenu.classList.add('lang-menu--portal');
      document.body.appendChild(langMenu);
      Object.assign(langMenu.style, {
        top: top + 'px',
        left: left + 'px',
        minWidth: minW + 'px'
      });

      // 첫 포커스(현재 언어)
      const current = langMenu.querySelector('.lang-option.active-lang') || langMenu.querySelector('.lang-option');
      current?.setAttribute('tabindex','0');
      current?.focus();

      // 외부 클릭/스크롤/리사이즈/ESC로 닫기
      setTimeout(() => {
        document.addEventListener('mousedown', onDocDown, { capture:true });
        window.addEventListener('scroll', closeMenu, { passive:true });
        window.addEventListener('resize', closeMenu);
        document.addEventListener('keydown', onKey);
      }, 0);
    };

    const closeMenu = () => {
      if (!isOpen) return;
      isOpen = false;
      langBtn.setAttribute('aria-expanded','false');
      langMenu.setAttribute('aria-hidden','true');

      // 탭 순서 복구
      langMenu.querySelectorAll('.lang-option').forEach(a => a.setAttribute('tabindex','-1'));

      // 메뉴를 다시 원래 자리(토글 버튼 바로 뒤 형제)로 되돌림
      const holder = langBtn.parentElement;
      holder && holder.appendChild(langMenu);
      langMenu.classList.remove('lang-menu--portal');
      langMenu.removeAttribute('style');

      document.removeEventListener('mousedown', onDocDown, { capture:true });
      window.removeEventListener('scroll', closeMenu);
      document.removeEventListener('keydown', onKey);

      // 포커스 반환
      lastFocus?.focus?.();
    };

    const onDocDown = (e) => {
      if (e.target === langBtn || langBtn.contains(e.target)) return;
      if (e.target === langMenu || langMenu.contains(e.target)) return;
      closeMenu();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); return; }

      // 간단한 메뉴 키보드 내비게이션
      const items = Array.from(langMenu.querySelectorAll('.lang-option'));
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[(idx + 1 + items.length) % items.length];
        next?.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        prev?.focus();
      }
      if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
      if (e.key === 'End')  { e.preventDefault(); items[items.length-1]?.focus(); }
    };

    langBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isOpen ? closeMenu() : openMenu();
    });

    // 버튼에서 Space/Enter로도 열기
    langBtn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
      }
    });
  })();
})();