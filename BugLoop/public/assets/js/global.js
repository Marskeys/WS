

// ✅ 모바일 메뉴 위치를 헤더 윗면에 맞춤
function positionMobileMenu() {
  const header = document.querySelector('.top-controls');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!header || !mobileMenu) return;

  const rect = header.getBoundingClientRect();
  mobileMenu.style.top = rect.top + 'px';
}


// ✅ 이벤트 기반 보강 (스크롤, 리사이즈, 광고 등)
['scroll', 'resize', 'load'].forEach(evt => {
  window.addEventListener(evt, () => {
    positionMobileMenu();
  });
});

document.addEventListener('DOMContentLoaded', () => {

  positionMobileMenu();

// ✅ 프리로더 제거
window.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 200);
  }
});
