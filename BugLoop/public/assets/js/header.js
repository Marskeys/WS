document.addEventListener('DOMContentLoaded', () => {
  const icons = document.querySelectorAll('.sidebar-icon');
  const contents = document.querySelectorAll('.tab-content');
  const extensionPanel = document.querySelector('.sidebar-extension-panel');
  const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
  const isMobile = window.innerWidth <= 768;
  const interactedKey = 'sidebarToggleInteracted';

  requestAnimationFrame(() => {
    setTimeout(() => {
      const toggleIcon = toggleExtensionBtn?.querySelector('i');
      if (!toggleIcon) return;

      // ✅ 처음 방문 시 아이콘 반짝반짝
      if (!localStorage.getItem(interactedKey)) {
        toggleIcon.classList.add('blink-highlight');
      }

      // ✅ 사이드바 아이콘 클릭 시
      icons.forEach(icon => {
        icon.addEventListener('click', (e) => {
          const selectedTab = icon.dataset.tab;
          if (selectedTab === 'write' || selectedTab === 'home') return;
          if (icon.classList.contains('toggle-extension')) return;

          e.preventDefault();

          if (extensionPanel && !extensionPanel.classList.contains('open')) {
            extensionPanel.classList.add('open');
            document.body.classList.add('panel-open');
            toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
          }

          contents.forEach(content => {
            content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
          });

          icons.forEach(i => i.classList.remove('active'));
          icon.classList.add('active');

          // ✅ 깜빡임 멈춤
          if (!localStorage.getItem(interactedKey)) {
            toggleIcon.classList.remove('blink-highlight');
            localStorage.setItem(interactedKey, 'true');
          }
        });
      });

      // ✅ 확장 패널 토글 버튼 동작
      toggleExtensionBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const isNowOpen = extensionPanel.classList.toggle('open');

        toggleIcon.classList.toggle('fa-chevron-left');
        toggleIcon.classList.toggle('fa-chevron-right');

        if (isNowOpen) {
          document.body.classList.add('panel-open');
        } else {
          document.body.classList.remove('panel-open');
        }

        // ✅ 깜빡임 멈춤
        if (!localStorage.getItem(interactedKey)) {
          toggleIcon.classList.remove('blink-highlight');
          localStorage.setItem(interactedKey, 'true');
        }
      });

      // ✅ 초기 패널 상태 설정
      if (extensionPanel) {
        if (isMobile) {
          extensionPanel.classList.remove('open');
          document.body.classList.remove('panel-open');
          toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
          extensionPanel.classList.add('open');
          document.body.classList.add('panel-open');
          toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
      }
    }, 0);
  });

  // ✅ 언어 드롭다운
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
});
