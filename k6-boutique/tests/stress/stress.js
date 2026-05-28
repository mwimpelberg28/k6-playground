// tests/stress/stress.js
import { sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { getHome, getProduct, addToCart, randomProduct } from '../../lib/client.js';
import { checkHome, checkProductPage } from '../../lib/checks.js';

const serviceErrors    = new Counter('boutique_service_errors');
const errorRate        = new Rate('boutique_error_rate');
const degradedPages    = new Counter('boutique_degraded_responses');

export const options = {
  stages: [
    { duration: '1m', target: 10  },  // warm up
    { duration: '2m', target: 30  },  // normal load
    { duration: '2m', target: 60  },  // stress
    { duration: '2m', target: 100 },  // heavy stress
    { duration: '2m', target: 150 },  // peak
    { duration: '3m', target: 0   },  // recovery
  ],
  thresholds: {
    http_req_failed:   ['rate<0.20'],
    http_req_duration: ['p(99)<10000'],
  },
};

export default function () {
  group('homepage', () => {
    const res = getHome();
    const ok = checkHome(res);
    errorRate.add(!ok);
    if (res.status >= 500) serviceErrors.add(1, { page: 'home' });
    if (ok && res.timings.duration > 2000) degradedPages.add(1, { page: 'home' });
  });

  sleep(0.5);

  group('product', () => {
    const res = getProduct(randomProduct());
    const ok = checkProductPage(res);
    errorRate.add(!ok);
    if (res.status >= 500) serviceErrors.add(1, { page: 'product' });
    if (ok && res.timings.duration > 1500) degradedPages.add(1, { page: 'product' });
  });

  sleep(0.5);

  group('add to cart', () => {
    const res = addToCart(randomProduct(), 1);
    errorRate.add(res.status >= 400);
    if (res.status >= 500) serviceErrors.add(1, { page: 'cart' });
  });

  sleep(Math.random() + 0.5);
}
