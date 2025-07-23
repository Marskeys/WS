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

    // ✨ 다양한 웹개발 용어 모음
    const webTerms = [
      // HTML
      "<!DOCTYPE html>", "<html>", "<head>", "<body>", "<div>", "<span>", "<a>", "<img>", "<form>", "<input>", "<button>", "<ul>", "<li>", "<table>", "<thead>", "<tbody>", "<tr>", "<td>", "<script>", "<link>", "<meta>", "</html>",

      // CSS
      "display: flex;", "justify-content: center;", "align-items: center;", "position: absolute;", "color: #fff;", "background-color: #000;", "margin: 0 auto;", "padding: 1rem;", "font-size: 16px;", "z-index: 1000;", "border-radius: 10px;",

      // JS
      "function()", "=>", "const", "let", "var", "if()", "else", "for()", "while()", "try{}", "catch()", "return", "async", "await", "fetch()", "setTimeout()", "document.querySelector()", "addEventListener()", "JSON.parse()", "localStorage.getItem()",

      // SQL
      "SELECT * FROM users;", "INSERT INTO table VALUES(...);", "UPDATE posts SET title='...';", "DELETE FROM comments;", "WHERE id = 1", "INNER JOIN", "LEFT JOIN", "CREATE TABLE users (...);", "DROP DATABASE;", "ALTER TABLE add column;",

      // 서버 / 기타
      "npm install", "node server.js", "express()", "res.send()", "req.params", "POST /login", "GET /api/users", "status(200)", "MongoDB", "Redis", "const app = express();", "require('fs')",

      // 기타 키워드
      "403 Forbidden", "404 Not Found", "200 OK", "500 Internal Server Error", "CORS policy", "OAuth 2.0", "JWT", "REST API", "GraphQL", "WebSocket", "CDN", "SEO", "DevTools"
    ];

    const fallingTerms = [];
    const termCount = 90;

    for (let i = 0; i < termCount; i++) {
      fallingTerms.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speedY: 0.8 + Math.random() * 1.2,
        speedX: Math.random() * 0.4 - 0.2,
        angle: Math.random() * 360,
        rotateSpeed: Math.random() * 0.8 - 0.4,
        text: webTerms[Math.floor(Math.random() * webTerms.length)],
        fontSize: 8 + Math.random() * 4, // 🌟 작게 조정됨: 8 ~ 12px 사이
      });
    }

    function drawTerms() {
      if (isCharRainPaused) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let t of fallingTerms) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.angle * Math.PI) / 180);
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
        }
      }

      requestAnimationFrame(drawTerms);
    }

    drawTerms();

    // 🍔 햄버거 메뉴에서 일시 정지 & 재개
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
