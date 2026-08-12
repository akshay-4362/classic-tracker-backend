import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { downFileFor, listMigrationFiles } from './run-migrations.js';

describe('listMigrationFiles', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('lists .sql files in sorted order and excludes .down.sql files', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'migrations-'));
    writeFileSync(path.join(dir, '0002_b.sql'), 'SELECT 1;');
    writeFileSync(path.join(dir, '0001_a.sql'), 'SELECT 1;');
    writeFileSync(path.join(dir, '0001_a.down.sql'), 'SELECT 1;');

    expect(listMigrationFiles(dir)).toEqual(['0001_a.sql', '0002_b.sql']);
  });
});

describe('downFileFor', () => {
  it('maps an up migration filename to its down migration filename', () => {
    expect(downFileFor('0002_create_users.sql')).toBe('0002_create_users.down.sql');
  });
});
