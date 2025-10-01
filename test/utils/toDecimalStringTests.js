// TypeScript
import { strict as assert } from 'assert';
import { toDecimalString } from '../../dist/src/lib/utils.js';

const cases = [
  [0, '0'],
  [1, '1'],
  [-1, '-1'],
  [10, '10'],
  [1.23, '1.23'],
  [1.2300, '1.23'],
  [-1.2300, '-1.23'],
  [1000.0, '1000'],
  [0.000001, '0.000001'],
  [-0.000001, '-0.000001'],
  [1e-6, '0.000001'],
  [1e-7, '0.0000001'],
  [1.2e-7, '0.00000012'],
  [1e6, '1000000'],
  [1.5e3, '1500'],
  [4041.5, '4041.5'],
  [2.5000000000000004, '2.5'], // типичный артефакт double
];

for (const [input, expected] of cases) {
  const actual = toDecimalString(input);
  assert.equal(actual, expected, `toDecimalString(${input}) -> ${actual}, ожидалось ${expected}`);
}

// Проверка ошибок
const invalid = [Infinity, -Infinity, NaN];
for (const v of invalid) {
  let threw = false;
  try {
    toDecimalString(v);
  } catch {
    threw = true;
  }
  assert.equal(threw, true, `ожидалось исключение для значения: ${String(v)}`);
}

console.log('OK: toDecimalString прошла все тесты');
