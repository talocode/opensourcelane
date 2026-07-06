# OpenSourceLane

**Open-source software intelligence by [Talocode](https://talocode.site)**

Find, evaluate, and plan migrations to open-source alternatives for expensive SaaS tools.

## What it does

- Discover open-source alternatives to Jira, Notion, Datadog, Zapier, and more
- Score adoption risk with heuristic signals (not security audits)
- Estimate cost savings (estimates only — not financial advice)
- Generate migration plans with rollback steps
- Audit licenses (not legal advice)
- Compare tools side-by-side

## Install

```bash
npm install @talocode/opensourcelane
```

Or use the hosted Talocode Cloud API:

```bash
export TALOCODE_API_KEY=your_key
export TALOCODE_BASE_URL=https://api.talocode.site
```

## CLI

```bash
npx opensourcelane alternatives --replace Jira --team-size 6
npx opensourcelane analyze --repo hudy9x/namviek
npx opensourcelane migration --from Jira --to hudy9x/namviek
npx opensourcelane cost --tool Jira --monthly-cost 80
npx opensourcelane risk --repo makeplane/plane
npx opensourcelane --cloud alternatives --replace Notion
```

## SDK

```ts
import { OpenSourceLaneClient } from '@talocode/opensourcelane'

const osl = new OpenSourceLaneClient({
  apiKey: process.env.TALOCODE_API_KEY,
  baseUrl: process.env.TALOCODE_BASE_URL,
})

const plan = await osl.migration.plan({
  from: 'Jira',
  to: 'hudy9x/namviek',
  teamSize: 6,
})
```

## Local usage

Set `OPENSOURCELANE_ALLOW_LOCAL_UNAUTH=true` to run the API server without an API key:

```bash
npm run build
npm start
curl http://localhost:3050/v1/opensourcelane/health
```

## API

| Method | Path | Credits |
|--------|------|---------|
| GET | `/v1/opensourcelane/health` | — |
| POST | `/v1/opensourcelane/repo/analyze` | 25 |
| POST | `/v1/opensourcelane/alternatives/find` | 30 |
| POST | `/v1/opensourcelane/migration/plan` | 50 |
| POST | `/v1/opensourcelane/cost/estimate` | 20 |
| POST | `/v1/opensourcelane/risk/score` | 30 |
| POST | `/v1/opensourcelane/brief/generate` | 40 |
| POST | `/v1/opensourcelane/tools/compare` | 35 |
| POST | `/v1/opensourcelane/deployment/plan` | 35 |
| POST | `/v1/opensourcelane/license/audit` | 20 |
| POST | `/v1/opensourcelane/export/markdown` | 5 |
| POST | `/v1/opensourcelane/export/json` | 5 |

See [docs/API.md](docs/API.md) for full contracts.

## Important boundaries

- **Not legal advice.** License audits are informational only.
- **Not financial advice.** Cost estimates are rough projections.
- **Heuristic risk scores.** Popularity does not mean a repo is safe.
- **No private repo scraping.** Uses catalog and user-provided metadata.
- **No license violation encouragement.** Review copyleft obligations.

## Environment

```
TALOCODE_API_KEY=
TALOCODE_BASE_URL=https://api.talocode.site
OPENSOURCELANE_ALLOW_LOCAL_UNAUTH=true
GITHUB_TOKEN=optional
```

## Development

```bash
npm install
npm run build
npm test
```

## Support

Open-source Talocode products are built and maintained by Abdulmuiz Adeyemo.

Sponsor the work: https://github.com/sponsors/Abdulmuiz44

## License

MIT — see [LICENSE](LICENSE)