function filterBoard(category) {
  const allTabs = document.querySelectorAll(".tab");
  const allMobilePosts = document.querySelectorAll(".mobile-post-item");

  // 탭 active 클래스 처리
  allTabs.forEach((tab) => {
    tab.classList.remove("active");
    if (
      tab.textContent === category ||
      (category === "all" && tab.textContent === "전체글")
    ) {
      tab.classList.add("active");
    }
  });


  const players = {};

  function onYouTubeIframeAPIReady() {
    document.querySelectorAll('.video-wrapper').forEach(wrapper => {
      const videoId = wrapper.dataset.videoId;
      const playerId = wrapper.dataset.playerId;

      players[playerId] = new YT.Player(playerId, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          playsinline: 1
        },
        events: {
          'onReady': () => {
            const button = wrapper.querySelector('.play-button');
            button.addEventListener('click', () => {
              wrapper.querySelector('.video-thumbnail').remove();
              players[playerId].playVideo();
            });
          }
        }
      });
    });
  }

  const items = document.querySelectorAll('.grid-item');
  const ballContainer = document.getElementById('orbit-balls');

  const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff', '#ffff00', '#00ff00', '#ff6600'];
  const balls = [];

  colors.forEach((color, i) => {
    const ball = document.createElement('div');
    ball.className = 'orbit-ball';
    ball.style.background = color;
    ball.style.opacity = '0';
    ball.style.transition = 'opacity 0.2s ease-in-out';
    ball.style.zIndex = 1000 + i;

    ball.style.setProperty('--glow-color', color);
    ball.style.boxShadow = `0 0 8px ${color}, 0 0 15px ${color}`;

    const after = document.createElement('style');
    document.head.appendChild(after);
    after.sheet.insertRule(`
      .orbit-ball:nth-child(${i + 1})::after {
        background: ${color};
      }
    `);

    ballContainer.appendChild(ball);
    balls.push(ball);
  });

  function getBoxPath(box) {
    const rect = box.getBoundingClientRect();
    const basePadding = 4;
    const hologramFix = box.classList.contains('hologram-border') ? 6 : 0;
    const radiusFix = box.classList.contains('marskeys-intro') ? 0.5 : 3;

    let x0 = rect.left + window.scrollX - basePadding + hologramFix;
    let y0 = rect.top + window.scrollY - basePadding + hologramFix;
    const w = rect.width + basePadding * 2 - hologramFix * 2;
    const h = rect.height + basePadding * 2 - hologramFix * 2;

    if (box.classList.contains('marskeys-intro')) {
      x0 -= 2;
      y0 += -2;
    }

    return [
      [x0, y0],
      [x0 + w - radiusFix * 2, y0],
      [x0 + w - radiusFix * 2, y0 + h - radiusFix * 2],
      [x0, y0 + h - radiusFix * 2],
      [x0, y0]
    ];
  }

  // ✅ 공이 헤더에 닿았는지 충돌 체크
  function checkCollisionWithHeader(ball) {
    const header = document.getElementById('stickyHeader');
    if (!header) return;
    const headerRect = header.getBoundingClientRect();
    const ballRect = ball.getBoundingClientRect();

    const collided = !(
      ballRect.bottom < headerRect.top ||
      ballRect.top > headerRect.bottom ||
      ballRect.right < headerRect.left ||
      ballRect.left > headerRect.right
    );

    ball.style.opacity = collided ? '0' : '1';
  }

  function moveBall(ball, targetBox, next) {
  if (ball.dataset.busy === "true") return;
  ball.dataset.busy = "true";

  let i = 0;
  const steps = 120;

  function moveSegment() {
    const latestPath = getBoxPath(targetBox);

    if (!latestPath || latestPath.length < 2) {
      // 경로가 너무 짧거나 이상하면 바로 다음으로
      ball.dataset.busy = "false";
      return next();
    }

    if (i >= latestPath.length - 1) {
      ball.dataset.busy = "false";
      return next();
    }

    let step = 0;

    function stepMove() {
      const refreshedPath = getBoxPath(targetBox);
      if (!refreshedPath[i + 1]) {
        ball.dataset.busy = "false";
        return next();
      }

      const [x1, y1] = refreshedPath[i];
      const [x2, y2] = refreshedPath[i + 1];
      const dx = (x2 - x1) / steps;
      const dy = (y2 - y1) / steps;

      if (step <= steps) {
        const x = x1 + dx * step;
        const y = y1 + dy * step;

        if (!isFinite(x) || !isFinite(y)) {
          ball.dataset.busy = "false";
          return next();
        }

        ball.style.left = x + 'px';
        ball.style.top = y + 'px';
        ball.dataset.lastMoved = Date.now().toString();

          // ✅ 여기서 헤더 충돌 검사 호출!
      checkCollisionWithHeader(ball);

      createTrail(x, y, ball.style.background, ball);
        step++;
        requestAnimationFrame(stepMove);
      } else {
        i++;
        moveSegment();
      }
    }

    stepMove();
  }

  moveSegment();
}

function startLoop(ball, offset = 0) {
  // 👉 움직이기 시작할 때 페이드인
  ball.style.opacity = '1';

  let current = offset % items.length;

  function loop() {
    const box = items[current];
    moveBall(ball, box, () => {
      current = (current + 1) % items.length;
      setTimeout(loop, 300);
    });
  }

  loop();
}

  window.addEventListener('load', () => {
    balls.forEach((ball, i) => {
      const targetBox = items[Math.floor(Math.random() * items.length)];
      const rect = targetBox.getBoundingClientRect();
      const x = rect.left + window.scrollX + Math.random() * rect.width;
      const y = rect.top + window.scrollY + Math.random() * rect.height;
      ball.style.position = 'absolute';
      ball.style.left = `${x}px`;
      ball.style.top = `${y}px`;

      setTimeout(() => startLoop(ball, i), i * 1200);
    });
  });

  // 🔁 trail 만들 때 ball ID로 연결
function createTrail(x, y, color, ball) {
  const radius = 3;

  const trail = document.createElement('div');
  trail.className = 'trail';
  trail.style.position = 'absolute';
  trail.style.left = `${x + radius}px`;
  trail.style.top = `${y + radius}px`;
  trail.style.width = '2px';
  trail.style.height = '2px';
  trail.style.borderRadius = '50%';
  trail.style.background = color;
  trail.style.opacity = '0.6';
  trail.style.pointerEvents = 'none';
  trail.style.zIndex = '1';
  trail.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

  // ✅ 이 공의 고유 ID 지정
  const ballId = ball.dataset.id || crypto.randomUUID();
  ball.dataset.id = ballId;
  trail.dataset.ballId = ballId;

  document.body.appendChild(trail);

  requestAnimationFrame(() => {
    trail.style.opacity = '0';
    trail.style.transform = 'scale(0.2)';
  });

  setTimeout(() => {
    trail.remove();
  }, 600);
}

  function toggleSize(el) {
  const isExpanded = el.classList.contains('expanded');

  el.classList.toggle("expanded");

  const image = el.querySelector(".about-image");
  if (image) {
    image.classList.toggle("hidden");
    image.style.display = '';
  }

  const text = el.querySelector(".about-text");
if (text) {
  text.classList.toggle("hidden");
}

  if (isExpanded) {
    el.classList.remove('large');
    el.classList.add('about-me', 'small');
    el.style.gridRow = '';
  } else {
    el.classList.remove('small', 'about-me');
    el.classList.add('large');

    const img = el.querySelector('img');
    if (img) {
      if (img.complete) {
        adjustRowSpan(el, img);
      } else {
        img.onload = () => adjustRowSpan(el, img);
      }
    }
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateAllBallPaths();
    });
  });

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateAllBallPaths() {
  const items = document.querySelectorAll('.grid-item');

  balls.forEach(ball => {
    const targetBox = items[Math.floor(Math.random() * items.length)];
    const path = getBoxPath(targetBox);

    moveBall(ball, path, () => {
      startLoop(ball, Math.floor(Math.random() * items.length));
    });
  });
}


function adjustRowSpan(item, img) {
  const grid = document.querySelector('.grid'); // ← grid-container가 아니라 .grid!
  const rowHeight = parseInt(getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
  const rowGap = parseInt(getComputedStyle(grid).getPropertyValue('gap') || 0);
  const imgHeight = img.getBoundingClientRect().height;

  const total = imgHeight + rowGap;
  const span = Math.ceil(total / (rowHeight + rowGap));

  item.style.gridRow = `span ${span}`;
}



