const sidebar = document.querySelector('.sidebar-extension-panel');
const overlay = document.querySelector('.main-panel .dark-overlay');

sidebar?.addEventListener('scroll', () => {
  const scrollTop = sidebar.scrollTop;
  const maxScroll = sidebar.scrollHeight - sidebar.clientHeight;

  // 스크롤 비율 계산 (0 ~ 1)
  const ratio = maxScroll === 0 ? 0 : scrollTop / maxScroll;

  // 어두워지는 정도 (0 ~ 0.5까지 예시)
  const darkness = Math.min(ratio * 0.95, 0.95);

  // 오버레이에 반영
  overlay.style.backgroundColor = `rgba(0, 0, 0, ${darkness})`;
});