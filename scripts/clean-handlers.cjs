const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'tasks', 'TeacherTasksPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = '  const handleOpenSubmitModal = (item: TeacherTaskItem) => {';
const endMarker = '  const renderPriorityBadge = (priority: TaskPriority) => {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `  const handleOpenSubmitModal = (item: TeacherTaskItem) => {
    setSelectedTask(item)
  }

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully simplified handleOpenSubmitModal!');
