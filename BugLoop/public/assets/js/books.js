/**
 * books.js
 * - 북 카드 토글
 * - 목차 페이지네이션
 * - CSR 목차 렌더링
 */

(function () {
  /* =====================================================
     초기화 엔트리
  ===================================================== */
  window.initBooks = function ({ lang, booksData }) {
    if (!booksData) return;

    const ITEMS_PER_PAGE = 3;

    /* =====================================================
       유틸
    ===================================================== */
    const snakeToCamel = (s) =>
      s.replace(/(_\w)/g, k => k[1].toUpperCase());

    const getPaginatedToc = (tocData) => {
      if (!tocData) return { paginatedToc: [], totalPages: 0 };

      const totalPages = Math.ceil(tocData.length / ITEMS_PER_PAGE);
      const paginatedToc = [];

      for (let i = 0; i < totalPages; i++) {
        const start = i * ITEMS_PER_PAGE;
        paginatedToc.push(tocData.slice(start, start + ITEMS_PER_PAGE));
      }

      return { paginatedToc, totalPages };
    };

    /* =====================================================
       CSR 목차 HTML
    ===================================================== */
    const renderTocHtml = (sections, bookKey) => {
      if (!sections || sections.length === 0) return "";

      const camelKey = snakeToCamel(bookKey);
      let html = "<ul>";

      sections.forEach(section => {
        html += "<li><h5>" + section.section + "</h5><ul>";

        section.chapters.forEach(ch => {
          html += "<li>";

          const urlPath = "/books/" + camelKey + "/contents/" + ch.id;

          if (ch.url) {
            html += '<a href="/' + lang + urlPath + '" class="toc-link active">';
            html += ch.title + "</a>";
          } else {
            html += '<span class="toc-link disabled">' + ch.title + "</span>";
          }

          if (ch.sub) {
            html += "<ul>";
            ch.sub.forEach(sub => {
              const subPath = "/books/" + camelKey + "/contents/" + sub.id;
              html += "<li>";

              if (sub.url) {
                html += '<a href="/' + lang + subPath + '" class="toc-link active">';
                html += sub.title + "</a>";
              } else {
                html += '<span class="toc-link disabled">' + sub.title + "</span>";
              }

              html += "</li>";
            });
            html += "</ul>";
          }

          html += "</li>";
        });

        html += "</ul></li>";
      });

      html += "</ul>";
      return html;
    };

    /* =====================================================
       페이지 변경
    ===================================================== */
    window.changePage = function (event, bookKey, pageNumber) {
      event.stopPropagation();

      const bookData = booksData[bookKey];
      if (!bookData) return;

      const card = document.querySelector(`[data-book-key="${bookKey}"]`);
      if (!card) return;

      const tocContainer = card.querySelector(`[data-book-id="${bookKey}-toc"]`);
      const pagination = card.querySelector(`[data-book-id="${bookKey}-pagination"]`);

      const { paginatedToc } = getPaginatedToc(bookData.toc);
      const sections = paginatedToc[pageNumber - 1];

      tocContainer.innerHTML = renderTocHtml(sections, bookKey);

      pagination.querySelectorAll(".pagination-number").forEach(btn => {
        btn.classList.toggle(
          "active",
          parseInt(btn.textContent.trim(), 10) === pageNumber
        );
      });

      const tocEl = card.querySelector(".book-toc");
      if (card.classList.contains("expanded") && tocEl) {
        tocEl.style.height = "auto";
        tocEl.style.height = tocEl.scrollHeight + "px";
      }
    };

    /* =====================================================
       북 카드 토글
    ===================================================== */
    document.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => {
        const isExpanded = card.classList.contains("expanded");
        const toc = card.querySelector(".book-toc");

        document.querySelectorAll(".book-card").forEach(other => {
          if (other !== card) {
            other.classList.remove("expanded");
            const otherToc = other.querySelector(".book-toc");
            if (otherToc) {
              otherToc.style.height = "0px";
              otherToc.classList.add("closed");
            }
          }
        });

        card.classList.toggle("expanded", !isExpanded);

        if (!toc) return;

        if (!isExpanded) {
          toc.classList.remove("closed");
          toc.style.height = "auto";
          const h = toc.scrollHeight;
          toc.style.height = "0px";
          requestAnimationFrame(() => {
            toc.style.height = h + "px";
          });
        } else {
          toc.style.height = toc.scrollHeight + "px";
          requestAnimationFrame(() => {
            toc.style.height = "0px";
            setTimeout(() => toc.classList.add("closed"), 500);
          });
        }

        if (!isExpanded) {
          const carousel = card.closest(".carousel");
          if (carousel) {
            const center =
              card.offsetLeft + card.offsetWidth / 2 - carousel.clientWidth / 2;
            carousel.scrollTo({ left: center, behavior: "smooth" });
          }
        }
      });
    });
  };
})();
