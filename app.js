/* app.js */
/* Main JS: feather, mobile menu, EmailJS contact handler, Three.js scenes, GSAP animations */

document.addEventListener('DOMContentLoaded', () => {
  // small helpers
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rafDebounce = (fn) => {
    let raf = null;
    return (...args) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { fn(...args); raf = null; });
    };
  };

  // Initialize icons (feather)
  if (typeof feather !== 'undefined') {
    try { feather.replace(); } catch (e) { /* ignore */ }
  }

  // Set year in footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile menu toggle + close on link click + ESC support
  (function mobileMenu() {
    const btn = document.getElementById('mobile-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    let open = false;

    function setButtonIcon() {
      try {
        btn.innerHTML = open ? feather.icons.x.toSvg() : feather.icons.menu.toSvg();
        btn.setAttribute('aria-expanded', String(open));
      } catch (err) {
        // fallback: leave content as-is
      }
    }

    btn.addEventListener('click', () => {
      open = !open;
      menu.classList.toggle('hidden', !open);
      setButtonIcon();
    });

    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      open = false;
      menu.classList.add('hidden');
      setButtonIcon();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) {
        open = false;
        menu.classList.add('hidden');
        setButtonIcon();
      }
    });
  })();

  // Smooth scroll for internal links and active nav highlighting
  (function smoothScrollAndActiveNav() {
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href === '#') return; // let top anchors behave normally
        const id = href.slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', `#${id}`);
        }
      });
    });

    // Active nav highlight
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));
    if (!navLinks.length) return;
    const sections = navLinks.map(ln => document.getElementById(ln.getAttribute('href').slice(1))).filter(Boolean);

    const onScroll = () => {
      const mid = window.scrollY + window.innerHeight * 0.35;
      let activeIndex = -1;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        const topAbs = window.scrollY + rect.top;
        if (mid >= topAbs) activeIndex = i;
      }
      navLinks.forEach((ln, i) => ln.classList.toggle('text-blue-400', i === activeIndex));
    };
    window.addEventListener('scroll', rafDebounce(onScroll), { passive: true });
    onScroll();
  })();

  /* ---------------------------
     EmailJS contact submission
     Service ID: service_7k2e679
     Template ID: template_17t0xms
     Public Key: yj4QI4a925VyUpe1t (initialized in index.html)
  ----------------------------*/
  (function setupEmailJSForm(){
    const form = document.getElementById('contact-form');
    if (!form) return;

    // If EmailJS not available, fallback to simulated send
    if (typeof emailjs === 'undefined' || typeof emailjs.send !== 'function') {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const b = form.querySelector('button[type="submit"]');
        if (!b) return;
        b.disabled = true;
        const old = b.textContent;
        b.textContent = 'Sending...';
        setTimeout(()=> {
          b.textContent = 'Sent ✓';
          setTimeout(()=> { b.textContent = old; b.disabled = false; }, 1300);
          form.reset();
        }, 800);
      });
      return;
    }

    // Ensure emailjs initialized (safe to call again)
    try { if (!emailjs._userID) emailjs.init('yj4QI4a925VyUpe1t'); } catch (e) {}

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.oldText = submitBtn.textContent || '';
        submitBtn.textContent = 'Sending...';
      }

      const name = (form.querySelector('#name') && form.querySelector('#name').value) || '';
      const email = (form.querySelector('#email') && form.querySelector('#email').value) || '';
      const phone = (form.querySelector('#phone') && form.querySelector('#phone').value) || '';
      const subject = (form.querySelector('#subject') && form.querySelector('#subject').value) || 'New message from portfolio';
      const message = (form.querySelector('#message') && form.querySelector('#message').value) || '';

      const templateParams = {
        from_name: name,
        from_email: email,
        phone: phone,
        subject: subject,
        message: message,
        notify_to: 'aarushshrma0@gmail.com'
      };

      try {
        await emailjs.send('service_7k2e679', 'template_17t0xms', templateParams);
        if (submitBtn) submitBtn.textContent = 'Sent ✓';
        form.reset();
        setTimeout(() => {
          if (submitBtn) {
            submitBtn.textContent = submitBtn.dataset.oldText || 'Send Message';
            submitBtn.disabled = false;
          }
        }, 1500);
      } catch (error) {
        console.error('EmailJS error:', error);
        if (submitBtn) {
          submitBtn.textContent = 'Try again';
          submitBtn.disabled = false;
        }
        alert('Sorry — message failed to send. You can also email directly: aarushshrma0@gmail.com');
      }
    });
  })();

  /* ---------------------------
     THREE.JS — background & overlay (with safeguards)
  ----------------------------*/
  (function threeBackground() {
    if (typeof THREE === 'undefined') return;
    const bgCanvas = document.getElementById('bg-canvas');
    const ovCanvas = document.getElementById('overlay-canvas');
    if (!bgCanvas || !ovCanvas) return;

    // renderers
    const bgRenderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: true });
    const ovRenderer = new THREE.WebGLRenderer({ canvas: ovCanvas, alpha: true, antialias: true });
    const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    bgRenderer.setPixelRatio(maxPixelRatio);
    ovRenderer.setPixelRatio(maxPixelRatio);

    // scenes & cameras
    const bgScene = new THREE.Scene();
    const ovScene = new THREE.Scene();
    const bgCam = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000);
    bgCam.position.set(0,0,80);
    const ovCam = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 500);
    ovCam.position.set(0,0,60);

    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      bgRenderer.setSize(w, h);
      ovRenderer.setSize(w, h);
      bgCam.aspect = w / h; bgCam.updateProjectionMatrix();
      ovCam.aspect = w / h; ovCam.updateProjectionMatrix();
    }
    window.addEventListener('resize', rafDebounce(onResize), { passive: true });
    onResize();

    // star count scaled to screen (reduce on small screens)
    const baseStars = 1200;
    const starCount = window.innerWidth < 768 ? Math.floor(baseStars * 0.45) : baseStars;

    // Starfield
    let points = null;
    (function createStarfield(){
      const starsGeo = new THREE.BufferGeometry();
      const count = Math.min(2000, starCount);
      const arr = new Float32Array(count * 3);
      for (let i=0;i<count;i++){
        arr[i*3] = (Math.random()-0.5)*2000;
        arr[i*3+1] = (Math.random()-0.5)*1200;
        arr[i*3+2] = (Math.random()-0.5)*1600;
      }
      starsGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent:true, opacity:0.85 });
      points = new THREE.Points(starsGeo, starsMat);
      bgScene.add(points);
    })();

    // Soft galaxy sphere
    (function(){
      const gGeo = new THREE.SphereGeometry(300, 32, 32);
      const gMat = new THREE.MeshBasicMaterial({ color: 0x08203a, transparent:true, opacity:0.25, side: THREE.BackSide });
      const sphere = new THREE.Mesh(gGeo, gMat);
      sphere.position.set(0, -40, -200);
      bgScene.add(sphere);
    })();

    // Background icosahedrons group
    const bgGroup = new THREE.Group();
    bgScene.add(bgGroup);
    const icoGeo = new THREE.IcosahedronGeometry(6, 0);
    function makeIco(col){
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.15,
        metalness: 0.5,
        roughness: 0.25,
        transparent: true,
        opacity: 0.9
      });
      return new THREE.Mesh(icoGeo, mat);
    }
    for (let i=0;i<14;i++){
      const c = new THREE.Color().setHSL(0.58 + (Math.random()-0.5)*0.06, 0.7, 0.45 + Math.random()*0.08);
      const m = makeIco(c);
      m.position.set((Math.random()-0.5)*220, (Math.random()-0.5)*120, (Math.random()-0.5)*600);
      m.scale.setScalar(0.6 + Math.random()*1.6);
      bgGroup.add(m);
    }

    bgScene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.6));
    const dlight = new THREE.DirectionalLight(0xffffff, 0.5);
    dlight.position.set(1,1,1);
    bgScene.add(dlight);

    // Overlay group
    const ovGroup = new THREE.Group();
    ovScene.add(ovGroup);
    for (let i=0;i<8;i++){
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x1e3a8a,
        emissiveIntensity: 0.25,
        metalness: 0.4,
        roughness: 0.35,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + Math.random()*4, 0), mat);
      mesh.position.set((Math.random()-0.5)*140, (Math.random()-0.5)*60, (Math.random()-0.5)*200);
      mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
      mesh.scale.setScalar(0.6 + Math.random()*1.4);
      ovGroup.add(mesh);
    }
    ovScene.add(new THREE.AmbientLight(0xffffff, 0.4));
    ovScene.add(new THREE.DirectionalLight(0xffffff, 0.6));

    // Mouse parallax
    const mouse = { x:0, y:0 };
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = -((e.clientY / innerHeight) * 2 - 1);
      mouse.x = nx;
      mouse.y = ny;
    });

    // Respect reduced motion: slow or stop subtle animations
    const speedMultiplier = isReducedMotion ? 0.25 : 1;

    // animate loop
    let last = performance.now();
    function render(t){
      const dt = Math.max(0.0001, (t - last) * 0.001) * speedMultiplier;
      last = t;

      bgGroup.children.forEach((m, i) => {
        m.rotation.x += 0.02 * dt * (1 + i * 0.05);
        m.rotation.y += 0.015 * dt * (1 + i * 0.05);
      });
      ovGroup.children.forEach((m, i) => {
        m.rotation.x += 0.04 * dt * (1 + i * 0.08);
        m.rotation.y += 0.03 * dt * (1 + i * 0.08);
      });

      if (points) {
        const pos = points.geometry.attributes.position.array;
        for (let i=0;i<pos.length;i+=3){
          pos[i+1] -= 0.05 * dt * 40;
          if (pos[i+1] < -800) pos[i+1] = 800;
        }
        points.geometry.attributes.position.needsUpdate = true;
      }

      bgCam.position.x += (mouse.x * 30 - bgCam.position.x) * 0.06;
      bgCam.position.y += (mouse.y * 18 - bgCam.position.y) * 0.06;
      bgCam.lookAt(0,0,0);

      ovCam.position.x += (mouse.x * 20 - ovCam.position.x) * 0.08;
      ovCam.position.y += (mouse.y * 14 - ovCam.position.y) * 0.08;
      ovCam.lookAt(0,0,0);

      bgRenderer.render(bgScene, bgCam);
      ovRenderer.render(ovScene, ovCam);

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  })();

  // GSAP Animations (ScrollTrigger)
  (function(){
    if (typeof gsap === 'undefined') return;
    try {
      gsap.registerPlugin(ScrollTrigger);
      if (!isReducedMotion) {
        gsap.utils.toArray('section').forEach(section => {
          gsap.from(section, {
            opacity: 0,
            y: 40,
            duration: 0.9,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          });
        });

        gsap.from('.card', {
          y: 20,
          opacity: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#projects',
            start: 'top 85%'
          }
        });
      }
    } catch (e) { console.warn('GSAP init failed', e); }
  })();

}); // DOMContentLoaded
