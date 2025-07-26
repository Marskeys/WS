document.addEventListener('DOMContentLoaded', () => {
  const icons = document.querySelectorAll('.sidebar-icon');
  const contents = document.querySelectorAll('.tab-content');
  const extensionPanel = document.querySelector('.sidebar-extension-panel');
  const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
  const isMobile = window.innerWidth <= 768;

  requestAnimationFrame(() => {
    setTimeout(() => {
      const toggleIcon = toggleExtensionBtn?.querySelector('i');
      if (!toggleIcon) return;

      // ✅ 아이콘 반짝반짝 (항상 켜짐)
      toggleIcon.classList.add('blink-highlight');

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
            content.classList.remove('active-tab');
          });
          
          const targetTab = document.querySelector(`.tab-content[data-tab="${selectedTab}"]`);
          if (targetTab) {
            targetTab.classList.add('active-tab');
          }

          icons.forEach(i => i.classList.remove('active'));
          icon.classList.add('active');
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

         // ✅ 깜빡임 제거
  toggleIcon.classList.remove('blink-highlight');
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

    // 로그인 버튼 누르면 로그인 폼 토글
    document.getElementById('login')?.addEventListener('click', function () {
      const form = document.getElementById('login-form-container');
      const currentDisplay = window.getComputedStyle(form).display;
      form.style.display = (currentDisplay === 'none') ? 'block' : 'none';
    });

    // ✅ DOMContentLoaded 후 홈에서 자동으로 프로필 탭 클릭하도록 안정적 처리
    document.addEventListener("DOMContentLoaded", () => {
      const path = location.pathname;
      const isDesktop = window.innerWidth >= 768;
      const isHome =
        location.pathname === "/" ||
        /^\/(ko|en|fr|zh|ja)\/?$/.test(location.pathname);
        const isWrite =
      path === "/write" || /^\/(ko|en|fr|zh|ja)\/write$/.test(path);

  
      if (isHome) {
        const profileIcon = document.querySelector('.sidebar-icon[data-tab="profile"]');
        if (profileIcon) {
          // DOM 렌더 이후 이벤트 큐에서 실행되도록 요청 → 완전 안정
          requestAnimationFrame(() => {
            setTimeout(() => {
              profileIcon.click();
            }, 0);
          });
        }
      }

      if (isWrite) {
      const searchIcon = document.querySelector('.sidebar-icon[data-tab="search"]');
      if (searchIcon) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            searchIcon.click();
          }, 0);
        });
      }
    }
    });