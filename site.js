/**
 * Галерея работ: полноэкранный просмотр для BounceCards (локальный manifest).
 */
(function (global) {
  'use strict';

  var worksCarousel = {
    el: null,
    slides: [],
    index: 0,
    img: null,
    meta: null,
    counter: null,
    track: null,
    open: false
  };

  function worksCarouselNavigate(delta) {
    var n = worksCarousel.slides.length;
    if (!n) return;
    worksCarousel.index = (worksCarousel.index + delta + n) % n;
    renderWorksCarousel();
  }

  function onWorksCarouselKeydown(e) {
    if (!worksCarousel.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeWorksCarousel();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      worksCarouselNavigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      worksCarouselNavigate(1);
    }
  }

  function buildCarouselDom() {
    if (worksCarousel.el) return;
    var root = document.createElement('div');
    root.id = 'works-carousel';
    root.className = 'works-carousel';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('aria-label', 'Галерея работ');
    root.innerHTML =
      '<div class="works-carousel__backdrop" tabindex="-1"></div>' +
      '<div class="works-carousel__panel">' +
      '<div class="works-carousel__chrome works-carousel__chrome--close">' +
      '<button type="button" class="works-carousel__close carousel-glass-btn" aria-label="Закрыть галерею">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button></div>' +
      '<div class="works-carousel__chrome works-carousel__chrome--prev">' +
      '<button type="button" class="works-carousel__nav works-carousel__nav--prev carousel-glass-btn" aria-label="Предыдущее фото">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' +
      '</button></div>' +
      '<div class="works-carousel__chrome works-carousel__chrome--next">' +
      '<button type="button" class="works-carousel__nav works-carousel__nav--next carousel-glass-btn" aria-label="Следующее фото">' +
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
      '</button></div>' +
      '<div class="works-carousel__stage">' +
      '<img class="works-carousel__img" alt="" decoding="async" draggable="false" />' +
      '<p class="works-carousel__meta"></p>' +
      '</div>' +
      '<div class="works-carousel__foot">' +
      '<span class="works-carousel__counter"></span>' +
      '<div class="works-carousel__track" role="list" aria-label="Миниатюры"></div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(root);
    worksCarousel.el = root;
    worksCarousel.img = root.querySelector('.works-carousel__img');
    if (worksCarousel.img) {
      worksCarousel.img.draggable = false;
    }
    worksCarousel.meta = root.querySelector('.works-carousel__meta');
    worksCarousel.counter = root.querySelector('.works-carousel__counter');
    worksCarousel.track = root.querySelector('.works-carousel__track');

    var backdrop = root.querySelector('.works-carousel__backdrop');
    var closeBtn = root.querySelector('.works-carousel__close');
    var prevBtn = root.querySelector('.works-carousel__nav--prev');
    var nextBtn = root.querySelector('.works-carousel__nav--next');
    if (closeBtn) closeBtn.addEventListener('click', closeWorksCarousel);
    if (backdrop) backdrop.addEventListener('click', closeWorksCarousel);
    if (prevBtn) prevBtn.addEventListener('click', function () { worksCarouselNavigate(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { worksCarouselNavigate(1); });

    var tx0 = 0;
    var ty0 = 0;
    var stage = root.querySelector('.works-carousel__stage');
    if (stage) {
      stage.addEventListener(
        'touchstart',
        function (e) {
          if (!e.touches || !e.touches[0]) return;
          tx0 = e.touches[0].clientX;
          ty0 = e.touches[0].clientY;
        },
        { passive: true }
      );
      stage.addEventListener(
        'touchend',
        function (e) {
          if (!e.changedTouches || !e.changedTouches[0]) return;
          var dx = e.changedTouches[0].clientX - tx0;
          var dy = e.changedTouches[0].clientY - ty0;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
            worksCarouselNavigate(dx < 0 ? 1 : -1);
          }
        },
        { passive: true }
      );
    }

    initWorksCarouselGlow();
  }

  function initWorksCarouselGlow() {
    if (!global.SladostEffects || !global.SladostEffects.initBorderGlowNodes || !worksCarousel.el) return;
    var opts = {
      starSpeed: '4s',
      glowSpeed: '4s',
      backgroundColor: 'transparent',
      borderRadius: 999,
      kind: 'btn'
    };
    var nodes = worksCarousel.el.querySelectorAll('.carousel-glass-btn');
    if (!nodes.length) return;
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].closest('.border-glow-card')) list.push(nodes[i]);
    }
    if (list.length) global.SladostEffects.initBorderGlowNodes(list, opts);
  }

  function renderWorksCarouselThumbs() {
    var track = worksCarousel.track;
    if (!track) return;
    track.innerHTML = '';
    worksCarousel.slides.forEach(function (s, i) {
      var tb = document.createElement('button');
      tb.type = 'button';
      tb.className = 'works-carousel__thumb' + (i === worksCarousel.index ? ' works-carousel__thumb--active' : '');
      tb.setAttribute('aria-label', 'Кадр ' + (i + 1));
      tb.setAttribute('aria-current', i === worksCarousel.index ? 'true' : 'false');
      var im = document.createElement('img');
      im.src = s.url;
      im.alt = '';
      im.loading = 'lazy';
      im.draggable = false;
      tb.appendChild(im);
      tb.addEventListener('click', function () {
        worksCarousel.index = i;
        renderWorksCarousel();
      });
      track.appendChild(tb);
    });
    if (global.SladostEffects && global.SladostEffects.initBorderGlowNodes) {
      global.SladostEffects.initBorderGlowNodes(track.querySelectorAll('.works-carousel__thumb'), {
        starSpeed: '4s',
        glowSpeed: '4s',
        backgroundColor: 'transparent',
        borderRadius: 10
      });
    }
  }

  function renderWorksCarousel() {
    var slides = worksCarousel.slides;
    var n = slides.length;
    if (!n || !worksCarousel.img) return;
    var s = slides[worksCarousel.index];
    worksCarousel.img.src = s.url;
    worksCarousel.img.alt = s.title + ' — ' + s.sub;
    if (worksCarousel.meta) worksCarousel.meta.textContent = s.title + ' · ' + s.sub;
    if (worksCarousel.counter) worksCarousel.counter.textContent = worksCarousel.index + 1 + ' / ' + n;
    renderWorksCarouselThumbs();
    var activeThumb = worksCarousel.track && worksCarousel.track.children[worksCarousel.index];
    if (activeThumb && activeThumb.scrollIntoView) {
      activeThumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }

  function openWorksCarousel(startIndex) {
    buildCarouselDom();
    if (!worksCarousel.slides.length) return;
    worksCarousel.index = Math.max(0, Math.min(startIndex, worksCarousel.slides.length - 1));
    worksCarousel.open = true;
    worksCarousel.el.classList.add('works-carousel--open');
    worksCarousel.el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('works-carousel-lock');
    document.addEventListener('keydown', onWorksCarouselKeydown);
    renderWorksCarousel();
    var closeBtn = worksCarousel.el.querySelector('.works-carousel__close');
    initWorksCarouselGlow();
    if (closeBtn) closeBtn.focus();
  }

  function closeWorksCarousel() {
    document.removeEventListener('keydown', onWorksCarouselKeydown);
    if (!worksCarousel.el) return;
    worksCarousel.open = false;
    worksCarousel.el.classList.remove('works-carousel--open');
    worksCarousel.el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('works-carousel-lock');
  }

  function bootWorksGallery() {
    buildCarouselDom();
    global.addEventListener('load', initWorksCarouselGlow, { once: true });
    global.__bootWorksBounce = function () {
      if (!global.SladostEffects || !global.SladostEffects.initWorksBounce) return;
      global.SladostEffects.initWorksBounce('works-manifest.json', function (startIndex, slides) {
        worksCarousel.slides = slides;
        openWorksCarousel(startIndex);
      });
    };
  }

  global.WorksGallery = {
    open: openWorksCarousel,
    boot: bootWorksGallery
  };

  function initThemeToggle() {
    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');
    var meta = document.getElementById('meta-theme-color');
    var storageKey = 'sladost-theme';

    function getTheme() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(storageKey, theme);
      } catch (e) {}
      if (meta) meta.content = theme === 'dark' ? '#161014' : '#ffffff';
      if (btn) {
        var dark = theme === 'dark';
        btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        btn.setAttribute('aria-label', dark ? 'Включить светлую тему' : 'Включить тёмную тему');
        btn.title = dark ? 'Светлая тема' : 'Тёмная тема';
      }
    }

    applyTheme(getTheme());

    if (btn) {
      btn.addEventListener('click', function () {
        applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
      });
    }
  }

  function initMobileNav() {
    var nav = document.querySelector('.nav');
    var burger = document.querySelector('.burger');
    var backdrop = document.getElementById('nav-backdrop');
    if (!nav || !burger) return;

    var mqDesktop = global.matchMedia ? global.matchMedia('(min-width: 861px)') : null;

    function isOpen() {
      return nav.classList.contains('nav--open');
    }

    function setOpen(open) {
      if (mqDesktop && mqDesktop.matches) open = false;
      nav.classList.toggle('nav--open', open);
      document.body.classList.toggle('nav-open', open);
      burger.classList.toggle('burger--open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      if (backdrop) {
        backdrop.hidden = !open;
        backdrop.classList.toggle('is-visible', open);
        backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
      }
    }

    burger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!isOpen());
    });

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setOpen(false);
      });
    }

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false);
    });

    if (mqDesktop) {
      var onMq = function () {
        if (mqDesktop.matches) setOpen(false);
      };
      if (typeof mqDesktop.addEventListener === 'function') {
        mqDesktop.addEventListener('change', onMq);
      } else if (typeof mqDesktop.addListener === 'function') {
        mqDesktop.addListener(onMq);
      }
    }
  }

  function syncPackagingBowAnchor() {
    var header = document.querySelector('.site-header');
    if (header) {
      document.documentElement.style.setProperty(
        '--header-edge',
        header.getBoundingClientRect().bottom + 'px'
      );
    }

    var shell =
      document.querySelector('.site-header .header__inner') ||
      document.querySelector('.hero .shell') ||
      document.querySelector('.shell');
    if (!shell) return;

    var shellRect = shell.getBoundingClientRect();
    var insetRight = Math.max(0, document.documentElement.clientWidth - shellRect.right);
    document.documentElement.style.setProperty('--shell-inset-right', insetRight + 'px');
  }

  var CONTACT_ERROR_TEXT = {
    contact_required: 'Укажите телефон или почту.',
    phone_invalid: 'Проверьте номер телефона — нужно не меньше 10 цифр.',
    email_invalid: 'Проверьте адрес почты.',
    consent_required: 'Нужно согласие на обработку персональных данных.',
    not_configured:
      'Отправка не настроена на сервере. Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID или смените provider в contact-config.js.',
    telegram_failed: 'Не удалось отправить заявку. Попробуйте позже или напишите в мессенджер.',
    network: 'Нет связи с сервером. Проверьте интернет или напишите в WhatsApp / Telegram.',
    provider: 'В contact-config.js не указан способ отправки (api, web3forms или formspree).',
    web3forms_key: 'Укажите web3formsAccessKey в contact-config.js (ключ с web3forms.com).',
    formspree_id: 'Укажите formspreeId в contact-config.js.',
    formsubmit_to: 'Укажите formsubmitTo в contact-config.js.',
    formsubmit_activate:
      'Активируйте форму: откройте письмо на 79189759453@ya.ru от FormSubmit и нажмите ссылку подтверждения, затем отправьте снова.',
    formsubmit_file:
      'Откройте сайт через локальный сервер или хостинг (не как файл index.html на диске) — иначе отправка недоступна.',
    server_error: 'Ошибка сервера. Попробуйте позже.',
    default: 'Не удалось отправить заявку. Попробуйте ещё раз.'
  };

  function getContactConfig() {
    return global.SLADOST_CONTACT || {};
  }

  function contactErrorMessage(code) {
    return CONTACT_ERROR_TEXT[code] || CONTACT_ERROR_TEXT.default;
  }

  var CONTACT_SUCCESS_DEFAULT = 'Заявка отправлена — свяжусь с вами в ближайшее время.';
  var CONTACT_SUCCESS_MAILTO =
    'Откроется ваша почта — проверьте текст письма и нажмите «Отправить», чтобы заявка ушла мне.';

  function isFileProtocol() {
    return !global.location || global.location.protocol === 'file:';
  }

  function initContactModal() {
    var modal = document.getElementById('contact-modal');
    var form = document.getElementById('contact-form');
    if (!modal || !form) return;

    var backdrop = modal.querySelector('.contact-modal__backdrop');
    var closeBtn = modal.querySelector('.contact-modal__close');
    var errorEl = document.getElementById('contact-form-error');
    var successEl = document.getElementById('contact-success');
    var successCloseBtn = document.getElementById('contact-success-close');
    var submitBtn = form.querySelector('.contact-form__submit');
    var phoneInput = document.getElementById('contact-phone');
    var emailInput = document.getElementById('contact-email');
    var messageInput = document.getElementById('contact-message');
    var consentInput = document.getElementById('contact-consent');
    var gotchaInput = form.querySelector('[name="_gotcha"]');
    var channelsRow = modal.querySelector('.contact-modal__channels');
    var headEl = modal.querySelector('.contact-modal__head');
    var successTextEl = modal.querySelector('.contact-modal__success-text');
    var lastFocus = null;
    var sending = false;
    var submitDefaultText = submitBtn ? submitBtn.textContent : 'Отправить';

    function isOpen() {
      return modal.classList.contains('contact-modal--open');
    }

    function showError(msg) {
      if (!errorEl) return;
      if (msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      } else {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    function initContactModalGlow() {
      if (!global.SladostEffects || !global.SladostEffects.initBorderGlowNodes) return;
      var opts = {
        starSpeed: '4s',
        glowSpeed: '4s',
        backgroundColor: 'transparent',
        borderRadius: 999,
        kind: 'btn'
      };
      var nodes = modal.querySelectorAll(
        '.carousel-glass-btn, .contact-form__submit, .contact-modal__channels .social-btn'
      );
      if (!nodes.length) return;
      var list = [];
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i].closest('.border-glow-card')) list.push(nodes[i]);
      }
      if (list.length) global.SladostEffects.initBorderGlowNodes(list, opts);
    }

    function setSuccessMessage(mode) {
      if (!successTextEl) return;
      successTextEl.textContent = mode === 'mailto' ? CONTACT_SUCCESS_MAILTO : CONTACT_SUCCESS_DEFAULT;
    }

    function showSuccessView(show, mode) {
      form.hidden = !!show;
      if (successEl) successEl.hidden = !show;
      if (headEl) headEl.hidden = !!show;
      modal.classList.toggle('contact-modal--success', !!show);
      if (show) setSuccessMessage(mode || 'remote');
      else setSuccessMessage('remote');
    }

    function setSending(state) {
      sending = !!state;
      if (submitBtn) {
        submitBtn.disabled = state;
        submitBtn.textContent = state ? 'Отправляем…' : submitDefaultText;
      }
    }

    function setOpen(open) {
      modal.classList.toggle('contact-modal--open', open);
      document.body.classList.toggle('contact-modal-lock', open);
      modal.setAttribute('aria-hidden', open ? 'false' : 'true');
      showError('');
      showSuccessView(false);
      setSending(false);
      if (open) {
        lastFocus = document.activeElement;
        if (!modal.querySelector('.contact-modal__close.border-glow-card') && !modal.querySelector('.contact-modal__head .border-glow-card')) {
          initContactModalGlow();
        }
        var first = phoneInput || modal.querySelector('input, textarea, button');
        if (first) {
          requestAnimationFrame(function () {
            first.focus();
          });
        }
      } else {
        form.reset();
        if (lastFocus && typeof lastFocus.focus === 'function') {
          try {
            lastFocus.focus();
          } catch (e) {}
        }
        lastFocus = null;
      }
    }

    function openContactModal() {
      setOpen(true);
    }

    function closeContactModal() {
      setOpen(false);
    }

    function normalizePhone(value) {
      var digits = String(value || '').replace(/\D/g, '');
      if (digits.length === 11 && (digits.charAt(0) === '7' || digits.charAt(0) === '8')) {
        return '+7 ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + '-' + digits.slice(7, 9) + '-' + digits.slice(9);
      }
      return String(value || '').trim();
    }

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    }

    function hasValidPhone(value) {
      var digits = String(value || '').replace(/\D/g, '');
      return digits.length >= 10;
    }

    function collectPayload() {
      return {
        phone: phoneInput ? normalizePhone(phoneInput.value.trim()) : '',
        email: emailInput ? emailInput.value.trim() : '',
        message: messageInput ? messageInput.value.trim() : '',
        consent: consentInput ? consentInput.checked : false,
        _gotcha: gotchaInput ? gotchaInput.value : ''
      };
    }

    function validateClient(payload) {
      if (payload._gotcha) return 'spam';
      if (!payload.phone && !payload.email) return 'contact_required';
      if (payload.phone && !hasValidPhone(payload.phone)) return 'phone_invalid';
      if (payload.email && !isValidEmail(payload.email)) return 'email_invalid';
      if (!payload.consent) return 'consent_required';
      return null;
    }

    function sendViaApi(payload, cfg) {
      var url = cfg.endpoint || '/api/contact';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          if (res.ok && data.ok) return { ok: true };
          return { ok: false, error: (data && data.error) || 'server_error' };
        });
      });
    }

    function sendViaWeb3Forms(payload, cfg) {
      if (!cfg.web3formsAccessKey) return Promise.resolve({ ok: false, error: 'web3forms_key' });
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: cfg.web3formsAccessKey,
          subject: 'Заявка с сайта «Сладость в радость»',
          from_name: 'Сайт — форма связи',
          email: cfg.web3formsTo || '79189759453@ya.ru',
          phone: payload.phone,
          replyto: payload.email || undefined,
          message:
            (payload.phone ? 'Телефон: ' + payload.phone + '\n' : '') +
            (payload.email ? 'Почта: ' + payload.email + '\n' : '') +
            (payload.message ? '\n' + payload.message : '') +
            '\n\nСогласие на обработку ПДн: да'
        })
      }).then(function (res) {
        return res.json().then(function (data) {
          if (res.ok && data.success) return { ok: true };
          return { ok: false, error: 'server_error' };
        });
      });
    }

    function sendViaFormspree(payload, cfg) {
      if (!cfg.formspreeId) return Promise.resolve({ ok: false, error: 'formspree_id' });
      return fetch('https://formspree.io/f/' + encodeURIComponent(cfg.formspreeId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          phone: payload.phone,
          email: payload.email,
          message: payload.message,
          consent: 'yes',
          _subject: 'Заявка с сайта'
        })
      }).then(function (res) {
        if (res.ok) return { ok: true };
        return { ok: false, error: 'server_error' };
      });
    }

    function parseFormSubmitResponse(res, text) {
      var data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        data = null;
      }
      var msg = data && (data.message || data.error) ? String(data.message || data.error) : '';
      var successVal = data && data.success;

      if (msg.toLowerCase().indexOf('html file') !== -1 || msg.toLowerCase().indexOf('web server') !== -1) {
        return { ok: false, error: 'formsubmit_file', detail: msg };
      }
      if (msg.toLowerCase().indexOf('activ') !== -1) {
        return { ok: false, error: 'formsubmit_activate', detail: msg };
      }
      if (successVal === false || successVal === 'false') {
        return { ok: false, error: 'server_error', detail: msg };
      }
      if (res.ok && (successVal === true || successVal === 'true' || (typeof successVal === 'string' && successVal.length > 2))) {
        return { ok: true };
      }
      if (res.ok && !data) return { ok: true };
      return { ok: false, error: 'server_error', detail: msg };
    }

    function sendViaMailto(payload, cfg) {
      var to = cfg.formsubmitTo || cfg.web3formsTo || '79189759453@ya.ru';
      var lines = ['Заявка с сайта «Сладость в радость»', ''];
      if (payload.phone) lines.push('Телефон: ' + payload.phone);
      if (payload.email) lines.push('Почта: ' + payload.email);
      if (payload.message) {
        lines.push('');
        lines.push('Сообщение:');
        lines.push(payload.message);
      }
      lines.push('');
      lines.push('Согласие на обработку персональных данных: да');
      global.location.href =
        'mailto:' +
        encodeURIComponent(to) +
        '?subject=' +
        encodeURIComponent('Заявка с сайта') +
        '&body=' +
        encodeURIComponent(lines.join('\n'));
      return Promise.resolve({ ok: true, mode: 'mailto' });
    }

    function sendViaFormSubmit(payload, cfg) {
      var to = cfg.formsubmitTo || cfg.web3formsTo || '79189759453@ya.ru';
      if (!to) return Promise.resolve({ ok: false, error: 'formsubmit_to' });
      var textBody =
        (payload.phone ? 'Телефон: ' + payload.phone + '\n' : '') +
        (payload.email ? 'Почта: ' + payload.email + '\n' : '') +
        (payload.message ? 'Сообщение: ' + payload.message + '\n' : '') +
        'Согласие на обработку ПДн: да';

      var fd = new FormData();
      fd.append('_subject', 'Заявка с сайта');
      fd.append('_template', 'table');
      fd.append('_captcha', 'false');
      fd.append('phone', payload.phone || '');
      fd.append('email', payload.email || '');
      fd.append('message', textBody);
      if (payload.email) fd.append('_replyto', payload.email);

      return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(to), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd
      }).then(function (res) {
        return res.text().then(function (text) {
          return parseFormSubmitResponse(res, text);
        });
      });
    }

    function sendContactPayload(payload) {
      var cfg = getContactConfig();
      if (isFileProtocol()) return sendViaMailto(payload, cfg);

      var provider = (cfg.provider || 'formsubmit').toLowerCase();
      if (provider === 'mailto') return sendViaMailto(payload, cfg);
      if (provider === 'web3forms') return sendViaWeb3Forms(payload, cfg);
      if (provider === 'formspree') return sendViaFormspree(payload, cfg);
      if (provider === 'formsubmit') {
        return sendViaFormSubmit(payload, cfg).then(function (result) {
          if (!result.ok && result.error === 'formsubmit_file') {
            return sendViaMailto(payload, cfg);
          }
          return result;
        });
      }
      return sendViaApi(payload, cfg);
    }

    function onSubmit(e) {
      e.preventDefault();
      if (sending) return;
      showError('');

      var payload = collectPayload();
      var validationError = validateClient(payload);
      if (validationError) {
        showError(contactErrorMessage(validationError));
        if (validationError === 'contact_required' && phoneInput) phoneInput.focus();
        else if (validationError === 'phone_invalid' && phoneInput) phoneInput.focus();
        else if (validationError === 'email_invalid' && emailInput) emailInput.focus();
        else if (validationError === 'consent_required' && consentInput) consentInput.focus();
        return;
      }

      setSending(true);
      sendContactPayload(payload)
        .then(function (result) {
          setSending(false);
          if (result.ok) {
            showSuccessView(true, result.mode);
            return;
          }
          showError(contactErrorMessage(result.error));
        })
        .catch(function () {
          setSending(false);
          showError(contactErrorMessage('network'));
        });
    }

    document.querySelectorAll('[data-contact-open]').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        openContactModal();
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeContactModal);
    if (backdrop) backdrop.addEventListener('click', closeContactModal);

    form.addEventListener('submit', onSubmit);
    if (successCloseBtn) {
      successCloseBtn.addEventListener('click', closeContactModal);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        e.preventDefault();
        closeContactModal();
      }
    });
  }

  function initViewportFit() {
    function apply() {
      var w = document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--vw', w * 0.01 + 'px');
      syncPackagingBowAnchor();
      if (window.scrollX !== 0) {
        window.scrollTo(0, window.scrollY || 0);
      }
      document.querySelectorAll('.parallax-wrap [data-depth-child]').forEach(function (el) {
        if (global.matchMedia && global.matchMedia('(max-width: 1024px)').matches) {
          el.style.transform = '';
        }
      });
    }
    apply();
    global.addEventListener('resize', apply);
    global.addEventListener('scroll', syncPackagingBowAnchor, { passive: true });
    global.addEventListener('orientationchange', function () {
      setTimeout(apply, 120);
    });
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', apply);
    }
  }

  function boot() {
    bootWorksGallery();
    initContactModal();
    initThemeToggle();
    initMobileNav();
    initViewportFit();
    syncPackagingBowAnchor();
    requestAnimationFrame(syncPackagingBowAnchor);
    requestAnimationFrame(function () {
      requestAnimationFrame(syncPackagingBowAnchor);
    });
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(syncPackagingBowAnchor);
      var header = document.querySelector('.site-header');
      var shell = document.querySelector('.site-header .header__inner');
      if (header) ro.observe(header);
      if (shell) ro.observe(shell);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
