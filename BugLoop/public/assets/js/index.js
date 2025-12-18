
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
  