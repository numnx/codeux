import { Project } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/contracts/**/*.ts");

const appTypesExports = new Set();
const fileExportsMap = new Map();

for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (filePath.includes("app-types.ts")) continue;

    const fileName = sourceFile.getBaseName();
    const moduleSpecifier = `./${fileName.replace(".ts", ".js")}`;

    const exportedDeclarations = sourceFile.getExportedDeclarations();
    exportedDeclarations.forEach((_, name) => {
        fileExportsMap.set(name, moduleSpecifier);
    });
}

fileExportsMap.set("InstructionTemplateId", "../instructions/instruction-template-catalog.js");
fileExportsMap.set("ProviderInvocationPurpose", "./execution-types.js");
fileExportsMap.set("TokenUsageSource", "./execution-types.js");
fileExportsMap.set("MemorySettings", "./memory-types.js");
fileExportsMap.set("DashboardRealtimeScopeType", "./realtime-types.js");
fileExportsMap.set("Subtask", "./subtask-types.js");
fileExportsMap.set("SubtaskStatus", "./subtask-types.js");
fileExportsMap.set("SubtaskMergeIndicator", "./subtask-types.js");
fileExportsMap.set("ProviderId", "./provider-types.js");


for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (filePath.includes("app-types.ts")) continue;

    const missingImports = new Map(); // moduleSpecifier -> Set of names

    // Find all referenced identifiers
    sourceFile.forEachDescendant(node => {
        if (node.getKindName() === "Identifier") {
            const name = node.getText();

            // Avoid adding own exports
            if (sourceFile.getExportedDeclarations().has(name)) return;

            // Only add if it's a known type from our map
            if (fileExportsMap.has(name)) {
                const specifier = fileExportsMap.get(name);

                // Don't import from self
                if (specifier === `./${sourceFile.getBaseName().replace(".ts", ".js")}`) return;

                if (!missingImports.has(specifier)) {
                    missingImports.set(specifier, new Set());
                }
                missingImports.get(specifier).add(name);
            }
        }
    });

    // Add imports
    for (const [specifier, names] of missingImports.entries()) {
        sourceFile.addImportDeclaration({
            moduleSpecifier: specifier,
            namedImports: Array.from(names),
            isTypeOnly: true // Types only
        });
    }

    sourceFile.saveSync();
}

console.log("Imports fixed.");
