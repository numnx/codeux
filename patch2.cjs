const fs = require('fs');
const content = fs.readFileSync('dashboard/src/v2/SettingsPage.tsx', 'utf8');
const search1 = `  const handleImportHints = async (): Promise<void> => {`;
const replace1 = `  const handleImportHints = useCallback(async (): Promise<void> => {`;

const search2 = `  const handleSave = async (): Promise<void> => {`;
const replace2 = `  const handleSave = useCallback(async (): Promise<void> => {`;

const search3 = `  const handleResetProject = async (): Promise<void> => {`;
const replace3 = `  const handleResetProject = useCallback(async (): Promise<void> => {`;

const search4 = `  const handleDeleteProject = async (): Promise<void> => {`;
const replace4 = `  const handleDeleteProject = useCallback(async (): Promise<void> => {`;

const search5 = `  const handleResetDatabase = async (): Promise<void> => {`;
const replace5 = `  const handleResetDatabase = useCallback(async (): Promise<void> => {`;

let newContent = content;
newContent = newContent.replace(search1, replace1);
newContent = newContent.replace(`    } finally {\n      setImportingHints(false);\n    }\n  };`, `    } finally {\n      setImportingHints(false);\n    }\n  }, [systemSettings]);`);

newContent = newContent.replace(search2, replace2);
newContent = newContent.replace(`    } finally {\n      setSavingProject(false);\n    }\n  };`, `    } finally {\n      setSavingProject(false);\n    }\n  }, [activeScope, systemSettings, selectedProject, projectSettings]);`);

newContent = newContent.replace(search3, replace3);
newContent = newContent.replace(`    } finally {\n      setResettingProject(false);\n    }\n  };`, `    } finally {\n      setResettingProject(false);\n    }\n  }, [selectedProject]);`);

newContent = newContent.replace(search4, replace4);
newContent = newContent.replace(`    } finally {\n      setDeletingProject(false);\n    }\n  };`, `    } finally {\n      setDeletingProject(false);\n    }\n  }, [selectedProject, deleteProject]);`);

newContent = newContent.replace(search5, replace5);
newContent = newContent.replace(`    } finally {\n      setResettingDatabase(false);\n    }\n  };`, `    } finally {\n      setResettingDatabase(false);\n    }\n  }, [loadSettings]);`);

fs.writeFileSync('dashboard/src/v2/SettingsPage.tsx', newContent);
console.log('Patched');
