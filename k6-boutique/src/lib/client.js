import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://10.4.20.2';

export const PRODUCT_IDS = [
  '0PUK6V6EV0',
  '1YMWWN1N4O',
  '2ZYFJ3GM2N',
  '66VCHSJNUP',
  '6E92ZMYYFZ',
  '9SIQT8TOJO',
  'L9ECAV4EOI',
  'LS4PSXUNUM',
  'OJLKSIGS2Q',
  'OLJCESPC7Z',
];

const baseHeaders = {
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Builds params with a per-request name tag to avoid 'too many series' issues
// when URLs contain dynamic segments (e.g. /product/:id).
function params(name) {
  return { headers: baseHeaders, tags: { service: 'frontend', name } };
}

export function getHome() {
  return http.get(`${BASE_URL}/`, params('get-home'));
}

export function getProduct(productId) {
  return http.get(`${BASE_URL}/product/${productId}`, params('get-product'));
}

export function addToCart(productId, quantity = 1) {
  return http.post(
    `${BASE_URL}/cart`,
    { product_id: productId, quantity: quantity.toString() },
    params('add-to-cart')
  );
}

export function getCart() {
  return http.get(`${BASE_URL}/cart`, params('get-cart'));
}

export function checkout(checkoutData) {
  return http.post(`${BASE_URL}/cart/checkout`, checkoutData, params('checkout'));
}

export function setCurrency(currency) {
  return http.post(`${BASE_URL}/setCurrency`, { currency_code: currency }, params('set-currency'));
}

export function randomProduct() {
  return PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
}

export function checkoutPayload() {
  return {
    email: 'test@example.com',
    street_address: '1600 Amphitheatre Pkwy',
    zip_code: '94043',
    city: 'Mountain View',
    state: 'CA',
    country: 'United States',
    credit_card_number: '4432801561520454',
    credit_card_expiration_month: '12',
    credit_card_expiration_year: '2029',
    credit_card_cvv: '672',
  };
}

export function randSleep(min, max) {
  return Math.random() * (max - min) + min;
}
