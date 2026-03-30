const fs = require('fs');
const filepath = 'tests/dashboard/v2/live-session-task-structure.test.ts';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  'createDispatch({ id: "dispatch-2", sprintId: "sprint-2", status: "running", taskKey: "T1", taskId: "rec-2", sessionId: "session-2" }),',
  'createDispatch({ id: "dispatch-2", sprintId: "sprint-2", status: "running", taskRunState: "RUNNING", taskKey: "T1", taskId: "rec-2", sessionId: "session-2" }),'
);

content = content.replace(
  'createEvent({ id: "event-2", sprintId: "sprint-2", taskKey: "T1", taskId: "rec-2", sessionId: "session-2" })',
  'createEvent({ id: "event-2", sprintId: "sprint-2", taskRunState: "RUNNING", eventType: "run_started", taskKey: "T1", taskId: "rec-2", sessionId: "session-2" })'
);

fs.writeFileSync(filepath, content);
