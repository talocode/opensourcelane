# OpenSourceLane API

**Base URL:** `https://api.talocode.site`  
**Namespace:** `/v1/opensourcelane/*`  
**Auth:** `Authorization: Bearer $TALOCODE_API_KEY`

> Not legal or financial advice. Risk scores are heuristic.

## POST /v1/opensourcelane/repo/analyze

Analyze an open-source repository for adoption fit.

```json
{
  "repo": "hudy9x/namviek",
  "metadata": { "stars": 3000, "contributors": 6 },
  "requirements": ["kanban", "issues"]
}
```

## POST /v1/opensourcelane/alternatives/find

Find open-source alternatives to a SaaS tool.

```json
{
  "replace": "Jira",
  "teamSize": 6,
  "requiredFeatures": ["kanban", "issues"],
  "riskTolerance": "medium"
}
```

## POST /v1/opensourcelane/migration/plan

Generate a migration plan.

```json
{
  "from": "Jira",
  "to": "hudy9x/namviek",
  "teamSize": 6,
  "currentWorkflow": ["backlog", "kanban", "sprints"]
}
```

## POST /v1/opensourcelane/cost/estimate

Estimate cost savings (not financial advice).

```json
{
  "currentTool": "Jira",
  "currentMonthlyCost": 80,
  "teamSize": 6
}
```

## POST /v1/opensourcelane/risk/score

Score adoption risk heuristically.

```json
{
  "repo": "hudy9x/namviek",
  "metadata": {},
  "requirements": []
}
```

## POST /v1/opensourcelane/brief/generate

Generate an adoption brief.

## POST /v1/opensourcelane/tools/compare

Compare multiple open-source tools.

## POST /v1/opensourcelane/deployment/plan

Generate a self-hosting deployment plan.

## POST /v1/opensourcelane/license/audit

Audit license obligations (not legal advice).

## POST /v1/opensourcelane/export/markdown

Export analysis as markdown.

## POST /v1/opensourcelane/export/json

Export analysis as JSON.