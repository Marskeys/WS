let isCharRainPaused = false;

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("cherry-canvas");
  const ctx = canvas?.getContext("2d");

  if (canvas && ctx) {
    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const webTerms = [
      "<html>", "<body>", "<a>", "<div>", "<script>", "<form>", "<input>", "<button>",
      "display: flex;", "justify-content: center;", "background-color:", "font-size:",
      "function()", "let", "const", "await fetch()", "JSON.parse()", "addEventListener()",
      "SELECT * FROM users;", "INSERT INTO table;", "UPDATE posts", "DELETE FROM table;",
      "POST /login", "GET /api", "express()", "res.send()", "status(200)",
      "403 Forbidden", "404 Not Found", "JWT", "GraphQL", "WebSocket", "SEO"
    ];

    const fallingTerms = [];
    const termCount = 40; // 🌟 줄였음

    for (let i = 0; i < termCount; i++) {
      fallingTerms.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedY: 0.5 + Math.random() * 1.2,
        speedX: Math.random() * 0.4 - 0.2,
        angle: Math.random() * 360,
        rotateSpeed: Math.random() * 0.6 - 0.3,
        text: webTerms[Math.floor(Math.random() * webTerms.length)],
        fontSize: 8 + Math.random() * 4,
        opacity: 0, // 🌟 처음엔 투명
        fadeInSpeed: 0.02 + Math.random() * 0.01 // 각자 페이드인 속도 다르게
      });
    }

    function drawTerms() {
      if (isCharRainPaused) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let t of fallingTerms) {
        // 🌟 페이드인
        if (t.opacity < 1) {
          t.opacity += t.fadeInSpeed;
          if (t.opacity > 1) t.opacity = 1;
        }

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.angle * Math.PI) / 180);
        ctx.globalAlpha = t.opacity; // ✨ 여기서 투명도 적용
        ctx.font = `${t.fontSize}px monospace`;
        ctx.fillStyle = "#00ff66";
        ctx.fillText(t.text, 0, 0);
        ctx.restore();

        t.y += t.speedY;
        t.x += t.speedX;
        t.angle += t.rotateSpeed;

        if (t.y > canvas.height || t.x < -300 || t.x > canvas.width + 300) {
          t.y = -10;
          t.x = Math.random() * canvas.width;
          t.text = webTerms[Math.floor(Math.random() * webTerms.length)];
          t.opacity = 0; // 🌟 다시 떨어질 땐 처음부터 페이드인
        }
      }

      requestAnimationFrame(drawTerms);
    }

    drawTerms();

    // 🍔 햄버거 메뉴 제어
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
        drawTerms();
      }
    });
  }
});
