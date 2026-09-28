import fs from 'fs';
import path from 'path';
import { 
  User, 
  RegisteredItem, 
  FoundReport, 
  MatchRecord, 
  VerificationAttempt, 
  RecoveryRecord, 
  RewardRecord 
} from '@/types';

export interface KhojDatabase {
  users: User[];
  items: RegisteredItem[];
  found_reports: FoundReport[];
  matches: MatchRecord[];
  verification: VerificationAttempt[];
  recovery: RecoveryRecord[];
  rewards: RewardRecord[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'khoj_database.json');

const INITIAL_DB: KhojDatabase = {
  users: [
    { id: 'usr-1', college_email: 'student@campus.edu', name: 'Campus Student', created_at: '2026-09-28T00:00:00Z' },
  ],
  items: [],
  found_reports: [],
  matches: [],
  verification: [],
  recovery: [],
  rewards: [],
};

export function getDatabase(): KhojDatabase {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return INITIAL_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return INITIAL_DB;
  }
}

export function saveDatabase(db: KhojDatabase): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

export function resetDatabase(): KhojDatabase {
  saveDatabase(INITIAL_DB);
  return INITIAL_DB;
}
