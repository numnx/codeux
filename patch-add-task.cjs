const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'dashboard/src/v2/components/ui/AddTaskModal.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Add state for form errors
content = content.replace(
  /const \[dependsOnTaskIds, setDependsOnTaskIds\] = useState<string\[\]>\(initialTask\?\.dependsOnTaskIds \|\| \[\]\);/,
  `const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>(initialTask?.dependsOnTaskIds || []);\n  const [errors, setErrors] = useState<Record<string, string>>({});`
);

// Update handleSubmit to do manual validation
content = content.replace(
  /const handleSubmit = \(event: Event\) => {\n\s*event\.preventDefault\(\);\n\s*if \(!sprintId || !title\.trim\(\)\) return;\n\s*void onSubmit\({/,
  `const handleSubmit = (event: Event) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!sprintId) newErrors.sprintId = "Please select a sprint.";
    if (!title.trim()) newErrors.title = "Title is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    void onSubmit({`
);

// Update sprint select field
content = content.replace(
  /<select\s+value=\{sprintId\}\s+onInput=\{\(event\) => setSprintId\(\(event\.target as HTMLSelectElement\)\.value\)\}\s+className="mt-2.5 w-full rounded-2xl bg-black\/\[0.03\] dark:bg-white\/\[0.03\] border border-black\/\[0.08\] dark:border-white\/\[0.08\] px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-signal-500"\s+required\s+>/m,
  `<select
                  id="sprintId"
                  value={sprintId}
                  onInput={(event) => { setSprintId((event.target as HTMLSelectElement).value); setErrors(prev => ({...prev, sprintId: ''})); }}
                  className={\`mt-2.5 w-full rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-signal-500 \${errors.sprintId ? 'border-status-red focus:border-status-red' : 'border-black/[0.08] dark:border-white/[0.08]'}\`}
                  aria-invalid={!!errors.sprintId}
                  aria-describedby={errors.sprintId ? "sprintId-error" : undefined}
                >`
);
// Also remove the standalone 'required' keyword that might be left behind due to the replace
content = content.replace(/className="[^"]*border-status-red[^>]*>\s*<option/m, function(match) {
  return match.replace(/required/, '');
});

// Update title input field
content = content.replace(
  /<input\s+type="text"\s+value=\{title\}\s+onInput=\{\(event\) => setTitle\(\(event\.target as HTMLInputElement\)\.value\)\}\s+className="mt-2.5 w-full rounded-2xl bg-black\/\[0.03\] dark:bg-white\/\[0.03\] border border-black\/\[0.08\] dark:border-white\/\[0.08\] px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-signal-500"\s+placeholder="Define the task scope"\s+required\s+\/>/m,
  `<input
                  id="title"
                  type="text"
                  value={title}
                  onInput={(event) => { setTitle((event.target as HTMLInputElement).value); setErrors(prev => ({...prev, title: ''})); }}
                  className={\`mt-2.5 w-full rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-signal-500 \${errors.title ? 'border-status-red focus:border-status-red' : 'border-black/[0.08] dark:border-white/[0.08]'}\`}
                  placeholder="Define the task scope"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "title-error" : undefined}
                />`
);

// Add error messages below the select
content = content.replace(
  /<\/select>/,
  `</select>
                {errors.sprintId && (
                  <p id="sprintId-error" className="mt-1.5 text-xs text-status-red font-medium flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.sprintId}
                  </p>
                )}`
);

// Add error messages below the title
content = content.replace(
  /aria-describedby=\{errors\.title \? "title-error" : undefined\}\s+\/>/,
  `aria-describedby={errors.title ? "title-error" : undefined}
                />
                {errors.title && (
                  <p id="title-error" className="mt-1.5 text-xs text-status-red font-medium flex items-center gap-1">
                    <X className="w-3 h-3" /> {errors.title}
                  </p>
                )}`
);


fs.writeFileSync(targetPath, content);
console.log('Done AddTaskModal');
