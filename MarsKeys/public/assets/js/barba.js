barba.init({
    transitions: [{
      name: 'cube-transition',
      leave(data) {
        return gsap.to(data.current.container, {
          rotateY: -90,
          duration: 0.8,
          transformOrigin: "center left",
          ease: "power2.inOut"
        });
      },
      enter(data) {
        gsap.set(data.next.container, {
          rotateY: 90,
          transformOrigin: "center right"
        });
        return gsap.to(data.next.container, {
          rotateY: 0,
          duration: 0.8,
          ease: "power2.inOut"
        });
      }
    }]
  });
  