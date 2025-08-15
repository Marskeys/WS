// header.js
document.addEventListener('DOMContentLoaded', () => {
  // ===== 설정값 (원하는 위치로 조절) =====
  const LANG_ALIGN = 'end'; // 'start' | 'center' | 'end'
  const LANG_GAP   = 6;     // 버튼과 메뉴 사이 거리(px)

  // ==== 요소 선택 ====
  const icons = document.querySelectorAll('.sidebar-icon[data-tab]');
  const extensionPanel = document.querySelector('.sidebar-extension-panel');
  const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
  const toggleIcon = toggleExtensionBtn?.querySelector('i');
  const container = document.querySelector('.tab-container');
  const loginBtn = document.getElementById('login');
  const loginFormContainer = document.getElementById('login-form-container');
  const sidePanel = document.querySelector('.side-panel.main-panel-only');
  const settingsIcon = document.querySelector('a[data-tab="settings"]');
  const rightControls = document.getElementById('right-controls');

  let blinkRemoved = false;

  // ✅ sidePanel 초기 처리 (처음부터 열려 있을 수 있으므로)
  if (extensionPanel.classList.contains('open')) {
    sidePanel?.classList.add('open');
    sidePanel?.style.setProperty('pointer-events', 'auto');
  } else {
    sidePanel?.classList.remove('open');
    sidePanel?.style.setProperty('pointer-events', 'none');
  }

  // === 언어 드롭다운 위치 계산 유틸 ===
  function placeLangMenu(btn, menu, { align = LANG_ALIGN, gap = LANG_GAP } = {}) {
    if (!btn || !menu) return;
    const r  = btn.getBoundingClientRect();
    const mW = menu.offsetWidth  || 160;
    const mH = menu.offsetHeight || 200;
    const vw = window.innerWidth, vh = window.innerHeight;

    let top  = r.bottom + gap;   // 기본: 버튼 아래
    let left;                    // 기본: 오른쪽 끝 맞춤 (end)
    if (align === 'start')  left = r.left;
    if (align === 'center') left = r.left + (r.width - mW) / 2;
    if (align === 'end')    left = r.right - mW;

    const margin = 8;
    left = Math.min(vw - margin - mW, Math.max(margin, left));
    if (top + mH > vh - margin) top = Math.max(margin, r.top - gap - mH); // drop-up

    menu.style.position = 'fixed';
    menu.style.top  = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.zIndex = '1000005';
  }

  // ==== 언어 드롭다운 이벤트 바인딩 ====
  let __langGlobalBound = false;
  function bindLangDropdown(context = document) {
    const langToggle = context.getElementById
      ? context.getElementById('langToggle')
      : context.querySelector('#langToggle');
    const langMenu = context.getElementById
      ? context.getElementById('langMenu')
      : context.querySelector('#langMenu');

    if (langToggle && langMenu) {
      // 열기/닫기 + 위치 설정
      langToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !langMenu.classList.contains('show');
        langMenu.classList.toggle('show');
        if (willOpen) {
          // 레이아웃 확정 뒤 위치 찍기 (두 번 호출로 안정화)
          requestAnimationFrame(() => {
            placeLangMenu(langToggle, langMenu);
            requestAnimationFrame(() => placeLangMenu(langToggle, langMenu));
          });
        }
      });
    }

    // 전역 리스너는 한 번만
    if (!__langGlobalBound) {
      __langGlobalBound = true;

      // 바깥 클릭 닫기
      document.addEventListener('click', (e) => {
        const btn  = document.getElementById('langToggle');
        const menu = document.getElementById('langMenu');
        if (!btn || !menu) return;
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.remove('show');
        }
      });

      // ESC로 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const menu = document.getElementById('langMenu');
          menu?.classList.remove('show');
        }
      });

      // 리사이즈/스크롤 시 위치 갱신
      const repro = () => {
        const btn  = document.getElementById('langToggle');
        const menu = document.getElementById('langMenu');
        if (menu?.classList.contains('show')) placeLangMenu(btn, menu);
      };
      window.addEventListener('resize', repro);
      window.addEventListener('scroll', repro, { passive: true });
    }
  }

  // ==== 탭 열기 함수 ====
  function openTab(selectedTab) {
    if (!extensionPanel.classList.contains('open')) {
      extensionPanel.classList.add('open');
      document.body.classList.add('panel-open');
      toggleIcon?.classList.replace('fa-chevron-right', 'fa-chevron-left');
      sidePanel?.classList.add('open');
      sidePanel?.style.setProperty('pointer-events', 'auto');
    }

    const original = document.querySelector(`.tab-content[data-tab="${selectedTab}"]`);
    if (original) {
      const clone = original.cloneNode(true);
      clone.style.display = 'block';
      container.replaceChildren(clone);
      // 패널 내부에 동일 ID가 있을 가능성은 낮지만, 안전하게 context로 재바인딩
      bindLangDropdown(clone);
    }

    icons.forEach(i => i.classList.remove('active'));
    const selectedIcon = document.querySelector(`.sidebar-icon[data-tab="${selectedTab}"]`);
    selectedIcon?.classList.add('active');
  }

  // ==== 탭 클릭 ====
  icons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const selectedTab = icon.dataset.tab;
      if (selectedTab === 'write' || selectedTab === 'home' || selectedTab === 'settings') {
        return; 
      }
      if (icon.classList.contains('toggle-extension')) return;
      e.preventDefault();
      openTab(selectedTab);
    });
  });

  // ==== 패널 토글 ====
  toggleExtensionBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const isNowOpen = extensionPanel.classList.toggle('open');
    toggleIcon?.classList.toggle('fa-chevron-left');
    toggleIcon?.classList.toggle('fa-chevron-right');

    if (!blinkRemoved) {
      toggleExtensionBtn.classList.remove('blink-highlight');
      blinkRemoved = true;
    }

    if (isNowOpen) {
      document.body.classList.add('panel-open');
      sidePanel?.classList.add('open');
      sidePanel?.style.setProperty('pointer-events', 'auto');
    } else {
      document.body.classList.remove('panel-open');
      sidePanel?.classList.remove('open');
      sidePanel?.style.setProperty('pointer-events', 'none');
    }
  });

  // ==== URL 기반 탭 초기 열기 ====
  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);

  const isSearch = path.includes('/search') || searchParams.has('q');
  const isFiltered = searchParams.has('category');

  // ✅ 검색/필터일 때만 자동 오픈
  if (isSearch || isFiltered) {
    requestAnimationFrame(() => {
      setTimeout(() => openTab('search'), 10);
    });
  }

  // ✅ 글쓰기 컨텍스트일 때만 검색 탭 열기 (서버에서 isWrite 주입 가정)
  if (typeof isWrite !== 'undefined' && isWrite) {
    requestAnimationFrame(() => {
      setTimeout(() => openTab('search'), 10);
    });
  }

  // ==== 로그인 버튼 ====
  if (loginBtn && loginFormContainer) {
    loginBtn.addEventListener('click', () => {
      loginFormContainer.classList.toggle('hidden');
    });
  }

  // ✅ 최초 바인딩
  bindLangDropdown(document);

  // ==== 설정 아이콘 & right-controls ====
  // ✅ 초기 상태 설정 (데스크톱만 활성화)
  if (settingsIcon && rightControls && window.innerWidth >= 1024) {
    rightControls.classList.add('is-active');
    settingsIcon.classList.add('is-active');
  }

  settingsIcon?.addEventListener('click', function(event) {
    event.preventDefault(); // 링크 이동 방지
    rightControls?.classList.toggle('is-active');
    settingsIcon?.classList.toggle('is-active');
  });
});
