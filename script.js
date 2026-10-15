(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const COLORS = ['228,192,122', '127,214,208', '138,125,255', '255,143,177'];
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  const shocks = [];
  let dpr = 1, W = 0, H = 0, pts = [];

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* =====================================================
     Canvases: aether field (behind) + fx layer (above)
  ===================================================== */
  const cv = $('#aether'), ctx = cv.getContext('2d');
  const fx = $('#fx'), fctx = fx.getContext('2d');

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = fx.width = Math.round(innerWidth * dpr);
    H = cv.height = fx.height = Math.round(innerHeight * dpr);
    const n = Math.round(Math.min(130, (innerWidth * innerHeight) / 14000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: reduce ? 0 : (Math.random() - .5) * .25 * dpr,
      vy: reduce ? 0 : (Math.random() - .5) * .25 * dpr,
      r: (Math.random() * 1.4 + .5) * dpr,
      c: COLORS[(Math.random() * 3) | 0],
      p: Math.random() * 6.28
    }));
  }

  function drawAether(t) {
    ctx.clearRect(0, 0, W, H);
    const link = 120 * dpr, mx = mouse.x * dpr, my = mouse.y * dpr, vmax = 5 * dpr;
    for (let i = shocks.length - 1; i >= 0; i--) if (t - shocks[i].t > 1500) shocks.splice(i, 1);

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      let md = 1e9;
      if (!reduce) {
        if (mouse.active) {
          const dx = mx - a.x, dy = my - a.y, d = Math.hypot(dx, dy) || 1;
          md = d;
          if (d < 240 * dpr) { a.vx += dx / d * .006 * dpr; a.vy += dy / d * .006 * dpr; }
        }
        for (const s of shocks) {            // click shockwave pushes particles outward
          const age = Math.max(0, (t - s.t) / 1000), front = age * 850 * dpr;
          const dx = a.x - s.x * dpr, dy = a.y - s.y * dpr, d = Math.hypot(dx, dy) || 1;
          if (Math.abs(d - front) < 70 * dpr) {
            const k = (1 - age / 1.5) * 1.1 * dpr;
            a.vx += dx / d * k; a.vy += dy / d * k;
          }
        }
        a.vx += (Math.random() - .5) * .012 * dpr; a.vy += (Math.random() - .5) * .012 * dpr;
        const sp = Math.hypot(a.vx, a.vy);
        if (sp > vmax) { a.vx *= vmax / sp; a.vy *= vmax / sp; }
        a.vx *= .985; a.vy *= .985;
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0) a.x = W; if (a.x > W) a.x = 0;
        if (a.y < 0) a.y = H; if (a.y > H) a.y = 0;
      }
      const tw = .55 + .45 * Math.sin(t / 900 + a.p);
      ctx.fillStyle = `rgba(${a.c},${.75 * tw})`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();

      if (md < 170 * dpr) {                 // threads from cursor to nearby stars
        ctx.strokeStyle = `rgba(246,223,168,${(1 - md / (170 * dpr)) * .55})`;
        ctx.lineWidth = dpr * .8;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(a.x, a.y); ctx.stroke();
      }
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], l = Math.hypot(a.x - b.x, a.y - b.y);
        if (l < link) {
          ctx.strokeStyle = `rgba(${a.c},${(1 - l / link) * .22})`;
          ctx.lineWidth = dpr * .7;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
  }

  /* ---------- fx layer: comet trail, sparks, click ripples ---------- */
  const sparks = [], trail = [], ripples = [];
  function spark(x, y, vx, vy) {
    if (sparks.length > 450) sparks.shift();
    sparks.push({ x, y, vx, vy, l: 1, dec: .012 + Math.random() * .02, r: Math.random() * 1.8 + .7, c: COLORS[(Math.random() * COLORS.length) | 0] });
  }
  function burst(x, y, n = 34) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = 1.5 + Math.random() * 5.5;
      spark(x, y, Math.cos(a) * s, Math.sin(a) * s);
    }
    const now = performance.now();
    ripples.push({ x, y, t: now });
    shocks.push({ x, y, t: now });
  }
  let lastX = null, lastY = null;
  function trailMove(x, y) {
    if (reduce) return;
    if (lastX !== null) {
      const dx = x - lastX, dy = y - lastY, sp = Math.hypot(dx, dy);
      const n = Math.min(4, Math.floor(sp / 10));
      for (let i = 0; i < n; i++)
        spark(x - dx * i / n, y - dy * i / n, (Math.random() - .5) * 1.4 - dx * .04, (Math.random() - .5) * 1.4 - dy * .04 - .3);
    }
    trail.push({ x, y, t: performance.now() });
    if (trail.length > 40) trail.shift();
    lastX = x; lastY = y;
  }

  function drawFx(t) {
    fctx.clearRect(0, 0, W, H);
    if (reduce) return;
    fctx.globalCompositeOperation = 'lighter';
    fctx.lineCap = 'round';

    while (trail.length && t - trail[0].t > 380) trail.shift();
    for (let i = 1; i < trail.length; i++) {
      const p = trail[i - 1], q = trail[i];
      if (Math.hypot(q.x - p.x, q.y - p.y) > 260) continue;
      const k = clamp(1 - (t - q.t) / 380, 0, 1), w = k * 7 * dpr;
      fctx.beginPath(); fctx.moveTo(p.x * dpr, p.y * dpr); fctx.lineTo(q.x * dpr, q.y * dpr);
      fctx.strokeStyle = `rgba(127,214,208,${k * .25})`; fctx.lineWidth = w * 2.2; fctx.stroke();
      fctx.strokeStyle = `rgba(246,223,168,${k * .8})`; fctx.lineWidth = Math.max(.5, w * .6); fctx.stroke();
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vx *= .96; s.vy = s.vy * .96 - .01; s.l -= s.dec;
      if (s.l <= 0) { sparks.splice(i, 1); continue; }
      const r = s.r * s.l * dpr * 1.6;
      fctx.fillStyle = `rgba(${s.c},${s.l * .35})`;
      fctx.beginPath(); fctx.arc(s.x * dpr, s.y * dpr, r * 2.6, 0, 6.283); fctx.fill();
      fctx.fillStyle = `rgba(${s.c},${s.l})`;
      fctx.beginPath(); fctx.arc(s.x * dpr, s.y * dpr, r, 0, 6.283); fctx.fill();
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = Math.max(0, (t - r.t) / 900);
      if (age >= 1) { ripples.splice(i, 1); continue; }
      [[1, '246,223,168'], [.65, '255,143,177']].forEach(([m, c]) => {
        fctx.strokeStyle = `rgba(${c},${(1 - age) * .6})`;
        fctx.lineWidth = 1.5 * dpr;
        fctx.beginPath(); fctx.arc(r.x * dpr, r.y * dpr, age * 160 * m * dpr, 0, 6.283); fctx.stroke();
      });
    }
    fctx.globalCompositeOperation = 'source-over';
  }

  /* =====================================================
     Custom cursor + glow
  ===================================================== */
  const dot = $('.cur-dot'), ring = $('.cur-ring'), rspan = $('span', ring), glow = $('.cursor-glow');
  const ringP = { x: mouse.x, y: mouse.y }, glowP = { x: mouse.x, y: mouse.y };

  function updateCursor() {
    ringP.x = lerp(ringP.x, mouse.x, .2); ringP.y = lerp(ringP.y, mouse.y, .2);
    glowP.x = lerp(glowP.x, mouse.x, .09); glowP.y = lerp(glowP.y, mouse.y, .09);
    dot.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;
    ring.style.transform = `translate(${ringP.x}px,${ringP.y}px)`;
    glow.style.transform = `translate(${glowP.x - 260}px,${glowP.y - 260}px)`;
  }
  function cursorState(t) {
    if (!fine) return;
    const lab = t.closest && t.closest('[data-cursor]');
    const lnk = t.closest && t.closest('a,button,.btn');
    if (lab) rspan.textContent = lab.dataset.cursor;
    ring.classList.toggle('label', !!lab && !lnk);
    ring.classList.toggle('link', !!lnk);
  }

  /* =====================================================
     Reactive headline: split into letters
  ===================================================== */
  const chars = [];
  let titleLive = false;
  const h1 = $('h1');
  h1.setAttribute('aria-label', 'An Aetherial Renaissance');
  function splitChars(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach(ch => {
          const s = document.createElement('span');
          s.className = 'ch'; s.textContent = ch;
          frag.appendChild(s);
          chars.push({ el: s, x: 0, y: 0, s: 1, em: !!s.closest && false });
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) splitChars(n);
    });
  }
  $$('h1 .line').forEach(l => l.setAttribute('aria-hidden', 'true'));
  $$('h1 .line>span').forEach(splitChars);
  const stops = [[246, 223, 168], [127, 214, 208], [138, 125, 255]];
  const grad = t => {
    const s = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s)), f = s - i;
    return stops[i].map((v, k) => Math.round(lerp(v, stops[i + 1][k], f)));
  };
  chars.forEach(c => { c.em = !!c.el.closest('em'); });
  const emChars = chars.filter(c => c.em);
  emChars.forEach((c, i) => { c.el.style.color = `rgb(${grad(i / Math.max(1, emChars.length - 1))})`; });

  function updateTitle() {
    if (!titleLive || reduce || scrollY > innerHeight) return;
    for (const c of chars) {
      const r = c.el.getBoundingClientRect();
      const bx = r.left + r.width / 2 - c.x, by = r.top + r.height / 2 - c.y;
      let tx = 0, ty = 0, ts = 1, k = 0;
      if (mouse.active) {
        const dx = mouse.x - bx, dy = mouse.y - by, d = Math.hypot(dx, dy) || 1;
        if (d < 190) { k = Math.pow(1 - d / 190, 2); tx = -dx / d * k * 26; ty = -dy / d * k * 26; ts = 1 + k * .28; }
      }
      c.x = lerp(c.x, tx, .16); c.y = lerp(c.y, ty, .16); c.s = lerp(c.s, ts, .16);
      c.el.style.transform = `translate(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px) scale(${c.s.toFixed(3)})`;
      c.el.style.textShadow = k > .04 ? `0 0 ${(k * 34).toFixed(0)}px rgba(228,192,122,${(k * .95).toFixed(2)})` : '';
    }
  }

  /* =====================================================
     Orrery parallax, marquee speed, manifesto, progress
  ===================================================== */
  const orrery = $('.orrery'), par = { x: 0, y: 0 };
  function updateParallax() {
    if (scrollY > innerHeight * 1.2) return;
    par.x = lerp(par.x, (mouse.x / innerWidth - .5) * -46, .06);
    par.y = lerp(par.y, (mouse.y / innerHeight - .5) * -46, .06);
    orrery.style.setProperty('--ox', par.x.toFixed(1) + 'px');
    orrery.style.setProperty('--oy', par.y.toFixed(1) + 'px');
    orrery.style.setProperty('--rot', (scrollY * .04).toFixed(2) + 'deg');
  }

  const track = $('.track');
  let trackAnim = null, lastScroll = scrollY, vel = 0;
  function updateMarquee() {
    vel = lerp(vel, scrollY - lastScroll, .12); lastScroll = scrollY;
    if (!trackAnim) trackAnim = track.getAnimations()[0];
    if (trackAnim) trackAnim.playbackRate = 1 + Math.min(8, Math.abs(vel) * .4);
  }

  const mt = $('#manifestoText'), words = [];
  const HOT = /^(laboratory|stage|arena|renaissance|you)/i;
  mt.textContent.trim().split(/\s+/).forEach(w => {
    const s = document.createElement('span');
    s.className = 'w' + (HOT.test(w) ? ' hot' : '');
    s.textContent = w;
    words.push(s);
  });
  mt.textContent = '';
  words.forEach(w => mt.appendChild(w));
  function updateManifesto() {
    const r = mt.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    const p = clamp((innerHeight * .82 - r.top) / (r.height + innerHeight * .35), 0, 1);
    const n = reduce ? words.length : Math.round(p * words.length * 1.08);
    words.forEach((w, i) => {
      const on = i < n;
      if (on !== w._on) { w._on = on; w.classList.toggle('lit', on); }
    });
  }

  const nav = $('#nav'), bar = $('#progressBar');
  function onScroll() {
    nav.classList.toggle('stuck', scrollY > 40);
    const max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* =====================================================
     Master loop
  ===================================================== */
  function loop(t) {
    drawAether(t); drawFx(t);
    updateCursor(); updateTitle(); updateParallax(); updateMarquee(); updateManifesto();
    requestAnimationFrame(loop);
  }
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);

  /* =====================================================
     Pointer input: magnet buttons, card parallax, burst
  ===================================================== */
  const btns = $$('.btn');
  // hover fill wipes from where the cursor enters/leaves; click spawns a ripple
  btns.forEach(b => {
    const setOrigin = e => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--px', (e.clientX - r.left) + 'px');
      b.style.setProperty('--py', (e.clientY - r.top) + 'px');
    };
    b.addEventListener('pointerenter', setOrigin);
    b.addEventListener('pointerleave', setOrigin);
    b.addEventListener('pointerdown', e => {
      const r = b.getBoundingClientRect(), s = document.createElement('span');
      s.className = 'ripple';
      s.style.left = (e.clientX - r.left) + 'px';
      s.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(s);
      s.addEventListener('animationend', () => s.remove());
    });
  });
  function magnet(e) {
    btns.forEach(b => {
      const r = b.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < Math.max(r.width, r.height) * .8 + 30) {
        b.style.setProperty('--bx', (dx * .28).toFixed(1) + 'px');
        b.style.setProperty('--by', (dy * .4).toFixed(1) + 'px');
        b._m = true;
      } else if (b._m) {
        b.style.removeProperty('--bx'); b.style.removeProperty('--by'); b._m = false;
      }
    });
  }

  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    if (fine) root.classList.add('has-cursor');
    cursorState(e.target);
    trailMove(e.clientX, e.clientY);
    if (fine && !reduce) magnet(e);
  }, { passive: true });
  root.addEventListener('mouseleave', () => { mouse.active = false; root.classList.remove('has-cursor'); lastX = lastY = null; });
  addEventListener('pointerdown', e => {
    ring.classList.add('down');
    burst(e.clientX, e.clientY);
  });
  addEventListener('pointerup', () => ring.classList.remove('down'));

  /* ---------- Orrery ticks ---------- */
  const ticks = $('.ticks'), NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 72; i++) {
    const a = i * 5 * Math.PI / 180, long = i % 6 === 0;
    const l = document.createElementNS(NS, 'line');
    const r2 = long ? 336 : 348;
    l.setAttribute('x1', Math.cos(a) * 360); l.setAttribute('y1', Math.sin(a) * 360);
    l.setAttribute('x2', Math.cos(a) * r2); l.setAttribute('y2', Math.sin(a) * r2);
    ticks.appendChild(l);
  }

  /* ---------- Countdown to 16 Dec 2026, 00:00 IST ---------- */
  const target = new Date('2026-12-16T00:00:00+05:30').getTime();
  const cd = {};
  $$('#countdown b').forEach(b => cd[b.dataset.u] = b);
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    cd.d.textContent = pad(d); cd.h.textContent = pad(h);
    cd.m.textContent = pad(Math.floor(s / 60)); cd.s.textContent = pad(s % 60);
  }
  tick(); setInterval(tick, 1000);

  /* ---------- Reveal on scroll ---------- */
  $$('.pillars .card, .stats .stat').forEach((el, i) => el.style.setProperty('--d', (i % 3) * .1 + 's'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Text scramble ---------- */
  const GL = '▲◆●■+×·:/<>#';
  function scramble(el, text) {
    if (reduce) { el.textContent = text; return; }
    clearInterval(el._sc);
    let f = 0; const total = 20;
    el._sc = setInterval(() => {
      f++;
      el.textContent = [...text].map((c, i) => c === ' ' ? ' ' : (i < f / total * text.length ? c : GL[(Math.random() * GL.length) | 0])).join('');
      if (f >= total) { clearInterval(el._sc); el.textContent = text; }
    }, 28);
  }
  const eyeIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { scramble(e.target, e.target.dataset.t); eyeIO.unobserve(e.target); }
  }), { threshold: 1 });
  $$('.section-head .eyebrow, .manifesto .eyebrow').forEach(el => { el.dataset.t = el.textContent; eyeIO.observe(el); });

  /* ---------- Section tint for the cursor glow ---------- */
  const tints = { '.hero': '127,214,208', '#manifesto': '228,192,122', '#pillars': '138,125,255', '#numbers': '228,192,122', '#codex': '255,143,177', '#visit': '127,214,208' };
  const tintIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) root.style.setProperty('--glow', e.target.dataset.tint);
  }), { rootMargin: '-45% 0px -45% 0px' });
  Object.entries(tints).forEach(([sel, c]) => { const el = $(sel); if (el) { el.dataset.tint = c; tintIO.observe(el); } });

  /* ---------- Count-up stats ---------- */
  const fmt = new Intl.NumberFormat('en-IN');
  const co = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    co.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const dur = reduce ? 1 : 1800, t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 4)));
      el.textContent = pre + fmt.format(v) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => co.observe(el));

  /* ---------- Pillar cards: spotlight, icon parallax, tag scramble ---------- */
  const cards = $$('.pillars .card');
  cards.forEach(c => {
    const glyph = $('.glyph', c), tag = $('.tag', c);
    tag.dataset.t = tag.textContent;
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      glyph.style.setProperty('--gx', (((e.clientX - r.left) / r.width - .5) * 22).toFixed(1) + 'px');
      glyph.style.setProperty('--gy', (((e.clientY - r.top) / r.height - .5) * 22).toFixed(1) + 'px');
    });
    c.addEventListener('pointerenter', () => scramble(tag, tag.dataset.t));
    c.addEventListener('pointerleave', () => { glyph.style.removeProperty('--gx'); glyph.style.removeProperty('--gy'); });
  });

  /* ---------- "Find your pillar" picker ---------- */
  const grid = $('#pillarGrid'), pickBtns = $$('#picker button');
  pickBtns.forEach(b => b.addEventListener('click', () => {
    const wasOn = b.classList.contains('on');
    pickBtns.forEach(x => x.classList.remove('on'));
    cards.forEach(c => c.classList.remove('match'));
    if (wasOn) { grid.classList.remove('filtering'); return; }
    b.classList.add('on');
    cards.forEach(c => c.classList.add('in'));
    b.dataset.pick.split(',').forEach(n => cards[+n - 1].classList.add('match'));
    grid.classList.add('filtering');
  }));

  /* ---------- Draggable timeline ---------- */
  const tl = $('#timeline');
  let down = false, sx = 0, sl = 0;
  tl.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = tl.scrollLeft; tl.classList.add('drag'); });
  addEventListener('pointerup', () => { down = false; tl.classList.remove('drag'); });
  addEventListener('pointermove', e => { if (down) tl.scrollLeft = sl - (e.clientX - sx); });
  tl.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const max = tl.scrollWidth - tl.clientWidth;
    if ((e.deltaY > 0 && tl.scrollLeft < max - 1) || (e.deltaY < 0 && tl.scrollLeft > 0)) {
      e.preventDefault(); tl.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  /* =====================================================
     Intro loader
  ===================================================== */
  const loader = $('#loader'), num = $('#loadNum'), fg = $('#lrFg'), CIRC = 314.16;
  document.body.style.overflow = 'hidden';
  scrollTo(0, 0);
  const fontsReady = Promise.race([
    (document.fonts && document.fonts.ready) || Promise.resolve(),
    new Promise(r => setTimeout(r, 1800))
  ]);
  function finishLoad() {
    loader.classList.add('gone');
    document.body.classList.add('ready');
    document.body.style.overflow = '';
    setTimeout(() => {
      $$('h1 .line').forEach(l => l.classList.add('done'));
      titleLive = true;
    }, reduce ? 0 : 1900);
    const rect = $('.hero .btn-primary').getBoundingClientRect();
    setTimeout(() => burst(rect.left + rect.width / 2, innerHeight * .42, 46), reduce ? 0 : 500);
  }
  const t0 = performance.now(), dur = reduce ? 150 : 1500;
  (function step(now) {
    const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
    num.textContent = Math.round(e * 100);
    fg.style.strokeDashoffset = CIRC * (1 - e);
    if (k < 1) requestAnimationFrame(step); else fontsReady.then(finishLoad);
  })(t0);
})();
