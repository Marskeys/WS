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

               // ✅ toggle-extension이면 아무 것도 안 하고 바로 return
                if (icon.classList.contains('toggle-extension')) {
                   return;
                 }
      
            // 탭 컨텐츠 표시/숨김
            contents.forEach(content => {
            content.style.display = content.dataset.tab === selectedTab ? 'block' : 'none';
            });
    
            // 활성 아이콘 클래스 토글
            icons.forEach(i => i.classList.remove('active'));
            if (!icon.classList.contains('toggle-extension')) {
              icon.classList.add('active');
            }
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
        const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension'); // Ensure this selector is correct
        const extensionPanel = document.querySelector('.sidebar-extension-panel');
        const toggleIcon = toggleExtensionBtn?.querySelector('i');
    
        // Initial icon state (assuming panel starts closed and should expand right)
        if (toggleIcon && !extensionPanel.classList.contains('open')) {
        toggleIcon.classList.remove('fa-chevron-left');
        toggleIcon.classList.add('fa-chevron-right'); // Panel closed, icon points right to open
        }
    
        toggleExtensionBtn?.addEventListener('click', (e) => {
        e.preventDefault();
    
        // Toggle the 'open' class (leveraging CSS transitions)
        extensionPanel.classList.toggle('open');
    
        // Change icon based on panel state
        if (toggleIcon) {
            if (extensionPanel.classList.contains('open')) {
            // Panel is now open, icon should point left to close it
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-left');
            } else {
            // Panel is now closed, icon should point right to open it
            toggleIcon.classList.remove('fa-chevron-left');
            toggleIcon.classList.add('fa-chevron-right');
            }
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