window.addEventListener("DOMContentLoaded", () => {
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

  // 🦽 SVG 캐릭터 애니메이션
  const totalChars = 11;
  const interval = 500;
  const reappearDelay = 500;
  const initialHold = 2000;

  function setOpacityOfGroup(svgDoc, index, value) {
    const group = svgDoc.getElementById(`char-${index}`);
    if (!group) return;
    Array.from(group.children).forEach(child => {
      child.style.transition = "opacity 0.8s ease-in-out";
      child.style.opacity = value;
    });
  }

  function animateChar2(svgDoc) {
    const group = svgDoc.getElementById("char-2");
    if (!group) return;

    group.setAttribute("transform", "translate(0, 0)");

    let x = 0;
    const maxX = 500;
    const step = 2.5;
    const speed = 12;

    function frame() {
      const waveY = Math.sin(x * 0.1) * 3;
      const bump = Math.random() * 0.6 - 0.3;
      const y = waveY + bump;

      group.setAttribute("transform", `translate(${x}, ${y})`);
      x += step;
      if (x <= maxX) {
        setTimeout(frame, speed);
      }
    }

    frame();
  }

  function startSequence() {
    try {
      const svgDoc = document.getElementById("character-svg")?.contentDocument;
      if (!svgDoc) return;

      for (let i = 0; i < totalChars; i++) {
        setOpacityOfGroup(svgDoc, i, 1);
      }

      animateChar2(svgDoc);



      setTimeout(() => {
        const shuffled = Array.from({ length: totalChars }, (_, i) => i).sort(() => Math.random() - 0.5);
        shuffled.forEach((idx, i) => {
          setTimeout(() => {
            setOpacityOfGroup(svgDoc, idx, 0);
          }, i * interval);
        });

        setTimeout(() => {
          for (let i = 0; i < totalChars; i++) {
            setOpacityOfGroup(svgDoc, i, 1);
          }

          const wheelchair = svgDoc.getElementById("char-2");
          if (wheelchair) {
            wheelchair.setAttribute("transform", "translate(0, 0)");
          }

          setTimeout(startSequence, initialHold);
        }, totalChars * interval + reappearDelay);
      }, initialHold);
    } catch (err) {
      console.error("🔥 startSequence 에러:", err);
    }
  }

  const characterObject = document.getElementById("character-svg");

  if (characterObject) {
    characterObject.addEventListener("load", () => {
      const tryStart = setInterval(() => {
        const svgDoc = characterObject.contentDocument;
        const char0 = svgDoc?.getElementById("char-0");

        if (char0) {

          clearInterval(tryStart);
          startSequence();
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

  // 🍔 햄버거 버튼 토글 (엑스자 변형 포함)
  const toggleBtn = document.querySelector(".hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      toggleBtn.classList.toggle("open");           // ✅ 엑스자 토글
      mobileMenu?.classList.toggle("open");         // ✅ 모바일 메뉴 열기
    });
  }
});


// 모바일 검색시 검색창 이동 

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("search-form");
  const searchInput = document.querySelector(".search-box");
  const mobileResults = document.getElementById("mobile-search-results");
  const rightPanel = document.getElementById("right-panel");

  form.addEventListener("submit", (e) => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      e.preventDefault(); // ✅ 모바일에선 기본 제출 막기
      rightPanel.classList.remove("visible"); // ✅ 데스크탑 패널 안 보이게

      // ✅ 모바일 전용 검색 결과 보이게
      mobileResults.classList.add("visible");

      // ✅ 검색창을 위에 고정
      const searchContainer = document.querySelector(".search-container");
      searchContainer.style.position = "fixed";
      searchContainer.style.top = "0";
      searchContainer.style.left = "0";
      searchContainer.style.right = "0";
      searchContainer.style.zIndex = "1003";
      searchContainer.style.background = "white";
      searchContainer.style.padding = "1rem";
      searchContainer.style.borderBottom = "1px solid #ddd";

      // ✅ 결과 채워넣는 예시
      const resultsInner = mobileResults.querySelector(".results-inner");
      resultsInner.innerHTML = `<h2>"${searchInput.value}" 검색 결과</h2><p>모바일 전용 검색 결과입니다.</p>`;
    } else {
      // ✅ 데스크탑일 경우 기존대로 오른쪽 패널 보이게
      rightPanel.classList.add("visible");
    }
  });
});



      // ✅ 슬라이드
      mobileResults.classList.add("visible");


      




      