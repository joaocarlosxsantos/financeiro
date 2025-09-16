const fs = require('fs');
const puppeteer = require('puppeteer');
const axeCore = require('axe-core');

(async () => {
  const url = process.argv[2] || 'http://localhost:3000/reports';
  const out = process.argv[3] || 'axe-report.json';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    // wait for server to be reachable (retry a few times)
    const maxRetries = 10;
    let connected = false;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
        connected = true;
        break;
      } catch (err) {
        console.log(`attempt ${i + 1} failed, retrying...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!connected) throw new Error('Failed to reach the target url');
    // inject axe
    await page.addScriptTag({ content: axeCore.source });
    const results = await page.evaluate(async () => {
      return await axe.run();
    });
    fs.writeFileSync(out, JSON.stringify(results, null, 2), 'utf-8');
    console.log('axe report saved to', out);
  } catch (err) {
    console.error('axe run error', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
