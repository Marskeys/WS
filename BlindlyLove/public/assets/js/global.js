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
});

// ✅ 3. 프리로더 서서히 사라지기
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');

  if (preloader) {
    preloader.classList.add('fade-out');

    setTimeout(() => {
      preloader.style.display = 'none';
    }, 200); // 이 시간은 CSS에서 transition: opacity 0.6s와 동일해야 함
  }
});
