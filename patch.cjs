const fs = require('fs');
const content = fs.readFileSync('dashboard/src/v2/SettingsPage.tsx', 'utf8');
const search = `  const updateSystem = (recipe: (current: SystemSettings) => SystemSettings): void => {
    setSystemSettings((current) => (current ? recipe(current) : current));
  };

  const updateProject = (recipe: (current: ProjectSettings) => ProjectSettings): void => {
    setProjectSettings((current) => (current ? recipe(current) : current));
  };

  const updateEditableSettings = (recipe: (current: ProjectSettings) => ProjectSettings): void => {
    if (activeScope === "system") {
      updateSystem((current) => ({ ...current, defaults: recipe(current.defaults) }));
      return;
    }
    updateProject(recipe);
  };`;

const replace = `  const updateSystem = useCallback((recipe: (current: SystemSettings) => SystemSettings): void => {
    setSystemSettings((current) => (current ? recipe(current) : current));
  }, []);

  const updateProject = useCallback((recipe: (current: ProjectSettings) => ProjectSettings): void => {
    setProjectSettings((current) => (current ? recipe(current) : current));
  }, []);

  const updateEditableSettings = useCallback((recipe: (current: ProjectSettings) => ProjectSettings): void => {
    if (activeScope === "system") {
      updateSystem((current) => ({ ...current, defaults: recipe(current.defaults) }));
      return;
    }
    updateProject(recipe);
  }, [activeScope, updateProject, updateSystem]);`;

if (content.includes(search)) {
  fs.writeFileSync('dashboard/src/v2/SettingsPage.tsx', content.replace(search, replace));
  console.log('Patched');
} else {
  console.log('Search text not found');
}
