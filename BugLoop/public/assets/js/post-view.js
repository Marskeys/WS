document.addEventListener("DOMContentLoaded", () => {
    // HTML 위젯 처리
    document.querySelectorAll('.custom-widget[data-type="html-snippet"]').forEach((el, index) => {
      const encoded = el.getAttribute("data-code");
      if (!encoded) return;

      try {
        const decoded = new TextDecoder('utf-8').decode(
          new Uint8Array([...atob(encoded)].map(c => c.charCodeAt(0)))
        );
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-scripts');
        iframe.setAttribute('referrerpolicy', 'no-referrer');
        iframe.setAttribute('title', '삽입된 HTML');
        iframe.setAttribute('name', `snippet-iframe-${index}`);
        iframe.style.cssText = 'width:100%;min-height:100px;border:1px solid #ccc;border-radius:8px;margin:1rem 0;';
        iframe.srcdoc = decoded;

        el.innerHTML = '';
        el.appendChild(iframe);
      } catch (e) {
        el.innerHTML = '<p style="color:red;">[HTML 코드 디코딩 실패]</p>';
        console.error('디코딩 오류:', e);
      }
    });

    // post-body 내부 스크립트 실행
    document.querySelectorAll('.post-body script').forEach(script => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      document.body.appendChild(newScript);
    });
  });

  function sendHeightToParent() {
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    if (window.parent) {
      window.parent.postMessage({
        type: 'setIframeHeight',
        height: height,
        iframeName: window.name
      }, '*');
    }
  }

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'setIframeHeight') {
      const iframe = document.querySelector(`iframe[name="${event.data.iframeName}"]`);
      if (iframe) iframe.style.height = `${event.data.height}px`;
    }
  });

  window.addEventListener('load', sendHeightToParent);
  window.addEventListener('resize', sendHeightToParent);
</script>

<div class="floating-toc" id="floatingToc"></div>
<div class="mobile-toc-button" id="mobileTocBtn"><%= locale.ui.tocButton %></div>
<div class="mobile-toc-modal" id="mobileTocModal">
  <div class="mobile-toc-content" id="mobileTocContent"></div>
</div>

<%- include('partials/scripts') %>

<script>
  document.addEventListener("DOMContentLoaded", () => {
    const toc = document.querySelector(".auto-toc");
    if (!toc) return;

    const floatingToc = document.getElementById("floatingToc");
    const mobileBtn = document.getElementById("mobileTocBtn");
    const mobileModal = document.getElementById("mobileTocModal");
    const mobileContent = document.getElementById("mobileTocContent");

    floatingToc.innerHTML = toc.innerHTML;
    mobileContent.innerHTML = toc.innerHTML;

    mobileBtn.addEventListener("click", () => {
      mobileModal.style.display = "flex";
      document.body.classList.add("modal-open");
    });

    mobileModal.addEventListener("click", (e) => {
      if (e.target === mobileModal) {
        mobileModal.style.display = "none";
        document.body.classList.remove("modal-open");
      }
    });

    mobileContent.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        e.preventDefault();
        const el = document.getElementById(e.target.getAttribute("href").slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          mobileModal.style.display = "none";
        }
      }
    });

    const topSentinel = document.createElement("div");
    topSentinel.style.height = "1px";
    toc.before(topSentinel);

    const bottomSentinel = document.createElement("div");
    bottomSentinel.style.height = "1px";
    toc.after(bottomSentinel);

    const checkFloatingToc = () => {
      const top = topSentinel.getBoundingClientRect().top;
      const bottom = bottomSentinel.getBoundingClientRect().top;
      const passed = top < 0 && bottom < 0;

      floatingToc.style.display = passed ? "block" : "none";
      mobileBtn.classList.toggle("show", passed);
    };

    window.addEventListener("scroll", checkFloatingToc);
    window.addEventListener("resize", checkFloatingToc);
    checkFloatingToc();
  });

  (function enableFloatingTocDrag() {
    const toc = document.getElementById('floatingToc');
    if (!toc) return;

    let isDragging = false, startX, startY, startLeft, startTop;

    toc.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(window.getComputedStyle(toc).left, 10);
      startTop = parseInt(window.getComputedStyle(toc).top, 10);
      toc.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      toc.style.left = `${startLeft + e.clientX - startX}px`;
      toc.style.top = `${startTop + e.clientY - startY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  })();