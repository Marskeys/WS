// ✅ 로그인 버튼 토글 기능
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login");
  const loginBox = document.getElementById("loginBox");

  loginBtn.addEventListener("click", (e) => {
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

  // 닫기 기능은 주석 처리된 상태 유지
  // document.addEventListener("click", (e) => {
  //   setTimeout(() => {
  //     const path = e.composedPath();
  //     const insideLoginBox = path.includes(loginBox);
  //     const clickedLoginBtn = path.includes(loginBtn);
  //
  //     if (!insideLoginBox && !clickedLoginBtn) {
  //       loginBox.style.display = "none";
  //     }
  //   }, 200);
  // });
});

// ✅ 프리로더: 모든 이미지/SVG까지 로드된 후 본문 나타나게
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const mainContent = document.getElementById("main-content");

  preloader.style.opacity = "0";

  setTimeout(() => {
    preloader.style.display = "none";
    mainContent.classList.add("fade-in");
  }, 500);
});
