const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'dashboard/src/v2/components/ui/SprintComposer.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Add errors state
content = content.replace(
  /const \[submitError, setSubmitError\] = useState<string \| null>\(null\);/,
  `const [submitError, setSubmitError] = useState<string | null>(null);\n  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});`
);

// Update handleSubmit
content = content.replace(
  /const handleSubmit = async \(event: Event\) => \{\n\s*event\.preventDefault\(\);\n\s*if \(!state\.name\.trim\(\)\) \{\n\s*return;\n\s*\}/,
  `const handleSubmit = async (event: Event) => {
    event.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!state.name.trim()) newErrors.name = "Sprint name is required.";
    if (!state.goal.trim()) newErrors.goal = "Sprint prompt is required.";

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});`
);

// Update sprint name
content = content.replace(
  /onInput=\{\(event\) => state\.setName\(\(event\.target as HTMLInputElement\)\.value\)\}\s*placeholder="Runtime hardening"\s*className="w-full border-0 border-b-2 border-black\/\[0\.08\] bg-transparent pb-3 font-display text-\[1\.65rem\] font-black leading-none tracking-tight text-slate-900 outline-none transition-colors placeholder:text-slate-200 focus:border-signal-500 dark:border-white\/\[0\.08\] dark:text-white dark:placeholder:text-slate-700 sm:text-\[1\.9rem\]"\s*required/m,
  `id="name"
              onInput={(event) => { state.setName((event.target as HTMLInputElement).value); setFieldErrors(prev => ({...prev, name: ''})); }}
              placeholder="Runtime hardening"
              className={\`w-full border-0 border-b-2 bg-transparent pb-3 font-display text-[1.65rem] font-black leading-none tracking-tight text-slate-900 outline-none transition-colors placeholder:text-slate-200 dark:text-white dark:placeholder:text-slate-700 sm:text-[1.9rem] \${fieldErrors.name ? 'border-status-red focus:border-status-red' : 'border-black/[0.08] dark:border-white/[0.08] focus:border-signal-500'}\`}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}`
);

// Add error message for sprint name
content = content.replace(
  /autoFocus\s*\/>/m,
  `autoFocus
            />
            {fieldErrors.name && (
              <p id="name-error" className="mt-2 text-xs text-status-red font-medium flex items-center gap-1">
                <X className="w-3 h-3" /> {fieldErrors.name}
              </p>
            )}`
);

// Update sprint prompt (goal)
content = content.replace(
  /onInput=\{\(event\) => state\.setGoal\(\(event\.target as HTMLTextAreaElement\)\.value\)\}\s*placeholder="Describe the outcome, affected systems, and what done looks like when this sprint lands\."\s*className="min-h-\[220px\] w-full resize-none rounded-\[1\.7rem\] bg-transparent px-4 py-4 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-600 sm:min-h-\[260px\] sm:px-5"/m,
  `id="goal"
                  onInput={(event) => { state.setGoal((event.target as HTMLTextAreaElement).value); setFieldErrors(prev => ({...prev, goal: ''})); }}
                  placeholder="Describe the outcome, affected systems, and what done looks like when this sprint lands."
                  className={\`min-h-[220px] w-full resize-none rounded-[1.7rem] bg-transparent px-4 py-4 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-600 sm:min-h-[260px] sm:px-5 border \${fieldErrors.goal ? 'border-status-red focus:border-status-red' : 'border-transparent focus:border-signal-500/20'}\`}
                  aria-invalid={!!fieldErrors.goal}
                  aria-describedby={fieldErrors.goal ? "goal-error" : undefined}`
);

// Add error message for sprint prompt
content = content.replace(
  /aria-describedby=\{fieldErrors\.goal \? "goal-error" : undefined\}\s*\/>\s*<\/div>/m,
  `aria-describedby={fieldErrors.goal ? "goal-error" : undefined}
                />
              </div>
              {fieldErrors.goal && (
                <p id="goal-error" className="mt-2 text-xs text-status-red font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> {fieldErrors.goal}
                </p>
              )}`
);

fs.writeFileSync(targetPath, content);
console.log('Done SprintComposer');
