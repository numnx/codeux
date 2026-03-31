const fs = require('fs');

let code = fs.readFileSync('tests/backend/server/dashboard-server.test.ts', 'utf8');

code = code.replace(/      getOverviewTelemetrySnapshot: \(\) => \(\{\n        activeProjects: \[\],\n        attentionProjects: \[\],\n        recentEvents: \[\],\n        updatedAt: "2026-03-10T00:00:00\.000Z",\n      \}\),\n    \}\);/g, '      getOverviewTelemetrySnapshot: () => ({\n        activeProjects: [],\n        attentionProjects: [],\n        recentEvents: [],\n        updatedAt: "2026-03-10T00:00:00.000Z",\n      }),\n      getProjectLiveSnapshot: () => ({} as any),\n    });');

fs.writeFileSync('tests/backend/server/dashboard-server.test.ts', code);
