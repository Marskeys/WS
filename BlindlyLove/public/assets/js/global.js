

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

  // ✅ 로그인 관련 처리
  const loginForm = document.querySelector("#loginBox form");
  const loginBtn = document.getElementById("login");
  const loginBox = document.getElementById("loginBox");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const id = formData.get("id");
    const password = formData.get("password");

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password })
      });

      const result = await res.json();

      if (result.success) {
        location.reload();
      } else {
        alert(result.error || "로그인 실패");
      }
    } catch (err) {
      alert("서버 오류");
      console.error(err);
    }
  });

  if (loginBtn && loginBox) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();  
      e.stopPropagation();

      if (loginBox.style.display === "block") {
        loginBox.style.display = "none";
      } else {
        loginBox.style.display = "block";

        const rect = loginBtn.getBoundingClientRect();
        loginBox.style.top = rect.bottom + window.scrollY + "px";
        loginBox.style.left = (rect.right - loginBox.offsetWidth - 35) + window.scrollX + "px";
      }
    });
  }
});

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

document.addEventListener('DOMContentLoaded', () => {
  // 언어 감지 (URL에서 /ko, /en, /fr, /zh, /ja 추출)
  const pathLang = location.pathname.split('/')[1];
  const supportedLangs = ['ko','en','fr','zh','ja'];
  const lang = supportedLangs.includes(pathLang) ? pathLang : 'ko';

  // 모바일 스도쿠 링크 설정
  const mobileSudoku = document.getElementById('mobile-sudoku-link');
  if (mobileSudoku) {
    mobileSudoku.href = `/assets/games/sudoku/sudoku_${lang}.html`;
  }

  // 모바일 드롭다운 열고 닫기
  document.querySelectorAll('.mobile-dropdown > a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      a.parentElement.classList.toggle('open');
    });
  });
});

