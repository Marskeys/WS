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
  
    // ✅ 내부 클릭 전부 허용: 진짜 작동하게 하려면 composedPath 사용해야 함!
    document.addEventListener("click", (e) => {
        setTimeout(() => {
          const path = e.composedPath();
          const insideLoginBox = path.includes(loginBox);
          const clickedLoginBtn = path.includes(loginBtn);
      
          if (!insideLoginBox && !clickedLoginBtn) {
            loginBox.style.display = "none";
          }
        }, 200); // 0.1초 딜레이
      });
  
  });
  