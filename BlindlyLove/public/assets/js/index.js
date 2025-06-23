function filterBoard(category) {
  const allTabs = document.querySelectorAll(".tab");
  const allDesktopRows = document.querySelectorAll(".board-table tbody tr");
  const allMobilePosts = document.querySelectorAll(".mobile-post-item");

  // 탭 active 클래스 처리
  allTabs.forEach((tab) => {
    tab.classList.remove("active");
    if (
      tab.textContent === category || // "정치", "종교" 등
      (category === "all" && tab.textContent === "전체글")
    ) {
      tab.classList.add("active");
    }
  });

  // 데스크탑 테이블 필터링
  allDesktopRows.forEach((row) => {
    const rowCategory = row.getAttribute("data-category");
    row.style.display =
      category === "all" || rowCategory === category ? "" : "none";
  });

  // 모바일 리스트 필터링
  allMobilePosts.forEach((post) => {
    const postCategory = post.getAttribute("data-category");
    post.style.display =
      category === "all" || postCategory === category ? "" : "none";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuHeader = mobileMenu?.querySelector(".mobile-menu-header");
  const canvas = document.getElementById("cherry-canvas");
  const ctx = canvas?.getContext("2d");
  const characterObject = document.getElementById("character-svg");
  const form = document.getElementById("search-form");
  const input = document.querySelector(".search-box");
  const boardBody = document.getElementById("board-content");
  const tabContainer = document.querySelector(".tabs");
  const mobileResults = document.getElementById("mobile-search-results");
  const rightPanel = document.querySelector(".right-panel-only");

  // 🍔 햄버거 메뉴
  hamburger?.addEventListener("click", () => {
    if (!mobileMenu.classList.contains("open")) {
      mobileMenuHeader?.appendChild(hamburger);
      hamburger.classList.add("is-in-menu");
    } else {
      document.querySelector(".header-top")?.prepend(hamburger);
      hamburger.classList.remove("is-in-menu");
    }

    mobileMenu.classList.toggle("open");
    hamburger.classList.toggle("open");
    document.body.classList.toggle("menu-open");
  });

  // 🌸 벚꽃 애니메이션
  if (canvas && ctx) {
    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const petals = [];
    const petalCount = 55;
    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 4 + Math.random() * 2,
        speedY: 0.4 + Math.random() * 0.7,
        speedX: 0.1 + Math.random() * 0.4,
        angle: Math.random() * 360,
        rotateSpeed: Math.random() * 1.5 - 0.6,
      });
    }

    function drawPetals() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let p of petals) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-p.size / 2, -p.size / 2, -p.size, p.size / 2, 0, p.size);
        ctx.bezierCurveTo(p.size, p.size / 2, p.size / 2, -p.size / 2, 0, 0);
        ctx.fillStyle = "#fddde6";
        ctx.fill();
        ctx.restore();

        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.rotateSpeed;

        if (p.y > canvas.height || p.x > canvas.width + 20) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      }
      requestAnimationFrame(drawPetals);
    }

    drawPetals();
  }

  // 👩‍🦽 캐릭터 애니메이션
  function positionCharacterToSearchBox() { /* TODO */ }

  function animateChar2(svgDoc) {
    const group = svgDoc.getElementById("char-2");
    if (!group) return;
    group.setAttribute("style", "transform-box: fill-box; transform-origin: center;");
    let x = 0, direction = 1, step = 2.5, speed = 12, maxX = 500, minX = 0, paused = false;

    function frame() {
      if (paused) return;
      const flip = direction === -1 ? -1 : 1;
      const waveY = Math.sin(x * 0.05) * 3;
      const bump = Math.random() * 1.2 - 0.6;
      const y = waveY + bump;
      group.setAttribute("transform", `translate(${x}, ${y}) scale(${flip},1)`);
      x += step * direction;

      if ((direction === 1 && x >= maxX) || (direction === -1 && x <= minX)) {
        paused = true;
        setTimeout(() => {
          direction *= -1;
          paused = false;
          frame();
        }, 500);
      } else {
        setTimeout(frame, speed);
      }
    }

    frame();
  }

  if (characterObject) {
    characterObject.addEventListener("load", () => {
      const tryStart = setInterval(() => {
        const svgDoc = characterObject.contentDocument;
        const char2 = svgDoc?.getElementById("char-2");
        if (char2) {
          clearInterval(tryStart);
          requestAnimationFrame(() => {
            setTimeout(() => {
              positionCharacterToSearchBox();
              animateChar2(svgDoc);
            }, 0);
          });
        }
      }, 200);
    });
  }

  window.addEventListener("resize", positionCharacterToSearchBox);
  window.addEventListener("scroll", positionCharacterToSearchBox);

  // 🔍 검색 AJAX
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const keyword = input.value.trim();
    if (!keyword) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      rightPanel?.classList.remove("visible");
      mobileResults?.classList.add("visible");
      document.querySelector(".search-container").style.position = "fixed";
    }

    const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
    const data = await res.json();

    boardBody.innerHTML = '';
    if (data.posts.length === 0) {
      boardBody.innerHTML = '<tr><td colspan="4">검색 결과가 없습니다.</td></tr>';
    } else {
      data.posts.forEach(post => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><a href="/post/${post.id}">${post.title}</a></td>
          <td>${post.author}</td>
          <td>${post.categories}</td>
          <td>${post.created_at.slice(0, 10)}</td>
        `;
        boardBody.appendChild(row);
      });
    }

    // 검색결과 탭 추가
    document.getElementById("search-tab")?.remove();
    const searchTab = document.createElement("button");
    searchTab.className = "tab active";
    searchTab.id = "search-tab";
    searchTab.textContent = "검색결과";
    tabContainer.appendChild(searchTab);

    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    searchTab.classList.add("active");
  });

 

});

window.filterBoard = filterBoard;