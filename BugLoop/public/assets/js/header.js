(function() {
  document.addEventListener('DOMContentLoaded', () => {
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
    const ACTIVE_KEY = 'sidebar.activeTab';

    const isNonHomeTabIcon = (el) =>
      el?.dataset?.tab && el.dataset.tab !== 'home' && el.dataset.tab !== 'write' && !el.classList.contains('toggle-extension');

    function clearNonHomeTabActives() {
      icons.forEach(i => {
        if (isNonHomeTabIcon(i)) i.classList.remove('active');
      });
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

    async function loadPanelHTML(state) {
      try {
        openTab('search');

        let sidebarTable =
          document.querySelector('.tab-container #sidebar-table') ||
          document.querySelector('.tab-container #sidebar-table-template');
        if (!sidebarTable) return;
        if (sidebarTable.id === 'sidebar-table-template') {
          sidebarTable.id = 'sidebar-table';
        }

        const lang = sidebarTable.dataset.lang || location.pathname.split('/').filter(Boolean)[0] || 'ko';
        const base = state.q ?
          `/${lang}/search?panel=1&q=${encodeURIComponent(state.q)}` :
          `/${lang}/?panel=1&category=${encodeURIComponent(state.category || 'all')}`;
        const url = state.page && state.page > 1 ? `${base}&page=${state.page}` : base;

        if (!extensionPanel?.classList.contains('open')) {
          extensionPanel?.classList.add('open');
          document.body.classList.add('panel-open');
          sidePanel?.classList.add('open');
          sidePanel?.style.setProperty('pointer-events', 'auto');
        }

        const res = await fetch(url, {
          headers: {
            'X-Requested-With': 'fetch'
          }
        });
        if (!res.ok) throw new Error(`panel fetch failed: ${res.status}`);
        const html = await res.text();
        sidebarTable.innerHTML = html;

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

        bindPanelInnerEvents();
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
          const state = {
            category: cat,
            q: null,
            page: 1
          };
          pushPanelStateToURL(state);
          loadPanelHTML(state);
        }, {
          once: true
        });
      });

      root.querySelectorAll('.tabs a[href*="?category="]:not([data-panel-link="category"])').forEach(a => {
        a.addEventListener('click', (e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
          e.preventDefault();
          const cat = new URL(a.href, location.origin).searchParams.get('category') || 'all';
          const state = {
            category: cat,
            q: null,
            page: 1
          };
          pushPanelStateToURL(state);
          loadPanelHTML(state);
        }, {
          once: true
        });
      });

      root.querySelectorAll('form[data-panel-search="1"]').forEach(form => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const q = (fd.get('q') || '').toString().trim();
          if (!q) return;
          const state = {
            q,
            category: null,
            page: 1
          };
          pushPanelStateToURL(state);
          loadPanelHTML(state);
        }, {
          once: true
        });
      });

      root.querySelectorAll('form.search-form:not([data-panel-search="1"])').forEach(form => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const q = (fd.get('q') || '').toString().trim();
          if (!q) return;
          const state = {
            q,
            category: null,
            page: 1
          };
          pushPanelStateToURL(state);
          loadPanelHTML(state);
        }, {
          once: true
        });
      });

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
        }, {
          once: true
        });
      });
    }

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

    if (container) {
      const mo = new MutationObserver(() => {
        if (extensionPanel?.classList.contains('open')) {
          const name = container.querySelector('.tab-content[data-tab]')?.dataset?.tab;
          if (name) setActiveIcon(name);
        }
      });
      mo.observe(container, {
        childList: true,
        subtree: false
      });
    }

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
    }

    if (loginBtn && loginFormContainer) {
      loginBtn.addEventListener('click', () => {
        loginFormContainer.classList.toggle('hidden');
      });
    }

    bindLangDropdown(document);

    function syncSettingsVisual() {
      const open = rightControls?.classList.contains('is-active');
      settingsIcon?.classList.toggle('is-active', open);
      settingsIcon?.classList.remove('active');
      settingsIcon?.setAttribute('aria-pressed', open ? 'true' : 'false');
      if (!open) settingsIcon?.blur();
    }

    if (settingsIcon && rightControls && window.innerWidth >= 1024) {
      rightControls.classList.add('is-active');
      syncSettingsVisual();
    }

    settingsIcon?.addEventListener('click', (e) => {
      e.preventDefault();
      rightControls?.classList.toggle('is-active');
      syncSettingsVisual();
    });

    if (settingsIcon && rightControls) {
      const mo = new MutationObserver(() => syncSettingsVisual());
      mo.observe(rightControls, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    window.addEventListener('popstate', () => {
      const st = getPanelStateFromURL();
      if (st) {
        loadPanelHTML(st);
      } else {
        bindPanelInnerEvents();
        restoreActive();
      }
    });
  });

  (function() {
    if (window.__langPortalInit) return;
    window.__langPortalInit = true;

    let dd, menu, placeholder = null,
      inBody = false;

    const qs = (s, r = document) => r.querySelector(s);
    const find = () => {
      dd = qs('.language-dropdown');
      menu = dd && qs('.lang-menu', dd);
      return !!(dd && menu);
    };

    const raf2 = cb => requestAnimationFrame(() => requestAnimationFrame(cb));

    function place() {
      if (!dd || !menu) return;
      const r = dd.getBoundingClientRect();
      menu.style.visibility = 'hidden';
      menu.style.display = 'block';
      const mw = menu.offsetWidth || 220;
      const vw = document.documentElement.clientWidth;

      let left = Math.round(r.right - mw);
      if (left < 8) left = Math.min(Math.round(r.left), vw - mw - 8);

      menu.style.position = 'fixed';
      menu.style.top = Math.round(r.bottom) + 'px';
      menu.style.left = left + 'px';
      menu.style.zIndex = '2147483000';
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
      window.addEventListener('scroll', place, {
        passive: true
      });
      window.addEventListener('resize', place);
    }

    function close() {
      if (!inBody || !menu || !placeholder) return;
      placeholder.parentNode && placeholder.parentNode.replaceChild(menu, placeholder);
      inBody = false;
      menu.removeAttribute('style');
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
    }

    function toggle(toOpen) {
      (toOpen ? open : close)();
    }

    function onTrigger(e) {
      if (!dd) return;
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

    function bind() {
      document.removeEventListener('click', onTrigger, true);
      document.removeEventListener('mousedown', outside, true);
      if (!find()) return;
      document.addEventListener('click', onTrigger, true);
      document.addEventListener('mousedown', outside, true);
    }

    bind();

    const mo = new MutationObserver((muts) => {
      let needRebind = false,
        needPlace = false;
      for (const m of muts) {
        if (m.type === 'childList') {
          if (!document.contains(dd) || !document.contains(menu)) {
            close();
            needRebind = true;
            break;
          }
        } else if (m.type === 'attributes' &&
          m.target === document.documentElement &&
          m.attributeName === 'class') {
          if (inBody) needPlace = true;
        }
      }
      if (needRebind) bind();
      if (needPlace) raf2(place);
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true
    });
  })();

  (function() {
    let backdrop = document.querySelector('.panel-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'panel-backdrop';
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', () => {
        const extensionPanel = document.querySelector('.sidebar-extension-panel');
        const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
        if (extensionPanel?.classList.contains('open')) {
          toggleExtensionBtn?.click();
        }
      });
    }
  })();

  (function() {
    ['pushState', 'replaceState'].forEach(fn => {
      const orig = history[fn];
      history[fn] = function(...args) {
        const ret = orig.apply(this, args);
        window.dispatchEvent(new Event('panel:navigated'));
        return ret;
      };
    });
  })();

  (function() {
    const stripPath = (p) => (p || location.pathname).replace(/[#?].*$/, '').replace(/\/$/, '');

    const syncMenuActivity = () => {
      const path = stripPath(location.pathname);
      document.querySelectorAll('.submenu a.active').forEach(a => a.classList.remove('active'));
      document.querySelectorAll('.menu-label.active-label').forEach(l => l.classList.remove('active-label'));

      document.querySelectorAll('.submenu a').forEach(function(a) {
        const href = stripPath(a.getAttribute('href') || '');
        if (href === path) {
          a.classList.add('active');
          const label = a.closest('.menu-item-wrapper')?.querySelector('.menu-label');
          if (label) label.classList.add('active-label');
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncMenuActivity, {
        once: true
      });
    } else {
      syncMenuActivity();
    }

    window.addEventListener('popstate', syncMenuActivity);
    window.addEventListener('panel:navigated', syncMenuActivity);

    document.querySelectorAll('.submenu a[data-panel-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        document.querySelectorAll('.submenu a.active').forEach(a => a.classList.remove('active'));
        document.querySelectorAll('.menu-label.active-label').forEach(l => l.classList.remove('active-label'));
        e.currentTarget.classList.add('active');
        const label = e.currentTarget.closest('.menu-item-wrapper')?.querySelector('.menu-label');
        if (label) label.classList.add('active-label');
      });
    });
  })();

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
      document.addEventListener('DOMContentLoaded', sync, {
        once: true
      });
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

  (function() {
    const bubble = document.getElementById('hardware-hint');
    const label = document.getElementById('hardware-label');
    if (!bubble || !label) return;

    const KEY = 'bugloop.hideHardwareHint';
    const isShown = () => bubble.style.display !== 'none' && bubble.getAttribute('aria-hidden') !== 'true';

    function show() {
      bubble.style.display = 'inline-flex';
      bubble.setAttribute('aria-hidden', 'false');
    }

    function hide() {
      localStorage.setItem(KEY, '1');
      bubble.style.display = 'none';
      bubble.setAttribute('aria-hidden', 'true');
      label?.focus?.();
    }

    if (bubble.parentNode !== document.body) {
      bubble.style.position = 'fixed';
      bubble.style.left = '-9999px';
      bubble.style.top = '-9999px';
      document.body.appendChild(bubble);
    }
    bubble.style.pointerEvents = 'none';
    const closeBtn = bubble.querySelector('.hint-close');
    if (closeBtn) closeBtn.style.pointerEvents = 'auto';

    function placeBubble() {
      const r = label.getBoundingClientRect();
      bubble.style.left = (Math.round(r.left + 20)) + 'px';
      bubble.style.top = (Math.round(r.bottom + 8)) + 'px';
      if (!isShown() && localStorage.getItem(KEY) !== '1') show();
    }

    let followRAF = 0;

    function cancelFollow() {
      if (followRAF) cancelAnimationFrame(followRAF), followRAF = 0;
    }

    function startFollow(ms = 600) {
      const end = performance.now() + ms;
      cancelFollow();
      const tick = () => {
        placeBubble();
        if (performance.now() < end) followRAF = requestAnimationFrame(tick);
      };
      followRAF = requestAnimationFrame(tick);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', placeBubble, {
        once: true
      });
    } else {
      placeBubble();
    }
    window.addEventListener('scroll', placeBubble, {
      capture: true,
      passive: true
    });
    window.addEventListener('resize', placeBubble);
    document.querySelector('.toggle-extension')?.addEventListener('click', () => {
      placeBubble();
      startFollow(800);
    });
    window.addEventListener('panel:navigated', () => {
      placeBubble();
      startFollow(400);
    });

    const ro = new ResizeObserver(() => placeBubble());
    ['.full-header-container', '.main-panel-only', '.header-top', 'body', 'html'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) ro.observe(el);
    });

    document.addEventListener('transitionstart', (e) => {
      const targets = ['.sidebar-extension-panel', '.full-header-container', '.main-panel-only', '.header-top'];
      if (targets.some(sel => e.target.matches?.(sel))) {
        placeBubble();
        startFollow((e.elapsedTime ? e.elapsedTime * 1000 : 500) + 400);
      }
    }, true);

    closeBtn?.addEventListener('click', hide);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isShown()) hide();
    }, true);
    if (localStorage.getItem(KEY) !== '1') show();
  })();

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-panel-link]').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = link.getAttribute('href');
        const clickedLabel = link.getAttribute('data-panel-title') ||
          link.textContent.trim() ||
          'Info';

        try {
          const res = await fetch(url + '?partial=1', {
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          const html = await res.text();
          const panel = document.querySelector('#mini-lecture');
          if (!panel) return;

          panel.innerHTML = html;
          const titleEl = document.getElementById('panel-title-connector');
          if (titleEl) {
            titleEl.textContent = clickedLabel;
          }

          panel.scrollTo(0, 0);

          if (typeof window.initPanelResizer === 'function') window.initPanelResizer();
          if (typeof window.bindPanelScrollTrap === 'function') window.bindPanelScrollTrap();
        } catch (err) {
          console.error('패널 로드 오류:', err);
        }
      });
    });
  });

  (function() {
    const langBtn = document.getElementById('langToggleSidebar');
    const langMenu = document.getElementById('langMenuSidebar');
    const themeToggleBtn = document.getElementById('theme-toggle-sidebar');
    const THEME_KEY = 'bugloop.theme';
    const htmlEl = document.documentElement;

    const updateTheme = (theme) => {
      const isDark = theme === 'dark';
      htmlEl.classList.toggle('dark', isDark);
      localStorage.setItem(THEME_KEY, theme);
      themeToggleBtn.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
      themeToggleBtn.setAttribute('aria-label', `테마 전환: 현재 ${isDark ? '다크' : '라이트'} 모드입니다.`);
    };

    const initTheme = () => {
      const saved = localStorage.getItem(THEME_KEY);
      const initialTheme = saved ? saved : 'dark';
      updateTheme(initialTheme);
    };

    const toggleTheme = () => {
      const currentIsDark = htmlEl.classList.contains('dark');
      const nextTheme = currentIsDark ? 'light' : 'dark';
      updateTheme(nextTheme);
    };

    themeToggleBtn?.addEventListener('click', toggleTheme);
    themeToggleBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });

    initTheme();

    if (!langBtn || !langMenu) return;

    let isOpen = false;
    let lastFocus = null;

    const openMenu = () => {
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;
      langBtn.setAttribute('aria-expanded', 'true');
      langMenu.setAttribute('aria-hidden', 'false');

      const r = langBtn.getBoundingClientRect();
      const top = Math.round(r.bottom + 6);
      const left = Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 200)));
      const minW = Math.max(r.width, 160);

      langMenu.classList.add('lang-menu--portal');
      document.body.appendChild(langMenu);
      Object.assign(langMenu.style, {
        top: top + 'px',
        left: left + 'px',
        minWidth: minW + 'px'
      });

      const current = langMenu.querySelector('.lang-option.active-lang') || langMenu.querySelector('.lang-option');
      current?.setAttribute('tabindex', '0');
      current?.focus();

      setTimeout(() => {
        document.addEventListener('mousedown', onDocDown, {
          capture: true
        });
        window.addEventListener('scroll', closeMenu, {
          passive: true
        });
        window.addEventListener('resize', closeMenu);
        document.addEventListener('keydown', onKey);
      }, 0);
    };

    const closeMenu = () => {
      if (!isOpen) return;
      isOpen = false;
      langBtn.setAttribute('aria-expanded', 'false');
      langMenu.setAttribute('aria-hidden', 'true');
      langMenu.querySelectorAll('.lang-option').forEach(a => a.setAttribute('tabindex', '-1'));

      const holder = langBtn.parentElement;
      holder && holder.appendChild(langMenu);
      langMenu.classList.remove('lang-menu--portal');
      langMenu.removeAttribute('style');

      document.removeEventListener('mousedown', onDocDown, {
        capture: true
      });
      window.removeEventListener('scroll', closeMenu);
      document.removeEventListener('keydown', onKey);
      lastFocus?.focus?.();
    };

    const onDocDown = (e) => {
      if (e.target === langBtn || langBtn.contains(e.target)) return;
      if (e.target === langMenu || langMenu.contains(e.target)) return;
      closeMenu();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeMenu();
        return;
      }
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
      if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      }
      if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };

    langBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isOpen ? closeMenu() : openMenu();
    });

    langBtn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
      }
    });
  })();
})();

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path === '/ko/write') {
    const adSelectors = [
      '.adsbygoogle',
      '.bl-ad-slot',
      '#top-ad',
      '#bottom-ad'
    ];
    adSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = 'none';
      });
    });
  }
});

const fontSteps = [1, 1.15, 1.3];
let fontIndex = Number(localStorage.getItem("fontIndex")) || 0;

function applyFontScale() {
  document.documentElement.style.setProperty(
    "--font-scale",
    fontSteps[fontIndex]
  );
  localStorage.setItem("fontIndex", fontIndex);
}

applyFontScale();

const fontBtn = document.getElementById("font-toggle-sidebar");
if (fontBtn) {
  fontBtn.addEventListener("click", () => {
    fontIndex = (fontIndex + 1) % fontSteps.length;
    applyFontScale();
  });
}



(function () {
  let locked = false;

  function shouldBlockScroll(e) {
    // 패널 내부는 스크롤 허용
    const panel = document.querySelector('.sidebar-extension-panel');
    if (panel && panel.contains(e.target)) return false;

    // 모바일 TOC / 패널 등 허용할 영역 있으면 여기 추가
    return document.body.classList.contains('panel-open');
  }

  function onWheel(e) {
    if (shouldBlockScroll(e)) {
      e.preventDefault();
    }
  }

  function onTouchMove(e) {
    if (shouldBlockScroll(e)) {
      e.preventDefault();
    }
  }

  function onKeydown(e) {
    if (!document.body.classList.contains('panel-open')) return;

    const keys = [
      'ArrowUp','ArrowDown',
      'PageUp','PageDown',
      'Home','End',' '
    ];
    if (keys.includes(e.key)) {
      e.preventDefault();
    }
  }

  window.lockPostViewScroll = function () {
    if (locked) return;
    locked = true;
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeydown);
  };

  window.unlockPostViewScroll = function () {
    if (!locked) return;
    locked = false;
    window.removeEventListener('wheel', onWheel, { passive: false });
    window.removeEventListener('touchmove', onTouchMove, { passive: false });
    window.removeEventListener('keydown', onKeydown);
  };
})();
