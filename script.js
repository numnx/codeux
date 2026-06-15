import { Project } from "ts-morph";
import fs from "fs";

const project = new Project();
project.addSourceFilesAtPaths("src/contracts/app-types.ts");
const sourceFile = project.getSourceFileOrThrow("src/contracts/app-types.ts");

const exportedDeclarations = sourceFile.getExportedDeclarations();

console.log("Number of exported types/interfaces: " + exportedDeclarations.size);

const declarations = [];

exportedDeclarations.forEach((declarationsArray, name) => {
    const decl = declarationsArray[0];
    declarations.push({
        name,
        kind: decl.getKindName(),
        text: decl.getText(),
        startLine: decl.getStartLineNumber(),
        endLine: decl.getEndLineNumber()
    });
});

fs.writeFileSync("declarations.json", JSON.stringify(declarations, null, 2));

console.log("Declarations saved to declarations.json");
