/**
 * index.js
 * - 전역 효과 / 레이아웃 관련
 * - index 페이지 공통 초기화
 * - 다른 기능 JS의 진입점 역할
 */

/* =====================================================
   전역 상태
===================================================== */
let isCharRainPaused = false;

/* =====================================================
   DOMContentLoaded
===================================================== */
document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     언어
  =============================== */
  window.lang =
    document.documentElement.getAttribute("lang") || "ko";

  /* ===============================
     1. Matrix / Code Rain Canvas
  =============================== */
  const canvas = document.getElementById("matrix-canvas");
  const ctx = canvas?.getContext("2d");

  if (canvas && ctx) {
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

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

    const drawTerms = () => {
      if (isCharRainPaused) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const t of fallingTerms) {
        if (t.opacity < 1) {
          t.opacity += t.fadeInSpeed;
          if (t.opacity > 1) t.opacity = 1;
        }

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.angle * Math.PI) / 180);
        ctx.globalAlpha = t.opacity;
        ctx.font = `${t.fontSize}px monospace`;
        ctx.fillStyle = "rgba(97, 104, 109, 0.58)";
        ctx.fillText(t.text, 0, 0);
        ctx.restore();

        t.y += t.speedY;
        t.x += t.speedX;
        t.angle += t.rotateSpeed;

        if (
          t.y > canvas.height ||
          t.x < -300 ||
          t.x > canvas.width + 300
        ) {
          t.y = -10;
          t.x = Math.random() * canvas.width;
          t.text = webTerms[Math.floor(Math.random() * webTerms.length)];
          t.opacity = 0;
        }
      }

      requestAnimationFrame(drawTerms);
    };

    drawTerms();
  }

  /* ===============================
     2. Sidebar Scroll Overlay
  =============================== */
  const sidebar = document.querySelector(".sidebar-extension-panel");
  const overlay = document.querySelector(".main-panel .dark-overlay");

  if (sidebar && overlay) {
    sidebar.addEventListener("scroll", () => {
      const scrollTop = sidebar.scrollTop;
      const maxScroll = sidebar.scrollHeight - sidebar.clientHeight;

      const ratio = maxScroll === 0 ? 0 : scrollTop / maxScroll;
      const darkness = Math.min(ratio * 0.95, 0.95);

      overlay.style.backgroundColor =
        `rgba(0, 0, 0, ${darkness})`;
    });
  }

  /* ===============================
     3. 다른 JS 진입점 (나중에 연결)
     - posts.js
     - books.js
  =============================== */

  if (typeof window.initPosts === "function") {
    window.initPosts({ lang: window.lang });
  }

  if (typeof window.initBooks === "function") {
    window.initBooks({
      lang: window.lang,
      booksData: window.booksData
    });
  }
});
