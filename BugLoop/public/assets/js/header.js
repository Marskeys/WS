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

  // ✅ sidePanel 초기 처리 (처음부터 열려 있을 수 있으므로)
  if (extensionPanel.classList.contains('open')) {
    sidePanel?.classList.add('open');
    sidePanel?.style.setProperty('pointer-events', 'auto');
  } else {
    sidePanel?.classList.remove('open');
    sidePanel?.style.setProperty('pointer-events', 'none');
  }

  // ==== 언어 드롭다운 이벤트 바인딩 함수 ====
  function bindLangDropdown(context = document) {
    const langToggle = context.getElementById
      ? context.getElementById('langToggle')
      : context.querySelector('#langToggle');
    const langMenu = context.getElementById
      ? context.getElementById('langMenu')
      : context.querySelector('#langMenu');

    if (langToggle && langMenu) {
      langToggle.addEventListener('click', (e) => {
        console.log('🟣 langToggle clicked');
        e.preventDefault();
        langMenu.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
          langMenu.classList.remove('show');
        }
      });
    }
  }

  // ==== 탭 열기 함수 ====
  function openTab(selectedTab) {
    if (!extensionPanel.classList.contains('open')) {
      extensionPanel.classList.add('open');
      document.body.classList.add('panel-open');
      toggleIcon?.classList.replace('fa-chevron-right', 'fa-chevron-left');
      sidePanel?.classList.add('open');
      sidePanel?.style.setProperty('pointer-events', 'auto');
    }

    const original = document.querySelector(`.tab-content[data-tab="${selectedTab}"]`);
    if (original) {
      const clone = original.cloneNode(true);
      clone.style.display = 'block';
      container.replaceChildren(clone);
      bindLangDropdown(clone);
    }

    icons.forEach(i => i.classList.remove('active'));
    const selectedIcon = document.querySelector(`.sidebar-icon[data-tab="${selectedTab}"]`);
    selectedIcon?.classList.add('active');
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
    const isNowOpen = extensionPanel.classList.toggle('open');
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
    } else {
      document.body.classList.remove('panel-open');
      sidePanel?.classList.remove('open');
      sidePanel?.style.setProperty('pointer-events', 'none');
    }
  });

  // ==== URL 기반 탭 초기 열기 ====
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);

  const isHome = path === '/' || /^\/(ko|en|fr|zh|ja)\/?$/.test(path);
  const isSearch = path.includes('/search') || searchParams.has('q');
  const isFiltered = searchParams.has('category');

  // ❌ 프로필 자동 오픈 제거 (기존 isHome 블록 삭제)

  // ✅ 검색/필터일 때만 자동 오픈 유지
  if (isSearch || isFiltered) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('search');
      }, 10);
    });
  }

  // ✅ 글쓰기 컨텍스트일 때만 검색 탭 열기
  if (typeof isWrite !== 'undefined' && isWrite) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('search');
      }, 10);
    });
  }

  // ==== 로그인 버튼 ====
  if (loginBtn && loginFormContainer) {
    console.log('✅ 로그인 버튼 활성화됨');
    loginBtn.addEventListener('click', () => {
      console.log('🟣 로그인 버튼 눌림');
      loginFormContainer.classList.toggle('hidden');
    });
  } else {
    console.log('❌ 로그인 요소 못 찾음');
  }

  // ✅ 최초 바인딩
  bindLangDropdown(document);

  // ==== 설정 아이콘 & right-controls ====
  // ✅ 초기 상태 설정 (데스크톱만 활성화)
  if (settingsIcon && rightControls && window.innerWidth >= 1024) {
    rightControls.classList.add('is-active');
    settingsIcon.classList.add('is-active');
  }

  settingsIcon?.addEventListener('click', function(event) {
    event.preventDefault(); // 링크 이동 방지
    
    // rightControls의 is-active 클래스 토글
    rightControls?.classList.toggle('is-active');
    settingsIcon?.classList.toggle('is-active');
  });
});


// lang-menu 포탈: 중복 초기화/헤더 교체/다크 전환까지 안정화
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
