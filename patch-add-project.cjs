const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'dashboard/src/v2/components/ui/AddProjectModal.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Add errors state
content = content.replace(
  /const \[cloneDir, setCloneDir\]\s*=\s*useState\(''\);/,
  `const [cloneDir, setCloneDir]   = useState('');\n    const [errors, setErrors]       = useState<Record<string, string>>({});`
);

// Update handleSubmit
content = content.replace(
  /const handleSubmit = \(e: Event\) => \{\n\s*e\.preventDefault\(\);\n\s*const path = sourceType === 'local' \? localPath\.trim\(\) : gitUrl\.trim\(\);\n\s*if \(!name\.trim\(\) \|\| !path\) return;\n\s*onAdd\(\{/,
  `const handleSubmit = (e: Event) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        const path = sourceType === 'local' ? localPath.trim() : gitUrl.trim();

        if (!name.trim()) newErrors.name = "Project name is required.";
        if (sourceType === 'local' && !localPath.trim()) newErrors.localPath = "Directory path is required.";
        if (sourceType === 'git' && !gitUrl.trim()) newErrors.gitUrl = "Repository URL is required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onAdd({`
);

// Update Name input
content = content.replace(
  /onInput=\{\(e\) => setName\(\(e\.target as HTMLInputElement\)\.value\)\}\s*placeholder="My Awesome Project"\s*className="mt-2\.5 w-full bg-transparent border-0 border-b-2 border-black\/\[0\.08\] dark:border-white\/\[0\.08\] focus:border-ember-500 dark:focus:border-ember-500 pb-2\.5 text-\[1\.6rem\] font-black text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-700 focus:outline-none transition-colors font-display tracking-tight leading-none"\s*required/m,
  `id="name"
                                    onInput={(e) => { setName((e.target as HTMLInputElement).value); setErrors(prev => ({...prev, name: ''})); }}
                                    placeholder="My Awesome Project"
                                    className={\`mt-2.5 w-full bg-transparent border-0 border-b-2 pb-2.5 text-[1.6rem] font-black text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-700 focus:outline-none transition-colors font-display tracking-tight leading-none \${errors.name ? 'border-status-red focus:border-status-red' : 'border-black/[0.08] dark:border-white/[0.08] focus:border-ember-500 dark:focus:border-ember-500'}\`}
                                    aria-invalid={!!errors.name}
                                    aria-describedby={errors.name ? "name-error" : undefined}`
);

// Add error message for Name
content = content.replace(
  /autoFocus\s*\/>\s*<\/div>/m,
  `autoFocus
                                />
                                {errors.name && (
                                    <p id="name-error" className="mt-2 text-xs text-status-red font-medium flex items-center gap-1">
                                        <X className="w-3 h-3" /> {errors.name}
                                    </p>
                                )}
                            </div>`
);

// Update local path input
content = content.replace(
  /onInput=\{\(e\) => setLocalPath\(\(e\.target as HTMLInputElement\)\.value\)\}\s*placeholder="\/home\/user\/projects\/my-project"\s*className="mt-2\.5 w-full bg-transparent border-0 border-b-2 border-black\/\[0\.08\] dark:border-white\/\[0\.08\] focus:border-ember-500 dark:focus:border-ember-500 pb-2\.5 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none transition-colors"\s*required/m,
  `id="localPath"
                                        onInput={(e) => { setLocalPath((e.target as HTMLInputElement).value); setErrors(prev => ({...prev, localPath: ''})); }}
                                        placeholder="/home/user/projects/my-project"
                                        className={\`mt-2.5 w-full bg-transparent border-0 border-b-2 pb-2.5 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none transition-colors \${errors.localPath ? 'border-status-red focus:border-status-red' : 'border-black/[0.08] dark:border-white/[0.08] focus:border-ember-500 dark:focus:border-ember-500'}\`}
                                        aria-invalid={!!errors.localPath}
                                        aria-describedby={errors.localPath ? "localPath-error" : undefined}`
);

// Add error message for local path
content = content.replace(
  /aria-describedby=\{errors\.localPath \? "localPath-error" : undefined\}\s*\/>\s*<\/div>/m,
  `aria-describedby={errors.localPath ? "localPath-error" : undefined}
                                    />
                                    {errors.localPath && (
                                        <p id="localPath-error" className="mt-2 text-xs text-status-red font-medium flex items-center gap-1">
                                            <X className="w-3 h-3" /> {errors.localPath}
                                        </p>
                                    )}
                                </div>`
);

// Update git URL input
content = content.replace(
  /onInput=\{\(e\) => setGitUrl\(\(e\.target as HTMLInputElement\)\.value\)\}\s*placeholder="https:\/\/github\.com\/user\/repo\.git"\s*className="mt-2\.5 w-full bg-transparent border-0 border-b-2 border-black\/\[0\.08\] dark:border-white\/\[0\.08\] focus:border-ember-500 dark:focus:border-ember-500 pb-2\.5 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none transition-colors"\s*required/m,
  `id="gitUrl"
                                            onInput={(e) => { setGitUrl((e.target as HTMLInputElement).value); setErrors(prev => ({...prev, gitUrl: ''})); }}
                                            placeholder="https://github.com/user/repo.git"
                                            className={\`mt-2.5 w-full bg-transparent border-0 border-b-2 pb-2.5 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none transition-colors \${errors.gitUrl ? 'border-status-red focus:border-status-red' : 'border-black/[0.08] dark:border-white/[0.08] focus:border-ember-500 dark:focus:border-ember-500'}\`}
                                            aria-invalid={!!errors.gitUrl}
                                            aria-describedby={errors.gitUrl ? "gitUrl-error" : undefined}`
);

// Add error message for git URL
content = content.replace(
  /aria-describedby=\{errors\.gitUrl \? "gitUrl-error" : undefined\}\s*\/>\s*<\/div>/m,
  `aria-describedby={errors.gitUrl ? "gitUrl-error" : undefined}
                                        />
                                        {errors.gitUrl && (
                                            <p id="gitUrl-error" className="mt-2 text-xs text-status-red font-medium flex items-center gap-1">
                                                <X className="w-3 h-3" /> {errors.gitUrl}
                                            </p>
                                        )}
                                    </div>`
);

fs.writeFileSync(targetPath, content);
console.log('Done AddProjectModal');
