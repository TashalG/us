"""
Playwright checks for the "Us" site.

Run from the project folder:
    pip install playwright && python -m playwright install chromium
    python tests/test_site.py

It starts a local server, checks that every part renders and works at
phone, tablet and desktop sizes, and saves screenshots to tests/shots/.
"""
import functools, hashlib, http.server, json, os, re, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
TONE = (ROOT / "tests" / "fixtures" / "tone.mp3").read_bytes()   # stands in for your song
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)

VIEWPORTS = {
    "phone": {"width": 390, "height": 844, "is_mobile": True, "has_touch": True, "device_scale_factor": 2},
    "tablet": {"width": 820, "height": 1180, "is_mobile": True, "has_touch": True, "device_scale_factor": 2},
    "desktop": {"width": 1440, "height": 900, "is_mobile": False, "has_touch": False, "device_scale_factor": 1},
}

failures = []
def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}/"

def full_scroll(page):
    """Scroll through the page so every lazy image and entrance fires."""
    h = page.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < h:
        page.evaluate(f"window.scrollTo(0,{y})")
        page.wait_for_timeout(60)
        y += 500
        h = page.evaluate("document.documentElement.scrollHeight")
    page.wait_for_timeout(900)

def run(url):
    with sync_playwright() as p:
        # Real phones only allow sound after a tap, so test under the same rule.
        browser = p.chromium.launch(args=["--autoplay-policy=user-gesture-required"])
        for name, vp in VIEWPORTS.items():
            print(f"\n[{name} {vp['width']}x{vp['height']}]")
            ctx = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]},
                                      is_mobile=vp["is_mobile"], has_touch=vp["has_touch"],
                                      device_scale_factor=vp["device_scale_factor"])
            ctx.route("**/music/*.mp3", lambda r: r.fulfill(status=200, body=TONE, content_type="audio/mpeg"))
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "fontshare" not in m.text.lower() and "ERR_" not in m.text else None)
            bad_requests = []
            page.on("requestfailed", lambda r: bad_requests.append(r.url) if "fontshare" not in r.url else None)
            page.on("response", lambda r: bad_requests.append(f"{r.status} {r.url}") if r.status >= 400 else None)

            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(1100)
            page.screenshot(path=str(SHOTS / f"{name}-01-first-screen.png"))

            # first screen
            h1 = page.locator("h1").inner_text().replace("\n", " ")
            names = page.evaluate("[window.US.you, window.US.her]")
            check(all(n in h1 for n in names), f"h1 shows both names ({h1!r})")
            box = page.locator("h1").bounding_box()
            check(box and box["y"] + box["height"] < vp["height"], "names are on the first screen")
            counter_box = page.locator(".counter").bounding_box()
            check(counter_box and counter_box["y"] + counter_box["height"] <= vp["height"], "live counter is on the first screen")

            # counter ticks
            s1 = page.locator('[data-count="seconds"]').inner_text()
            page.wait_for_timeout(2300)
            s2 = page.locator('[data-count="seconds"]').inner_text()
            check(s1 != s2, f"counter ticks ({s1} -> {s2})")
            days = int(page.locator('[data-count="days"]').inner_text().replace(",", ""))
            check(days > 0, f"day count is positive ({days})")

            # no horizontal overflow
            ow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check(ow <= 0, f"no horizontal scroll (overflow {ow}px)")

            # content rendered from config
            check(page.locator(".fact").count() == 4, "4 facts rendered")
            check(page.locator(".scard").count() == 6, "6 story cards rendered")
            check(page.locator(".tile").count() == 8, "8 photo tiles rendered")
            check(page.locator("#letter-body p").count() == 5, "letter paragraphs rendered")
            check(page.locator("#postcard-lines li").count() == 2, "footer lines rendered")

            full_scroll(page)
            broken = page.evaluate("[...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)")
            check(not broken, f"no broken images {broken}")
            hidden = page.evaluate("[...document.querySelectorAll('.reveal')].filter(n => getComputedStyle(n).opacity < 0.5).length")
            check(hidden == 0, f"every entrance finished after scrolling ({hidden} still hidden)")

            # tap targets
            small = page.evaluate("""[...document.querySelectorAll('a,button')].filter(n => {
                const r = n.getBoundingClientRect(); const s = getComputedStyle(n);
                return r.width && s.visibility !== 'hidden' && s.display !== 'none' && n.offsetParent && r.height < 40 && !n.closest('.postcard-lines') && !n.classList.contains('skip') && !n.classList.contains('scard-spine');
            }).map(n => n.textContent.trim())""")
            check(not small, f"buttons/links are at least 40px tall {small}")

            # smallest text
            tiny = page.evaluate("""[...document.querySelectorAll('body *')].filter(n => n.childNodes.length && [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()) && n.offsetParent && parseFloat(getComputedStyle(n).fontSize) < 13).map(n => n.textContent.trim().slice(0,30))""")
            check(not tiny, f"no text under 13px {tiny}")

            # photo tiles: multi-photo flipping, the note tile, sharp images
            page.locator("#photos").scroll_into_view_if_needed()
            page.wait_for_timeout(700)
            check(page.locator(".tile-note").count() == 1 and "talking" in page.locator(".tile-note").inner_text(), "first-date tile shows its note")
            multi = page.locator(".tile-photo.is-multi")
            check(multi.count() == 7, f"7 tiles have several photos ({multi.count()})")
            shown = "el => [...el.querySelectorAll('img')].findIndex(i => i.classList.contains('is-shown'))"
            dot = "el => [...el.querySelectorAll('.tile-dot')].findIndex(d => d.classList.contains('is-on'))"
            mv = page.locator(".tile", has_text="Moving in together").locator(".tile-photo")   # 4 photos
            mv.scroll_into_view_if_needed()
            if vp["has_touch"]:
                mv.tap()
            else:
                mv.click()
            page.wait_for_timeout(500)
            check(mv.evaluate(shown) == 1 and mv.evaluate(dot) == 1, "tapping a tile shows its next photo and moves the dot")
            vis = mv.evaluate("el => getComputedStyle(el.querySelector('img.is-shown')).opacity")
            check(float(vis) > 0.95, f"the new photo is fully visible (opacity {vis})")
            box = mv.bounding_box()
            y = box["y"] + box["height"] / 2
            page.mouse.move(box["x"] + box["width"] * 0.8, y); page.mouse.down()
            page.mouse.move(box["x"] + box["width"] * 0.2, y, steps=6); page.mouse.up()
            page.wait_for_timeout(400)
            check(mv.evaluate(shown) == 2, f"swiping left goes forward (at {mv.evaluate(shown)})")
            page.mouse.move(box["x"] + box["width"] * 0.2, y); page.mouse.down()
            page.mouse.move(box["x"] + box["width"] * 0.8, y, steps=6); page.mouse.up()
            page.wait_for_timeout(400)
            check(mv.evaluate(shown) == 1, f"swiping right goes back (at {mv.evaluate(shown)})")
            mv.focus(); page.keyboard.press("ArrowRight"); page.keyboard.press("ArrowRight"); page.keyboard.press("ArrowRight")
            check(mv.evaluate(shown) == 0, "arrow keys flip and wrap around to the first photo")
            label = mv.get_attribute("aria-label") or ""
            check("photo 1 of 4" in label, f"screen readers hear which photo is showing ({label!r})")
            ratio = page.evaluate("""[...document.querySelectorAll('.tile-photo img')].map(i => i.naturalWidth / i.getBoundingClientRect().width).filter(r => isFinite(r) && r > 0)""")
            check(ratio and min(ratio) >= 1.5, f"photos are sharp on this screen (min {min(ratio):.1f}x pixels)")
            page.screenshot(path=str(SHOTS / f"{name}-07-photos.png"))

            # story deck
            if vp["width"] >= 900:
                page.evaluate("document.querySelector('#story').scrollIntoView()")
                page.wait_for_timeout(900)
                page.screenshot(path=str(SHOTS / f"{name}-02-story-start.png"))
                top = page.evaluate("document.querySelector('#story').offsetTop")
                travel = page.evaluate("document.querySelector('#story').offsetHeight - innerHeight")
                page.evaluate(f"window.scrollTo(0, {top + travel * 0.75})")
                page.wait_for_timeout(1000)
                spines = page.locator(".scard.is-spine").count()
                check(spines >= 3, f"story cards fold into spines while scrolling ({spines})")
                page.screenshot(path=str(SHOTS / f"{name}-03-story-folded.png"))
                page.locator(".scard.is-spine .scard-spine").first.click()
                page.wait_for_timeout(1400)
                check(page.locator(".scard.is-spine").count() == 0, "clicking a spine brings its card back")
            else:
                page.locator("#story").scroll_into_view_if_needed()
                page.wait_for_timeout(500)
                page.screenshot(path=str(SHOTS / f"{name}-02-story.png"), full_page=False)

            # reasons
            page.locator("#reasons").scroll_into_view_if_needed()
            page.wait_for_timeout(500)
            r1 = page.locator("#reason-text").inner_text()
            page.locator("#reason-next").click()
            page.wait_for_timeout(900)
            r2 = page.locator("#reason-text").inner_text()
            check(r1 != r2 and r2, "'Another reason' shows a new reason")
            page.screenshot(path=str(SHOTS / f"{name}-04-reasons.png"))

            # coupon: tear it off
            page.locator("#coupon-btn").scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            page.locator("#coupon-btn").click()
            page.wait_for_timeout(450)
            check(page.evaluate("document.querySelector('.coupon').classList.contains('is-tearing')"), "redeem starts the rip animation")
            page.screenshot(path=str(SHOTS / f"{name}-05-coupon-mid-rip.png"))
            page.wait_for_timeout(900)
            st = page.evaluate("""(() => { const c = document.querySelector('.coupon'); const cs = getComputedStyle(c);
                return { torn: c.classList.contains('is-redeemed'), clip: cs.clipPath, t: cs.transform }; })()""")
            check(st["torn"] and st["clip"].startswith("polygon"), "coupon ends torn off with a ragged edge")
            check(st["t"] not in ("none", "") , f"coupon hangs loose after the rip ({st['t']})")
            check(page.locator("#coupon-btn").get_attribute("aria-pressed") == "true", "coupon redeems")
            page.screenshot(path=str(SHOTS / f"{name}-05-letter.png"))
            page.reload(wait_until="networkidle")
            check(page.locator("#coupon-btn").get_attribute("aria-pressed") == "true", "coupon stays redeemed after reload")
            check(page.evaluate("getComputedStyle(document.querySelector('.coupon')).clipPath.startsWith('polygon')"), "still torn after reload")
            seam = page.evaluate("""(() => {
                const c = document.querySelector('.coupon').style.clipPath, st = document.querySelector('.coupon-stub').style.clipPath;
                const line = s => s.replace(/^polygon\\(|\\)$/g, '').split(', ');
                const a = line(c).slice(0, -2), b = line(st).slice(2).reverse();
                return { same: a.join('|') === b.join('|'), n: a.length, stub: getComputedStyle(document.querySelector('.coupon-stub')).display };
            })()""")
            check(seam["same"] and seam["n"] > 20 and seam["stub"] == "block", f"the tear lines up on the letter and the coupon ({seam})")
            page.evaluate("localStorage.clear()")

            # the page ends on the letter, then the back of the card
            check(page.locator(".reply").count() == 0, "no 'What's next' section")
            check(page.locator("#deck-foot").count() == 0, "no 'moments so far' line")
            page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            page.wait_for_timeout(900)
            page.screenshot(path=str(SHOTS / f"{name}-06-end.png"))
            edge = page.evaluate("(() => { const r = document.querySelector('.postcard').getBoundingClientRect(); return [r.left, document.documentElement.clientWidth - r.right, innerHeight - r.bottom]; })()")
            check(max(abs(edge[0]), abs(edge[1])) < 1, f"the back of the card runs edge to edge ({edge[0]:.0f}px / {edge[1]:.0f}px)")
            check(abs(edge[2]) < 1, f"and sits flush with the bottom of the screen ({edge[2]:.0f}px)")
            fb = page.locator(".postcard").bounding_box()
            ih = page.evaluate("innerHeight")
            check(fb and fb["y"] >= 0 and fb["y"] + fb["height"] <= ih + 1, f"the back of the card is fully visible at the end (top {fb['y']:.0f}, bottom {fb['y']+fb['height']:.0f}, screen {ih})")

            page.screenshot(path=str(SHOTS / f"{name}-full.png"), full_page=True)
            check(not errors, f"no JS errors {errors}")
            check(not bad_requests, f"no failed requests {bad_requests}")
            ctx.close()

        # music
        print("\n[music]")
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        ctx.route("**/music/*.mp3", lambda r: r.fulfill(status=200, body=TONE, content_type="audio/mpeg"))
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(500)
        playing = "!document.getElementById('audio').paused"
        check(page.locator("#music").is_visible() and "Play" in page.inner_text("#music"), "music button shows on the first screen")
        check(not page.evaluate(playing), "no sound before she taps anything (phone rule)")
        page.locator("h1").tap()
        page.wait_for_timeout(700)
        check(page.evaluate(playing), "the song starts on her first tap anywhere")
        check("Pause" in page.inner_text("#music") and page.locator("#music.is-playing").count() == 1, "button switches to Pause and the bars move")
        page.locator("#music").tap()
        page.wait_for_timeout(300)
        check(not page.evaluate(playing), "the button pauses it")
        page.reload(wait_until="networkidle")
        page.locator("h1").tap(); page.wait_for_timeout(600)
        check(not page.evaluate(playing), "once paused, it stays off on her next visit")
        page.locator("#music").tap(); page.wait_for_timeout(600)
        check(page.evaluate(playing), "and the button turns it back on")
        ctx.close()
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle"); page.wait_for_timeout(500)
        check(not page.locator("#music").is_visible(), "with no song file yet, the music button hides itself")
        ctx.close()

        # keyboard only
        print("\n[keyboard]")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle")
        page.keyboard.press("Tab")
        check(page.evaluate("document.activeElement.className") == "skip", "first Tab lands on the skip link")
        page.keyboard.press("Tab")
        page.keyboard.press("Tab")
        ring = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
        check(ring != "none", "focused links show a focus ring")
        ctx.close()

        # reduced motion
        print("\n[reduced motion]")
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle")
        hidden = page.evaluate("[...document.querySelectorAll('.reveal')].filter(n => getComputedStyle(n).opacity < 0.9).length")
        check(hidden == 0, "with reduced motion, everything is visible immediately")
        ctx.close()

        # lock
        print("\n[lock]")
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        page.add_init_script("""Object.defineProperty(window, 'US', { configurable: true, set(v) {
            v.lock.enabled = true; Object.defineProperty(window, 'US', { value: v, writable: true }); } });""")
        page.goto(url, wait_until="networkidle")
        check(page.locator("#lock").is_visible(), "lock shows when enabled")
        page.fill("#lock-answer", "wrong")
        page.click("#lock-form button")
        page.wait_for_timeout(400)
        check(page.locator("#lock").is_visible() and "Not quite" in page.inner_text("#lock-msg"), "wrong answer is refused")
        page.screenshot(path=str(SHOTS / "lock.png"))
        page.fill("#lock-answer", "  Main   Street ")
        page.click("#lock-form button")
        page.wait_for_timeout(400)
        check(not page.locator("#lock").is_visible(), "right answer opens the page (case and spaces ignored)")
        page.reload(wait_until="networkidle")
        check(not page.locator("#lock").is_visible(), "stays unlocked on the next visit")
        ctx.close()
        browser.close()

if __name__ == "__main__":
    srv, url = serve()
    try:
        run(url)
    finally:
        srv.shutdown()
    print(f"\n{'ALL CHECKS PASSED' if not failures else str(len(failures)) + ' FAILED'}  ·  screenshots in {SHOTS}")
    sys.exit(1 if failures else 0)
