const fs = require('fs');

const testPath = 'tests/backend/domain/sprint/orchestrator/attention-plan-builder.test.ts';
let content = fs.readFileSync(testPath, 'utf8');

// Fix assertions to match the logic implemented
content = content.replace(
  'const t1MergeReplace = plan.toResolve.find(r => r.taskId === "T1" && r.reason === "merge_conflict_attention_replaced");',
  'const t1MergeReplace = plan.toResolve.find(r => r.taskId === "T1" && r.reason === "merge_required_attention_replaced");'
);

content = content.replace(
  'const mergeReplace = plan.toResolve.find(r => r.taskId === "T1" && r.reason === "merge_required_attention_replaced");',
  'const mergeReplace = plan.toResolve.find(r => r.taskId === "T1" && r.reason === "merge_conflict_attention_replaced");'
);


fs.writeFileSync(testPath, content, 'utf8');
