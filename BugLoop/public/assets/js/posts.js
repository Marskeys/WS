/**
 * posts.js
 * - 최근 게시물 로드
 * - 더보기 버튼
 */

(function () {
  window.initPosts = function ({ lang }) {
    let offset = 5;
    let loading = false;

    const container = document.getElementById("posts-container");
    const loadMoreBtn = document.getElementById("load-more-btn");

    if (!container || !loadMoreBtn) return;

    async function loadMorePosts() {
      if (loading) return;
      loading = true;

      try {
        const res = await fetch(
          "/api/recent-posts?offset=" + offset + "&limit=5&lang=" + lang
        );
        const data = await res.json();

        if (!data.posts || data.posts.length === 0) {
          loadMoreBtn.style.display = "none";
          loading = false;
          return;
        }

        offset += data.posts.length;

        data.posts.forEach(post => {
          const el = document.createElement("div");
          el.className = "recent-post-item";

          /* ----------------------------
             라벨 계산
          ---------------------------- */
          const now = new Date();
          const createdAt = new Date(post.created_at);
          const updatedAt = new Date(post.updated_at);
          const oneDay = 1000 * 60 * 60 * 24;

          const isNew = now - createdAt < oneDay;
          const isEdited = updatedAt > createdAt && now - updatedAt < oneDay;

          let labelHtml = "";
          if (isNew) {
            labelHtml = '<span class="label-icon new-icon">NEW</span>';
          } else if (isEdited) {
            labelHtml = '<span class="label-icon edited-icon">UPDATED</span>';
          }

          /* ----------------------------
             미리보기 텍스트 정제
          ---------------------------- */
          let previewText = "";

          if (post.content) {
            let clean = post.content
              .replace(/<div class="auto-toc"[\s\S]*?<\/div>/gi, "")
              .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/gi, "")
              .replace(/\s+/g, " ")
              .trim();

            clean = clean
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&amp;/g, "&");

            previewText = clean.slice(0, 120);
          } else if (post.preview) {
            previewText = post.preview
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&amp;/g, "&")
              .slice(0, 120);
          }

          /* ----------------------------
             HTML 조립
          ---------------------------- */
          let html = '<a href="/' + lang + '/post/' + post.id + '" class="recent-post-title">';
          html += labelHtml;
          html += post.is_pinned ? '<span class="badge-pinned">📌</span>' : "";
          html += post.is_private ? '<span class="badge-private">🔒</span>' : "";
          html += post.title;
          html += "</a>";

          html += '<div class="recent-post-meta">';
          html += "<span>" + post.author + "</span>";
          html += "<span>·</span>";
          html += "<span>" + post.created_fmt + "</span>";
          html += "</div>";

          html += '<div class="recent-post-preview">';
          html += previewText + "...";
          html += "</div>";

          el.innerHTML = html;
          container.appendChild(el);
        });

        loading = false;
      } catch (err) {
        console.error("loadMorePosts error:", err);
        loading = false;
      }
    }

    window.loadMorePosts = loadMorePosts;
  };
})();
