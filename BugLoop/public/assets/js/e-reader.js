// ===============================
// 0. 초기 콘텐츠 추출 및 내부 데이터 구조화
//    - HTML 페이지에 미리 렌더링된 H1, H2, P 태그를 읽어와서 book 객체로 재구성합니다.
//    - 이 과정을 통해 외부 'book' 변수 없이 작동할 수 있습니다.
// ===============================

const pageTextEl = document.getElementById("pageText");
const rawElements = Array.from(pageTextEl.children);

const book = {
    title: document.title,      // <title> 태그 사용
    chapterTitle: '',           // H1 내용
    sections: []
};

let currentContent = [];

// 1. HTML 요소들을 순회하며 섹션과 본문 내용을 구분하여 내부 book 객체에 저장
rawElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();

    if (tagName.startsWith('h')) {
        // 이전에 수집된 본문 내용이 있다면, 'body' 섹션으로 저장
        if (currentContent.length > 0) {
            book.sections.push({ type: 'body', content: currentContent.join('\n\n') });
            currentContent = [];
        }

        // H1은 메인 장 제목으로 사용하고 sections에는 추가하지 않음
        if (tagName === 'h1' && !book.chapterTitle) {
            book.chapterTitle = el.textContent.trim();
        } else if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
            // H2, H3, H4 등은 서브 타이틀로 저장 (목차 생성에 사용)
            book.sections.push({ 
                type: 'subtitle', 
                title: el.textContent.trim(),
                level: parseInt(tagName.substring(1))
            });
        }
    } else if (tagName === 'p' || tagName === 'ul' || tagName === 'ol') {
        // P, UL, OL 태그의 내용을 수집 (간단하게 textContent로 수집)
        // **주의: e-reader.js의 wrapContentInParagraphs 함수가 P 태그를 다시 추가하므로,
        // 여기서는 순수 텍스트를 수집하는 것이 좋습니다.**
        currentContent.push(el.textContent.trim());
    }
});

// 마지막으로 남은 본문 내용을 저장
if (currentContent.length > 0) {
    book.sections.push({ type: 'body', content: currentContent.join('\n\n') });
}

// 2. 이제 모든 데이터가 book 객체에 저장되었으므로, 초기 HTML 렌더링 내용은 비웁니다.
pageTextEl.innerHTML = '';


// ===============================
// 페이지 데이터 구성 (Pagination)
// ===============================
const charsPerPage = 1200;
const pages = [];

// 문단을 <p>로 감싸주는 함수 (원래 함수 유지)
function wrapContentInParagraphs(content) {
  // \n\n을 기준으로 문단을 나누고, 다시 <p>로 감싸줍니다.
  const paragraphs = content.split(/\n{2,}/g).filter(p => p.trim() !== '');
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
}

// section 데이터 → pages 배열로 변환 (원래 로직 유지)
book.sections.forEach((section, index) => {
  if (section.type === 'subtitle') {
    // 현재 소제목 이후의 첫 번째 'body' 섹션을 찾음
    const nextBodyIndex = book.sections.findIndex((s, i) => i > index && s.type === 'body');
    
    // 다음 본문이 있다면 소제목과 본문 첫 부분을 합쳐 한 페이지로 만듦
    if (nextBodyIndex !== -1) {
      const nextBody = book.sections[nextBodyIndex];
      const estimatedTitleLength = 50; // 소제목 길이에 대한 대략적 예상
      const firstChunk = nextBody.content.slice(0, charsPerPage - estimatedTitleLength);

      pages.push({
        type: 'subtitle-with-body',
        subtitle: section.title,
        level: section.level || 2, // H2, H3 레벨을 포함
        content: firstChunk
      });

      // 남은 본문 내용을 분할하여 추가 페이지 생성
      const remainingContent = nextBody.content.slice(firstChunk.length);
      for (let i = 0; i < remainingContent.length; i += charsPerPage) {
        pages.push({ type: 'body', content: remainingContent.slice(i, i + charsPerPage) });
      }
      nextBody.processed = true;
    } else {
      // 본문이 없는 소제목만 있는 경우
      pages.push({ type: 'subtitle', content: section.title });
    }
  } else if (section.type === 'body' && !section.processed) {
    // 처리되지 않은 일반 본문 섹션 분할
    for (let i = 0; i < section.content.length; i += charsPerPage) {
      pages.push({ type: 'body', content: section.content.slice(i, i + charsPerPage) });
    }
  }
});


// ===============================
// DOM 요소 참조 (원래와 동일)
// ===============================
let currentPage = 0;
// pageText는 이미 위에서 참조했으므로 생략
const pageIndex = document.getElementById("pageIndex");
const tocEl = document.getElementById("toc");
const tocList = document.getElementById("tocList");
const bodyEl = document.body;
const darkModeToggle = document.getElementById("darkModeToggle");
const darkModeIcon = darkModeToggle.querySelector('i');
const darkModeLabel = document.getElementById("darkModeLabel");

// ===============================
// Dark Mode (원래와 동일)
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
// 페이지 렌더링 (H1/H2/H3 등 제목 레벨 처리 추가)
// ===============================
function renderPage() {
  const pageData = pages[currentPage];
  let content = '';

  if (currentPage === 0) {
    // 첫 페이지는 책 제목 (H1)으로 시작
    content = `<h1>${book.chapterTitle}</h1>${wrapContentInParagraphs(pageData.content)}`;
  } else if (pageData.type === 'subtitle-with-body') {
    // 소제목이 포함된 페이지는 동적으로 H2/H3 태그 생성
    const HeadingTag = `h${pageData.level || 2}`;
    content = `<${HeadingTag} class="sub-chapter-title">${pageData.subtitle}</${HeadingTag}>${wrapContentInParagraphs(pageData.content)}`;
  } else {
    // 일반 본문 페이지
    content = wrapContentInParagraphs(pageData.content);
  }

  pageTextEl.innerHTML = content;
  pageTextEl.scrollTop = 0;
  pageIndex.innerText = `${currentPage + 1} / ${pages.length}`;
}

// ===============================
// 목차 (TOC) 렌더링 (원래 로직 유지)
// ===============================
function renderTOC() {
  tocList.innerHTML = `<li onclick="goTo(0)" class="toc-chapter">${book.chapterTitle} (p.1)</li>`;

  book.sections.forEach(section => {
    if (section.type === 'subtitle') {
      // pages 배열에서 해당 소제목이 시작되는 페이지 인덱스를 찾습니다.
      const idx = pages.findIndex(p => p.type === 'subtitle-with-body' && p.subtitle === section.title);
      if (idx !== -1) {
        // H2는 toc-level-2, H3는 toc-level-3 등으로 클래스를 부여하여 들여쓰기 가능
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
// 버튼 이벤트 (원래와 동일)
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
// 모바일 슬라이드 제스처 (원래와 동일)
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
    // 왼쪽으로 스와이프 (다음 페이지)
    currentPage++;
    renderPage();
  } else if (deltaX < -50 && currentPage > 0) {
    // 오른쪽으로 스와이프 (이전 페이지)
    currentPage--;
    renderPage();
  }
}, { passive: true });

// ===============================
// 초기화
// ===============================
// 렌더링 시작 전에 tocList를 비워줍니다.
tocList.innerHTML = '';
renderTOC();
// 첫 페이지 렌더링
renderPage();