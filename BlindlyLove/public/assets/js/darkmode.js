// ✅ 다크모드로 시작 
  window.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("mode-toggle-accessible");
    if (toggle) {
      toggle.click(); // ✅ 딱 한 번 클릭해줘서 시각적 상태 맞춰줌
    }
  });


// ✅ 다크모드 전용 토글 버튼 처리
const btn = document.getElementById('toggle-dark');
if (btn) {
  btn.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    document.body.classList.toggle('light');
    btn.textContent = document.body.classList.contains('dark')
      ? '☀️ 라이트모드'
      : '🌙 다크모드';
  });
}

// ✅ 접근성 토글 스위치 처리
const toggle = document.getElementById('mode-toggle-accessible');
if (toggle) {
  toggle.addEventListener('click', () => {
    const isChecked = toggle.getAttribute('aria-checked') === 'true';
    const newState = !isChecked;

    toggle.setAttribute('aria-checked', String(newState));
    document.body.classList.toggle('dark', newState);
    document.body.classList.toggle('light', !newState);
  });

  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });
}
