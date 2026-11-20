/* Cairn Motors concept: one master loop drives the hero, the fold and every pinned scene. */
const $ = id => document.getElementById(id);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
/* simple filled icons for the Promise card: repair, terrain, open sky, lasting */
const PR_IC = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path transform="translate(12 12) scale(.86) translate(-12 -12)" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.8 20.2 9 5.2l4.4 8.6 2.9-4.6 5.9 11z"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.4"/>' + [0,45,90,135,180,225,270,315].map(a => `<rect x="10.9" y="1.6" width="2.2" height="3.6" rx="1.1" transform="rotate(${a} 12 12)"/>`).join("") + '</svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" d="M12 12c-2-2.7-3.7-4.4-6.1-4.4a4.4 4.4 0 0 0 0 8.8c2.4 0 4.1-1.7 6.1-4.4s3.7-4.4 6.1-4.4a4.4 4.4 0 0 1 0 8.8c-2.4 0-4.1-1.7-6.1-4.4z"/></svg>'
];

/* ---------- smooth scroll + anchors ---------- */
const lenis = (!reduce && window.Lenis) ? new Lenis({ lerp: .14, smoothWheel: true, wheelMultiplier: 1 }) : null;
window.__lenis = lenis;
const goto = y => lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: "smooth" });
$$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
  const id = a.getAttribute("href").slice(1), el = id === "top" ? null : $(id);
  e.preventDefault();
  if (navEl.classList.contains("open")) navOpen(false);
  goto(el ? el.getBoundingClientRect().top + scrollY : 0);
}));
const prog = el => clamp(-el.getBoundingClientRect().top / Math.max(1, el.offsetHeight - innerHeight));

/* ---------- nav pill (Waabi style): opens downward, shows the current section ---------- */
const navEl = $("nav"), bnDim = $("bnDim"), bnMenu = $("bnMenu"), bnMl = bnMenu.querySelector(".bn-ml");
function navOpen(v){
  navEl.classList.toggle("open", v); bnDim.classList.toggle("on", v); bnMenu.setAttribute("aria-expanded", v);
  bnMl.style.opacity = 0; setTimeout(() => { bnMl.textContent = v ? "Close" : "Menu"; bnMl.style.opacity = 1; }, 200);
}
bnMenu.addEventListener("click", () => navOpen(!navEl.classList.contains("open")));
bnDim.addEventListener("click", () => navOpen(false));
addEventListener("keydown", e => { if (e.key === "Escape" && navEl.classList.contains("open")) navOpen(false); });
const navNames = [["seq", "Departure"], ["origin", "Origin"], ["promise", "Promise"], ["machine2", "Machine"], ["hands", "Hands"], ["proof", "Proof"], ["company", "Company"], ["reserve", "Return"]];
let navCur = "";
const NL = $("nlab"); let nlName = "";
function labelTick(){
  const sH = Math.round(Math.min(58, Math.max(38, innerWidth * .031)));
  let act = null;
  for (const s of seams){
    const id = s.sec.id;
    const on = id === "promise" ? promiseE > .25 : s.container.getBoundingClientRect().top <= sH * .8;
    if (on) act = s;
  }
  if (!act){ NL.style.opacity = 0; nlName = ""; return; }
  let name = act.sec.dataset.seam;
  if (act.sec.id === "origin" && hzRx > hzC.offsetLeft + vw * .55) name = "Founded";
  if (name !== nlName){
    nlName = name; NL.firstElementChild.textContent = name;
    NL.classList.remove("sw"); void NL.offsetWidth; NL.classList.add("sw");
  }
  NL.style.color = act.sec.dataset.lc || "#fff";
  const pinned = !!act.stage, top = act.container.getBoundingClientRect().top;
  const y = pinned ? 0 : Math.min(0, top);
  NL.style.opacity = y < -sH ? 0 : 1;
  NL.style.transform = `translate3d(${labelX}px,${y}px,0) translateX(-50%)`;
}
function navTick(){
  let name = "Departure";
  for (const [id, n] of navNames){
    /* Promise sits under Origin, so it only becomes "current" once Origin has lifted away */
    const t = id === "promise" ? $("origin").getBoundingClientRect().bottom - innerHeight : $(id).getBoundingClientRect().top;
    if (t <= innerHeight * (id === "promise" ? -.4 : .5)) name = n;
  }
  if (name !== navCur){ navCur = name; $("navHere").textContent = name; $$(".bn-links a").forEach(a => a.classList.toggle("on", a.dataset.n === name)); }
}

/* ---------- 01 hero: scroll-scrubbed frames ---------- */
/* 4 = camp at dusk: the yellow jeep drives in, the camera swings to the front and it reverses in beside the red jeep (default); ?hero=3 dusk trail, ?hero=2 previous trail clip */
const HERO = ({ "1": 1, "2": 2, "3": 3, "4": 4 })[new URLSearchParams(location.search).get("hero")] || 5;   /* 5 = looping lake-camp film (plays on its own) */
const FRAMES = HERO === 4 ? 361 : 193;
const cv = $("cv"), ctx = cv.getContext("2d", { alpha: false });
/* foreground layer: the same frame, cut to the mountain only, drawn ABOVE the title so the title sits behind it */
const cvf = $("cvf"), fctx = cvf.getContext("2d");
/* two hero footage options: default = coast road (title behind the mountain); ?hero=2 = hill trail, Jeep coming straight at you (title in front) */
document.body.dataset.hero = HERO;
const MASKS = 73, masks = new Array(MASKS); let maskDone = HERO !== 1 ? MASKS : 0;
if (HERO !== 1) cvf.style.display = "none";
else for (let i = 0; i < MASKS; i++){ const m = new Image(); m.src = `mask/${String(i).padStart(4, "0")}.webp`; m.decode().then(() => { masks[i] = m; maskDone++; shown = -1; tryStart(); }, () => { maskDone++; tryStart(); }); }
let fgOn = false;
const src = i => `frames-o${HERO}/${String(i).padStart(4, "0")}.webp`;
const imgs = new Array(FRAMES);
let cw = 0, ch = 0, shown = -1;
function size(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cw = cv.width = cvf.width = Math.round(cv.clientWidth * dpr);
  ch = cv.height = cvf.height = Math.round(cv.clientHeight * dpr);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  shown = -1;
}
function nearest(i){
  if (imgs[i]) return i;
  for (let d = 1; d < FRAMES; d++){ if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
  return -1;
}
function draw(i){
  const n = nearest(i);
  if (n < 0 || n === shown) return;
  const im = imgs[n], s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
  const w = im.naturalWidth * s, h = im.naturalHeight * s;
  ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  let mi = Math.min(n, MASKS - 1); while (mi > 0 && !masks[mi]) mi--;
  if (n < MASKS && masks[mi]){
    fctx.globalCompositeOperation = "source-over"; fctx.clearRect(0, 0, cw, ch);
    fctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    fctx.globalCompositeOperation = "destination-in";
    fctx.drawImage(masks[mi], (cw - w) / 2, (ch - h) / 2, w, h);
    fctx.globalCompositeOperation = "source-over"; fgOn = true;
  } else if (fgOn){ fctx.clearRect(0, 0, cw, ch); fgOn = false; }
  shown = n;
}
const order = [], seen = new Set();
for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < FRAMES; i += step) if (!seen.has(i)){ seen.add(i); order.push(i); }
const START_AFTER = 25;
let done = 0, cursor = 0, started = false;
function tryStart(){ if (!started && done >= START_AFTER && maskDone >= MASKS){ started = true; $("load").classList.add("done"); shown = -1; } }
function nextFrame(){
  if (cursor >= order.length) return;
  const i = order[cursor++], im = new Image();
  im.src = src(i);
  const fin = ok => {
    if (ok) imgs[i] = im;
    done++;
    $("loadBar").style.transform = `scaleX(${Math.min(1, done / START_AFTER)})`;
    tryStart();
    nextFrame();
  };
  im.decode().then(() => fin(true), () => fin(false));
}
if (HERO === 5){
  /* the film plays on its own, so no frames to scrub: it only has to be ready to play */
  const hv = $("hv"); cv.style.display = "none"; hv.style.display = "block";
  hv.src = "hero-film.mp4?v=3"; hv.muted = true;
  const go = () => { if (!started){ started = true; $("load").classList.add("done"); hv.play().catch(() => {}); } };
  hv.addEventListener("canplay", go, { once: true }); setTimeout(go, 6000);
} else for (let k = 0; k < 8; k++) nextFrame();

function block(el, p, a, b, c, d){
  const on = ss(a, b, p), off = c < 1 ? ss(c, d, p) : 0, o = on * (1 - off);
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o < .01 ? "hidden" : "visible";
  el.style.translate = `0 ${((1 - on) * 28 - off * 28).toFixed(1)}px`;
  return o;
}
const seq = $("seq"), dkLines = $$("#dkt .ln > span");
const hhH = $$(".hh-h"), hpP = $$("#hp p");
function splitWords(el){
  const lines = el.querySelectorAll(".hl, .ml > span, .ln > span");
  const groups = lines.length ? [...lines] : [el];
  groups.forEach(g => {
    let k = 0;
    const walk = n => [...n.childNodes].forEach(ch => {
      if (ch.nodeType === 3){
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement("span"); s.className = "w"; s.style.setProperty("--wi", k++); s.textContent = part; frag.appendChild(s);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && !ch.classList.contains("w") && ch.tagName !== "BR") walk(ch);
    });
    walk(g);
  });
  el.classList.add("wr");
}
hhH.forEach(splitWords);
const HH_SEG = [[0, .42], [.42, .84]];
hpP.forEach(p => { p.innerHTML = p.textContent.trim().split(/\s+/).map(w => `<span class="dw">${w}</span>`).join(" "); });
const HEADS = $$(".hz-a h2, .hz-c .fh, .m2-h, .hd-title, .pf-head h2, .co-title, .rt-h, #dkt");
HEADS.forEach(splitWords);
function headTick(){
  const vh = innerHeight, vw = innerWidth;
  for (const h of HEADS){
    if (h.id === "dkt") continue;
    const r = h.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    if (!h._g || h._gw !== vw){
      h._gw = vw;
      h._w = [...h.querySelectorAll(".w")];
      h._w.forEach(w => { w.style.translate = ""; });
      h._fs = parseFloat(getComputedStyle(h).fontSize);
      const ls = [...h.querySelectorAll(".ml > span, .ln > span")];
      const tops = ls.map(l => Math.round(l.getBoundingClientRect().top / (h._fs * .5)));
      h._l = ls.length > 1 && new Set(tops).size > 1 ? ls : [];   /* lines stacked one under another drift; side-by-side ones do not */
      if (h._l.length) h._g = h._l.map(l => [...l.querySelectorAll(".w")]);
      else {                                                       /* one row, or text that wraps by itself: group words by the row they sit on */
        const rows = new Map();
        h._w.forEach(w => { const t = Math.round(w.getBoundingClientRect().top / (h._fs * .5)); if (!rows.has(t)) rows.set(t, []); rows.get(t).push(w); });
        h._g = [...rows.values()];
      }
    }
    /* how far the title still has to come: from the lower half of the screen, or (on Origin's sideways slides) from the right */
    const k = Math.max(clamp((r.top + r.height / 2) / vh - .5, 0, .5), h.closest(".hz") ? clamp(r.left / vw - .08, 0, .5) : 0) * 2;
    const em = h._fs;
    const d = k * .2 * em, g = k * .2 * em;                    /* the same feel at every size, set by "Meet the owners" */
    h._l.forEach((l, i) => { l.style.setProperty("--lx", (i % 2 ? -d : d).toFixed(1) + "px"); });
    h._g.forEach(ws => ws.forEach((w, i) => { w.style.translate = i ? `${(i * g).toFixed(1)}px 0` : ""; }));
  }
}
const headIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add("on"); headIO.unobserve(e.target); } }), { threshold: .35 });
HEADS.filter(h => !["dkt"].includes(h.id) && !h.classList.contains("hd-title")).forEach(h => headIO.observe(h));
let hhIdx = 0;
let cur = 0;
function heroTick(){
  const range = seq.offsetHeight - innerHeight * 3;
  const target = clamp(-seq.getBoundingClientRect().top / range);
  cur += (target - cur) * (reduce ? 1 : .22);
  if (Math.abs(target - cur) < .00005) cur = target;
  /* hero 4: the film finishes as the second title leaves, so the jeep is parked just as the dark Grip screen comes in */
  if (HERO !== 5) draw(Math.round((HERO === 4 ? clamp(cur / .9) : cur) * (FRAMES - 1)));
  /* opening title: bold and still, hidden for good by the mountain, then it also drifts and fades out */
  /* waabi.ai: each heading owns one stretch of the scroll. It starts low and climbs while its two lines drift apart sideways;
     the description words light up one by one, then dim again before the next heading takes over. The last one rises off the top. */
  hhH.forEach((h, k) => {
    const a = HH_SEG[k][0], b = HH_SEG[k][1], last = k === HH_SEG.length - 1;
    let u = (cur - a) / (b - a), vis = u >= 0 && (u < 1 || last);
    const y = lerp(0, -68, clamp(u));                        /* from the middle of the screen up and out of the top; no fade */
    vis = u >= 0 && u < 1; h.style.opacity = vis ? 1 : 0;
    h.style.transform = `translate3d(0,${y.toFixed(2)}vh,0)`;
    const sx = clamp(u, 0, 1.6) * 3;
    h._l = h._l || h.querySelectorAll(".hl");
    h._l[0].style.transform = `translate3d(${sx.toFixed(2)}vw,0,0)`; h._l[1].style.transform = `translate3d(${(-sx).toFixed(2)}vw,0,0)`;
    const p = hpP[k]; p._w = p._w || p.querySelectorAll(".dw");
    p.style.opacity = u >= 0 && u < 1 ? 1 : 0;   /* on from the start of its heading until the heading has gone */
  });
  $("sLeft").style.opacity = 0;
  const fA = HERO === 4 ? .82 : .7, fB = HERO === 4 ? .96 : .95;
  $("fade").style.opacity = ss(fA, fB, cur).toFixed(3);
  cv.style.filter = cvf.style.filter = $("hv").style.filter = `brightness(${(1 - ss(HERO >= 4 ? .6 : .55, .9, cur) * (HERO >= 4 ? .3 : .35)).toFixed(3)})`;
  /* the dark moment: lines sit mid-screen and drift upward as you scroll */
  /* one big centred block rises the whole way, from below the screen to above it */
  /* the dark screen is exactly ONE viewport: it is the last screen of scrolling inside the hero. Title at the top, copy and button at the bottom, both drifting up while you scroll. */
  const held = clamp((-seq.getBoundingClientRect().top - range) / innerHeight, 0, 2), din = ss(.9, 1, cur);
  const dkt = $("dkt"), dkb = $("dkb"), vh = innerHeight;
  if (!dkt.classList.contains("on")) dkt.classList.add("on");
  /* rise in from below with the scroll, then keep climbing */
  const rise = (1 - din) * .45 * vh;
  let tY = rise - held * .24 * vh; const bY = rise - held * .34 * vh;
  /* Origin's top edge: the button keeps 48px clear of it; everything is pushed up together if needed */
  const oTop = $("origin").getBoundingClientRect().top;
  const bR = dkb.getBoundingClientRect(), tR = dkt.getBoundingClientRect();
  const bNat = bR.bottom - (dkb._ty || 0), tNat = tR.top - (dkt._ty || 0), tBotNat = tR.bottom - (dkt._ty || 0), cTopNat = bR.top - (dkb._ty || 0);
  /* the copy hands over to Origin's pace gradually (a soft minimum), so there is no jolt when Origin starts pushing it up */
  const room = oTop - 24 - (bNat + bY), sk = 160, sh = Math.max(sk - Math.abs(room), 0) / sk;
  const push = Math.min(0, room) - sh * sh * sk / 4;
  tY = Math.min(tY, (cTopNat + bY) - 48 - tBotNat);          /* never closer than 48px to the copy */
  const T = tY + push, B = bY + push;
  dkt.style.translate = `0 ${T.toFixed(1)}px`; dkb.style.translate = `0 ${B.toFixed(1)}px`; dkb._ty = B;
  /* fade as the block reaches the top of the screen */
  const tTop = tNat + T; dkt._ty = T;
  /* they never fade: Origin simply carries them up and off the screen */
  dkt.style.opacity = din.toFixed(3);
  dkb.style.opacity = din.toFixed(3);
  dkb.style.pointerEvents = din > .6 ? "auto" : "none";
  dishTick(held, din);
}
/* the coil behind the dark screen: a rendered sequence. Scroll turns it, sinks it and draws it back into the dark */
const COIL_N = 41, coilCv = $("coilCv"), coilCx = coilCv.getContext("2d"), coilImgs = [];
let coilShown = -1, coilKey = "";
if (false) for (let i = 0; i < COIL_N; i++){ const im = new Image(); im.decoding = "async"; im.src = `coil/${String(i).padStart(2, "0")}.webp`; im.onload = () => { if (i === coilShown) coilShown = -1; }; coilImgs[i] = im; }
function coilTick(p, op){
  coilCv.style.opacity = op.toFixed(3);
  if (op <= 0) return;
  const W = coilCv.clientWidth, H = coilCv.clientHeight, k = W + "x" + H;
  if (k !== coilKey){ coilKey = k; coilCv.width = W; coilCv.height = H; coilShown = -1; }
  let i = Math.round(p * (COIL_N - 1));
  while (i > 0 && !coilImgs[i].complete) i--;
  if (i === coilShown || !coilImgs[i].complete) return;
  coilShown = i;
  const im = coilImgs[i], s = H / im.naturalHeight   /* fit by height so the gap under the title holds on wide screens; the frame edges are already black */, w = im.naturalWidth * s, h = im.naturalHeight * s;
  coilCx.fillStyle = "#000"; coilCx.fillRect(0, 0, W, H);
  coilCx.drawImage(im, (W - w) / 2, H - h, w, h);   /* anchored to the bottom edge */
}
/* ---------- the dark screen's floor: a woven leather dish, blended into the black at the top ----------
   WebGL so the surface can give under the cursor like a leather seat: a soft dent that eases in,
   wobbles a little as it settles (a damped spring) and catches a rim of light, then springs back. */
const dishCv = $("dishCv"), DISH = { gl: null, ok: false, img: new Image(), w: 0, h: 0,
  mx: .5, my: .7, tx: .5, ty: .7, d: 0, v: 0, on: false, last: 0 };
DISH.img.src = "img/dish.webp?v=1";
function dishInit(){
  const gl = dishCv.getContext("webgl", { premultipliedAlpha: false, antialias: false }); if (!gl) return;
  const vs = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const fs = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 res, img, m; uniform float d, op;
    void main(){
      vec2 px = vec2(v.x, 1. - v.y) * res;
      float s = res.x / img.x;                      /* full width, anchored to the bottom edge */
      vec2 uv = vec2(px.x / (img.x * s), 1. - (res.y - px.y) / (img.y * s));
      vec2 mp = vec2(m.x * res.x, m.y * res.y);
      vec2 q = (px - mp) / vec2(1., .55);          /* squashed into the dish's perspective */
      float R = res.x * .16, r2 = dot(q, q) / (R * R);
      float h = d * exp(-r2);                       /* the dent */
      vec2 dir = (px - mp) / max(length(px - mp), 1.);
      uv += dir * h * .009 * vec2(1., .55);         /* the weave is pulled into the dent, half as hard as before */
      vec4 c = texture2D(t, clamp(uv, 0., 1.));
      if (uv.y < 0.) c = vec4(0.);
      float rim = d * exp(-pow(sqrt(r2) - 1.05, 2.) * 6.) * .55;   /* light catching the edge of the dent */
      float sh = 1. - h * .55;                                          /* the hollow sits in shadow */
      float g = dot(c.rgb, vec3(.333));
      vec3 col = c.rgb;                             /* only the surface moves; no shade or light follows the cursor */
      float yf = px.y / res.y;
      col *= smoothstep(.30, .72, yf);                                   /* the dish lives in the lower part of the screen and melts into the black above */
      vec2 cp = (v - vec2(.5, .2)) * vec2(1., 1.6);                       /* a soft shade behind the copy and button */
      col *= 1. - .55 * exp(-dot(cp, cp) / .035);
      col *= .85;
      gl_FragColor = vec4(col * op, 1.);
    }`;
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, DISH.img);
  DISH.u = { res: gl.getUniformLocation(pr, "res"), img: gl.getUniformLocation(pr, "img"), m: gl.getUniformLocation(pr, "m"), d: gl.getUniformLocation(pr, "d"), op: gl.getUniformLocation(pr, "op") };
  gl.uniform2f(DISH.u.img, DISH.img.naturalWidth, DISH.img.naturalHeight);
  DISH.gl = gl; DISH.ok = true;
}
DISH.img.onload = dishInit;
addEventListener("pointermove", e => {
  const r = dishCv.getBoundingClientRect();
  DISH.tx = (e.clientX - r.left) / r.width; DISH.ty = (e.clientY - r.top) / r.height;
  DISH.on = DISH.ty > .45 && DISH.ty < 1.02 && DISH.tx > -.02 && DISH.tx < 1.02;   /* only over the dish itself */
}, { passive: true });
addEventListener("pointerleave", () => { DISH.on = false; });
function dishTick(held, op){
  dishCv.style.opacity = op.toFixed(3);
  dishCv.style.translate = `0 ${(-held * 6).toFixed(2)}vh`;          /* rises gently with the copy */
  if (!DISH.ok || op <= 0) return;
  const now = performance.now(), dt = Math.min(.05, (now - (DISH.last || now)) / 1000 || .016); DISH.last = now;
  /* the cursor is followed softly; the dent is a damped spring, so it sinks, wobbles once and settles */
  const k = 1 - Math.exp(-dt * 9); DISH.mx += (DISH.tx - DISH.mx) * k; DISH.my += (DISH.ty - DISH.my) * k;
  const target = DISH.on && !reduce ? 1 : 0, stiff = 60, damp = 9;
  DISH.v += ((target - DISH.d) * stiff - DISH.v * damp) * dt; DISH.d += DISH.v * dt;
  const W = dishCv.clientWidth, H = dishCv.clientHeight, pr = Math.min(devicePixelRatio || 1, 1.5);
  if (dishCv.width !== Math.round(W * pr)){ dishCv.width = Math.round(W * pr); dishCv.height = Math.round(H * pr); }
  const gl = DISH.gl; gl.viewport(0, 0, dishCv.width, dishCv.height);
  gl.uniform2f(DISH.u.res, dishCv.width, dishCv.height);
  gl.uniform2f(DISH.u.m, DISH.mx, DISH.my);
  gl.uniform1f(DISH.u.d, Math.max(0, DISH.d));
  gl.uniform1f(DISH.u.op, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
window.__dish = DISH; window.__dishTick = dishTick;
/* ---------- hero sound: an engine, built live with Web Audio. It idles when the page is still and revs as hard as you scroll.
   The button only lives in the hero; past it, the sound fades away. ---------- */
const sndB = $("snd");
const ENG = { ac: null, on: true, rpm: 0, vel: 0, lastY: scrollY, lastT: 0, lastSet: 0, inHero: true };
function engBuild(){
  const ac = new (window.AudioContext || window.webkitAudioContext)(); ENG.ac = ac;
  const out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination); ENG.out = out;
  const shape = ac.createWaveShaper(); { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++){ const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 2.2); } shape.curve = c; }
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 3; ENG.lp = lp;
  const body = ac.createGain(); body.gain.value = .5; ENG.body = body;
  /* the firing: a low saw, a square an octave down and a pulse that thumps once per cycle */
  const o1 = ac.createOscillator(); o1.type = "sawtooth";
  const o2 = ac.createOscillator(); o2.type = "square";
  const o3 = ac.createOscillator(); o3.type = "sawtooth";
  const g1 = ac.createGain(); g1.gain.value = .5; const g2 = ac.createGain(); g2.gain.value = .35; const g3 = ac.createGain(); g3.gain.value = .18;
  o1.connect(g1); o2.connect(g2); o3.connect(g3); [g1, g2, g3].forEach(g => g.connect(shape));
  const thump = ac.createGain(); thump.gain.value = .55;
  const lfo = ac.createOscillator(); lfo.type = "sine"; const lfoG = ac.createGain(); lfoG.gain.value = .45; lfo.connect(lfoG); lfoG.connect(thump.gain);
  shape.connect(thump); thump.connect(lp); lp.connect(body); body.connect(out);
  /* air through the intake: filtered noise that rises with the revs */
  const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = .8; ENG.bp = bp;
  const ng = ac.createGain(); ng.gain.value = .02; ENG.ng = ng;
  ns.connect(bp); bp.connect(ng); ng.connect(out);
  ENG.o = [o1, o2, o3, lfo];
  [o1, o2, o3, lfo, ns].forEach(n => n.start());
  engSet(0, true);
}
function engSet(r, now){
  const ac = ENG.ac, T = ac.currentTime, k = now ? 0 : .12;
  if (!now) [ENG.o[0].frequency, ENG.o[1].frequency, ENG.o[2].frequency, ENG.o[3].frequency, ENG.lp.frequency, ENG.body.gain, ENG.bp.frequency, ENG.ng.gain].forEach(p => p.cancelScheduledValues(T));
  const f = 34 + r * 96;                                   /* idle about 1,000 rpm, full throttle about 4,000 */
  ENG.o[0].frequency.setTargetAtTime(f, T, k); ENG.o[1].frequency.setTargetAtTime(f / 2, T, k);
  ENG.o[2].frequency.setTargetAtTime(f * 1.5 + 1.3, T, k); ENG.o[3].frequency.setTargetAtTime(f / 2, T, k);
  ENG.lp.frequency.setTargetAtTime(260 + r * 1900, T, k);
  ENG.body.gain.setTargetAtTime(.42 + r * .38, T, k);
  ENG.bp.frequency.setTargetAtTime(700 + r * 2200, T, k); ENG.ng.gain.setTargetAtTime(.015 + r * .09, T, k);
}
function engLevel(){ if (!ENG.ac) return; ENG.out.gain.setTargetAtTime(ENG.on && ENG.inHero ? .32 : 0, ENG.ac.currentTime, .25); }
sndB.setAttribute("aria-pressed", "true"); sndB.setAttribute("aria-label", "Turn sound off");
/* sound is on from the start; the browser only lets it play after the first click, tap or key press on the page */
const engWake = e => {
  if (e && e.target && e.target.closest && e.target.closest("#snd")) return;
  if (!ENG.on) return;
  if (!ENG.ac) engBuild();
  if (ENG.ac.state === "suspended") ENG.ac.resume();
  engLevel();
  ["pointerdown", "keydown", "touchend"].forEach(t => removeEventListener(t, engWake, true));
};
["pointerdown", "keydown", "touchend"].forEach(t => addEventListener(t, engWake, true));
sndB.addEventListener("click", () => {
  ENG.on = !ENG.on;
  sndB.setAttribute("aria-pressed", ENG.on); sndB.setAttribute("aria-label", ENG.on ? "Turn sound off" : "Turn sound on");
  if (ENG.on && !ENG.ac) engBuild();
  if (ENG.ac && ENG.ac.state === "suspended") ENG.ac.resume();
  engLevel();
});
function sndTick(now){
  /* only in the hero */
  const inHero = seq.getBoundingClientRect().bottom > innerHeight * .6 && $("origin").getBoundingClientRect().top > innerHeight * .5;
  if (inHero !== ENG.inHero){ ENG.inHero = inHero; sndB.classList.toggle("off", !inHero); engLevel(); }
  const dt = Math.min(.1, ENG.lastT ? (now - ENG.lastT) / 1000 : .016); ENG.lastT = now;
  const v = Math.abs(scrollY - ENG.lastY) / Math.max(dt, .001); ENG.lastY = scrollY;
  ENG.vel += (v - ENG.vel) * (1 - Math.exp(-dt * 10));                 /* a smoothed speed, so single jumpy frames do not jerk the revs */
  const inDark = cur >= .9;                                             /* on the dark screen the engine just idles */
  const target = inDark ? 0 : clamp(ENG.vel / 2600);
  ENG.rpm += (target - ENG.rpm) * (1 - Math.exp(-dt * (target > ENG.rpm ? 5 : 1.6)));   /* revs up quickly, falls back slowly */
  if (ENG.ac && ENG.on && ENG.inHero && now - ENG.lastSet > 60){ ENG.lastSet = now; engSet(ENG.rpm); }
}

/* ---------- a live leather dish for any canvas: the surface gives under the cursor ---------- */
function makeDish(cv, scale){
  const S = { gl: null, ok: false, img: new Image(), mx: .5, my: .7, tx: .5, ty: .7, d: 0, v: 0, on: false, last: 0 };
  S.img.onload = () => {
    const gl = cv.getContext("webgl", { premultipliedAlpha: false, antialias: false }); if (!gl) return;
    const vs = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
    const fs = `precision highp float; varying vec2 v; uniform sampler2D t; uniform vec2 res, img, m; uniform float d, sc;
      void main(){
        vec2 px = vec2(v.x, 1. - v.y) * res;
        float s = res.x * sc / img.x;
        vec2 uv = vec2((px.x - (res.x - img.x * s) * .5) / (img.x * s), 1. - (res.y - px.y) / (img.y * s));
        vec2 mp = m * res, q = (px - mp) / vec2(1., .55);
        float R = res.x * .16, h = d * exp(-dot(q, q) / (R * R));
        uv += (px - mp) / max(length(px - mp), 1.) * h * .009 * vec2(1., .55);
        vec3 c = texture2D(t, clamp(uv, 0., 1.)).rgb * .85;
        gl_FragColor = vec4(c, 1.);
      }`;
    const mk = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, S.img);
    S.u = { res: gl.getUniformLocation(pr, "res"), img: gl.getUniformLocation(pr, "img"), m: gl.getUniformLocation(pr, "m"), d: gl.getUniformLocation(pr, "d"), sc: gl.getUniformLocation(pr, "sc") };
    gl.uniform2f(S.u.img, S.img.naturalWidth, S.img.naturalHeight); gl.uniform1f(S.u.sc, scale);
    S.gl = gl; S.ok = true; S.dirty = true;
  };
  S.img.src = "img/dish.webp?v=1";
  addEventListener("pointermove", e => {
    const r = cv.getBoundingClientRect();
    S.tx = (e.clientX - r.left) / r.width; S.ty = (e.clientY - r.top) / r.height;
    S.on = S.tx > 0 && S.tx < 1 && S.ty > 0 && S.ty < 1;
  }, { passive: true });
  S.tick = now => {
    if (!S.ok) return;
    const r = cv.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const dt = Math.min(.05, (now - (S.last || now)) / 1000 || .016); S.last = now;
    const k = 1 - Math.exp(-dt * 9); S.mx += (S.tx - S.mx) * k; S.my += (S.ty - S.my) * k;
    S.v += (((S.on && !reduce ? 1 : 0) - S.d) * 60 - S.v * 9) * dt; S.d += S.v * dt;
    const W = cv.clientWidth, H = cv.clientHeight, pr = Math.min(devicePixelRatio || 1, 1.5);
    if (cv.width !== Math.round(W * pr) || cv.height !== Math.round(H * pr)){ cv.width = Math.round(W * pr); cv.height = Math.round(H * pr); S.dirty = true; }
    if (!S.dirty && Math.abs(S.d) < .001 && Math.abs(S.v) < .001) return;
    S.dirty = false;
    const gl = S.gl; gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(S.u.res, cv.width, cv.height); gl.uniform2f(S.u.m, S.mx, S.my); gl.uniform1f(S.u.d, Math.max(0, S.d));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return S;
}
const ftDish = makeDish($("ftDish"), 1.2);
window.__eng = ENG; window.__ftDish = ftDish;
/* ---------- the last screen: from the end of the grille band down to the end of the footer is exactly one window tall.
   The leather dish at the bottom takes up whatever height is left over. ---------- */
const rtBandImg = document.querySelector(".rt-band i");
function bandTick(){
  if (!rtBandImg) return;
  const r = rtBandImg.parentElement.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const k = clamp((r.top + r.height) / (innerHeight + r.height));     /* 1 as it enters at the bottom, 0 as it leaves at the top */
  rtBandImg.style.transform = `translate3d(0,${((k - .5) * .2 * r.height).toFixed(1)}px,0)`;
}
function rtFit(){
  const band = document.querySelector(".rt-band"), sec = $("reserve"), dish = document.querySelector(".rt-dish");
  if (!band || !dish) return;
  const span = sec.getBoundingClientRect().bottom - band.getBoundingClientRect().bottom;
  const h = Math.round(Math.max(160, dish.offsetHeight + innerHeight - span));
  if (Math.abs(h - dish.offsetHeight) > 1) dish.style.height = h + "px";
}
addEventListener("resize", rtFit); addEventListener("load", rtFit);
if (document.fonts) document.fonts.ready.then(rtFit);
/* ---------- optical left edge: every title line starts at its letter's ink, not its box ("A" and "r" sit differently) ---------- */
function inkAlign(){
  const cx = document.createElement("canvas").getContext("2d");
  $$("h1 .ml > span, h2 .ml > span, h2 .ln > span").forEach(sp => {
    const ch = (sp.textContent.trim()[0]) || ""; if (!ch) return;
    const cs = getComputedStyle(sp);
    cx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
    const b = -cx.measureText(ch).actualBoundingBoxLeft;      /* the gap before the ink, at 100px */
    sp.style.marginLeft = (-b / 100).toFixed(3) + "em";
  });
}
if (document.fonts) document.fonts.ready.then(inkAlign); else addEventListener("load", inkAlign);
window.__hero = { get cur(){ return cur; }, get shown(){ return shown; }, get loaded(){ return imgs.filter(Boolean).length; } };

/* ---------- the fold: a notch SUBTRACTED from the top edge of every section ----------
   Section content runs right up to its top edge and a moving notch is masked out of it, so the previous
   section shows through. Pinned scenes carry the same notch on their stage and keep it at the top of the
   viewport the whole time they are pinned.                                                              */
const stageSel = { machine2: ".m2-stick", origin: ".hz-stick", promise: ".pr-stick", machine: ".ms-stick", company: ".co-stick", hands: ".hd-stick" };
const seams = $$(".sec").map(sec => {
  const inner = document.createElement("div");
  inner.className = "sec-in";
  while (sec.firstChild) inner.appendChild(sec.firstChild);
  sec.appendChild(inner);
  const stage = stageSel[sec.id] ? inner.querySelector(stageSel[sec.id]) : null;
  const wrap = document.createElement("div");
  const label = document.createElement("span");
  if (stage){
    const container = stage.parentElement;
    const bg = document.createElement("div");
    bg.className = "fold-bg";
    bg.style.setProperty("--fb", sec.dataset.fb || "#000");
    wrap.style.cssText = "position:sticky;top:0;height:0;z-index:5";
    container.insertBefore(wrap, container.firstChild);
    container.insertBefore(bg, container.firstChild);
    return { sec, inner, stage, container, label, fold: bg };
  }
  wrap.style.cssText = "position:absolute;top:0;left:0;right:0;height:0;z-index:5";
  inner.appendChild(wrap);
  return { sec, inner, stage: null, container: inner, label };
});
const PERIOD = 9000;
const NOTCH_D = 32;   /* notch depth on the 48px grid (was 26.4), so the script label sits inside it */
/* notch version 2 (default): fixed in the middle of the screen and see-through; add ?notch=1 to the address for the moving one */
const NOTCH2 = !/[?&]notch=1/.test(location.search);
document.documentElement.classList.toggle("notch-v2", NOTCH2);
/* the label reads the section's own background: light ground gets dark type, dark ground gets white */
const TONE = { seq: "#fff", origin: "#fff", machine: "#fff", machine2: "#fff", reserve: "#fff" };
const toneOf = sec => {
  if (TONE[sec.id]) return TONE[sec.id];
  const v = sec.style.getPropertyValue("--bg").trim(), x = /^#([\da-f]{6})$/i.exec(v);
  if (!x) return "#fff";
  const n = parseInt(x[1], 16), m = [n >> 16, (n >> 8) & 255, n & 255];
  const L = (.2126 * m[0] + .7152 * m[1] + .0722 * m[2]) / 255;
  return L > .55 ? "#1d1d1d" : "#fff";
};
const SEAM_FRAMES = {};
seams.forEach(s => { s.frame = SEAM_FRAMES[s.sec.id] ? s.sec.querySelector(SEAM_FRAMES[s.sec.id]) : null; });
const stuckOf = s => s.stage && s.stage.getBoundingClientRect().top <= .5;
const SL = document.createElement("div"); SL.className = "seam-labels"; SL.setAttribute("aria-hidden", "true"); document.body.appendChild(SL);
seams.forEach(s => { s.label.className = "seam-label"; s.label.textContent = s.sec.dataset.seam || ""; s.label.style.color = s.sec.dataset.lc || "#fff"; SL.appendChild(s.label); });
function seamLabelTick(){
  const h = Math.round(Math.min(58, Math.max(38, innerWidth * .031))), u = h / 48, nd = NOTCH_D * u, vwD = document.documentElement.clientWidth;
  const ys = seams.map(s => (s.stage || s.inner).getBoundingClientRect().top);
  seams.forEach((s, i) => {
    const id = s.sec.id, y = ys[i];
    let x = labelX, show = y > -nd && y < innerHeight - nd;
    for (let k = i + 1; k < seams.length; k++){
      if (id === "origin" && seams[k].sec.id === "promise") continue;   /* Promise lies under Origin */
      if (ys[k] <= y + 1) show = false;
    }
    const edge = vwD + hzX;   /* Origin's right edge while it slides away */
    if (id === "promise" && promiseE < 1 && edge > x) show = false;
    if (id === "origin" && hzX && edge <= x) show = false;
    if (id === "origin"){ const n = hzRx > hzC.offsetLeft + vw * .55 ? "Founded" : "Origin"; if (s.label.textContent !== n) s.label.textContent = n; }
    s.label.style.opacity = show ? 1 : 0;
    if (s.frame){ s.label.style.marginTop = "24px"; if (!stuckOf(s)) show = false; s.label.style.opacity = show ? 1 : 0; }
    if (show){ const lh = s.labH || (s.labH = s.label.offsetHeight || 22); s.label.style.transform = `translate3d(${x.toFixed(1)}px,${(y + (nd - lh) / 2).toFixed(1)}px,0) translateX(-50%)`; }
  });
}
let labelX = 0;
/* notch caps: a small notch shape in the fold colour sits on each section's top edge and only slides (compositor-cheap), instead of re-masking whole sections every frame */
seams.forEach(s => {
  const cap = document.createElement("div");
  cap.className = "seam-cap"; cap.setAttribute("aria-hidden", "true");
  cap.style.setProperty("--fb", s.sec.dataset.fb || "#000");
  cap.innerHTML = '<i class="sc-l"></i><i class="sc-r"></i><svg class="sc-n"><path/></svg>';
  (s.stage || s.inner).prepend(cap);
  s.cap = cap; s.capR = cap.querySelector(".sc-r"); s.capN = cap.querySelector(".sc-n");
});
let capKey = "";
function drawSeams(ms){
  const h = Math.round(Math.min(58, Math.max(38, innerWidth * .031)));
  const W = document.documentElement.clientWidth;
  const u = h / 48, r = 24 * u, nd = NOTCH_D * u, nw = 390 * u;
  if (r !== drawSeams._r){ drawSeams._r = r; document.documentElement.style.setProperty("--r-sec", r.toFixed(2) + "px"); }   /* every frame's radius follows the section corners */
  const x = (W - nw) / 2;
  labelX = x + nw / 2;
  seams.forEach((s, i) => {
    const el = s.stage || s.inner, Ws = el.clientWidth, Hs = el.offsetHeight;
    const off = s.sec.id === "origin" ? hzX : 0;          /* Origin's stage slides left; the notch stays in the middle of the screen */
    const X = x - off, sq = s.sec.id === "origin" && off;  /* its right corner goes square while it slides away */
    let d = `M0 ${r.toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${r.toFixed(1)} 0`;
    if (X + nw < Ws - r && s.sec.id !== "promise") d += `H${X.toFixed(1)}C${(X + 30 * u).toFixed(1)} 0 ${(X + 44 * u).toFixed(1)} ${nd.toFixed(1)} ${(X + 84 * u).toFixed(1)} ${nd.toFixed(1)}H${(X + 306 * u).toFixed(1)}C${(X + 346 * u).toFixed(1)} ${nd.toFixed(1)} ${(X + 360 * u).toFixed(1)} 0 ${(X + nw).toFixed(1)} 0`;
    d += sq ? `H${Ws}V${Hs}H0Z` : `H${(Ws - r).toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${Ws} ${r.toFixed(1)}V${Hs}H0Z`;
    if (d !== s.clipD){ s.clipD = d; el.style.clipPath = `path("${d}")`; }
    /* the flat fold colour stands in only when nothing real is left behind the notch */
    if (s.fold){
      const prev = s.sec.id === "promise" ? null : (seams[i - 1] && seams[i - 1].sec);
      const top = el.getBoundingClientRect().top;
      const behind = prev ? prev.getBoundingClientRect().bottom - Math.max(0, top) : -1;
      const on = s.sec.id === "promise" ? 1 : (top <= .5 && behind < nd + 1 ? 1 : 0);
      if (on !== s.foldOn){ s.foldOn = on; s.fold.style.opacity = on; }
      if (s.sec.id === "hands"){
        const key = W + "x" + innerHeight + "x" + nd;
        if (key !== s.foldKey){
          s.foldKey = key;
          const Hv = innerHeight + 16, k = Math.max(W / 1600, Hv / 900), sw = 1600 * k, sh = 900 * k;
          const py = nd + 8 - Hv + (Hv - sh) / 2;
          s.fold.style.background = `#0a0a0a url(img/m2-last.jpg?v=2) ${((W - sw) / 2).toFixed(1)}px ${py.toFixed(1)}px / ${sw.toFixed(1)}px ${sh.toFixed(1)}px no-repeat scroll`;
        }
      }
    }
  });
}

/* ---------- shared reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  io.unobserve(e.target);
  if (e.target.classList.contains("pf-row")) countUp(e.target);
}), { threshold: 0, rootMargin: "0px 0px -9% 0px" });
$$("[data-rv],[data-split]").forEach(el => io.observe(el));
if (reduce) $$("[data-rv],[data-split]").forEach(el => el.classList.add("in"));

function countUp(row){
  $$("[data-count]", row).forEach(n => {
    const to = parseFloat(n.dataset.count), dec = +(n.dataset.dec || 0), t0 = performance.now(), dur = 1800;
    const f = t => {
      const k = clamp((t - t0) / dur), e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      n.textContent = (to * e).toFixed(dec);
      if (k < 1) requestAnimationFrame(f);
    };
    if (!reduce) requestAnimationFrame(f);
  });
}

/* ---------- 02 origin: pinned horizontal story ---------- */
const hz = $("hz"), hzStick = hz.querySelector(".hz-stick"), track = $("hzTrack"), hzB = $("hzB"), hzC = $("hzC");
const phs = $$(".ph[data-year]", hzB), fcs = $$(".fc", hzB), ticks = $$("[data-tick]", hzB), cols = $$(".col", hzB), allPh = $$(".ph", hzB);
const ruler = $("ruler"), scale = $("scale"), yr = $("yr");
let hzX = 0, vw = 0, shift = 0, yearIdx = -1, phX = [], promiseE = 0, hzRx = 0, extra = 0;
const hzFold = hz.querySelector(".fold-bg");
const prSec = $("promise"), prEl = prSec.firstElementChild, prR = prSec.querySelector(".pr-r"), prL = prSec.querySelector(".pr-l"), prStick = prSec.querySelector(".pr-stick"), uis = $$(".ui[data-par]");  /* prEl = the sheet (.sec-in) that slides in */
const offX = el => { let x = 0, e = el; while (e && e !== track){ x += e.offsetLeft; e = e.offsetParent; } return x; };
function hzSize(){
  vw = hzStick.clientWidth;
  shift = Math.max(0, track.offsetWidth - vw);
  extra = innerHeight * 1.5;   /* the first third is a hold on Founded: the portrait finishes and is signed */
  hz.style.height = (shift + extra + innerHeight) + "px";
  phX = phs.map(p => ({ x: offX(p), w: p.offsetWidth }));
  ticks.forEach((t, i) => { const c = cols[i], n = cols[i + 1]; if (c && n) t.style.left = (offX(c) + c.offsetWidth + (offX(n) - offX(c) - c.offsetWidth) / 2 - offX(hzB)) + "px"; });
  fcs.forEach(f => {
    const p = phX[+f.dataset.photo];
    f.style.left = (p.x - offX(hzB) + p.w / 2 - f.offsetWidth / 2) + "px";
    f.style.top = f.dataset.top;
  });
}
function hzTick(){
  const px = prog(hz) * (shift + extra), sh = Math.min(px, shift), cx = sh + vw / 2, rx = sh + vw;
  hzRx = rx;
  track.style.transform = `translate3d(${-sh}px,0,0)`;
  /* Founded stays pinned; Promise slides in over it from the right, locked to the scroll */
  const eRaw = clamp((px - shift) / extra), HOLD = 1 / 3, e = clamp((eRaw - HOLD) / (1 - HOLD));
  promiseE = e;
  const top = prSec.getBoundingClientRect().top;
  const ez = e;   /* moves 1:1 with the scroll, no pull at either end */
  hzX = -ez * vw;
  fskDraw(reduce ? 1 : clamp((rx - hzC.offsetLeft) / Math.max(1, hzC.offsetWidth)) * .45 + clamp(eRaw / HOLD) * .55);
  /* Promise waits underneath, still; Origin slides away to the left and uncovers it */
  prEl.style.transform = (e > 0 && e < 1 && top > 0) ? `translate3d(0,${(-top).toFixed(1)}px,0)` : "";
  hzStick.style.transform = e > 0 ? `translate3d(${hzX.toFixed(1)}px,0,0)` : "";
  hzFold.style.transform = hzStick.style.transform;
  uis.forEach(u => { const w = u.parentElement, c = offX(w) + w.offsetWidth / 2; u.style.transform = `translate3d(${((c - cx) * +u.dataset.par).toFixed(1)}px,0,0)`; });
  const bS = hzB.offsetLeft, bE = bS + hzB.offsetWidth;
  ruler.style.opacity = (ss(bS, bS + vw * .5, rx) * (1 - ss(bE - vw * .8, bE - vw * .3, sh))).toFixed(3);
  scale.style.backgroundPosition = `${-sh}px 100%`;
  let yi = 0;
  phX.forEach((q, i) => { if (q.x + q.w / 2 <= cx + vw * .22) yi = i; });
  if (yi !== yearIdx){ yearIdx = yi; yr.innerHTML = `<span>${phs[yi].dataset.year}</span>`; }
  if (!reduce){
    fcs.forEach(f => { const q = phX[+f.dataset.photo], c = q.x + q.w / 2; f.style.transform = `translate3d(${(c - cx) * +f.dataset.s}px,0,0)`; });
    allPh.forEach(ph => { const c = offX(ph) + ph.offsetWidth / 2, m = ph.offsetWidth * .07; ph.firstElementChild.style.transform = `translate3d(${clamp((cx - c) * -.05, -m, m).toFixed(1)}px,0,0)`; });
  }
}

/* ---------- 03 promise ---------- */
const promise = [
  { t: "Built to be repaired.", s: "Fix it on the trail, with the tools in the glovebox.", d: "Standard bolts, open service manuals and parts we stock for twenty years. If it breaks on the trail, you can fix it on the trail.",
    i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>' },
  { t: "Made to cross.", s: "12.1 inches of clearance and locked differentials.", d: "Long-travel suspension, 12.1 inches of clearance and locking differentials. The route you picked is the route you take.",
    i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19 9 7l4 7 3-4 5 9z"/></svg>' },
  { t: "Open to the sky.", s: "Roof and doors off in minutes, tools in the glovebox.", d: "Roof and doors come off in minutes with the tools in the glovebox. Nothing between you and the country you came to see.",
    i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>' },
  { t: "Kept for life.", s: "A frame warranted for forty years.", d: "A frame warranted for forty years and a workshop that will still answer the phone. We would rather you keep it than trade it in.",
    i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18.2 8.8a4 4 0 1 0 0 6.4L12 12 5.8 8.8a4 4 0 1 0 0 6.4"/></svg>' }
];
const PR_FIG = [["20 yrs", "of parts kept in stock"], ["12.1 in", "of ground clearance"], ["6 min", "to take the roof off"], ["40 yrs", "frame warranty"]];
const PR_IMG = ["img/p-repair.webp?v=2", "img/p-capable.webp?v=2", "img/p-open.webp?v=2", "img/p-last.webp?v=2"];
const pr = $("pr"), prLis = $$("#prWords li"), prImgs = $$(".pr-img", pr), prTabs = $$("#prTabs button");
let prIdx = -1, prTimer;
function placeMark(i){
  const li = prLis[i], b = li.firstElementChild;
  const lr = li.parentElement.parentElement.getBoundingClientRect(), br = b.getBoundingClientRect();
  $("prMark").style.transform = `translate3d(${(br.left - lr.left - 18).toFixed(1)}px,${(br.top - lr.top + br.height / 2).toFixed(1)}px,0)`;
}
function setPromise(i){
  prIdx = i;
  prLis.forEach((l, k) => l.classList.toggle("on", k === i));
  prTabs.forEach((l, k) => l.classList.toggle("on", k === i));
  prSec.classList.toggle("pr-picked", i >= 0);
  if (i < 0){ $("prTx").classList.add("out"); return; }
  placeMark(i);
  $("prCount").textContent = `0${i + 1} / 04`;
  const tx = $("prTx"), ds = $("prDesc"); tx.classList.add("out"); ds.classList.add("out");
  clearTimeout(prTimer);
  prTimer = setTimeout(() => {
    $("prH").textContent = promise[i].t; $("prP").textContent = promise[i].s; $("prIc").innerHTML = PR_IC[i]; $("prN").textContent = `0${i + 1} / 04`; $("prF").textContent = PR_FIG[i][0]; $("prFl").textContent = PR_FIG[i][1]; ds.textContent = promise[i].d;
    tx.dataset.i = i;
    tx.classList.remove("out"); ds.classList.remove("out");
  }, 260);
}
$("prIc").innerHTML = PR_IC[0];
$("prTx").dataset.i = 0;

$$("#prWords button,#prTabs button").forEach(b => b.addEventListener("click", () => {
  const i = +b.dataset.i;
  goto(pr.getBoundingClientRect().top + scrollY + (i + 1) * innerHeight);
}));
/* Promise: the factory photo fills the screen; the "4 things" card shrinks to half size in the centre and drifts with the cursor.
   Each word then brings its own full-screen photo, rising from the bottom with a hard edge (Daylight-style wipe). */
const PR_IN = .12, PR_SEG = (1 - PR_IN) / 4, PR_WIPE = .45;   /* each word's slice of the scroll; the wipe uses the first 45% of it */
const prWhite = $("prWhite"), prNotch = $("prNotch");
const prStrip = $("prStrip"), prImgsS = $$("img", prStrip);
let prScale = 1, prMx = 0, prMy = 0, prDx = 0, prDy = 0;
addEventListener("pointermove", e => { prMx = e.clientX / innerWidth - .5; prMy = e.clientY / innerHeight - .5; }, { passive: true });
let prLab = null; requestAnimationFrame(() => { prLab = [...document.querySelectorAll(".seam-label")].find(l => l.textContent === "Promise"); if (prLab) prLab.style.color = "#1d1d1d"; });
function promiseTick(){
  const p = prog(pr);
  { const W = prStick.clientWidth, h = Math.round(Math.min(58, Math.max(38, innerWidth * .031))), u = h / 48, nd = NOTCH_D * u, nw = 390 * u, X = (W - nw) / 2, key = W + "x" + prStick.clientHeight;
    if (key !== prNotch._k){ prNotch._k = key;
      prNotch.style.clipPath = `path("M${X.toFixed(1)} 0C${(X + 30 * u).toFixed(1)} 0 ${(X + 44 * u).toFixed(1)} ${nd.toFixed(1)} ${(X + 84 * u).toFixed(1)} ${nd.toFixed(1)}H${(X + 306 * u).toFixed(1)}C${(X + 346 * u).toFixed(1)} ${nd.toFixed(1)} ${(X + 360 * u).toFixed(1)} 0 ${(X + nw).toFixed(1)} 0Z")`; } }
  /* the card arrives over the photo once Origin has slid away, then shrinks to half in the centre */
  const cin = p > 0 ? 1 : ss(.55, .95, promiseE);
  prL.style.opacity = cin.toFixed(3);
  /* scroll travelled inside Promise, in px; the photos move with it 1:1 (no holds) */
  const H = prStick.clientHeight, W = prStick.clientWidth, run = p * (pr.offsetHeight - H);
  /* the card: the old big card at first, then (over the first half-screen of scroll) a compact card */
  const m = ss(0, H * .5, run);
  prSec.style.setProperty("--prm", m.toFixed(3));
  const pt = parseFloat(getComputedStyle(prStick).paddingTop) || 60;
  const W0 = (W - 24) / 2, H0 = H - pt - 98, W1 = Math.min(444, Math.max(344, W * .3 - 16));
  if (prL._w1 !== W1){ prL._w1 = W1;   /* measure the compact card's natural height once */
    const cl = prL.cloneNode(true); cl.removeAttribute("id"); cl.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
    cl.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;transform:none;width:${W1}px;height:auto;--prm:1`;
    prStick.appendChild(cl); prL._h1 = cl.offsetHeight; prStick.removeChild(cl); }
  prL.style.width = (W0 + (W1 - W0) * m).toFixed(1) + "px";
  prL.style.height = (H0 + (prL._h1 - H0) * m).toFixed(1) + "px";
  const k = 1 - Math.exp(-filmDt * 4);   /* soft cursor drift once compact */
  prDx += (prMx * 46 * m - prDx) * k; prDy += (prMy * 30 * m - prDy) * k;
  const cy = (pt - 98) / 2 * (1 - m);   /* starts where the old card sat, ends in the middle */
  prL.style.transform = `translate(-50%,-50%) translate3d(${prDx.toFixed(1)}px,${(cy + prDy + (1 - cin) * 40).toFixed(1)}px,0)`;
  /* the photos: plain pages scrolling up, each picture lagging its page (Fairhollow clubhouse) */
  prStrip.style.transform = `translate3d(0,${(-run).toFixed(1)}px,0)`;
  prImgsS.forEach((im, n) => { const t = n * H - run; if (t < H && t > -H) im.style.transform = `translate3d(0,${(-t * .5).toFixed(1)}px,0)`; });
  const i = Math.min(3, Math.floor((run + H * .5) / H) - 1);
  prR.classList.toggle("go", i >= 0);
  if (i >= 0 && m > 0 && m < 1) placeMark(i);
  if (i !== prIdx) setPromise(i);
}
setPromise(-1);
/* each photo carries its own info card (bottom-left), so the card scrolls with its picture */
{ const src = prSec.querySelector(".pr-r .pr-card");
  [...prStrip.children].slice(1).forEach((panel, i) => {
    const c = src.cloneNode(true); c.classList.add("pr-card-s");
    c.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
    const tx = c.querySelector(".tx"); tx.classList.remove("out"); tx.dataset.i = i;
    tx.querySelector(".pc-top span").textContent = `0${i + 1} / 04`;
    tx.querySelector(".pc-ic").innerHTML = PR_IC[i];
    tx.querySelector("h3").textContent = promise[i].t; tx.querySelector("p").textContent = promise[i].s;
    tx.querySelector(".pc-fig b").textContent = PR_FIG[i][0]; tx.querySelector(".pc-fig span").textContent = PR_FIG[i][1];
    panel.appendChild(c);
  }); }

/* ---------- 04 machine ---------- */
const modes = [
  { n: "Frame", s: [["Chassis", "Boxed steel ladder"], ["Welds", "Laid by hand"], ["Warranty", "40 years"]] },
  { n: "Suspension", s: [["Wheel travel", "14 in"], ["Springs", "Coil, all four"], ["Shocks", "Remote reservoir"]] },
  { n: "Drivetrain", s: [["Transfer case", "2-speed, 4:1"], ["Lockers", "Front and rear"], ["Axles", "Solid, both ends"]] },
  { n: "Roll cage", s: [["Tubing", "1.75 in steel"], ["Roof off", "6 min"], ["Doors off", "4 min"]] }
];
let hdFoldSrc = "";
/* the films glide after the scroll at the same pace on any screen refresh rate */
let filmLast = 0, filmDt = 1 / 60;
const filmK = () => 1 - Math.exp(-filmDt * 7);
const lerp = (a, b, t) => a + (b - a) * t;
function machineTick(){
  { const n = performance.now(); filmDt = Math.min(.05, filmLast ? (n - filmLast) / 1000 : 1 / 60); filmLast = n; }
  { const f = $("hands").querySelector(".fold-bg");
    if (f && !hdFoldSrc){ hdFoldSrc = "img/m2-last.jpg"; f.style.setProperty("--mimg", `url("${hdFoldSrc}")`); } }
}

/* ---------- 04b machine, second version ----------
   The film: the Jeep rolls in, stops side-on, then the camera dives to each part in turn.
   Keys are the frames where it rests: side view, frame, suspension, drivetrain, roll cage. */
const M2_KEY = [0, 64, 127, 191, 255, 318], M2_FPS = 24;
const m2 = $("m2"), m2Vid = $("m2Vid"), m2Its = $$(".m2-it", m2), m2Ui = $("m2Ui"), m2H = $("m2H");
let m2Loaded = false, m2Want = 0, m2Have = -1, m2Busy = false, m2T = 0, m2Idx = -2;
function m2Load(){
  if (m2Loaded) return; m2Loaded = true;
  fetch("machine2.mp4?v=2").then(r => r.blob()).then(b => { m2Vid.preload = "auto"; m2Vid.src = URL.createObjectURL(b); m2Vid.load(); }).catch(() => { m2Vid.src = "machine2.mp4?v=2"; });
}
new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) m2Load(); }, { rootMargin: "200% 0px" }).observe(m2);
m2Vid.addEventListener("seeked", () => { m2Busy = false; if (m2Want !== m2Have) m2Seek(); });
m2Vid.addEventListener("loadedmetadata", () => { m2Have = -1; m2Seek(); });
function m2Seek(){ if (m2Busy || m2Vid.readyState < 1) return; m2Busy = true; m2Have = m2Want; m2Vid.currentTime = (m2Want + .5) / M2_FPS; }
/* the Close up list now uses the Machine card: one row per part, the open row shows that part's specifications */
const m2Pan = document.createElement("div");
m2Pan.className = "m2-pan card-s";
m2Pan.innerHTML = modes.map((m, k) => `<button type="button" data-i="${k}"><span class="row"><span class="t-sub">${m.n}</span><span class="t-label">0${k + 1}</span></span><span class="th"><div><dl>${m.s.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl></div></span></button>`).join("");
m2Ui.appendChild(m2Pan);
const m2Rows = $$("button", m2Pan);
m2Rows.forEach((b, k) => b.addEventListener("click", () => m2Goto(k)));
function m2Set(i){
  if (i === m2Idx) return; m2Idx = i;
  m2Rows.forEach((b, k) => b.classList.toggle("on", k === i));
  m2Its.forEach((it, k) => { it.classList.toggle("on", k === i); it.querySelector(".m2-pill").setAttribute("aria-expanded", k === i ? "true" : "false"); });
}
const m2Goto = i => goto(m2.getBoundingClientRect().top + scrollY + Math.min(.995, (i + 2) / 5) * (m2.offsetHeight - innerHeight));
m2Its.forEach((it, k) => it.querySelector(".m2-pill").addEventListener("click", () => m2Goto(k)));
$("m2Up").addEventListener("click", () => m2Goto(Math.max(0, m2Idx - 1)));
$("m2Dn").addEventListener("click", () => m2Goto(Math.min(3, m2Idx + 1)));
function machine2Tick(){
  const p = prog(m2), q = p * 5, s = Math.min(4, Math.floor(q)), u = lerp(q - s, ss(0, 1, q - s), .55);
  /* the film eases into each key frame, so the scroll rests on the side view and on every part */
  if (m2Loaded){
    const target = M2_KEY[s] + (M2_KEY[s + 1] - M2_KEY[s]) * u;
    m2T += (target - m2T) * (reduce ? 1 : filmK()); m2Want = Math.round(m2T);
    if (m2Want !== m2Have) m2Seek();
  }
  /* the list arrives once the Jeep has stopped; a part opens as the camera reaches it */
  const ui = ss(.75, 1, q);
  m2Ui.style.opacity = ui.toFixed(3); m2Ui.style.transform = `translate3d(0,${((1 - ui) * 16).toFixed(1)}px,0)`;
  m2Ui.style.pointerEvents = ui > .5 ? "auto" : "none";
  m2H.style.opacity = (1 - ss(1.2, 1.7, q)).toFixed(3);
  m2Set(q < 1.55 ? -1 : clamp(Math.floor(q - .55), 0, 4) - 1);
}

/* ---------- 07 company: Joby-style stage with depth ---------- */
const co = $("co"), coStick = $("coStick"), coTitle = $("coTitle"), coImgs = $$(".co-img", co), coIts = $$("#coTxt .it"), coLab = coImgs.map(e => e.querySelector(".lab"));
/* where a photo sits, as fractions of the window [left, top, width, height, opacity]: d = 0 is the big middle photo, -1 the small preview
   top-left, 1 the small preview bottom-right, 2 a tiny one just behind it. Measured from the reference. */
const SLOTS = { "-2": [.1403, .0251, .02, .06, 0], "-1": [.1673, .0251, .0847, .1801, 1], "0": [.2725, .0251, .4449, .9497, 1], "1": [.7371, .7948, .0847, .1801, 1], "2": [.778, .8813, .0438, .0936, 1], "3": [.80, .93, .02, .04, 0] };
function slotRect(d){
  d = clamp(d, -2, 3); const a = Math.floor(d), b = Math.min(a + 1, 3), t = d - a, A = SLOTS[a], B = SLOTS[b];
  const r = A.map((v, k) => lerp(v, B[k], t)), vh = innerHeight, sh = Math.round(Math.min(58, Math.max(38, innerWidth * .031)));
  const top = (sh + 24) / vh, lim = (vh - 16 - 58 - 24) / vh;
  r[1] = Math.max(r[1], top);
  if (r[1] + r[3] > lim){ if (r[3] > .5) r[3] = lim - r[1]; else r[1] = lim - r[3]; }
  return r;
}
const CO_R = 3 / 4;   /* one photo shape, always */
const ENT = [[.4843, .9305, .0212, .0443], [.8123, .9537, .0095, .0211]];   /* where the first two photos start from, tiny at the bottom */

/* the line-art: gears, a coil spring, a bolt and a tyre. Drawn in code so they stay thin and sharp at any size. */
function gearSVG(Z, Ro, Rr, holes){
  let d = "";
  for (let i = 0; i < Z; i++){ const p = Math.PI * 2 / Z, a = i * p;
    [[-.30, Rr], [-.14, Ro], [.14, Ro], [.30, Rr], [.5, Rr]].forEach((q, k) => { const t = a + q[0] * p; d += (i === 0 && k === 0 ? "M" : "L") + (Math.cos(t) * q[1]).toFixed(2) + " " + (Math.sin(t) * q[1]).toFixed(2); }); }
  let s = `<path d="${d}Z"/><circle r="${(Rr * .62).toFixed(1)}"/><circle r="${(Rr * .2).toFixed(1)}"/>`;
  for (let i = 0; i < holes; i++){ const t = i / holes * Math.PI * 2; s += `<circle cx="${(Math.cos(t) * Rr * .41).toFixed(1)}" cy="${(Math.sin(t) * Rr * .41).toFixed(1)}" r="${(Rr * .07).toFixed(1)}"/>`; }
  return `<svg viewBox="-100 -100 200 200">${s}</svg>`;
}
const boltSVG = () => { const hex = r => Array.from({ length: 6 }, (_, k) => [Math.cos(k * Math.PI / 3 + .2) * r, Math.sin(k * Math.PI / 3 + .2) * r].map(v => v.toFixed(1)).join(",")).join(" "); return `<svg viewBox="-100 -100 200 200"><polygon points="${hex(92)}"/><polygon points="${hex(64)}"/><circle r="38"/><circle r="14"/></svg>`; };
const springSVG = () => { let s = ""; for (let i = 0; i < 12; i++){ const y = i * 34; s += `<path d="M-22 ${y} L22 ${y + 17}"/><path stroke-dasharray="3 5" d="M22 ${y + 17} C22 ${y + 29} -22 ${y + 41} -22 ${y + 34}"/>`; } return `<svg viewBox="-30 -4 60 420">${s}</svg>`; };
const tyreSVG = () => { let s = `<circle r="98"/><circle r="76"/><circle r="30"/>`; for (let k = 0; k < 48; k++){ const t = k / 48 * Math.PI * 2, a = Math.cos(t), b = Math.sin(t), t2 = t + .09; s += `<path d="M${(a * 80).toFixed(1)} ${(b * 80).toFixed(1)} L${(Math.cos(t2) * 96).toFixed(1)} ${(Math.sin(t2) * 96).toFixed(1)}"/>`; } return `<svg viewBox="-100 -100 200 200">${s}</svg>`; };
const DP = [];   /* [parent, html, css, parallax, spin degrees, strength] */
[[ "coDepth", gearSVG(28, 96, 82, 8), "width:40vw;left:-13vw;top:36vh", .35, 200, .13, ""],
 [ "coDepth", gearSVG(14, 96, 78, 6), "width:13vw;left:18vw;top:74vh", .55, -420, .13, ""],
 [ "coDepth", springSVG(), "width:3.4vw;left:92.4vw;top:6vh", .6, 0, .16, ""],
 [ "coDepth", boltSVG(), "width:4.6vw;left:85vw;top:19vh", .85, 160, .18, ""],
 [ "coFg", boltSVG(), "width:15vw;left:64vw;top:66vh", 1.7, 120, .5, "soft"],
 [ "coFg", tyreSVG(), "width:36vw;left:78vw;top:-24vh", 1.35, 90, .36, "soft"],
 [ "coFg", gearSVG(18, 96, 80, 5), "width:11vw;left:-3vw;top:84vh", 1.5, -200, .4, "soft"]].forEach(([par, html, css, k, r, o, cls]) => {
  const el = document.createElement("div"); el.className = "dp " + cls; el.style.cssText = css; el.innerHTML = html; $(par).appendChild(el); DP.push({ el, k, r, o });
});
const foldBg = () => $("company").querySelector(".fold-bg");
const mixc = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
function companyTick(){
  const p = prog(co), vw = innerWidth, vh = innerHeight;
  /* the dark opening fades to cream while the headline turns dark, then the headline leaves as the first photo rises over it */
  const bgT = 1, bg = "rgb(250,250,248)";
  coStick.style.background = bg;
  const tOut = ss(.10, .18, p);
  coTitle.style.color = mixc([243, 236, 227], [29, 29, 29], bgT); coTitle.style.opacity = (1 - tOut).toFixed(3); coTitle.style.transform = `translate3d(0,${(-tOut * 6).toFixed(2)}vh,0)`;
  /* the timeline: enter, move to photo 2, move to photo 3 */
  const E = [ss(.04, .19, p), ss(.10, .17, p)], u = ss(.30, .46, p) + ss(.56, .73, p);
  const ex = 0;   /* the stage stays put; Return slides over it, so no empty tail */                                    /* the whole stage lifts away at the end */
  /* Joby-style chain: every photo has one shape (3:4) and sits exactly G away from its neighbour, always.
     The photo leaving the middle keeps its top edge, the one arriving keeps its bottom edge, and the frame crops
     the picture as it shrinks, so it reads as a mask closing rather than a picture moving. */
  const sh = Math.round(Math.min(58, Math.max(38, vw * .031))), G = 24;
  const top = sh + 24, bot = vh - 16 - 58 - 24, H = bot - top, hs = Math.round(vh * .18), ht = Math.round(vh * .09);
  const wOf = h => h * CO_R, Wb = wOf(H), Lb = Math.round(vw / 2 - Wb / 2), Lp = Lb - G - wOf(hs);
  const D = coImgs.map((el, i) => i - u);
  const hOf = (d, i) => {
    if (i < 2 && E[i] < 1 && u <= 0) return i === 0 ? lerp(H * .06, H, E[0]) : lerp(2, hs, E[1]);
    if (d >= 0 && d <= 1) return lerp(H, hs, d);
    if (d < 0 && d >= -1) return lerp(H, hs, -d);
    if (d > 1) return lerp(hs, ht, clamp(d - 1));
    return hs;
  };
  const h = D.map(hOf), w = h.map(wOf), L = new Array(D.length);
  let k = D.findIndex(d => d > -1 && d <= 0); if (k < 0) k = 0;
  L[k] = (k === 0 && E[0] < 1 && u <= 0) ? Lb + Wb / 2 - w[0] / 2 : lerp(Lb, Lp, -D[k]);
  for (let i = k + 1; i < D.length; i++) L[i] = L[i - 1] + w[i - 1] + G;
  for (let i = k - 1; i >= 0; i--) L[i] = L[i + 1] - G - w[i];
  coImgs.forEach((el, i) => {
    const d = D[i], y = d < 0 ? top : bot - h[i];
    let o = 1;
    if (d < -1) o = 1 - clamp((-1 - d) / .6);
    if (d > 2) o = 1 - clamp((d - 2) / .5);
    if (i === 2) o *= ss(.35, .65, u);
    if (i === 1 && E[1] <= 0) o = 0;
    el.style.opacity = o.toFixed(3);
    el.style.width = w[i].toFixed(1) + "px"; el.style.height = h[i].toFixed(1) + "px";
    el.style.transform = `translate3d(${L[i].toFixed(1)}px,${y.toFixed(1)}px,0)`;
    /* the picture inside stays nearer the big size, so a shrinking frame crops it */
    const ih = H * Math.pow(h[i] / H, .55);
    const im = el.firstElementChild; im.style.height = ih.toFixed(1) + "px"; im.style.width = (ih * CO_R).toFixed(1) + "px";
    im.style.transform = "translate(-50%,-50%)";
  });
  /* the story beside the main photo */
  const op = [ss(.15, .22, p) * (1 - ss(.28, .36, p)), ss(.41, .46, p) * (1 - ss(.55, .63, p)), ss(.67, .80, p)];
  { const tl = Lb + Wb + 32; $("coTxt").style.left = tl.toFixed(1) + "px"; $("coTxt").style.width = Math.min(352, vw - tl - 24).toFixed(0) + "px"; $("coTxt").style.top = ((top + bot - hs - 24) / 2).toFixed(0) + "px"; } $("coTxt").style.transform = `translate3d(0,${(-ex).toFixed(1)}px,0)`;
  coIts.forEach((e, k) => { e.style.opacity = op[k].toFixed(3); e.style.pointerEvents = op[k] > .5 ? "auto" : "none"; });
  /* depth: line-art drifting at different speeds and turning slowly; the soft ones are out of focus and in front of the photos */
  const show = ss(.08, .2, p) * (1 - clamp((p - .88) / .12));
  DP.forEach(q => { q.el.style.opacity = (show * q.o).toFixed(3); q.el.style.transform = `translate3d(0,${((.45 - p) * q.k * vh - ex * q.k).toFixed(1)}px,0) rotate(${(p * q.r).toFixed(1)}deg)`; });
}

/* ---------- 06 hands: a loose pen sketch that draws itself; hover paints the real vehicle through it ---------- */
const hd = $("hd"), hdArt = $("hdArt"), hdInk = $("hdInk"), hdRev = $("hdRev"), hdNotes = $("hdNotes"), hdStick = $("hdStick");
const hdTl = $$(".hd-title .ln > span"), hdCtx = hdInk.getContext("2d"), revCtx = hdRev.getContext("2d");
const HD = { n: 0, A: null, B: null, K: null, buf: null, u32: null, last: "", t: 0, any: false, col: null };
/* the pen lines come packed in one picture: red = dark line, green = light line, blue = the order the strokes are drawn in */
const hdImg = new Image();
hdImg.onload = () => {   /* R = pencil, G/B = when each pixel is drawn (16-bit), so strokes grow along their length */
  const c = document.createElement("canvas"); c.width = hdImg.naturalWidth; c.height = hdImg.naturalHeight;
  const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(hdImg, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, N = c.width * c.height;
  HD.n = N; HD.A = new Uint8Array(N); HD.K = new Uint16Array(N);
  for (let i = 0; i < N; i++){ HD.A[i] = d[i * 4]; HD.K[i] = d[i * 4 + 1] * 256 + d[i * 4 + 2]; }
  HD.buf = hdCtx.createImageData(c.width, c.height); HD.u32 = new Uint32Array(HD.buf.data.buffer); HD.last = "";
};
hdImg.src = "img/hands-pencil.png?v=1";
HD.col = document.createElement("canvas"); HD.col.width = HD.col.height = 4; { const cx = HD.col.getContext("2d"); cx.fillStyle = "#f6f6f3"; cx.fillRect(0, 0, 4, 4); }   /* hover rubs the drawing back to paper */
function hdDrawInk(t){
  if (!HD.A) return;
  const key = String((t * 4000) | 0); if (key === HD.last) return; HD.last = key;
  const T = t * 65535, N = HD.n, A = HD.A, K = HD.K, u = HD.u32;
  for (let i = 0; i < N; i++){
    const k = K[i];
    if (k > T || !A[i]){ u[i] = 0; continue; }
    const s = Math.min(1, (T - k) / 90), a = A[i] * s;   /* the graphite settles in right behind the moving tip */
    u[i] = ((((a | 0) & 255) << 24) | 0x1b1b1b) >>> 0;
  }
  hdCtx.putImageData(HD.buf, 0, 0);
}

/* handwritten notes and arrows, drawn on the same 2000 x 970 grid as the sketch */
const HD_NOTES = [
  { a: .24, b: .32, t: "open-top: doors and\nroof off in minutes", x: 40, y: 150, r: -3, ar: "M405 176C430 186 446 200 452 222", end: [452, 222, 70] },
  { a: .32, b: .40, t: "hand-welded frame, every one", x: 40, y: 955, r: 0, ar: "M505 905C525 820 575 735 618 670", end: [618, 670, -57] },
  { a: .40, b: .48, t: "long-travel\nsuspension", x: 1660, y: 600, r: -2, ar: "M1652 626C1638 634 1626 646 1614 662", end: [1614, 662, 128] },
  { a: .46, b: .54, t: "winch-ready bumper", x: 1560, y: 250, r: 3, ar: "M1688 280C1700 360 1662 468 1592 514", end: [1592, 514, 145] },
  { a: .52, b: .58, t: "12.1 in of clearance", x: 1262, y: 955, r: 0, ar: "M1232 700V880M1216 700H1248M1216 880H1248", end: null },
  { a: .06, b: .14, t: "Cairn 01  ·  sketch no. 001  ·  1:20", x: 40, y: 60, r: 0, ar: "M38 74C220 82 440 80 660 72", end: null },
  { a: .66, b: .72, t: "now hover over the sketch", x: 1240, y: 60, r: -3, ar: "M1480 86C1470 130 1400 170 1310 196", end: [1310, 196, 160] }
];
(function(){
  let s = "";
  HD_NOTES.forEach((n, k) => {
    let head = "";
    if (n.end){ const [ex, ey, ang] = n.end; [152, -152].forEach(d => { const q = (ang + d) * Math.PI / 180; head += `M${ex} ${ey}L${(ex + Math.cos(q) * 26).toFixed(1)} ${(ey + Math.sin(q) * 26).toFixed(1)}`; }); }
    s += `<g id="hdN${k}"><text x="${n.x}" y="${n.y}" transform="rotate(${n.r} ${n.x} ${n.y})">${n.t.split("\n").map((l, i) => `<tspan x="${n.x}" dy="${i ? 50 : 0}">${l}</tspan>`).join("")}</text><path pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="${n.ar}${head}"/></g>`;
  });
  hdNotes.innerHTML = s;
  HD_NOTES.forEach((n, k) => { n.g = $("hdN" + k); n.p = n.g.querySelector("path"); });
})();

/* hover reveal: the pointer is eased so it glides, and paints an organic, torn-edged trail; the real vehicle shows through the trail,
   the trail widens and stretches with speed, and it dissolves slowly once you stop. */
const RW = 800, RH = 388, MA = new Float32Array(RW * RH), mc = document.createElement("canvas");
mc.width = RW; mc.height = RH;
const mctx = mc.getContext("2d"), mimg = mctx.createImageData(RW, RH), mu = new Uint32Array(mimg.data.buffer);
const PT = { tx: RW / 2, ty: RH * .55, ex: RW / 2, ey: RH * .55, px: 0, py: 0, pace: 0, inside: false, moved: false, seed: 0, demo: -1, dstart: false };
hdStick.addEventListener("pointermove", e => {
  const r = hdArt.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  PT.inside = fx > -.03 && fx < 1.03 && fy > -.06 && fy < 1.06; PT.tx = fx * RW; PT.ty = fy * RH;
  if (!PT.moved){ PT.moved = true; PT.ex = PT.tx; PT.ey = PT.ty; }
});
hdStick.addEventListener("pointerleave", () => { PT.inside = false; });
function hdStamp(cx, cy, ang, R, st, seed){
  const ca = Math.cos(ang), sa = Math.sin(ang), RM = Math.ceil(R * st * 1.6) + 2, narrow = 1 / (1 + .3 * (st - 1));
  const x0 = Math.max(0, (cx - RM) | 0), x1 = Math.min(RW - 1, (cx + RM) | 0), y0 = Math.max(0, (cy - RM) | 0), y1 = Math.min(RH - 1, (cy + RM) | 0);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    const dx = x - cx, dy = y - cy, u = (dx * ca + dy * sa) / st, v = (-dx * sa + dy * ca) / narrow, d = Math.hypot(u, v);
    if (d > R * 1.5) continue;
    const th = Math.atan2(v, u), r = R * (1 + .32 * Math.sin(3 * th + seed) + .22 * Math.sin(5 * th + seed * 1.7) + .12 * Math.sin(9 * th + seed * 2.3)), val = 1 - d / r;
    if (val > 0){ const i = y * RW + x; if (val > MA[i]) MA[i] = val; }
  }
}
function hdReveal(ms){
  const dt = Math.min(64, Math.max(1, ms - (HD.t || ms))); HD.t = ms;
  let tx = PT.tx, ty = PT.ty, live = PT.inside && PT.moved;
  if (!PT.moved){                                                    /* until you move, a slow demo pass shows what it does */
    if (PT.demo < 0) PT.demo = ms;
    const u = (ms - PT.demo) / 3600;
    if (u < 1){ tx = (.26 + .5 * u) * RW; ty = (.58 - .13 * Math.sin(u * Math.PI * 2.4)) * RH; live = true; if (!PT.dstart){ PT.dstart = true; PT.ex = tx; PT.ey = ty; } }
  }
  PT.px = PT.ex; PT.py = PT.ey;
  const k = 1 - Math.exp(-dt / 1000 * 7); PT.ex += (tx - PT.ex) * k; PT.ey += (ty - PT.ey) * k;     /* soft, gliding follow */
  const dist = Math.hypot(PT.ex - PT.px, PT.ey - PT.py), speed = dist / dt * 16;
  PT.pace += (speed - PT.pace) * (1 - Math.exp(-dt / 1000 * 2.2));                                    /* size follows how fast you move */
  if (live && dist > .15){
    const ang = Math.atan2(PT.ey - PT.py, PT.ex - PT.px), R = 19 + Math.min(PT.pace, 6) * 4, st = 1 + Math.min(PT.pace * .4, 1.9), n = Math.max(1, Math.ceil(dist / 5));
    for (let q = 1; q <= n; q++){ const f = q / n; hdStamp(lerp(PT.px, PT.ex, f), lerp(PT.py, PT.ey, f), ang, R, st, PT.seed); PT.seed += .17; }
  }
  const dec = Math.pow(.16, dt / 2600); let any = false;                                              /* it dissolves about 2.5 seconds after you stop */
  for (let i = 0; i < MA.length; i++){
    let a = MA[i];
    if (a > .004){ a *= dec; MA[i] = a; const s = a < .26 ? 0 : a > .38 ? 1 : (a - .26) / .12; mu[i] = s > 0 ? ((((s * 255) | 0) << 24) | 0xffffff) >>> 0 : 0; any = true; }
    else { MA[i] = 0; mu[i] = 0; }
  }
  if (any || HD.any){
    const W = hdRev.width, H = hdRev.height;
    mctx.putImageData(mimg, 0, 0);
    revCtx.globalCompositeOperation = "source-over"; revCtx.clearRect(0, 0, W, H); revCtx.drawImage(HD.col, 0, 0, W, H);
    revCtx.globalCompositeOperation = "destination-in"; revCtx.drawImage(mc, 0, 0, W, H); revCtx.globalCompositeOperation = "source-over";
  }
  HD.any = any;
}

const hdPts = (p, pts) => { for (let i = 0; i < pts.length - 1; i++){ const a = pts[i], b = pts[i + 1]; if (p <= b[0]) return lerp(a[1], b[1], ss(a[0], b[0], p)); } return pts[pts.length - 1][1]; };
function handsTick(ms){
  const p = prog(hd), dpr = Math.min(devicePixelRatio || 1, 1.5), cw = Math.round(hdArt.clientWidth * dpr);
  if (cw && hdRev.width !== cw){ hdRev.width = cw; hdRev.height = Math.round(hdArt.clientHeight * dpr); HD.any = true; }
  const hdT = hdStick.querySelector(".hd-title"), hOn = p > .03; if (hOn !== hdT.classList.contains("on")) hdT.classList.toggle("on", hOn);
  hdDrawInk(hdPts(p, [[0, 0], [.05, .03], [.58, 1], [1, 1]]));                 /* the sketch draws itself, guides first, then the vehicle, then the ground */
  HD_NOTES.forEach(n => { const t = ss(n.a, n.b, p); n.g.style.opacity = Math.min(1, t * 3).toFixed(3); n.p.style.strokeDashoffset = (1 - t).toFixed(3); });
  const on = ss(.58, .66, p);                                                    /* hover reveal switches on once the sketch is done */
  hdRev.style.opacity = on.toFixed(3);
  if (on > .01) hdReveal(ms || performance.now());
}

/* ---------- 08 return ---------- */
$("resForm").addEventListener("submit", e => { e.preventDefault(); $("rtForm").classList.add("sent"); });

/* ---------- founder sketch: pencil lines appear from the face outward as Founded scrolls in ---------- */
const fskCv = $("fskCv"), fskCtx = fskCv.getContext("2d"), fskName = $("fskName");
const FS = { A: null, K: null, buf: null, q: -1 };
const fskImg = new Image();
fskImg.onload = () => {
  const c = document.createElement("canvas"); c.width = fskImg.width; c.height = fskImg.height;
  const x = c.getContext("2d"); x.drawImage(fskImg, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, n = c.width * c.height;
  FS.A = new Uint8Array(n); FS.K = new Uint16Array(n);
  for (let i = 0; i < n; i++){ FS.A[i] = d[i * 4]; FS.K[i] = d[i * 4 + 1] * 256 + d[i * 4 + 2]; }
  fskCv.width = c.width; fskCv.height = c.height;
  FS.buf = fskCtx.createImageData(c.width, c.height);
};
fskImg.src = "img/founder-pencil.png?v=1";
function fskDraw(q){
  if (!FS.A || Math.abs(q - FS.q) < .004) return;
  FS.q = q;
  const o = FS.buf.data, A = FS.A, K = FS.K, T = ss(0, .86, q) * 65535;    /* the portrait is drawn line by line, then signed */
  for (let i = 0; i < A.length; i++){
    const v = A[i] ? clamp((T - K[i]) / 90) : 0;
    o[i * 4] = o[i * 4 + 1] = o[i * 4 + 2] = 27; o[i * 4 + 3] = A[i] * v;
  }
  if (q > .9 && !sigStart) sigStart = performance.now() + 200;
  fskCtx.putImageData(FS.buf, 0, 0);
  fskName.style.clipPath = `inset(0 ${((1 - ss(.82, 1, q)) * 100).toFixed(1)}% 0 0)`;
}
/* ---------- founder signature: one continuous pen stroke; slower and heavier in the turns, fast and thin on the sweeps ---------- */
const SIG_KEYS = [[40,58],[66,226],[106,110],[146,224],[186,96],[198,214],[212,166],[234,170],[248,212],[274,196],[302,166],[292,148],[276,170],[288,212],[320,202],[338,166],[346,212],[360,172],[384,166],[396,212],[382,262],[298,294],[174,302],[88,288],[104,260],[242,242],[442,196],[602,134]];
const SIG = (() => {
  const P = SIG_KEYS, pts = [];
  for (let i = 0; i < P.length - 1; i++){
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let s = 0; s < 24; s++){
      const t = s / 24, t2 = t * t, t3 = t2 * t;
      pts.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  pts.push(P[P.length - 1]);
  const n = pts.length, L = [0], V = [], W = [], T = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[n - 1], tailFrom = L[pts.findIndex((p, i) => i > n * .7 && p[0] > 120 && p[1] < 270) || n - 1];
  for (let i = 0; i < n; i++){
    const a = pts[Math.max(0, i - 3)], b = pts[i], c = pts[Math.min(n - 1, i + 3)];
    const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let turn = Math.abs(a2 - a1); if (turn > Math.PI) turn = 2 * Math.PI - turn;
    let v = 1 / (1 + 5.5 * turn);
    v *= .35 + .65 * ss(0, 30, L[i]);                       /* the pen eases into the first stroke */
    if (L[i] > tailFrom) v *= 1.9;                          /* the final flick is quick */
    V.push(v);
  }
  for (let i = 1; i < n; i++) T.push(T[i - 1] + (L[i] - L[i - 1]) / Math.max(.05, (V[i] + V[i - 1]) / 2));
  const k = 2.1 / T[n - 1]; for (let i = 0; i < n; i++) T[i] *= k;
  const vmax = Math.max(...V);
  for (let i = 0; i < n; i++){
    const taper = Math.min(1, .35 + .65 * ss(0, 14, L[i])) * Math.min(1, .25 + .75 * ss(0, 60, total - L[i]));
    W.push((4.2 + 7.6 * Math.pow(1 - V[i] / vmax, .8)) * taper);
  }
  for (let r = 0; r < 3; r++) for (let i = 1; i < n - 1; i++) W[i] = (W[i - 1] + W[i] * 2 + W[i + 1]) / 4;
  return { pts, T, W, n };
})();
const sigCv = $("sigCv"), sigCtx = sigCv.getContext("2d");
let sigStart = 0, sigDone = 0, sigSize = 0;
function sigTick(now){
  const w = sigCv.clientWidth;
  if (w && w !== sigSize){ sigSize = w; const d = Math.min(2, devicePixelRatio || 1); sigCv.width = Math.round(w * d); sigCv.height = Math.round(w * 340 / 640 * d); sigDone = 0; sigCtx.clearRect(0, 0, sigCv.width, sigCv.height); }
  if (!sigStart || now < sigStart) return;
  const t = reduce ? 99 : (now - sigStart) / 1000;
  const s = sigCv.width / 640, { pts, T, W, n } = SIG;
  sigCtx.strokeStyle = "#1b1b1b"; sigCtx.lineCap = "round"; sigCtx.lineJoin = "round";
  while (sigDone < n - 1 && T[sigDone + 1] <= t){
    const i = sigDone + 1;
    sigCtx.lineWidth = W[i] * s * .55;
    sigCtx.beginPath(); sigCtx.moveTo(pts[i - 1][0] * s, pts[i - 1][1] * s); sigCtx.lineTo(pts[i][0] * s, pts[i][1] * s); sigCtx.stroke();
    sigDone = i;
  }
}


/* ---------- hero 4: the campfire keeps burning on its own ----------
   The film is scrubbed by the scroll, so on its own the fire freezes when you stop. A live layer sits on top of it:
   a flickering glow and sparks that rise from the fire, placed with the camera (hand-placed keys every 24 frames). */
const FIRE_KEYS = [  /* frame, x, y (share of the 1920x1080 picture), fire size (share of width), how much of the flame is in view */
  [0, .669, .470, .020, 1], [24, .673, .470, .020, 1], [48, .669, .474, .021, 1], [72, .640, .481, .022, 1],
  [96, .625, .446, .022, .55], [120, .552, .500, .026, 1], [144, .506, .507, .027, 1], [168, .492, .515, .026, .7],
  [192, .463, .463, .026, .5], [216, .458, .463, .026, .5], [240, .465, .463, .028, .8], [264, .469, .463, .027, .7],
  [288, .496, .446, .025, .5], [312, .483, .446, .025, .45], [336, .490, .446, .024, .45], [360, .479, .452, .024, .45]];
const fx = $("fx"), fxc = fx && fx.getContext("2d"), sparks = [];
let fxLast = 0, fxW = 0, fxH = 0;
function fireAt(f){
  let k = 0; while (k < FIRE_KEYS.length - 2 && FIRE_KEYS[k + 1][0] <= f) k++;
  const A = FIRE_KEYS[k], B = FIRE_KEYS[k + 1], u = clamp((f - A[0]) / (B[0] - A[0]));
  return [1, 2, 3, 4].map(j => A[j] + (B[j] - A[j]) * u);
}
const nz = t => Math.sin(t * 7.3) * .35 + Math.sin(t * 13.1 + 1.7) * .25 + Math.sin(t * 23.7 + .4) * .15;   /* fire-like flicker */
function fireTick(t){
  if (!fx) return;
  if (HERO !== 4){ if (fx.style.display !== "none") fx.style.display = "none"; return; }
  const dt = Math.min(.05, (t - (fxLast || t)) / 1000); fxLast = t;
  const vis = seq.getBoundingClientRect().bottom > 0 && shown >= 0;
  if (fx.width !== cw || fx.height !== ch){ fx.width = fxW = cw; fx.height = fxH = ch; }
  fxc.clearRect(0, 0, fxW, fxH);
  if (!vis) return;
  const [nx, ny, sz, on] = fireAt(shown);
  const s = Math.max(fxW / 1920, fxH / 1080), ox = (fxW - 1920 * s) / 2, oy = (fxH - 1080 * s) / 2;
  const X = ox + nx * 1920 * s, Y = oy + ny * 1080 * s, R = sz * 1920 * s, ts = t / 1000, fl = .78 + .22 * nz(ts);
  fx.style.opacity = (1 - +$("fade").style.opacity).toFixed(3);
  fxc.globalCompositeOperation = "lighter";
  /* warm light breathing on the ground, the jeeps and the people */
  let g = fxc.createRadialGradient(X, Y, 0, X, Y, R * 4.2);
  g.addColorStop(0, `rgba(255,140,50,${(.16 * fl * (.5 + .5 * on)).toFixed(3)})`); g.addColorStop(1, "rgba(255,110,30,0)");
  fxc.fillStyle = g; fxc.fillRect(X - R * 4.2, Y - R * 4.2, R * 8.4, R * 8.4);
  /* the flame itself flickering */
  const fy = Y - R * .35;
  g = fxc.createRadialGradient(X, fy, 0, X, fy, R * 1.1);
  g.addColorStop(0, `rgba(255,200,110,${(.42 * fl * on).toFixed(3)})`); g.addColorStop(.5, `rgba(255,120,40,${(.18 * fl * on).toFixed(3)})`); g.addColorStop(1, "rgba(255,90,20,0)");
  fxc.save(); fxc.translate(X, fy); fxc.scale(.75, 1.25 + .15 * nz(ts * 1.3)); fxc.translate(-X, -fy);
  fxc.fillStyle = g; fxc.fillRect(X - R * 1.2, fy - R * 1.2, R * 2.4, R * 2.4); fxc.restore();
  /* sparks: born in the fire, kept in picture space so they travel with the camera */
  if (!reduce){
    let n = dt * 26 * (.4 + .6 * on); while (n > 0){ if (Math.random() < n) sparks.push({ x: (Math.random() - .5) * .9, y: -.2, vx: (Math.random() - .5) * .5, vy: -(1.1 + Math.random() * 1.6), l: 0, L: .9 + Math.random() * 1.6, r: .5 + Math.random() * .9, p: Math.random() * 6 }); n--; }
  }
  for (let i = sparks.length - 1; i >= 0; i--){
    const p = sparks[i]; p.l += dt; if (p.l > p.L){ sparks.splice(i, 1); continue; }
    p.x += (p.vx + Math.sin(ts * 3 + p.p) * .35) * dt; p.y += p.vy * dt; p.vy *= 1 - dt * .35;
    const a = (1 - p.l / p.L) * Math.min(1, p.l * 6), px = X + p.x * R, py = Y + p.y * R, rr = Math.max(.6, p.r * s * 2.2);
    fxc.fillStyle = `rgba(255,${(150 + 60 * (1 - p.l / p.L)) | 0},70,${(a * .95).toFixed(3)})`;
    fxc.beginPath(); fxc.arc(px, py, rr, 0, 6.283); fxc.fill();
  }
  fxc.globalCompositeOperation = "source-over";
}

/* ---------- master loop ---------- */
const bar = $("bar");
function tick(t){
  if (lenis) lenis.raf(t);
  heroTick(); fireTick(t);
  bar.style.transform = `scaleX(${clamp(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(4)})`;
  hzTick(); promiseTick(); machineTick(); machine2Tick(); companyTick(); handsTick(t); drawSeams(t); navTick(); seamLabelTick(); sigTick(t); headTick(); sndTick(t); ftDish.tick(t); bandTick(); if ($("reserve").getBoundingClientRect().top < innerHeight * 2) rtFit();
  requestAnimationFrame(tick);
}
/* the opening title is placed against the VIDEO picture (not the window), so it keeps its spot beside the Jeep at any window shape */
function placeTitle(){
  const s = Math.max(innerWidth / 2570, innerHeight / 1438), k = s / .8136;
  const ox = (2570 * s - innerWidth) / 2, oy = (1438 * s - innerHeight) / 2, t0 = $("t0");
  t0.style.setProperty("--k", k.toFixed(4));
  const maxW = Math.max(...$$(".hh-h", t0).map(h => h.offsetWidth));   /* keep the widest heading inside the screen */
  t0.style.left = Math.min(1285 * k - ox, innerWidth - 32 - maxW).toFixed(1) + "px";
  t0.style.top = (128 * k - oy).toFixed(1) + "px";
}
function layout(){ document.documentElement.style.setProperty("--k", clamp(innerWidth / 1440, .82, 1.25).toFixed(3)); size(); hzSize(); placeTitle();  }
addEventListener("resize", layout);
addEventListener("load", layout);
if (document.fonts) document.fonts.ready.then(layout);   /* Founded is as wide as its heading, so measure again once the fonts are in */
layout();
requestAnimationFrame(tick);
