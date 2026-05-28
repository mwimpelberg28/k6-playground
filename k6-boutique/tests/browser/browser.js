// tests/browser/browser.js
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
    // Homepage
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
