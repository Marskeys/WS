document.addEventListener("DOMContentLoaded", () => {
  // ✅ 1. 로그인 submit 처리
  const loginForm = document.querySelector("#loginBox form");

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

  // ✅ 2. 로그인 버튼 토글
  const loginBtn = document.getElementById("login");
  const loginBox = document.getElementById("loginBox");

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

    // ✅ 3. header-cover 초기 위치 설정
    updateHeaderCover();

});

// ✅ 3. 프리로더 서서히 사라지기
window.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');

  if (preloader) {
    preloader.classList.add('fade-out');

    setTimeout(() => {
      preloader.style.display = 'none';
    }, 200); // 이 시간은 CSS에서 transition: opacity 0.6s와 동일해야 함
  }
});

let ticking = false;

function updateHeaderCover() {
  if (ticking) return; // 이전 프레임 끝나기 전이면 패스

  ticking = true;

  requestAnimationFrame(() => {
    const header = document.querySelector('.top-controls');
    const cover = document.querySelector('.header-cover');

    if (!header || !cover) return;

    const rect = header.getBoundingClientRect();
    const headerTop = rect.top;

    cover.style.height = headerTop > 0 ? headerTop + 40 + 'px' : '0px';

    ticking = false; // 다음 프레임부터 또 가능하게
  });
}

// ✅ 1초에 10번 체크 (100ms마다)
setInterval(() => {
  updateHeaderCover();
}, 10);

function positionMobileMenu() {
  const header = document.querySelector('.top-controls');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!header || !mobileMenu) return;

  const rect = header.getBoundingClientRect();
  mobileMenu.style.top = rect.top + 'px';  // 헤더 윗면 기준
}

// 적용 시점
window.addEventListener('scroll', positionMobileMenu);
window.addEventListener('resize', positionMobileMenu);
window.addEventListener('load', positionMobileMenu);
document.addEventListener('DOMContentLoaded', positionMobileMenu);
setInterval(positionMobileMenu, 20); // 광고 꼬리 당김 대응

window.addEventListener('scroll', updateHeaderCover);
window.addEventListener('resize', updateHeaderCover);
window.addEventListener('load', updateHeaderCover);