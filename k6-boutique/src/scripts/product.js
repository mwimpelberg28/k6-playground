import { group } from 'k6';
import { getProduct } from '../lib/client.js';
import { checkProductPage } from '../lib/checks.js';

// Browse journey: multiple casual product visits
export function browseProduct(productId) {
  let ok;
  group('browse product', () => {
    ok = checkProductPage(getProduct(productId));
  });
  return ok;
}

// Shopper journey: viewing a specific product before buying
export function viewProduct(productId) {
  let ok;
  group('view product', () => {
    ok = checkProductPage(getProduct(productId));
  });
  return ok;
}

// Currency journey: viewing a product after switching currency
export function viewProductInCurrency(productId) {
  let ok;
  group('view product in currency', () => {
    ok = checkProductPage(getProduct(productId));
  });
  return ok;
}
