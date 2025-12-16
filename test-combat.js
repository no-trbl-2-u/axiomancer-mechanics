#!/usr/bin/env node

const { spawn } = require('child_process');

// Spawn the combat CLI
const combat = spawn('npm', ['run', 'combat'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';

combat.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);

  // When we see the first prompt, select Body (option 2)
  if (text.includes('Select which part of yourself you choose to respond with') && !output.includes('Body')) {
    setTimeout(() => {
      console.log('\n[Selecting Body - option 2]');
      combat.stdin.write('2\n');
    }, 500);
  }

  // When we see the action prompt, select attack (option 1)
  if (text.includes('Select the action you want to take') && !output.includes('attack')) {
    setTimeout(() => {
      console.log('\n[Selecting attack - option 1]');
      combat.stdin.write('1\n');
    }, 500);
  }
});

combat.stderr.on('data', (data) => {
  process.stderr.write(data);
});

combat.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});
