import fs from 'fs';

const execFileContent = fs.readFileSync('src/contracts/execution-types.ts', 'utf8');

// I notice the refactor overwrote execution-types.ts because the group name was "execution" -> "execution-types"
// Oh! There is ALREADY a file named execution-types.ts. My refactor script overwrote it!

console.log("execution-types.ts exists?", fs.existsSync('src/contracts/execution-types.ts'));
