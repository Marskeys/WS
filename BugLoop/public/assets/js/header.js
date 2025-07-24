document.addEventListener('DOMContentLoaded', () => {
    // 탭 전환 로직
    const icons = document.querySelectorAll('.sidebar-icon');
    const contents = document.querySelectorAll('.tab-content');
  
    icons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        const selectedTab = icon.dataset.tab;
  
        // "글쓰기" 및 "홈" 버튼은 기본 동작 허용 (링크로 이동)
        if (selectedTab === 'write' || selectedTab === 'home') {
          return;
        }
  
        e.preventDefault();
  
        // 탭 컨텐츠 표시/숨김
        contents.forEach(content => {
          content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
        });
  
        // 활성 아이콘 클래스 토글
        icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
      });
    });
  
    // 언어 선택 드롭다운 로직
    const langToggle = document.getElementById('langToggle');
    const langMenu = document.getElementById('langMenu');
  
    langToggle?.addEventListener('click', () => {
      // 'display' 속성 직접 토글
      langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
    });
  
    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!langToggle?.contains(e.target) && !langMenu?.contains(e.target)) {
        langMenu.style.display = 'none';
      }
    });
  
    // 사이드바 확장 패널 토글 로직
    const toggleExtensionBtn = document.querySelector('.toggle-extension');
    const extensionPanel = document.querySelector('.sidebar-extension-panel');
    const toggleIcon = toggleExtensionBtn?.querySelector('i'); // Optional chaining 추가
  
    toggleExtensionBtn?.addEventListener('click', (e) => { // Optional chaining 추가
      e.preventDefault();
  
      // 'open' 클래스 토글 (CSS 트랜지션 활용)
      extensionPanel.classList.toggle('open');
  
      // 아이콘 변경
      if (toggleIcon) { // toggleIcon이 null이 아닐 때만 실행
        if (extensionPanel.classList.contains('open')) {
          toggleIcon.classList.remove('fa-chevron-right');
          toggleIcon.classList.add('fa-chevron-left');
        } else {
          toggleIcon.classList.remove('fa-chevron-left');
          toggleIcon.classList.add('fa-chevron-right');
        }
      }
    });
  });
  
  // 딜레이 네비게이션 함수 (회원가입 버튼용)
  function delayNavigation(e, url) {
    e.preventDefault();
    setTimeout(() => {
      window.location.href = url;
    }, 100);
  }