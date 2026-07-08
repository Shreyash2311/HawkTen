/* HAWK10 — Fitness Arena
   scroll-scrub hero · pinned philosophy · reveals · counters · form */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* ---------- nav ---------- */
  var nav = document.getElementById("nav");
  function onNavScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  /* ---------- hero scroll-scrub ---------- */
  var hero = document.getElementById("hero");
  var heroVideo = document.getElementById("heroVideo");
  var heroTitle = document.getElementById("heroTitle");
  var heroMotto = document.getElementById("heroMotto");
  var heroLoc = document.getElementById("heroLoc");
  var heroOverlay = document.querySelector(".hero__overlay");
  var scrollHint = document.getElementById("scrollHint");

  var videoDuration = 0;
  var targetTime = 0;
  var currentTime = 0;
  var punched = false;

  heroVideo.addEventListener("loadedmetadata", function () {
    videoDuration = heroVideo.duration || 0;
    // force decode of the first frame so the scrub starts on imagery, not black
    try { heroVideo.currentTime = 0.001; } catch (e) {}
  });
  heroVideo.addEventListener("error", function () {
    // no video available — keep the type treatment on the charcoal ground
    heroVideo.style.display = "none";
  });

  // Chrome needs HTTP Range support to seek; simple static servers often
  // lack it. Prefetch the whole clip as a blob so scrubbing is fully local.
  (function preloadHeroAsBlob() {
    var src = heroVideo.querySelector("source");
    if (!src || !window.fetch || !window.URL || !URL.createObjectURL) return;
    fetch(src.src)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.blob();
      })
      .then(function (blob) {
        var wasPlaying = !heroVideo.paused;
        heroVideo.src = URL.createObjectURL(blob);
        heroVideo.load();
        if (wasPlaying || reduceMotion) heroVideo.play().catch(function () {});
      })
      .catch(function () { /* fall back to streaming src */ });
  })();

  if (reduceMotion) {
    heroVideo.loop = true;
    heroVideo.autoplay = true;
    heroVideo.play().catch(function () {});
  }

  function heroProgress() {
    var rect = hero.getBoundingClientRect();
    var total = hero.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-rect.top / total, 0, 1);
  }

  // map progress p in [a,b] to [0,1]
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function updateHero() {
    var p = heroProgress();

    // scrub target: leave a small tail so we never seek past the last frame
    if (videoDuration > 0) targetTime = p * (videoDuration - 0.05);

    // title punches in between 4% and 26%
    var tIn = easeOut(seg(p, 0.04, 0.26));
    var scale = 2.7 - 1.7 * tIn;
    heroTitle.style.opacity = tIn;
    heroTitle.style.transform = "scale(" + scale.toFixed(4) + ")";
    heroTitle.style.filter = "blur(" + (10 * (1 - tIn)).toFixed(2) + "px)";
    if (!punched && tIn >= 1) { punched = true; heroTitle.classList.add("punch"); }
    if (punched && tIn < 0.9) { punched = false; heroTitle.classList.remove("punch"); }

    // motto lands after the punch
    var tMotto = easeOut(seg(p, 0.24, 0.4));
    heroMotto.style.opacity = tMotto;
    heroMotto.style.transform = "translateY(" + (24 * (1 - tMotto)).toFixed(2) + "px)";

    // location line last
    heroLoc.style.opacity = easeOut(seg(p, 0.38, 0.5));

    // darken toward the hand-off to philosophy
    heroOverlay.style.background = "rgba(10,10,12," + (0.7 * seg(p, 0.82, 1)).toFixed(3) + ")";

    // hint dies once the user commits
    scrollHint.style.opacity = p > 0.03 ? 0 : 1;
  }

  function scrubLoop() {
    if (videoDuration > 0 && heroVideo.readyState >= 1) {
      currentTime += (targetTime - currentTime) * 0.14;
      // only issue a seek once the previous one has landed — Chrome queues
      // seeks and appears frozen if we fire one per frame
      if (!heroVideo.seeking && Math.abs(heroVideo.currentTime - currentTime) > 0.01) {
        try { heroVideo.currentTime = currentTime; } catch (e) {}
      }
    }
    requestAnimationFrame(scrubLoop);
  }

  if (!reduceMotion) {
    window.addEventListener("scroll", updateHero, { passive: true });
    window.addEventListener("resize", updateHero);
    updateHero();
    requestAnimationFrame(scrubLoop);
  }

  /* ---------- philosophy pinned steps ---------- */
  var philosophy = document.getElementById("philosophy");
  var lines = Array.prototype.slice.call(document.querySelectorAll(".philosophy__line"));
  var philoIndex = document.getElementById("philoIndex");
  var philoBar = document.getElementById("philoBar");
  var lastStep = -1;

  function updatePhilosophy() {
    var rect = philosophy.getBoundingClientRect();
    var total = philosophy.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    var p = clamp(-rect.top / total, 0, 1);
    // reserve a small intro/outro so line 1 lands after the pin engages
    var stepP = clamp((p - 0.05) / 0.9, 0, 0.999);
    var step = Math.floor(stepP * lines.length);

    if (step !== lastStep) {
      lastStep = step;
      lines.forEach(function (line, i) {
        line.classList.toggle("is-active", i === step);
        line.classList.toggle("is-past", i < step);
      });
      philoIndex.textContent = "0" + (step + 1);
    }
    philoBar.style.height = (p * 100).toFixed(1) + "%";
  }

  if (!reduceMotion) {
    window.addEventListener("scroll", updatePhilosophy, { passive: true });
    updatePhilosophy();
  } else {
    lines.forEach(function (l) { l.classList.add("is-active"); });
  }

  /* ---------- scroll reveals ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  /* ---------- program card videos ---------- */
  var isTouch = window.matchMedia("(hover: none)").matches;
  document.querySelectorAll(".program").forEach(function (card) {
    var video = card.querySelector(".program__video");
    if (!video) return;
    video.addEventListener("error", function () { video.style.display = "none"; });

    if (isTouch || reduceMotion) {
      // mobile: autoplay softly while the card is in view
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { video.play().catch(function () {}); }
          else { video.pause(); }
        });
      }, { threshold: 0.4 });
      io.observe(card);
    } else {
      card.addEventListener("mouseenter", function () { video.play().catch(function () {}); });
      card.addEventListener("mouseleave", function () { video.pause(); });
      card.addEventListener("focus", function () { video.play().catch(function () {}); });
      card.addEventListener("blur", function () { video.pause(); });
    }
  });

  /* ---------- results counters ---------- */
  function animateCount(el) {
    var end = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var suffix = el.dataset.suffix || "";
    var duration = 1700;
    var start = null;

    function frame(ts) {
      if (!start) start = ts;
      var t = clamp((ts - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - t, 4);
      var val = end * eased;
      el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-IN")) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    if (reduceMotion) {
      el.textContent = (decimals ? end.toFixed(decimals) : end.toLocaleString("en-IN")) + suffix;
    } else {
      requestAnimationFrame(frame);
    }
  }
  var statObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".stat__num").forEach(function (el) { statObserver.observe(el); });

  /* ---------- signup form ---------- */
  var form = document.getElementById("signupForm");
  var nameInput = document.getElementById("fName");
  var phoneInput = document.getElementById("fPhone");
  var errName = document.getElementById("errName");
  var errPhone = document.getElementById("errPhone");
  var success = document.getElementById("formSuccess");

  function validateField(input, errEl, ok) {
    input.classList.toggle("is-invalid", !ok);
    errEl.hidden = ok;
    return ok;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var okName = validateField(nameInput, errName, nameInput.value.trim().length >= 2);
    var okPhone = validateField(phoneInput, errPhone, /^[+\d][\d\s-]{7,15}$/.test(phoneInput.value.trim()));
    if (!okName) { nameInput.focus(); return; }
    if (!okPhone) { phoneInput.focus(); return; }
    var btn = form.querySelector(".visit__submit");
    btn.disabled = true;
    btn.textContent = "Locking it in…";
    setTimeout(function () {
      btn.textContent = "Booked ✓";
      success.hidden = false;
    }, 900);
  });
  nameInput.addEventListener("blur", function () {
    if (nameInput.value) validateField(nameInput, errName, nameInput.value.trim().length >= 2);
  });
  phoneInput.addEventListener("blur", function () {
    if (phoneInput.value) validateField(phoneInput, errPhone, /^[+\d][\d\s-]{7,15}$/.test(phoneInput.value.trim()));
  });
})();
