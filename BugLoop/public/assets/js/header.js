document.addEventListener('DOMContentLoaded', () => {
    // 탭 전환
    const icons = document.querySelectorAll('.sidebar-icon');
    const contents = document.querySelectorAll('.tab-content');
  
    icons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        const selectedTab = icon.dataset.tab;
        if (selectedTab === 'write' || selectedTab === 'home') return;
        e.preventDefault();
  
        contents.forEach(content => {
          content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
        });
  
        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });
  
    // 언어 선택
    const toggle = document.getElementById('langToggle');
    const menu = document.getElementById('langMenu');
  
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
  
      document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    }
  
    // 확장 패널 토글
    const toggleExtensionBtn = document.querySelector('.toggle-extension');
    const extensionPanel = document.querySelector('.sidebar-extension-panel');
    const toggleIcon = toggleExtensionBtn?.querySelector('i');
  
    if (toggleExtensionBtn && extensionPanel && toggleIcon) {
      toggleExtensionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isHidden = extensionPanel.classList.contains('hidden');
  
        if (isHidden) {
          extensionPanel.classList.remove('hidden');
          extensionPanel.style.display = 'flex';
          toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        } else {
          extensionPanel.classList.add('hidden');
          extensionPanel.style.display = 'none';
          toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        }
      });
    }
  });
  
  // 딜레이 이동
  function delayNavigation(e, url) {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }
  