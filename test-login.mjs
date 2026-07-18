import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE_ERR:', err.message));

try {
  // 1. Go to login page
  await page.goto('https://church-serve.t71411.workers.dev/admin/login', {
    waitUntil: 'networkidle', timeout: 30000
  });
  await page.waitForTimeout(2000);
  console.log('--- LOGIN PAGE LOADED ---');
  console.log('URL:', page.url());

  // 2. Debug: show all input elements
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder
    }));
  });
  console.log('INPUTS:', JSON.stringify(inputs));

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(el => ({
      type: el.type,
      text: el.textContent.trim().substring(0, 20)
    }));
  });
  console.log('BUTTONS:', JSON.stringify(buttons));

  // 2. Fill in credentials - try multiple selectors
  const inputs2 = await page.$$('input');
  if (inputs2.length >= 2) {
    await inputs2[0].fill('david');
    await inputs2[1].fill('test1234');
  }

  // 3. Click login button
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await btn.textContent();
    if (text.includes('登入')) {
      await btn.click();
      break;
    }
  }

  // 4. Wait for redirect
  await page.waitForTimeout(5000);

  console.log('--- AFTER LOGIN ---');
  console.log('URL:', page.url());

  const spinner = await page.$('.animate-spin');
  console.log('SPINNER:', !!spinner);

  const sidebar = await page.$('aside');
  console.log('SIDEBAR:', !!sidebar);

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('BODY:', bodyText);

} catch (err) {
  console.log('ERROR:', err.message);
}

await browser.close();
