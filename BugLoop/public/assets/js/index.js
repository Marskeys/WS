let isCharRainPaused = false;

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("cherry-canvas");
  const ctx = canvas?.getContext("2d");

  if (canvas && ctx) {
    // 캔버스 사이즈 초기화 및 반응형
    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // 캐릭터들 초기화
    const fallingChars = [];
    const charCount = 80;
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < charCount; i++) {
      fallingChars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedY: 1 + Math.random() * 2,
        speedX: Math.random() * 0.5 - 0.25,
        angle: Math.random() * 360,
        rotateSpeed: Math.random() * 1 - 0.5,
        char: charset[Math.floor(Math.random() * charset.length)],
        fontSize: 16 + Math.random() * 8,
      });
    }

    function drawCharacters() {
      if (isCharRainPaused) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let c of fallingChars) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.angle * Math.PI) / 180);
        ctx.font = `bold ${c.fontSize}px monospace`;
        ctx.fillStyle = "#00FF00"; // 매트릭스 느낌 초록색
        ctx.fillText(c.char, 0, 0);
        ctx.restore();

        c.y += c.speedY;
        c.x += c.speedX;
        c.angle += c.rotateSpeed;

        if (c.y > canvas.height || c.x < -20 || c.x > canvas.width + 20) {
          c.y = -10;
          c.x = Math.random() * canvas.width;
          c.char = charset[Math.floor(Math.random() * charset.length)];
        }
      }

      requestAnimationFrame(drawCharacters);
    }

    drawCharacters();

    // 메뉴 열릴 때 멈추고, 닫히면 다시 시작
    const hamburger = document.getElementById("hamburger-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileMenuHeader = mobileMenu?.querySelector(".mobile-menu-header");
    const headerTop = document.querySelector(".header-top");

    hamburger?.addEventListener("click", () => {
      if (!mobileMenu.classList.contains("open")) {
        mobileMenuHeader?.appendChild(hamburger);
        hamburger.classList.add("is-in-menu");
      } else {
        headerTop?.prepend(hamburger);
        hamburger.classList.remove("is-in-menu");
      }

      mobileMenu.classList.toggle("open");
      hamburger.classList.toggle("open");
      document.body.classList.toggle("menu-open");

      const isOpen = mobileMenu.classList.contains("open");
      if (isOpen) {
        setTimeout(() => {
          isCharRainPaused = true;
        }, 200);
      } else {
        isCharRainPaused = false;
        drawCharacters();
      }
    });
  }

  // 기존 캐릭터 애니메이션 및 기타 코드 유지...
});
