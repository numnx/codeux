import fs from "fs";

const content = fs.readFileSync("src/contracts/app-types.ts", "utf8");

// Use ts-morph one last time to extract correctly to blocks.json without any hacky parsing
import { Project } from "ts-morph";
const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/contracts/app-types.ts");

const allTypes = [];
for (const [name, declarations] of sourceFile.getExportedDeclarations()) {
    const decl = declarations[0];
    allTypes.push({
        name: name,
        lines: decl.getText().split('\n')
    });
}

fs.writeFileSync("blocks3.json", JSON.stringify(allTypes, null, 2));
console.log("Types extracted using ts-morph:", allTypes.length);
