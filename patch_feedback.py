with open('dashboard/src/v2/ProjectsPage.tsx', 'r') as f:
    content = f.read()

# Add aria-label to main
content = content.replace(
    '<main\n                ref={mainRef}\n                className="max-w-[1920px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-16 relative z-10"\n            >',
    '<main\n                aria-label="Manage Projects"\n                ref={mainRef}\n                className="max-w-[1920px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-16 relative z-10"\n            >'
)

# Add aria-label to ProjectCard
content = content.replace(
    '''        <div
            role="button"
            tabIndex={0}
            ref={cardRef}''',
    '''        <div
            role="button"
            tabIndex={0}
            aria-label={`Open project ${source.name}`}
            ref={cardRef}'''
)

with open('dashboard/src/v2/ProjectsPage.tsx', 'w') as f:
    f.write(content)

with open('dashboard/src/v2/LiveSessionPage.tsx', 'r') as f:
    content = f.read()

# Add aria-label to main
content = content.replace(
    '<main className="max-w-[2400px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-16 relative z-10">',
    '<main aria-label="Live Session Pipeline" className="max-w-[2400px] mx-auto px-8 md:px-20 py-24 flex flex-col gap-16 relative z-10">'
)

with open('dashboard/src/v2/LiveSessionPage.tsx', 'w') as f:
    f.write(content)
