import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { randomProduct, randSleep } from '../lib/client.js';
import { visitHome } from '../scripts/home.js';
import { browseProduct } from '../scripts/product.js';

const browseDepth = new Trend('boutique_browse_depth');

export function browseFlow() {
  let pagesViewed = 0;

  visitHome();
  pagesViewed++;
  sleep(randSleep(2, 5));

  const numProducts = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numProducts; i++) {
    browseProduct(randomProduct());
    pagesViewed++;
    sleep(randSleep(1, 4));
  }

  browseDepth.add(pagesViewed);
  sleep(randSleep(1, 3));
}
