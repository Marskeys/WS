barba.init({
    transitions: [{
      name: 'cube-transition',
      leave(data) {
        return gsap.to(data.current.container, {
          rotateY: -90,
          duration: 0.8,
          transformOrigin: "center center",
          ease: "power2.inOut"
        });
      },
      enter(data) {
        gsap.set(data.next.container, {
          rotateY: 90,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%'
        });
        return gsap.to(data.next.container, {
          rotateY: 0,
          duration: 0.8,
          transformOrigin: "center center",
          ease: "power2.inOut"
        });
      }
    }]
  });
  
  // ✅ 진입 후 postview일 경우 초기화 함수 실행
  barba.hooks.afterEnter(() => {
    if (document.querySelector('[data-barba-namespace="postview"]')) {
      initPostViewPage();
    }
  });
  

  function initPostViewPage() {
    // 기존 document.addEventListener("DOMContentLoaded", ...) 안에 있던 코드를
    // 여기에 그대로 옮겨줘! 👇
    
    document.querySelectorAll('.custom-widget[data-type="html-snippet"]').forEach((el, index) => {
      // ... 중략 ...
    });
  
    const adCode = `
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="ca-pub-2585969189290118"
           data-ad-slot="7758400001"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    `;
    const postContent = document.querySelector('.post-content');
    if (postContent) {
      const potentialAdTargets = postContent.querySelectorAll('p, h2');
      const adPositions = [2, 6];
      adPositions.forEach(position => {
        if (potentialAdTargets.length > position) {
          const targetElement = potentialAdTargets[position];
          const adContainer = document.createElement('div');
          adContainer.innerHTML = adCode;
          targetElement.insertAdjacentElement('afterend', adContainer);
          try {
            (adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            console.error("Adsense push error: ", e);
          }
        }
      });
    }
  
    document.querySelectorAll('.post-body script').forEach(script => {
      const newScript = document.createElement('script');
      if (script.src) newScript.src = script.src;
      else newScript.textContent = script.textContent;
      document.body.appendChild(newScript);
    });
  }
  