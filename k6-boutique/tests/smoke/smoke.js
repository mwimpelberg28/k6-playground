import { sleep, group } from 'k6';
import { getHome, getProduct, addToCart, getCart, randomProduct } from '../../lib/client.js';
import { checkHome, checkProductPage, checkCartAction } from '../../lib/checks.js';

export const options = {
  vus: 1,
  duration: '60s',       // doubled — more iterations = more reliable signal
  thresholds: {
    http_req_failed:   ['rate<0.05'],   // relaxed slightly for smoke
    http_req_duration: ['p(95)<2000'],
    checks:            ['rate>0.90'],   // relaxed slightly for smoke
  },
};

// Runs once before the VU loop — warms up the connection
export function setup() {
  getHome();
  sleep(2);
}

export default function () {
  group('homepage', () => {
    const res = getHome();
    checkHome(res);
  });

  sleep(1);

  group('product page', () => {
    const res = getProduct(randomProduct());
    checkProductPage(res);
  });

  sleep(1);

  group('add to cart', () => {
    const res = addToCart(randomProduct(), 1);
    checkCartAction(res);
  });

  sleep(1);

  group('view cart', () => {
    const res = getCart();
    const ok = res.status === 200;
    if (!ok) console.error(`Cart page failed: ${res.status}`);
  });

  sleep(2);
}
