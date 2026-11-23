// Load the built-in explicitly: older deployment bundlers strip its node: prefix.
import {createRequire} from 'node:module';
import path from 'node:path';
const loadBuiltin=createRequire(path.join(process.cwd(),'roam-runtime.cjs'));
export const DatabaseSync=(loadBuiltin('node:sqlite') as typeof import('node:sqlite')).DatabaseSync;
