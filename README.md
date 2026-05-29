# k6 Boutique Test Suite

A k6 performance test suite built against the [Online Boutique](https://github.com/GoogleCloudPlatform/microservices-demo) demo app. Demonstrates smoke, load, stress, and browser testing with a modular, webpack-based project structure.

## Project Structure

```
k6-boutique/
├── src/
│   ├── config/              # Test options as JSON — select at runtime via CONFIG_FILE
│   │   ├── smoke.config.json
│   │   ├── load.config.json
│   │   ├── stress.config.json
│   │   └── browser.config.json
│   ├── scenarios/           # User journey flows — chain scripts together
│   │   ├── browseFlow.js
│   │   ├── shopperFlow.js
│   │   ├── currencyFlow.js
│   │   ├── stressFlow.js
│   │   └── browserFlow.js
│   ├── scripts/             # Individual page actions wrapped in groups
│   │   ├── home.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   ├── checkout.js
│   │   └── currency.js
│   ├── pages/               # Page Object Model classes for browser tests
│   │   ├── HomePage.js
│   │   └── ProductPage.js
│   ├── lib/                 # Shared HTTP client and check functions
│   │   ├── client.js
│   │   └── checks.js
│   ├── main.js              # Entry point for all HTTP tests (smoke / load / stress)
│   └── browser.js           # Entry point for browser tests
├── dist/                    # Webpack output — generated, not committed
├── webpack.config.js
├── package.json
└── .babelrc
```

### Layer responsibilities

| Layer | Folder | Role |
|---|---|---|
| Config | `src/config/` | Scenarios, stages, thresholds — swapped via `CONFIG_FILE` |
| Scenarios | `src/scenarios/` | User journey flows that chain scripts + sleep |
| Scripts | `src/scripts/` | One action per file: HTTP request inside a named `group()` + check |
| Pages (POM) | `src/pages/` | Browser page object classes |
| Lib | `src/lib/` | Low-level HTTP helpers and reusable check assertions |

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/)
- Node.js + npm (for the webpack build step)
- Target app running at `BASE_URL` (default: `http://10.4.20.2`)

## Setup

```bash
cd k6-boutique
npm install
npm run build        # produces dist/test.main.js and dist/test.browser.js
```

## Running Tests

Config files are loaded at runtime — `CONFIG_FILE` is relative to the `dist/` directory.

```bash
# HTTP tests — pick a config
k6 run dist/test.main.js -e CONFIG_FILE=../src/config/smoke.config.json
k6 run dist/test.main.js -e CONFIG_FILE=../src/config/load.config.json
k6 run dist/test.main.js -e CONFIG_FILE=../src/config/stress.config.json

# Browser test
k6 run dist/test.browser.js -e CONFIG_FILE=../src/config/browser.config.json

# Or via npm scripts (builds first automatically)
npm run smoke
npm run load
npm run stress
npm run browser
```

### Grafana Cloud

```bash
k6 cloud run dist/test.main.js -e CONFIG_FILE=../src/config/load.config.json
```

## Test Types

| Config | Scenarios | Purpose |
|---|---|---|
| `smoke.config.json` | 1 VU, 5 iterations of `shopperFlow` | Sanity check — confirms baseline functionality |
| `load.config.json` | `browseFlow` + `shopperFlow` + `currencyFlow` ramping in parallel | Realistic multi-journey load |
| `stress.config.json` | `stressFlow` ramping to 150 VUs | Finds breaking points, tracks degraded responses |
| `browser.config.json` | `browserFlow` with Chromium | Frontend performance — LCP, FCP, TTFB, CLS |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CONFIG_FILE` | `../src/config/smoke.config.json` | Path to the JSON config file (relative to `dist/`) |
| `BASE_URL` | `http://10.4.20.2` | Target application base URL |

## Thresholds

Each config defines both request-level and group-level SLAs. Group thresholds use the `group_duration` metric with the `group:::` tag syntax:

```json
"group_duration{group:::checkout}":    ["avg<4000"],
"group_duration{group:::browse product}": ["avg<400"]
```

Request name tags (`name: 'get-product'`) are applied to all HTTP calls in `lib/client.js` to prevent "too many series" issues from dynamic URL segments.
