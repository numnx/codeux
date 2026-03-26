with open('dashboard/src/v2/ProjectsPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
'''            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}''',
'''            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}'''
)

with open('dashboard/src/v2/ProjectsPage.tsx', 'w') as f:
    f.write(content)
