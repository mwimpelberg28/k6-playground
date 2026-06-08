/**
 * Entry point for browser-based tests (separate from main.js — browser
 * tests require Chromium and behave differently under k6 cloud).
 *
 * Local:  k6 run       dist/test.browser.js -e CONFIG_FILE=../src/config/browser.config.json
 * Cloud:  k6 cloud run dist/test.browser.js -e CONFIG_FILE=../src/config/browser.config.json -e BASE_URL=https://imitation-laxative-iphone.ngrok-free.dev
 */
import { browserFlow } from './scenarios/browserFlow.js';

const CONFIG_FILE = __ENV.CONFIG_FILE || '../src/config/browser.config.json';
const testConfig  = JSON.parse(open(CONFIG_FILE));

export const options = Object.assign({ insecureSkipTlsVerify: false }, testConfig);

export { browserFlow };
