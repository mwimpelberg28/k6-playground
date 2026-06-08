import { sleep } from 'k6';
import http from 'k6/http';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { BASE_URL, randomProduct, randSleep } from '../lib/client.js';
import { visitHome } from '../scripts/home.js';
import { viewProduct } from '../scripts/product.js';
import { addItemToCart, addSecondItem, viewCart } from '../scripts/cart.js';
import { doCheckout } from '../scripts/checkout.js';

const checkoutDuration = new Trend('boutique_checkout_duration', true);
const checkoutSuccess  = new Rate('boutique_checkout_success');
const cartErrors       = new Counter('boutique_cart_errors');
const activeSessions   = new Gauge('boutique_active_sessions');

export function shopperFlow() {
  visitHome();
  sleep(randSleep(2, 4));

  const productId = randomProduct();
  viewProduct(productId);
  sleep(randSleep(1, 3));

  const cartOk = addItemToCart(productId, 1);
  if (!cartOk) {
    cartErrors.add(1);
    return;
  }
  sleep(randSleep(1, 2));

  if (Math.random() > 0.5) {
    addSecondItem(randomProduct());
    sleep(randSleep(1, 2));
  }

  viewCart();
  sleep(randSleep(2, 4));

  const { ok, duration } = doCheckout();
  checkoutDuration.add(duration);
  checkoutSuccess.add(ok);
  activeSessions.add(http.cookieJar().cookiesForURL(BASE_URL).length > 0 ? 1 : 0);
  sleep(randSleep(2, 5));
}
