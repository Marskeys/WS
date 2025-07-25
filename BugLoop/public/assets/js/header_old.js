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
        if (selectedTab === 'write' || selectedTab === 'home') return;
  
        e.preventDefault();
  
        // toggle-extension은 탭 아님
        if (icon.classList.contains('toggle-extension')) return;
  
        // ✅ 패널이 닫혀 있으면 자동 열기 + body 여백 적용
        if (extensionPanel && !extensionPanel.classList.contains('open')) {
          extensionPanel.classList.add('open');
          document.body.classList.add('panel-open');
          if (toggleIcon) {
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
          }
        }
  
        // 탭 컨텐츠 표시/숨김
        contents.forEach(content => {
          content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
        });
  
        // 활성화 아이콘 설정
        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });
  
 
    // ✅ 초기 상태: 데스크탑이면 열림 + 여백 적용
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
  
    // ✅ 패널 토글 버튼
    toggleExtensionBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const isNowOpen = extensionPanel.classList.toggle('open');
  
      if (toggleIcon) {
        toggleIcon.classList.toggle('fa-chevron-left');
        toggleIcon.classList.toggle('fa-chevron-right');
      }
  
      // ✅ body 패딩 토글
      if (isNowOpen) {
        document.body.classList.add('panel-open');
      } else {
        document.body.classList.remove('panel-open');
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
  