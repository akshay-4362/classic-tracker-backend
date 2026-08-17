import { findActiveUsers, type RosterRow } from './roster.repository.js';

export interface RosterEntry {
  id: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

function toRosterEntry(row: RosterRow): RosterEntry {
  return { id: row.id, name: row.name, role: row.role };
}

export async function listRoster(): Promise<RosterEntry[]> {
  const rows = await findActiveUsers();
  return rows.map(toRosterEntry);
}
