import { BUSINESS, STORE } from './data.js?v=20261021b';

const T = (key, bg) => (window.nikoT ? window.nikoT(key, bg) : bg).replace('{phone}', BUSINESS.phone);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const DPR = Math.min(2, devicePixelRatio || 1);

function through(sec) {
  const r = sec.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - innerHeight));
}

function whileVisible(el, frame) {
  let raf = 0, on = false;
  const loop = (now) => {
    raf = 0;
    if (!on) return;
    frame(now / 1000);
    raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    if (on && !raf) raf = requestAnimationFrame(loop);
  }).observe(el);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const span = (p, a, b) => clamp((p - a) / (b - a));
const hash = (k) => {
  let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const i = new Image();
  i.decoding = 'async';
  i.onload = () => resolve(i);
  i.onerror = () => reject(new Error(src));
  i.src = src;
});

const cover = (cw, ch, w, h, fx = 0.5, fy = 0.5, zoom = 1) => {
  const s = Math.max(cw / w, ch / h) * zoom;
  return { s, x: (cw - w * s) * fx, y: (ch - h * s) * fy, w: w * s, h: h * s, cw, ch };
};

/* ---------- Reveal ---------- */
function setUpReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));
}

/* ---------- Bar states ---------- */
function setUpBar() {
  const bar = $('[data-bar]');
  const paper = $$('.ground-paper');
  const update = () => {
    const scroll = scrollY;
    const atPaper = paper.some(s => {
      const r = s.getBoundingClientRect();
      return r.top <= 40 && r.bottom > 40;
    });
    bar.classList.toggle('is-light', atPaper);
    bar.classList.toggle('is-solid', !atPaper && scroll > 80);
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

function setUpMenu() {
  const nav = $('#nav');
  const btn = $('[data-burger]');
  if (!nav || !btn) return;
  const set = (open) => {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => set(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !btn.contains(e.target)) set(false);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

/* ---------- Rain ---------- */
class Rain {
  constructor(canvas, roof = { pts: [], cell: 8 }) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.roof = roof;
    let seed = 101;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    this.drops = Array.from({ length: 520 }, () => ({
      x: rnd(), y: rnd(), z: rnd(), l: 0.6 + 0.8 * rnd()
    }));
  }

  size(w, h) {
    this.k = Math.min(DPR, this.cap ?? 1.25);
    this.canvas.width = Math.round(w * this.k);
    this.canvas.height = Math.round(h * this.k);
  }

  draw(t, amount, map = null, flash = 0) {
    const g = this.g, W = this.canvas.width, H = this.canvas.height, k = this.k;
    g.clearRect(0, 0, W, H);
    if (amount < 0.01) return;
    const n = Math.round(this.drops.length * amount * (this.budget ?? 1));
    const wind = 0.18;
    [[0, 0.5], [0.5, 0.82], [0.82, 1.01]].forEach(([z0, z1], band) => {
      const zmid = (z0 + z1) / 2;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const d = this.drops[i];
        if (d.z < z0 || d.z >= z1) continue;
        const speed = 0.36 + 0.44 * d.z;
        const y = (((d.y + t * speed) % 1.2) - 0.1) * H;
        const len = (0.016 + 0.030 * d.z) * H * d.l;
        const x = (d.x * 1.3 - 0.15) * W + wind * y;
        g.moveTo(x, y);
        g.lineTo(x + wind * len, y + len);
      }
      g.lineCap = band === 2 ? 'round' : 'butt';
      g.lineWidth = (0.55 + 1.1 * zmid) * k;
      g.strokeStyle = `rgba(214, 224, 236, ${Math.min(0.92, (0.1 + 0.26 * zmid) * (1 + 1.7 * flash) * (0.5 + 0.5 * amount))})`;
      g.stroke();
      if (band === 0 && map && this.roof.pts.length) this.splash(t, amount, map, W, H, k);
    });
  }

  splash(t, amount, map, W, H, k) {
    const g = this.g, { pts, cell } = this.roof;
    const RATE = 140, LIFE = 0.26;
    g.beginPath();
    for (let j = Math.floor((t - LIFE) * RATE); j <= Math.floor(t * RATE); j++) {
      if (hash(j * 3 + 1) > amount) continue;
      const age = t - j / RATE;
      if (age < 0 || age > LIFE) continue;
      const p = pts[Math.floor(hash(j) * pts.length)];
      const px = p[0] + (hash(j * 5 + 2) - 0.5) * cell;
      const py = p[1] + (hash(j * 7 + 3) - 0.5) * cell;
      const X = (map.x + px * map.w) * (W / map.cw);
      const Y = (map.y + py * map.h) * (H / map.ch);
      const r = (1.5 + 4.2 * py) * k * (0.45 + age / LIFE);
      g.moveTo(X + r, Y);
      g.ellipse(X, Y, r, r * 0.34, 0, 0, Math.PI * 2);
    }
    g.lineWidth = 0.9 * k;
    g.strokeStyle = `rgba(226, 234, 242, ${0.5 * (0.6 + 0.4 * amount)})`;
    g.stroke();
  }
}

/* ---------- Hero film: summer, rain, winter as real video loops, one season per swipe ---------- */
const SEASONS = { desk: 'assets/seasons/desk', phone: 'assets/seasons/phone' };
const CLIPS = ['summer', 'rain', 'winter'];
const FADES = [[0.20, 0.42], [0.58, 0.80]];

function setUpSnap(sec) {
  const rest = $('[data-hero-rest]', sec);
  if (!rest || !window.ResizeObserver) return;
  const marks = [...$$('.hero-snap', sec), ...$$('.under-snap'), ...$$('.laying-snap'), rest];
  const live = () => marks.filter((el) => el === rest || el.getClientRects().length);
  const root = document.documentElement;
  let reach = 0, armed = false, busy = false, idle = 0, acc = 0, endY = 0;
  const strictSnap = /firefox|fxios/i.test(navigator.userAgent);
  if (strictSnap) root.classList.add('snap-strict');

  const stops = () => {
    const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    const max = root.scrollHeight - innerHeight;
    return live().map((el) => clamp(Math.round(el.getBoundingClientRect().top + scrollY - pad), 0, max));
  };
  const nested = (e) => e.composedPath().some((n) => n instanceof Element && n !== root && n !== document.body
    && n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY));

  const onWheel = (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || nested(e)) return;
    const s = stops(), y = scrollY, end = s[s.length - 1];
    if (y > end + 2) return;
    if (y >= end - 2 && e.deltaY > 0) { if (strictSnap) root.classList.remove('has-snap'); return; }
    e.preventDefault();
    clearTimeout(idle);
    idle = setTimeout(() => { busy = false; acc = 0; }, 200);
    if (busy) return;
    acc += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(acc) < 12) return;
    const to = acc > 0 ? s.find((v) => v > y + 2) : [...s].reverse().find((v) => v < y - 2);
    busy = true;
    acc = 0;
    if (to !== undefined) scrollTo({ top: to, behavior: reduce ? 'instant' : 'smooth' });
  };
  const arm = () => {
    if (strictSnap) zone();
    const near = scrollY < reach;
    if (near === armed) return;
    armed = near;
    if (near) addEventListener('wheel', onWheel, { passive: false });
    else removeEventListener('wheel', onWheel);
  };

  let tg = null, snapTimer = 0;
  const zone = () => {
    if (tg) return;
    if (scrollY < endY - 2) root.classList.add('has-snap');
    else if (scrollY > endY + 2) root.classList.remove('has-snap');
  };
  const dbg = location.search.includes('probe') ? (window.__snapdbg = []) : null;
  const last = () => { const s = stops(); return s[s.length - 1]; };
  const onTouchStart = (e) => {
    tg = null;
    if (e.touches.length !== 1 || nested(e) || scrollY >= last() - 2 || scrollY >= reach) return;
    tg = { x: e.touches[0].clientX, y: e.touches[0].clientY, start: scrollY, moved: false, s: stops() };
    if (dbg) dbg.push(['ts', Math.round(scrollY), e.cancelable]);
  };
  const onTouchMove = (e) => {
    if (!tg) return;
    const dx = e.touches[0].clientX - tg.x, dy = e.touches[0].clientY - tg.y;
    if (!tg.moved) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      if (Math.abs(dx) > Math.abs(dy)) { tg = null; return; }
      tg.moved = true;
      clearTimeout(snapTimer);
      root.classList.remove('has-snap');
    }
    e.preventDefault();
    scrollTo({ top: tg.start - dy, behavior: 'instant' });
    if (dbg) dbg.push(['tm', Math.round(dy), e.cancelable, e.defaultPrevented, Math.round(scrollY)]);
  };
  const onTouchEnd = () => {
    if (!tg) return;
    const g = tg;
    tg = null;
    if (!g.moved) return;
    const cur = scrollY, dir = Math.sign(cur - g.start);
    let to = g.start;
    if (dir && Math.abs(cur - g.start) > 40) {
      const n = dir > 0 ? g.s.find((p) => p > g.start + 2) : [...g.s].reverse().find((p) => p < g.start - 2);
      if (n !== undefined) to = n;
    }
    if (dbg) dbg.push(['te', Math.round(cur), to]);
    scrollTo({ top: to, behavior: reduce ? 'instant' : 'smooth' });
    clearTimeout(snapTimer);
    snapTimer = setTimeout(strictSnap ? zone : () => { if (!tg) root.classList.add('has-snap'); }, 520);
  };
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  addEventListener('touchend', onTouchEnd, { passive: true });
  addEventListener('touchcancel', onTouchEnd, { passive: true });

  document.body.appendChild(rest);
  const sync = () => {
    const snaps = [...$$('.under-snap'), ...$$('.laying-snap')].filter((el) => el.getClientRects().length);
    const edge = snaps.length ? snaps[snaps.length - 1].getBoundingClientRect().top : sec.getBoundingClientRect().bottom;
    const top = Math.round(edge - document.body.getBoundingClientRect().top);
    if (rest.style.top !== top + 'px') rest.style.top = top + 'px';
    reach = edge + scrollY + innerHeight;
    endY = last();
    if (!strictSnap) root.classList.add('has-snap');
    arm();
  };
  const ro = new ResizeObserver(sync);
  ro.observe(document.body);
  ro.observe(sec);
  const under = $('[data-under]');
  if (under) ro.observe(under);
  const laying = $('[data-laying]');
  if (laying) ro.observe(laying);
  addEventListener('load', sync);
  addEventListener('scroll', arm, { passive: true });
  sync();
}

async function setUpFilm() {
  const sec = $('[data-hero]');
  const stage = $('[data-hero-stage]');
  const plates = $$('[data-hero-plate]', stage);
  if (!sec || !stage || plates.length !== CLIPS.length) return;
  setUpSnap(sec);
  const beats = $$('[data-beat]', stage).map((el) => {
    const [a, b] = el.dataset.beat.split(' ').map(Number);
    return { el, a, b };
  });
  const cue = $('[data-hero-cue]');
  const params = new URLSearchParams(location.search);
  const seekAt = params.has('seek') ? clamp(parseFloat(params.get('seek')) || 0) : null;
  const still = seekAt !== null || !!(navigator.connection && navigator.connection.saveData);
  const pickSet = () => (innerWidth <= 760 || innerHeight / innerWidth > 1.25 ? 'phone' : 'desk');
  const shown = plates.map(() => -1);
  const fails = plates.map(() => 0);
  let set = '', gen = 0, onView = true, blocked = false, p = 0;

  const showBeats = (q) => {
    for (const b of beats) b.el.classList.toggle('is-on', q >= b.a && q < b.b);
    if (cue) cue.classList.toggle('is-gone', q > 0.04);
    document.documentElement.classList.toggle('hero-summer', q < 0.3 && onView);
  };

  const srcOf = (i) => SEASONS[set] + '/' + CLIPS[i] + '.mp4';
  function fetchClip(i) {
    const v = plates[i];
    if (still || v.getAttribute('src') === srcOf(i)) return;
    v.preload = 'auto';
    v.src = srcOf(i);
  }

  function queue(i, g) {
    if (still || g !== gen || i >= plates.length) return;
    const v = plates[i];
    let next = false;
    const go = () => { if (!next) { next = true; clearInterval(iv); v.removeEventListener('progress', whenFull); queue(i + 1, g); } };
    const whole = () => { const b = v.buffered; return v.readyState >= 4 && v.duration > 0 && b.length > 0 && b.end(b.length - 1) >= v.duration - 0.3; };
    const whenFull = () => { if (whole()) go(); };
    fetchClip(i);
    const iv = setInterval(whenFull, 1000);
    v.addEventListener('progress', whenFull);
    v.addEventListener('canplaythrough', whenFull);
    setTimeout(go, 12000);
    whenFull();
  }

  function load(next) {
    set = next;
    gen++;
    plates.forEach((v, i) => {
      v.pause();
      v.removeAttribute('src');
      v.load();
      v.poster = SEASONS[set] + '/' + CLIPS[i] + '.webp';
      fails[i] = 0;
    });
    queue(0, gen);
    const posters = (seekAt === null ? plates.slice(0, 1) : plates).map((v) => loadImage(v.poster));
    return Promise.all(posters).catch(() => null);
  }

  plates.forEach((v, i) => {
    v.addEventListener('error', () => {
      if (still || !v.getAttribute('src') || ++fails[i] > 2) return;
      const g = gen, src = v.getAttribute('src');
      setTimeout(() => { if (g === gen) { v.src = src; v.load(); } }, 1500 * fails[i]);
    });
  });

  function run(i, want) {
    const v = plates[i];
    if (still) return;
    if (!want) { if (!v.paused) v.pause(); return; }
    if (!v.paused || blocked) return;
    fetchClip(i);
    const r = v.play();
    if (r && r.catch) r.catch((e) => { if (e && e.name === 'NotAllowedError') blocked = true; });
  }

  const frame = () => {
    p = seekAt === null ? through(sec) : seekAt;
    const o = [1, ease(span(p, FADES[0][0], FADES[0][1])), ease(span(p, FADES[1][0], FADES[1][1]))];
    for (let i = 0; i < plates.length; i++) {
      if (o[i] !== shown[i]) { plates[i].style.opacity = o[i]; shown[i] = o[i]; }
    }
    const live = onView && !document.hidden;
    run(0, live && o[1] < 1);
    run(1, live && o[1] > 0 && o[2] < 1);
    run(2, live && o[2] > 0);
    showBeats(p);
  };

  if (params.has('probe')) {
    window.__hero = { probe: () => ({ p, set, still, blocked, o: shown.slice(),
      play: plates.map((v) => (v.paused ? 0 : 1)), rs: plates.map((v) => v.readyState),
      src: plates.map((v) => (v.currentSrc || '').split('/').pop()) }) };
  }

  const first = load(pickSet());
  frame();
  if (seekAt !== null) document.documentElement.classList.add('is-seek');
  first.then(() => stage.classList.add('is-ready'));
  if (seekAt !== null) return;

  const barPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 0;
  new IntersectionObserver(([e]) => {
    onView = e.isIntersecting && e.intersectionRatio >= 0.06;
    if (!onView) { plates.forEach((v, i) => run(i, false)); document.documentElement.classList.remove('hero-summer'); }
  }, { threshold: [0, 0.06], rootMargin: `-${Math.round(barPx)}px 0px 0px 0px` }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) plates.forEach((v, i) => run(i, false)); });
  for (const ev of ['pointerdown', 'touchstart', 'keydown', 'wheel']) {
    addEventListener(ev, () => { blocked = false; }, { passive: true });
  }
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (pickSet() !== set) load(pickSet()); }, 130);
  };
  addEventListener('resize', onResize, { passive: true });
  addEventListener('orientationchange', onResize, { passive: true });
  whileVisible(stage, frame);
}

/* ---------- Section 01: step highlighting as scroll + photo swap ---------- */
function setUpUnder() {
  const sec = $('[data-under]');
  if (!sec) return;
  const steps = $$('[data-steps] .step');
  const snaps = $$('.under-snap', sec);
  const order = ['strip', 'frame', 'membrane', 'tile', 'done'];
  function showStep(idx) {
    steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
    const key = order[idx];
    $$('[data-under-pic] img').forEach(img => {
      const on = img.dataset.u === key;
      img.classList.toggle('is-on', on);
      img.classList.toggle('is-off', !on);
    });
  }
  const nearest = () => {
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const ys = snaps.filter((el) => el.getClientRects().length).map((el) => Math.abs(el.getBoundingClientRect().top - pad));
    if (ys.length !== order.length) return clamp(Math.floor(through(sec) * order.length * 1.04), 0, order.length - 1);
    let best = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] < ys[best]) best = i;
    return best;
  };
  let shown = -1;
  const sync = () => {
    const idx = nearest();
    if (idx === shown) return;
    shown = idx;
    showStep(idx);
  };
  addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
}

/* ---------- Section 02: pinned laying progression ---------- */
function setUpLaying() {
  const sec = $('[data-laying]');
  if (!sec) return;
  const imgs = $$('[data-laying-stack] img');
  const phases = $$('[data-phase-track] .phase');
  const counter = $('[data-counter]');
  const counterN = $('[data-counter-n]');
  const N = imgs.length;
  let shown = -1;
  function show(idx) {
    if (idx === shown) return;
    shown = idx;
    $$('[data-laying-stack] img').forEach((img, i) => img.classList.toggle('is-on', i === idx));
    phases.forEach((ph, i) => {
      ph.classList.toggle('is-on', i === idx);
      ph.classList.toggle('is-done', i < idx);
    });
    if (counterN) counterN.textContent = String(idx + 1).padStart(2, '0');
    if (counter) counter.classList.add('is-on');
  }
  show(0);
  const snaps = $$('.laying-snap', sec);
  const nearest = () => {
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const ys = snaps.filter((el) => el.getClientRects().length).map((el) => Math.abs(el.getBoundingClientRect().top - pad));
    if (ys.length !== N) return clamp(Math.floor(through(sec) * (N + 0.001)), 0, N - 1);
    let best = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] < ys[best]) best = i;
    return best;
  };
  whileVisible(sec, () => show(nearest()));
}

/* ---------- Section 03: draggable horizontal rail ---------- */
function setUpWork() {
  const sec = $('[data-work]');
  const track = $('[data-work-track]');
  if (!sec || !track) return;
  sec.style.minHeight = '';
  sec.style.height = '';
  track.style.transform = '';

  const edges = () => {
    const max = track.scrollWidth - track.clientWidth;
    sec.classList.toggle('at-start', track.scrollLeft < 8);
    sec.classList.toggle('at-end', track.scrollLeft > max - 8);
  };
  edges();
  track.addEventListener('scroll', edges, { passive: true });
  addEventListener('resize', edges);

  let down = false, startX = 0, startLeft = 0, moved = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    down = true;
    moved = 0;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
    track.classList.add('is-grabbing');
  });
  track.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    track.scrollLeft = startLeft - dx;
  });
  const release = (e) => {
    if (!down) return;
    down = false;
    track.classList.remove('is-grabbing');
    if (track.hasPointerCapture?.(e.pointerId)) track.releasePointerCapture(e.pointerId);
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);

  const step = () => {
    const card = $('.card', track);
    return card ? card.getBoundingClientRect().width + 28 : track.clientWidth * 0.8;
  };
  $$('[data-rail]', sec).forEach((btn) => {
    btn.addEventListener('click', () => {
      track.scrollBy({ left: step() * (btn.dataset.rail === 'next' ? 1 : -1), behavior: 'smooth' });
    });
  });
}

/* ---------- Ending rain ---------- */
function setUpEnding() {
  if (reduce) return;
  const sec = $('[data-ending]');
  const canvas = $('[data-ending-rain]');
  if (!sec || !canvas) return;
  const rain = new Rain(canvas);
  const size = () => { const r = sec.getBoundingClientRect(); rain.size(r.width, r.height); };
  size();
  addEventListener('resize', size);
  whileVisible(sec, (t) => rain.draw(t, 0.55));
}

/* ---------- Form ---------- */
function setUpForm() {
  const form = $('[data-form]');
  if (!form) return;
  const send = $('[data-send]', form);
  const msg = $('[data-send-msg]');
  form.addEventListener('input', (e) => {
    e.target.removeAttribute('aria-invalid');
    if (msg) msg.textContent = '';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const missing = $$('[required]', form).filter(i => !i.value.trim());
    missing.forEach(i => i.setAttribute('aria-invalid', 'true'));
    if (missing.length) {
      msg.textContent = T('js.form.missing', 'Попълни името, телефона и града, за да ти се обадим.');
      missing[0].focus();
      return;
    }
    send.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    if (!STORE.requestUrl) {
      msg.textContent = T('js.form.offline', 'Още не е свързано. Обади се на {phone}.');
    } else {
      try {
        const res = await fetch(STORE.requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        msg.textContent = res.ok
          ? T('js.form.sent', 'Готово. Niko Stroi ще се обади за оглед.')
          : T('js.form.failed', 'Не мина. Обади се на {phone}.');
      } catch {
        msg.textContent = T('js.form.nonet', 'Няма връзка. Обади се на {phone}.');
      }
    }
    send.disabled = false;
  });
}

/* ---------- Boot ---------- */
const atParam = new URLSearchParams(location.search).get('at');
if (atParam !== null) {
  const goTo = () => scrollTo({ top: parseFloat(atParam) || 0, behavior: 'instant' });
  document.addEventListener('DOMContentLoaded', goTo);
  addEventListener('load', () => {
    goTo();
    const info = ['under', 'laying', 'work', 'survey'].map((id) => {
      const el = document.getElementById(id);
      if (!el) return id + '=none';
      const r = el.getBoundingClientRect();
      return `${id}@${Math.round(r.top + scrollY)}h${Math.round(r.height)}`;
    }).join(' ');
    document.title = `y=${Math.round(scrollY)} doc=${document.documentElement.scrollHeight} ${info}`;
  });
}
setUpReveal();
setUpBar();
setUpMenu();
setUpFilm().catch(() => {
  const stage = $('[data-hero-stage]');
  if (stage) stage.classList.add('is-still');
});
setUpUnder();
setUpLaying();
setUpWork();
setUpEnding();
setUpForm();
