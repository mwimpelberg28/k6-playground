import { group, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { getHome, getProduct, addToCart, randomProduct } from '../lib/client.js';
import { checkHome, checkProductPage } from '../lib/checks.js';

// Stress-specific metrics track degradation under load, not just pass/fail.
const serviceErrors  = new Counter('boutique_service_errors');
const errorRate      = new Rate('boutique_error_rate');
const degradedPages  = new Counter('boutique_degraded_responses');

export function stressFlow() {
  group('homepage', () => {
    const res = getHome();
    const ok = checkHome(res);
    errorRate.add(!ok);
    if (res.status >= 500) serviceErrors.add(1, { page: 'home' });
    if (ok && res.timings.duration > 2000) degradedPages.add(1, { page: 'home' });
  });
  sleep(0.5);

  group('browse product', () => {
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
