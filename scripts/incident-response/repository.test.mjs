import assert from 'node:assert/strict';
import test from 'node:test';
import { assertProjectRemote } from './repository.mjs';

const alias = 'git@github.com-jaem1n207:jaem1n207/bendd.git';

test('canonical remotes do not inspect SSH settings', async () => {
  for (const remote of [
    'https://github.com/jaem1n207/bendd.git',
    'git@github.com:jaem1n207/bendd.git',
  ])
    await assertProjectRemote(remote, () => {
      throw new Error('Unexpected SSH lookup');
    });
});

test('the existing account alias is accepted only when its effective server and user match GitHub', async () => {
  await assertProjectRemote(alias, async () => ({
    hostname: 'github.com',
    user: 'git',
  }));
  for (const connection of [
    { hostname: 'elsewhere.invalid', user: 'git' },
    { hostname: 'github.com', user: 'other-user' },
  ])
    await assert.rejects(
      assertProjectRemote(alias, async () => connection),
      /SSH alias/
    );
});

test('a different repository or unknown SSH alias is rejected before SSH or network operations', async () => {
  for (const remote of [
    'git@github.com-jaem1n207:example/other.git',
    'git@another-alias:jaem1n207/bendd.git',
    'https://elsewhere.invalid/jaem1n207/bendd.git',
  ])
    await assert.rejects(
      assertProjectRemote(remote, () => {
        throw new Error('Unexpected SSH lookup');
      }),
      /Unexpected project remote/
    );
});
