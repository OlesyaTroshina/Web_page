/**
 * Эффекты по ТЗ: CardSwap, BorderGlow (2px rim), BounceCards
 */
(function (global) {
  'use strict';

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  function easeInCubic(x) {
    return x * x * x;
  }

  function animateValue(opts) {
    var start = opts.start !== undefined ? opts.start : 0;
    var end = opts.end !== undefined ? opts.end : 100;
    var duration = opts.duration || 1000;
    var delay = opts.delay || 0;
    var ease = opts.ease || easeOutCubic;
    var onUpdate = opts.onUpdate;
    var onEnd = opts.onEnd;
    var t0 = performance.now() + delay;
    function tick() {
      var elapsed = performance.now() - t0;
      var t = Math.min(elapsed / duration, 1);
      onUpdate(start + (end - start) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
      else if (onEnd) onEnd();
    }
    setTimeout(function () {
      requestAnimationFrame(tick);
    }, delay);
  }

  var __sladostBorderGlowOpts = null;

  function normalizeManifestImage(item) {
    if (!item) return { thumb: '', full: '' };
    if (typeof item === 'string') return { thumb: item, full: item };
    return {
      thumb: item.thumb || item.full || '',
      full: item.full || item.thumb || ''
    };
  }

  var SLADOST_TILE_GLOW_SELECTOR =
    'main#top .app-tile, main#top .step, main#top .benefit, main#top .cta__panel, main#top .about__photo';

  function getRainbowGlowOpts(mobile) {
    return {
      starSpeed: '4s',
      glowSpeed: '4s',
      backgroundColor: 'transparent',
      borderRadius: mobile ? 18 : 22,
      kind: 'btn',
    };
  }

  function getTileGlowOpts() {
    return {
      starSpeed: '5s',
      glowSpeed: '5s',
      backgroundColor: 'transparent',
      borderRadius: 32,
      kind: 'tile'
    };
  }

  var HERO_DEFAULT_SRC = 'assets/web/hero.webp?v=20260524a';
  var __heroPickOnce = null;

  function encodeAssetPath(path) {
    if (!path || /^https?:\/\//i.test(path)) return path;
    return path
      .split('/')
      .map(function (part) {
        if (!part) return part;
        if (/[^\u0020-\u007E]/.test(part)) {
          try {
            return encodeURIComponent(decodeURIComponent(part));
          } catch (e) {
            return encodeURIComponent(part);
          }
        }
        return part;
      })
      .join('/');
  }

  function stripAssetQuery(path) {
    return (path || '').replace(/\?.*$/, '');
  }

  function pickHeroFromManifest(data) {
    var exclude = {};
    exclude[stripAssetQuery(HERO_DEFAULT_SRC)] = true;
    if (data.hero) {
      var heroRef = normalizeManifestImage(data.hero);
      if (heroRef.thumb) exclude[stripAssetQuery(heroRef.thumb)] = true;
      if (heroRef.full) exclude[stripAssetQuery(heroRef.full)] = true;
    }

    var pool = [];
    var cats = data.categories || [];
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      if (cat.id === 'cakes' || cat.id === 'торты' || /торт/i.test(cat.title || '')) {
        (cat.images || []).forEach(function (item) {
          var img = normalizeManifestImage(item);
          var full = img.full || '';
          var thumb = img.thumb || '';
          if ((full && exclude[stripAssetQuery(full)]) || (thumb && exclude[stripAssetQuery(thumb)])) {
            return;
          }
          if (full) {
            pool.push({
              src: full,
              fallback: thumb && thumb !== full ? thumb : '',
              title: cat.title || 'Торты'
            });
          } else if (thumb) {
            pool.push({ src: thumb, fallback: '', title: cat.title || 'Торты' });
          }
        });
        break;
      }
    }

    if (!pool.length) {
      if (data.hero) {
        var hero = normalizeManifestImage(data.hero);
        if (hero.thumb || hero.full) {
          return {
            src: hero.full || hero.thumb,
            fallback: hero.thumb && hero.thumb !== hero.full ? hero.thumb : '',
            title: data.hero.title || 'Торты'
          };
        }
      }
      return { src: HERO_DEFAULT_SRC, title: 'Торты' };
    }

    var pick = pool[Math.floor(Math.random() * pool.length)];
    return { src: pick.src, fallback: pick.fallback, title: pick.title };
  }

  function getHeroPick(data) {
    if (__heroPickOnce) return __heroPickOnce;
    __heroPickOnce = pickHeroFromManifest(data);
    return __heroPickOnce;
  }

  function rememberHeroDefaults(heroImg) {
    if (!heroImg || heroImg.dataset.heroFallback) return;
    heroImg.dataset.heroFallback = heroImg.currentSrc || heroImg.getAttribute('src') || HERO_DEFAULT_SRC;
    heroImg.dataset.heroAltFallback = heroImg.alt || 'Торт ручной работы — Олеся Трошина';
    var picture = heroImg.closest ? heroImg.closest('picture') : null;
    if (picture) {
      var source = picture.querySelector('source');
      if (source && source.getAttribute('srcset')) {
        heroImg.dataset.heroSourceFallback = source.getAttribute('srcset');
      }
    }
  }

  function commitHeroPhoto(heroImg, src, alt, fromManifest) {
    var picture = heroImg.closest ? heroImg.closest('picture') : null;
    if (picture) {
      var source = picture.querySelector('source');
      if (source) {
        if (/\.webp(?:\?|$)/i.test(src)) {
          source.setAttribute('srcset', src);
          source.type = 'image/webp';
        } else {
          source.removeAttribute('srcset');
          source.removeAttribute('type');
        }
      }
    }
    heroImg.removeAttribute('srcset');
    heroImg.src = src;
    var preload = document.querySelector('link[rel="preload"][as="image"][href*="hero"]');
    if (preload) preload.setAttribute('href', src);
    if (fromManifest) {
      heroImg.alt = alt;
    }
    heroImg.onerror = function () {
      revertHeroPhoto(heroImg);
    };
  }

  function revertHeroPhoto(heroImg) {
    if (!heroImg) return;
    var fallback = heroImg.dataset.heroFallback || HERO_DEFAULT_SRC;
    var picture = heroImg.closest ? heroImg.closest('picture') : null;
    if (picture) {
      var source = picture.querySelector('source');
      if (source) {
        if (heroImg.dataset.heroSourceFallback) {
          source.setAttribute('srcset', heroImg.dataset.heroSourceFallback);
          source.type = 'image/webp';
        }
      }
    }
    heroImg.onerror = null;
    heroImg.src = fallback;
    heroImg.alt = heroImg.dataset.heroAltFallback || 'Торт ручной работы — Олеся Трошина';
  }

  function applyHeroPhoto(heroPick) {
    if (!heroPick) return;
    var heroImg = document.querySelector('.hero__photo');
    if (!heroImg) return;
    rememberHeroDefaults(heroImg);

    var alt = 'Торт ручной работы — ' + (heroPick.title || 'Торты');
    var candidates = [];
    if (heroPick.src) candidates.push(heroPick.src);
    if (heroPick.fallback && candidates.indexOf(heroPick.fallback) === -1) {
      candidates.push(heroPick.fallback);
    }
    var builtIn = heroImg.dataset.heroFallback || HERO_DEFAULT_SRC;
    if (candidates.indexOf(builtIn) === -1) candidates.push(builtIn);

    function pathVariants(raw) {
      var variants = [];
      if (raw) {
        variants.push(raw);
        var enc = encodeAssetPath(raw);
        if (enc && variants.indexOf(enc) === -1) variants.push(enc);
      }
      return variants;
    }

    var probeQueue = [];
    candidates.forEach(function (raw, candidateIdx) {
      var fromManifest = candidateIdx < candidates.length - 1;
      pathVariants(raw).forEach(function (src) {
        probeQueue.push({ src: src, fromManifest: fromManifest });
      });
    });

    function tryProbe(idx) {
      if (idx >= probeQueue.length) {
        revertHeroPhoto(heroImg);
        return;
      }
      var item = probeQueue[idx];
      var probe = new Image();
      probe.onload = function () {
        commitHeroPhoto(heroImg, item.src, alt, item.fromManifest);
      };
      probe.onerror = function () {
        tryProbe(idx + 1);
      };
      probe.src = item.src;
    }

    tryProbe(0);
  }

  function tryApplyHeroFromManifest() {
    var cached = parseWorksManifestFromDom();
    if (cached) applyHeroPhoto(getHeroPick(cached));
    loadWorksManifest('works-manifest.json')
      .then(function (data) {
        applyHeroPhoto(getHeroPick(data));
      })
      .catch(function () {});
  }

  function bootHeroFromManifestSync() {
    try {
      var data = parseWorksManifestFromDom();
      if (data) applyHeroPhoto(getHeroPick(data));
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Сладость в радость] hero boot', err);
      }
    }
  }

  function pickInitialStackOffset(poolLen, catId) {
    if (!poolLen || poolLen <= 1) return 0;
    if (!global.__worksStackOffsets) global.__worksStackOffsets = {};
    if (global.__worksStackOffsets[catId] != null) {
      return global.__worksStackOffsets[catId] % poolLen;
    }
    var seed = Math.floor(Math.random() * poolLen);
    global.__worksStackOffsets[catId] = seed;
    return seed;
  }

  function rememberStackOffsets(columnState, cats) {
    if (!global.__worksStackOffsets) global.__worksStackOffsets = {};
    columnState.forEach(function (cre, i) {
      var id = cats[i] && cats[i].id ? cats[i].id : 'col-' + i;
      global.__worksStackOffsets[id] = cre.offset;
    });
  }

  function isBorderGlowButton(el) {
    if (!el || !el.classList) return false;
    var c = el.classList;
    return (
      c.contains('btn') ||
      c.contains('floating-cta') ||
      c.contains('theme-toggle') ||
      c.contains('burger') ||
      c.contains('social-btn') ||
      c.contains('mini-btn') ||
      c.contains('carousel-glass-btn')
    );
  }

  function shouldSkipBorderGlowTarget(el) {
    if (!el || !el.classList) return true;
    if (el.closest('.border-glow-card--btn')) return true;
    /* Кнопки внутри плитки (CTA и т.п.) — своя обводка, не пропускать */
    if (el.closest('.border-glow-card--tile')) {
      return !isBorderGlowButton(el);
    }
    if (el.closest('.border-glow-card')) return true;
    if (el.closest('.hero__visual')) return true;
    if (el.closest('.reviews__swap-wrap, .card-swap-container')) return true;
    if (el.closest('.faq__list')) return true;
    if (el.classList.contains('btn--no-glow')) return true;
    return false;
  }

  function pickBorderGlowLayout(el, mobile, options) {
    var d = options.borderRadius != null ? options.borderRadius : mobile ? 18 : 22;
    var c = el.classList;
    if (c.contains('carousel-glass-btn') || c.contains('works-carousel__close')) {
      d = 999;
    } else if (c.contains('works-carousel__nav')) {
      d = 999;
    } else if (c.contains('social-btn')) {
      d = 999;
    } else if (c.contains('theme-toggle')) {
      d = 20;
    } else if (c.contains('burger')) {
      d = 20;
    } else if (c.contains('mini-btn')) {
      d = 14;
    } else if (c.contains('floating-cta')) {
      d = mobile ? 20 : 24;
    } else if (c.contains('works-carousel__thumb')) {
      d = 10;
    } else if (el.closest && el.closest('.footer')) {
      d = 11;
    } else if (
      c.contains('app-tile') ||
      c.contains('step') ||
      c.contains('benefit') ||
      c.contains('cta__panel') ||
      c.contains('about__photo')
    ) {
      var cs = global.getComputedStyle ? global.getComputedStyle(el) : null;
      var br = cs ? parseFloat(cs.borderTopLeftRadius) : 0;
      d = br > 0 ? Math.round(br) : 28;
    }
    return { borderRadius: d };
  }

  var BORDER_GLOW_BOLT_MS = 2050;
  var BORDER_GLOW_BOLT_CLICK_MS = 940;

  function setBorderGlowPointer(wrap, e) {
    if (!e || e.clientX == null) return;
    var rect = wrap.getBoundingClientRect();
    var dx = e.clientX - rect.left - rect.width / 2;
    var dy = e.clientY - rect.top - rect.height / 2;
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);
    wrap.style.setProperty('--glow-pointer', angle.toFixed(1) + 'deg');
  }

  function triggerBorderGlowBolt(wrap, kind) {
    if (!wrap) return;
    if (!global.matchMedia || global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var isClick = kind === 'click';
    if (!isClick) {
      if (wrap.classList.contains('border-glow-revealed')) return;
      wrap.classList.add('border-glow-revealed');
    }
    var cls = isClick ? 'border-glow-bolt--click' : 'border-glow-bolt';
    var ms = isClick ? BORDER_GLOW_BOLT_CLICK_MS : BORDER_GLOW_BOLT_MS;
    wrap.classList.remove('border-glow-bolt', 'border-glow-bolt--click');
    void wrap.offsetWidth;
    wrap.classList.add(cls);
    setTimeout(function () {
      wrap.classList.remove(cls);
    }, ms);
  }

  function getRevealPartner(wrap) {
    if (!wrap) return null;
    var inner = wrap.querySelector('.reveal');
    if (inner) return inner;
    return wrap.closest ? wrap.closest('.reveal') : null;
  }

  function scheduleBorderGlowBolt(wrap) {
    if (!wrap) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        triggerBorderGlowBolt(wrap);
      });
    });
  }

  /** Молния на канте — вместе с .reveal.visible (scroll-reveal) */
  function boltBorderGlowForReveal(el) {
    if (!el) return;
    var seen = [];
    function add(wrap) {
      if (!wrap || seen.indexOf(wrap) !== -1) return;
      seen.push(wrap);
    }
    if (el.classList && el.classList.contains('border-glow-card')) add(el);
    if (el.querySelectorAll) {
      el.querySelectorAll('.border-glow-card').forEach(add);
    }
    if (!seen.length && el.closest) {
      var parent = el.closest('.border-glow-card');
      if (parent) add(parent);
    }
    seen.forEach(scheduleBorderGlowBolt);
  }

  function watchBorderGlowReveal(wrap) {
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var revealEl = getRevealPartner(wrap);

    if (revealEl) {
      if (revealEl.classList.contains('visible')) {
        scheduleBorderGlowBolt(wrap);
        return;
      }
      var mo = new MutationObserver(function () {
        if (revealEl.classList.contains('visible')) {
          mo.disconnect();
          scheduleBorderGlowBolt(wrap);
        }
      });
      mo.observe(revealEl, { attributes: true, attributeFilter: ['class'] });
      return;
    }

    if (typeof IntersectionObserver === 'undefined') return;

    var obs = new IntersectionObserver(
      function (entries, observer) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;
          scheduleBorderGlowBolt(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    );
    obs.observe(wrap);
  }

  function syncBorderGlowRevealsAfterInit() {
    document.querySelectorAll('.border-glow-card').forEach(function (wrap) {
      var revealEl = getRevealPartner(wrap);
      if (revealEl && revealEl.classList.contains('visible')) {
        scheduleBorderGlowBolt(wrap);
      }
    });
  }

  function applyBorderGlowToElement(btn, options) {
    options = options || __sladostBorderGlowOpts || {};
    if (!btn || !btn.parentNode) return;
    var isTile = options.kind === 'tile';
    /* Кнопки внутри плитки (CTA, app-tile…) — отдельная обёртка --btn; плитку не дублируем */
    if (btn.closest('.border-glow-card--btn')) return;
    if (isTile && btn.closest('.border-glow-card--tile')) return;
    if (shouldSkipBorderGlowTarget(btn)) return;
    var mobile = global.matchMedia && global.matchMedia('(max-width: 640px)').matches;
    var layout = pickBorderGlowLayout(btn, mobile, options);
      var wrap = document.createElement('div');
    wrap.className = isTile ? 'border-glow-card border-glow-card--tile' : 'border-glow-card border-glow-card--btn';
    if (!isTile && btn.classList && btn.classList.contains('floating-cta')) {
      var inPageBlock = btn.closest(
        '.app-assistant, .cta__panel, .cookbook__cta, .hero__actions, .cookbook__showcase'
      );
      var inDock = btn.closest('.floating-dock');
      if (inDock) {
        wrap.classList.add('border-glow-card--dock');
        if (btn.classList.contains('floating-cta--assistant')) {
          wrap.classList.add('border-glow-card--assistant-tint');
        }
      } else if (!inPageBlock) {
        wrap.classList.add('border-glow-card--floating');
        if (btn.classList.contains('floating-cta--assistant')) {
          wrap.classList.add('border-glow-card--floating-assistant');
        }
      } else if (btn.classList.contains('floating-cta--assistant')) {
        wrap.classList.add('border-glow-card--assistant-tint');
      }
    }
      var inner = document.createElement('div');
    inner.className = isTile
      ? 'border-glow-inner border-glow-surface--matte'
      : 'border-glow-inner border-glow-surface--lens';
      btn.parentNode.insertBefore(wrap, btn);
      inner.appendChild(btn);
      wrap.appendChild(inner);

    var speed = options.glowSpeed || options.starSpeed || '4s';
    wrap.style.setProperty('--border-radius', layout.borderRadius + 'px');
    wrap.style.setProperty('--glow-speed', speed);
    wrap.style.setProperty('--rim-size', '2px');
    wrap.style.setProperty('--glow-pointer', '0deg');

    wrap.addEventListener('pointerenter', function (e) {
      setBorderGlowPointer(wrap, e);
    });

    wrap.addEventListener(
      'pointerdown',
      function (e) {
        if (e.button != null && e.button !== 0) return;
        setBorderGlowPointer(wrap, e);
        triggerBorderGlowBolt(wrap, 'click');
      },
      true
    );

    watchBorderGlowReveal(wrap);
  }

  /** Номера шагов — только CSS (.step__badge), без вложенного BorderGlow */
  function unwrapStepNumbersFromBorderGlow() {
    document.querySelectorAll('main#top .step .border-glow-card--btn').forEach(function (wrap) {
      var num = wrap.querySelector('.step__num');
      if (!num) return;
      var badge = wrap.closest('.step__badge');
      if (badge) {
        badge.appendChild(num);
      } else if (wrap.parentNode) {
        wrap.parentNode.insertBefore(num, wrap);
      }
      wrap.remove();
    });
  }

  function initBorderGlow(selector, options) {
    options = options || __sladostBorderGlowOpts || {};
    var nodes = document.querySelectorAll(selector || '.btn');
    nodes.forEach(function (btn) {
      applyBorderGlowToElement(btn, options);
    });
  }

  function initBorderGlowNodes(nodes, extra) {
    if (!nodes || !nodes.length) return;
    var base = __sladostBorderGlowOpts || {};
    var options = {};
    Object.keys(base).forEach(function (k) {
      options[k] = base[k];
    });
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        options[k] = extra[k];
      });
    }
    for (var i = 0; i < nodes.length; i++) {
      applyBorderGlowToElement(nodes[i], options);
    }
  }

  /* ——— CardSwap ——— */
  function initCardSwap(container, cards, options) {
    if (!global.gsap || !container || !cards || !cards.length) return;
    options = options || {};
    var gsap = global.gsap;
    var cardDistance = options.cardDistance || 50;
    var verticalDistance = options.verticalDistance || 95;
    var delay = options.delay || 5000;
    var skewAmount = options.skewAmount || 6;
    var width = options.width || 420;
    var height = options.height || 280;
    var easing = options.easing || 'elastic';
    var config =
      easing === 'elastic'
        ? { ease: 'elastic.out(0.6,0.9)', durDrop: 2, durMove: 2, durReturn: 2, promoteOverlap: 0.9, returnDelay: 0.05 }
        : { ease: 'power1.inOut', durDrop: 0.8, durMove: 0.8, durReturn: 0.8, promoteOverlap: 0.45, returnDelay: 0.2 };

    var root = document.createElement('div');
    root.className = 'card-swap-container';
    root.style.width = width + 'px';
    root.style.height = height + 'px';
    container.innerHTML = '';
    container.appendChild(root);

    var refs = [];
    var order = cards.map(function (_, i) {
      return i;
    });

    function makeSlot(i, total) {
      /* Стопка от верхнего левого угла: «глубина» — вниз и вправо (те же шаги, зеркально) */
      return { x: i * cardDistance, y: i * verticalDistance, z: -i * cardDistance * 1.5, zIndex: total - i };
    }

    function placeNow(el, slot) {
      gsap.set(el, {
        x: slot.x,
        y: slot.y,
        z: slot.z,
        xPercent: 0,
        yPercent: 0,
        skewY: skewAmount,
        transformOrigin: '0% 0',
        zIndex: slot.zIndex,
        force3D: true
      });
    }

    cards.forEach(function (cardEl, i) {
      var el = document.createElement('article');
      el.className = 'card-swap-card glass-card';
      el.appendChild(cardEl);
      root.appendChild(el);
      refs.push(el);
    });

    var total = refs.length;
    refs.forEach(function (el, i) {
      placeNow(el, makeSlot(i, total));
    });

    var intervalId;
    var tlRef;
    var isAnimating = false;
    var pauseOnHover = options.pauseOnHover === true;

    function swap() {
      if (isAnimating || order.length < 2) return;
      isAnimating = true;
      if (tlRef) tlRef.kill();

      var front = order[0];
      var rest = order.slice(1);
      var elFront = refs[front];
      var tl = gsap.timeline({
        onComplete: function () {
          isAnimating = false;
        }
      });
      tlRef = tl;
      tl.to(elFront, { y: '+=500', duration: config.durDrop, ease: config.ease });
      tl.addLabel('promote', '-=' + config.durDrop * config.promoteOverlap);
      rest.forEach(function (idx, i) {
        var el = refs[idx];
        var slot = makeSlot(i, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(
          el,
          { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease },
          'promote+=' + i * 0.15
        );
      });
      var backSlot = makeSlot(refs.length - 1, refs.length);
      tl.addLabel('return', 'promote+=' + config.durMove * config.returnDelay);
      tl.call(function () {
        gsap.set(elFront, { zIndex: backSlot.zIndex });
      }, null, 'return');
      tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease }, 'return');
      tl.call(function () {
        order = rest.concat([front]);
      });
    }

    function resetAutoSwap() {
      clearInterval(intervalId);
      intervalId = window.setInterval(swap, delay);
    }

    function onUserFlip() {
      swap();
      resetAutoSwap();
    }

    function onRootClick(e) {
      if (e.target && e.target.closest && e.target.closest('a')) return;
      onUserFlip();
    }
    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onUserFlip();
      }
    }

    root.setAttribute('role', 'button');
    root.setAttribute('tabindex', '0');
    root.setAttribute('aria-label', 'Следующий отзыв — кликните для перелистывания');
    root.addEventListener('click', onRootClick);
    root.addEventListener('keydown', onKey);

    swap();
    intervalId = window.setInterval(swap, delay);

    var onPause;
    var onResume;
    if (pauseOnHover) {
      onPause = function () {
        if (tlRef) tlRef.pause();
        clearInterval(intervalId);
      };
      onResume = function () {
        if (tlRef) tlRef.play();
        resetAutoSwap();
      };
      root.addEventListener('mouseenter', onPause);
      root.addEventListener('mouseleave', onResume);
    }

    return function destroy() {
      clearInterval(intervalId);
      root.removeEventListener('click', onRootClick);
      root.removeEventListener('keydown', onKey);
      if (onPause) root.removeEventListener('mouseenter', onPause);
      if (onResume) root.removeEventListener('mouseleave', onResume);
      if (tlRef) tlRef.kill();
    };
  }

  /* ——— BounceCards ——— */
  var WORKS_BOUNCE_CARD_COUNT = 10;
  var WORKS_BOUNCE_ROTATE_MS = 3 * 60 * 1000;

  /* Ключевые точки веера (как в ТЗ на 5 карточек), интерполируем на cardCount; compact — плотнее при 10+ */
  function buildFanTransformStyles(cardCount, colWidth) {
    var w = colWidth || Math.max(100, (window.innerWidth - 40) / 3);
    var ref = 500;
    var scale = Math.min(1, Math.max(0.22, w / ref));
    var compact = Math.min(1, 5.5 / Math.max(5, cardCount));
    function sc(px) {
      return Math.max(6, Math.round(px * scale * compact));
    }
    var base = [
      { r: 5, tx: -150 },
      { r: 0, tx: -70 },
      { r: -5, tx: 0 },
      { r: 5, tx: 70 },
      { r: -5, tx: 150 }
    ];
    var nBase = base.length;
    var out = [];
    var i;
    for (i = 0; i < cardCount; i++) {
      var t = cardCount <= 1 ? 0 : i / (cardCount - 1);
      var j = t * (nBase - 1);
      var j0 = Math.floor(j);
      var j1 = Math.min(nBase - 1, j0 + 1);
      var u = j - j0;
      var r = base[j0].r * (1 - u) + base[j1].r * u;
      var tx = sc(base[j0].tx * (1 - u) + base[j1].tx * u);
      out.push('rotate(' + r.toFixed(2) + 'deg) translate(' + tx + 'px)');
    }
    return out;
  }

  function getWorksBounceMetrics(colWidth, cardCount) {
    var n = cardCount || WORKS_BOUNCE_CARD_COUNT;
    var w = colWidth || Math.max(100, (window.innerWidth - 40) / 3);
    var ref = 500;
    var scale = Math.min(1, Math.max(0.22, w / ref));
    return {
      containerWidth: Math.max(88, Math.floor(w)),
      containerHeight: Math.max(160, Math.floor(w * (0.38 + n * 0.038))),
      transformStyles: buildFanTransformStyles(n, w),
      pushOffset: Math.max(32, Math.min(130, Math.round(160 * scale * (5 / n))))
    };
  }

  function initBounceCards(mount, images, options) {
    if (!global.gsap || !mount || !images || !images.length) return { destroy: function () {} };
    var gsap = global.gsap;
    options = options || {};
    var maxN = options.maxCards != null ? options.maxCards : WORKS_BOUNCE_CARD_COUNT;
    var transforms = options.transformStyles || buildFanTransformStyles(maxN, options.containerWidth || 320);
    var pushOffset = options.pushOffset || 100;
    var containerWidth = options.containerWidth || 320;
    var containerHeight = options.containerHeight || 220;
    var imgs = images.slice(0, Math.min(maxN, images.length));

    mount.innerHTML = '';
    var root = document.createElement('div');
    root.className =
      'bounce-cards-container' + (options.containerClass ? ' ' + String(options.containerClass).trim() : '');
    root.style.width = containerWidth + 'px';
    root.style.height = containerHeight + 'px';

    imgs.forEach(function (src, idx) {
      var card = document.createElement('div');
      card.className = 'bounce-card bounce-card-' + idx;
      card.style.transform = transforms[idx] || 'none';
      card.style.zIndex = String(10 + idx);
      var img = document.createElement('img');
      img.src = src;
      img.alt =
        (options.categoryTitle ? String(options.categoryTitle).trim() + ' · ' : '') + 'фото ' + (idx + 1);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      card.appendChild(img);
      if (options.onCardClick) {
        card.addEventListener('click', function () {
          options.onCardClick(idx, src);
        });
      }
      root.appendChild(card);
    });
    mount.appendChild(root);

    var cards = root.querySelectorAll('.bounce-card');
    if (options.skipIntro) {
      gsap.set(cards, { scale: 1, opacity: 1 });
    gsap.fromTo(
        cards,
        { opacity: 0.25 },
        {
          opacity: 1,
          duration: 0.38,
          stagger: options.animationStagger || 0.03,
          ease: 'power2.out',
          delay: 0.02
        }
      );
    } else {
      gsap.fromTo(
        cards,
      { scale: 0 },
      {
        scale: 1,
        stagger: options.animationStagger || 0.04,
        ease: options.easeType || 'elastic.out(1, 0.5)',
        delay: options.animationDelay || 0.35
      }
    );
    }

    if (options.enableHover === false) {
      return {
        destroy: function () {
          try {
            gsap.killTweensOf(cards);
          } catch (e) {}
          if (root.parentNode) root.parentNode.removeChild(root);
        }
      };
    }

    function getNoRot(t) {
      return /rotate\([\s\S]*?\)/.test(t) ? t.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)') : t === 'none' ? 'rotate(0deg)' : t + ' rotate(0deg)';
    }
    function getPush(t, off) {
      var m = t.match(/translate\(([-0-9.]+)px\)/);
      if (m) return t.replace(/translate\(([-0-9.]+)px\)/, 'translate(' + (parseFloat(m[1]) + off) + 'px)');
      return t === 'none' ? 'translate(' + off + 'px)' : t + ' translate(' + off + 'px)';
    }

    imgs.forEach(function (_, idx) {
      var card = root.querySelector('.bounce-card-' + idx);
      if (!card) return;
      card.addEventListener('mouseenter', function () {
        imgs.forEach(function (__i, i) {
          var target = root.querySelector('.bounce-card-' + i);
          if (!target) return;
          gsap.killTweensOf(target);
          var base = transforms[i] || 'none';
          if (i === idx) {
            gsap.to(target, { transform: getNoRot(base), duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' });
          } else {
            var off = i < idx ? -pushOffset : pushOffset;
            gsap.to(target, {
              transform: getPush(base, off),
              duration: 0.4,
              ease: 'back.out(1.4)',
              delay: Math.abs(idx - i) * 0.05,
              overwrite: 'auto'
            });
          }
        });
      });
      card.addEventListener('mouseleave', function () {
        imgs.forEach(function (__j, i) {
          var target = root.querySelector('.bounce-card-' + i);
          if (!target) return;
          gsap.killTweensOf(target);
          gsap.to(target, { transform: transforms[i] || 'none', duration: 0.4, ease: 'back.out(1.4)', overwrite: 'auto' });
        });
      });
    });

    return {
      destroy: function () {
        try {
          gsap.killTweensOf(cards);
        } catch (e) {}
        if (root.parentNode) root.parentNode.removeChild(root);
      }
    };
  }

  /* ——— Photo stack (аналог motion Stack для секции «Работы») ——— */
  var WORKS_STACK_DEPTH = 3;
  var WORKS_STACK_AUTOPLAY_MS = 3000;
  var WORKS_STACK_DRAG_SENS = 200;
  var WORKS_STACK_POOL_MS = 3 * 60 * 1000;

  function initPhotoStack(mount, urls, options) {
    var noop = function () {};
    if (!global.gsap || !mount || !urls || !urls.length) return { destroy: noop };
    var gsap = global.gsap;
    options = options || {};
    var n = Math.min(options.stackDepth || WORKS_STACK_DEPTH, urls.length);
    var slice = urls.slice(0, n);
    var spring = { duration: 0.52, ease: 'elastic.out(1, 0.75)' };

    mount.innerHTML = '';
    var container = document.createElement('div');
    container.className = 'photo-stack-container';
    var maxPx = options.stackMaxPx != null ? options.stackMaxPx : 208;
    container.style.setProperty('--photo-stack-max', maxPx + 'px');

    var wraps = [];
    var order = [];
    var i;
    for (i = 0; i < n; i++) {
      order.push(i);
    }

    for (i = 0; i < n; i++) {
      var wrap = document.createElement('div');
      wrap.className = 'photo-stack-rotate';
      var inner = document.createElement('div');
      inner.className = 'photo-stack-card';
      var img = document.createElement('img');
      img.src = encodeAssetPath(slice[i]);
      img.alt = (options.categoryTitle ? String(options.categoryTitle).trim() + ' · ' : '') + 'фото ' + (i + 1);
      img.draggable = false;
      img.loading = 'lazy';
      img.decoding = 'async';
      inner.appendChild(img);
      wrap.appendChild(inner);
      container.appendChild(wrap);
      wraps[i] = wrap;
    }
    mount.appendChild(container);

    function topSliceIndex() {
      return order[order.length - 1];
    }

    function updatePointer() {
      var t = topSliceIndex();
      var j;
      for (j = 0; j < wraps.length; j++) {
        if (!wraps[j]) continue;
        wraps[j].style.pointerEvents = j === t ? 'auto' : 'none';
        wraps[j].style.cursor = j === t ? 'grab' : 'default';
      }
    }

    function applyLayout(animate) {
      var L = order.length;
      order.forEach(function (sliceIdx, stackPosFromBack) {
        var w = wraps[sliceIdx];
        if (!w) return;
        var rotateZ = (L - stackPosFromBack - 1) * 4;
        var scale = 1 + stackPosFromBack * 0.06 - L * 0.06;
        var props = {
          rotationZ: rotateZ,
          scale: scale,
          zIndex: stackPosFromBack + 1,
          transformOrigin: '90% 90%',
          x: 0,
          y: 0,
          rotationX: 0,
          rotationY: 0
        };
        if (animate) {
          gsap.to(w, Object.assign({}, props, spring));
        } else {
          gsap.set(w, props);
        }
      });
      updatePointer();
    }

    function sendToBack() {
      if (order.length < 2) return;
      var top = order.pop();
      order.unshift(top);
      applyLayout(true);
    }

    var drag = null;
    var disableDrag = !!options.disableDrag;

    wraps.forEach(function (w, sliceIdx) {
      if (!w) return;
      w.addEventListener('click', function () {
        if (sliceIdx !== topSliceIndex()) return;
        if (typeof options.onCardClick === 'function') {
          options.onCardClick(slice[sliceIdx]);
        }
        if (options.sendToBackOnClick) sendToBack();
      });

      w.addEventListener('pointerdown', function (e) {
        if (disableDrag || sliceIdx !== topSliceIndex()) return;
        w.setPointerCapture(e.pointerId);
        drag = { id: e.pointerId, el: w, x0: e.clientX, y0: e.clientY };
      });

      w.addEventListener('pointermove', function (e) {
        if (!drag || drag.el !== w || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x0;
        var dy = e.clientY - drag.y0;
        gsap.set(w, {
          x: dx,
          y: dy,
          rotationY: Math.max(-16, Math.min(16, dx * 0.055)),
          rotationX: Math.max(-10, Math.min(10, -dy * 0.045))
        });
      });

      function endDrag(e) {
        if (!drag || drag.el !== w || e.pointerId !== drag.id) return;
        try {
          w.releasePointerCapture(e.pointerId);
        } catch (err) {}
        var dx = e.clientX - drag.x0;
        var dy = e.clientY - drag.y0;
        var sens = options.sensitivity || WORKS_STACK_DRAG_SENS;
        if (Math.abs(dx) > sens || Math.abs(dy) > sens) {
          sendToBack();
        }
        gsap.to(w, { x: 0, y: 0, rotationX: 0, rotationY: 0, duration: 0.32, ease: 'power3.out' });
        drag = null;
      }
      w.addEventListener('pointerup', endDrag);
      w.addEventListener('pointercancel', endDrag);
    });

    gsap.from(container, { opacity: 0, duration: 0.35, ease: 'power2.out' });
    applyLayout(false);

    var apId = null;
    if (
      options.autoplay !== false &&
      n > 1 &&
      !global.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      var delay = options.autoplayDelay || WORKS_STACK_AUTOPLAY_MS;
      apId = setInterval(function () {
        if (document.visibilityState === 'hidden') return;
        sendToBack();
      }, delay);
    }

    return {
      destroy: function () {
        if (apId) {
          clearInterval(apId);
          apId = null;
        }
        drag = null;
        try {
          gsap.killTweensOf(wraps.filter(Boolean));
        } catch (e2) {}
        if (container.parentNode) mount.removeChild(container);
      }
    };
  }

  /* ——— Works from manifest ——— */
  function parseWorksManifestFromDom() {
    if (global.SLADOST_WORKS_MANIFEST && global.SLADOST_WORKS_MANIFEST.categories) {
      return global.SLADOST_WORKS_MANIFEST;
    }
    var el = document.getElementById('works-manifest-data');
    if (!el || !el.textContent) return null;
    try {
      return JSON.parse(el.textContent.trim());
    } catch (e) {
      return null;
    }
  }

  function loadWorksManifest(manifestUrl) {
    var url = manifestUrl || 'works-manifest.json';
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('manifest');
        return r.json();
      })
      .catch(function () {
        var d = parseWorksManifestFromDom();
        if (d && d.categories && d.categories.length) return d;
        throw new Error('manifest');
      });
  }

  function initWorksBounce(manifestUrl, onOpenCarousel) {
    var row = document.getElementById('works-bounce-row');
    var statusEl = document.getElementById('works-status');
    if (!row) return;

    if (global.__worksBounceRotateId) {
      clearInterval(global.__worksBounceRotateId);
      global.__worksBounceRotateId = null;
    }
    if (global.__worksStackPoolId) {
      clearInterval(global.__worksStackPoolId);
      global.__worksStackPoolId = null;
    }

    loadWorksManifest(manifestUrl)
      .then(function (data) {
        if (!data.categories || !data.categories.length) throw new Error('empty');
        row.innerHTML = '';
        var allSlides = [];

        (data.categories || []).forEach(function (cat) {
          (cat.images || []).forEach(function (item) {
            var img = normalizeManifestImage(item);
            if (!img.full) return;
            allSlides.push({
              url: img.full,
              thumb: img.thumb || img.full,
              title: cat.title,
              sub: 'ручная работа'
            });
          });
        });

        var cats = (data.categories || []).slice(0, 3);
        var columnState = [];
        var enableHover = global.matchMedia('(hover: hover)').matches;

        cats.forEach(function (cat) {
          var pool = (cat.images || [])
            .map(normalizeManifestImage)
            .filter(function (img) {
              return img.thumb;
            });
          var col = document.createElement('div');
          col.className = 'works-stack-col reveal';
          var h = document.createElement('h3');
          h.className = 'works-stack-col__title';
          h.textContent = cat.title;
          var mount = document.createElement('div');
          mount.className = 'works-stack-col__stage';
          col.appendChild(h);
          col.appendChild(mount);
          row.appendChild(col);
          columnState.push({
            mount: mount,
            pool: pool,
            offset: pickInitialStackOffset(pool.length, cat.id || cat.title || 'col-' + columnState.length),
            title: cat.title,
            catId: cat.id || cat.title || 'col-' + columnState.length,
            _destroy: null
          });
        });
        rememberStackOffsets(columnState, cats);

        function takeStackUrls(pool, offset, depth) {
          var out = [];
          var pn = pool.length;
          if (!pn) return out;
          var k;
          var d = Math.min(depth || WORKS_STACK_DEPTH, pn);
          for (k = 0; k < d; k++) {
            out.push(pool[(offset + k) % pn].thumb);
          }
          return out;
        }

        function paintStacks() {
          columnState.forEach(function (cre) {
            var urls = takeStackUrls(cre.pool, cre.offset, WORKS_STACK_DEPTH);
            if (cre._destroy) {
              try {
                cre._destroy();
              } catch (err) {}
              cre._destroy = null;
            }
            if (!urls.length) return;
            var col = cre.mount.parentElement;
            var colW = col.getBoundingClientRect().width || col.offsetWidth;
          if (!colW) colW = (window.innerWidth - 48) / 3;
            /* Почти вся ширина ячейки сетки — без искусственного потолка в px */
            var stackPx = Math.max(1, Math.floor(Math.min(colW * 0.99, colW - 1)));
            var ret = initPhotoStack(cre.mount, urls, {
              categoryTitle: cre.title,
              stackMaxPx: stackPx,
              stackDepth: WORKS_STACK_DEPTH,
              sensitivity: WORKS_STACK_DRAG_SENS,
              autoplay: true,
              autoplayDelay: WORKS_STACK_AUTOPLAY_MS,
              sendToBackOnClick: false,
              disableDrag: !enableHover,
              onCardClick: function (src) {
                if (typeof onOpenCarousel !== 'function') return;
                var start = 0;
                for (var si = 0; si < allSlides.length; si++) {
                  if (allSlides[si].url === src || allSlides[si].thumb === src) {
                    start = si;
                    break;
                  }
                }
                onOpenCarousel(start, allSlides);
              }
            });
            cre._destroy = ret && ret.destroy ? ret.destroy : null;
          });
            }

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            paintStacks();
          });
        });

        if (!global.matchMedia('(prefers-reduced-motion: reduce)').matches && WORKS_STACK_POOL_MS > 0) {
          global.__worksStackPoolId = setInterval(function () {
            if (document.visibilityState === 'hidden') return;
            columnState.forEach(function (cre) {
              var len = Math.max(1, cre.pool.length);
              cre.offset = (cre.offset + WORKS_STACK_DEPTH) % len;
            });
            rememberStackOffsets(columnState, cats);
            paintStacks();
          }, WORKS_STACK_POOL_MS);
        }

        row.querySelectorAll('.works-stack-col.reveal').forEach(function (el, i) {
          setTimeout(function () {
            el.classList.add('visible');
          }, 70 * i);
        });

        if (statusEl) {
          statusEl.textContent = '';
          statusEl.classList.add('works-status--hide');
        }

        applyHeroPhoto(getHeroPick(data));

        var moreBtn = document.getElementById('works-more-btn');
        if (moreBtn && allSlides.length) {
          moreBtn.disabled = false;
          moreBtn.onclick = function () {
            if (typeof onOpenCarousel === 'function') onOpenCarousel(0, allSlides);
          };
        }
      })
      .catch(function () {
        if (statusEl) {
          statusEl.textContent =
            'Галерея временно недоступна. Обновите страницу или напишите мне — пришлю подборку работ.';
          statusEl.classList.remove('works-status--hide');
          statusEl.classList.add('works-status--error');
        }
      });

    if (!global.__worksResizeBound) {
      global.__worksResizeBound = true;
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          if (typeof onOpenCarousel === 'function') initWorksBounce(manifestUrl, onOpenCarousel);
        }, 320);
      });
    }
  }

  function initLiquidBackground() {
    var el = document.getElementById('liquid-ether-bg');
    if (!el || typeof global.initLiquidEther !== 'function') return;
    if (!global.THREE) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[Сладость в радость] Three.js не загружен — подключите vendor/three.min.js перед liquid-ether.js.'
        );
      }
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var mobile = window.matchMedia('(max-width: 768px)').matches;
    global.initLiquidEther(el, {
      mouseForce: mobile ? 10 : 16,
      cursorSize: mobile ? 32 : 40,
      isViscous: false,
      colors: ['#d45f76', '#f4d7a1', '#fce4ea', '#ffffff', '#ffffff'],
      autoDemo: true,
      autoSpeed: mobile ? 0.14 : 0.2,
      autoIntensity: mobile ? 0.7 : 0.9,
      resolution: mobile ? 0.4 : 0.65
    });
  }

  function initAll() {
    tryApplyHeroFromManifest();
    if (!global.gsap) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Сладость в радость] GSAP не загружен — CardSwap, стек «Работы» и BounceCards отключены. Проверьте vendor/gsap.min.js.');
      }
    }
    if (typeof global.scheduleWorksLazyBoot === 'function') {
      try {
        global.scheduleWorksLazyBoot();
      } catch (e) {
        if (typeof console !== 'undefined' && console.error) console.error(e);
      }
    } else if (typeof global.__bootWorksBounce === 'function') {
      try {
        global.__bootWorksBounce();
      } catch (e) {
        if (typeof console !== 'undefined' && console.error) console.error(e);
      }
    }
    var desktopFx = !global.matchMedia || !global.matchMedia('(max-width: 768px)').matches;
    try {
      if (
        desktopFx &&
        global.SladostColorBends &&
        global.SladostColorBends.init &&
        global.THREE &&
        !global.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        global.SladostColorBends.init('.footer__bends', {
          rotation: 90,
          speed: 0.2,
          colors: ['#f06b84', '#9570e8', '#4edccd'],
          transparent: true,
          autoRotate: 0,
          scale: 1.35,
          frequency: 1.65,
          warpStrength: 0.72,
          mouseInfluence: 0.85,
          noise: 0.08,
          parallax: 0.65,
          iterations: 2,
          intensity: 1.15,
          bandWidth: 5.5,
          color: '#d8598f'
        });
      }
    } catch (cbErr) {
      if (typeof console !== 'undefined' && console.error) console.error('[ColorBends]', cbErr);
    }
    var mobileBtn = window.matchMedia('(max-width: 640px)').matches;
    var rainbowGlowOpts = getRainbowGlowOpts(mobileBtn);
    var tileGlowOpts = getTileGlowOpts();
    var linkGlowOpts = {
      starSpeed: '4s',
      glowSpeed: '4s',
      backgroundColor: 'transparent',
      borderRadius: 999,
      kind: 'btn'
    };
    __sladostBorderGlowOpts = rainbowGlowOpts;
    try {
      unwrapStepNumbersFromBorderGlow();
      initBorderGlow(SLADOST_TILE_GLOW_SELECTOR, tileGlowOpts);
      unwrapStepNumbersFromBorderGlow();
      initBorderGlow('.footer__aside .footer__link', linkGlowOpts);
      initBorderGlow(
        '.btn:not(.btn--no-glow), .floating-cta, .theme-toggle, .mini-btn, .carousel-glass-btn, .social-btn',
        rainbowGlowOpts
      );
      unwrapStepNumbersFromBorderGlow();
      syncBorderGlowRevealsAfterInit();
      document.querySelectorAll('.reveal.visible').forEach(function (el) {
        boltBorderGlowForReveal(el);
      });
      if (global.SladostSite && typeof global.SladostSite.refreshPdConsentGate === 'function') {
        global.SladostSite.refreshPdConsentGate();
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[BorderGlow]', e);
    }
  }

  global.SladostEffects = {
    initBorderGlow: initBorderGlow,
    initBorderGlowNodes: initBorderGlowNodes,
    triggerBorderGlowBolt: triggerBorderGlowBolt,
    boltBorderGlowForReveal: boltBorderGlowForReveal,
    initCardSwap: initCardSwap,
    initBounceCards: initBounceCards,
    initWorksBounce: initWorksBounce,
    applyHeroPhoto: applyHeroPhoto,
    tryApplyHeroFromManifest: tryApplyHeroFromManifest,
    initAll: initAll
  };

  /* После window.load: гарантированно есть THREE/GSAP из defer-цепочки; один запуск */
  function scheduleSladostBoot() {
    function run() {
      try {
        initAll();
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) console.error('[Сладость в радость]', err);
      }
    }
    if (document.readyState === 'complete') {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
      else setTimeout(run, 0);
    } else {
      window.addEventListener('load', run, { once: true });
    }
  }
  bootHeroFromManifestSync();
  scheduleSladostBoot();
})(typeof window !== 'undefined' ? window : this);
