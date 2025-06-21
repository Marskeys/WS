console.log("✅ global.js loaded");

// ✅ 로그인 버튼 토글 기능
document.addEventListener("DOMContentLoaded", () => {
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


// ✅ 프리로더: 모든 이미지/SVG까지 로드된 후 본문 나타나게
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const mainContent = document.getElementById("main-content");

  // 캐릭터 먼저 보이게
  document.querySelectorAll(".character-stand").forEach((el) => {
    el.classList.add("visible");
  });

  preloader.style.opacity = "0";
  setTimeout(() => {
    preloader.style.display = "none";
    mainContent.classList.add("fade-in");

    // 캐릭터 위치 지정
    positionCharacterToSearchBox();
  }, 500);
});
