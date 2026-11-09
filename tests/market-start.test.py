"""Market briefing: the 60-second clock must start fairly for both players.

1. Both press Start  -> both get the same start time, a short countdown, then the shelf opens on both pages.
2. Only one presses  -> the other still sees Start; the market opens for both anyway about 30s later.

Uses tests/fake-backend.js in place of Firebase, like online.test.py.
Usage (from the repo root):
  python3 -m http.server 8765 &
  python3 tests/market-start.test.py http://localhost:8765/index.html
"""
import asyncio, sys, os
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/index.html'
FAKE = open(os.path.join(os.path.dirname(__file__), 'fake-backend.js')).read()
fails = []

def check(ok, what):
    print(('ok    ' if ok else 'FAIL  ') + what)
    if not ok: fails.append(what)

async def to_market(browser, errs):
    """Two players in a fresh room, both through Build, both on the market briefing."""
    ctx = await browser.new_context(viewport={'width': 1440, 'height': 900}); ctx.set_default_timeout(3000)
    pages = []
    for uid, nick in [('u1', 'Alex'), ('u2', 'Max')]:
        pg = await ctx.new_page()
        await pg.add_init_script(f"window.__RR_UID='{uid}';" + FAKE)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(400)
        await pg.fill('#nick-in', nick); pages.append(pg)
    A, B = pages
    await A.click('[data-act=create]'); await A.wait_for_timeout(400)
    await B.fill('#code-in', await A.evaluate('__rr.code')); await B.click('form[data-form=join] button'); await B.wait_for_timeout(400)
    for pg in pages:
        await pg.click('[data-act=introskip]'); await pg.locator('[data-act=pick]').first.click()
    await A.wait_for_timeout(500)
    for pg in pages:
        if await pg.locator('[data-act=choose]').count(): await pg.locator('[data-act=choose]').first.click()
        await pg.click('[data-act=invest]')
    await A.wait_for_timeout(800)
    return ctx, A, B

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []

        print('-- both players press Start')
        ctx, A, B = await to_market(b, errs)
        check(await A.locator('[data-act=mkstart]').count() == 1 and await B.locator('[data-act=mkstart]').count() == 1, 'both see the briefing with a Start button')
        check(await A.locator('.shelf').count() == 0, 'the shelf is hidden before Start')
        await A.click('[data-act=mkstart]'); await A.wait_for_timeout(500)
        check(await A.locator('text=Waiting for').count() == 1, 'the first player sees "Waiting for…"')
        check(await B.locator('[data-act=mkstart]').count() == 1, 'the other player still sees Start')
        check(await A.evaluate('__rr.mkt.start') is None, 'the clock has not started yet')
        await B.click('[data-act=mkstart]'); await B.wait_for_timeout(500)
        sa, sb = await A.evaluate('__rr.mkt.start'), await B.evaluate('__rr.mkt.start')
        check(sa is not None and sa == sb, 'both players get the same start time')
        check(await A.locator('.brief-go').count() == 1, 'a "get ready" countdown shows')
        await A.wait_for_timeout(3400)
        check(await A.locator('.shelf').count() == 1 and await B.locator('.shelf').count() == 1, 'the shelf opens on both pages after the countdown')
        left = await A.evaluate('Math.round((60000 - (Date.now() - __rr.mkt.start)) / 1000)')
        check(55 <= left <= 60, f'the full 60 seconds are left when the shelf opens ({left}s)')
        await ctx.close()

        print('-- only one player presses Start')
        ctx, A, B = await to_market(b, errs)
        await A.click('[data-act=mkstart]'); await A.wait_for_timeout(500)
        await A.wait_for_timeout(29000)
        check(await A.evaluate('__rr.mkt.start') is None, 'nothing starts before 30 seconds')
        await A.wait_for_timeout(2500)
        sa, sb = await A.evaluate('__rr.mkt.start'), await B.evaluate('__rr.mkt.start')
        check(sa is not None and sa == sb, 'after 30 seconds the market starts, with the same time on both pages')
        await A.wait_for_timeout(3400)
        check(await A.locator('.shelf').count() == 1 and await B.locator('.shelf').count() == 1, 'the shelf opens for both, including the player who never pressed Start')
        await ctx.close()

        check(not errs, f'no page errors {errs[:3]}')
        await b.close()
    print('ALL OK' if not fails else f'{len(fails)} FAILED')
    sys.exit(1 if fails else 0)

asyncio.run(main())
