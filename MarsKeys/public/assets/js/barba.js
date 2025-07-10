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
          position: 'absolute', // ← 겹치게 하기 위해 필요
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
  
  