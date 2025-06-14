document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  // mobileMenuHeader를 다시 찾습니다. (header.ejs 안에 있습니다.)
  const mobileMenuHeader = mobileMenu.querySelector(".mobile-menu-header"); 

  // 햄버거 클릭 시 메뉴 열기/닫기
  hamburger?.addEventListener("click", () => {
    // 햄버거 버튼의 DOM 위치를 변경하는 로직을 다시 활성화합니다.
    if (!mobileMenu.classList.contains("open")) { // 메뉴가 닫혀있다면 (열려고 할 때)
      mobileMenuHeader.appendChild(hamburger); // 햄버거 버튼을 mobile-menu-header 안으로 옮김
      hamburger.classList.add("is-in-menu"); // CSS에서 이 클래스를 활용하여 위치 조정
    } else { // 메뉴가 열려있다면 (닫으려고 할 때)
      // 메뉴를 닫을 때는 원래 위치 (header-top)로 돌려놓음
      document.querySelector('.header-top').prepend(hamburger); // header-top의 맨 앞으로 다시 옮김
      hamburger.classList.remove("is-in-menu"); // is-in-menu 클래스 제거
    }

    mobileMenu.classList.toggle("open"); // 모바일 메뉴 열기/닫기
    hamburger.classList.toggle("open"); // 햄버거 버튼 X자 변환
    document.body.classList.toggle("menu-open"); // body 스크롤 방지 등 (필요시 CSS 추가)
  });


  // 🌸 벚꽃 애니메이션 - 기존과 동일
  const canvas = document.getElementById("cherry-canvas");
  const ctx = canvas?.getContext("2d"); // canvas가 없을 수도 있으므로 null 체크
  const petals = [];
  const petalCount = 55;

  if (canvas && ctx) { // canvas와 context가 존재할 때만 실행
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


  // 👤 로그인 세션 확인 - 기존과 동일
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

  // 🧪 휠체어 캐릭터 플립 테스트 - 기존과 동일
  const characterObject = document.getElementById("character-svg");

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
          animateChar2(svgDoc);
        }
      }, 200);
    });
  }

  // 🔍 검색 시 동작 - 기존과 동일 (CSS 클래스명은 스타일시트에 맞게 수정)
  document.querySelector("#search-form")?.addEventListener("submit", function(e) {
    e.preventDefault();
    document.querySelector("#left-column")?.classList.remove("expanded");
    document.querySelector("#left-column")?.classList.add("collapsed");
    document.querySelector("#right-panel")?.classList.remove("hidden");
    document.querySelector("#right-panel")?.classList.add("visible");
  });

  // 📍 캐릭터 위치 조정 - 기존과 동일
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

  // 📱 모바일 검색 UI - 기존과 동일
  const form = document.getElementById("search-form");
  const searchInput = document.querySelector(".search-box");
  const mobileResults = document.getElementById("mobile-search-results");
  const rightPanel = document.getElementById("right-panel");

  form?.addEventListener("submit", (e) => { // form이 없을 수도 있으므로 null 체크
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      e.preventDefault();
      rightPanel?.classList.remove("visible"); // rightPanel이 없을 수도 있으므로 null 체크
      mobileResults?.classList.add("visible"); // mobileResults가 없을 수도 있으므로 null 체크

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

      const resultsInner = mobileResults?.querySelector(".results-inner"); // mobileResults가 없을 수도 있으므로 null 체크
      if (resultsInner && searchInput) { // searchInput도 없을 수도 있으므로 null 체크
        resultsInner.innerHTML = `<h2>"${searchInput.value}" 검색 결과</h2><p>모바일 전용 검색 결과입니다.</p>`;
      }
    } else {
      rightPanel?.classList.add("visible");
    }
  });
});