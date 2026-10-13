/* J Consult — site behaviour (Apple-style edition, no dependencies)
   Principles: respond on pointer-down, animate with interruptible springs that
   start from the value on screen, track drags 1:1 and carry release velocity. */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CALENDLY = 'https://calendly.com/jovan-jovanconsult/30';
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------- Spring ----------
     damping: 1 = no overshoot, lower = bouncier. response: seconds to settle (not a duration).
     Retargeting mid-flight keeps the current value and velocity, so motion is interruptible. */
  function Spring(opts) {
    this.value = opts.from || 0;
    this.target = this.value;
    this.velocity = 0;
    this.eps = opts.eps || 0.0005;
    this.onUpdate = opts.onUpdate;
    this.onRest = opts.onRest || null;
    this.raf = 0;
    this.configure(opts.damping == null ? 1 : opts.damping, opts.response || 0.4);
    var self = this;
    this._loop = function (now) { self._step(now); };
  }
  Spring.prototype.configure = function (damping, response) {
    var w = 2 * Math.PI / response;
    this.k = w * w;
    this.c = 2 * damping * w;
  };
  Spring.prototype.to = function (target, velocity) {
    this.target = target;
    if (velocity != null) this.velocity = velocity;
    if (reduceMotion) { this.jump(target); return; }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this._loop); }
  };
  Spring.prototype.jump = function (v) {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.value = this.target = v;
    this.velocity = 0;
    this.onUpdate(v);
    if (this.onRest) this.onRest(v);
  };
  Spring.prototype._step = function (now) {
    var dt = Math.min(0.064, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    var n = Math.max(1, Math.ceil(dt / 0.004));
    var h = dt / n;
    for (var i = 0; i < n; i++) {
      var a = -this.k * (this.value - this.target) - this.c * this.velocity;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    if (Math.abs(this.velocity) < this.eps * 10 && Math.abs(this.value - this.target) < this.eps) {
      this.raf = 0;
      this.value = this.target;
      this.velocity = 0;
      this.onUpdate(this.value);
      if (this.onRest) this.onRest(this.value);
      return;
    }
    this.onUpdate(this.value);
    this.raf = requestAnimationFrame(this._loop);
  };

  /* ---------- Mobile menu: a sheet that drops from the header ---------- */
  var burger = $('.burger');
  var mmenu = $('#mmenu');
  if (burger && mmenu) {
    var menuSpring = new Spring({
      damping: 0.8, response: 0.3,
      onUpdate: function (p) {
        mmenu.style.opacity = clamp01(p);
        mmenu.style.transform = 'translateY(' + ((1 - p) * -14) + 'px) scaleY(' + (0.96 + 0.04 * p) + ')';
      },
      onRest: function (p) { if (p === 0) mmenu.hidden = true; }
    });
    var setMenu = function (open) {
      if (open && mmenu.hidden) { menuSpring.onUpdate(menuSpring.value); mmenu.hidden = false; }
      burger.setAttribute('aria-expanded', String(open));
      burger.querySelector('path').setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16');
      menuSpring.to(open ? 1 : 0);
    };
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', mmenu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- Counting numbers in the hero ---------- */
  var counters = $$('[data-count]');
  if (counters.length && !reduceMotion) {
    var format = function (el, k) {
      return (el.dataset.prefix || '') + Math.round(Number(el.dataset.count) * k) + (el.dataset.suffix || '');
    };
    counters.forEach(function (el) { el.textContent = format(el, 0); });
    var t0 = null;
    var count = function (t) {
      if (t0 === null) t0 = t + 450;
      var p = Math.min(1, Math.max(0, (t - t0) / 1600));
      var eased = 1 - Math.pow(1 - p, 3);
      counters.forEach(function (el) { el.textContent = format(el, eased); });
      if (p < 1) requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
  }

  /* ---------- Scroll reveal (fallback for browsers without CSS scroll timelines) ---------- */
  var hasScrollTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!reduceMotion && !hasScrollTimeline && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    $$('main .wrap > *').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Content entrance: opacity + small rise on a critically damped spring ---------- */
  var enter = function (el) {
    var s = new Spring({
      damping: 1, response: 0.38,
      onUpdate: function (p) {
        el.style.opacity = clamp01(p);
        el.style.transform = p >= 1 ? '' : 'translateY(' + ((1 - p) * 14) + 'px)';
      }
    });
    s.onUpdate(0);
    s.to(1);
  };

  /* ---------- Services: selection pill springs between tabs ---------- */
  var tabs = $$('.svc-tab');
  var panels = $$('.svc-panel');
  var glider = $('.svc-glider');
  if (tabs.length && glider) {
    var gy = new Spring({ damping: 1, response: 0.35, eps: 0.05, onUpdate: function (v) { glider.style.transform = 'translateY(' + v + 'px)'; } });
    var gh = new Spring({ damping: 1, response: 0.35, eps: 0.05, onUpdate: function (v) { glider.style.height = v + 'px'; } });
    var current = 0;
    var placeGlider = function (instant) {
      var t = tabs[current];
      if (instant) { gy.jump(t.offsetTop); gh.jump(t.offsetHeight); }
      else { gy.to(t.offsetTop); gh.to(t.offsetHeight); }
    };
    var selectTab = function (i, focus) {
      if (i === current) { if (focus) tabs[i].focus(); return; }
      current = i;
      tabs.forEach(function (tab, j) {
        var on = i === j;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      placeGlider(false);
      enter(panels[i]);
      if (focus) tabs[i].focus();
    };
    tabs.forEach(function (tab, i) {
      // Select on pointer-down so the pill starts moving the moment the finger lands.
      tab.addEventListener('pointerdown', function (e) { if (e.button === 0) selectTab(i); });
      tab.addEventListener('click', function () { selectTab(i); });
      tab.addEventListener('keydown', function (e) {
        var n = tabs.length;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % n, true); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i - 1 + n) % n, true); }
        else if (e.key === 'Home') { e.preventDefault(); selectTab(0, true); }
        else if (e.key === 'End') { e.preventDefault(); selectTab(n - 1, true); }
      });
    });
    placeGlider(true);
    window.addEventListener('resize', function () { placeGlider(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeGlider(true); });
  }

  /* ---------- Client logos: auto-scroll you can grab, throw and let go ---------- */
  var marquee = $('.marquee');
  var track = $('.track', marquee);
  if (marquee && track) {
    var AUTO = reduceMotion ? 0 : -36;     // px/s drift
    var DECAY = 0.998;                     // per-ms momentum decay
    var x = 0, v = AUTO, half = 0, hover = false, coasting = false;
    var drag = null;                       // {id, startX, startY, baseX, hist[], active}
    var last = performance.now();
    var measure = function () { half = track.scrollWidth / 2; };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    $$('img', track).forEach(function (img) { img.draggable = false; });

    var frame = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!drag || !drag.active) {
        if (coasting) {
          v *= Math.pow(DECAY, dt * 1000);
          if (Math.abs(v) <= Math.abs(AUTO) + 2) coasting = false;
        } else {
          var tv = (hover || drag) ? 0 : AUTO;
          v += (tv - v) * (1 - Math.exp(-dt / 0.35));
        }
        x += v * dt;
      }
      if (half > 0) { while (x <= -half) x += half; while (x > 0) x -= half; }
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    marquee.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    marquee.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });
    marquee.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      // Catch the strip immediately, like putting a finger on a moving list.
      coasting = false;
      v = 0;
      drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: x, hist: [], active: false };
    });
    marquee.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      if (!drag.active) {
        // ~10px of hysteresis before committing to a horizontal drag.
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        drag.active = true;
        drag.startX = e.clientX;
        drag.baseX = x;
        marquee.setPointerCapture(e.pointerId);
        marquee.classList.add('dragging');
      }
      x = drag.baseX + (e.clientX - drag.startX);   // 1:1 with the pointer
      drag.hist.push({ x: e.clientX, t: e.timeStamp });
      while (drag.hist.length > 2 && e.timeStamp - drag.hist[0].t > 100) drag.hist.shift();
    });
    var release = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.active && drag.hist.length > 1) {
        var a = drag.hist[0];
        var b = drag.hist[drag.hist.length - 1];
        var span = Math.max(1, b.t - a.t);
        v = ((b.x - a.x) / span) * 1000;            // hand the release velocity to the momentum
        coasting = Math.abs(v) > Math.abs(AUTO) + 2;
      }
      marquee.classList.remove('dragging');
      drag = null;
    };
    marquee.addEventListener('pointerup', release);
    marquee.addEventListener('pointercancel', release);
  }

  /* ---------- FAQ: answers open and close on an interruptible spring ---------- */
  $$('.faq-list details').forEach(function (d) {
    var summary = $('summary', d);
    var body = $('.faq-body', d);
    var icon = $('svg', summary);
    if (!summary || !body) return;
    var h = 0;
    var s = new Spring({
      from: d.open ? 1 : 0, damping: 1, response: 0.35,
      onUpdate: function (p) {
        body.style.height = (Math.max(0, p) * h) + 'px';
        body.style.opacity = clamp01(p);
        if (icon) icon.style.transform = 'rotate(' + (45 * clamp01(p)) + 'deg)';
      },
      onRest: function (p) {
        if (p === 0) d.open = false;
        body.style.height = '';
        body.style.opacity = '';
        if (icon) icon.style.transform = '';
      }
    });
    summary.addEventListener('click', function (e) {
      if (reduceMotion) return;                     // native toggle, no motion
      e.preventDefault();
      var opening = s.target !== 1;
      if (opening && !d.open) {
        d.open = true;
        s.value = 0;
        s.target = 0;
        s.velocity = 0;
      }
      h = body.scrollHeight;
      s.onUpdate(s.value);
      s.to(opening ? 1 : 0);
    });
  });

  /* ---------- Grant fit check ---------- */
  var PROG = {
    HE: { name: 'Horizon Europe', logo: 'assets/img/horizon-europe.webp', why: 'Collaborative research and innovation with partners from at least three EU or associated countries, usually for larger budgets.' },
    EIC: { name: 'EIC Accelerator', logo: 'assets/img/eic-accelerator.webp', why: 'Built for single start-ups and SMEs scaling breakthrough technology: a grant of up to €2.5M, with optional equity investment.' },
    EUROSTARS: { name: 'Eurostars', logo: 'assets/img/eurostars.webp', why: 'International R&D projects led by an innovative SME, with each partner funded through its national agency.' },
    INNOWWIDE: { name: 'Eureka Innowwide', logo: 'assets/img/innowwide.webp', why: 'A lump-sum grant to test whether your innovation can succeed in a market outside Europe.' },
    ERASMUS: { name: 'Erasmus+', logo: 'assets/img/erasmus-plus.webp', why: 'Funding for education, training, youth and cooperation partnerships across Europe.' },
    CASCADE: { name: 'Cascade funding (FSTP)', logo: 'assets/img/cascade-funding.webp', why: 'Smaller grants through open calls run by EU projects, with lighter applications and faster decisions.' }
  };
  var QUIZ = [
    { q: 'Who is applying?', options: [
      { label: 'A single start-up or SME', pts: { EIC: 3, CASCADE: 2, INNOWWIDE: 2, EUROSTARS: 1 } },
      { label: 'An SME with partners in other countries', pts: { EUROSTARS: 3, HE: 2 } },
      { label: 'A university or research organisation', pts: { HE: 3, CASCADE: 1 } },
      { label: 'An education, training or youth organisation', pts: { ERASMUS: 4 } }
    ] },
    { q: 'How far along is your project?', options: [
      { label: 'Early research, still in the lab', pts: { HE: 3 } },
      { label: 'A working prototype', pts: { EUROSTARS: 2, EIC: 1, HE: 1, CASCADE: 1 } },
      { label: 'Close to market', pts: { EIC: 3, INNOWWIDE: 2, CASCADE: 1 } },
      { label: 'Not a technology project', pts: { ERASMUS: 3 } }
    ] },
    { q: 'What do you need the funding for?', options: [
      { label: 'Scaling a breakthrough innovation', pts: { EIC: 3 } },
      { label: 'Joint R&D with international partners', pts: { EUROSTARS: 2, HE: 2 } },
      { label: 'Testing a market outside Europe', pts: { INNOWWIDE: 4 } },
      { label: 'A quick pilot or technology adoption', pts: { CASCADE: 3 } },
      { label: 'Skills, training or mobility', pts: { ERASMUS: 3 } }
    ] },
    { q: 'Roughly how much funding do you need?', options: [
      { label: 'Under €150k', pts: { CASCADE: 3, INNOWWIDE: 2 } },
      { label: '€150k to €1M', pts: { EUROSTARS: 2, HE: 1 } },
      { label: '€1M to €2.5M', pts: { EIC: 2, HE: 2, EUROSTARS: 1 } },
      { label: 'More than €2.5M', pts: { HE: 3, EIC: 1 } }
    ] }
  ];
  var CHEVRON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e6e73" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var quiz = $('#quiz');
  if (quiz) {
    quiz.innerHTML =
      '<div class="q-top"><div class="q-meta"><span class="q-count"></span><button type="button" class="q-back" hidden>‹ Back</button></div>' +
      '<div class="q-bar" aria-hidden="true"><span></span></div></div><div class="q-body"></div>';
    var qTop = $('.q-top', quiz);
    var qCount = $('.q-count', quiz);
    var qBack = $('.q-back', quiz);
    var qBody = $('.q-body', quiz);
    var barEl = $('.q-bar span', quiz);
    var bar = new Spring({ damping: 1, response: 0.4, onUpdate: function (p) { barEl.style.transform = 'scaleX(' + Math.max(0, p) + ')'; } });
    var qStep = 0;
    var qAnswers = [];
    var touched = false;

    var render = function () {
      var total = QUIZ.length;
      if (qStep < total) {
        var q = QUIZ[qStep];
        qTop.hidden = false;
        qCount.textContent = 'Question ' + (qStep + 1) + ' of ' + total;
        qBack.hidden = qStep === 0;
        bar.to(qStep / total);
        qBody.innerHTML = '<h3 class="q-text" tabindex="-1">' + esc(q.q) + '</h3><div class="q-opts">' +
          q.options.map(function (o, i) {
            return '<button type="button" class="q-opt' + (qAnswers[qStep] === i ? ' sel' : '') + '" data-i="' + i + '"><span>' + esc(o.label) + '</span>' + CHEVRON + '</button>';
          }).join('') + '</div>';
        $$('.q-opt', qBody).forEach(function (btn) {
          btn.addEventListener('click', function () {
            qAnswers = qAnswers.slice(0, qStep);
            qAnswers[qStep] = Number(btn.dataset.i);
            qStep += 1;
            touched = true;
            render();
          });
        });
        if (touched) $('.q-text', qBody).focus({ preventScroll: true });
      } else {
        var score = {};
        Object.keys(PROG).forEach(function (k) { score[k] = 0; });
        QUIZ.forEach(function (qq, qi) {
          var o = qq.options[qAnswers[qi]];
          if (o) Object.keys(o.pts).forEach(function (k) { score[k] += o.pts[k]; });
        });
        var ranked = Object.keys(PROG).sort(function (a, b) { return score[b] - score[a]; });
        var best = PROG[ranked[0]];
        var second = PROG[ranked[1]];
        bar.jump(0);
        qTop.hidden = true;
        qBody.innerHTML =
          '<div class="q-result">' +
            '<div class="mini">Your best fit</div>' +
            '<div class="q-best"><div class="q-logo"><img src="' + best.logo + '" alt="' + esc(best.name) + ' logo"></div><h3 tabindex="-1">' + esc(best.name) + '</h3></div>' +
            '<p>' + esc(best.why) + '</p>' +
            '<p class="q-alt"><strong>Also worth a look:</strong> ' + esc(second.name) + '</p>' +
            '<div class="q-actions">' +
              '<a class="btn btn-navy" href="' + CALENDLY + '">Book a call to confirm your fit</a>' +
              '<button type="button" class="btn btn-line" data-open-guide>Get the free guide</button>' +
              '<button type="button" class="link-btn q-restart">Start again</button>' +
            '</div>' +
          '</div>';
        $('.q-restart', qBody).addEventListener('click', function () { qStep = 0; qAnswers = []; render(); });
        $('.q-best h3', qBody).focus({ preventScroll: true });
      }
      if (touched) enter(qBody);
    };
    qBack.addEventListener('click', function () { qStep = Math.max(0, qStep - 1); render(); });
    render();
  }

  /* ---------- Free guide popup ---------- */
  var modal = $('#guide');
  var form = $('#guide-form');
  var sent = $('#guide-sent');
  var emailIn = $('#guide-email');
  var emailOut = $('#guide-email-out');
  var box = modal ? $('.modal-box', modal) : null;
  var bg = modal ? $('.modal-bg', modal) : null;
  var lastFocus = null;
  var KEY = 'jc_guide_closed';
  var DAYS_HIDDEN = 30;

  var remember = function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} };
  var closedRecently = function () {
    try { var t = Number(localStorage.getItem(KEY)); return t && Date.now() - t < DAYS_HIDDEN * 864e5; }
    catch (e) { return false; }
  };

  if (modal && box) {
    // Scale and blur move together on enter and exit; the exit retraces the entrance.
    var modalSpring = new Spring({
      damping: 1, response: 0.34,
      onUpdate: function (p) {
        var q = clamp01(p);
        bg.style.opacity = q;
        box.style.opacity = q;
        box.style.transform = 'translateX(-50%) scale(' + (0.94 + 0.06 * p) + ')';
        box.style.filter = q > 0.995 ? 'none' : 'blur(' + ((1 - q) * 8).toFixed(2) + 'px)';
      },
      onRest: function (p) {
        if (p === 0) {
          modal.hidden = true;
          document.body.style.overflow = '';
        }
      }
    });
    var isOpen = false;
    var openGuide = function () {
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;
      if (modal.hidden) modalSpring.onUpdate(modalSpring.value);
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      modalSpring.to(1);
      (form.hidden ? $('.btn', sent) : emailIn).focus({ preventScroll: true });
    };
    var closeGuide = function () {
      if (!isOpen) return;
      isOpen = false;
      remember();
      modalSpring.to(0);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-open-guide]')) openGuide();
      else if (e.target.closest('[data-close-guide]')) closeGuide();
    });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { closeGuide(); return; }
      if (e.key === 'Tab') {
        var f = $$('a[href], button:not([disabled]), input:not([type="hidden"])', box).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0];
        var lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });

    if (form) {
      var action = form.dataset.mailchimpAction;
      var honeypot = form.dataset.mailchimpHoneypot;
      if (action) {
        form.action = action;
        if (honeypot) {
          var hp = document.createElement('input');
          hp.type = 'text'; hp.name = honeypot; hp.tabIndex = -1; hp.value = ''; hp.className = 'hp';
          hp.setAttribute('aria-hidden', 'true'); hp.autocomplete = 'off';
          form.appendChild(hp);
        }
      }
      form.addEventListener('submit', function (e) {
        if (!action) {
          e.preventDefault();
          if (window.console) console.warn('Guide form: the email service is not connected yet. See README.');
        }
        emailOut.textContent = emailIn.value.trim();
        setTimeout(function () {
          form.hidden = true;
          sent.hidden = false;
          enter(sent);
          remember();
          $('.btn', sent).focus({ preventScroll: true });
        }, 0);
      });
    }

    if (!closedRecently()) {
      setTimeout(function () { if (!closedRecently()) openGuide(); }, 15000);
    }
  }
})();
