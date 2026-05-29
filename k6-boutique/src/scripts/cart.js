import { group } from 'k6';
import { addToCart, getCart } from '../lib/client.js';
import { checkCartAction, checkRedirectOrOk } from '../lib/checks.js';

export function addItemToCart(productId, quantity = 1) {
  let ok;
  group('add to cart', () => {
    ok = checkCartAction(addToCart(productId, quantity));
  });
  return ok;
}

export function addSecondItem(productId) {
  group('add second item', () => {
    addToCart(productId, 1);
  });
}

export function viewCart() {
  group('view cart', () => {
    checkRedirectOrOk(getCart());
  });
}
