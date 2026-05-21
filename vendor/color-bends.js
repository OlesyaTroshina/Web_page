/**
 * ColorBends — шейдерный фон (порт с react-bits, Three.js).
 * Монтируется в контейнер с классом .color-bends-container (position/size задаётся родителем).
 */
(function (global) {
  'use strict';

  var MAX_COLORS = 8;

  function mergeDefaults(user) {
    var u = user || {};
    return {
      rotation: u.rotation != null ? u.rotation : 90,
      speed: u.speed != null ? u.speed : 0.2,
      colors: Array.isArray(u.colors) ? u.colors.slice(0, MAX_COLORS) : [],
      transparent: u.transparent !== undefined ? u.transparent : true,
      autoRotate: u.autoRotate != null ? u.autoRotate : 0,
      scale: u.scale != null ? u.scale : 1,
      frequency: u.frequency != null ? u.frequency : 1,
      warpStrength: u.warpStrength != null ? u.warpStrength : 1,
      mouseInfluence: u.mouseInfluence != null ? u.mouseInfluence : 1,
      parallax: u.parallax != null ? u.parallax : 0.5,
      noise: u.noise != null ? u.noise : 0.15,
      iterations: u.iterations != null ? u.iterations : 1,
      intensity: u.intensity != null ? u.intensity : 1.5,
      bandWidth: u.bandWidth != null ? u.bandWidth : 6,
      color: u.color != null ? u.color : '#ff0000'
    };
  }

  function mountColorBends(container, userOptions) {
    if (!container || !global.THREE) {
      return function () {};
    }
    var THREE = global.THREE;
    var props = mergeDefaults(userOptions);

    var frag =
      '\n#define MAX_COLORS ' +
      MAX_COLORS +
      '\nuniform vec2 uCanvas;\nuniform float uTime;\nuniform float uSpeed;\nuniform vec2 uRot;\nuniform int uColorCount;\nuniform vec3 uColors[MAX_COLORS];\nuniform int uTransparent;\nuniform float uScale;\nuniform float uFrequency;\nuniform float uWarpStrength;\nuniform vec2 uPointer;\nuniform float uMouseInfluence;\nuniform float uParallax;\nuniform float uNoise;\nuniform int uIterations;\nuniform float uIntensity;\nuniform float uBandWidth;\nvarying vec2 vUv;\n\nvoid main() {\n  float t = uTime * uSpeed;\n  vec2 p = vUv * 2.0 - 1.0;\n  p += uPointer * uParallax * 0.1;\n  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);\n  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);\n  q /= max(uScale, 0.0001);\n  q /= 0.5 + 0.2 * dot(q, q);\n  q += 0.2 * cos(t) - 7.56;\n  vec2 toward = (uPointer - rp);\n  q += toward * uMouseInfluence * 0.2;\n\n    for (int j = 0; j < 5; j++) {\n      if (j >= uIterations - 1) break;\n      vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));\n      q += (rr - q) * 0.15;\n    }\n\n    vec3 col = vec3(0.0);\n    float a = 1.0;\n\n    if (uColorCount > 0) {\n      vec2 s = q;\n      vec3 sumCol = vec3(0.0);\n      float cover = 0.0;\n      for (int i = 0; i < MAX_COLORS; ++i) {\n            if (i >= uColorCount) break;\n            s -= 0.01;\n            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));\n            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);\n            float kBelow = clamp(uWarpStrength, 0.0, 1.0);\n            float kMix = pow(kBelow, 0.3);\n            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);\n            vec2 disp = (r - s) * kBelow;\n            vec2 warped = s + disp * gain;\n            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);\n            float m = mix(m0, m1, kMix);\n            float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));\n            sumCol += uColors[i] * w;\n            cover = max(cover, w);\n      }\n      col = clamp(sumCol, 0.0, 1.0);\n      a = uTransparent > 0 ? cover : 1.0;\n    } else {\n        vec2 s = q;\n        for (int k = 0; k < 3; ++k) {\n            s -= 0.01;\n            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));\n            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);\n            float kBelow = clamp(uWarpStrength, 0.0, 1.0);\n            float kMix = pow(kBelow, 0.3);\n            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);\n            vec2 disp = (r - s) * kBelow;\n            vec2 warped = s + disp * gain;\n            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);\n            float m = mix(m0, m1, kMix);\n            col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));\n        }\n        a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;\n    }\n\n    col *= uIntensity;\n\n    if (uNoise > 0.0001) {\n      float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);\n      col += (n - 0.5) * uNoise;\n      col = clamp(col, 0.0, 1.0);\n    }\n\n    vec3 rgb = (uTransparent > 0) ? col * a : col;\n    gl_FragColor = vec4(rgb, a);\n}\n';

    var vert =
      'varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = vec4(position, 1.0);\n}\n';

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var geometry = new THREE.PlaneGeometry(2, 2);
    var uColorsArray = [];
    var i;
    for (i = 0; i < MAX_COLORS; i++) {
      uColorsArray.push(new THREE.Vector3(0, 0, 0));
    }

    var material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: props.speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: 0 },
        uColors: { value: uColorsArray },
        uTransparent: { value: props.transparent ? 1 : 0 },
        uScale: { value: props.scale },
        uFrequency: { value: props.frequency },
        uWarpStrength: { value: props.warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: props.mouseInfluence },
        uParallax: { value: props.parallax },
        uNoise: { value: props.noise },
        uIterations: { value: props.iterations },
        uIntensity: { value: props.intensity },
        uBandWidth: { value: props.bandWidth }
      },
      premultipliedAlpha: true,
      transparent: true
    });

    function applyColorUniforms() {
      function toVec3(hex) {
        var h = String(hex).replace('#', '').trim();
        var v;
        if (h.length === 3) {
          v = [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
        } else {
          v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        }
        return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
      }
      var arr = (props.colors || []).filter(Boolean).slice(0, MAX_COLORS).map(toVec3);
      if (!arr.length && props.color) {
        arr = [toVec3(props.color)];
      }
      for (i = 0; i < MAX_COLORS; i++) {
        if (i < arr.length) {
          material.uniforms.uColors.value[i].copy(arr[i]);
        } else {
          material.uniforms.uColors.value[i].set(0, 0, 0);
        }
      }
      material.uniforms.uColorCount.value = arr.length;
    }
    applyColorUniforms();

    function syncScalarUniforms() {
      material.uniforms.uSpeed.value = props.speed;
      material.uniforms.uScale.value = props.scale;
      material.uniforms.uFrequency.value = props.frequency;
      material.uniforms.uWarpStrength.value = props.warpStrength;
      material.uniforms.uMouseInfluence.value = props.mouseInfluence;
      material.uniforms.uParallax.value = props.parallax;
      material.uniforms.uNoise.value = props.noise;
      material.uniforms.uIterations.value = props.iterations;
      material.uniforms.uIntensity.value = props.intensity;
      material.uniforms.uBandWidth.value = props.bandWidth;
      material.uniforms.uTransparent.value = props.transparent ? 1 : 0;
    }
    syncScalarUniforms();

    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true
    });
    if (renderer.outputColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, props.transparent ? 0 : 1);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    var clock = new THREE.Clock();
    var rotationRef = props.rotation;
    var autoRotateRef = props.autoRotate;
    var pointerTarget = new THREE.Vector2(0, 0);
    var pointerCurrent = new THREE.Vector2(0, 0);
    var pointerSmooth = 8;
    var rafId = null;
    var resizeObserver = null;
    var isActive = true;

    function handleResize() {
      var w = Math.max(1, Math.floor(container.clientWidth));
      var h = Math.max(1, Math.floor(container.clientHeight));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      material.uniforms.uCanvas.value.set(w, h);
    }
    handleResize();
    requestAnimationFrame(handleResize);
    requestAnimationFrame(function () {
      requestAnimationFrame(handleResize);
    });

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    function handlePointerMove(e) {
      var rect = container.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerTarget.set(x, y);
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    function loop() {
      if (!isActive) return;
      var dt = clock.getDelta();
      var elapsed = clock.elapsedTime;
      material.uniforms.uTime.value = elapsed;

      var deg = (rotationRef % 360) + autoRotateRef * elapsed;
      var rad = (deg * Math.PI) / 180;
      material.uniforms.uRot.value.set(Math.cos(rad), Math.sin(rad));

      var amt = Math.min(1, dt * pointerSmooth);
      pointerCurrent.lerp(pointerTarget, amt);
      material.uniforms.uPointer.value.copy(pointerCurrent);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);

    return function destroy() {
      isActive = false;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.forceContextLoss) {
        renderer.forceContextLoss();
      }
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }

  function initColorBends(selector, options) {
    var nodes = document.querySelectorAll(selector);
    var destroys = [];
    for (var i = 0; i < nodes.length; i++) {
      var d = mountColorBends(nodes[i], options);
      destroys.push(d);
    }
    return function destroyAll() {
      destroys.forEach(function (fn) {
        try {
          fn();
        } catch (e) {}
      });
    };
  }

  global.SladostColorBends = {
    mount: mountColorBends,
    init: initColorBends
  };
})(typeof window !== 'undefined' ? window : this);
