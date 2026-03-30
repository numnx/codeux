const fs = require('fs');
const filepath = 'dashboard/src/v2/lib/live-session-task-structure.ts';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  'let candidateTask = runtimeByRecordId.get(task.recordId);',
  'let candidateTask: Subtask | undefined = runtimeByRecordId.get(task.recordId);'
);

fs.writeFileSync(filepath, content);
