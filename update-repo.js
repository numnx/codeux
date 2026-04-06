const fs = require('fs');

const path = 'src/repositories/project-management-repository.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Add imports
code = code.replace(
  'import { validateTaskDependencies } from "./project-management/task-dependency-graph.js";',
  'import { validateTaskDependencies } from "./project-management/task-dependency-graph.js";\nimport { SelectionStore } from "./project-management/selection-store.js";\nimport { TaskWriteStore } from "./project-management/task-write-store.js";'
);

// 2. Add private readonly fields and initialize them
code = code.replace(
  'private readonly db: DatabaseAdapter;',
  'private readonly db: DatabaseAdapter;\n  private readonly selectionStore: SelectionStore;\n  private readonly taskWriteStore: TaskWriteStore;'
);

code = code.replace(
  'this.db = storage.getDatabase();',
  'this.db = storage.getDatabase();\n    this.selectionStore = new SelectionStore(this.db);\n    this.taskWriteStore = new TaskWriteStore(this.db);'
);

// 3. Update getSelectedProjectId, setSelectedProjectId, getSelectedSprintId, setSelectedSprintId
code = code.replace(
  /getSelectedProjectId\(\): string \| null \{\s+const row = this\.db\.prepare\(`[\s\S]*?\} catch \{\s+return null;\s+\}\s+\}/g,
  'getSelectedProjectId(): string | null {\n    return this.selectionStore.getSelectedProjectId();\n  }'
);

code = code.replace(
  /setSelectedProjectId\(projectId: string \| null\): string \| null \{\s+if \(projectId\) \{\s+this\.requireProject\(projectId\);\s+\}\s+const now = new Date\(\)\.toISOString\(\);[\s\S]*?return projectId;\s+\}/g,
  'setSelectedProjectId(projectId: string | null): string | null {\n    if (projectId) {\n      this.requireProject(projectId);\n    }\n    return this.selectionStore.setSelectedProjectId(projectId);\n  }'
);

code = code.replace(
  /getSelectedSprintId\(projectId: string\): string \| null \{\s+this\.requireProject\(projectId\);[\s\S]*?\} catch \{\s+return null;\s+\}\s+\}/g,
  'getSelectedSprintId(projectId: string): string | null {\n    this.requireProject(projectId);\n    return this.selectionStore.getSelectedSprintId(projectId);\n  }'
);

code = code.replace(
  /setSelectedSprintId\(projectId: string, sprintId: string \| null\): string \| null \{\s+this\.requireProject\(projectId\);[\s\S]*?return sprintId;\s+\}/g,
  'setSelectedSprintId(projectId: string, sprintId: string | null): string | null {\n    this.requireProject(projectId);\n    if (sprintId) {\n      const sprint = this.requireSprint(sprintId);\n      if (sprint.projectId !== projectId) {\n        throw new Error(`Sprint ${sprintId} does not belong to project ${projectId}`);\n      }\n    }\n    return this.selectionStore.setSelectedSprintId(projectId, sprintId);\n  }'
);

// 4. createTask
const createTaskSearch = `    const insertDependency = this.db.prepare(\`
      INSERT INTO task_dependencies (task_id, depends_on_task_id)
      VALUES (?, ?)
    \`);

    const normalizedDependsOnTaskIds = this.normalizeDependencyIds(input.dependsOnTaskIds);
    if (normalizedDependsOnTaskIds.length > 0) {
      const sprintTasks = this.listTasks(projectId, input.sprintId);
      validateTaskDependencies(id, input.sprintId, normalizedDependsOnTaskIds, sprintTasks);
    }`;

const createTaskReplace = `    const sprintTasks = this.listTasks(projectId, input.sprintId);
    let normalizedDependsOnTaskIds: string[] = [];
    if (input.dependsOnTaskIds) {
      normalizedDependsOnTaskIds = this.taskWriteStore.normalizeDependencyIds(
        input.dependsOnTaskIds,
        (taskId) => this.requireTask(taskId)
      );
      if (normalizedDependsOnTaskIds.length > 0) {
        validateTaskDependencies(id, input.sprintId, normalizedDependsOnTaskIds, sprintTasks);
      }
    }`;

code = code.replace(createTaskSearch, createTaskReplace);

const createTaskTxSearch = `      for (const dependencyId of normalizedDependsOnTaskIds) {
        insertDependency.run(id, dependencyId);
      }`;
const createTaskTxReplace = `      this.taskWriteStore.saveDependencies(
        id,
        input.sprintId,
        normalizedDependsOnTaskIds,
        sprintTasks,
        (taskId) => this.requireTask(taskId),
        false
      );`;
code = code.replace(createTaskTxSearch, createTaskTxReplace);


// 5. updateTask
const updateTaskSearch = `    const nextDependsOnTaskIds = input.dependsOnTaskIds
      ? this.normalizeDependencyIds(input.dependsOnTaskIds)
      : current.dependsOnTaskIds;
    const dependenciesChanged = input.dependsOnTaskIds !== undefined
      && !sameStringArray(nextDependsOnTaskIds, current.dependsOnTaskIds);

    if (dependenciesChanged) {
      const sprintTasks = this.listTasks(current.projectId, current.sprintId);
      validateTaskDependencies(taskId, current.sprintId, nextDependsOnTaskIds, sprintTasks);
    }`;
const updateTaskReplace = `    const sprintTasks = this.listTasks(current.projectId, current.sprintId);
    const nextDependsOnTaskIds = input.dependsOnTaskIds
      ? this.taskWriteStore.normalizeDependencyIds(input.dependsOnTaskIds, (tId) => this.requireTask(tId))
      : current.dependsOnTaskIds;
    const dependenciesChanged = input.dependsOnTaskIds !== undefined
      && !sameStringArray(nextDependsOnTaskIds, current.dependsOnTaskIds);

    if (dependenciesChanged && nextDependsOnTaskIds.length > 0) {
      validateTaskDependencies(taskId, current.sprintId, nextDependsOnTaskIds, sprintTasks);
    }`;
code = code.replace(updateTaskSearch, updateTaskReplace);

const updateTaskTxSearch = `      if (input.dependsOnTaskIds) {
        deleteDependencies.run(taskId);
        for (const dependencyId of nextDependsOnTaskIds) {
          insertDependency.run(taskId, dependencyId);
        }
      }`;
const updateTaskTxReplace = `      if (input.dependsOnTaskIds !== undefined) {
        this.taskWriteStore.saveDependencies(
          taskId,
          current.sprintId,
          nextDependsOnTaskIds,
          sprintTasks,
          (tId) => this.requireTask(tId),
          true
        );
      }`;
code = code.replace(updateTaskTxSearch, updateTaskTxReplace);

const updateTaskDelDepSearch = `    const deleteDependencies = this.db.prepare(\`DELETE FROM task_dependencies WHERE task_id = ?\`);
    const insertDependency = this.db.prepare(\`
      INSERT INTO task_dependencies (task_id, depends_on_task_id)
      VALUES (?, ?)
    \`);`;
code = code.replace(updateTaskDelDepSearch, '');

// 6. remove normalizeDependencyIds
const normDepSearch = /  private normalizeDependencyIds\(dependencyIds: string\[\] \| undefined\): string\[\] \{[\s\S]*?return output;\s+?\}/;
code = code.replace(normDepSearch, '');

fs.writeFileSync(path, code);
console.log('updated');
