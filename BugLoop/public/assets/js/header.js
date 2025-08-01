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

  let blinkRemoved = false;

  // ✅ sidePanel 초기 처리 (처음부터 열려 있을 수 있으므로)
  if (extensionPanel.classList.contains('open')) {
    sidePanel?.classList.add('open');
    sidePanel?.style.setProperty('pointer-events', 'auto');
  } else {
    sidePanel?.classList.remove('open');
    sidePanel?.style.setProperty('pointer-events', 'none');
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
    }

    icons.forEach(i => i.classList.remove('active'));
    const selectedIcon = document.querySelector(`.sidebar-icon[data-tab="${selectedTab}"]`);
    selectedIcon?.classList.add('active');
  }

  // ==== 탭 클릭 ====
  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const selectedTab = icon.dataset.tab;
      if (selectedTab === 'write' || selectedTab === 'home') return;
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

  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);

  const isHome = path === '/' || /^\/(ko|en|fr|zh|ja)\/?$/.test(path);
  const isSearch = path.includes('/search') || searchParams.has('q');
  const isFiltered = searchParams.has('category');

  if (isHome && !isSearch && !isFiltered) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('profile');
      }, 10);
    });
  }

  if (isSearch || isFiltered) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('search');
      }, 10);
    });
  }

  if (typeof isWrite !== 'undefined' && isWrite) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('search');
      }, 10);
    });
  }

  if (loginBtn && loginFormContainer) {
    console.log('✅ 로그인 버튼 활성화됨');
    loginBtn.addEventListener('click', () => {
      console.log('🟣 로그인 버튼 눌림');
      loginFormContainer.classList.toggle('hidden');
    });
  } else {
    console.log('❌ 로그인 요소 못 찾음');
  }

  // ** 기존 bindLangDropdown 함수 로직을 직접 포함하고, 사이드바 버튼에 대한 리스너도 추가했습니다.
  // ** 이 코드가 모든 언어 버튼과 토글을 한 번에 제어합니다.
  const langToggle = document.getElementById('langToggle');
  const langMenu = document.getElementById('langMenu');
  const langToggleSidebar = document.getElementById('langToggleSidebar');
  const langMenuSidebar = document.getElementById('langMenuSidebar');

  const modeToggle = document.getElementById('mode-toggle-accessible');
  const modeToggleSidebar = document.getElementById('mode-toggle-accessible-sidebar');
  
  if (langToggle && langMenu) {
    langToggle.addEventListener('click', (e) => {
      e.preventDefault();
      langMenu.classList.toggle('show');
    });
  }

  if (langToggleSidebar && langMenuSidebar) {
    langToggleSidebar.addEventListener('click', (e) => {
      e.preventDefault();
      langMenuSidebar.classList.toggle('show');
    });
  }

  // 라이트/다크 모드 토글
  const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);

    if (modeToggle) modeToggle.setAttribute('aria-checked', isDarkMode);
    if (modeToggleSidebar) modeToggleSidebar.setAttribute('aria-checked', isDarkMode);
  };

  if (modeToggle) modeToggle.addEventListener('click', toggleDarkMode);
  if (modeToggleSidebar) modeToggleSidebar.addEventListener('click', toggleDarkMode);

  // 초기 다크 모드 설정
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    if (modeToggle) modeToggle.setAttribute('aria-checked', 'true');
    if (modeToggleSidebar) modeToggleSidebar.setAttribute('aria-checked', 'true');
  }

  // 드롭다운 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (langMenu && !langToggle.contains(e.target) && !langMenu.contains(e.target)) {
      langMenu.classList.remove('show');
    }
    if (langMenuSidebar && !langToggleSidebar.contains(e.target) && !langMenuSidebar.contains(e.target)) {
      langMenuSidebar.classList.remove('show');
    }
  });

});