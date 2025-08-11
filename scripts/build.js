// Tiny concat build to keep a single distributable without a bundler
// This preserves the existing public API and file name.

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const distFile = path.join(root, 'gm-booking-widget-standalone.js');

// For now we only validate presence of modules; the monolith still holds logic.
function run() {
  // No-op build placeholder. In the next steps we can wire actual concat once
  // portions of the monolith are replaced by calls into window.GM* namespaces.
  console.log('Build placeholder: monolith remains the entrypoint.');
}

run();


