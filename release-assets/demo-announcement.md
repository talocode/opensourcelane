# OpenSourceLane v0.1.0

**@talocode** — OpenSourceLane is live. Find open-source alternatives to expensive SaaS, score adoption risk, estimate savings, and generate migration plans.

**@AbdMuizAdeyemo** — We built this because every founder asks the same question: "Is there an open-source version of this?" Now there's an API for that.

## Install

```bash
npm install @talocode/opensourcelane
npx opensourcelane alternatives --replace Jira --team-size 6
```

## SDK

```ts
import { OpenSourceLaneClient } from '@talocode/opensourcelane'
const osl = new OpenSourceLaneClient({ apiKey: process.env.TALOCODE_API_KEY })
await osl.alternatives.find({ replace: 'Jira', teamSize: 6 })
```

## Sponsor

https://github.com/sponsors/Abdulmuiz44