const { lang, books } = window.__APP__ || {};
window.booksData = books || {};

const itemsPerPage = 4;

/* ==============================
   ✅ 공통 미리보기 정제 함수
   ============================== */
function sanitizePreview(html, maxLen = 120) {
  return String(html || '')
    // auto-toc 제거
    .replace(/<div[^>]*class="auto-toc"[^>]*>[\s\S]*?<\/div>/gi, '')
    // style / script 제거
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // 모든 HTML 태그 제거
    .replace(/<[^>]+>/g, ' ')
    // 엔티티 / 공백 정리
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/* ==============================
   📚 Book TOC 로직 (기존 유지)
   ============================== */
const getPaginatedToc = (tocData) => {
  if (!tocData) return { paginatedToc: [], totalPages: 0 };
  const totalPages = Math.ceil(tocData.length / itemsPerPage);
  const paginatedToc = [];
  for (let i = 0; i < totalPages; i++) {
    paginatedToc.push(
      tocData.slice(i * itemsPerPage, i * itemsPerPage + itemsPerPage)
    );
  }
  return { paginatedToc, totalPages };
};

const renderTocHtmlCSR = (sections, bookKey) => {
  if (!sections || sections.length === 0) return '';
  let html = '<ul>';
  sections.forEach((section) => {
    html += `<li><h5>${section.section}</h5><ul>`;
    section.chapters.forEach((ch) => {
      html += '<li>';
      if (ch.url) {
        html += `<a href="/${lang}/books/${bookKey}/contents/${ch.id}" class="toc-link active">${ch.title}</a>`;
      } else {
        html += `<span class="toc-link disabled">${ch.title}</span>`;
      }
      if (ch.sub) {
        html += '<ul>';
        ch.sub.forEach((sub) => {
          html += `<li>${sub.url
            ? `<a href="/${lang}/books/${bookKey}/contents/${sub.id}" class="toc-link active">${sub.title}</a>`
            : `<span class="toc-link disabled">${sub.title}</span>`}</li>`;
        });
        html += '</ul>';
      }
      html += '</li>';
    });
    html += '</ul></li>';
  });
  return html + '</ul>';
};

window.changePage = function (event, bookKey, pageNumber) {
  event.stopPropagation();
  const bookData = window.booksData[bookKey];
  if (!bookData) return;

  const card = document.querySelector(`[data-book-key="${bookKey}"]`);
  if (!card) return;

  const tocContainer = card.querySelector(`[data-book-id="${bookKey}-toc"]`);
  const paginationContainer = card.querySelector(
    `[data-book-id="${bookKey}-pagination"]`
  );
  const tocElement = card.querySelector('.book-toc');

  const { paginatedToc } = getPaginatedToc(bookData.toc);
  tocContainer.innerHTML = renderTocHtmlCSR(
    paginatedToc[pageNumber - 1],
    bookKey
  );

  paginationContainer
    .querySelectorAll('.pagination-number')
    .forEach((btn) => {
      btn.classList.toggle(
        'active',
        parseInt(btn.textContent, 10) === pageNumber
      );
    });

  if (card.classList.contains('expanded') && tocElement) {
    tocElement.style.height = tocElement.scrollHeight + 'px';
  }
};

/* ==============================
   📄 더보기 (최근 글 로드)
   ============================== */
let offset = 5;
let loading = false;

window.loadMorePosts = async function () {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch(
      `/api/recent-posts?offset=${offset}&limit=5&lang=${lang}`
    );
    const data = await res.json();

    if (!data.posts || data.posts.length === 0) {
      const btn = document.getElementById('load-more-btn');
      if (btn) btn.style.display = 'none';
      loading = false;
      return;
    }

    offset += data.posts.length;

    const container = document.getElementById('posts-container');
    if (!container) {
      loading = false;
      return;
    }

    data.posts.forEach((post) => {
      const el = document.createElement('div');
      el.className = 'recent-post-item';
      el.onclick = () => {
        window.location.href = `/${lang}/post/${post.id}`;
      };

      const now = new Date();
      const createdAt = new Date(post.created_at);
      const updatedAt = post.updated_at
        ? new Date(post.updated_at)
        : createdAt;
      const oneDay = 86400000;

      const isNew = now - createdAt < oneDay;
      const isEdit = updatedAt > createdAt && now - updatedAt < oneDay;

      let labelHtml = '';
      if (isNew) {
        labelHtml = `<span class="label-icon new-icon">${window.__APP__.locale.newPost || 'NEW'}</span>`;
      } else if (isEdit) {
        labelHtml = `<span class="label-icon edited-icon">${window.__APP__.locale.editedPost || 'UPDATED'}</span>`;
      }

      // ✅ 핵심: SSR과 동일한 미리보기 정제
      const rawContent = post.content || post.preview || '';
      const previewText = sanitizePreview(rawContent, 120);

      let categoryHtml = '';
      if (post.translated_categories_display?.length) {
        categoryHtml = `
          <div class="recent-post-categories">
            ${post.translated_categories_display
              .map(cat => `<span class="post-category">${cat}</span>`)
              .join('')}
          </div>`;
      }

      const dateText =
        post.created_fmt ||
        createdAt.toLocaleDateString().replace(/\.$/, '');

      el.innerHTML = `
        ${categoryHtml}
        <a href="/${lang}/post/${post.id}" class="recent-post-title" onclick="event.stopPropagation()">
          ${labelHtml}
          ${post.is_pinned ? '<span class="badge-pinned">📌</span>' : ''}
          ${post.is_private ? '<span class="badge-private">🔒</span>' : ''}
          ${post.title}
        </a>
        <div class="recent-post-meta">
          <span>${post.author}</span>
          <span>·</span>
          <span>${dateText}</span>
        </div>
        <div class="recent-post-preview">${previewText}...</div>
      `;

      container.appendChild(el);
    });

    if (!data.hasMore) {
      const btn = document.getElementById('load-more-btn');
      if (btn) btn.style.display = 'none';
    }

    loading = false;
  } catch (e) {
    console.error('Load more posts error:', e);
    loading = false;
  }
};
