import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { BASE_URL, PRODUCT_IDS } from '../../lib/client.js';

const lcpTrend  = new Trend('browser_lcp',  true);
const fcpTrend  = new Trend('browser_fcp',  true);
const ttfbTrend = new Trend('browser_ttfb', true);
const clsTrend  = new Trend('browser_cls');
const uiErrors  = new Rate('browser_ui_errors');

export const options = {
  scenarios: {
    browser: {
      executor: 'ramping-vus',
      exec: 'browserJourney',
      stages: [
        { duration: '1m', target: 2 },
        { duration: '3m', target: 2 },
        { duration: '1m', target: 0 },
      ],
      options: {
        browser: { type: 'chromium' },
      },
    },
  },
  thresholds: {
    'browser_lcp':       ['p(75)<2500'],
    'browser_fcp':       ['p(75)<1800'],
    'browser_ttfb':      ['p(75)<800'],
    'browser_cls':       ['avg<0.1'],
    'browser_ui_errors': ['rate<0.05'],
  },
};

export async function browserJourney() {
  const page = await browser.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const ttfb = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? nav.responseStart - nav.requestStart : 0;
    });
    ttfbTrend.add(ttfb);

    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByName('first-contentful-paint')[0];
      return entry ? entry.startTime : 0;
    });
    fcpTrend.add(fcp);

    const lcp = await page.evaluate(() => new Promise(resolve => {
      let value = 0;
      const obs = new PerformanceObserver(list => {
        const entries = list.getEntries();
        value = entries[entries.length - 1].startTime;
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(value); }, 3000);
    }));
    lcpTrend.add(lcp);

    const cls = await page.evaluate(() => new Promise(resolve => {
      let value = 0;
      const obs = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) value += entry.value;
        }
      });
      obs.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(value); }, 2000);
    }));
    clsTrend.add(cls);

    const ok = check(page, {
      'page title present': async () => (await page.title()).length > 0,

      'no error in url':    () => !page.url().includes('error'),
    });
    uiErrors.add(!ok);

    await sleep(2);

    const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
    await page.goto(`${BASE_URL}/product/${productId}`, { waitUntil: 'networkidle' });

    check(page, {
      'product page loaded': () => !page.url().includes('error'),
    });

    await sleep(2);

  } catch (e) {
    console.error(`Browser journey failed: ${e.message}`);
    uiErrors.add(1);
  } finally {
    await page.close();
  }
}
