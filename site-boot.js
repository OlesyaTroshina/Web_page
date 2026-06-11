(function () {
  'use strict';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var canParallax =
    window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    window.matchMedia('(max-width: 1024px)').matches === false;
  if (canParallax) {
    document.querySelectorAll('.parallax-wrap').forEach(function (wrap) {
      var strength = parseFloat(wrap.getAttribute('data-depth')) || 0.08;
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        wrap.querySelectorAll('[data-depth-child]').forEach(function (el, i) {
          var m = (i + 1) * strength * 18;
          el.style.transform = 'translate(' + (-x * m) + 'px,' + (-y * m) + 'px)';
        });
      });
      wrap.addEventListener('mouseleave', function () {
        wrap.querySelectorAll('[data-depth-child]').forEach(function (el) {
          el.style.transform = '';
        });
      });
    });
  } else {
    document.querySelectorAll('.parallax-wrap [data-depth-child]').forEach(function (el) {
      el.style.transform = '';
    });
  }

  function resetMobileViewport() {
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY || 0);
    document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth * 0.01 + 'px');
  }
  resetMobileViewport();
  window.addEventListener('orientationchange', function () {
    setTimeout(resetMobileViewport, 100);
  });
  window.addEventListener('resize', resetMobileViewport);

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              if (window.SladostEffects && window.SladostEffects.boltBorderGlowForReveal) {
                window.SladostEffects.boltBorderGlowForReveal(en.target);
              }
            });
          });
          observer.unobserve(en.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
  );
  document.querySelectorAll('.reveal').forEach(function (el) {
    observer.observe(el);
  });

  (function loadTgReviews() {
    var grid = document.getElementById('reviews-grid');
    var fallback = document.getElementById('reviews-fallback');
    if (!grid || !fallback) return;

    function starsRow(n) {
      var m = parseInt(n, 10);
      if (isNaN(m)) m = 5;
      m = Math.max(1, Math.min(5, m));
      var s = '';
      for (var i = 0; i < 5; i++) s += i < m ? '★' : '☆';
      return s;
    }

    function observeReviewCard(el) {
      observer.observe(el);
    }

    function parseReviewsData(raw) {
      try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        return null;
      }
    }

    function readEmbeddedReviews() {
      if (window.SLADOST_REVIEWS) return window.SLADOST_REVIEWS;
      return null;
    }

    function normalizeItems(data) {
      if (!data || !Array.isArray(data.items)) return [];
      return data.items.filter(function (it) {
        return it && String(it.text || '').trim().length > 0;
      });
    }

    function createReviewNode(item, forSwap) {
      var name = String(item.name || 'Гость').trim() || 'Гость';
      var letter = name.charAt(0).toUpperCase();
      var outer = document.createElement(forSwap ? 'div' : 'article');
      outer.className = forSwap ? 'review review--swap' : 'review glass-card reveal';
      var top = document.createElement('div');
      top.className = 'review__top';
      var av = document.createElement('div');
      av.className = 'review__avatar review__avatar--initial';
      av.setAttribute('aria-hidden', 'true');
      av.textContent = letter;
      var meta = document.createElement('div');
      var pName = document.createElement('p');
      pName.className = 'review__name';
      pName.textContent = name;
      var pStars = document.createElement('p');
      pStars.className = 'review__stars';
      var sn = parseInt(item.stars, 10);
      if (isNaN(sn)) sn = 5;
      pStars.setAttribute('aria-label', sn + ' из 5');
      pStars.textContent = starsRow(item.stars);
      meta.appendChild(pName);
      meta.appendChild(pStars);
      top.appendChild(av);
      top.appendChild(meta);
      var pText = document.createElement('p');
      pText.className = 'review__text';
      pText.textContent = String(item.text).trim();
      outer.appendChild(top);
      outer.appendChild(pText);
      if (item.post && /t\.me\/[^/]+\/\d+/i.test(String(item.post).trim())) {
        var src = document.createElement('p');
        src.className = 'review__source';
        var a = document.createElement('a');
        a.href = String(item.post).trim();
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Читать отзыв →';
        src.appendChild(a);
        outer.appendChild(src);
      }
      return outer;
    }

    function renderFromItems(items) {
      if (!items.length) return;
      var swapRoot = document.getElementById('reviews-swap-root');
      var swapWrap = document.getElementById('reviews-swap-wrap');
      var canSwap =
        items.length >= 2 &&
        window.gsap &&
        window.SladostEffects &&
        typeof window.SladostEffects.initCardSwap === 'function' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (window.__reviewsCardSwapCleanup) {
        try {
          window.__reviewsCardSwapCleanup();
        } catch (err) {}
        window.__reviewsCardSwapCleanup = null;
      }

      grid.innerHTML = '';
      if (swapRoot) swapRoot.innerHTML = '';

      if (canSwap && swapRoot && swapWrap) {
        var deck = items.slice(0, 8);
        var cardNodes = deck.map(function (item) {
          return createReviewNode(item, true);
        });
        var w = Math.min(420, Math.max(300, Math.floor((window.innerWidth || 200) * 0.9)));
        var narrow = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        var h = narrow ? 120 : 200;
        window.__reviewsCardSwapCleanup = window.SladostEffects.initCardSwap(swapRoot, cardNodes, {
          cardDistance: 100,
          verticalDistance: 55,
          delay: 1000,
          pauseOnHover: false,
          width: w,
          height: h,
          easing: 'elastic',
          skewAmount: 6
        });
        swapWrap.hidden = false;
        grid.hidden = true;
        fallback.hidden = true;
        return;
      }

      if (swapWrap) swapWrap.hidden = true;
      items.slice(0, 24).forEach(function (item) {
        var art = createReviewNode(item, false);
        grid.appendChild(art);
        observeReviewCard(art);
      });
      grid.hidden = false;
      fallback.hidden = true;
    }

    function bootReviews(items) {
      items = normalizeItems(items);
      if (items.length) renderFromItems(items);
    }

    var embedded = readEmbeddedReviews();
    if (embedded) {
      bootReviews(embedded);
      return;
    }

    fetch('reviews-tg.json')
      .then(function (r) {
        if (!r.ok) throw new Error('no-json');
        return r.json();
      })
      .catch(function () {
        return null;
      })
      .then(bootReviews);
  })();

  (function protectPortfolioImages() {
    var scope = '#works-bounce-row, #works-carousel, .hero__visual';
    function inScope(t) {
      return t && t.closest && t.closest(scope);
    }
    document.addEventListener(
      'contextmenu',
      function (e) {
        var t = e.target;
        if (!t || t.tagName !== 'IMG') return;
        if (inScope(t)) e.preventDefault();
      },
      true
    );
    document.addEventListener(
      'dragstart',
      function (e) {
        if (e.target && e.target.tagName === 'IMG' && inScope(e.target)) e.preventDefault();
      },
      true
    );
  })();
})();
