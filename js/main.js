/* Us — renders config.js into the page and runs the little interactive bits.
   All text is inserted with textContent, so nothing in config.js can break the page. */
(function () {
  "use strict";

  const C = window.US;
  const root = document.documentElement;
  root.classList.add("js");
  if (!C) {
    document.body.insertAdjacentHTML("afterbegin", '<p class="noscript">config.js is missing or has a typo. Check the browser console.</p>');
    return;
  }

  const $ = (sel, el = document) => el.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
  };

  /* ---------- dates ---------- */
  const start = new Date(C.together);
  const startValid = !isNaN(start.getTime());
  const longDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  function wholeYears(now) {
    let y = now.getFullYear() - start.getFullYear();
    const before = now.getMonth() < start.getMonth() ||
      (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
    return before ? y - 1 : y;
  }
  function heroLine(now) {
    if (!startValid) return "";
    const years = wholeYears(now);
    const isAnniversary = now.getMonth() === start.getMonth() && now.getDate() === start.getDate() && years > 0;
    if (isAnniversary) return `Happy ${ordinal(years)} anniversary`;
    if (years >= 1) return `${years} ${years === 1 ? "year" : "years"} together, and counting`;
    const days = Math.floor((now - start) / 864e5);
    return `${days} days together, and counting`;
  }

  /* ---------- simple bindings ---------- */
  const initials = `${(C.you || "?")[0]}&${(C.her || "?")[0]}`;
  const now = new Date();
  const bindings = {
    initials,
    nameA: `${C.you} &`,
    nameB: C.her,
    heroLine: heroLine(now),
    sinceLine: startValid ? `Together since ${longDate(start)}` : "",
    firstPlace: C.firstPlace,
    introHeading: C.intro && C.intro.heading,
    introNote: C.intro && C.intro.note,
    signOff: C.signOff,
    coupon: C.coupon,
    footerSignOff: C.footer && C.footer.signOff,
    footerMessage: C.footer && C.footer.message,
    imprint: `Made with love for ${C.her} · ${now.getFullYear()}`,
    lockQuestion: C.lock && C.lock.question,
  };
  document.querySelectorAll("[data-bind]").forEach((n) => {
    const v = bindings[n.dataset.bind];
    if (v != null) n.textContent = v;
  });
  document.title = C.title || `${C.you} & ${C.her}`;

  /* ---------- live counter ---------- */
  const cells = {};
  document.querySelectorAll("[data-count]").forEach((n) => (cells[n.dataset.count] = n));
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    if (!startValid) return;
    let s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const days = Math.floor(s / 86400); s -= days * 86400;
    const hours = Math.floor(s / 3600); s -= hours * 3600;
    const minutes = Math.floor(s / 60); s -= minutes * 60;
    cells.days.textContent = days.toLocaleString("en-GB");
    cells.hours.textContent = pad(hours);
    cells.minutes.textContent = pad(minutes);
    cells.seconds.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- facts ---------- */
  const facts = $("#facts");
  (C.facts || []).forEach((f, i) => {
    const d = el("div", "fact reveal");
    d.style.setProperty("--delay", `${i * 80}ms`);
    d.append(el("dt", null, f.value), el("dd", null, f.note));
    facts.append(d);
  });

  /* ---------- story deck ---------- */
  const deck = $("#deck");
  const story = C.story || [];
  story.forEach((s, i) => {
    const li = el("li", "scard");
    li.append(el("h3", "scard-title", s.title), el("p", "scard-text", s.text), el("p", "scard-date", s.date));
    const spine = el("button", "scard-spine", s.title);
    spine.type = "button";
    spine.tabIndex = -1;
    spine.setAttribute("aria-label", `Back to: ${s.title}`);
    spine.addEventListener("click", () => goToCard(i));
    li.append(spine);
    deck.append(li);
  });

  const storySection = $("#story");
  const wide = window.matchMedia("(min-width: 900px)");
  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    [...deck.children].forEach((card, k) => {
      const spine = k < i;
      card.classList.toggle("is-spine", spine);
      card.querySelector(".scard-spine").tabIndex = spine ? 0 : -1;
    });
  }
  function storyProgress() {
    const r = storySection.getBoundingClientRect();
    const travel = storySection.offsetHeight - window.innerHeight;
    return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
  }
  function onScroll() {
    if (!wide.matches || !story.length) { setActive(0); return; }
    const p = storyProgress();
    setActive(Math.min(story.length - 1, Math.floor(p * story.length)));
  }
  function goToCard(i) {
    const travel = storySection.offsetHeight - window.innerHeight;
    const top = storySection.offsetTop + travel * ((i + 0.5) / story.length);
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  wide.addEventListener("change", onScroll);
  onScroll();

  /* ---------- photos ---------- */
  const tiles = $("#tiles");
  function setUpFlip(btn, imgs, label) {
    btn.type = "button";
    btn.classList.add("is-multi");
    const dots = el("span", "tile-dots");
    dots.setAttribute("aria-hidden", "true");
    imgs.forEach(() => dots.append(el("span", "tile-dot")));
    btn.append(dots);
    let at = 0;
    function show(n) {
      at = (n + imgs.length) % imgs.length;
      imgs.forEach((img, k) => {
        img.classList.toggle("is-shown", k === at);
        if (k === at) img.removeAttribute("aria-hidden"); else img.setAttribute("aria-hidden", "true");
      });
      [...dots.children].forEach((d, k) => d.classList.toggle("is-on", k === at));
      btn.setAttribute("aria-label", `${label}: photo ${at + 1} of ${imgs.length}. Show the next one`);
    }
    show(0);

    // tap or click = next; swipe left/right = next/previous; arrow keys when focused
    let startX = null, swiped = false;
    btn.addEventListener("pointerdown", (e) => { startX = e.clientX; swiped = false; });
    btn.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) { swiped = true; show(at + (dx < 0 ? 1 : -1)); }
    });
    btn.addEventListener("pointercancel", () => { startX = null; });
    btn.addEventListener("click", () => {
      if (swiped) { swiped = false; return; }
      show(at + 1);
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
    });
  }

  // `src` can be one path, a list of paths (tap to flip through), or left out
  // entirely, in which case the tile shows `note` written on paper instead.
  (C.photos || []).forEach((p, i) => {
    const li = el("li", "tile reveal");
    li.style.setProperty("--delay", `${(i % 4) * 70}ms`);
    const srcs = (Array.isArray(p.src) ? p.src : [p.src]).filter(Boolean);
    const label = p.caption || "A photo of us";
    let fig;

    if (!srcs.length) {
      fig = el("div", "tile-photo tile-note");
      fig.append(el("p", "tile-note-text", p.note || label));
    } else {
      fig = el(srcs.length > 1 ? "button" : "div", "tile-photo");
      const imgs = srcs.map((src, k) => {
        const img = new Image(1080, 1350);
        img.src = src;
        img.alt = srcs.length > 1 ? `${label}, photo ${k + 1} of ${srcs.length}` : label;
        img.loading = "lazy";
        img.decoding = "async";
        img.draggable = false;
        if (k === 0) img.classList.add("is-shown");
        else img.setAttribute("aria-hidden", "true");
        fig.append(img);
        return img;
      });
      if (srcs.length > 1) setUpFlip(fig, imgs, label);
    }

    const strip = el("div", "tile-strip");
    const meta = el("p", "tile-meta");
    meta.append(el("span", null, p.date || ""), el("span", null, p.place || ""));
    strip.append(el("p", "tile-caption", p.caption || ""), meta);
    li.append(fig, strip);
    tiles.append(li);
  });

  /* ---------- reasons ---------- */
  // Reasons show in a random order each visit. Add shuffleReasons: false to config.js to keep your order.
  const reasons = (C.reasons || []).slice();
  if (C.shuffleReasons !== false) {
    for (let i = reasons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reasons[i], reasons[j]] = [reasons[j], reasons[i]];
    }
  }
  let rIndex = 0;
  const rCard = $("#reason-card");
  const rText = $("#reason-text");
  const rBtn = $("#reason-next");
  $("#reasons-note").textContent = `${reasons.length} reasons, and I'm nowhere near done. Tap for another.`;
  rText.textContent = reasons[0] || "";
  let busy = false;
  function nextReason() {
    if (!reasons.length || busy) return;
    rIndex = (rIndex + 1) % reasons.length;
    if (reduceMotion) { rText.textContent = reasons[rIndex]; return; }
    busy = true;
    rCard.classList.remove("is-arriving");
    rCard.classList.add("is-leaving");
    rCard.addEventListener("animationend", function swap() {
      rCard.removeEventListener("animationend", swap);
      rText.textContent = reasons[rIndex];
      rCard.classList.remove("is-leaving");
      void rCard.offsetWidth;
      rCard.classList.add("is-arriving");
      busy = false;
    });
  }
  rBtn.addEventListener("click", nextReason);
  rCard.addEventListener("click", nextReason);

  /* ---------- letter + coupon ---------- */
  const body = $("#letter-body");
  (C.letter || []).forEach((p) => body.append(el("p", null, p)));
  const coupon = $(".coupon");
  const cBtn = $("#coupon-btn");

  // One ragged tear line, different every time. The coupon keeps everything below it;
  // the thin stub left on the letter keeps everything above it, so the two edges match.
  const wrap = $(".coupon-wrap");
  const stub = $(".coupon-stub");
  function tearLine() {
    const pts = [[0, 3]];
    for (let x = 1.5; x < 100; x += 1.4 + Math.random() * 2.2) pts.push([x, 1 + Math.random() * 6.5]);
    pts.push([100, 4]);
    return pts.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}px`);
  }
  function setTear(on) {
    wrap.classList.toggle("is-torn", on);
    if (!on) { coupon.style.clipPath = ""; stub.style.clipPath = ""; return; }
    const line = tearLine();
    coupon.style.clipPath = `polygon(${line.join(", ")}, 100% 100%, 0% 100%)`;
    stub.style.clipPath = `polygon(0% 0%, 100% 0%, ${line.slice().reverse().join(", ")})`;
  }
  function setRedeemed(on, animate) {
    cBtn.textContent = on ? "Redeemed. Pick a night!" : "Redeem";
    cBtn.setAttribute("aria-pressed", String(on));
    coupon.classList.remove("is-tearing");
    if (!on) {
      coupon.classList.remove("is-redeemed");
      setTear(false);
      return;
    }
    setTear(true);
    if (animate && !reduceMotion) {
      coupon.classList.add("is-tearing");
      coupon.addEventListener("animationend", function done() {
        coupon.removeEventListener("animationend", done);
        coupon.classList.remove("is-tearing");
        coupon.classList.add("is-redeemed");
      });
    } else {
      coupon.classList.add("is-redeemed");
    }
  }
  setRedeemed(storage.get("us-coupon") === "1", false);
  cBtn.addEventListener("click", () => {
    if (coupon.classList.contains("is-tearing")) return;
    const on = cBtn.getAttribute("aria-pressed") !== "true";
    setRedeemed(on, true);
    storage.set("us-coupon", on ? "1" : "0");
  });

  /* ---------- footer ---------- */
  const lines = $("#postcard-lines");
  ((C.footer && C.footer.lines) || []).forEach((l) => {
    const li = el("li");
    if (typeof l === "string") li.textContent = l;
    else {
      const a = el("a", null, l.text);
      a.href = l.href;
      if (/^https?:/.test(l.href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      li.append(a);
    }
    lines.append(li);
  });
  const stamp = $("#stamp");
  if (C.footer && C.footer.stamp) stamp.src = C.footer.stamp; else stamp.remove();

  /* ---------- music ---------- */
  // Browsers only allow sound after the visitor taps something, so the song starts
  // on her first tap anywhere (or straight away if the browser allows it).
  const M = C.music || {};
  const audio = $("#audio");
  const mBtn = $("#music");
  const mLabel = $("#music-label");
  if (M.src) {
    audio.src = M.src;
    mBtn.hidden = false;
    audio.addEventListener("error", () => { mBtn.hidden = true; });
    const target = Math.min(1, Math.max(0, M.volume == null ? 0.6 : M.volume));
    let wantPlaying = false;
    const ui = (on) => {
      mBtn.classList.toggle("is-playing", on);
      mBtn.setAttribute("aria-pressed", String(on));
      mLabel.textContent = on ? "Pause music" : "Play our song";
    };
    audio.addEventListener("play", () => ui(true));
    audio.addEventListener("pause", () => ui(false));
    function fadeIn() {
      try { audio.volume = 0; } catch (_) { /* iOS ignores volume */ }
      const t0 = performance.now();
      (function step(t) {
        const k = Math.min(1, (t - t0) / 1800);
        try { audio.volume = target * k; } catch (_) {}
        if (k < 1 && !audio.paused) requestAnimationFrame(step);
      })(t0);
    }
    function play() {
      wantPlaying = true;
      const p = audio.play();
      if (p && p.then) p.then(() => { fadeIn(); stopWaiting(); }).catch(() => {});
    }
    const kick = (e) => { if (!mBtn.contains(e.target)) play(); };
    const events = ["pointerup", "touchend", "click", "keydown"];
    function stopWaiting() { events.forEach((ev) => document.removeEventListener(ev, kick, true)); }
    mBtn.addEventListener("click", () => {
      if (audio.paused) { play(); storage.set("us-music", "on"); }
      else { wantPlaying = false; audio.pause(); stopWaiting(); storage.set("us-music", "off"); }
    });
    if (M.autoplay !== false && storage.get("us-music") !== "off") {
      events.forEach((ev) => document.addEventListener(ev, kick, true));
      play();
    }
    // pause while the page is in the background, pick up again when she comes back
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (!audio.paused) { audio.pause(); wantPlaying = true; } }
      else if (wantPlaying) play();
    });
  }

  /* ---------- entrances ---------- */
  document.querySelectorAll("section").forEach((sec) => {
    sec.querySelectorAll(".reveal:not(.fact):not(.tile)").forEach((n, i) => {
      if (!n.style.getPropertyValue("--delay")) n.style.setProperty("--delay", `${i * 80}ms`);
    });
  });
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealables.forEach((n) => io.observe(n));
  } else {
    revealables.forEach((n) => n.classList.add("is-in"));
  }

  /* ---------- optional lock ---------- */
  const L = C.lock || {};
  const lockEl = $("#lock");
  if (L.enabled && storage.get("us-unlocked") !== L.answerHash) {
    lockEl.hidden = false;
    document.body.classList.add("is-locked");
    $("main").setAttribute("inert", "");
    $("footer").setAttribute("inert", "");
    const form = $("#lock-form");
    const input = $("#lock-answer");
    const msg = $("#lock-msg");
    setTimeout(() => input.focus(), 50);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const answer = input.value.trim().toLowerCase().replace(/\s+/g, " ");
      let hash = "";
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(answer));
        hash = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (_) {
        msg.textContent = "This page needs to be opened over https to unlock.";
        return;
      }
      if (hash === L.answerHash) {
        storage.set("us-unlocked", L.answerHash);
        lockEl.hidden = true;
        document.body.classList.remove("is-locked");
        $("main").removeAttribute("inert");
        $("footer").removeAttribute("inert");
      } else {
        msg.textContent = "Not quite. Try again?";
        form.classList.remove("is-wrong");
        void form.offsetWidth;
        form.classList.add("is-wrong");
        input.select();
      }
    });
  }
})();
