# k6 Mastery Suite

A comprehensive k6 test suite demonstrating the full spectrum of k6 capabilities, integrated with Grafana Cloud. Built against the [k6 demo API](https://test-api.k6.io).

## Coverage

| Test Type | Script | Purpose |
|---|---|---|
| Smoke | `tests/smoke/smoke.js` | Sanity check — 1 VU, confirms baseline functionality |
| Load | `tests/load/load.js` | Realistic traffic, validates thresholds under normal conditions |
| Stress | `tests/stress/stress.js` | Pushes beyond capacity to find breaking points |
| Soak | `tests/soak/soak.js` | Sustained load over time — catches memory leaks and degradation |
| Browser | `tests/browser/browser.js` | Real Chrome via k6 Browser API — frontend performance |
| Synthetics | `tests/synthetics/synthetic.js` | Scheduled availability and latency monitoring |

## Shared Library

Common logic lives in `lib/` and is imported by all tests:

- `lib/client.js` — HTTP helpers, auth, base URL config
- `lib/checks.js` — Reusable check assertions
- `lib/thresholds.js` — Standard threshold definitions

## Prerequisites

- [k6 installed](https://k6.io/docs/get-started/installation/)
- Grafana Cloud account with k6 access
- `K6_CLOUD_TOKEN` set in your environment

## Running Tests

```bash
# Local run
k6 run tests/smoke/smoke.js

# With environment overrides
k6 run -e BASE_URL=https://test-api.k6.io -e VUS=10 tests/load/load.js

# Cloud run (results in Grafana Cloud)
k6 cloud tests/load/load.js
```

## Grafana Cloud Integration

Results from cloud runs appear automatically in **Grafana Cloud → k6**. A custom dashboard is provided in `dashboards/k6-overview.json` — import it via the Grafana UI or `scripts/import-dashboard.sh`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `https://test-api.k6.io` | Target API base URL |
| `VUS` | test-specific | Virtual user count override |
| `DURATION` | test-specific | Duration override |
| `K6_CLOUD_TOKEN` | required for cloud | Grafana Cloud k6 token |

## Repo Structure

```
k6-mastery/
├── tests/
│   ├── smoke/
│   ├── load/
│   ├── stress/
│   ├── soak/
│   ├── browser/
│   └── synthetics/
├── lib/
│   ├── client.js
│   ├── checks.js
│   └── thresholds.js
├── dashboards/
│   └── k6-overview.json
├── scripts/
│   └── import-dashboard.sh
└── docs/
    ├── architecture.md
    └── grafana-cloud-setup.md
```
