const getLang = () => document.documentElement.getAttribute('lang') || 'ko';
window.booksData = <%- JSON.stringify(locale.books) %>;

let offset = 5;
let loading = false;

async function loadMorePosts() {
  if (loading) return;
  loading = true;

  try {
    const res = await fetch('/api/recent-posts?offset=' + offset + '&limit=5&lang=' + lang);
    const data = await res.json();

    if (!data.posts || data.posts.length === 0) {
      document.getElementById("load-more-btn").style.display = "none";
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
      const showEditedLabel = !isNewPost && isRecentlyEdited;

      const newLabelText = "<%= locale.ui.newPost || 'NEW' %>";
      const editedLabelText = "<%= locale.ui.editedPost || 'UPDATED' %>";

      let labelHtml = '';
      if (isNewPost) {
        labelHtml = '<span class="label-icon new-icon">' + newLabelText + '</span>';
      } else if (showEditedLabel) {
        labelHtml = '<span class="label-icon edited-icon">' + editedLabelText + '</span>';
      }

      const formattedDate = post.created_fmt;

      let previewText = '';
      if (post.content) {
        let cleanContent = post.content.replace(/<div class="auto-toc"[\s\S]*?<\/div>/gi, '');
        cleanContent = cleanContent.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
        let plainText = cleanContent.replace(/<[^>]+>/gi, '');
        plainText = plainText.replace(/\s+/g, ' ').trim();
        const decodedText = plainText
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        previewText = decodedText.slice(0, 120);
      } else if (post.preview) {
        let decodedPreview = post.preview
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        previewText = decodedPreview.slice(0, 120);
      }

      let innerHtml = '<a href="/' + lang + '/post/' + post.id + '" class="recent-post-title">';
      innerHtml += labelHtml;
      innerHtml += (post.is_pinned ? '<span class="badge-pinned">📌</span>' : '');
      innerHtml += post.title;
      innerHtml += '</a>';
      innerHtml += '<div class="recent-post-meta">';
      innerHtml += '<span>' + post.author + '</span>';
      innerHtml += '<span>·</span>';
      innerHtml += '<span>' + formattedDate + '</span>';
      innerHtml += '</div>';
      innerHtml += '<div class="recent-post-preview">';
      innerHtml += previewText + '...';
      innerHtml += '</div>';

      el.innerHTML = innerHtml;
      container.appendChild(el);
    });

    loading = false;
  } catch (error) {
    loading = false;
  }
}
window.loadMorePosts = loadMorePosts;

(() => {
  const booksData = window.booksData;
  const itemsPerPage = 3;

  const getPaginatedToc = (tocData) => {
    if (!tocData) return { paginatedToc: [], totalPages: 0, totalSections: 0 };
    const totalSections = tocData.length;
    const totalPages = Math.ceil(totalSections / itemsPerPage);
    const paginatedToc = [];
    for (let i = 0; i < totalPages; i++) {
      const start = i * itemsPerPage;
      const end = start + itemsPerPage;
      paginatedToc.push(tocData.slice(start, end));
    }
    return { paginatedToc, totalPages, totalSections };
  };

  const renderTocHtmlCSR = (sections, bookKey) => {
    if (!sections || sections.length === 0) return '';
    let html = '<ul>';
    const snakeToCamel = (s) => s.replace(/(_\w)/g, k => k[1].toUpperCase());
    const camelCaseKey = snakeToCamel(bookKey);
    sections.forEach(section => {
      html += '<li><h5>' + section.section + '</h5><ul>';
      section.chapters.forEach(ch => {
        html += '<li>';
        const urlPath = '/books/' + camelCaseKey + '/contents/' + ch.id;
        if (ch.url) {
          html += '<a href="/' + lang + urlPath + '" class="toc-link active">';
          html += ch.title;
          html += '</a>';
        } else {
          html += '<span class="toc-link disabled">' + ch.title + '</span>';
        }
        if (ch.sub) {
          html += '<ul>';
          ch.sub.forEach(sub => {
            html += '<li>';
            const subUrlPath = '/books/' + camelCaseKey + '/contents/' + sub.id;
            if (sub.url) {
              html += '<a href="/' + lang + subUrlPath + '" class="toc-link active">';
              html += sub.title;
              html += '</a>';
            } else {
              html += '<span class="toc-link disabled">' + sub.title + '</span>';
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

  window.changePage = (event, bookKey, pageNumber) => {
    event.stopPropagation();
    const bookData = booksData[bookKey];
    if (!bookData) return;
    const card = document.querySelector('[data-book-key="' + bookKey + '"]');
    const tocContainer = card.querySelector('[data-book-id="' + bookKey + '-toc"]');
    const paginationContainer = card.querySelector('[data-book-id="' + bookKey + '-pagination"]');
    const tocElement = card.querySelector('.book-toc');
    if (tocContainer && paginationContainer) {
      const { paginatedToc } = getPaginatedToc(bookData.toc);
      const sections = paginatedToc[pageNumber - 1];
      tocContainer.innerHTML = renderTocHtmlCSR(sections, bookKey);
      paginationContainer.querySelectorAll('.pagination-number').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent.trim()) === pageNumber) btn.classList.add('active');
      });
      if (card.classList.contains('expanded') && tocElement) {
        tocElement.style.height = 'auto';
        const contentHeight = tocElement.scrollHeight;
        tocElement.style.height = contentHeight + 'px';
      }
    }
  };

  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const isCurrentlyExpanded = card.classList.contains('expanded');
      const tocElement = card.querySelector('.book-toc');
      const transitionDuration = 500;
      const contentPaddingTop = '26px';
      const contentPaddingBottom = '16px';

      document.querySelectorAll('.book-card').forEach(c => {
        const otherToc = c.querySelector('.book-toc');
        if (c !== card) {
          c.classList.remove('expanded');
          if (otherToc) {
            otherToc.style.height = '0px';
            otherToc.style.paddingTop = '0';
            otherToc.style.paddingBottom = '0';
            otherToc.classList.add('closed');
          }
        }
      });

      card.classList.toggle('expanded', !isCurrentlyExpanded);

      if (!isCurrentlyExpanded && tocElement) {
        tocElement.classList.remove('closed');
        tocElement.style.paddingTop = contentPaddingTop;
        tocElement.style.paddingBottom = contentPaddingBottom;
        tocElement.style.height = 'auto';
        const contentHeight = tocElement.scrollHeight;
        tocElement.style.height = '0px';
        requestAnimationFrame(() => {
          tocElement.style.height = contentHeight + 'px';
        });
      } else if (isCurrentlyExpanded && tocElement) {
        tocElement.style.height = tocElement.scrollHeight + 'px';
        tocElement.style.paddingTop = contentPaddingTop;
        tocElement.style.paddingBottom = contentPaddingBottom;
        requestAnimationFrame(() => {
          tocElement.style.height = '0px';
          tocElement.style.paddingTop = '0';
          tocElement.style.paddingBottom = '0';
          setTimeout(() => {
            tocElement.classList.add('closed');
          }, transitionDuration);
        });
      }

      if (!isCurrentlyExpanded) {
        const carousel = card.closest('.carousel');
        if (carousel) {
          const cardLeft = card.offsetLeft;
          const carouselWidth = carousel.clientWidth;
          let expandedCardWidth = window.innerWidth <= 640 ? 250 : 300;
          const scrollTarget = cardLeft + (expandedCardWidth / 2) - (carouselWidth / 2);
          carousel.scrollTo({
            left: scrollTarget,
            behavior: 'smooth'
          });
        }
      }
    });
  });
})();