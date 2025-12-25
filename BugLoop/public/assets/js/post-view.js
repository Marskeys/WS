document.addEventListener("DOMContentLoaded", () => {
  const postContent = document.querySelector('.post-content');
  const sentinel = document.getElementById('toc-sentinel');
  const floatingToc = document.getElementById('floatingToc');
  const mobileBtn = document.getElementById('mobileTocBtn');
  const mobileModal = document.getElementById('mobileTocModal');
  const mobileContent = document.getElementById('mobileTocContent');
  const tocTitle = document.body.dataset.tocTitle || 'TOC';

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
      iframe.style.cssText = 'width:100%;min-height:100px;border:1px solid #ccc;border-radius:8px;margin:1rem 0;';
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
    if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) e.preventDefault();
  });
  document.addEventListener('selectstart', e => {
    if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) e.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const a = document.activeElement;
      if (!['INPUT', 'TEXTAREA'].includes(a.tagName)) sel.removeAllRanges();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'F12') e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (['c', 'a', 's', 'p', 'u', 'x'].includes(k)) e.preventDefault();
      if (e.shiftKey && ['i', 'j', 'c'].includes(k)) e.preventDefault();
    }
  });

  if (!postContent || !sentinel || !floatingToc || !mobileBtn || !mobileContent) {
    console.warn('[TOC] 필수 요소가 누락되었습니다.');
    return;
  }

  let tocReady = false;

  /* =====================================================
     TOC 빌드 함수
  ===================================================== */
  const buildToc = () => {
    if (tocReady) return;
    const headings = postContent.querySelectorAll('h1, h2');
    if (!headings.length) return;

    let html = `<strong class="toc-title">${tocTitle}</strong><ul class="toc-list">`;
    let h1 = 0, h2 = 0;

    headings.forEach((el, i) => {
      const tag = el.tagName.toLowerCase();
      if (!el.id) el.id = `toc-${tag}-${i}`;
      if (tag === 'h1') {
        h1++; h2 = 0;
        html += `<li class="toc-item toc-h1"><a href="#${el.id}">${h1}. ${el.textContent}</a></li>`;
      } else {
        h2++; if (!h1) h1 = 1;
        html += `<li class="toc-item toc-h2"><a href="#${el.id}">${h1}.${h2} ${el.textContent}</a></li>`;
      }
    });
    html += '</ul>';
    floatingToc.innerHTML = html;
    mobileContent.innerHTML = html;
    tocReady = true;
    updateTocVisibility();
  };

  /* =====================================================
     TOC 표시/숨김 로직
  ===================================================== */
  const updateTocVisibility = () => {
    if (!tocReady) return;
    const rect = sentinel.getBoundingClientRect();
    const passed = rect.top < 10;

    if (window.innerWidth > 768) {
      passed ? floatingToc.classList.add('show') : floatingToc.classList.remove('show');
      mobileBtn.classList.remove('show');
    } else {
      floatingToc.classList.remove('show');
      passed ? mobileBtn.classList.add('show') : mobileBtn.classList.remove('show');
    }
  };

  buildToc();
  window.addEventListener('scroll', updateTocVisibility);
  window.addEventListener('resize', updateTocVisibility);
  setTimeout(updateTocVisibility, 500);

  new MutationObserver(buildToc).observe(postContent, {
    childList: true,
    subtree: true
  });

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
      const targetId = e.target.getAttribute('href').slice(1);
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      mobileModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });

  /* =====================================================
     데스크탑 드래그
  ===================================================== */
  if (window.innerWidth > 768) {
    let drag = false, sx, sy, sl, st;
    floatingToc.style.cursor = 'move';
    floatingToc.addEventListener('mousedown', e => {
      if (e.target.tagName === 'A') return;
      drag = true;
      sx = e.clientX; sy = e.clientY;
      sl = floatingToc.offsetLeft; st = floatingToc.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      floatingToc.style.left = `${sl + e.clientX - sx}px`;
      floatingToc.style.top = `${st + e.clientY - sy}px`;
    });
    document.addEventListener('mouseup', () => drag = false);
  }

  /* =====================================================
     광고 + TTS
  ===================================================== */
  [...postContent.querySelectorAll('p')]
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => [2, 5, 8].includes(i) && p.innerText.length > 50)
    .forEach(({ p }) => {
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
      p.after(wrap);
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    });

  const btn = document.getElementById('ttsBtn');
  if (btn) {
    const listen = btn.dataset.listen || 'Listen';
    const stop = btn.dataset.stop || 'Stop';
    const synth = speechSynthesis;
    let reading = false;
    btn.addEventListener('click', () => {
      if (reading) {
        synth.cancel(); btn.innerText = `🔊 ${listen}`; reading = false; return;
      }
      const u = new SpeechSynthesisUtterance(postContent.innerText);
      u.lang = document.documentElement.lang;
      synth.speak(u);
      btn.innerText = `⏹ ${stop}`;
      reading = true;
      u.onend = () => { btn.innerText = `🔊 ${listen}`; reading = false; };
    });
  }
});
