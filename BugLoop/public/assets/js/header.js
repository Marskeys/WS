document.addEventListener('DOMContentLoaded', () => {
  const icons = document.querySelectorAll('.sidebar-icon[data-tab]');
  const extensionPanel = document.querySelector('.sidebar-extension-panel');
  const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
  const toggleIcon = toggleExtensionBtn?.querySelector('i');
  const container = document.querySelector('.tab-container'); // 여기에 탭 내용 삽입
  let blinkRemoved = false; 
  // ✅ 공통 탭 열기 함수 (클릭/자동 모두에서 사용)
  function openTab(selectedTab) {
    if (!extensionPanel.classList.contains('open')) {
      extensionPanel.classList.add('open');
      document.body.classList.add('panel-open');
      toggleIcon?.classList.replace('fa-chevron-right', 'fa-chevron-left');
    }

    const original = document.querySelector(`.tab-content[data-tab="${selectedTab}"]`);
    if (original) {
      const clone = original.cloneNode(true);
      clone.style.display = 'block';
      container.replaceChildren(clone); // ✅ 깜빡임 방지
    }

    
    // 아이콘 상태 갱신
    icons.forEach(i => i.classList.remove('active'));
    const selectedIcon = document.querySelector(`.sidebar-icon[data-tab="${selectedTab}"]`);
    selectedIcon?.classList.add('active');
  }

  // ✅ 탭 클릭 이벤트 체크 
  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const selectedTab = icon.dataset.tab;
      if (selectedTab === 'write' || selectedTab === 'home') return;
      if (icon.classList.contains('toggle-extension')) return;

      e.preventDefault();
      openTab(selectedTab);
    });
  });

  // ✅ 확장패널 토글 버튼
  toggleExtensionBtn?.addEventListener('click', (e) => {
    e.preventDefault();

    const isNowOpen = extensionPanel.classList.toggle('open');

    toggleIcon?.classList.toggle('fa-chevron-left');
    toggleIcon?.classList.toggle('fa-chevron-right');

     // ✅ 최초 1회 클릭 시 blink-highlight 제거
     if (!blinkRemoved) {
      toggleExtensionBtn.classList.remove('blink-highlight');
      blinkRemoved = true;
    }

    if (isNowOpen) {
      document.body.classList.add('panel-open');
    } else {
      document.body.classList.remove('panel-open');
    }
  });

  // ✅ 자동으로 프로필/검색 탭 열기 (첫 로딩 시)
  const path = location.pathname;
  const isHome = path === '/' || /^\/(ko|en|fr|zh|ja)\/?$/.test(path);
  const isWrite = path === '/write' || /^\/(ko|en|fr|zh|ja)\/write$/.test(path);

  if (isHome) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('profile');
      }, 10);
    });
  }

  if (isWrite) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openTab('search');
      }, 10);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const langToggle = document.getElementById('langToggle');
  const langMenu = document.getElementById('langMenu');

  langToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    langMenu?.classList.toggle('show'); // 또는 'open' 등 CSS에 맞게
  });

  // 바깥 누르면 닫히게 하려면 이것도 가능 
  document.addEventListener('click', (e) => {
    if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
      langMenu?.classList.remove('show');
    }
  });
});