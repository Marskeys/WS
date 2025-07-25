let isCharRainPaused = false;

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("matrix-canvas");
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
    const termCount = 40;

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
        opacity: 0,
        fadeInSpeed: 0.02 + Math.random() * 0.01
      });
    }

    function drawTerms() {
      if (isCharRainPaused) return;

      // 💡 현재 다크모드인지 확인
      const isDark = document.documentElement.classList.contains("dark");

      // 💡 색상 설정
      const textColor = "rgba(97, 104, 109, 0.58)";

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let t of fallingTerms) {
        if (t.opacity < 1) {
          t.opacity += t.fadeInSpeed;
          if (t.opacity > 1) t.opacity = 1;
        }

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.angle * Math.PI) / 180);
        ctx.globalAlpha = t.opacity;
        ctx.font = `${t.fontSize}px monospace`;
        ctx.fillStyle = textColor; // 💚 모드에 따른 글자색 적용
        ctx.fillText(t.text, 0, 0);
        ctx.restore();

        t.y += t.speedY;
        t.x += t.speedX;
        t.angle += t.rotateSpeed;

        if (t.y > canvas.height || t.x < -300 || t.x > canvas.width + 300) {
          t.y = -10;
          t.x = Math.random() * canvas.width;
          t.text = webTerms[Math.floor(Math.random() * webTerms.length)];
          t.opacity = 0;
        }
      }

      requestAnimationFrame(drawTerms);
    }

    drawTerms();

  }
});
