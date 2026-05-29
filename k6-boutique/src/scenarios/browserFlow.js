import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { PRODUCT_IDS } from '../lib/client.js';
import { HomePage } from '../pages/HomePage.js';
import { ProductPage } from '../pages/ProductPage.js';

const lcpTrend  = new Trend('browser_lcp',  true);
const fcpTrend  = new Trend('browser_fcp',  true);
const ttfbTrend = new Trend('browser_ttfb', true);
const clsTrend  = new Trend('browser_cls');
const uiErrors  = new Rate('browser_ui_errors');

export async function browserFlow() {
  const page = await browser.newPage();

  try {
    const homePage = new HomePage(page);
    await homePage.goto();

    ttfbTrend.add(await homePage.measureTTFB());
    fcpTrend.add(await homePage.measureFCP());
    lcpTrend.add(await homePage.measureLCP());
    clsTrend.add(await homePage.measureCLS());

    const ok = check(page, {
      'page title present': async () => (await homePage.getTitle()).length > 0,
      'no error in url':    () => !homePage.isErrorPage(),
    });
    uiErrors.add(!ok);

    sleep(2);

    const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
    const productPage = new ProductPage(page);
    await productPage.goto(productId);

    check(page, {
      'product page loaded': () => !productPage.isErrorPage(),
    });

    sleep(2);

  } catch (e) {
    console.error(`Browser journey failed: ${e.message}`);
    uiErrors.add(1);
  } finally {
    await page.close();
  }
}
