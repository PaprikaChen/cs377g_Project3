import asyncio, sys, os
from playwright.async_api import async_playwright

# Plays a full v2 game as two players on two pages over the fake backend (tests/fake-backend.js).
# Usage: python tests/online.test.py http://localhost:8765/index.html
ORDER = ['[data-act=introskip]', '[data-act=mkstart]', '[data-act=pick]', '[data-act=next]', '[data-act=voucher]', '[data-act=svcdone]',
         '[data-act=svc][data-a=refuse]', '[data-act=svc][data-a=rush]:not([disabled])', '[data-act=svc][data-a=letgo]',
         '[data-act=flip]', '[data-act=play]', '[data-act=picksel]']

async def step(pg, state):
    try: await _step(pg, state)
    except Exception as e: state['retries'] = state.get('retries', 0) + 1  # the screen moved on under the click

async def _step(pg, state):
    ph = await pg.evaluate('__rr.S && __rr.S.phase')
    if ph == 'invest':
        if await pg.locator('[data-act=choose]').count(): await pg.locator('[data-act=choose]').first.click()
        if await pg.locator('[data-act=stage]:not([data-v=offer-back])').count(): await pg.locator('[data-act=stage]:not([data-v=offer-back])').first.click(); return  # gift screen, then the offer card
        if await pg.locator('[data-act=invest]:not([disabled])').count(): await pg.locator('[data-act=invest]').click(); return
    if ph == 'market' and await pg.locator('[data-act=mkdone]').count():
        n = state.setdefault('grabs', {}).get(id(pg), 0)
        free = pg.locator('.item:not([disabled]):not(.poor):not(.wait)')
        if n < 3 and await free.count():
            await free.first.click(); state['grabs'][id(pg)] = n + 1; return
        await pg.locator('[data-act=mkdone]').click(); state['grabs'][id(pg)] = 0; return
    if ph == 'commit' and await pg.locator('[data-act=commit]').count():
        if not await pg.locator('.acard.on').count() and await pg.locator('[data-act=ad]:not([disabled])').count():
            await pg.locator('[data-act=ad]:not([disabled])').first.click()
        await pg.locator('[data-act=commit]').click(); return
    for s in ORDER:
        if await pg.locator(s).count():
            await pg.locator(s).first.click(); return

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1200, 'height': 900}); ctx.set_default_timeout(1500); ctx.set_default_navigation_timeout(30000)
        fake = open(os.path.join(os.path.dirname(__file__), 'fake-backend.js')).read(); errs = []
        pages = []
        for uid, nick in [('u1', 'Sam'), ('u2', 'Alex')]:
            pg = await ctx.new_page()
            await pg.add_init_script(f"window.__RR_UID='{uid}';" + fake)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(sys.argv[1]); await pg.wait_for_timeout(300)
            await pg.fill('#nick-in', nick); pages.append(pg)
        A, B = pages
        await A.click('[data-act=create]'); await A.wait_for_timeout(400)
        code = await A.evaluate('__rr.code'); print('code', code)
        await B.fill('#code-in', code); await B.click('form[data-form=join] button'); await B.wait_for_timeout(400)
        state = {}
        for i in range(3000):
            phA = await A.evaluate('__rr.S && __rr.S.phase'); phB = await B.evaluate('__rr.S && __rr.S.phase')
            if phA == 'over' and phB == 'over': break
            for pg in pages: await step(pg, state)
            await A.wait_for_timeout(80)
        ra = await A.evaluate('JSON.stringify(__rr.S.result)'); rb = await B.evaluate('JSON.stringify(__rr.S.result)')
        print('phases', phA, phB, 'loops', i)
        print('same result:', ra == rb, ra)
        print('reveal ok:', await A.evaluate('JSON.stringify(Object.fromEntries(Object.entries(__rr.S.reveals).map(([k,v])=>[k,v.ok])))'))
        print('history p1:', await A.evaluate('JSON.stringify(__rr.S.players.p1.history.map(h=>[h.round,h.demand,h.served,h.turned,h.cash,h.stars]))'))
        print('click retries', state.get('retries', 0))
        print('errors', errs[:5])
        await b.close()

asyncio.run(main())
