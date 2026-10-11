(function () {
  'use strict';

  var BANKS = {
    pichincha: {
      name: 'Banco Pichincha',
      channels: 'Transferencia · Mi Vecino',
      type: 'Cuenta de Ahorros',
      number: '2207617983',
      holder: 'Kevin Navarrete',
      id: '1206685032'
    },
    guayaquil: {
      name: 'Banco Guayaquil',
      channels: 'Transferencia · Banco del Barrio',
      type: 'Cuenta de Ahorros',
      number: '0043406944',
      holder: 'Kevin Navarrete',
      id: '1206685032'
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- Sonido (Web Audio, sin archivos) ---------- */
  var Sound = (function () {
    var ctx = null, master = null, verb = null, ambient = null, enabled = false;

    // Reverberación suave generada (sin archivos)
    function makeReverb(seconds) {
      var len = Math.floor(ctx.sampleRate * seconds);
      var buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      var c = ctx.createConvolver();
      c.buffer = buf;
      return c;
    }

    function init() {
      if (ctx) return true;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      verb = ctx.createGain();
      verb.gain.value = 0.3;
      var conv = makeReverb(2.8);
      verb.connect(conv); conv.connect(master);
      return true;
    }

    // Tono "piano eléctrico" cálido (FM suave): ataque redondo, brillo que se apaga
    function tone(freq, opts) {
      if (!enabled || !ctx) return;
      opts = opts || {};
      var t = ctx.currentTime + (opts.delay || 0);
      var dur = opts.dur || 1.2, vol = opts.vol || 0.02;
      var car = ctx.createOscillator(), mod = ctx.createOscillator();
      var modGain = ctx.createGain(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      car.type = 'sine'; mod.type = 'sine';
      car.frequency.value = freq;
      mod.frequency.value = freq * 2;
      // el brillo (índice FM) empieza leve y desaparece rápido: suena a tecla de fieltro
      modGain.gain.setValueAtTime(freq * 0.6, t);
      modGain.gain.exponentialRampToValueAtTime(freq * 0.02, t + 0.35);
      lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      mod.connect(modGain); modGain.connect(car.frequency);
      car.connect(lp); lp.connect(g); g.connect(master); g.connect(verb);
      car.start(t); mod.start(t);
      car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
    }

    // Fondo: un solo tono cálido (quinta abierta) que "respira" muy despacio
    function startAmbient() {
      if (ambient || !ctx) return;
      var out = ctx.createGain();
      out.gain.value = 0.0001;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
      // el filtro se abre y cierra lentamente (ciclo de ~14 s)
      var lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07; lfoGain.gain.value = 160;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
      lp.connect(out); out.connect(master); out.connect(verb);
      var oscs = [[110.0, 0], [110.0, 5], [164.81, -4], [220.0, 3]].map(function (v, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = v[0]; o.detune.value = v[1];
        g.gain.value = i < 2 ? 0.5 : 0.22;
        o.connect(g); g.connect(lp); o.start();
        return o;
      });
      lfo.start();
      out.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 6);
      ambient = { out: out, oscs: oscs.concat([lfo]) };
    }

    function stopAmbient() {
      if (!ambient) return;
      var a = ambient; ambient = null;
      var t = ctx.currentTime;
      a.out.gain.cancelScheduledValues(t);
      a.out.gain.setValueAtTime(Math.max(a.out.gain.value, 0.0001), t);
      a.out.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      setTimeout(function () { a.oscs.forEach(function (o) { o.stop(); }); }, 2200);
    }

    // Notas de La mayor (A, C#, E, F#): siempre consonantes entre sí
    var NOTES = [440.0, 554.37, 659.25, 739.99, 880.0];
    var lastHover = 0;

    return {
      get on() { return enabled; },
      set: function (on) {
        if (on && !init()) return;
        enabled = on;
        if (on) {
          if (ctx.state === 'suspended') ctx.resume();
          startAmbient();
          // firma sonora de Tarea Total: tres notas ascendentes
          tone(440.0, { vol: 0.02, dur: 1.6 }); tone(659.25, { vol: 0.016, delay: 0.16, dur: 1.6 }); tone(1108.73, { vol: 0.012, delay: 0.32, dur: 2 });
        } else {
          stopAmbient();
        }
      },
      resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },
      hover: function () {
        var now = Date.now();
        if (now - lastHover < 300) return;
        lastHover = now;
        tone(1318.51, { vol: 0.0025, dur: 0.25 });
      },
      click: function () { tone(659.25, { vol: 0.016, dur: 0.9 }); tone(880.0, { vol: 0.01, delay: 0.05, dur: 0.9 }); },
      whoosh: function () { tone(NOTES[Math.floor(Math.random() * 3)] / 2, { vol: 0.012, dur: 1.4 }); },
      blip: function (n) { tone(NOTES[n % NOTES.length], { vol: 0.01, dur: 0.9 }); },
      chime: function () { [440.0, 554.37, 659.25, 880.0].forEach(function (f, i) { tone(f, { vol: 0.014, delay: i * 0.12, dur: 1.4 }); }); }
    };
  })();

  var soundBtns = document.querySelectorAll('#soundBtn, [data-sound-toggle]');
  function applySound(on) {
    Sound.set(on);
    var real = Sound.on;
    root.classList.toggle('is-sound', real);
    soundBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(real));
      b.setAttribute('aria-label', real ? 'Silenciar sonido' : 'Activar sonido');
    });
    store('tt-sound', real ? 'on' : 'off');
  }
  soundBtns.forEach(function (b) {
    b.addEventListener('click', function () { applySound(!Sound.on); hideHint(); });
  });

  // Pista para activar el sonido (solo la primera visita)
  var hint = null;
  function hideHint() { if (hint) { hint.remove(); hint = null; } }
  if (store('tt-sound') === null) {
    setTimeout(function () {
      var btn = $('soundBtn');
      if (!btn || Sound.on) return;
      btn.parentElement.style.position = 'relative';
      hint = document.createElement('span');
      hint.className = 'sound-hint';
      hint.textContent = 'Activa el sonido para la experiencia completa';
      btn.parentElement.appendChild(hint);
      setTimeout(hideHint, 6000);
    }, 2600);
  }

  // Sonidos de interfaz
  document.addEventListener('pointerover', function (e) {
    if (!Sound.on || e.pointerType !== 'mouse') return;
    var t = e.target.closest('a, button, .glass');
    var from = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('a, button, .glass') : null;
    if (t && t !== from) Sound.hover();
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button') && !e.target.closest('[data-sound-toggle], #soundBtn')) Sound.click();
  });

  /* ---------- Intro ---------- */
  var intro = $('intro');
  function endIntro() { if (intro) { intro.classList.add('is-done'); setTimeout(function () { intro.remove(); }, 700); } }
  if (reduced || sessionStorageGet()) {
    if (intro) intro.remove();
  } else {
    window.addEventListener('load', function () { setTimeout(endIntro, 500); });
    setTimeout(endIntro, 2200);
  }
  function sessionStorageGet() {
    try {
      var seen = sessionStorage.getItem('tt-intro');
      sessionStorage.setItem('tt-intro', '1');
      return seen;
    } catch (e) { return null; }
  }

  /* ---------- Navbar ---------- */
  var nav = $('nav');
  var toggle = $('navToggle');
  var menu = $('navMenu');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  toggle.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Enlace activo según la sección visible
  var links = menu.querySelectorAll('ul a');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  }

  /* ---------- Texto rotativo del hero ---------- */
  var rot = $('rotator');
  var words = ['Tutorías personalizadas', 'Asesoría metodológica de tesis', 'Preparación para exámenes', 'Estadística explicada paso a paso', 'Clases de ciencias exactas', 'Inglés académico'];
  if (rot && !reduced) {
    var wi = 0, ci = words[0].length, phase = 'hold';
    var typeLoop = function () {
      var w = words[wi];
      if (phase === 'type') {
        ci++;
        if (ci >= w.length) {
          rot.textContent = w;
          phase = 'hold';
          return setTimeout(function () { phase = 'del'; typeLoop(); }, 2200);
        }
      } else if (--ci <= 0) {
        wi = (wi + 1) % words.length; ci = 0; phase = 'type';
      }
      rot.textContent = words[wi].slice(0, ci) || '\u00a0';
      setTimeout(typeLoop, phase === 'del' ? 28 : 55);
    };
    setTimeout(function () { phase = 'del'; typeLoop(); }, 2600);
  }

  /* ---------- Efecto scramble en etiquetas ---------- */
  var glyphs = '!<>-_\\/[]{}=+*^?#01';
  function scramble(el) {
    var final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    var frame = 0, total = 22;
    (function step() {
      var out = '';
      for (var i = 0; i < final.length; i++) {
        if (final[i] === ' ' || i < (frame / total) * final.length) out += final[i];
        else out += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (++frame <= total) requestAnimationFrame(step);
      else el.textContent = final;
    })();
  }

  /* ---------- Animaciones al hacer scroll ---------- */
  var items = document.querySelectorAll('.reveal');
  // pequeño escalonado dentro de cada grupo
  document.querySelectorAll('.values, .services, .levels, .steps, .contact, .duo, .pay').forEach(function (g) {
    Array.prototype.forEach.call(g.querySelectorAll(':scope > .reveal'), function (el, i) { el.style.setProperty('--d', (i % 4) * 0.08 + 's'); });
  });
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        var sc = entry.target.querySelector('[data-scramble]');
        if (sc) scramble(sc);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    var steps = $('steps');
    if (steps) {
      var so = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { steps.classList.add('is-drawn'); so.disconnect(); }
      }, { threshold: 0.3 });
      so.observe(steps);
    }
  } else {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    var st = $('steps'); if (st) st.classList.add('is-drawn');
  }

  /* ---------- Brillo que sigue al cursor y tarjetas 3D ---------- */
  if (finePointer && !reduced) {
    var glow = $('cursorGlow');
    var gx = 0, gy = 0, tx = 0, ty = 0, glowRaf = null;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add('is-on');
      if (!glowRaf) glowRaf = requestAnimationFrame(moveGlow);
    }, { passive: true });
    function moveGlow() {
      gx += (tx - gx) * 0.18; gy += (ty - gy) * 0.18;
      glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
      glowRaf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(moveGlow) : null;
    }
    document.addEventListener('pointerleave', function () { glow.classList.remove('is-on'); });

    document.querySelectorAll('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x + 'px');
        el.style.setProperty('--my', y + 'px');
        if (el.hasAttribute('data-tilt')) {
          var rx = ((y / r.height) - 0.5) * -8, ry = ((x / r.width) - 0.5) * 8;
          el.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
        }
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    var hv = $('heroVisual');
    var orb = hv && hv.querySelector('.orb');
    if (orb) {
      window.addEventListener('pointermove', function (e) {
        var rx = (e.clientY / window.innerHeight - 0.5) * -12;
        var ry = (e.clientX / window.innerWidth - 0.5) * 16;
        orb.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      }, { passive: true });
    }
  }


  /* ---------- Servicios girando alrededor del círculo ---------- */
  (function orbitWords() {
    var list = $('orbWords');
    if (!list) return;
    var items = Array.prototype.slice.call(list.children);
    var angle = -Math.PI / 2, radius = 0, last = 0, topIdx = -1, hovering = false;
    function measure() { radius = list.offsetWidth * 0.45; }
    function place() {
      var n = items.length, best = -1, bestY = Infinity;
      items.forEach(function (li, i) {
        var a = angle + (i / n) * Math.PI * 2;
        var x = Math.cos(a) * radius, y = Math.sin(a) * radius;
        li.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        if (y < bestY) { bestY = y; best = i; }
      });
      if (best !== topIdx) {
        if (topIdx > -1) items[topIdx].classList.remove('is-top');
        items[best].classList.add('is-top');
        topIdx = best;
      }
    }
    function frame(now) {
      if (last && !hovering) angle += (now - last) * 0.00012;
      last = now;
      place();
      requestAnimationFrame(frame);
    }
    measure(); place();
    window.addEventListener('resize', function () { measure(); place(); });
    list.parentElement.addEventListener('pointerenter', function () { hovering = true; });
    list.parentElement.addEventListener('pointerleave', function () { hovering = false; });
    if (!reduced) requestAnimationFrame(frame);
  })();

  /* ---------- Filtro de servicios ---------- */
  (function serviceTabs() {
    var tabs = document.querySelectorAll('.tab');
    var cards = document.querySelectorAll('#services .service');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var f = tab.dataset.filter;
        tabs.forEach(function (t) { var on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-pressed', String(on)); });
        var k = 0;
        cards.forEach(function (c) {
          var show = f === 'todos' || c.dataset.cat === f;
          c.classList.toggle('is-hidden', !show);
          c.classList.remove('is-in');
          if (show) {
            c.classList.add('is-visible');
            void c.offsetWidth;
            c.style.animationDelay = (k++ * 0.04) + 's';
            c.classList.add('is-in');
          }
        });
      });
    });
  })();


  /* ---------- Materias: nivel y buscador ---------- */
  (function subjects() {
    var box = document.querySelector('.subjects');
    if (!box) return;
    var btns = box.querySelectorAll('[data-level-btn]');
    var groups = box.querySelectorAll('.subjects__group');
    var input = $('subjectSearch');
    var empty = $('subjectEmpty');
    var level = 'col';
    var norm = function (t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    groups.forEach(function (g) { g.querySelectorAll('li').forEach(function (li) { li.dataset.t = li.textContent; }); });

    function render() {
      var q = norm(input.value.trim());
      var any = false;
      groups.forEach(function (g) {
        var inLevel = q ? true : g.dataset.level === level;
        var shown = 0;
        g.querySelectorAll('li').forEach(function (li) {
          var t = li.dataset.t, i = norm(t).indexOf(q);
          var ok = inLevel && (!q || i > -1);
          li.classList.toggle('is-hidden', !ok);
          if (ok) {
            shown++;
            if (q) {
              li.textContent = '';
              li.append(t.slice(0, i));
              var m = document.createElement('mark'); m.textContent = t.slice(i, i + q.length); li.append(m);
              li.append(t.slice(i + q.length));
            } else {
              li.textContent = t;
            }
          }
        });
        g.classList.toggle('is-hidden', shown === 0);
        if (shown) any = true;
      });
      empty.hidden = any;
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        level = b.dataset.levelBtn;
        btns.forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        input.value = '';
        render();
      });
    });
    input.addEventListener('input', render);
    render();
  })();

  /* ---------- Partículas conectadas (canvas) ---------- */
  (function particles() {
    var cv = $('fxCanvas');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W, H, pts = [], mouse = { x: -9999, y: -9999 }, running = true;
    var COLORS = ['120,72,181', '25,150,156', '226,140,40'];

    function size() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, (W * H) / 16000));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.6 + 0.6, c: COLORS[i % 3] });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var maxD = 130;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduced) {
          p.x += p.vx; p.y += p.vy;
          var dx = p.x - mouse.x, dy = p.y - mouse.y, md = dx * dx + dy * dy;
          if (md < 14400) { var f = (14400 - md) / 14400 * 0.6; p.x += dx / 60 * f; p.y += dy / 60 * f; }
          if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.c + ',.55)';
        ctx.fill();
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var ddx = p.x - q.x, ddy = p.y - q.y;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 < maxD * maxD) {
            ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.14 * (1 - Math.sqrt(d2) / maxD)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      if (running && !reduced) requestAnimationFrame(draw);
    }

    size();
    window.addEventListener('resize', function () { size(); if (reduced) draw(); });
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      var was = running;
      running = !document.hidden;
      if (running && !was && !reduced) requestAnimationFrame(draw);
    });
    draw();
  })();

  /* ---------- Showreel ---------- */
  (function reel() {
    var el = $('reel');
    if (!el) return;
    var scenes = el.querySelectorAll('.scene');
    var segs = el.querySelectorAll('#reelSegments button');
    var caption = $('reelCaption');
    var timeEl = $('reelTime');
    var playBtn = $('reelPlay');
    var CAPTIONS = ['01 · Escríbenos por WhatsApp', '02 · Te asignamos un especialista', '03 · Clase en vivo, a tu ritmo', '04 · Cumples tu meta'];
    var DUR = 4000;
    var idx = 0, elapsed = 0, last = 0, playing = false, inView = false, userPaused = false, raf = null;
    var stopTimers = [];

    function show(i) {
      idx = i; elapsed = 0;
      scenes.forEach(function (s, k) {
        var on = k === i;
        s.setAttribute('aria-hidden', String(!on));
        if (on) {
          clearTimeout(stopTimers[k]);
          s.classList.remove('is-run');
          void s.offsetWidth;
          s.classList.add('is-active', 'is-run');
        } else if (s.classList.contains('is-active')) {
          s.classList.remove('is-active');
          stopTimers[k] = setTimeout(function () { s.classList.remove('is-run'); }, 700);
        }
      });
      segs.forEach(function (b, k) { b.querySelector('i').style.setProperty('--p', k < i ? 1 : 0); });
      caption.textContent = CAPTIONS[i];
      Sound.whoosh();
      if (i === 3) setTimeout(function () { if (idx === 3) Sound.chime(); }, 2200);
      if (i === 0) [300, 1200, 2100, 3000].forEach(function (t, n) { setTimeout(function () { if (idx === 0 && playing) Sound.blip(n); }, t); });
    }

    function tick(now) {
      if (!playing) return;
      elapsed += now - last; last = now;
      if (elapsed >= DUR) show((idx + 1) % scenes.length);
      segs[idx].querySelector('i').style.setProperty('--p', Math.min(elapsed / DUR, 1));
      var secs = Math.floor((idx * DUR + elapsed) / 1000);
      timeEl.textContent = '00:' + (secs < 10 ? '0' : '') + secs;
      raf = requestAnimationFrame(tick);
    }

    function play() {
      if (playing) return;
      playing = true; last = performance.now();
      el.classList.remove('is-paused'); el.classList.add('is-playing');
      playBtn.setAttribute('aria-label', 'Pausar video');
      raf = requestAnimationFrame(tick);
    }
    function pause() {
      playing = false; cancelAnimationFrame(raf);
      el.classList.add('is-paused'); el.classList.remove('is-playing');
      playBtn.setAttribute('aria-label', 'Reproducir video');
    }

    playBtn.addEventListener('click', function () {
      if (playing) { userPaused = true; pause(); } else { userPaused = false; play(); }
    });
    segs.forEach(function (b, k) { b.addEventListener('click', function () { show(k); if (!playing) { userPaused = false; play(); } }); });

    show(0);
    if (reduced) { pause(); return; }
    pause();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        if (inView && !userPaused) play(); else if (!inView) pause();
      }, { threshold: 0.4 }).observe(el);
    } else {
      play();
    }
  })();

  /* ---------- Modal de bancos ---------- */
  var modal = $('bankModal');
  var copyBtn = $('bankCopy');

  document.querySelectorAll('[data-bank]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.bank;
      var bank = BANKS[key];
      $('bankTitle').textContent = bank.name;
      $('bankChannels').textContent = bank.channels;
      $('bankType').textContent = bank.type;
      $('bankNumber').textContent = bank.number;
      $('bankHolder').textContent = bank.holder;
      $('bankId').textContent = bank.id;
      $('bankLogo').className = 'pay-card__logo pay-card__logo--' + key;
      copyBtn.dataset.copy = bank.number;
      resetCopy(copyBtn);
      if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
    });
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('[data-close]')) modal.close ? modal.close() : modal.removeAttribute('open');
  });

  /* ---------- Copiar al portapapeles ---------- */
  function resetCopy(btn) { btn.querySelector('span').textContent = btn.dataset.label; }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      (modal.open ? modal : document.body).appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      ok ? resolve() : reject();
    });
  }

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var label = btn.querySelector('span');
      copyText(btn.dataset.copy).then(function () {
        label.textContent = '¡Copiado!';
        Sound.chime();
      }, function () {
        label.textContent = 'No se pudo copiar';
      });
      setTimeout(function () { resetCopy(btn); }, 2000);
    });
  });

  /* ---------- Medición de clics a WhatsApp (Google Analytics y Google Ads) ---------- */
  var ADS_ID = 'AW-18491436536';
  if (typeof window.gtag === 'function') window.gtag('config', ADS_ID);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="wa.me"]');
    if (a && typeof window.gtag === 'function') {
      window.gtag('event', 'click_whatsapp', { ubicacion: a.dataset.loc || 'otro' });
      window.gtag('event', 'conversion', { send_to: ADS_ID + '/qaSnCPKjzZkdEPjbs_FE', value: 1.0, currency: 'USD' });
    }
  });

  /* ---------- Botón flotante: aviso breve ---------- */
  var fab = document.querySelector('.fab');
  if (fab) {
    setTimeout(function () { fab.classList.add('is-tip'); setTimeout(function () { fab.classList.remove('is-tip'); }, 4000); }, 9000);
  }

  // El audio necesita un gesto del usuario: si lo dejó activado, se reanuda con el primer toque
  if (store('tt-sound') === 'on') {
    var resumeOnce = function (e) {
      var onToggle = e.target.closest && e.target.closest('#soundBtn, [data-sound-toggle]');
      if (!onToggle) applySound(true);
      window.removeEventListener('pointerdown', resumeOnce);
      window.removeEventListener('keydown', resumeOnce);
    };
    window.addEventListener('pointerdown', resumeOnce);
    window.addEventListener('keydown', resumeOnce);
  }

  $('year').textContent = new Date().getFullYear();
})();
