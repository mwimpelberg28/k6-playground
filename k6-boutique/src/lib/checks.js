import { check } from 'k6';

export function checkRedirectOrOk(res) {
  return check(res, {
    'success or redirect': (r) => r.status === 200 || r.status === 302,
  });
}

export function checkHome(res) {
  return check(res, {
    'status 200':     (r) => r.status === 200,
    'shows products': (r) => r.body.includes('Hot Products'),
    'response < 2s':  (r) => r.timings.duration < 2000,
  });
}

export function checkProductPage(res) {
  return check(res, {
    'status 200':      (r) => r.status === 200,
    'has add to cart': (r) => r.body.includes('Add To Cart'),
    'response < 1s':   (r) => r.timings.duration < 1000,
  });
}

export function checkCartAction(res) {
  return check(res, {
    'cart accepted': (r) => r.status === 200 || r.status === 302,
  });
}

export function checkCheckout(res) {
  return check(res, {
    'order placed':  (r) => r.status === 200 && r.body.includes('Your order is complete!'),
    'response < 3s': (r) => r.timings.duration < 3000,
  });
}
