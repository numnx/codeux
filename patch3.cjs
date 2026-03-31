const fs = require('fs');
const content = fs.readFileSync('dashboard/src/v2/SettingsPage.tsx', 'utf8');

const search = `  const switchCategory = (categoryId: CategoryId): void => {`;
const replace = `  const switchCategory = useCallback((categoryId: CategoryId): void => {`;

let newContent = content;
newContent = newContent.replace(search, replace);
newContent = newContent.replace(`    });\n  };`, `    });\n  }, [activeCategory]);`);

fs.writeFileSync('dashboard/src/v2/SettingsPage.tsx', newContent);
console.log('Patched');
