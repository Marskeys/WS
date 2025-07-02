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



function updateHeaderCover() {
  const header = document.querySelector('.top-controls');
  const cover = document.querySelector('.header-cover');

  const rect = header.getBoundingClientRect();
  const headerTop = rect.top;

  // 💡 헤더가 아래로 밀려 있으면, 그 만큼 커버의 height 증가
  cover.style.height = headerTop > 0 ? headerTop + 'px' : '0px';
}

window.addEventListener('scroll', updateHeaderCover);
window.addEventListener('resize', updateHeaderCover);
window.addEventListener('load', updateHeaderCover);