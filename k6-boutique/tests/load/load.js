// tests/load/load.js
import { sleep, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  getHome, getProduct, addToCart, getCart, checkout,
  setCurrency, randomProduct, checkoutPayload
} from '../../lib/client.js';
import {
  checkHome, checkProductPage, checkCartAction, checkCheckout, checkRedirectOrOk
} from '../../lib/checks.js';

// Custom metrics
const checkoutDuration = new Trend('boutique_checkout_duration', true);
const checkoutSuccess  = new Rate('boutique_checkout_success');
const cartErrors       = new Counter('boutique_cart_errors');
const browseDepth      = new Trend('boutique_browse_depth');

export const options = {
  scenarios: {
    browsers: {
      executor: 'ramping-vus',
      exec: 'browserJourney',
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { journey: 'browser' },
    },
    shoppers: {
      executor: 'ramping-vus',
      exec: 'shopperJourney',
      stages: [
        { duration: '1m', target: 5 },
        { duration: '3m', target: 5 },
        { duration: '1m', target: 0 },
      ],
      tags: { journey: 'shopper' },
    },
    currencyUsers: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: 'currencyJourney',
      tags: { journey: 'currency' },
    },
  },
  thresholds: {
    http_req_failed:                          ['rate<0.05'],
    http_req_duration:                        ['p(95)<3000'],
    checks:                                   ['rate>0.90'],
    'http_req_duration{journey:browser}':     ['p(95)<2000'],
    'http_req_duration{journey:shopper}':     ['p(95)<4000'],
    'http_req_duration{journey:currency}':    ['p(95)<2000'],
    'boutique_checkout_duration':             ['p(95)<5000'],
    'boutique_checkout_success':              ['rate>0.80'],
  },
};

export function browserJourney() {
  let pagesViewed = 0;

  group('homepage', () => {
    const res = getHome();
    checkHome(res);
    pagesViewed++;
  });
  sleep(randSleep(2, 5));

  const numProducts = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numProducts; i++) {
    group('browse product', () => {
      const res = getProduct(randomProduct());
      checkProductPage(res);
      pagesViewed++;
    });
    sleep(randSleep(1, 4));
  }

  browseDepth.add(pagesViewed);
  sleep(randSleep(1, 3));
}

export function shopperJourney() {
  group('homepage', () => {
    const res = getHome();
    checkHome(res);
  });
  sleep(randSleep(2, 4));

  const productId = randomProduct();
  group('view product', () => {
    const res = getProduct(productId);
    checkProductPage(res);
  });
  sleep(randSleep(1, 3));

  let cartOk = false;
  group('add to cart', () => {
    const res = addToCart(productId, 1);
    cartOk = checkCartAction(res);
    if (!cartOk) cartErrors.add(1);
  });
  sleep(randSleep(1, 2));

  if (!cartOk) return;

  if (Math.random() > 0.5) {
    group('add second item', () => {
      addToCart(randomProduct(), 1);
    });
    sleep(randSleep(1, 2));
  }

  group('view cart', () => {
    const res = getCart();
    checkRedirectOrOk(res);
  });
  sleep(randSleep(2, 4));

  group('checkout', () => {
    const start = Date.now();
    const res = checkout(checkoutPayload());
    checkoutDuration.add(Date.now() - start);
    checkoutSuccess.add(checkCheckout(res));
  });

  sleep(randSleep(2, 5));
}

export function currencyJourney() {
  const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD'];
  const currency = currencies[Math.floor(Math.random() * currencies.length)];

  group('set currency', () => {
    const res = setCurrency(currency);
    checkRedirectOrOk(res);
  });
  sleep(1);

  group('browse after currency switch', () => {
    const res = getHome();
    checkHome(res);
  });
  sleep(randSleep(1, 2));

  group('view product in currency', () => {
    const res = getProduct(randomProduct());
    checkProductPage(res);
  });
  sleep(randSleep(1, 3));
}

function randSleep(min, max) {
  return Math.random() * (max - min) + min;
}
