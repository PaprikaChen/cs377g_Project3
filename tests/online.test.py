import asyncio, sys
from playwright.async_api import async_playwright
SEL=['[data-act=pick]','[data-act=event]','[data-act=invest]','[data-act=buy][data-n="3"]:not([disabled])','[data-act=buy][data-n="0"]','[data-act=commit]','[data-act=respond]','[data-act=skip]','[data-act=voucher]','[data-act=next]']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1200,'height':900})
        fake=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'fake-backend.js')).read(); errs=[]
        pages=[]
        for uid,nick in [('u1','小林'),('u2','阿明')]:
            pg = await ctx.new_page()
            await pg.add_init_script(f"window.__RR_UID='{uid}';"+fake)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(sys.argv[1]); await pg.wait_for_timeout(300)
            await pg.fill('#nick-in', nick); pages.append(pg)
        A,B=pages
        await A.click('[data-act=create]'); await A.wait_for_timeout(400)
        code = await A.evaluate('__rr.code'); print('code',code)
        await B.fill('#code-in', code); await B.click('form[data-form=join] button'); await B.wait_for_timeout(400)
        shot = False
        for i in range(600):
            phA = await A.evaluate('__rr.S && __rr.S.phase'); phB = await B.evaluate('__rr.S && __rr.S.phase')
            if phA=='over' and phB=='over': break
            if not shot and await A.locator('[data-act=play]').count():
                await A.click('[data-act=play]'); await A.wait_for_timeout(5000)
                await A.screenshot(path='/tmp/opening.png', full_page=True); shot = True
                await A.wait_for_timeout(9000); await A.screenshot(path='/tmp/opening-end.png', full_page=True)
            for pg in pages:
                ph = await pg.evaluate('__rr.S && __rr.S.phase')
                if ph=='commit' and await pg.locator('[data-act=commit]').count():
                    await pg.locator('[data-act=inc][data-f=rr][data-d="1"]').click()
                    await pg.locator('[data-act=inc][data-f=sb][data-d="1"]').click()
                if ph=='respond' and await pg.locator('[data-act=respond]').count():
                    if pg is A and not shot: await pg.screenshot(path='/tmp/respond.png', full_page=True)
                    await pg.locator('[data-act=inc][data-f=rush][data-d="1"]').click()
                for s in SEL:
                    if await pg.locator(s).count():
                        await pg.locator(s).first.click(); break
            await A.wait_for_timeout(60)
            if i==60: await B.screenshot(path='/tmp/online-B.png', full_page=True)
            if i==40: await A.screenshot(path='/tmp/online-A.png', full_page=True)
        ra = await A.evaluate('JSON.stringify(__rr.S.result)'); rb = await B.evaluate('JSON.stringify(__rr.S.result)')
        print('same result:', ra==rb, ra)
        print('opp name on B:', await B.evaluate("document.querySelector('.rest[data-seat=p1] .who').textContent"))
        print('reveal ok:', await A.evaluate('JSON.stringify(__rr.S.reveals)'))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
