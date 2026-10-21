const PLATES = ['.under', '.work', '.owner-sec', '.services', '.survey'];
const FRAMES = ['.under-pic', '.card-pic', '.owner-pic'];
const INNER = ['.steps-list', '.card-body', '.svc', '.form'];
const SCENE = { desk: 'assets/glass/river-desk', phone: 'assets/glass/river-phone' };
const MAX = 20;
const STRIDE = 256;
const FPS = 24;
const CLEAR = [1, 1, 1, 0];
const GOLD = [1.15, 0.92, 0.52, 1];
const ORANGE = [1.42, 0.6, 0.16, 1];
const VIOLET = [0.56, 0.38, 1.3, 1];

const SHADER = /* wgsl */ `
struct Frame { res: vec2f, scale: vec2f, time: f32, hdr: f32, reveal: f32, pad: f32, origin: vec2f, full: vec2f };
struct Panel { rect: vec4f, shape: vec4f, look: vec4f, tint: vec4f };
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var frosted: texture_2d<f32>;
@group(0) @binding(3) var<uniform> F: Frame;
@group(1) @binding(0) var<uniform> P: Panel;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

fn sceneUV(px: vec2f) -> vec2f { return 0.5 + ((px + F.origin) / F.full - 0.5) * F.scale; }
fn sharpAt(px: vec2f) -> vec3f { return textureSampleLevel(scene, samp, sceneUV(px), 0.0).rgb; }
fn frostAt(px: vec2f) -> vec3f { return textureSampleLevel(frosted, samp, sceneUV(px), 0.0).rgb; }

fn sdBox(p: vec2f, b: vec2f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2f(0.0))) - r;
}
fn sdGrad(p: vec2f, b: vec2f, r: f32) -> vec2f {
  let s = select(vec2f(-1.0), vec2f(1.0), p >= vec2f(0.0));
  let q = abs(p) - b + r;
  if (max(q.x, q.y) > 0.0) { return s * normalize(max(q, vec2f(1e-6))); }
  return s * select(vec2f(0.0, 1.0), vec2f(1.0, 0.0), q.x > q.y);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = pos.xy;
  if (P.look.x > 0.5) {
    let uv = px / F.res - 0.5;
    let vig = 1.0 - 0.45 * smoothstep(0.25, 0.85, length(uv * vec2f(1.0, 0.8)));
    let bg = sharpAt(px) * 0.8 * vig;
    let lum = dot(bg, vec3f(0.2126, 0.7152, 0.0722));
    let glint = smoothstep(0.55, 0.9, lum) * clamp((bg.r - bg.b) * 2.2, 0.0, 1.0);
    return vec4f(bg * (1.0 + F.hdr * 1.2 * glint) * F.reveal, 1.0);
  }
  let q = px - P.rect.xy;
  let bev = max(P.shape.y, 1.0);
  let d = sdBox(q, P.rect.zw, P.shape.x);
  let ins = 1.0 - smoothstep(-1.0, 1.0, d);
  let presence = P.shape.w * F.reveal;
  let sd = max(d, 0.0) / bev;
  let shadow = 0.6 * exp(-sd / 2.6) * (1.0 - smoothstep(3.0, 6.0, sd)) * (1.0 - ins) * presence;
  if (ins <= 0.002) { return vec4f(0.0, 0.0, 0.0, shadow); }

  let u = d + bev;
  let sq = sqrt(max(bev * bev - u * u, 0.0));
  var N = vec3f(0.0, 0.0, 1.0);
  if (u > 0.0) { N = normalize(vec3f(u * sdGrad(q, P.rect.zw, P.shape.x), sq)); }
  let edge = clamp(u / bev, 0.0, 1.0);
  let polish = smoothstep(0.02, 0.5, edge) * (1.0 - 0.6 * step(P.rect.z * 0.9, P.shape.y) * P.shape.z);

  let off = N.xy * bev * 0.9;
  let disp = 0.07 * edge;
  let sharp = vec3f(sharpAt(px + off * (1.0 - disp)).r, sharpAt(px + off).g, sharpAt(px + off * (1.0 + disp)).b);
  let frost = frostAt(px + off * 0.3);
  let z = P.shape.z;
  var inner = mix(sharp, frost, z * z) * mix(vec3f(1.0), vec3f(0.5, 0.48, 0.45), z * z);
  inner = mix(inner, inner * inner * (3.0 - 2.0 * inner), 0.35 * (1.0 - z));
  var body = mix(inner, sharp, polish);
  body = mix(body, body * P.tint.rgb + P.tint.rgb * P.look.z, P.tint.a);

  let fres = 0.04 + 0.96 * pow(1.0 - abs(N.z), 5.0);
  let env = sharpAt(px + N.xy * bev * 1.8) * 1.1;
  var col = mix(body, env, fres);

  let t = F.time * 0.06;
  let V = vec3f(0.0, 0.0, 1.0);
  let L1 = normalize(vec3f(-0.42 + 0.22 * sin(t), -0.55 + 0.14 * cos(t * 0.83), 0.72));
  let L2 = normalize(vec3f(0.55, 0.35, 0.76));
  let spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 220.0) * 1.25 + pow(max(dot(N, normalize(L2 + V)), 0.0), 90.0) * 0.45;
  let rim = pow(1.0 - abs(N.z), 2.2);
  let gold = vec3f(0.851, 0.714, 0.373);
  let goldHi = vec3f(0.969, 0.906, 0.706);
  col += rim * gold * 0.5;
  let leaf = 1.0 - smoothstep(0.0, 1.6, abs(d + 1.2));
  col = mix(col, goldHi, leaf * 0.5);

  let lum = dot(sharp, vec3f(0.2126, 0.7152, 0.0722));
  let goldness = clamp((sharp.r - sharp.b) * 2.2, 0.0, 1.0);
  let glint = smoothstep(0.6, 0.95, lum) * (0.35 + 0.65 * goldness) * mix(0.45, 1.0, polish);
  col = col * (1.0 + F.hdr * 1.6 * glint) + spec * goldHi * (1.0 + F.hdr * 2.0);
  col += (fract(sin(dot(floor(px), vec2f(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.01;

  let a = ins * presence;
  return vec4f(col * a, a + shadow * (1.0 - a));
}
`;

const BLUR = /* wgsl */ `
struct Dir { step: vec2f, pad: vec2f };
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var<uniform> D: Dir;
struct Out { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> Out {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: Out;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = vec2f(p[i].x * 0.5 + 0.5, 0.5 - p[i].y * 0.5);
  return o;
}
@fragment fn fs(o: Out) -> @location(0) vec4f {
  let w = array<f32, 5>(0.2270, 0.1945, 0.1216, 0.0541, 0.0162);
  var c = textureSampleLevel(src, samp, o.uv, 0.0).rgb * w[0];
  for (var k = 1; k < 5; k++) {
    let s = D.step * f32(k) * 1.5;
    c += (textureSampleLevel(src, samp, o.uv + s, 0.0).rgb + textureSampleLevel(src, samp, o.uv - s, 0.0).rgb) * w[k];
  }
  return vec4f(c, 1.0);
}
`;

const pickSet = () => (innerWidth <= 760 || innerHeight / innerWidth > 1.25 ? 'phone' : 'desk');

async function startGpu(canvas) {
  if (!navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  let format = 'rgba16float', hdr = 1;
  try {
    ctx.configure({ device, format, alphaMode: 'premultiplied', toneMapping: { mode: 'extended' } });
    const cfg = ctx.getConfiguration && ctx.getConfiguration();
    if (!cfg || !cfg.toneMapping || cfg.toneMapping.mode !== 'extended') hdr = 0;
  } catch {
    format = navigator.gpu.getPreferredCanvasFormat();
    hdr = 0;
    ctx.configure({ device, format, alphaMode: 'premultiplied' });
  }
  return { device, ctx, format, hdr };
}

export async function setUpGlass() {
  const plates = PLATES.map((s) => document.querySelector(s)).filter(Boolean);
  if (!plates.length) { document.documentElement.classList.remove('glass-wait'); return; }
  const root = document.documentElement;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const canvas = document.createElement('canvas');
  canvas.className = 'glass-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const gpu = await startGpu(canvas).catch(() => null);
  if (!gpu) { canvas.remove(); root.classList.remove('glass-wait'); root.classList.add('glass-css'); return; }
  const { device, format, hdr } = gpu;
  let lastError = '';
  device.addEventListener('uncapturederror', (e) => { lastError = e.error.message; console.warn('glass:', lastError); });

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const glassMod = device.createShaderModule({ code: SHADER });
  const blurMod = device.createShaderModule({ code: BLUR });
  const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } };
  const frameLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: {} }] });
  const panelLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { hasDynamicOffset: true } }] });
  const glassPipe = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout, panelLayout] }),
    vertex: { module: glassMod, entryPoint: 'vs' },
    fragment: { module: glassMod, entryPoint: 'fs', targets: [{ format, blend }] },
    primitive: { topology: 'triangle-list' } });
  const blurPipe = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: blurMod, entryPoint: 'vs' },
    fragment: { module: blurMod, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list' } });
  const dirH = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const dirV = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const layers = [];
  const scenes = new Map();
  let dirty = true, pageVisible = false, raf = 0, renders = 0, chat = null, chatFull = false;

  function bindFrame(L) {
    const S = L.scene;
    if (!S || !S.tex) { L.frameGroup = null; return; }
    L.frameGroup = device.createBindGroup({ layout: frameLayout, entries: [
      { binding: 0, resource: sampler }, { binding: 1, resource: S.tex.createView() },
      { binding: 2, resource: S.blurA.createView() }, { binding: 3, resource: { buffer: L.frameBuf } }] });
  }

  function makeLayer(el, ctx, collect, pick) {
    const panelBuf = device.createBuffer({ size: STRIDE * MAX, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const L = { canvas: el, ctx, collect, pick, scene: null, on: true, n: 0, dpr: 1, w: 1, h: 1, revealAt: 0, rendered: 0,
      frameBuf: device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }), origin: [0, 0], full: null,
      panelBuf, panelGroup: device.createBindGroup({ layout: panelLayout, entries: [{ binding: 0, resource: { buffer: panelBuf, size: 64 } }] }),
      frameGroup: null, frameData: new Float32Array(12), panelData: new Float32Array((STRIDE / 4) * MAX), scissors: new Int32Array(MAX * 4) };
    layers.push(L);
    return L;
  }

  function targets(S, w, h) {
    if (w === S.w && h === S.h) return;
    S.w = w; S.h = h;
    for (const t of [S.tex, S.blurA, S.blurB]) if (t) t.destroy();
    const usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST;
    S.tex = device.createTexture({ size: [w, h], format: 'rgba8unorm', usage });
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    S.blurA = device.createTexture({ size: [bw, bh], format: 'rgba8unorm', usage });
    S.blurB = device.createTexture({ size: [bw, bh], format: 'rgba8unorm', usage });
    device.queue.writeBuffer(S.dirH, 0, new Float32Array([1 / bw, 0, 0, 0]));
    device.queue.writeBuffer(S.dirV, 0, new Float32Array([0, 1 / bh, 0, 0]));
    const bl = blurPipe.getBindGroupLayout(0);
    S.blurGroups = [
      device.createBindGroup({ layout: bl, entries: [{ binding: 0, resource: sampler }, { binding: 1, resource: S.tex.createView() }, { binding: 2, resource: { buffer: S.dirH } }] }),
      device.createBindGroup({ layout: bl, entries: [{ binding: 0, resource: sampler }, { binding: 1, resource: S.blurB.createView() }, { binding: 2, resource: { buffer: S.dirV } }] }),
      device.createBindGroup({ layout: bl, entries: [{ binding: 0, resource: sampler }, { binding: 1, resource: S.blurA.createView() }, { binding: 2, resource: { buffer: S.dirH } }] })];
    layers.forEach((L) => { if (L.scene === S) bindFrame(L); });
  }

  function getScene(key) {
    let S = scenes.get(key);
    if (S) return S;
    if (key.startsWith('hero-')) {
      const v = heroPlates[+key.slice(5)];
      const still = new Image();
      still.decoding = 'async';
      const ub0 = () => device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      S = { key, video: v, external: true, still, tex: null, blurA: null, blurB: null, blurGroups: null, w: 0, h: 0, lastVt: -1, ready: false, dirty: false, dirH: ub0(), dirV: ub0() };
      still.onload = () => {
        if (S.ready) return;
        targets(S, still.naturalWidth, still.naturalHeight);
        device.queue.copyExternalImageToTexture({ source: still }, { texture: S.tex }, [S.w, S.h]);
        S.ready = true; S.dirty = true; kick();
      };
      if (v && v.poster) still.src = v.poster;
      scenes.set(key, S);
      return S;
    }
    const video = document.createElement('video');
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    video.className = 'glass-source';
    document.body.append(video);
    video.addEventListener('playing', () => kick());
    video.addEventListener('loadeddata', () => kick());
    const still = new Image();
    still.decoding = 'async';
    const ub = () => device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    S = { key, video, still, tex: null, blurA: null, blurB: null, blurGroups: null, w: 0, h: 0, lastVt: -1, ready: false, dirty: false, dirH: ub(), dirV: ub(), url: null, fetching: false };
    still.onload = () => {
      if (S.ready) return;
      targets(S, still.naturalWidth, still.naturalHeight);
      device.queue.copyExternalImageToTexture({ source: still }, { texture: S.tex }, [S.w, S.h]);
      S.ready = true; S.dirty = true; kick();
    };
    still.src = SCENE[key] + '.webp';
    scenes.set(key, S);
    return S;
  }

  function fetchClip(S) {
    if (S.external || S.url || S.fetching || saveData) return;
    S.fetching = true;
    fetch(SCENE[S.key] + '.mp4', { priority: 'low' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((ab) => { S.url = URL.createObjectURL(new Blob([ab], { type: 'video/mp4' })); })
      .catch(() => { S.url = SCENE[S.key] + '.mp4'; })
      .then(() => { S.fetching = false; syncPlay(); });
  }

  function pull(S) {
    const v = S.video;
    if (!v || (saveData && !S.external) || v.readyState < 2 || !v.videoWidth) return;
    const vt = Math.floor(v.currentTime * FPS);
    if (vt === S.lastVt) return;
    S.lastVt = vt;
    targets(S, v.videoWidth, v.videoHeight);
    device.queue.copyExternalImageToTexture({ source: v }, { texture: S.tex }, [S.w, S.h]);
    S.ready = true; S.dirty = true;
  }

  function blurPass(enc, group, target) {
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }] });
    pass.setPipeline(blurPipe);
    pass.setBindGroup(0, group);
    pass.draw(3);
    pass.end();
  }

  function push(L, l, t, r, b, rad, bev, frost, mode, clip, tint, glow) {
    if (L.n >= MAX || r - l < 4 || b - t < 4) return;
    const W = L.w / L.dpr, H = L.h / L.dpr, m = bev * 6;
    if (b < -m || t > H + m || r < -m || l > W + m) return;
    let cx0 = l - m, cy0 = t - m, cx1 = r + m, cy1 = b + m;
    if (clip) { cx0 = Math.max(cx0, clip[0]); cy0 = Math.max(cy0, clip[1]); cx1 = Math.min(cx1, clip[2]); cy1 = Math.min(cy1, clip[3]); }
    const d = L.dpr;
    const x0 = Math.max(0, Math.floor(cx0 * d)), y0 = Math.max(0, Math.floor(cy0 * d));
    const x1 = Math.min(L.w, Math.ceil(cx1 * d)), y1 = Math.min(L.h, Math.ceil(cy1 * d));
    if (x1 <= x0 || y1 <= y0) return;
    const o = L.n * (STRIDE / 4), hw = (r - l) / 2, hh = (b - t) / 2, p = L.panelData;
    p[o] = (l + hw) * d; p[o + 1] = (t + hh) * d; p[o + 2] = hw * d; p[o + 3] = hh * d;
    p[o + 4] = Math.min(rad, hw, hh) * d; p[o + 5] = bev * d; p[o + 6] = frost; p[o + 7] = 1;
    p[o + 8] = mode; p[o + 9] = 0; p[o + 10] = glow || 0; p[o + 11] = 0;
    const c = tint || CLEAR;
    p[o + 12] = c[0]; p[o + 13] = c[1]; p[o + 14] = c[2]; p[o + 15] = c[3];
    const s = L.scissors, k = L.n * 4;
    s[k] = x0; s[k + 1] = y0; s[k + 2] = x1 - x0; s[k + 3] = y1 - y0;
    L.n++;
  }

  const insets = new Map();
  function measureInsets() {
    for (const el of plates) {
      const cs = getComputedStyle(el, '::after');
      insets.set(el, [parseFloat(cs.top) || 0, parseFloat(cs.right) || 0, parseFloat(cs.bottom) || 0, parseFloat(cs.left) || 0, parseFloat(cs.borderTopLeftRadius) || 0]);
    }
  }

  function collectPage(L) {
    const small = innerWidth <= 860;
    for (const el of plates) {
      const r = el.getBoundingClientRect(), k = insets.get(el) || [0, 0, 0, 0, 20];
      push(L, r.left + k[3], r.top + k[0], r.right - k[1], r.bottom - k[2], k[4], small ? 12 : 18, 0.3, 0, null);
    }
    for (const sel of INNER) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        push(L, r.left, r.top, r.right, r.bottom, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8, small ? 7 : 9, 1, 0, null);
      }
    }
    for (const sel of FRAMES) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        push(L, r.left, r.top, r.right, r.bottom, 12, parseFloat(getComputedStyle(el).borderTopWidth) || 12, 0.35, 0, null);
      }
    }
  }

  function collectChat(L) {
    const cr = L.canvas.getBoundingClientRect();
    push(L, 0, 0, cr.width, cr.height, 0, 1, 0, 1, null);
    const box = L.root.querySelector('.msgs');
    const mr = box && box.getBoundingClientRect();
    const clip = mr ? [mr.left - cr.left, mr.top - cr.top, mr.right - cr.left, mr.bottom - cr.top] : null;
    for (const el of L.root.querySelectorAll('[data-glass]')) {
      const r = el.getBoundingClientRect(), kind = el.getAttribute('data-glass');
      const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const inBox = box && box.contains(el);
      push(L, r.left - cr.left, r.top - cr.top, r.right - cr.left, r.bottom - cr.top, rad,
        kind === 'clear' ? 5 : 8, kind === 'clear' ? 0.3 : kind === 'gold' ? 0.8 : 1, 0, inBox ? clip : null, kind === 'gold' ? GOLD : null, 0.08);
    }
  }

  function size(L) {
    L.dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(L.canvas.clientWidth * L.dpr)), h = Math.max(1, Math.round(L.canvas.clientHeight * L.dpr));
    if (L.canvas.width !== w || L.canvas.height !== h) { L.canvas.width = w; L.canvas.height = h; }
    L.w = w; L.h = h;
  }

  function active(L) { return L === page ? pageVisible && !chatFull : L === hero ? heroVisible && !chatFull : L.on; }

  function assign() {
    for (const L of layers) {
      if (!active(L)) continue;
      const S = getScene(L.pick(L));
      if (L.scene !== S) { const first = !L.scene; L.scene = S; bindFrame(L); if (first) L.revealAt = 0; }
    }
  }

  function syncPlay() {
    assign();
    const used = new Set(layers.filter(active).map((L) => L.scene).filter(Boolean));
    for (const S of scenes.values()) {
      if (S.external) continue;
      if (used.has(S) && !saveData && !document.hidden) {
        if (!S.url) { fetchClip(S); continue; }
        if (S.video.getAttribute('src') !== S.url) { S.video.src = S.url; S.video.load(); }
        const r = S.video.play(); if (r && r.catch) r.catch(() => {});
      } else S.video.pause();
    }
  }

  function render(now) {
    raf = 0;
    if (document.hidden) return;
    const live = layers.filter(active);
    if (!live.length) return;
    assign();
    const used = [...new Set(live.map((L) => L.scene))];
    let playing = false;
    for (const S of used) { pull(S); if (S.video && !S.video.paused) playing = true; }
    if (playing) kick();
    const ready = live.filter((L) => L.scene.ready && L.frameGroup);
    if (!ready.length) return;
    let fading = false;
    for (const L of ready) { if (!L.revealAt) L.revealAt = now; if (now - L.revealAt < 600) fading = true; }
    if (!fading && !dirty && !used.some((S) => S.dirty)) return;
    const enc = device.createCommandEncoder();
    for (const S of used) {
      if (!S.dirty || !S.blurGroups) continue;
      blurPass(enc, S.blurGroups[0], S.blurB);
      blurPass(enc, S.blurGroups[1], S.blurA);
      blurPass(enc, S.blurGroups[2], S.blurB);
      blurPass(enc, S.blurGroups[1], S.blurA);
      S.dirty = false;
    }
    for (const L of ready) {
      size(L);
      L.n = 0;
      L.collect(L);
      const reveal = Math.min(1, (now - L.revealAt) / 600);
      const fw = L.full ? L.full[0] : L.w, fh = L.full ? L.full[1] : L.h;
      const va = fw / fh, sa = L.scene.w / L.scene.h, f = L.frameData;
      f[0] = L.w; f[1] = L.h; f[2] = Math.min(1, va / sa); f[3] = Math.min(1, sa / va);
      f[8] = L.origin[0]; f[9] = L.origin[1]; f[10] = fw; f[11] = fh;
      f[4] = now / 1000; f[5] = hdr; f[6] = reveal * reveal * (3 - 2 * reveal);
      device.queue.writeBuffer(L.frameBuf, 0, f);
      device.queue.writeBuffer(L.panelBuf, 0, L.panelData, 0, (STRIDE / 4) * Math.max(1, L.n));
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: L.ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
      pass.setPipeline(glassPipe);
      pass.setBindGroup(0, L.frameGroup);
      for (let i = 0; i < L.n; i++) {
        pass.setScissorRect(L.scissors[i * 4], L.scissors[i * 4 + 1], L.scissors[i * 4 + 2], L.scissors[i * 4 + 3]);
        pass.setBindGroup(1, L.panelGroup, [i * STRIDE]);
        pass.draw(3);
      }
      pass.end();
      L.rendered++;
      if (L.onFirst && L.rendered === 1) L.onFirst();
    }
    device.queue.submit([enc.finish()]);
    dirty = false; renders++;
    if (!root.classList.contains('has-glass') && ready.includes(page)) root.classList.add('has-glass');
    if (fading) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(render); }
  const touch = () => { dirty = true; kick(); };

  const page = makeLayer(canvas, gpu.ctx, collectPage, () => pickSet());
  const stage = document.querySelector('[data-hero-stage]');
  const heroPlates = stage ? [...stage.querySelectorAll('[data-hero-plate]')] : [];
  let hero = null, heroVisible = false;
  function collectHero(L) {
    const cr = L.canvas.getBoundingClientRect();
    for (const el of stage.querySelectorAll('.hero-ctas .btn, .vb-btn')) {
      const r = el.getBoundingClientRect();
      if (r.width < 4) continue;
      const l = r.left - cr.left, t = r.top - cr.top, rr = r.right - cr.left, b = r.bottom - cr.top;
      if (el.classList.contains('vb-btn')) push(L, l, t, rr, b, r.width / 2, r.width * 0.49, 0.6, 0, null, VIOLET, 0.34);
      else if (el.classList.contains('btn-accent')) push(L, l, t, rr, b, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 6, 7, 0.8, 0, null, ORANGE, 0.4);
      else push(L, l, t, rr, b, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 6, 7, 0.9, 0, null, CLEAR, 0);
    }
  }
  if (stage && heroPlates.length && !root.classList.contains('glass-off')) {
    root.classList.add('glass-up');
    const hc = document.createElement('canvas');
    hc.className = 'hero-glass';
    hc.setAttribute('aria-hidden', 'true');
    const shade = stage.querySelector('.hero-shade');
    if (shade) shade.after(hc); else stage.prepend(hc);
    const hctx = hc.getContext('webgpu');
    hctx.configure(hdr ? { device, format, alphaMode: 'premultiplied', toneMapping: { mode: 'extended' } } : { device, format, alphaMode: 'premultiplied' });
    hero = makeLayer(hc, hctx, collectHero, () => { let k = 0; heroPlates.forEach((v, i) => { if ((parseFloat(v.style.opacity) || (i ? 0 : 1)) > 0.5) k = i; }); return 'hero-' + k; });
    hero.onFirst = () => { root.classList.add('has-hero-glass'); root.classList.remove('glass-wait'); };
    const row = stage.querySelector('.hero-ctas');
    const place = () => {
      if (!row) return;
      const sr = stage.getBoundingClientRect(), rr = row.getBoundingClientRect(), m = 28;
      const l = Math.max(0, rr.left - sr.left - m), t = Math.max(0, rr.top - sr.top - m);
      const w = Math.min(sr.width - l, rr.width + 2 * m), h = Math.min(sr.height - t, rr.height + 2 * m);
      Object.assign(hc.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
      const d = Math.min(2, devicePixelRatio || 1);
      hero.origin = [l * d, t * d];
      hero.full = [Math.round(sr.width * d), Math.round(sr.height * d)];
      touch();
    };
    const pro = new ResizeObserver(place);
    pro.observe(stage);
    if (row) pro.observe(row);
    place();
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; syncPlay(); touch(); }).observe(stage);
    new ResizeObserver(touch).observe(hc);
  } else root.classList.remove('glass-wait');

  addEventListener('iqbot:glass', (e) => {
    const d = e.detail;
    if (!d || !d.canvas) return;
    if (!chat) {
      const ctx = d.canvas.getContext('webgpu');
      if (!ctx) return;
      ctx.configure(hdr ? { device, format, alphaMode: 'premultiplied', toneMapping: { mode: 'extended' } } : { device, format, alphaMode: 'premultiplied' });
      chat = makeLayer(d.canvas, ctx, collectChat, (L) => (L.canvas.clientHeight > L.canvas.clientWidth * 1.15 ? 'phone' : 'desk'));
      chat.root = d.root;
      chat.onFirst = () => d.panel.classList.add('gpu');
      new MutationObserver(touch).observe(d.root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
      d.root.addEventListener('scroll', touch, { capture: true, passive: true });
      new ResizeObserver(() => { syncPlay(); touch(); }).observe(d.canvas);
    }
    chat.on = !!d.open;
    chatFull = chat.on && d.panel.classList.contains('full');
    if (chat.on) chat.revealAt = 0;
    d.claimed = true;
    syncPlay(); touch();
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.__glassOn = e.isIntersecting;
    pageVisible = plates.some((el) => el.__glassOn);
    syncPlay(); touch();
  }, { rootMargin: '20% 0px' });
  plates.forEach((el) => io.observe(el));
  addEventListener('scroll', touch, { passive: true });
  let resizeTimer = 0;
  new ResizeObserver(() => {
    measureInsets(); touch();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(syncPlay, 160);
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => { syncPlay(); touch(); });
  for (const ev of ['pointerdown', 'touchstart', 'keydown']) addEventListener(ev, () => syncPlay(), { passive: true });
  device.lost.then(() => {
    root.classList.remove('has-glass', 'has-hero-glass', 'glass-wait'); root.classList.add('glass-off'); canvas.remove();
    document.querySelectorAll('canvas.hero-glass').forEach((c) => c.remove());
    for (const S of scenes.values()) { S.video.remove(); if (S.url && S.url.startsWith('blob:')) URL.revokeObjectURL(S.url); }
    const p = chat && chat.canvas.closest('.panel');
    if (p) p.classList.remove('gpu');
  });

  measureInsets();
  syncPlay();
  const prefetch = () => fetchClip(getScene(pickSet()));
  const lead = heroPlates[0];
  if (lead && lead.readyState < 4) { lead.addEventListener('canplaythrough', prefetch, { once: true }); setTimeout(prefetch, 8000); } else setTimeout(prefetch, 1500);
  if (new URLSearchParams(location.search).has('probe')) {
    window.__glass = { probe: () => ({ hdr, format, err: lastError, has: root.classList.contains('has-glass'), visible: pageVisible, renders,
      page: { scene: page.scene && page.scene.key, n: page.n, canvas: [page.w, page.h] },
      chat: chat ? { on: chat.on, full: chatFull, scene: chat.scene && chat.scene.key, n: chat.n, rendered: chat.rendered, canvas: [chat.w, chat.h] } : null,
      scenes: [...scenes.values()].map((S) => ({ key: S.key, ready: S.ready, dim: [S.w, S.h], playing: !S.video.paused, t: +S.video.currentTime.toFixed(2), fetched: !!S.url, fetching: !!S.fetching })) }) };
  }
}

setUpGlass().catch((e) => {
  console.warn('glass:', e && e.message ? e.message : e);
  const root = document.documentElement;
  root.classList.remove('has-glass', 'has-hero-glass', 'glass-wait');
  root.classList.add('glass-off');
  document.querySelectorAll('canvas.hero-glass').forEach((c) => c.remove());
});
