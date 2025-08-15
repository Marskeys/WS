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


// 간단 포탈 유틸 (언제든 붙여써)
(function () {
  const dd = document.querySelector('.language-dropdown');
  if (!dd) return;
  const menu = dd.querySelector('.lang-menu');
  if (!menu) return;

  let inBody = false;
  let origParent = menu.parentNode;
  let placeholder = document.createComment('menu-placeholder');

  function place() {
    const r = dd.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (r.bottom) + 'px';
    menu.style.left = (r.right - menu.offsetWidth) + 'px'; // 오른쪽 정렬
    menu.style.zIndex = '2147483000'; // 정말 크게
    menu.style.pointerEvents = 'auto';
  }

  function open() {
    if (inBody) return;
    origParent.replaceChild(placeholder, menu);
    document.body.appendChild(menu);
    inBody = true;
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
  }

  function close() {
    if (!inBody) return;
    placeholder.parentNode.replaceChild(menu, placeholder);
    inBody = false;
    window.removeEventListener('scroll', place);
    window.removeEventListener('resize', place);
    menu.removeAttribute('style');
  }

  // 트리거(네가 쓰는 상태 클래스/aria에 맞춰 조정)
  dd.addEventListener('click', (e) => {
    const expanded = dd.getAttribute('aria-expanded') === 'true';
    dd.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    (expanded ? close : open)();
  });

  // 바깥 클릭 닫기
  document.addEventListener('mousedown', (e) => {
    if (!inBody) return;
    if (!menu.contains(e.target) && !dd.contains(e.target)) close();
  });
})();
