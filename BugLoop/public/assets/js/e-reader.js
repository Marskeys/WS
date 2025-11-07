// ===============================
// 페이지 데이터 구성
// ===============================
const charsPerPage = 1200;
const pages = [];

// 문단을 <p>로 감싸주는 함수
function wrapContentInParagraphs(content) {
  const paragraphs = content.split(/\n{2,}/g).filter(p => p.trim() !== '');
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
}

// section 데이터 → pages 배열로 변환
book.sections.forEach((section, index) => {
  if (section.type === 'subtitle') {
    const nextBodyIndex = book.sections.findIndex((s, i) => i > index && s.type === 'body');
    if (nextBodyIndex !== -1) {
      const nextBody = book.sections[nextBodyIndex];
      const estimatedTitleLength = 50;
      const firstChunk = nextBody.content.slice(0, charsPerPage - estimatedTitleLength);

      pages.push({
        type: 'subtitle-with-body',
        subtitle: section.title,
        content: firstChunk
      });

      const remainingContent = nextBody.content.slice(firstChunk.length);
      for (let i = 0; i < remainingContent.length; i += charsPerPage) {
        pages.push({ type: 'body', content: remainingContent.slice(i, i + charsPerPage) });
      }
      nextBody.processed = true;
    } else {
      pages.push({ type: 'subtitle', content: section.title });
    }
  } else if (section.type === 'body' && !section.processed) {
    for (let i = 0; i < section.content.length; i += charsPerPage) {
      pages.push({ type: 'body', content: section.content.slice(i, i + charsPerPage) });
    }
  }
});

// ===============================
// DOM 요소 참조
// ===============================
let currentPage = 0;
const pageText = document.getElementById("pageText");
const pageIndex = document.getElementById("pageIndex");
const tocEl = document.getElementById("toc");
const bodyEl = document.body;
const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = darkModeToggle.querySelector('i');
const darkModeLabel = document.getElementById("darkModeLabel");

// ===============================
// Dark Mode
// ===============================
const initialDarkMode = localStorage.getItem('darkMode') === 'true';

function setDarkMode(isDark) {
  if (isDark) {
    bodyEl.classList.add("dark");
    darkModeIcon.classList.replace("fa-moon", "fa-sun");
    darkModeLabel.innerText = "라이트 모드";
    localStorage.setItem('darkMode', 'true');
  } else {
    bodyEl.classList.remove("dark");
    darkModeIcon.classList.replace("fa-sun", "fa-moon");
    darkModeLabel.innerText = "다크 모드";
    localStorage.setItem('darkMode', 'false');
  }
}

setDarkMode(initialDarkMode);

// ===============================
// 페이지 렌더링
// ===============================
function renderPage() {
  const pageData = pages[currentPage];
  let content = '';

  if (currentPage === 0) {
    content = `<h1>${book.title}</h1>${wrapContentInParagraphs(pageData.content)}`;
  } else if (pageData.type === 'subtitle-with-body') {
    content = `<h2 class="sub-chapter-title">${pageData.subtitle}</h2>${wrapContentInParagraphs(pageData.content)}`;
  } else {
    content = wrapContentInParagraphs(pageData.content);
  }

  pageText.innerHTML = content;
  pageText.scrollTop = 0;
  pageIndex.innerText = `${currentPage + 1} / ${pages.length}`;
}

// ===============================
// 목차
// ===============================
function renderTOC() {
  const tocList = document.getElementById("tocList");
  tocList.innerHTML = `<li onclick="goTo(0)">${book.chapterTitle} (p.1)</li>`;

  book.sections.forEach(section => {
    if (section.type === 'subtitle') {
      const idx = pages.findIndex(p => p.type === 'subtitle-with-body' && p.subtitle === section.title);
      if (idx !== -1) {
        tocList.innerHTML += `<li onclick="goTo(${idx})" class="toc-subtitle">${section.title} (p.${idx + 1})</li>`;
      }
    }
  });
}

function goTo(i) {
  currentPage = i;
  renderPage();
  tocEl.classList.remove("open");
}

// ===============================
// 버튼 이벤트
// ===============================
document.getElementById("nextBtn").onclick = () => {
  if (currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  }
};

document.getElementById("prevBtn").onclick = () => {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
};

document.getElementById("tocToggle").onclick = () => {
  tocEl.classList.toggle("open");
};

document.getElementById("homeBtn").onclick = () => {
  window.location.href = "/";
};

darkModeToggle.onclick = () => setDarkMode(!bodyEl.classList.contains("dark"));

// ===============================
// 모바일 슬라이드 제스처
// ===============================
let touchStartX = 0;
let touchEndX = 0;

document.body.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.body.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  if (touchStartX - touchEndX > 50 && currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  } else if (touchEndX - touchStartX > 50 && currentPage > 0) {
    currentPage--;
    renderPage();
  }
}, { passive: true });

// ===============================
renderTOC();
renderPage();
