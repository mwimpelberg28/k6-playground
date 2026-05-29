# Part 2 of 4: Building a Real k6 Test Suite Against a Live Kubernetes App

In part 1 I covered k6's philosophy and the anatomy of a first test. This post is where things get real — a production-grade test suite running against a live microservices app on a homelab Kubernetes cluster, including what went wrong on the first run and how I debugged it. All of the code can be found here: https://github.com/mwimpelberg28/k6-playground

## The target: Online Boutique

Rather than testing against a mock or a toy API, I wanted something that resembles a real production system. Google's Online Boutique is a microservices demo app with 11 services covering a realistic e-commerce stack: frontend, cart, checkout, product catalog, currency conversion, recommendations, and more.

Deploying it took about two minutes:

```bash
kubectl create namespace boutique
kubectl apply -n boutique -f \
  https://raw.githubusercontent.com/GoogleCloudPlatform/microservices-demo/main/release/kubernetes-manifests.yaml
```

My homelab runs a kubeadm cluster on Ubuntu with MetalLB for load balancing. Within 30 seconds MetalLB had assigned a real external IP and the app was serving traffic at `http://10.4.20.2`.

```bash
kubectl get svc -n boutique frontend-external
# NAME                TYPE           EXTERNAL-IP   PORT(S)
# frontend-external   LoadBalancer   10.4.20.2     80:xxxxx/TCP
```

## The architecture decision that matters most

Before writing a single test I designed a layered project structure. This is the difference between a test suite and a folder of scripts.

```
k6-boutique/
├── src/
│   ├── config/          ← test options as JSON, selected at runtime
│   │   ├── smoke.config.json
│   │   ├── load.config.json
│   │   ├── stress.config.json
│   │   └── browser.config.json
│   ├── scenarios/       ← user journey flows: chain scripts + sleep
│   │   ├── browseFlow.js
│   │   ├── shopperFlow.js
│   │   ├── currencyFlow.js
│   │   └── stressFlow.js
│   ├── scripts/         ← individual page actions: one group() per file
│   │   ├── home.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   ├── checkout.js
│   │   └── currency.js
│   ├── pages/           ← Page Object Model classes for browser tests
│   │   ├── HomePage.js
│   │   └── ProductPage.js
│   ├── lib/             ← shared HTTP client and check assertions
│   │   ├── client.js
│   │   └── checks.js
│   ├── main.js          ← single entry point for all HTTP tests
│   └── browser.js       ← entry point for browser tests
├── webpack.config.js
└── package.json
```

Think of it as lego blocks. The `lib/` layer knows how to talk to the app. The `scripts/` layer wraps each action in a named `group()`. The `scenarios/` layer chains those actions into user journeys. The `config/` layer defines the load profile and thresholds for each test type. Nothing reaches down more than one layer.

### The shared client

`src/lib/client.js` knows how to talk to the app — base URL, request helpers, product IDs, checkout payload. Every layer imports from it. Change the target URL once, everything picks it up.

One detail worth calling out: every request carries a `name` tag.

```javascript
// src/lib/client.js
function params(name) {
  return { headers: baseHeaders, tags: { service: 'frontend', name } };
}

export function getProduct(productId) {
  return http.get(`${BASE_URL}/product/${productId}`, params('get-product'));
}

export function addToCart(productId, quantity = 1) {
  return http.post(`${BASE_URL}/cart`, { product_id: productId, quantity: quantity.toString() }, params('add-to-cart'));
}
```

Without the `name` tag, k6 tracks `/product/0PUK6V6EV0` and `/product/1YMWWN1N4O` as separate metric series. With 10 product IDs and many VUs you hit Grafana Cloud's "too many series" limit fast. The `name` tag collapses all product page requests into a single `get-product` series regardless of the ID in the URL.

### The shared checks

`src/lib/checks.js` knows what a good response looks like for each page:

```javascript
// src/lib/checks.js
export function checkHome(res) {
  return check(res, {
    'status 200':     (r) => r.status === 200,
    'shows products': (r) => r.body.includes('Hot Products'),
    'response < 2s':  (r) => r.timings.duration < 2000,
  });
}
```

Define it once, use it everywhere. When the app changes, fix it in one place.

### The scripts layer

Each file in `scripts/` wraps one action in a named `group()` and runs the appropriate check. This is the unit of reuse — scenarios call these, not raw HTTP calls.

```javascript
// src/scripts/product.js
export function browseProduct(productId) {
  let ok;
  group('browse product', () => {
    ok = checkProductPage(getProduct(productId));
  });
  return ok;
}

export function viewProduct(productId) {
  let ok;
  group('view product', () => {
    ok = checkProductPage(getProduct(productId));
  });
  return ok;
}
```

Different group names matter — `group_duration{group:::browse product}` and `group_duration{group:::view product}` are separate metrics, so you can set different SLAs for casual browsing vs. intent-to-buy flows.

## Config files drive everything

Rather than hardcoding load profiles in test files, each test type has a JSON config file that's passed at runtime. The single entry point reads whichever config you point it at:

```javascript
// src/main.js
const CONFIG_FILE = __ENV.CONFIG_FILE || '../src/config/smoke.config.json';
const testConfig  = JSON.parse(open(CONFIG_FILE));

export const options = Object.assign({ insecureSkipTlsVerify: false }, testConfig);

export function setup() {
  getHome();  // warm the connection before VUs start
  sleep(2);
}

// Named exports so scenario `exec` fields in the JSON config can reference them
export { browseFlow, shopperFlow, currencyFlow, stressFlow };
```

The build step (webpack) bundles everything into `dist/test.main.js`. The JSON config files stay outside the bundle and are opened at runtime, so you can swap them without rebuilding.

```bash
npm run build

# local run
k6 run dist/test.main.js -e CONFIG_FILE=../src/config/load.config.json

# cloud run
k6 cloud run dist/test.main.js -e CONFIG_FILE=../src/config/load.config.json
```

## Smoke test first

The smoke config is 1 VU, 5 iterations of `shopperFlow` — homepage → product → add to cart → checkout. Its only job is to confirm the app is up and critical paths respond correctly. If smoke fails, nothing else runs.

```json
// src/config/smoke.config.json
{
  "scenarios": {
    "smoke": {
      "executor": "per-vu-iterations",
      "vus": 1,
      "iterations": 5,
      "exec": "shopperFlow",
      "gracefulStop": "30s"
    }
  },
  "thresholds": {
    "http_req_failed":   ["rate<0.05"],
    "http_req_duration": ["p(95)<2000"],
    "checks":            ["rate>0.90"],

    "group_duration{group:::homepage}":     ["avg<500"],
    "group_duration{group:::view product}": ["avg<500"],
    "group_duration{group:::add to cart}":  ["avg<1000"],
    "group_duration{group:::checkout}":     ["avg<5000"]
  }
}
```

The `group_duration` thresholds are worth explaining. `http_req_duration` tells you how fast individual requests are. `group_duration` tells you how long an entire named step takes — a group might contain a single request or several. Setting an SLA on `group_duration{group:::checkout}` is much closer to a real business SLO than a raw request threshold, because checkout involves multiple sequential calls.

The syntax looks unusual — `group:::checkout` uses three colons. That's the k6 tag format for the built-in `group_duration` metric. Every group you define in code gets a corresponding series in this metric for free.

```bash
k6 run dist/test.main.js -e CONFIG_FILE=../src/config/smoke.config.json
# or: npm run smoke
```

## What the first run caught

First smoke run: 10% error rate, two thresholds crossed. Response times were excellent — p95 of 87ms — so this wasn't a performance problem. Something was functionally wrong.

**Debugging step 1** — verify the text the check was looking for:

```bash
curl -s http://10.4.20.2/product/0PUK6V6EV0 | grep -i "add to cart"
# <button type="submit" class="cymbal-button-primary">Add To Cart</button>
```

Text matched exactly. So the check wasn't wrong — some requests were returning non-200 responses before the check even ran.

**Debugging step 2** — check what the cart POST actually returns:

```bash
curl -v -X POST http://10.4.20.2/cart \
  -d "product_id=0PUK6V6EV0&quantity=1" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

```http
< HTTP/1.1 302 Found
< Location: /cart
< Set-Cookie: shop_session-id=51779754-8ac6-4ac9-bbd9-1f062a8dc1b4
```

The cart POST returns a 302 and sets a session cookie. With only a handful of iterations, cold-start noise before sessions were established was dominating the results. The fix: bump the iteration count, add the `setup()` warmup in `main.js`, and slightly relax thresholds — smoke should catch catastrophic failure, not enforce strict SLOs.

This is the value of testing against a real app rather than a mock — you discover actual system behaviour.

## Two bugs found during the load test

Running the full suite surfaced two more issues.

**Bug 1 — Checkout success was 0%.** All 79 checkout attempts completed and returned 200, but none matched the expected text. One curl command revealed it:

```bash
curl -s [checkout flow with cookies] | grep -i "order\|confirm\|thank"
# Your order is complete!
```

The check in `src/lib/checks.js` assumed `Your order is placed`. Fixed in one place, picked up everywhere:

```javascript
export function checkCheckout(res) {
  return check(res, {
    'order placed':  (r) => r.status === 200 && r.body.includes('Your order is complete!'),
    'response < 3s': (r) => r.timings.duration < 3000,
  });
}
```

**Bug 2 — Browser "page title present" failed all 41 iterations.** In k6's browser API, `page.title()` returns a Promise and needs to be awaited. The fix sits in `src/scenarios/browserFlow.js`:

```javascript
// broken
'page title present': () => page.title().length > 0,

// fixed
'page title present': async () => (await page.title()).length > 0,
```

Both fixes are a good reminder that checks are only as good as the assumptions baked into them. The test framework did its job — it surfaced the mismatches immediately.

## User journeys: three concurrent scenarios

With smoke passing, it was time for the load test. Rather than hitting one endpoint in a loop, three distinct user types run simultaneously as k6 scenarios. All three are defined in `load.config.json`; the scenario functions live in `src/scenarios/`.

```json
// src/config/load.config.json (scenarios section)
{
  "scenarios": {
    "browsers":  { "executor": "ramping-vus",          "exec": "browseFlow",   "stages": [{"duration":"1m","target":20}, {"duration":"3m","target":20}, {"duration":"1m","target":0}], "tags": {"journey":"browser"} },
    "shoppers":  { "executor": "ramping-vus",          "exec": "shopperFlow",  "stages": [{"duration":"1m","target":5},  {"duration":"3m","target":5},  {"duration":"1m","target":0}], "tags": {"journey":"shopper"} },
    "currencyUsers": { "executor": "constant-arrival-rate", "exec": "currencyFlow", "rate": 2, "timeUnit": "1s", "duration": "5m", "preAllocatedVUs": 5, "maxVUs": 10, "tags": {"journey":"currency"} }
  }
}
```

**Browsers** — casual visitors, read-only, up to 20 VUs. The scenario chains `visitHome()` and multiple `browseProduct()` calls from the scripts layer:

```javascript
// src/scenarios/browseFlow.js
export function browseFlow() {
  let pagesViewed = 0;

  visitHome();
  pagesViewed++;
  sleep(randSleep(2, 5));

  const numProducts = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numProducts; i++) {
    browseProduct(randomProduct());
    pagesViewed++;
    sleep(randSleep(1, 4));
  }

  browseDepth.add(pagesViewed);
}
```

**Shoppers** — full checkout flow, up to 5 VUs. The checkout script returns `{ ok, duration }` so the scenario can record custom metrics without needing access to the raw response:

```javascript
// src/scenarios/shopperFlow.js
export function shopperFlow() {
  visitHome();
  sleep(randSleep(2, 4));

  viewProduct(productId);
  sleep(randSleep(1, 3));

  const cartOk = addItemToCart(productId, 1);
  if (!cartOk) { cartErrors.add(1); return; }

  viewCart();
  sleep(randSleep(2, 4));

  const { ok, duration } = doCheckout();
  checkoutDuration.add(duration);
  checkoutSuccess.add(ok);
}
```

**Currency switchers** — exercises the currency microservice at a constant arrival rate of 2 RPS. `constant-arrival-rate` controls throughput rather than concurrency — 2 iterations per second regardless of how long each one takes. That's how production traffic actually behaves.

### Per-journey request thresholds

Because each scenario tag is set in the JSON config (`"tags": {"journey":"browser"}`), you can threshold each journey's request duration independently:

```json
"http_req_duration{journey:browser}":  ["p(95)<2000"],
"http_req_duration{journey:shopper}":  ["p(95)<4000"],
"http_req_duration{journey:currency}": ["p(95)<2000"]
```

## Custom metrics as business SLOs

Custom metrics are defined in the scenario files where they're used. `shopperFlow.js` owns the checkout metrics; `browseFlow.js` owns browse depth:

```javascript
// src/scenarios/shopperFlow.js
const checkoutDuration = new Trend('boutique_checkout_duration', true);
const checkoutSuccess  = new Rate('boutique_checkout_success');
const cartErrors       = new Counter('boutique_cart_errors');
```

The thresholds in `load.config.json` encode real business requirements:

```json
"boutique_checkout_duration": ["p(95)<5000"],
"boutique_checkout_success":  ["rate>0.80"]
```

This is the shift from infrastructure SLOs to business SLOs — codified, version-controlled, enforced automatically in CI.

## Results across all four test types

After fixing both bugs and re-running the full suite:

![results](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/se4n9u91ar1b5mavi815.png)

The results tell a clear story.

**Response times are strong under normal load.** Smoke p95 at 89ms and load p95 at 273ms show the app handles realistic traffic comfortably on homelab hardware.

**Checkout: 0% → 100% after the fix.** All 80 checkout attempts placed orders successfully, with a p95 of 224ms against a 5,000ms threshold. The bug was entirely in the check assertion, not the app.

**Browser Web Vitals are healthy.** LCP at 335ms and FCP at 255ms are well inside Core Web Vital targets. TTFB at 36ms is excellent. CLS at 0.117 just nudges over the 0.10 target — worth monitoring but not alarming. Note: browser tests deliberately have no `group()` calls — there's a long-standing k6 issue with groups in the browser context.

**Product page buckled first under stress.** At 150 VUs the homepage held — 9,907 successful checks, zero 500 errors. The product page accumulated 2,037 failures. This makes architectural sense: the product page fans out to the product catalog, recommendation, and currency services simultaneously. Under load, those downstream calls start queuing. The homepage is a simpler call graph and degrades later.

**Browse depth averaged 4.0 pages per session** — the random product browsing in the browse journey is working as intended, generating realistic read patterns.

## What's next

Post 3 covers the stress test in depth — reading degradation signals, understanding the product page failure pattern architecturally, and the k6 Browser module for Web Vitals measurement. Plus all four custom metric types and how to use them as CI-enforceable SLOs in Grafana Cloud.

---

*#k6 #Grafana #LoadTesting #Kubernetes #Observability #SRE #PerformanceTesting*
