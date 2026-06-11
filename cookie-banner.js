(function (global) {
  'use strict';

  var STORAGE_KEY = 'sladost-cookie-consent';
  var banner = document.getElementById('cookie-banner');

  function getChoice() {
    try {
      return global.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setChoice(value) {
    try {
      global.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('cookie-banner--visible');
    banner.setAttribute('aria-hidden', 'true');
  }

  function showBanner() {
    if (!banner) return;
    banner.classList.add('cookie-banner--visible');
    banner.setAttribute('aria-hidden', 'false');
  }

  function acceptAll() {
    setChoice('all');
    hideBanner();
  }

  function acceptNecessary() {
    setChoice('necessary');
    hideBanner();
  }

  function initCookieBanner() {
    if (!banner) return;
    if (getChoice()) {
      hideBanner();
      return;
    }
    showBanner();

    var acceptBtn = document.getElementById('cookie-banner-accept');
    var necessaryBtn = document.getElementById('cookie-banner-necessary');
    if (acceptBtn) acceptBtn.addEventListener('click', acceptAll);
    if (necessaryBtn) necessaryBtn.addEventListener('click', acceptNecessary);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieBanner);
  } else {
    initCookieBanner();
  }

  global.SladostCookie = {
    getChoice: getChoice,
    acceptAll: acceptAll,
    acceptNecessary: acceptNecessary
  };
})(typeof window !== 'undefined' ? window : this);
