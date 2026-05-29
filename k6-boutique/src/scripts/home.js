import { group } from 'k6';
import { getHome } from '../lib/client.js';
import { checkHome } from '../lib/checks.js';

export function visitHome() {
  let ok;
  group('homepage', () => {
    ok = checkHome(getHome());
  });
  return ok;
}

export function browseAfterCurrencySwitch() {
  let ok;
  group('browse after currency switch', () => {
    ok = checkHome(getHome());
  });
  return ok;
}
