document.addEventListener('DOMContentLoaded', () => {
    // 탭 전환 로직
    const icons = document.querySelectorAll('.sidebar-icon');
    const contents = document.querySelectorAll('.tab-content');
    const extensionPanel = document.querySelector('.sidebar-extension-panel');
    const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
    const toggleIcon = toggleExtensionBtn?.querySelector('i');
    const isMobile = window.innerWidth <= 768;
  
    icons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        const selectedTab = icon.dataset.tab;
  
        // "글쓰기" 및 "홈" 버튼은 기본 동작 허용
        if (selectedTab === 'write' || selectedTab === 'home') {
          return;
        }
  
        e.preventDefault();
  
        // ✅ toggle-extension은 탭 아님, 아무것도 안 함
        if (icon.classList.contains('toggle-extension')) {
          return;
        }
  
        // ✅ 패널이 닫혀 있으면 자동으로 열기
        if (extensionPanel && !extensionPanel.classList.contains('open')) {
          extensionPanel.classList.add('open');
          if (toggleIcon) {
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
          }
        }
  
        // 탭 컨텐츠 표시/숨김
        contents.forEach(content => {
          content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
        });
  
        // 활성 아이콘 클래스 토글 (toggle-extension 제외)
        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });
  
    // 언어 선택 드롭다운 로직
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
  
    // ✅ 초기 상태: 데스크탑이면 열림, 모바일이면 닫힘
    if (extensionPanel) {
      if (isMobile) {
        extensionPanel.classList.remove('open');
        if (toggleIcon) {
          toggleIcon.classList.remove('fa-chevron-left');
          toggleIcon.classList.add('fa-chevron-right');
        }
      } else {
        extensionPanel.classList.add('open');
        if (toggleIcon) {
          toggleIcon.classList.remove('fa-chevron-right');
          toggleIcon.classList.add('fa-chevron-left');
        }
      }
    }
  
    // 토글 버튼 클릭 시 열고 닫기
    toggleExtensionBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      extensionPanel.classList.toggle('open');
  
      if (toggleIcon) {
        toggleIcon.classList.toggle('fa-chevron-left');
        toggleIcon.classList.toggle('fa-chevron-right');
      }
    });
  });
  
  // Delay navigation function (for signup button)
  function delayNavigation(e, url) {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }
  
  document.getElementById('login')?.addEventListener('click', function () {
    const form = document.getElementById('login-form-container');
    form.classList.toggle('open'); // 슬라이드 열고 닫기
  });