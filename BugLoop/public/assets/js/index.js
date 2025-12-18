/* =====================================================
   Index Page Client Script
   ===================================================== */

/* ---------- Utils ---------- */
const getLang = () =>
  window.lang || document.documentElement.getAttribute('lang') || 'ko';

/* =====================================================
   Load More Posts
   ===================================================== */

let offset = 5;
let loading = false;

async function loadMorePosts() {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch(
      `/api/recent-posts?offset=${offset}&limit=5&lang=${getLang()}`
    );
    const data = await res.json();

    if (!data.posts || data.posts.length === 0) {
      const btn = document.getElementById("load-more-btn");
      if (btn) btn.style.display = "none";
      loading = false;
      return;
    }

    offset += data.posts.length;

    const container = document.getElementById("posts-container");
    if (!container) {
      loading = false;
      return;
    }

    data.posts.forEach(post => {
      const el = document.createElement("div");
      el.className = "recent-post-item";

      const now = new Date();
      const createdAt = new Date(post.created_at);
      const updatedAt = new Date(post.updated_at);
      const oneDay = 1000 * 60 * 60 * 24;

      const isNewPost = (now - createdAt) < oneDay;
      const wasEdited = updatedAt > createdAt;
      const isRecentlyEdited = wasEdited && (now - updatedAt < oneDay);

      let labelHtml = '';
      if (isNewPost) {
        labelHtml = `<span class="label-icon new-icon">NEW</span>`;
      } else if (!isNewPost && isRecentlyEdited) {
        labelHtml = `<span class="label-icon edited-icon">UPDATED</span>`;
      }

      let previewText = '';
      if (post.content) {
        let clean = post.content
          .replace(/<div class="auto-toc"[\\s\\S]*?<\\/div>/gi, '')
          .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, '')
          .replace(/<[^>]+>/gi, '')
          .replace(/\\s+/g, ' ')
          .trim();

        previewText = clean
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .slice(0, 120);
      }

      el.innerHTML = `
        <a href="/${getLang()}/post/${post.id}" class="recent-post-title">
          ${labelHtml}
          ${post.is_pinned ? '<span class="badge-pinned">📌</span>' : ''}
          ${post.title}
        </a>
        <div class="recent-post-meta">
          <span>${post.author}</span>
          <span>·</span>
          <span>${post.created_fmt}</span>
        </div>
        <div class="recent-post-preview">
          ${previewText}...
        </div>
      `;

      container.appendChild(el);
    });

    loading = false;
  } catch (e) {
    loading = false;
  }
}

window.loadMorePosts = loadMorePosts;

/* =====================================================
   Book TOC / Carousel Logic
   ===================================================== */

(() => {
  const booksData = window.booksData;
  if (!booksData) return;

  const ITEMS_PER_PAGE = 3;

  const paginate = (toc) => {
    const pages = [];
    for (let i = 0; i < toc.length; i += ITEMS_PER_PAGE) {
      pages.push(toc.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  };

  const renderToc = (sections, bookKey) => {
    let html = '<ul>';
    sections.forEach(section => {
      html += `<li><h5>${section.section}</h5><ul>`;
      section.chapters.forEach(ch => {
        html += '<li>';
        if (ch.url) {
          html += `<a href="/${getLang()}/books/${bookKey}/contents/${ch.id}" class="toc-link active">${ch.title}</a>`;
        } else {
          html += `<span class="toc-link disabled">${ch.title}</span>`;
        }
        html += '</li>';
      });
      html += '</ul></li>';
    });
    html += '</ul>';
    return html;
  };

  window.changePage = (e, bookKey, page) => {
    e.stopPropagation();
    const card = document.querySelector(`[data-book-key="${bookKey}"]`);
    if (!card) return;

    const tocBox = card.querySelector(`[data-book-id="${bookKey}-toc"]`);
    const pager = card.querySelector(`[data-book-id="${bookKey}-pagination"]`);
    if (!tocBox || !pager) return;

    const pages = paginate(booksData[bookKey].toc);
    tocBox.innerHTML = renderToc(pages[page - 1], bookKey);

    pager.querySelectorAll('.pagination-number').forEach(p => {
      p.classList.toggle('active', Number(p.textContent) === page);
    });
  };

  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const toc = card.querySelector('.book-toc');
      const expanded = card.classList.contains('expanded');

      document.querySelectorAll('.book-card').forEach(c => {
        if (c !== card) {
          c.classList.remove('expanded');
          const t = c.querySelector('.book-toc');
          if (t) t.style.height = '0px';
        }
      });

      card.classList.toggle('expanded', !expanded);

      if (toc) {
        if (!expanded) {
          toc.style.height = toc.scrollHeight + 'px';
        } else {
          toc.style.height = '0px';
        }
      }

      if (!expanded) {
        const carousel = card.closest('.carousel');
        if (carousel) {
          const left = card.offsetLeft - carousel.clientWidth / 2 + card.clientWidth / 2;
          carousel.scrollTo({ left, behavior: 'smooth' });
        }
      }
    });
  });
})();
