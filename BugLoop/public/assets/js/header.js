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

  // ✅ 최초 바인딩ㅎ
  bindLangDropdown(document);
});

document.addEventListener('DOMContentLoaded', function() {
  const settingsIcon = document.querySelector('a[data-tab="settings"]');
  const rightControls = document.getElementById('right-controls');

  settingsIcon.addEventListener('click', function(event) {
      event.preventDefault(); // 링크 이동 방지
      
      // rightControls의 is-active 클래스 토글
      rightControls.classList.toggle('is-active');
  });
});
