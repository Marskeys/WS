document.addEventListener("DOMContentLoaded", () => {
  // 🌸 벚꽃 애니메이션
  const canvas = document.getElementById("cherry-canvas");
  const ctx = canvas.getContext("2d");
  const petals = [];
  const petalCount = 55;

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

  // 👤 로그인 세션 확인
  fetch("/session")
    .then(res => res.json())
    .then(data => {
      const authDiv = document.querySelector(".auth-buttons");
      if (!authDiv) return;

      if (data.loggedIn) {
        authDiv.innerHTML = `
          <span class="welcome-msg">안녕하세요, ${data.username}님!</span>
          <button id="logout-btn" class="auth-btn">로그아웃</button>
        `;
        document.getElementById("logout-btn").addEventListener("click", () => {
          fetch("/logout", { method: "POST" }).then(() => location.reload());
        });
      } else {
        authDiv.innerHTML = `
          <a href="/login" class="auth-btn login">로그인</a>
          <a href="/signup" class="auth-btn signup">회원가입</a>
        `;
      }
    });

  // 🧪 휠체어 캐릭터 플립 테스트 (제자리에서 좌우 뒤집힘만 반복)
  const characterObject = document.getElementById("character-svg");

  function animateChar2(svgDoc) {
    const group = svgDoc.getElementById("char-2");
    if (!group) return;
  
    // 중심 기준으로 flip 적용
    group.setAttribute("style", "transform-box: fill-box; transform-origin: center;");
  
    let x = 0;
    let direction = 1;
    const step = 2.5;
    const speed = 12;
    const maxX = 500;
    const minX = 0;
  
    function frame() {
      const flip = direction === -1 ? -1 : 1;
  
      // ✅ 사인 함수로 y 좌표 부드럽게 흔들기 + 랜덤한 튐 (울퉁불퉁 효과)
      const waveY = Math.sin(x * 0.05) * 3;       // 부드러운 곡선
      const bump = Math.random() * 1.2 - 0.6;     // 작은 우둘투둘한 충격 표현
      const y = waveY + bump;
  
      group.setAttribute("transform", `translate(${x}, ${y}) scale(${flip},1)`);
  
      x += step * direction;
  
      if (x >= maxX || x <= minX) {
        direction *= -1;
      }
  
      setTimeout(frame, speed);
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
          animateChar2(svgDoc); // ✅ 이걸로 바꿔야 휠체어가 이동함!
        }
      }, 200);
    });
  }

  // 🔍 검색 시 동작
  document.querySelector("#search-form").addEventListener("submit", function(e) {
    e.preventDefault();
    document.querySelector("#left-column").classList.remove("expanded");
    document.querySelector("#left-column").classList.add("collapsed");
    document.querySelector("#right-panel").classList.remove("hidden");
    document.querySelector("#right-panel").classList.add("visible");
  });

  // 🍔 햄버거 버튼 토글
  const toggleBtn = document.querySelector(".hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      toggleBtn.classList.toggle("open");
      mobileMenu?.classList.toggle("open");
    });
  }

  // 📍 캐릭터 위치 조정
  function positionCharacterToSearchBox() {
    const searchForm = document.getElementById('search-form');
    const character = document.querySelector('.character-stand');

    if (!searchForm || !character) return;

    const searchRect = searchForm.getBoundingClientRect();

    character.style.position = 'absolute';
    character.style.left = `${searchRect.left + window.scrollX + 30}px`;
    character.style.top = `${searchRect.top + window.scrollY - 175}px`;
  }

  positionCharacterToSearchBox();
  window.addEventListener('resize', positionCharacterToSearchBox);
  window.addEventListener('scroll', positionCharacterToSearchBox);

  // 📱 모바일 검색 UI
  const form = document.getElementById("search-form");
  const searchInput = document.querySelector(".search-box");
  const mobileResults = document.getElementById("mobile-search-results");
  const rightPanel = document.getElementById("right-panel");

  form.addEventListener("submit", (e) => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      e.preventDefault();
      rightPanel.classList.remove("visible");
      mobileResults.classList.add("visible");

      const searchContainer = document.querySelector(".search-container");
      searchContainer.style.position = "fixed";
      searchContainer.style.top = "0";
      searchContainer.style.left = "0";
      searchContainer.style.right = "0";
      searchContainer.style.zIndex = "1003";
      searchContainer.style.background = "white";
      searchContainer.style.padding = "1rem";
      searchContainer.style.borderBottom = "1px solid #ddd";

      const resultsInner = mobileResults.querySelector(".results-inner");
      resultsInner.innerHTML = `<h2>"${searchInput.value}" 검색 결과</h2><p>모바일 전용 검색 결과입니다.</p>`;
    } else {
      rightPanel.classList.add("visible");
    }
  });
});
