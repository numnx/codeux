with open('dashboard/src/v2/ProjectsPage.tsx', 'r') as f:
    content = f.read()

# Replace <FolderOpen ... />
content = content.replace(
    '<FolderOpen className="w-3.5 h-3.5" strokeWidth={2.5} />',
    '<FolderOpen aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.5} />'
)
content = content.replace(
    '<FolderOpen className="w-3 h-3" strokeWidth={2} />',
    '<FolderOpen aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)
content = content.replace(
    '<FolderOpen className="w-5 h-5 text-ember-600 dark:text-ember-400" strokeWidth={1.75} />',
    '<FolderOpen aria-hidden="true" className="w-5 h-5 text-ember-600 dark:text-ember-400" strokeWidth={1.75} />'
)

# Replace <Plus ... />
content = content.replace(
    '<Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />',
    '<Plus aria-hidden="true" className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />'
)
content = content.replace(
    '''<Plus
                className="w-6 h-6 text-ember-500/40 group-hover:text-ember-500
                           group-hover:rotate-90 transition-all duration-400 relative z-10"
                strokeWidth={2}
            />''',
    '''<Plus
                aria-hidden="true"
                className="w-6 h-6 text-ember-500/40 group-hover:text-ember-500
                           group-hover:rotate-90 transition-all duration-400 relative z-10"
                strokeWidth={2}
            />'''
)

# Replace inner buttons icons in ProjectCard
content = content.replace(
    '<ExternalLink className="w-3 h-3" strokeWidth={2} />',
    '<ExternalLink aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)
content = content.replace(
    '<Settings className="w-3 h-3" strokeWidth={2} />',
    '<Settings aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)
content = content.replace(
    '<Trash2 className="w-3 h-3" strokeWidth={2} />',
    '<Trash2 aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)

with open('dashboard/src/v2/ProjectsPage.tsx', 'w') as f:
    f.write(content)

with open('dashboard/src/v2/LiveSessionPage.tsx', 'r') as f:
    content = f.read()

# LiveSessionPage Icons
content = content.replace(
    '<Zap className="w-4 h-4 shrink-0" strokeWidth={2} />',
    '<Zap aria-hidden="true" className="w-4 h-4 shrink-0" strokeWidth={2} />'
)
content = content.replace(
    '<Radio className="w-3.5 h-3.5 text-status-red" strokeWidth={2.5} />',
    '<Radio aria-hidden="true" className="w-3.5 h-3.5 text-status-red" strokeWidth={2.5} />'
)
content = content.replace(
    '<BarChart3 className="w-3 h-3" strokeWidth={2} />',
    '<BarChart3 aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)
content = content.replace(
    '<Ship className="w-3 h-3" strokeWidth={2} />',
    '<Ship aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)
content = content.replace(
    '<Workflow className="w-3 h-3" strokeWidth={2} />',
    '<Workflow aria-hidden="true" className="w-3 h-3" strokeWidth={2} />'
)
content = content.replace(
    '<AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.2} />',
    '<AlertTriangle aria-hidden="true" className="w-3.5 h-3.5" strokeWidth={2.2} />'
)
content = content.replace(
    '<Play className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" strokeWidth={1} />',
    '<Play aria-hidden="true" className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" strokeWidth={1} />'
)

with open('dashboard/src/v2/LiveSessionPage.tsx', 'w') as f:
    f.write(content)
