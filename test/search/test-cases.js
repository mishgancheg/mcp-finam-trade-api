/**
 * Shared test cases for instrument search
 * Used by all search tests (direct, stdio, http)
 */
import fs from 'fs';
import path from 'path';
import { projectRoot } from '../../dist/src/init-config.js';

export const TEST_SEARCHES = [
  { query: 'YDEX', description: 'Exact ticker match' },
  { query: 'LQDT@MISX', description: 'Exact symbol match' },
  { query: 'RU000A1014L8', description: 'Exact ISIN match' },
  { query: '3728099', description: 'Exact ID match' },
  { query: 'INVALIDXYZ', description: 'Non-existent instrument' },
];

export const getOutputDir = (dir) => path.join(projectRoot, `_test-data/search/${dir}`);

/**
 * Save test result to markdown file
 */
export function saveResult (testCase, result, success, OUTPUT_DIR) {
  // Create results directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate filename from query
  const filename = testCase.query.replace(/[^a-zA-Z0-9А-Яа-я]/g, '_') + '.md';
  const filepath = path.join(OUTPUT_DIR, filename);

  // Format result
  const markdown = `# Search Test: ${testCase.description}

## Query
\`\`\`
${testCase.query}
\`\`\`

## Status
${success ? '✅ SUCCESS' : '❌ FAILED'}

## Result
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\`

## Timestamp
${new Date().toISOString()}
`;

  fs.writeFileSync(filepath, markdown);
}
