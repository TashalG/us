# Us

A little anniversary website for the two of you, built to be opened by tapping an NFC tag.
Plain HTML, CSS and JavaScript: no build step, no frameworks, nothing to install to view it.

## Run it on your computer

You need a tiny local web server (opening `index.html` by double-clicking mostly works,
but the optional lock needs a server).

**Option A, Python (already on Mac/Linux):**

```bash
cd us-site
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

**Option B, VS Code:** install the "Live Server" extension, right-click `index.html` → *Open with Live Server*.
The page reloads every time you save.

**See it on your phone before publishing:** with Option A running, find your computer's local IP
(e.g. `192.168.1.20`) and open `http://192.168.1.20:8000` on your phone while on the same Wi-Fi.

## Make it yours

Everything personal is in **`config.js`**: names, the date you got together, facts, story cards,
reasons, the letter, the reply button and the footer. Edit the text between the quotes and refresh.

- **Date:** `together: "2024-11-14T19:30:00"`; the live counter counts up from this.
  On the exact anniversary day the card says "Happy 2nd anniversary" automatically.
- **Photos:** drop your pictures into `photos/` and list them in `photos:`. Portrait or square
  shots look best (they're cropped to 4:5). Keep each under ~500 KB so the page opens fast on a phone
  (export at about 1200px wide, JPEG quality ~80). Delete the placeholder `photo-0X.jpg` files you don't use.
- **Reply button:** put your phone number in `reply.link` (`sms:+19025550123?&body=...`), or use a
  `mailto:` address.
- **Colours:** at the top of `css/style.css` (`--bg`, `--paper` …).

## Optional lock (a secret question)

In `config.js` set `lock.enabled: true` and write a question only she can answer. Then make the
answer's hash: open the site, press F12 → Console, and paste:

```js
crypto.subtle.digest("SHA-256", new TextEncoder().encode("your answer in lower case"))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")))
```

Copy the long string into `lock.answerHash`. Answers ignore capitals and extra spaces.
Once she unlocks it on her phone, it stays unlocked there.

**Honest note:** this keeps casual visitors out, but it's not real security. Anyone determined can read
the page's files. Don't put anything on the site you'd be upset to see public. (For real password
protection, host it on Cloudflare Pages with Cloudflare Access; ask and I'll walk you through it.)

## Test it

```bash
pip install playwright
python -m playwright install chromium
python tests/test_site.py
```

Checks the page at phone, tablet and desktop sizes (the counter ticks, the story cards fold,
reasons change, the coupon remembers, nothing overflows, no broken images, keyboard and
reduced-motion work, the lock works) and saves screenshots to `tests/shots/`.

## Files

```
index.html      page structure (no need to edit)
config.js       ← all your content
css/style.css   the look
js/main.js      the counter, story cards, reasons, coupon, lock
photos/         your pictures
favicon.svg     the little heart in the browser tab
tests/          Playwright checks
```

The font is General Sans, loaded from Fontshare (free). If it ever fails to load, the page falls back to
your device's system font.
