// index.js
const { spawn } = require('child_process');

// Replace 'path/to/server.js' with the actual path to your 'server.js' file
const serverProcess = spawn('node', ['/server.js']);

serverProcess.stdout.on('data', (data) => {
  console.log(`Server output: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});
