/**
 * Публичный помощник по «Кулинарной книге» (OpenClaw agent public).
 *
 * После деплоя site-assistant на VPS:
 * 1. enabled: true
 * 2. apiBase — URL API (тот же домен с nginx proxy или поддомен)
 *
 * Пример nginx: /api/site-assistant/ → 127.0.0.1:3080
 */
window.OPENCLAW_ASSISTANT = {
  enabled: false,
  apiBase: '/api/site-assistant'
};
