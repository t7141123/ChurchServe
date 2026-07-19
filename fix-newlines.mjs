import { readFileSync, writeFileSync } from 'fs';

const sql = readFileSync('seed-icebreakers.sql', 'utf8');
// Replace literal \n (backslash + n) with actual newlines
const fixed = sql.replace(/\\n/g, '\n');
writeFileSync('seed-icebreakers-fixed.sql', fixed);

const sample = fixed.match(/INSERT INTO Icebreakers[^;]+;/);
if (sample) {
  console.log('First 100 chars:', sample[0].substring(0, 100));
  console.log('Contains actual newlines:', sample[0].includes('\n'));
  console.log('Lines in first record:', sample[0].split('\n').length);
}
