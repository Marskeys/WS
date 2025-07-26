const icons = document.querySelectorAll('.sidebar-icon[data-tab]');
const extensionPanel = document.querySelector('.sidebar-extension-panel');
const toggleExtensionBtn = document.querySelector('.sidebar-icon.toggle-extension');
const toggleIcon = toggleExtensionBtn?.querySelector('i');
const container = document.querySelector('.tab-container'); // 여기에 넣을 거야

icons.forEach(icon => {
  icon.addEventListener('click', (e) => {
    const selectedTab = icon.dataset.tab;
    if (selectedTab === 'write' || selectedTab === 'home') return;
    if (icon.classList.contains('toggle-extension')) return;

    e.preventDefault();

    if (!extensionPanel.classList.contains('open')) {
      extensionPanel.classList.add('open');
      document.body.classList.add('panel-open');
      toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
    }

    // 1. 기존 콘텐츠 모두 제거
    container.innerHTML = '';

    // 2. 선택한 탭 콘텐츠 찾아서 클론 후 삽입
    const original = document.querySelector(`.tab-content[data-tab="${selectedTab}"]`);
    if (original) {
      const clone = original.cloneNode(true);
      clone.style.display = 'block';
      container.appendChild(clone);
    }

    // 3. 아이콘 상태 갱신
    icons.forEach(i => i.classList.remove('active'));
    icon.classList.add('active');
  });
});
