/* =====================================================
   post-view.js (FINAL, STABLE)
   - EJS 기준점(toc-sentinel) 사용
   - 본문 렌더 완료 후 TOC 생성
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     HTML 위젯 iframe 처리
  ===================================================== */
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
      iframe.style.cssText =
        'width:100%;min-height:100px;border:1px solid #ccc;border-radius:8px;margin:1rem 0;';
      iframe.srcdoc = decoded;

      el.innerHTML = '';
      el.appendChild(iframe);
    } catch (e) {
      el.innerHTML = '<p style="color:red;">[HTML 코드 디코딩 실패]</p>';
      console.error(e);
    }
  });

  /* =====================================================
     사용자 행동 차단
  ===================================================== */
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('dragstart', e => {
    if (!['INPUT','TEXTAREA'].includes(e.target.tagName)) e.preventDefault();
  });
  document.addEventListener('selectstart', e => {
    if (!['INPUT','TEXTAREA'].includes(e.target.tagName)) e.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const a = document.activeElement;
      if (!['INPUT','TEXTAREA'].includes(a.tagName)) sel.removeAllRanges();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'F12') return e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (['c','a','s','p','u','x'].includes(k)) e.preventDefault();
      if (e.shiftKey && ['i','j','c'].includes(k)) e.preventDefault();
    }
  });

  /* =====================================================
     TOC 생성 (본문 완성 후)
  ===================================================== */
  const postContent = document.querySelector('.post-content');
  const sentinel = document.getElementById('toc-sentinel');
  const floatingToc = document.getElementById('floatingToc');
  const mobileBtn = document.getElementById('mobileTocBtn');
  const mobileModal = document.getElementById('mobileTocModal');
  const mobileContent = document.getElementById('mobileTocContent');
  const tocTitle = document.body.dataset.tocTitle || 'TOC';

  if (!postContent || !sentinel || !floatingToc || !mobileBtn || !mobileContent) {
    console.warn('[TOC] required elements missing');
    return;
  }

  let tocInitialized = false;

  const buildToc = () => {
    if (tocInitialized) return;

    const headings = postContent.querySelectorAll('h1, h2');
    if (!headings.length) return;

    let html = `<strong>${tocTitle}</strong><ul style="padding-left:1.2em;">`;
    let h1 = 0, h2 = 0;

    headings.forEach((el, i) => {
      const tag = el.tagName.toLowerCase();
      if (!el.id) el.id = `toc-${tag}-${i}`;

      if (tag === 'h1') {
        h1++; h2 = 0;
        html += `<li class="toc-h1"><a href="#${el.id}">${h1}. ${el.textContent}</a></li>`;
      } else {
        h2++; if (!h1) h1 = 1;
        html += `<li class="toc-h2"><a href="#${el.id}">${h1}.${h2} ${el.textContent}</a></li>`;
      }
    });

    html += '</ul>';

    floatingToc.innerHTML = html;
    mobileContent.innerHTML = html;
    tocInitialized = true;

    updateTocVisibility();
  };

  /* =====================================================
     MutationObserver로 본문 변화 감지
  ===================================================== */
  const observer = new MutationObserver(buildToc);
  observer.observe(postContent, {
    childList: true,
    subtree: true
  });

  /* =====================================================
     TOC 표시 로직
  ===================================================== */
  const updateTocVisibility = () => {
    if (!tocInitialized) return;

    const passed = sentinel.getBoundingClientRect().top < 0;

    if (window.innerWidth > 768) {
      floatingToc.style.display = passed ? 'block' : 'none';
      mobileBtn.classList.remove('show');
    } else {
      floatingToc.style.display = 'none';
      mobileBtn.classList.toggle('show', passed);
    }
  };

  window.addEventListener('scroll', updateTocVisibility);
  window.addEventListener('resize', updateTocVisibility);

  /* =====================================================
     모바일 TOC
  ===================================================== */
  mobileBtn.addEventListener('click', () => {
    mobileModal.style.display = 'flex';
    document.body.classList.add('modal-open');
  });

  mobileModal.addEventListener('click', e => {
    if (e.target === mobileModal) {
      mobileModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });

  mobileContent.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      document.getElementById(e.target.getAttribute('href').slice(1))
        ?.scrollIntoView({ behavior: 'smooth' });
      mobileModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });

  /* =====================================================
     플로팅 TOC 드래그 (데스크탑)
  ===================================================== */
  if (window.innerWidth > 768) {
    let drag = false, sx, sy, sl, st;

    floatingToc.style.position = 'fixed';
    floatingToc.style.cursor = 'move';

    floatingToc.addEventListener('mousedown', e => {
      drag = true;
      sx = e.clientX; sy = e.clientY;
      sl = floatingToc.offsetLeft;
      st = floatingToc.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!drag) return;
      floatingToc.style.left = `${sl + e.clientX - sx}px`;
      floatingToc.style.top  = `${st + e.clientY - sy}px`;
    });

    document.addEventListener('mouseup', () => drag = false);
  }

  /* =====================================================
     본문 광고
  ===================================================== */
  const ps = [...postContent.querySelectorAll('p')];
  [2,5,8].filter(i => ps[i] && ps[i].innerText.length > 50).forEach(i => {
    const wrap = document.createElement('div');
    wrap.className = 'in-article-ad';

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = 'ca-pub-2585969189290118';
    ins.dataset.adSlot = '2419246715';
    ins.dataset.adFormat = 'auto';
    ins.dataset.fullWidthResponsive = 'true';

    wrap.appendChild(ins);
    ps[i].after(wrap);
    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  });

  /* =====================================================
     TTS
  ===================================================== */
  const btn = document.getElementById('ttsBtn');
  if (btn) {
    const listen = btn.dataset.listen || 'Listen';
    const stop = btn.dataset.stop || 'Stop';
    const synth = speechSynthesis;
    let reading = false;

    btn.addEventListener('click', () => {
      if (reading) {
        synth.cancel();
        btn.innerText = `🔊 ${listen}`;
        reading = false;
        return;
      }

      const text = postContent.innerText;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = document.documentElement.lang;
      synth.speak(u);

      btn.innerText = `⏹ ${stop}`;
      reading = true;
      u.onend = () => {
        btn.innerText = `🔊 ${listen}`;
        reading = false;
      };
    });
  }
});

/* =====================================================
   iframe height sync
===================================================== */
function sendHeightToParent() {
  const h = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  window.parent?.postMessage({
    type: 'setIframeHeight',
    height: h,
    iframeName: window.name
  }, '*');
}

window.addEventListener('message', e => {
  if (e.data?.type === 'setIframeHeight') {
    const iframe = document.querySelector(`iframe[name="${e.data.iframeName}"]`);
    if (iframe) iframe.style.height = `${e.data.height}px`;
  }
});

window.addEventListener('load', sendHeightToParent);
window.addEventListener('resize', sendHeightToParent);
