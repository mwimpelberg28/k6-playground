import { group } from 'k6';
import { checkout, checkoutPayload } from '../lib/client.js';
import { checkCheckout } from '../lib/checks.js';

// Returns { ok, duration } so callers can record custom metrics.
export function doCheckout() {
  let ok, duration;
  group('checkout', () => {
    const start = Date.now();
    const res = checkout(checkoutPayload());
    duration = Date.now() - start;
    ok = checkCheckout(res);
  });
  return { ok, duration };
}
