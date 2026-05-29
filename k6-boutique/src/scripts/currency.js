import { group } from 'k6';
import { setCurrency } from '../lib/client.js';
import { checkRedirectOrOk } from '../lib/checks.js';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CAD'];

export function switchCurrency(currency) {
  group('set currency', () => {
    checkRedirectOrOk(setCurrency(currency));
  });
}

export function randomCurrency() {
  return CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
}
