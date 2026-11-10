// Prints the README configuration table, generated from common/src/config.ts.
// Usage: npm run config:doc
// common/src/config.test.ts fails when README.md differs from this output.
import { renderConfigTable } from '../common/src/config.ts'

console.info(renderConfigTable())
