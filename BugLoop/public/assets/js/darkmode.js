// ✅ 테마 상태를 Local Storage에 저장할 키
// ❗ head.ejs의 FOUC 방지 스크립트와 동일한 키('bugloop.theme')로 통일합니다.
const STORAGE_KEY = 'bugloop.theme';

// ✅ HTML 문서가 완전히 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('mode-toggle-accessible');
    const root = document.documentElement;

    // 1. Local Storage에서 저장된 테마 불러오기
    function loadTheme() {
        // ❗ 이제 'bugloop.theme' 키를 사용합니다.
        const savedTheme = localStorage.getItem(STORAGE_KEY);

        // ✅ 저장된 값이 없거나 'dark'이면 → 다크 모드 적용
        if (!savedTheme || savedTheme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'true');
            }
        } else {
            // ✅ 저장된 테마가 'light'인 경우
            root.classList.remove('dark');
            root.classList.add('light');
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'false');
            }
        }

        // ✅ 버튼 텍스트도 초기화
        const textToggleButton = document.getElementById('toggle-dark');
        if (textToggleButton) {
            textToggleButton.textContent = root.classList.contains('dark')
                ? '☀️ 라이트모드'
                : '🌙 다크모드';
        }
    }

    // 2. 테마 전환 및 Local Storage 저장 함수
    function toggleThemeAndSave() {
        const isCurrentlyDark = root.classList.contains('dark');

        if (isCurrentlyDark) {
            root.classList.remove('dark');
            root.classList.add('light');
            // ❗ 'bugloop.theme' 키에 'light' 저장
            localStorage.setItem(STORAGE_KEY, 'light');
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'false');
            }
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
            // ❗ 'bugloop.theme' 키에 'dark' 저장
            localStorage.setItem(STORAGE_KEY, 'dark');
            if (themeToggle) {
                themeToggle.setAttribute('aria-checked', 'true');
            }
        }

        // ✅ 버튼 텍스트도 업데이트
        const textToggleButton = document.getElementById('toggle-dark');
        if (textToggleButton) {
            textToggleButton.textContent = root.classList.contains('dark')
                ? '☀️ 라이트모드'
                : '🌙 다크모드';
        }
    }

    // 3. 페이지 로드 시 테마 적용
    loadTheme();

    // 4. 스위치 이벤트 리스너 연결
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleThemeAndSave);
        themeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleThemeAndSave();
            }
        });
    }

    // 5. 'toggle-dark' 버튼도 동작하도록 연결
    const btn = document.getElementById('toggle-dark');
    if (btn) {
        btn.addEventListener('click', toggleThemeAndSave);
    }
});