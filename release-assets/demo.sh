#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
OPENSOURCELANE_ALLOW_LOCAL_UNAUTH=true node dist/server.js &
PID=$!
sleep 1
echo "=== Health ==="
curl -s http://127.0.0.1:3050/v1/opensourcelane/health | head -c 200
echo ""
echo "=== Alternatives ==="
curl -s -X POST http://127.0.0.1:3050/v1/opensourcelane/alternatives/find \
  -H 'Content-Type: application/json' \
  -d '{"replace":"Jira","teamSize":6,"requiredFeatures":["kanban"]}' | head -c 300
echo ""
echo "=== Migration ==="
curl -s -X POST http://127.0.0.1:3050/v1/opensourcelane/migration/plan \
  -H 'Content-Type: application/json' \
  -d '{"from":"Jira","to":"hudy9x/namviek","teamSize":6}' | head -c 300
echo ""
echo "=== Cost ==="
curl -s -X POST http://127.0.0.1:3050/v1/opensourcelane/cost/estimate \
  -H 'Content-Type: application/json' \
  -d '{"currentTool":"Jira","currentMonthlyCost":80,"teamSize":6}' | head -c 300
echo ""
echo "=== Brief ==="
curl -s -X POST http://127.0.0.1:3050/v1/opensourcelane/brief/generate \
  -H 'Content-Type: application/json' \
  -d '{"tool":"Namviek","repo":"hudy9x/namviek","replace":"Jira","teamSize":6}' | head -c 300
echo ""
kill $PID
wait $PID 2>/dev/null || true
echo "Demo complete."