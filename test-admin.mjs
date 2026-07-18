import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE_ERR:', err.message));

try {
  await page.goto('https://church-serve.t71411.workers.dev/admin/groups', {
    waitUntil: 'networkidle', timeout: 30000
  });
  await page.waitForTimeout(5000);

  const spinner = await page.$('.animate-spin');
  console.log('SPINNER VISIBLE:', !!spinner);

  const sidebar = await page.$('aside');
  console.log('SIDEBAR VISIBLE:', !!sidebar);

  const title = await page.title();
  const url = page.url();
  console.log('TITLE:', title);
  console.log('URL:', url);

  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('BODY TEXT:', bodyText);

} catch (err) {
  console.log('ERROR:', err.message);
}

await browser.close();
