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
// DOM 요소 참조 (수정됨)
// ===============================
let currentPage = 0;
const pageIndex = document.getElementById("pageIndex");
const tocEl = document.getElementById("toc");
const tocList = document.getElementById("tocList");
const bodyEl = document.body;
const root = document.documentElement; // ❗ <html> 태그 참조 추가

const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = darkModeToggle.querySelector('i');
const darkModeLabel = document.getElementById("darkModeLabel");


// ===============================
// Dark Mode (다국어 대응 버전) (수정됨)
// ===============================
// ❗ index.ejs (darkmode.js)와 키를 통일하여 상태를 공유합니다.
const STORAGE_KEY = 'bugloop.theme'; 
// const initialDarkMode = localStorage.getItem('darkMode') === 'true'; // 기존 코드 제거

function setDarkMode(isDark) {
  const darkText = darkModeToggle.dataset.dark;   // ex: "다크 모드" / "Dark Mode"
  const lightText = darkModeToggle.dataset.light; // ex: "라이트 모드" / "Light Mode"

  // ❗ <body> 대신 <html> 태그에 클래스를 적용합니다. (FOUC 방지 스크립트와 통일)
  if (isDark) {
    root.classList.add("dark"); // ❗ bodyEl -> root로 변경
    darkModeIcon.classList.replace("fa-moon", "fa-sun");
    darkModeLabel.innerText = lightText;
    // ❗ 키와 값을 'bugloop.theme' / 'dark'로 변경
    localStorage.setItem(STORAGE_KEY, 'dark');
  } else {
    root.classList.remove("dark"); // ❗ bodyEl -> root로 변경
    darkModeIcon.classList.replace("fa-sun", "fa-moon");
    darkModeLabel.innerText = darkText;
    // ❗ 키와 값을 'bugloop.theme' / 'light'로 변경
    localStorage.setItem(STORAGE_KEY, 'light');
  }
}

// ❗ Local Storage에서 저장된 테마를 로드하는 함수를 추가합니다.
function loadTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  
  if (savedTheme) {
    // 1. 저장된 테마 상태를 불러와 적용
    setDarkMode(savedTheme === 'dark');
  } else {
    // 2. 저장된 테마가 없으면 시스템 기본 설정을 확인 (index.ejs와 동일 로직)
    // 💡 이 로직은 첫 방문 시 사용되며, index.ejs에서 설정한 값이 있다면 savedTheme에서 처리됩니다.
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }
}

// ❗ 페이지 로드 시 테마를 즉시 적용합니다. (기존 setDarkMode(initialDarkMode) 대체)
loadTheme(); 


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
// 버튼 이벤트 (수정됨)
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

// ❗ root (<html>)의 클래스 상태를 확인하도록 수정
darkModeToggle.onclick = () => setDarkMode(!root.classList.contains("dark"));


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

// 페이지 제목을 헤더로 보내기
const headerTitleEl = document.querySelector('.header-title');
headerTitleEl.innerText = book.chapterTitle;

// ===============================
// 초기화
// ===============================
tocList.innerHTML = '';
renderTOC();
renderPage();