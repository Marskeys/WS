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

// HTML → 내부 구조로 변환
rawElements.forEach(el => {
  const tagName = el.tagName.toLowerCase();

  if (tagName.startsWith('h')) {

    // 이전 body 저장
    if (currentContent.length > 0) {
      book.sections.push({ type: 'body', content: currentContent.join('\n\n') });
      currentContent = [];
    }

    // h1 = chapter 제목
    if (tagName === 'h1' && !book.chapterTitle) {
      book.chapterTitle = el.textContent.trim();

    // h2~h4 = subtitle
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

// 마지막 body 처리
if (currentContent.length > 0) {
  book.sections.push({ type: 'body', content: currentContent.join('\n\n') });
}

// 기존 HTML 제거 → JS 렌더링만 사용
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

    const nextBodyIndex = book.sections.findIndex(
      (s, i) => i > index && s.type === 'body'
    );

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
        pages.push({
          type: 'body',
          content: remainingContent.slice(i, i + charsPerPage)
        });
      }

      nextBody.processed = true;

    } else {
      pages.push({ type: 'subtitle', content: section.title });
    }

  } else if (section.type === 'body' && !section.processed) {

    for (let i = 0; i < section.content.length; i += charsPerPage) {
      pages.push({
        type: 'body',
        content: section.content.slice(i, i + charsPerPage)
      });
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
const root = document.documentElement;

const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = darkModeToggle.querySelector('i');
const darkModeLabel = document.getElementById("darkModeLabel");


// ===============================
// Dark Mode
// ===============================
const STORAGE_KEY = "bugloop.theme";

function setDarkMode(isDark) {
  const darkText = darkModeToggle.dataset.dark;
  const lightText = darkModeToggle.dataset.light;

  if (isDark) {
    root.classList.add("dark");
    darkModeIcon.classList.replace("fa-moon", "fa-sun");
    darkModeLabel.innerText = lightText;
    localStorage.setItem(STORAGE_KEY, "dark");
  } else {
    root.classList.remove("dark");
    darkModeIcon.classList.replace("fa-sun", "fa-moon");
    darkModeLabel.innerText = darkText;
    localStorage.setItem(STORAGE_KEY, "light");
  }
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) setDarkMode(saved === "dark");
  else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(prefersDark);
  }
}

loadTheme();


// ===============================
// ⭐ 페이지 렌더링 (여기 수정됨: 첫 페이지 subtitle 포함)
// ===============================
function renderPage() {
  const pageData = pages[currentPage];
  let content = "";

  if (currentPage === 0) {
    // 첫 subtitle 가져오기
    const firstSubtitle = book.sections.find(s => s.type === "subtitle");

    const subtitleHTML = firstSubtitle
      ? `<h2 class="sub-chapter-title">${firstSubtitle.title}</h2>`
      : "";

    content =
      `<h1>${book.chapterTitle}</h1>` +
      subtitleHTML +
      wrapContentInParagraphs(pageData.content);

  } else if (pageData.type === "subtitle-with-body") {

    const HeadingTag = `h${pageData.level || 2}`;
    content =
      `<${HeadingTag} class="sub-chapter-title">${pageData.subtitle}</${HeadingTag}>` +
      wrapContentInParagraphs(pageData.content);

  } else if (pageData.type === "subtitle") {

    const HeadingTag = `h${pageData.level || 2}`;
    content = `<${HeadingTag} class="sub-chapter-title">${pageData.content}</${HeadingTag}>`;

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
function renderLocalTOC() {
  tocList.innerHTML = "";

  tocList.innerHTML += `<li onclick="goTo(0)" class="toc-chapter">${book.chapterTitle} (p.1)</li>`;

  book.sections.forEach(section => {
    if (section.type === "subtitle") {
      const idx = pages.findIndex(
        p => p.type === "subtitle-with-body" && p.subtitle === section.title
      );
      if (idx !== -1) {
        const levelClass = `toc-level-${section.level || 2}`;
        tocList.innerHTML += `<li onclick="goTo(${idx})" class="toc-subtitle ${levelClass}">${section.title} (p.${idx + 1})</li>`;
      }
    }
  });
}


// ===============================
// 전체 책 기반 TOC 렌더링
// ===============================
function renderBookTOC() {
  tocList.innerHTML = "";

  const books = window.BUGLOOP_BOOKS;
  const bookId = window.BUGLOOP_BOOK_ID;
  const currentChapterId = window.BUGLOOP_CURRENT_CHAPTER_ID;
  const lang = document.documentElement.getAttribute("data-lang") || "ko";

  if (!books || !bookId || !books[bookId]) {
    renderLocalTOC();
    return;
  }

  const bookData = books[bookId];
  const basePath = `/${lang}/books/${bookId}/contents/`;

  bookData.toc.forEach(section => {
    const sectionLi = document.createElement("li");
    sectionLi.textContent = section.section;
    sectionLi.className = "toc-section";
    tocList.appendChild(sectionLi);

    const group = document.createElement("ul");
    group.className = "toc-chapter-group";
    tocList.appendChild(group);

    section.chapters.forEach(ch => {
      const li = document.createElement("li");
      li.className = "toc-chapter";
      li.textContent = ch.title;

      if (ch.id === currentChapterId) li.classList.add("current-chapter");

      li.addEventListener("click", () => {
        if (ch.id === currentChapterId) goTo(0);
        else if (ch.url && ch.url.trim() !== "") {
          window.location.href = basePath + ch.url.trim();
        }
      });

      group.appendChild(li);
    });
  });
}

function renderTOC() {
  if (window.BUGLOOP_BOOKS && window.BUGLOOP_BOOK_ID) renderBookTOC();
  else renderLocalTOC();
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
  const lang = document.documentElement.getAttribute("data-lang") || "ko";
  window.location.href = `/${lang}/`;
};

darkModeToggle.onclick = () => setDarkMode(!root.classList.contains("dark"));


// ===============================
// 모바일 슬라이드
// ===============================
let touchStartX = 0;
let touchEndX = 0;

document.body.addEventListener(
  "touchstart",
  e => {
    touchStartX = e.changedTouches[0].screenX;
  },
  { passive: true }
);

document.body.addEventListener(
  "touchend",
  e => {
    touchEndX = e.changedTouches[0].screenX;
    const deltaX = touchStartX - touchEndX;

    if (deltaX > 50 && currentPage < pages.length - 1) {
      currentPage++;
      renderPage();
    } else if (deltaX < -50 && currentPage > 0) {
      currentPage--;
      renderPage();
    }
  },
  { passive: true }
);


// ===============================
// 헤더 제목
// ===============================
const headerTitleEl = document.querySelector(".header-title");
if (headerTitleEl) headerTitleEl.innerText = book.chapterTitle;


// ===============================
// 초기화
// ===============================
renderTOC();
renderPage();


// ===============================
// ⭐⭐⭐ 아코디언 TOC
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".toc-section");

  sections.forEach(sec => {
    sec.addEventListener("click", () => {
      sec.classList.toggle("collapsed");

      const group = sec.nextElementSibling;
      if (group && group.classList.contains("toc-chapter-group")) {
        group.classList.toggle("open");
      }
    });
  });
});

// ===============================
// 🔠 Font Size Toggle
// ===============================
const fontSteps = [1, 1.15, 1.3];
let fontIndex = Number(localStorage.getItem("fontIndex"));
if (Number.isNaN(fontIndex)) fontIndex = 0;

function applyFontScale() {
  document.documentElement.style.setProperty(
    "--font-scale",
    fontSteps[fontIndex]
  );
  localStorage.setItem("fontIndex", fontIndex);
}

// 최초 적용
applyFontScale();

function bindFontButton(id) {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.addEventListener("click", () => {
    fontIndex = (fontIndex + 1) % fontSteps.length;
    applyFontScale();
  });
}

// e-reader 헤더
bindFontButton("fontToggleHeader");

// (있다면) 사이드바 버튼
bindFontButton("font-toggle-sidebar");
