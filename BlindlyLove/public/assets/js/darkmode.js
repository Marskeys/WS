const STORAGE_KEY = 'theme-mode';

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('mode-toggle-accessible');
  const root = document.documentElement;

  function applyTheme(mode) {
    root.classList.toggle('dark',  mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    if (themeToggle) themeToggle.setAttribute('aria-checked', String(mode === 'dark'));

    const textToggleButton = document.getElementById('toggle-dark');
    if (textToggleButton) {
      textToggleButton.textContent = mode === 'dark' ? '☀️ 라이트모드' : '🌙 다크모드';
    }
  }

  function loadTheme() {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // 저장 없으면 시스템 선호 기준
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
      // 필요하면 아래 줄 주석 해제해서 기본값을 저장까지 하도록
      // localStorage.setItem(STORAGE_KEY, saved);
    }
    applyTheme(saved === 'dark' ? 'dark' : 'light');
  }

  function toggleThemeAndSave() {
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  loadTheme();

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleThemeAndSave);
    themeToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleThemeAndSave();
      }
    });
  }

  const btn = document.getElementById('toggle-dark');
  if (btn) btn.addEventListener('click', toggleThemeAndSave);
});