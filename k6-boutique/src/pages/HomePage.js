import { BASE_URL } from '../lib/client.js';

export class HomePage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  }

  async getTitle() {
    return this.page.title();
  }

  isErrorPage() {
    return this.page.url().includes('error');
  }

  async measureTTFB() {
    return this.page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? nav.responseStart - nav.requestStart : 0;
    });
  }

  async measureFCP() {
    return this.page.evaluate(() => {
      const entry = performance.getEntriesByName('first-contentful-paint')[0];
      return entry ? entry.startTime : 0;
    });
  }

  async measureLCP() {
    return this.page.evaluate(() => new Promise(resolve => {
      let value = 0;
      const obs = new PerformanceObserver(list => {
        const entries = list.getEntries();
        value = entries[entries.length - 1].startTime;
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(value); }, 3000);
    }));
  }

  async measureCLS() {
    return this.page.evaluate(() => new Promise(resolve => {
      let value = 0;
      const obs = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) value += entry.value;
        }
      });
      obs.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => { obs.disconnect(); resolve(value); }, 2000);
    }));
  }
}
