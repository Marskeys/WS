// ✅ 로그인 버튼 토글 기능
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login");
  const loginBox = document.getElementById("loginBox");

  loginBtn?.addEventListener("click", (e) => {
    e.stopPropagation();

    if (loginBox.style.display === "block") {
      loginBox.style.display = "none";
    } else {
      loginBox.style.display = "block";

      const rect = loginBtn.getBoundingClientRect();
      loginBox.style.top = rect.bottom + window.scrollY + "px";
      loginBox.style.left = (rect.right - loginBox.offsetWidth - 35) + window.scrollX + "px";
    }
  });
});

// ✅ 캐릭터 위치 계산 함수
function positionCharacterToSearchBox() {
  const searchForm = document.getElementById('search-form');
  const character = document.querySelector('.character-stand');

  if (!searchForm || !character) return;

  const searchRect = searchForm.getBoundingClientRect();
  character.style.position = 'absolute';
  character.style.left = `${searchRect.left + window.scrollX + 30}px`;
  character.style.top = `${searchRect.top + window.scrollY - 175}px`;
}

// ✅ 캐릭터 애니메이션 함수
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

// ✅ 프리로더 + 캐릭터 SVG 연동
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const mainContent = document.getElementById("main-content");
  const characterObject = document.getElementById("character-svg");

  // 캐릭터 SVG 로드 감지
  if (characterObject) {
    characterObject.addEventListener("load", () => {
      const tryStart = setInterval(() => {
        const svgDoc = characterObject.contentDocument;
        const char2 = svgDoc?.getElementById("char-2");

        if (char2) {
          clearInterval(tryStart);

          // 위치 계산 + 등장 처리
          requestAnimationFrame(() => {
            setTimeout(() => {
              positionCharacterToSearchBox(); // 정확한 위치 잡기
              animateChar2(svgDoc); // 애니 시작

              // 프리로더는 이 이후 제거!
              preloader.style.opacity = "0";
              setTimeout(() => {
                preloader.style.display = "none";
                mainContent.classList.add("fade-in");
                document.querySelectorAll(".character-stand").forEach((el) => {
                  el.classList.add("visible");
                });
              }, 500);
            }, 0);
          });
        }
      }, 200);
    });
  }
});

// ✅ 리사이즈/스크롤 시에도 위치 재계산
window.addEventListener('resize', positionCharacterToSearchBox);
window.addEventListener('scroll', positionCharacterToSearchBox);
