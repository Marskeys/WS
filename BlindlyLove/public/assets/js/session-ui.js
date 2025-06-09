// 로그인 상태 확인 및 UI 업데이트
fetch("/session")
  .then(res => res.json())
  .then(data => {
    const authDiv = document.querySelector(".auth-buttons");
    const writeContainer = document.getElementById("write-container");

    if (!authDiv) return;

    if (data.loggedIn) {
      authDiv.innerHTML = `
        <span class="welcome-msg">안녕하세요, ${data.username}님!</span>
        <button id="logout-btn" class="auth-btn">로그아웃</button>
      `;

      // ✅ 관리자일 때만 글쓰기 버튼 보이기
      if (writeContainer) {
        if (data.is_admin) {
          writeContainer.style.display = "block";
        } else {
          writeContainer.style.display = "none";
        }
      }

      document.getElementById("logout-btn").addEventListener("click", () => {
        fetch("/logout", { method: "POST" }).then(() => {
          location.reload();
        });
      });

    } else {
      // ✅ 로그인 버튼에 현재 위치 기반 redirect 파라미터 추가!
      const currentPath = window.location.pathname;
      const encodedPath = encodeURIComponent(currentPath);

      authDiv.innerHTML = `
        <a href="/login.html?redirect=${encodedPath}" class="auth-btn">로그인</a>
        <a href="/signup" class="auth-btn">회원가입</a>
      `;

      // ✅ 글쓰기 버튼 숨기기
      if (writeContainer) {
        writeContainer.style.display = "none";
      }
    }
  });
