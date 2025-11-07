// ===============================
// 0. 초기 콘텐츠 추출 및 내부 데이터 구조화
// ===============================

const pageTextEl = document.getElementById("pageText");
const rawElements = Array.from(pageTextEl.children);

const book = {
  title: document.title,
  chapterTitle: '',
  sections: []
};

let currentContent = [];

rawElements.forEach(el => {
  const tagName = el.tagName.toLowerCase();

  if (tagName.startsWith('h')) {
    if (currentContent.length > 0) {
      book.sections.push({ type: 'body', content: currentContent.join('\n\n') });
      currentContent = [];
    }

    if (tagName === 'h1' && !book.chapterTitle) {
      book.chapterTitle = el.textContent.trim();
    } else if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
      book.sections.push({
        type: 'subtitle',
        title: el.textContent.trim(),
        level: parseInt(tagName.substring(1))
      });
    }
  } else if (tagName === 'p' || tagName === 'ul' || tagName === 'ol') {
    currentContent.push(el.textContent.trim());
  }
});

if (currentContent.length > 0) {
  book.sections.push({ type: 'body', content: currentContent.join('\n\n') });
}

pageTextEl.innerHTML = '';


// ===============================
// 페이지 데이터 구성
// ===============================
const charsPerPage = 1200;
const pages = [];

function wrapContentInParagraphs(content) {
  const paragraphs = content.split(/\n{2,}/g).filter(p => p.trim() !== '');
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
}

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
        level: section.level || 2,
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
const pageIndex = document.getElementById("pageIndex");
const tocEl = document.getElementById("toc");
const tocList = document.getElementById("tocList");
const bodyEl = document.body;

const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = darkModeToggle.querySelector('i');
const darkModeLabel = document.getElementById("darkModeLabel");


// ===============================
// Dark Mode (다국어 대응 버전)
// ===============================
const initialDarkMode = localStorage.getItem('darkMode') === 'true';

function setDarkMode(isDark) {
  const darkText = darkModeToggle.dataset.dark;   // ex: "다크 모드" / "Dark Mode"
  const lightText = darkModeToggle.dataset.light; // ex: "라이트 모드" / "Light Mode"

  if (isDark) {
    bodyEl.classList.add("dark");
    darkModeIcon.classList.replace("fa-moon", "fa-sun");
    darkModeLabel.innerText = lightText;
    localStorage.setItem('darkMode', 'true');
  } else {
    bodyEl.classList.remove("dark");
    darkModeIcon.classList.replace("fa-sun", "fa-moon");
    darkModeLabel.innerText = darkText;
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
    content = `<h1>${book.chapterTitle}</h1>${wrapContentInParagraphs(pageData.content)}`;
  } else if (pageData.type === 'subtitle-with-body') {
    const HeadingTag = `h${pageData.level || 2}`;
    content = `<${HeadingTag} class="sub-chapter-title">${pageData.subtitle}</${HeadingTag}>${wrapContentInParagraphs(pageData.content)}`;
  } else {
    content = wrapContentInParagraphs(pageData.content);
  }

  pageTextEl.innerHTML = content;
  pageTextEl.scrollTop = 0;
  pageIndex.innerText = `${currentPage + 1} / ${pages.length}`;
}


// ===============================
// 목차 렌더링
// ===============================
function renderTOC() {
  tocList.innerHTML = `<li onclick="goTo(0)" class="toc-chapter">${book.chapterTitle} (p.1)</li>`;

  book.sections.forEach(section => {
    if (section.type === 'subtitle') {
      const idx = pages.findIndex(p => p.type === 'subtitle-with-body' && p.subtitle === section.title);
      if (idx !== -1) {
        const levelClass = `toc-level-${section.level || 2}`;
        tocList.innerHTML += `<li onclick="goTo(${idx})" class="toc-subtitle ${levelClass}">${section.title} (p.${idx + 1})</li>`;
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
// 모바일 터치 슬라이드
// ===============================
let touchStartX = 0;
let touchEndX = 0;

document.body.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.body.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const deltaX = touchStartX - touchEndX;

  if (deltaX > 50 && currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  } else if (deltaX < -50 && currentPage > 0) {
    currentPage--;
    renderPage();
  }
}, { passive: true });


// ===============================
// 초기화
// ===============================
tocList.innerHTML = '';
renderTOC();
renderPage();
