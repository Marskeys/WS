
  // 탭 전환
  document.addEventListener('DOMContentLoaded', () => {
    const icons = document.querySelectorAll('.sidebar-icon');
    const contents = document.querySelectorAll('.tab-content');

    icons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        const selectedTab = icon.dataset.tab;

        // "글쓰기" 버튼은 기본 동작 허용 (링크로 이동)
        if (selectedTab === 'write') return;
        else if (selectedTab === 'home') return;

        e.preventDefault();

        // 탭 전환 로직
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

  // 딜레이 네비게이션 (회원가입 버튼용)
  function delayNavigation(e, url) {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }

