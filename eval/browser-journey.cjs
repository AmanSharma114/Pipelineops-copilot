// Optional browser QA. Run with Playwright installed and an origin serving the desk.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = process.argv[2] || 'http://127.0.0.1:4173';
const incidents = [
  ['intake', 'Carrier Intake', 'CI-204', 'matching marker'],
  ['ledger', 'Route Ledger', 'RL-410', 'Quarantine the conflicting pair'],
  ['dispatch', 'Dispatch Board', 'DB-410', '08:05 UTC'],
  ['bay', 'Bay Planner', 'BP-307', 'overlap.csv'],
  ['departure', 'Departure Monitor', 'GM-307', 'freight.gate_pending'],
  ['meter', 'Meter Rollup', 'MR-104', 'four distinct quarter-hour intervals'],
  ['learning', 'Learning Completion Sync', 'LC-409', 'authoritative status'],
  ['water', 'Water Quality Monitor', 'WQ-104', 'complete export']
];

async function tabTo(page, selector) {
  const target = page.locator(selector);
  await target.waitFor();
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate(el => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw Error('Unreachable by Tab: ' + selector);
}

async function checkWidth(page) {
  const [content, viewport] = await page.evaluate(() => [
    document.documentElement.scrollWidth, document.documentElement.clientWidth
  ]);
  assert.ok(content <= viewport, `Horizontal overflow: ${content} > ${viewport}`);
}

async function journey(browser, mode, viewport, [app, name, code, evidence]) {
  const question = 'What does ' + code + ' mean?';
  const context = await browser.newContext({viewport, isMobile: mode === 'touch', hasTouch: mode === 'touch'});
  const page = await context.newPage();
  async function activate(selector) {
    if (mode === 'keyboard') {
      await tabTo(page, selector);
      await page.keyboard.press('Enter');
    } else if (mode === 'touch') await page.locator(selector).tap();
    else await page.locator(selector).click();
  }
  try {
    await page.goto(origin);
    await checkWidth(page);
    assert.equal(await page.locator('.station a').count(), incidents.length);
    await activate('.station a[href="/?app=' + app + '"]');
    await page.locator('.station [aria-current="page"]').filter({hasText:name}).waitFor();
    if (mode === 'keyboard') {
      await tabTo(page, '#q');
      await page.keyboard.type(question);
      await page.keyboard.press('Enter');
    } else {
      await page.locator('#q').fill(question);
      await activate('.compose button');
    }
    await page.locator('#answer').waitFor();
    await checkWidth(page);
    const excerpt = await page.locator('.answer p').innerText();
    assert.ok(excerpt.includes(evidence));
    const bounds = await page.locator('#answer').boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y < viewport.height, 'Submitted answer heading is outside the viewport');
    await activate('.answer > a');
    assert.equal(await page.locator('section:target p').innerText(), excerpt);
    await checkWidth(page);
    await activate('main > a[href$="#answer"]');
    await page.locator('#answer:target').waitFor();
    assert.equal(await page.locator('#q').inputValue(), question);
    assert.equal(await page.locator('.answer p').innerText(), excerpt);
    console.log(`PASS ${app} ${mode} ${viewport.width}x${viewport.height}`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium'});
  try {
    for (const [mode, width, height] of [['mouse',1440,900], ['touch',390,844], ['touch',320,568], ['keyboard',1280,720]]) {
      for (const incident of incidents) await journey(browser, mode, {width, height}, incident);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
