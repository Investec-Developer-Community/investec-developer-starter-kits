import assert from 'node:assert/strict';
import test from 'node:test';
import { accountStatus, purchaseScenarios, runMappingChecks, runScenarioChecks, zarToCents } from '../data/api-mappings.ts';

test('all displayed offline fixture checks pass', () => {
  for (const check of runMappingChecks()) assert.equal(check.passed, true, check.label);
});
test('ZAR decimal conversion is exact, bounded and rejects ambiguous input', () => {
  for (const [input, expected] of [['123.45', '12345'], ['1.1', '110'], ['0.29', '29'], ['00.01', '1'], ['90071992547409.91', '9007199254740991']]) {
    assert.equal(zarToCents(input), expected);
  }
  for (const invalid of ['', 'NaN', 'Infinity', '1e3', '1.005', '-0.01', ' 1', '1,000', '90071992547409.92']) {
    assert.throws(() => zarToCents(invalid), undefined, invalid);
  }
});
test('account status does not confuse authorisation with posting', () => {
  assert.equal(accountStatus('POSTED'), 'posted');
  assert.equal(accountStatus('PENDING'), 'pending');
  for (const invalid of ['approved', 'DECLINED', 'posted', '']) assert.throws(() => accountStatus(invalid));
});

test('all displayed scenario checks pass repeatedly without mutating fixtures', () => {
  const before = JSON.stringify(purchaseScenarios);
  for (let run = 0; run < 2; run++) {
    const checks = runScenarioChecks();
    assert.equal(checks.length, 6);
    for (const check of checks) assert.equal(check.passed, true, check.label);
  }
  assert.equal(JSON.stringify(purchaseScenarios), before);
});

test('independent scenarios preserve status, direction and account monetary units', () => {
  assert.deepEqual(purchaseScenarios.map(({ transaction: t }) => [t.status, t.type, t.amount]), [
    ['PENDING', 'DEBIT', 84.50], ['POSTED', 'DEBIT', 219.90], ['POSTED', 'CREDIT', 65],
  ]);
  assert.equal(new Set(purchaseScenarios.map(s => s.transaction.accountId)).size, 3);
  assert.equal('uuid' in purchaseScenarios[0].transaction, false);
  assert.equal('postingDate' in purchaseScenarios[0].transaction, false);
});
