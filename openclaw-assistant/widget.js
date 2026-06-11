(function () {
  'use strict';

  var cfg = window.OPENCLAW_ASSISTANT || {};
  var API_BASE = cfg.apiBase || window.OPENCLAW_SITE_API || '/api/site-assistant';
  var ENABLED = cfg.enabled !== false && cfg.enabled !== 0;

  var SCOPES = {
    product_support: {
      label: 'Функции приложения',
      placeholder: 'Например: что умеет калькулятор кондитера?'
    },
    purchase_navigation: {
      label: 'Подключение и покупка',
      placeholder: 'Например: как получить доступ к «Кулинарной книге»?'
    },
    access_support: {
      label: 'Проблема с доступом',
      placeholder: 'Например: не получается войти или восстановить доступ'
    },
    legal_product_docs: {
      label: 'Условия и документы',
      placeholder: 'Например: где прочитать соглашение и политику конфиденциальности?'
    }
  };

  var ERROR_MESSAGES = {
    gateway_not_configured:
      'Помощник ещё не подключён к серверу. Напишите на 79189759453@ya.ru с темой «Кулинарная книга».',
    gateway_unavailable:
      'Помощник временно недоступен — идёт настройка. Напишите на 79189759453@ya.ru с темой «Кулинарная книга».',
    origin_not_allowed: 'Откройте официальный сайт и попробуйте снова.',
    rate_limited: 'Слишком много запросов. Подождите минуту.',
    invalid_scope: 'Выберите тему вопроса из списка.',
    empty_question: 'Введите вопрос своими словами.',
    question_too_long: 'Сократите вопрос — максимум 800 символов.',
    internal_error:
      'Не удалось получить ответ. Напишите на 79189759453@ya.ru с темой «Кулинарная книга».'
  };

  var currentScope = 'product_support';
  var sessionId = localStorage.getItem('oc_site_sid') || '';
  var lastFocus = null;

  function el(id) {
    return document.getElementById(id);
  }

  function scopeMeta(scope) {
    return SCOPES[scope] || SCOPES.product_support;
  }

  function humanError(code) {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES.internal_error;
  }

  function buildScopeOptions() {
    return Object.keys(SCOPES)
      .map(function (key) {
        return '<option value="' + key + '">' + SCOPES[key].label + '</option>';
      })
      .join('');
  }

  function isOpen() {
    var modal = el('ocAiModal');
    return modal && modal.classList.contains('contact-modal--open');
  }

  function initAssistantGlow() {
    var fx = window.SladostEffects;
    if (!fx || !fx.initBorderGlowNodes) return;
    var modal = el('ocAiModal');
    if (!modal) return;
    var opts = {
      starSpeed: '4s',
      glowSpeed: '4s',
      backgroundColor: 'transparent',
      borderRadius: 22,
      kind: 'btn'
    };
    var nodes = modal.querySelectorAll('.carousel-glass-btn, .oc-ai-actions .btn');
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].closest('.border-glow-card')) list.push(nodes[i]);
    }
    if (list.length) fx.initBorderGlowNodes(list, opts);
  }

  function ensureModal() {
    if (el('ocAiModal')) return;

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="ocAiModal" class="oc-ai-modal contact-modal" aria-hidden="true" aria-labelledby="ocAiTitle">' +
      '<div class="contact-modal__backdrop" tabindex="-1"></div>' +
      '<div class="contact-modal__panel oc-ai-panel" role="dialog" aria-modal="true">' +
      '<div class="contact-modal__body">' +
      '<header class="contact-modal__head">' +
      '<div class="contact-modal__head-copy">' +
      '<h2 id="ocAiTitle" class="contact-modal__title">Помощник по приложению</h2>' +
      '<p class="contact-modal__lead oc-ai-warning">' +
      'Не отправляйте пароли, данные карты, телефоны клиентов, личные рецепты или приватные документы. ' +
      'Помощник отвечает только по функциям приложения и условиям подключения.' +
      '</p>' +
      '</div>' +
      '<button type="button" class="contact-modal__close carousel-glass-btn" id="ocAiClose" aria-label="Закрыть">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M18 6L6 18M6 6l12 12"/>' +
      '</svg>' +
      '</button>' +
      '</header>' +
      '<form class="oc-ai-form contact-form" novalidate onsubmit="return false">' +
      '<label class="contact-field" for="ocAiScope">' +
      '<span class="contact-field__label">Тема вопроса</span>' +
      '<span class="contact-field__control">' +
      '<select id="ocAiScope" class="contact-field__input oc-ai-scope">' +
      buildScopeOptions() +
      '</select>' +
      '</span>' +
      '</label>' +
      '<label class="contact-field contact-field--area" for="ocAiQuestion">' +
      '<span class="contact-field__label">Ваш вопрос</span>' +
      '<textarea id="ocAiQuestion" class="contact-field__input contact-field__input--area oc-ai-question" maxlength="800" rows="3" placeholder=""></textarea>' +
      '</label>' +
      '<div class="contact-form__foot oc-ai-actions">' +
      '<button type="button" class="btn btn--ghost btn--3d" id="ocAiCancel">Закрыть</button>' +
      '<button type="button" class="btn btn--accent btn--3d contact-form__submit" id="ocAiSend">Отправить</button>' +
      '</div>' +
      '</form>' +
      '<div id="ocAiAnswer" class="oc-ai-answer" hidden></div>' +
      '</div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(wrap);

    el('ocAiScope').addEventListener('change', syncScopeFromSelect);
    el('ocAiClose').addEventListener('click', closeModal);
    el('ocAiCancel').addEventListener('click', closeModal);
    el('ocAiSend').addEventListener('click', sendQuestion);
    el('ocAiModal').addEventListener('click', function (e) {
      if (e.target.classList.contains('contact-modal__backdrop')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) closeModal();
    });

    initAssistantGlow();
  }

  function syncScopeFromSelect() {
    currentScope = el('ocAiScope').value || 'product_support';
    el('ocAiQuestion').placeholder = scopeMeta(currentScope).placeholder;
  }

  function openModal(scope) {
    ensureModal();
    currentScope = scope && SCOPES[scope] ? scope : 'product_support';
    el('ocAiScope').value = currentScope;
    el('ocAiQuestion').placeholder = scopeMeta(currentScope).placeholder;
    el('ocAiQuestion').value = '';
    el('ocAiAnswer').hidden = true;
    el('ocAiAnswer').textContent = '';
    el('ocAiAnswer').className = 'oc-ai-answer';

    lastFocus = document.activeElement;
    el('ocAiModal').classList.add('contact-modal--open');
    el('ocAiModal').setAttribute('aria-hidden', 'false');
    document.body.classList.add('contact-modal-lock');

    if (!el('ocAiModal').querySelector('.oc-ai-actions .border-glow-card')) {
      initAssistantGlow();
    }

    el('ocAiScope').focus();
  }

  function closeModal() {
    var modal = el('ocAiModal');
    if (!modal) return;
    modal.classList.remove('contact-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('contact-modal') || !document.getElementById('contact-modal').classList.contains('contact-modal--open')) {
      document.body.classList.remove('contact-modal-lock');
    }
    if (lastFocus && lastFocus.focus) {
      try {
        lastFocus.focus();
      } catch (err) {}
    }
  }

  function showAnswer(text, kind) {
    var box = el('ocAiAnswer');
    box.hidden = false;
    box.textContent = text;
    box.className = 'oc-ai-answer' + (kind ? ' oc-ai-answer--' + kind : '');
  }

  function disabledMessage() {
    return (
      'Помощник по приложению скоро будет доступен на сайте. ' +
      'Пока напишите на 79189759453@ya.ru с темой «Кулинарная книга» — отвечу лично.'
    );
  }

  async function sendQuestion() {
    syncScopeFromSelect();
    var question = el('ocAiQuestion').value.trim();
    if (!question) return;

    if (!ENABLED) {
      showAnswer(disabledMessage(), 'muted');
      return;
    }

    showAnswer('Думаю…');
    el('ocAiSend').disabled = true;

    try {
      var res = await fetch(API_BASE + '/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          scope: currentScope,
          question: question,
          sessionId: sessionId || undefined
        })
      });
      var data = await res.json().catch(function () {
        return {};
      });

      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem('oc_site_sid', sessionId);
      }

      if (data.answer) {
        showAnswer(data.answer, res.ok ? undefined : 'muted');
        return;
      }

      if (data.error) {
        showAnswer(humanError(data.error), 'error');
        return;
      }

      showAnswer(humanError('internal_error'), 'error');
    } catch (err) {
      showAnswer(humanError('gateway_unavailable'), 'error');
    } finally {
      el('ocAiSend').disabled = false;
    }
  }

  document.querySelectorAll('[data-ai-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.getAttribute('data-ai-open') || 'product_support');
    });
  });

  window.OpenClawSiteAssistant = {
    open: openModal,
    close: closeModal,
    isEnabled: function () {
      return ENABLED;
    }
  };
})();
