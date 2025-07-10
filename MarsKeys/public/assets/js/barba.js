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
  

  