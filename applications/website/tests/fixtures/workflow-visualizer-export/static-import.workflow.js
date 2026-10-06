export const meta = {
  name: 'imports-a-module',
  description: 'Reads a file through a static import, which a function body cannot hold',
};

import { readFileSync } from 'node:fs';

return readFileSync('package.json', 'utf8').length;
