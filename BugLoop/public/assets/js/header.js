 // 탭 전환
 document.addEventListener('DOMContentLoaded', () => {
    const icons = document.querySelectorAll('.sidebar-icon');
    const contents = document.querySelectorAll('.tab-content');

    icons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedTab = icon.dataset.tab;

        contents.forEach(content => {
          content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
        });

        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });

    // 언어 선택 드롭다운
    const toggle = document.getElementById('langToggle');
    const menu = document.getElementById('langMenu');

    toggle?.addEventListener('click', () => {
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!toggle?.contains(e.target) && !menu?.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  });

  function delayNavigation(e, url) {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }