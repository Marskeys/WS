document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuHeader = mobileMenu.querySelector(".mobile-menu-header");

  hamburger?.addEventListener("click", () => {
    if (!mobileMenu.classList.contains("open")) {
      mobileMenuHeader.appendChild(hamburger);
      hamburger.classList.add("is-in-menu");
    } else {
      document.querySelector('.header-top').prepend(hamburger);
      hamburger.classList.remove("is-in-menu");
    }

    mobileMenu.classList.toggle("open");
    hamburger.classList.toggle("open");
    document.body.classList.toggle("menu-open");
  });

  const canvas = document.getElementById("cherry-canvas");
  const ctx = canvas?.getContext("2d");
  const petals = [];
  const petalCount = 55;

  if (canvas && ctx) {
    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

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

  const characterObject = document.getElementById("character-svg");

  function positionCharacterToSearchBox() {
    // TODO: 실제 정렬 로직
  }
  
  function animateChar2(svgDoc) {
    const group = svgDoc.getElementById("char-2");
    if (!group) return;

    group.setAttribute("style", "transform-box: fill-box; transform-origin: center;");

    let x = 0;
    let direction = 1;
    const step = 2.5;
    const speed = 12;
    const maxX = 500;
    const minX = 0;
    let paused = false;

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


  window.addEventListener('resize', positionCharacterToSearchBox);
  window.addEventListener('scroll', positionCharacterToSearchBox);

  const form = document.getElementById("search-form");
  const searchInput = document.querySelector(".search-box");
  const mobileResults = document.getElementById("mobile-search-results");

  form?.addEventListener("submit", (e) => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      e.preventDefault();
      rightPanel?.classList.remove("visible");
      mobileResults?.classList.add("visible");

      const searchContainer = document.querySelector(".search-container");
      if (searchContainer) {
        searchContainer.style.position = "fixed";
        searchContainer.style.top = "0";
        searchContainer.style.left = "0";
        searchContainer.style.right = "0";
        searchContainer.style.zIndex = "1003";
        searchContainer.style.background = "white";
        searchContainer.style.padding = "1rem";
        searchContainer.style.borderBottom = "1px solid #ddd";
      }

      const resultsInner = mobileResults?.querySelector(".results-inner");
      if (resultsInner && searchInput) {
        resultsInner.innerHTML = `<h2>"${searchInput.value}" 검색 결과</h2><p>모바일 전용 검색 결과입니다.</p>`;
      }
    } else {
      rightPanel?.classList.add("visible");
    }
  });
});


  function filterBoard(category) {
    const rows = document.querySelectorAll('#board-content tr');
    rows.forEach(row => {
      const cats = row.getAttribute('data-category').split(',').map(c => c.trim());
      if (category === 'all' || cats.includes(category)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

        // ✅ 모바일용 필터 추가
        const mobileItems = document.querySelectorAll('.mobile-post-item');
        mobileItems.forEach(item => {
          const cats = item.getAttribute('data-category').split(',').map(c => c.trim());
          if (category === 'all' || cats.includes(category)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });

    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab[onclick="filterBoard('${category}')"]`)?.classList.add('active');
  }

