const { lang, books } = window.__APP__ || {};
window.booksData = books || {};

const itemsPerPage = 4;

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
          html += '<li>';
          if (sub.url) {
            html += `<a href="/${lang}/books/${bookKey}/contents/${sub.id}" class="toc-link active">${sub.title}</a>`;
          } else {
            html += `<span class="toc-link disabled">${sub.title}</span>`;
          }
          html += '</li>';
        });
        html += '</ul>';
      }

      html += '</li>';
    });

    html += '</ul></li>';
  });

  html += '</ul>';
  return html;
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

document.querySelectorAll('.book-card').forEach((card) => {
  card.addEventListener('click', () => {
    const isExpanded = card.classList.contains('expanded');
    const toc = card.querySelector('.book-toc');
    const video = card.querySelector('video');

    document.querySelectorAll('.book-card').forEach((other) => {
      if (other !== card) {
        const wasOtherExpanded = other.classList.contains('expanded');
        other.classList.remove('expanded');
        const t = other.querySelector('.book-toc');
        if (t) {
          t.style.height = '0px';
          t.style.padding = '0';
          t.classList.add('closed');
        }

        if (wasOtherExpanded) {
          const otherVideo = other.querySelector('video');
          if (otherVideo) otherVideo.play().catch(() => {});
        }
      }
    });

    if (isExpanded) {
      card.classList.remove('expanded');
      if (toc) {
        toc.style.height = '0px';
        toc.style.padding = '0';
        toc.classList.add('closed');
      }
      if (video) video.play().catch(() => {});
    } else {
      card.classList.add('expanded');
      if (toc) {
        toc.classList.remove('closed');
        toc.style.padding = '26px 0 16px';
        toc.style.height = 'auto';
        const h = toc.scrollHeight;
        toc.style.height = '0px';
        requestAnimationFrame(() => {
          toc.style.height = h + 'px';
        });
      }
      setTimeout(() => {
        if (card.classList.contains('expanded') && video) {
          video.pause();
        }
      }, 500);
    }
  });
});

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
      
      const now = new Date();
      const createdAt = new Date(post.created_at);
      const updatedAt = post.updated_at ? new Date(post.updated_at) : createdAt;
      const oneDay = 1000 * 60 * 60 * 24;

      const isNewPost = now - createdAt < oneDay;
      const wasEdited = updatedAt > createdAt;
      const isRecentlyEdited = wasEdited && (now - updatedAt < oneDay);
      const showEditedLabel = !isNewPost && isRecentlyEdited;

      let labelHtml = '';
      if (isNewPost) {
        labelHtml = `<span class="label-icon new-icon">${window.__APP__.locale.newPost || 'NEW'}</span>`;
      } else if (showEditedLabel) {
        labelHtml = `<span class="label-icon edited-icon">${window.__APP__.locale.editedPost || 'UPDATED'}</span>`;
      }

      // ✅ [해결] EJS와 동일한 정규식을 사용하여 목차(auto-toc) 및 스타일 태그 완벽 제거
      const rawContent = post.content || '';
      const previewText = rawContent
        .replace(/<div class="auto-toc"[\s\S]*?<\/div>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);

      // ✅ [해결] 카테고리 데이터가 있을 경우 렌더링 (EJS 구조와 일치)
      let categoryHtml = '';
      if (post.translated_categories_display && post.translated_categories_display.length > 0) {
        categoryHtml = `
          <div class="recent-post-categories">
            ${post.translated_categories_display
              .map(cat => `<span class="post-category">${cat}</span>`)
              .join('')}
          </div>
        `;
      }

      // ✅ [해결] HTML 구조를 index.ejs와 1:1로 맞춤
      el.innerHTML = `
        ${categoryHtml}
        <a href="/${lang}/post/${post.id}" class="recent-post-title">
          ${labelHtml}
          ${post.is_pinned ? '<span class="badge-pinned">📌</span>' : ''}
          ${post.is_private ? '<span class="badge-private">🔒</span>' : ''}
          ${post.title}
        </a>

        <div class="recent-post-meta">
          <span>${post.author}</span>
          <span>·</span>
          <span>${post.created_fmt || new Date(post.created_at).toLocaleDateString()}</span>
        </div>

        <div class="recent-post-preview">
          ${previewText}...
        </div>
      `;

      container.appendChild(el);
    });

    if (!data.hasMore) {
      const btn = document.getElementById('load-more-btn');
      if (btn) btn.style.display = 'none';
    }

    loading = false;
  } catch (e) {
    console.error("Load more posts error:", e);
    loading = false;
  }
};