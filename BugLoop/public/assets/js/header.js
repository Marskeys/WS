// 🧠 완전히 통합된 JS
document.addEventListener('DOMContentLoaded', () => {
  const icons = document.querySelectorAll('.sidebar-icon');
  const contents = document.querySelectorAll('.tab-content');
  const extensionPanel = document.querySelector('.sidebar-extension-panel');
  const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
  const toggleIcon = toggleExtensionBtn?.querySelector('i');
  const isMobile = window.innerWidth <= 768;

  const interactedKey = 'sidebarToggleInteracted';

  // ✅ 처음 방문이면 깜빡이기 추가
  if (!localStorage.getItem(interactedKey)) {
    toggleExtensionBtn?.classList.add('blink-highlight');
  }

  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const selectedTab = icon.dataset.tab;

      // "글쓰기", "홈"은 기본 동작 허용
      if (selectedTab === 'write' || selectedTab === 'home') return;

      // 확장버튼은 제외
      if (icon.classList.contains('toggle-extension')) return;

      e.preventDefault();

      // ✅ 패널 열기
      if (extensionPanel && !extensionPanel.classList.contains('open')) {
        extensionPanel.classList.add('open');
        document.body.classList.add('panel-open');
        if (toggleIcon) {
          toggleIcon.classList.remove('fa-chevron-right');
          toggleIcon.classList.add('fa-chevron-left');
        }
      }

      // 탭 컨텐츠 표시
      contents.forEach(content => {
        content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
      });

      icons.forEach(i => i.classList.remove('active'));
      icon.classList.add('active');

      // ✅ 깜빡임 멈추기
      if (!localStorage.getItem(interactedKey)) {
        toggleExtensionBtn?.classList.remove('blink-highlight');
        localStorage.setItem(interactedKey, 'true');
      }
    });
  });

  // ✅ 언어 메뉴 토글
  const langToggle = document.getElementById('langToggle');
  const langMenu = document.getElementById('langMenu');

  langToggle?.addEventListener('click', () => {
    langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!langToggle?.contains(e.target) && !langMenu?.contains(e.target)) {
      langMenu.style.display = 'none';
    }
  });

  // ✅ 초기 패널 상태 (모바일/데스크탑)
  if (extensionPanel) {
    if (isMobile) {
      extensionPanel.classList.remove('open');
      document.body.classList.remove('panel-open');
      toggleIcon?.classList.replace('fa-chevron-left', 'fa-chevron-right');
    } else {
      extensionPanel.classList.add('open');
      document.body.classList.add('panel-open');
      toggleIcon?.classList.replace('fa-chevron-right', 'fa-chevron-left');
    }
  }

  // ✅ 확장 패널 토글
  toggleExtensionBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const isNowOpen = extensionPanel.classList.toggle('open');

    toggleIcon?.classList.toggle('fa-chevron-left');
    toggleIcon?.classList.toggle('fa-chevron-right');

    if (isNowOpen) {
      document.body.classList.add('panel-open');
    } else {
      document.body.classList.remove('panel-open');
    }

    // ✅ 깜빡임 멈추기
    if (!localStorage.getItem(interactedKey)) {
      toggleExtensionBtn?.classList.remove('blink-highlight');
      localStorage.setItem(interactedKey, 'true');
    }
  });
});

// ✅ 딜레이 이동
function delayNavigation(e, url) {
  e.preventDefault();
  setTimeout(() => {
    window.location.href = url;
  }, 100);
}
