const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'dashboard/src/v2/components/ui/AddTaskModal.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Update handleSubmit to do manual validation correctly
content = content.replace(
  /const handleSubmit = async \(event: Event\) => {\n\s*event\.preventDefault\(\);\n\s*if \(!title\.trim\(\) \|\| !sprintId\) {\n\s*return;\n\s*}/,
  `const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!sprintId) newErrors.sprintId = "Please select a sprint.";
    if (!title.trim()) newErrors.title = "Title is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});`
);

// We also need to remove the first broken replacement at the very top of the file
content = content.replace(/const handleSubmit = \(event: Event\) => \{[\s\S]*?void onSubmit\(\{/m, '');

fs.writeFileSync(targetPath, content);
console.log('Done AddTaskModal submit');
