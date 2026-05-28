// lib/client.js
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://10.4.20.2';

export const defaultParams = {
  headers: {
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  tags: { service: 'frontend' },
};

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

export function getHome(params = defaultParams) {
  return http.get(`${BASE_URL}/`, params);
}

export function getProduct(productId, params = defaultParams) {
  return http.get(`${BASE_URL}/product/${productId}`, params);
}

export function addToCart(productId, quantity = 1, params = defaultParams) {
  return http.post(
    `${BASE_URL}/cart`,
    { product_id: productId, quantity: quantity.toString() },
    params
  );
}

export function getCart(params = defaultParams) {
  return http.get(`${BASE_URL}/cart`, params);
}

export function checkout(checkoutData, params = defaultParams) {
  return http.post(`${BASE_URL}/cart/checkout`, checkoutData, params);
}

export function setCurrency(currency, params = defaultParams) {
  return http.post(`${BASE_URL}/setCurrency`, { currency_code: currency }, params);
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
