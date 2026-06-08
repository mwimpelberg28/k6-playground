/**
 * Single entry point for all HTTP-based test types.
 * Select a config file via CONFIG_FILE env var; defaults to smoke.
 *
 * Local:  k6 run       dist/test.main.js -e CONFIG_FILE=../src/config/load.config.json
 * Cloud:  k6 cloud run dist/test.main.js -e CONFIG_FILE=../src/config/load.config.json -e BASE_URL=https://imitation-laxative-iphone.ngrok-free.dev
 *
 * CONFIG_FILE path is relative to the dist/ output directory.
 */
import { sleep } from 'k6';
import { getHome } from './lib/client.js';
import { browseFlow }   from './scenarios/browseFlow.js';
import { shopperFlow }  from './scenarios/shopperFlow.js';
import { currencyFlow } from './scenarios/currencyFlow.js';
import { stressFlow }   from './scenarios/stressFlow.js';

const CONFIG_FILE = __ENV.CONFIG_FILE || '../src/config/smoke.config.json';
const testConfig  = JSON.parse(open(CONFIG_FILE));

export const options = Object.assign({ insecureSkipTlsVerify: false }, testConfig);

// Warm up the connection before VUs start.
export function setup() {
  getHome();
  sleep(2);
}

// Named exports so scenario `exec` fields in the JSON config can reference them.
export { browseFlow, shopperFlow, currencyFlow, stressFlow };
