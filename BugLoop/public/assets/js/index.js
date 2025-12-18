// /assets/js/index.js

const booksData = window.booksData || {};
const lang = document.documentElement.getAttribute('lang') || 'ko';
const itemsPerPage = 3;

/* -----------------------------
   pagination helper
----------------------------- */
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

/* -----------------------------
   TOC renderer (CSR)
----------------------------- */
const renderTocHtmlCSR = (sections, bookKey) => {
  if (!sections || sections.length === 0) return '';

  let html = '<ul>';

  sections.forEach(section => {
    html += `<li><h5>${section.section}</h5><ul>`;

    section.chapters.forEach(ch => {
      html += '<li>';

      if (ch.url) {
        html += `<a href="/${lang}/books/${bookKey}/contents/${ch.id}" class="toc-link active">${ch.title}</a>`;
      } else {
        html += `<span class="toc-link disabled">${ch.title}</span>`;
      }

      if (ch.sub) {
        html += '<ul>';
        ch.sub.forEach(sub => {
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

/* -----------------------------
   pagination click (global)
----------------------------- */
window.changePage = (event, bookKey, pageNumber) => {
  event.stopPropagation();

  const bookData = booksData[bookKey];
  if (!bookData) return;

  const card = document.querySelector(`[data-book-key="${bookKey}"]`);
  if (!card) return;

  const tocContainer = card.querySelector(`[data-book-id="${bookKey}-toc"]`);
  const paginationContainer = card.querySelector(`[data-book-id="${bookKey}-pagination"]`);
  const tocElement = card.querySelector('.book-toc');

  const { paginatedToc } = getPaginatedToc(bookData.toc);
  tocContainer.innerHTML = renderTocHtmlCSR(paginatedToc[pageNumber - 1], bookKey);

  paginationContainer.querySelectorAll('.pagination-number').forEach(btn => {
    btn.classList.toggle(
      'active',
      parseInt(btn.textContent, 10) === pageNumber
    );
  });

  if (card.classList.contains('expanded') && tocElement) {
    tocElement.style.height = tocElement.scrollHeight + 'px';
  }
};

/* -----------------------------
   book card click
----------------------------- */
document.querySelectorAll('.book-card').forEach(card => {
  card.addEventListener('click', () => {
    const isExpanded = card.classList.contains('expanded');
    const toc = card.querySelector('.book-toc');

    document.querySelectorAll('.book-card').forEach(other => {
      if (other !== card) {
        other.classList.remove('expanded');
        const t = other.querySelector('.book-toc');
        if (t) {
          t.style.height = '0px';
          t.style.padding = '0';
          t.classList.add('closed');
        }
      }
    });

    card.classList.toggle('expanded', !isExpanded);

    if (!isExpanded && toc) {
      toc.classList.remove('closed');
      toc.style.padding = '26px 0 16px';
      toc.style.height = 'auto';
      const h = toc.scrollHeight;
      toc.style.height = '0px';
      requestAnimationFrame(() => {
        toc.style.height = h + 'px';
      });
    }
  });
});
