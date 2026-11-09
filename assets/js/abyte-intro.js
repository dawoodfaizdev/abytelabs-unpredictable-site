/*!
 * Abyte Labs studio intro, web edition.
 * A port of the in-game StudioIntro (Unity) and the "Abyte Labs Intro" reference page: every element is a pure
 * function of the time t, with the same beats. A cursor types the name, a honey tile drops in, takes a bite out of
 * itself, and the cursor hops over to become its smile. Code turns into something cozy.
 *
 *   AbyteIntro.play({ variant:"full"|"quick", bg:"night"|"paper", word:["abyte","labs"],
 *                     tagline:["Made with care,","byte","by","byte"], accentLast:true,
 *                     flyTo:".brand-mark", key:"abyte-intro" });
 *   AbyteIntro.ready(function(){ ...start the page's own entrance... });
 *
 * Plays once per browser tab (sessionStorage). Skipped for prefers-reduced-motion, for visitors who paused animations
 * (html.motion-off) and for search/preview bots. A tap, click, key or scroll skips it.
 * While it runs, <html> gets --intro-reveal (0 -> 1 as the veil dissolves) so the page can settle into place under it.
 */
(function (w, d) {
  "use strict";
  var root = d.documentElement;
  var readyCbs = [], isReady = false;
  function fireReady() {
    if (isReady) return; isReady = true;
    root.classList.remove("ab-intro-pending"); root.classList.add("ab-intro-done");
    root.style.setProperty("--intro-reveal", "1");
    readyCbs.splice(0).forEach(function (cb) { try { cb(); } catch (e) { setTimeout(function () { throw e; }); } });
    try { w.dispatchEvent(new CustomEvent("abyte:ready")); } catch (e) {}
  }
  var revealCbs = [], revealed = false;
  function fireReveal() {
    if (revealed) return; revealed = true;
    revealCbs.splice(0).forEach(function (cb) { try { cb(); } catch (e) { setTimeout(function () { throw e; }); } });
  }

  // ---------- the mark (viewBox -10 -10 140 140) ----------
  var FULL = "M32 6H88A26 26 0 0 1 114 32V88A26 26 0 0 1 88 114H32A26 26 0 0 1 6 88V32A26 26 0 0 1 32 6Z";
  var BIT = "M32 6H70V20H84V34H98V48H114V88A26 26 0 0 1 88 114H32A26 26 0 0 1 6 88V32A26 26 0 0 1 32 6Z";
  var C = { honey: "#FFB547", crust: "#F08E3E", shine: "#FFD98C", cocoa: "#3A2321", blush: "#FF8A80", eyeHi: "#FFF8EE" };
  var uid = 0;
  function bodyMarkup(dd, clip) {
    return '<path d="' + dd + '" fill="' + C.honey + '"/>' +
      '<g clip-path="url(#' + clip + ')"><rect x="-10" y="86" width="140" height="44" fill="' + C.crust + '"/></g>' +
      '<rect x="18" y="16" width="34" height="8" rx="4" fill="' + C.shine + '"/><rect x="18" y="29" width="8" height="8" rx="4" fill="' + C.shine + '"/>' +
      '<path d="' + dd + '" fill="none" stroke="' + C.cocoa + '" stroke-width="6" stroke-linejoin="round"/>';
  }
  // A static mark, for headers, footers and favicons. kind: "plain" | "bitten" | "face"
  function markSVG(kind, cls) {
    uid++; var id = "abm" + uid, dd = kind === "plain" ? FULL : BIT;
    var s = '<svg class="' + (cls || "ab-mark") + '" viewBox="-10 -10 140 140" aria-hidden="true" focusable="false" overflow="visible"><defs><clipPath id="' + id + '"><path d="' + dd + '"/></clipPath></defs>' + bodyMarkup(dd, id);
    if (kind === "face") {
      s += '<g class="ab-blush"><ellipse cx="32" cy="77" rx="7.5" ry="4.5" fill="' + C.blush + '" opacity=".55"/><ellipse cx="82" cy="77" rx="7.5" ry="4.5" fill="' + C.blush + '" opacity=".55"/></g>' +
        '<g class="ab-eyes"><rect x="38" y="50" width="11" height="18" rx="5.5" fill="' + C.cocoa + '"/><rect x="64" y="50" width="11" height="18" rx="5.5" fill="' + C.cocoa + '"/>' +
        '<circle cx="45.2" cy="55" r="2.3" fill="' + C.eyeHi + '"/><circle cx="71.2" cy="55" r="2.3" fill="' + C.eyeHi + '"/></g>' +
        '<rect class="ab-mouth" x="49" y="77" width="16" height="5" rx="2.5" fill="' + C.cocoa + '"/>';
    }
    return s + "</svg>";
  }

  // ---------- easing ----------
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function c01(x) { return clamp(x, 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function inOutCubic(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function inOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function outBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function pulse(t, c, wd) { var x = (t - c) / wd; return Math.exp(-x * x); }
  function mix(a, b, t) { return "rgb(" + Math.round(lerp(a[0], b[0], t)) + "," + Math.round(lerp(a[1], b[1], t)) + "," + Math.round(lerp(a[2], b[2], t)) + ")"; }
  var COCOA = [58, 35, 33];

  var PAL = {
    night: { ink: [255, 241, 222], code: [127, 224, 194], labs: "#7FE0C2", tag: "#C9B6C5", shadow: "rgba(0,0,0,.5)", mote: [255, 214, 150], veil: "#120B14",
      bg: "radial-gradient(120% 95% at 50% 46%,#3C2A39 0%,#2A1E2C 46%,#170F19 100%)" },
    paper: { ink: [58, 35, 33], code: [28, 154, 130], labs: "#1C9A82", tag: "#8A6E62", shadow: "rgba(58,35,33,.28)", mote: [120, 80, 60], veil: "#FFF8EE",
      bg: "radial-gradient(120% 95% at 50% 46%,#FFF9F0 0%,#FBEBD7 58%,#F1D9BC 100%)" }
  };
  function timings(variant, nType) {
    if (variant === "quick") return { dur: 1.85, fade: [0, .12], cursorOn: null, drop: [0, .30], chomp: .58, hop: null, eyes: .70, blush: .74, morph: null,
      letters: { start: .36, step: .032, len: .30 }, tag0: .90, tagGap: .6, blinks: [1.70], mouthBlinks: [] };
    // full: the typing stretches if the first word is longer than "abyte"
    var extra = Math.max(0, nType - 5) * .085;
    return { dur: 4.1 + extra, fade: [0, .35], cursorOn: .12, typeStart: .55, typeStep: .085, drop: [1.12 + extra, 1.44 + extra], chomp: 1.80 + extra,
      hop: [1.96 + extra, 2.32 + extra], eyes: 2.32 + extra, blush: 2.36 + extra, morph: [2.26 + extra, 2.78 + extra],
      labs: { start: 2.44 + extra, step: .055, len: .34 }, tag0: 2.82 + extra, tagGap: 1, blinks: [3.95 + extra],
      mouthBlinks: [[2.62 + extra, 2.76 + extra], [2.92 + extra, 3.06 + extra]] };
  }
  var TAG_OFFS = [0, .38, .58, .78];

  var CSS = '' +
    '.ab-intro{position:fixed;inset:0;z-index:2147483000;overflow:hidden;container-type:size;cursor:pointer;-webkit-tap-highlight-color:transparent;contain:strict}' +
    '.ab-intro .ab-bg{position:absolute;inset:0}' +
    '.ab-intro canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '.ab-intro .ab-glow{position:absolute;left:50%;top:50%;width:var(--g);height:var(--g);margin:calc(var(--g)/-2) 0 0 calc(var(--g)/-2);border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,rgba(255,181,71,.24),rgba(255,181,71,0) 70%)}' +
    '.ab-intro .ab-lockup{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:var(--gap);will-change:transform,opacity}' +
    '.ab-intro .ab-slot{position:relative;width:var(--tile);height:var(--tile);flex:none}' +
    '.ab-intro .ab-tile{position:absolute;inset:0;transform-origin:50% 90%;will-change:transform}' +
    '.ab-intro .ab-tile svg{width:100%;height:100%;overflow:visible;display:block}' +
    '.ab-intro .ab-shadow{position:absolute;left:14%;width:72%;top:86%;height:11%;border-radius:50%;background:radial-gradient(closest-side,var(--sh,rgba(0,0,0,.45)),transparent)}' +
    '.ab-intro .ab-words{display:flex;flex-direction:column;gap:var(--wgap);flex:none}' +
    '.ab-intro .ab-wordmark{font-family:var(--ab-font,"Recursive"),ui-rounded,system-ui,sans-serif;font-size:var(--word);line-height:1;white-space:nowrap;font-weight:800;font-variation-settings:"MONO" 0,"CASL" 1;letter-spacing:0}' +
    '.ab-intro .ab-wordmark .ch{display:inline-block;will-change:transform}' +
    '.ab-intro .ab-tagline{font-family:var(--ab-font,"Recursive"),ui-monospace,monospace;font-variation-settings:"MONO" 1,"CASL" 0;font-weight:600;font-size:var(--tag);letter-spacing:.32em;text-transform:uppercase;white-space:nowrap;text-align:center;padding-left:.32em}' +
    '.ab-intro .ab-tagline .tw{display:inline-block;transform-origin:50% 80%;will-change:transform}' +
    '.ab-intro .ab-cursor{position:absolute;left:0;top:0;border-radius:3px;pointer-events:none;will-change:transform}' +
    '.ab-intro .ab-veil{position:absolute;inset:0;pointer-events:none}' +
    '.ab-intro .ab-skip{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));font:600 12px/1 var(--ab-font,"Recursive"),ui-monospace,monospace;font-variation-settings:"MONO" 1;letter-spacing:.14em;text-transform:uppercase;padding:10px 14px;border-radius:999px;border:1px solid currentColor;background:transparent;opacity:.55;cursor:pointer;color:inherit}' +
    '.ab-intro .ab-skip:hover,.ab-intro .ab-skip:focus-visible{opacity:1}' +
    '.ab-intro[data-bg=night]{color:#E9D9E4}.ab-intro[data-bg=paper]{color:#6E544A}' +
    /* landscape: the reference 16:9 stage, centred and fitted */
    '.ab-intro{--u:min(1cqw,1.7778cqh);--tile:calc(16*var(--u));--gap:calc(3.2*var(--u));--word:calc(9.6*var(--u));--tag:calc(1.9*var(--u));--wgap:calc(1.3*var(--u));--g:calc(70*var(--u))}' +
    /* portrait phones: stack it and make it bigger */
    '@container (max-aspect-ratio: 1/1){.ab-intro .ab-lockup{flex-direction:column;--u:min(1cqw,.62cqh);--tile:calc(34*var(--u));--gap:calc(7*var(--u));--word:calc(17*var(--u));--tag:calc(3.15*var(--u));--wgap:calc(3*var(--u))} .ab-intro{--g:150cqw}}';

  function injectCSS() {
    if (d.getElementById("ab-intro-css")) return;
    var st = d.createElement("style"); st.id = "ab-intro-css"; st.textContent = CSS; d.head.appendChild(st);
  }

  function storageGet(k) { try { return w.sessionStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { w.sessionStorage.setItem(k, v); } catch (e) {} }

  function play(o) {
    o = o || {};
    var key = o.key || "abyte-intro";
    var reduce = (w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches) || root.classList.contains("motion-off");
    var bot = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly/i.test(navigator.userAgent || "");
    if (o.force !== true && (storageGet(key) || reduce || bot)) { fireReveal(); fireReady(); return; }
    storageSet(key, "1");
    injectCSS();
    var bg = o.bg === "paper" ? "paper" : "night", P = PAL[bg];
    var word = o.word || ["abyte", "labs"], tagSegsText = o.tagline || ["Made with care,", "byte", "by", "byte"];
    var accentLast = o.accentLast !== false;
    var variant = o.variant === "quick" ? "quick" : "full";
    var V = timings(variant, word[0].length);
    var HOLD = o.hold != null ? o.hold : .65, OUT = o.out != null ? o.out : .45, BGD = o.bgDelay != null ? o.bgDelay : .22, FADE = o.fade != null ? o.fade : .75;
    var SKIP = .32;

    // ---------- build the stage ----------
    var el = d.createElement("div");
    el.className = "ab-intro"; el.setAttribute("data-bg", bg); el.setAttribute("aria-hidden", "true");
    if (o.font) el.style.setProperty("--ab-font", o.font);
    var chHTML = "";
    for (var i = 0; i < word[0].length; i++) chHTML += '<span class="ch nm">' + word[0][i] + "</span>";
    if (word[1]) { chHTML += '<span class="ch sp">&nbsp;</span>'; for (var j = 0; j < word[1].length; j++) chHTML += '<span class="ch labs">' + word[1][j] + "</span>"; }
    var tagHTML = tagSegsText.map(function (t) { return '<span class="tw">' + t + "</span>"; }).join(" ");
    el.innerHTML =
      '<div class="ab-bg" style="background:' + P.bg + '"></div><canvas></canvas><div class="ab-glow"></div>' +
      '<div class="ab-lockup"><div class="ab-slot"><div class="ab-shadow"></div><div class="ab-tile">' +
      '<svg viewBox="-10 -10 140 140" aria-hidden="true"><defs><clipPath id="abiF"><path d="' + FULL + '"/></clipPath><clipPath id="abiB"><path d="' + BIT + '"/></clipPath></defs>' +
      '<g class="b"><g class="gf">' + bodyMarkup(FULL, "abiF") + '</g><g class="gb" style="display:none">' + bodyMarkup(BIT, "abiB") + '</g>' +
      '<g class="bl" opacity="0"><ellipse cx="32" cy="77" rx="7.5" ry="4.5" fill="#FF8A80"/><ellipse cx="82" cy="77" rx="7.5" ry="4.5" fill="#FF8A80"/></g>' +
      '<g class="ey" opacity="0"><rect x="38" y="50" width="11" height="18" rx="5.5" fill="#3A2321"/><rect x="64" y="50" width="11" height="18" rx="5.5" fill="#3A2321"/><circle cx="45.2" cy="55" r="2.3" fill="#FFF8EE"/><circle cx="71.2" cy="55" r="2.3" fill="#FFF8EE"/></g>' +
      '<rect class="mo" x="49" y="77" width="16" height="5" rx="2.5" fill="#3A2321" opacity="0"/></g><g class="cr"></g></svg></div></div>' +
      '<div class="ab-words"><div class="ab-wordmark">' + chHTML + '</div><div class="ab-tagline">' + tagHTML + '</div></div></div>' +
      '<div class="ab-cursor"></div><div class="ab-veil" style="background:' + P.veil + '"></div>' +
      '<button type="button" class="ab-skip">Skip intro</button>';
    d.body.appendChild(el);
    root.classList.remove("ab-intro-pending");
    root.classList.add("ab-intro-playing");
    root.style.setProperty("--intro-reveal", "0");

    var q = function (s) { return el.querySelector(s); };
    var bgEl = q(".ab-bg"), mc = q("canvas"), glow = q(".ab-glow"), lockup = q(".ab-lockup"), slot = q(".ab-slot"), tile = q(".ab-tile"), shadow = q(".ab-shadow");
    var words = q(".ab-words"), wordmark = q(".ab-wordmark"), tagline = q(".ab-tagline"), cursor = q(".ab-cursor"), veil = q(".ab-veil"), skipBtn = q(".ab-skip");
    var bodyG = q(".b"), gFull = q(".gf"), gBit = q(".gb"), eyes = q(".ey"), blush = q(".bl"), mouth = q(".mo"), crumbsG = q(".cr");
    var chars = [].slice.call(wordmark.querySelectorAll(".ch"));
    var nameChars = chars.filter(function (c) { return c.classList.contains("nm"); });
    var labsChars = chars.filter(function (c) { return c.classList.contains("labs"); });
    var allVisible = chars.filter(function (c) { return !c.classList.contains("sp"); });
    var tagSegs = [].slice.call(tagline.querySelectorAll(".tw"));
    var nType = nameChars.length;

    var CRUMBS = [{ vx: 90, vy: -235, s: 15, w: 420 }, { vx: 165, vy: -150, s: 12, w: -520 }, { vx: 55, vy: -290, s: 10, w: 610 }, { vx: 200, vy: -60, s: 8, w: -380 }];
    var crumbEls = CRUMBS.map(function (k) {
      var r = d.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("width", k.s); r.setAttribute("height", k.s); r.setAttribute("rx", 1.6);
      r.setAttribute("fill", C.honey); r.setAttribute("stroke", C.cocoa); r.setAttribute("stroke-width", 3); r.setAttribute("opacity", 0);
      crumbsG.appendChild(r); return r;
    });
    function tagStart(i) { return V.tag0 + TAG_OFFS[Math.min(i, 3)] * V.tagGap; }
    function chimeAt() { return tagStart(Math.max(0, tagSegs.length - 1)) + 0.06; }

    // ---------- layout ----------
    var L = null;
    function setVar(m, c, wt) { wordmark.style.fontVariationSettings = '"MONO" ' + m + ',"CASL" ' + c; wordmark.style.fontWeight = wt; }
    function layout() {
      lockup.style.transform = ""; slot.style.transform = "";
      var sr = el.getBoundingClientRect(), W = sr.width, Hh = sr.height;
      words.style.width = ""; wordmark.style.paddingLeft = "0px";
      setVar(0, 1, 800);
      var finalW = wordmark.scrollWidth;
      tagline.style.width = "max-content";
      var tagW = tagline.getBoundingClientRect().width; tagline.style.width = "";
      var boxW = Math.ceil(Math.max(finalW, tagW) + 2);
      words.style.width = boxW + "px";
      wordmark.style.paddingLeft = Math.max(0, (boxW - finalW) / 2).toFixed(2) + "px";
      if (V.hop) setVar(1, 0, 520);
      nameChars.forEach(function (ch) { ch.style.transform = ""; });
      var fs = parseFloat(getComputedStyle(wordmark).fontSize);
      var edges = [], top = 0;
      nameChars.forEach(function (ch, k) {
        var r = ch.getBoundingClientRect();
        if (k === 0) { edges.push(r.left - sr.left); top = r.top - sr.top; }
        edges.push(r.right - sr.left);
      });
      var slr = slot.getBoundingClientRect(), size = slr.width;
      L = { W: W, H: Hh, S: Math.max(size * 3.9, Math.min(W, Hh * 1.7778)), fs: fs, edges: edges, baseY: top + fs * 0.80, cw: fs * 0.50, ch: Math.max(2, fs * 0.075),
        mx: slr.left - sr.left + (57 + 10) / 140 * size, my: slr.top - sr.top + (79.5 + 10) / 140 * size, mw: 16 / 140 * size, mh: 5 / 140 * size, size: size,
        slotX: slr.left - sr.left, slotY: slr.top - sr.top };
      sizeMotes();
    }

    // ---------- one frame ----------
    function render(t) {
      if (!L) return;
      var idle = Math.max(0, t - V.dur), S = L.S;
      veil.style.opacity = 1 - outCubic(c01((t - V.fade[0]) / (V.fade[1] - V.fade[0])));
      var d0 = V.drop[0], d1 = V.drop[1], Hd = Math.max(S * 0.62, L.slotY + L.size * 1.2), y = 0, sx = 1, sy = 1, tileOn = t >= d0;
      if (t < d1) { var p = c01((t - d0) / (d1 - d0)); y = -Hd * (1 - p * p); sy = 1 + 0.14 * p; sx = 1 - 0.09 * p; }
      else { var dt = t - d1, k = Math.exp(-8.5 * dt) * Math.cos(17 * dt); sy = 1 - 0.24 * k; sx = 1 + 0.20 * k; }
      var bob = Math.sin(idle * 2 * Math.PI / 2.6) * S * 0.0025 * c01(idle / 0.6);
      if (tagSegs.length > 1) {
        var hz = t - tagStart(tagSegs.length - 1) - 0.04;
        if (hz > 0 && hz < 0.30) { var hp2 = hz / 0.30; y -= S * 0.02 * 4 * hp2 * (1 - hp2); sy *= 1 + 0.06 * Math.sin(hp2 * Math.PI); sx *= 1 - 0.04 * Math.sin(hp2 * Math.PI); }
        else if (hz >= 0.30 && hz < 0.6) { var kk = Math.exp(-14 * (hz - 0.30)) * Math.cos(22 * (hz - 0.30)); sy *= 1 - 0.07 * kk; sx *= 1 + 0.06 * kk; }
      }
      tile.style.opacity = tileOn ? 1 : 0;
      tile.style.transform = "translateY(" + (y - bob).toFixed(2) + "px) scale(" + sx.toFixed(4) + "," + sy.toFixed(4) + ")";
      var fallP = t < d1 ? c01((t - d0) / (d1 - d0)) : 1;
      shadow.style.setProperty("--sh", P.shadow);
      shadow.style.opacity = tileOn ? (0.25 + 0.75 * fallP * fallP).toFixed(3) : 0;
      shadow.style.transform = "scale(" + ((0.35 + 0.65 * fallP * fallP) * sx * (1 - bob / (S * 0.02))).toFixed(4) + "," + (0.9 + 0.1 * fallP).toFixed(3) + ")";

      var bitten = t >= V.chomp, dc = t - V.chomp;
      gFull.style.display = bitten ? "none" : ""; gBit.style.display = bitten ? "" : "none";
      var rot = bitten ? -7 * Math.exp(-12 * dc) * Math.cos(28 * dc) : 0;
      bodyG.setAttribute("transform", "rotate(" + rot.toFixed(3) + " 60 112)");
      crumbEls.forEach(function (ce, ci) {
        var kc = CRUMBS[ci];
        if (!bitten || dc > 1.2) { ce.setAttribute("opacity", 0); return; }
        var x = 98 + kc.vx * dc, yy = 20 + kc.vy * dc + 0.5 * 620 * dc * dc;
        ce.setAttribute("x", x - kc.s / 2); ce.setAttribute("y", yy - kc.s / 2);
        ce.setAttribute("transform", "rotate(" + (kc.w * dc).toFixed(1) + " " + x.toFixed(2) + " " + yy.toFixed(2) + ")");
        ce.setAttribute("opacity", dc < .42 ? 1 : c01(1 - (dc - .42) / .36));
      });

      var eyeS = 0, eyesOn = t >= V.eyes;
      if (eyesOn) eyeS = 0.1 + 0.9 * outBack(c01((t - V.eyes) / 0.24));
      var blinks = V.blinks.slice();
      if (idle > 0) { var nb = Math.floor((idle - 1.0) / 3.4); for (var b = 0; b <= nb; b++) blinks.push(V.dur + 1.0 + b * 3.4); }
      blinks.forEach(function (bt) { var a = Math.abs(t - bt - 0.07); if (a < 0.07) eyeS = Math.min(eyeS, 0.12 + (a / 0.07) * 0.88); });
      var look = V.morph ? 2.6 * pulse(t, (V.morph[0] + V.morph[1]) / 2 + 0.15, 0.35) : 2.6 * pulse(t, V.letters.start + 0.25, 0.3);
      eyes.setAttribute("opacity", eyesOn ? 1 : 0);
      eyes.setAttribute("transform", "translate(" + look.toFixed(2) + ",59) scale(1," + eyeS.toFixed(3) + ") translate(0,-59)");
      blush.setAttribute("opacity", (0.55 * c01((t - V.blush) / 0.3)).toFixed(3));

      var mouthOn = false;
      if (V.hop) {
        var h0 = V.hop[0], h1 = V.hop[1], ts = V.typeStart, typedN = 0;
        for (var n = 0; n < nType; n++) if (t >= ts + n * V.typeStep) typedN = n + 1;
        var codeCol = P.code;
        if (t < V.cursorOn || t >= h1) cursor.style.opacity = 0;
        else if (t < h0) {
          var typing = t >= ts && t < ts + nType * V.typeStep + 0.08;
          var on = typing || (Math.floor((t - V.cursorOn) / 0.27) % 2 === 0);
          var cx = L.edges[typedN] + L.cw * 0.62;
          cursor.style.opacity = on ? 1 : 0;
          cursor.style.width = L.cw + "px"; cursor.style.height = L.ch + "px"; cursor.style.background = mix(codeCol, codeCol, 0);
          cursor.style.transform = "translate(" + (cx - L.cw / 2).toFixed(2) + "px," + (L.baseY - L.ch / 2).toFixed(2) + "px)";
        } else {
          var hp = c01((t - h0) / (h1 - h0)), e = inOutSine(hp);
          var sx0 = L.edges[nType] + L.cw * 0.62, sy0 = L.baseY;
          var x2 = lerp(sx0, L.mx, e), yy2 = lerp(sy0, L.my, e) - S * 0.15 * 4 * e * (1 - e);
          var wc = lerp(L.cw, L.mw, e), hc = lerp(L.ch, L.mh, e), r = -360 * e;
          cursor.style.opacity = 1; cursor.style.width = wc + "px"; cursor.style.height = hc + "px"; cursor.style.background = mix(codeCol, COCOA, c01((e - 0.55) / 0.45));
          cursor.style.transform = "translate(" + (x2 - wc / 2).toFixed(2) + "px," + (yy2 - hc / 2).toFixed(2) + "px) rotate(" + r.toFixed(1) + "deg)";
        }
        mouthOn = t >= h1;
        var landed = t - h1;
        mouth.setAttribute("transform", mouthOn ? "translate(57,79.5) scale(" + (1 + 0.35 * Math.exp(-14 * landed)).toFixed(3) + "," + (1 - 0.4 * Math.exp(-14 * landed)).toFixed(3) + ") translate(-57,-79.5)" : "");
        nameChars.forEach(function (ch, ni) {
          var ti = ts + ni * V.typeStep, on2 = t >= ti, qq = c01((t - ti) / 0.08);
          ch.style.opacity = on2 ? 1 : 0;
          ch.style.transform = "translateY(" + ((1 - outCubic(qq)) * -0.05).toFixed(3) + "em)";
        });
        var mp = inOutCubic(c01((t - V.morph[0]) / (V.morph[1] - V.morph[0])));
        setVar((1 - mp).toFixed(3), mp.toFixed(3), Math.round(520 + 280 * mp));
        var nameCol = mix(P.code, P.ink, mp);
        nameChars.forEach(function (ch) { ch.style.color = nameCol; });
        labsChars.forEach(function (ch, li) {
          var ti = V.labs.start + li * V.labs.step, ql = c01((t - ti) / V.labs.len);
          ch.style.color = P.labs; ch.style.opacity = c01(ql * 3);
          ch.style.transform = "translateY(" + ((1 - outCubic(ql)) * 0.3).toFixed(3) + "em) scale(" + Math.max(0, outBack(ql)).toFixed(3) + ")";
        });
      } else {
        cursor.style.opacity = 0;
        mouthOn = t >= V.eyes;
        var lm = t - V.eyes;
        mouth.setAttribute("transform", mouthOn ? "translate(57,79.5) scale(" + (1 + 0.35 * Math.exp(-14 * lm)).toFixed(3) + "," + (1 - 0.4 * Math.exp(-14 * lm)).toFixed(3) + ") translate(-57,-79.5)" : "");
        allVisible.forEach(function (ch, ai) {
          var ti = V.letters.start + ai * V.letters.step, qa = c01((t - ti) / V.letters.len);
          ch.style.color = ch.classList.contains("labs") ? P.labs : mix(P.ink, P.ink, 0);
          ch.style.opacity = c01(qa * 3);
          ch.style.transform = "translateY(" + ((1 - outCubic(qa)) * 0.3).toFixed(3) + "em) scale(" + Math.max(0, outBack(qa)).toFixed(3) + ")";
        });
      }
      var mo = mouthOn ? 1 : 0;
      V.mouthBlinks.forEach(function (iv) { if (t >= iv[0] && t < iv[1]) mo = 0.2; });
      mouth.setAttribute("opacity", mo);

      tagSegs.forEach(function (te, i2) {
        var st = tagStart(i2);
        te.style.color = (accentLast && i2 === tagSegs.length - 1 && tagSegs.length > 1) ? P.labs : P.tag;
        if (i2 === 0) { var e0 = outCubic(c01((t - st) / 0.34)); te.style.opacity = e0.toFixed(3); te.style.transform = "translateY(" + ((1 - e0) * 0.8).toFixed(3) + "em)"; }
        else { var q2 = c01((t - st) / 0.24); te.style.opacity = c01(q2 * 3).toFixed(3); te.style.transform = "translateY(" + ((1 - outCubic(q2)) * 0.6).toFixed(3) + "em) scale(" + Math.max(0, outBack(q2)).toFixed(3) + ")"; }
      });

      var g = 0.55 + 0.35 * pulse(t, d1, .22) + 0.3 * pulse(t, V.chomp, .2) + 0.5 * pulse(t, chimeAt() + .15, .45) + 0.06 * Math.sin(idle * 1.4);
      glow.style.opacity = clamp(g, 0, 1.3).toFixed(3);
      glow.style.transform = "scale(" + (0.92 + 0.08 * c01(g)).toFixed(3) + ")";
    }

    // ---------- dust motes ----------
    var mctx = mc.getContext("2d"), motes = [], dpr = 1;
    function sizeMotes() {
      dpr = Math.min(2, w.devicePixelRatio || 1);
      mc.width = Math.round(L.W * dpr); mc.height = Math.round(L.H * dpr);
      if (!motes.length) for (var mi = 0; mi < 48; mi++) motes.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, v: 0.010 + Math.random() * 0.022, ph: Math.random() * 6.28, sw: 0.004 + Math.random() * 0.01 });
    }
    function drawMotes(now, alpha) {
      if (!L) return;
      var cw = mc.width, chh = mc.height, col = P.mote, sec = now / 1000;
      mctx.clearRect(0, 0, cw, chh);
      motes.forEach(function (m) {
        var yv = ((m.y - sec * m.v) % 1 + 1) % 1, xv = m.x + Math.sin(sec * 0.6 + m.ph) * m.sw;
        var a = (0.10 + 0.22 * (0.5 + 0.5 * Math.sin(sec * 1.3 + m.ph * 3))) * (bg === "paper" ? 0.55 : 1) * alpha;
        var s = m.s * L.S / 900 * dpr * 2.2;
        mctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + a.toFixed(3) + ")";
        mctx.fillRect(xv * cw - s / 2, yv * chh - s / 2, s, s);
      });
    }

    // ---------- the ending: the logo leaves (or flies home to the header), the night dissolves into the page ----------
    var target = null, flyRect = null;
    if (o.flyTo) { try { target = d.querySelector(o.flyTo); } catch (e) {} }
    function measureTarget() {
      if (!target) return null;
      var r = target.getBoundingClientRect();
      if (r.width < 4 || r.bottom < 0 || r.top > L.H) return null;
      return r;
    }
    var endStart = -1, endDur = OUT, bgStart = -1, bgDur = FADE, done = false, skipped = false;
    function beginEnding(t, quick) {
      if (endStart >= 0 && !quick) return;
      endStart = t; endDur = quick ? SKIP : OUT; bgStart = t + (quick ? 0.06 : BGD); bgDur = quick ? SKIP : FADE;
      flyRect = quick ? null : measureTarget();
      if (flyRect) { endDur = 0.78; bgStart = t + 0.12; bgDur = 0.86; }
      if (target) target.classList.add("ab-hidden-for-intro");
      fireReveal();
    }
    function renderEnding(t) {
      if (endStart < 0) return;
      var pe = c01((t - endStart) / endDur), pb = c01((t - bgStart) / bgDur), eb = smooth(pb);
      if (flyRect) {
        // the tile flies to the header mark on an arc; the words and glow fade
        var e = inOutCubic(pe), sr = L, fromX = sr.slotX + sr.size / 2, fromY = sr.slotY + sr.size / 2;
        var toX = flyRect.left + flyRect.width / 2, toY = flyRect.top + flyRect.height / 2, sc = flyRect.width / sr.size;
        var x = lerp(0, toX - fromX, e), y = lerp(0, toY - fromY, e) - Math.min(L.H * 0.12, 120) * 4 * e * (1 - e);
        slot.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) scale(" + lerp(1, sc, e).toFixed(4) + ") rotate(" + (-8 * Math.sin(e * Math.PI)).toFixed(2) + "deg)";
        shadow.style.opacity = (1 - c01(pe * 3)).toFixed(3);
        words.style.opacity = (1 - outCubic(c01(pe * 2.2))).toFixed(3);
        words.style.transform = "translateY(" + (-26 * outCubic(pe)).toFixed(2) + "px)";
        glow.style.opacity = ((1 - pe) * parseFloat(glow.style.opacity || 1)).toFixed(3);
        if (pe >= 1 && target) { target.classList.remove("ab-hidden-for-intro"); target.classList.add("ab-landed"); slot.style.opacity = 0; }
      } else {
        var e2 = outCubic(pe);
        lockup.style.opacity = (1 - e2).toFixed(3);
        lockup.style.transform = "translateY(" + (-26 * e2).toFixed(2) + "px) scale(" + (1 + 0.05 * e2).toFixed(4) + ")";
        glow.style.opacity = ((1 - e2) * 0.9).toFixed(3);
      }
      bgEl.style.opacity = (1 - eb).toFixed(3); mc.style.opacity = (1 - eb).toFixed(3);
      skipBtn.style.opacity = Math.max(0, .55 * (1 - pb * 3)).toFixed(3);
      root.style.setProperty("--intro-reveal", eb.toFixed(4));
      if (pe >= 1 && pb >= 1) finish();
    }
    function finish() {
      if (done) return; done = true;
      cancelAnimationFrame(raf); ro.disconnect();
      if (target) { target.classList.remove("ab-hidden-for-intro"); if (!flyRect) target.classList.add("ab-landed"); }
      el.parentNode && el.parentNode.removeChild(el);
      root.classList.remove("ab-intro-playing");
      ["pointerdown", "keydown", "wheel", "touchmove"].forEach(function (ev) { w.removeEventListener(ev, onSkip, true); });
      fireReady();
    }

    // ---------- clock: only moves while frames arrive (a hitch pauses it instead of skipping) ----------
    var tNow = 0, last = 0, raf = 0, started = false;
    function tick(now) {
      if (!last) last = now;
      var dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      if (started) tNow += dt;
      render(Math.min(tNow, endStart >= 0 && !flyRect ? endStart : tNow));
      drawMotes(now, 1);
      if (endStart < 0 && tNow >= V.dur + HOLD) beginEnding(tNow, false);
      renderEnding(tNow);
      if (!done) raf = requestAnimationFrame(tick);
    }
    function onSkip(ev) {
      if (done || skipped) return;
      if (ev.type === "keydown" && (ev.key === "Tab" || ev.key === "Shift")) return;
      skipped = true;
      if (endStart < 0) { tNow = Math.max(tNow, V.dur); beginEnding(tNow, true); }
    }
    ["pointerdown", "keydown", "wheel", "touchmove"].forEach(function (ev) { w.addEventListener(ev, onSkip, { capture: true, passive: true }); });
    skipBtn.addEventListener("click", onSkip);

    var ro = new ResizeObserver(function () { layout(); });
    function start() { if (started) return; layout(); ro.observe(el); started = true; }
    raf = requestAnimationFrame(tick);
    var fontName = (o.fontFamily || "Recursive");
    var fontP = d.fonts && d.fonts.load ? Promise.all([d.fonts.load('800 40px "' + fontName + '"'), d.fonts.load('600 20px "' + fontName + '"')]) : Promise.resolve();
    var timeout = new Promise(function (res) { setTimeout(res, 1600); });
    Promise.race([fontP, timeout]).then(start, start);
    // safety net: never hold the page hostage
    setTimeout(function () { if (!done) { beginEnding(tNow, true); setTimeout(finish, 900); } }, (V.dur + HOLD + 4) * 1000);
  }

  // Where the page should wire its own entrance: runs after the intro (or at once when it is skipped).
  function ready(cb) { if (isReady) cb(); else readyCbs.push(cb); }
  // Runs as soon as the intro starts to reveal the page (earlier than ready).
  function reveal(cb) { if (revealed) cb(); else revealCbs.push(cb); }

  w.AbyteIntro = { play: play, ready: ready, reveal: reveal, markSVG: markSVG, FULL: FULL, BIT: BIT };
})(window, document);
