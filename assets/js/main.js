/* J Consult — site behaviour (no dependencies) */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CALENDLY = 'https://calendly.com/jovan-jovanconsult/30';

  /* ---------- Mobile menu ---------- */
  var burger = $('.burger');
  var mmenu = $('#mmenu');
  if (burger && mmenu) {
    var setMenu = function (open) {
      mmenu.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.querySelector('path').setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16');
    };
    burger.addEventListener('click', function () { setMenu(mmenu.hidden); });
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
    var step = function (t) {
      if (t0 === null) t0 = t + 500;
      var p = Math.min(1, Math.max(0, (t - t0) / 1800));
      var eased = 1 - Math.pow(1 - p, 3);
      counters.forEach(function (el) { el.textContent = format(el, eased); });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Scroll reveal (fallback for browsers without CSS scroll timelines) ---------- */
  var hasScrollTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!reduceMotion && !hasScrollTimeline && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('main .wrap > *').forEach(function (el) { io.observe(el); });
  }

  /* ---------- Services tabs ---------- */
  var tabs = $$('.svc-tab');
  var panels = $$('.svc-panel');
  var selectTab = function (i, focus) {
    tabs.forEach(function (tab, j) {
      var on = i === j;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      if (on) { panels[j].classList.remove('anim'); void panels[j].offsetWidth; panels[j].classList.add('anim'); }
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(i); });
    tab.addEventListener('keydown', function (e) {
      var n = tabs.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % n, true); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i - 1 + n) % n, true); }
      else if (e.key === 'Home') { e.preventDefault(); selectTab(0, true); }
      else if (e.key === 'End') { e.preventDefault(); selectTab(n - 1, true); }
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
  var CHEVRON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var quiz = $('#quiz');
  var qStep = 0;
  var qAnswers = [];
  var lastPct = 0;
  var quizTouched = false;

  var renderQuiz = function () {
    if (!quiz) return;
    var total = QUIZ.length;
    if (qStep < total) {
      var q = QUIZ[qStep];
      var pct = Math.round((qStep / total) * 100);
      quiz.innerHTML =
        '<div class="quiz-step">' +
          '<div class="q-meta"><span>Question ' + (qStep + 1) + ' of ' + total + '</span>' +
            (qStep > 0 ? '<button type="button" class="q-back">← Back</button>' : '') + '</div>' +
          '<div class="q-bar" aria-hidden="true"><span style="width:' + lastPct + '%"></span></div>' +
          '<h3 class="q-text" tabindex="-1">' + esc(q.q) + '</h3>' +
          '<div class="q-opts">' + q.options.map(function (o, i) {
            return '<button type="button" class="q-opt' + (qAnswers[qStep] === i ? ' sel' : '') + '" data-i="' + i + '"><span>' + esc(o.label) + '</span>' + CHEVRON + '</button>';
          }).join('') + '</div>' +
        '</div>';
      var bar = $('.q-bar span', quiz);
      requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = pct + '%'; }); });
      lastPct = pct;
      $$('.q-opt', quiz).forEach(function (btn) {
        btn.addEventListener('click', function () {
          qAnswers = qAnswers.slice(0, qStep);
          qAnswers[qStep] = Number(btn.dataset.i);
          qStep += 1;
          quizTouched = true;
          renderQuiz();
        });
      });
      var back = $('.q-back', quiz);
      if (back) back.addEventListener('click', function () { qStep = Math.max(0, qStep - 1); renderQuiz(); });
      if (quizTouched) $('.q-text', quiz).focus({ preventScroll: true });
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
      quiz.innerHTML =
        '<div class="quiz-step q-result">' +
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
      lastPct = 0;
      $('.q-restart', quiz).addEventListener('click', function () { qStep = 0; qAnswers = []; renderQuiz(); });
      $('.q-best h3', quiz).focus({ preventScroll: true });
    }
  };
  renderQuiz();

  /* ---------- Free guide popup ---------- */
  var modal = $('#guide');
  var form = $('#guide-form');
  var sent = $('#guide-sent');
  var emailIn = $('#guide-email');
  var emailOut = $('#guide-email-out');
  var box = modal ? $('.modal-box', modal) : null;
  var lastFocus = null;
  var KEY = 'jc_guide_closed';
  var DAYS_HIDDEN = 30;

  var remember = function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} };
  var closedRecently = function () {
    try { var v = Number(localStorage.getItem(KEY)); return v && Date.now() - v < DAYS_HIDDEN * 864e5; }
    catch (e) { return false; }
  };
  var openGuide = function () {
    if (!modal || !modal.hidden) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    (form.hidden ? $('.btn', sent) : emailIn).focus();
  };
  var closeGuide = function () {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    remember();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-guide]')) openGuide();
    else if (e.target.closest('[data-close-guide]')) closeGuide();
  });
  document.addEventListener('keydown', function (e) {
    if (!modal || modal.hidden) return;
    if (e.key === 'Escape') { closeGuide(); return; }
    if (e.key === 'Tab') {
      var f = $$('a[href], button:not([disabled]), input:not([type="hidden"])', box).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
        if (window.console) console.warn('Guide form: Mailchimp is not connected yet. See README.');
      }
      emailOut.textContent = emailIn.value.trim();
      setTimeout(function () {
        form.hidden = true;
        sent.hidden = false;
        remember();
        $('.btn', sent).focus();
      }, 0);
    });
  }

  if (modal && !closedRecently()) {
    setTimeout(function () { if (!closedRecently()) openGuide(); }, 15000);
  }
})();
