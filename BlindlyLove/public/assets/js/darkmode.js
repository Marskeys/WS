// ✅ 테마 상태를 Local Storage에 저장할 키
const STORAGE_KEY = 'theme-mode';

// ✅ HTML 문서가 완전히 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('mode-toggle-accessible');
    const body = document.body;

    // 1. Local Storage에서 저장된 테마 불러오기
    function loadTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEY);

        // 저장된 테마가 'dark'이면 dark 클래스를 추가
        // 없거나 'light'이면 light 클래스를 유지하거나 dark 클래스를 제거
        if (savedTheme === 'dark') {
            body.classList.add('dark');
            body.classList.remove('light'); // 혹시 모를 충돌 방지
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'true');
            }
        } else {
            // savedTheme이 'light'이거나 null (저장된 값 없음)인 경우
            body.classList.remove('dark');
            body.classList.add('light'); // 명시적으로 light 클래스 추가
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'false');
            }
        }
    }

    // 2. 테마 전환 및 Local Storage 저장 함수
    function toggleThemeAndSave() {
        const isCurrentlyDark = body.classList.contains('dark');
        
        if (isCurrentlyDark) {
            // 현재 다크 모드이면 라이트 모드로 전환
            body.classList.remove('dark');
            body.classList.add('light');
            localStorage.setItem(STORAGE_KEY, 'light'); // Local Storage에 'light' 저장
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'false');
            }
        } else {
            // 현재 라이트 모드이면 다크 모드로 전환
            body.classList.add('dark');
            body.classList.remove('light');
            localStorage.setItem(STORAGE_KEY, 'dark'); // Local Storage에 'dark' 저장
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'true');
            }
        }

        // 'toggle-dark' 버튼의 텍스트도 업데이트하려면 여기에 로직 추가
        const textToggleButton = document.getElementById('toggle-dark');
        if (textToggleButton) {
             textToggleButton.textContent = body.classList.contains('dark')
                ? '☀️ 라이트모드'
                : '🌙 다크모드';
        }
    }

    // 3. 페이지 로드 시 테마 적용 (가장 먼저 실행)
    loadTheme();

    // 4. 스위치 이벤트 리스너 연결 (themeToggle이 존재할 경우에만)
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleThemeAndSave);

        // 키보드 접근성 처리
        themeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // 스페이스바의 기본 스크롤 동작 방지
                toggleThemeAndSave();
            }
        });
    }

    // (옵션) 만약 'toggle-dark' 버튼이 따로 있고, 그것도 클릭 시 테마를 바꾸고 싶다면
    // 아래 코드를 추가하여 같은 함수를 호출하게 할 수 있습니다.
    const btn = document.getElementById('toggle-dark');
    if (btn) {
      btn.addEventListener('click', toggleThemeAndSave);
    }
});