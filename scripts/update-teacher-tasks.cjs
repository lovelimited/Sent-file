const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'tasks', 'TeacherTasksPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace old submit modal
const startMarker = '{/* ===================================================================== */}\n      {/* Modal: Submit Task';
const endMarker = '      {/* Printable Task Slip Modal */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found! startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

const replacement = `{/* ===================================================================== */}
      {/* Modal: Quick Submit Subtasks & Google Drive */}
      {/* ===================================================================== */}
      {selectedTask && (
        <QuickSubmitModal
          isOpen={!!selectedTask}
          initialTaskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onSubmitted={() => {
            loadTasks();
          }}
        />
      )}

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated TeacherTasksPage.tsx!');
