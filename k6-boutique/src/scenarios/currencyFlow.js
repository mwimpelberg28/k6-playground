import { sleep } from 'k6';
import { randomProduct, randSleep } from '../lib/client.js';
import { browseAfterCurrencySwitch } from '../scripts/home.js';
import { viewProductInCurrency } from '../scripts/product.js';
import { switchCurrency, randomCurrency } from '../scripts/currency.js';

export function currencyFlow() {
  switchCurrency(randomCurrency());
  sleep(1);

  browseAfterCurrencySwitch();
  sleep(randSleep(1, 2));

  viewProductInCurrency(randomProduct());
  sleep(randSleep(1, 3));
}
