// /assets/js/index.js
document.addEventListener('DOMContentLoaded', () => {
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
          html += `<a href="/${lang}/books/${bookKey}/contents/${ch.id}" class="toc-link active">`;
          html += ch.title;
          html += '</a>';
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
    const sections = paginatedToc[pageNumber - 1];

    tocContainer.innerHTML = renderTocHtmlCSR(sections, bookKey);

    paginationContainer.querySelectorAll('.pagination-number').forEach(btn => {
      btn.classList.remove('active');
      if (parseInt(btn.textContent, 10) === pageNumber) {
        btn.classList.add('active');
      }
    });

    if (card.classList.contains('expanded') && tocElement) {
      tocElement.style.height = 'auto';
      tocElement.style.height = tocElement.scrollHeight + 'px';
    }
  };

  /* -----------------------------
     book card click
  ----------------------------- */
  document.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const isExpanded = card.classList.contains('expanded');
      const tocElement = card.querySelector('.book-toc');

      document.querySelectorAll('.book-card').forEach(other => {
        if (other !== card) {
          other.classList.remove('expanded');
          const otherToc = other.querySelector('.book-toc');
          if (otherToc) {
            otherToc.style.height = '0px';
            otherToc.style.paddingTop = '0';
            otherToc.style.paddingBottom = '0';
            otherToc.classList.add('closed');
          }
        }
      });

      card.classList.toggle('expanded', !isExpanded);

      if (!isExpanded && tocElement) {
        tocElement.classList.remove('closed');
        tocElement.style.paddingTop = '26px';
        tocElement.style.paddingBottom = '16px';
        tocElement.style.height = 'auto';
        const h = tocElement.scrollHeight;
        tocElement.style.height = '0px';
        requestAnimationFrame(() => {
          tocElement.style.height = h + 'px';
        });
      }

      if (!isExpanded) {
        const carousel = card.closest('.carousel');
        if (carousel) {
          const cardLeft = card.offsetLeft;
          const carouselWidth = carousel.clientWidth;
          const cardWidth = window.innerWidth <= 640 ? 250 : 300;
          carousel.scrollTo({
            left: cardLeft + cardWidth / 2 - carouselWidth / 2,
            behavior: 'smooth'
          });
        }
      }
    });
  });
});
