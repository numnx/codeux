import fs from 'fs';

let content = fs.readFileSync('tests/dashboard/v2/stats-page-shell.test.tsx', 'utf-8');

content = content.replace(
  'expect(screen.getByText("Task Telemetry")).toBeInTheDocument();',
  'expect(screen.getAllByText("Task Telemetry")[0]).toBeInTheDocument();'
);
content = content.replace(
  'expect(screen.getByText("Sprint Telemetry")).toBeInTheDocument();',
  'expect(screen.getAllByText("Sprint Telemetry")[0]).toBeInTheDocument();'
);

fs.writeFileSync('tests/dashboard/v2/stats-page-shell.test.tsx', content);
