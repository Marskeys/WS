// ✅ 개선된 코드 (DOMContentLoaded 사용)
document.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');
  
  if (preloader) {
    // 1. DOM과 필수 리소스 준비 즉시 fade-out 클래스 추가
    preloader.classList.add('fade-out'); 
    
    // 2. 200ms 후 완전히 숨김 (CSS 트랜지션 시간 고려)
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 100); 
  }
});

// 💡 window.load 이벤트 리스너는 이제 불필요하므로 제거하거나 주석 처리합니다.
// (만약 다른 중요한 초기화 코드가 window.load 안에 있었다면, 그 코드들은 DOMContentLoaded 안으로 옮겨야 합니다.)