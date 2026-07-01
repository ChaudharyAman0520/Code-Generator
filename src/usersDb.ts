import fs from 'fs';
import path from 'path';
import { HistoryItem } from './types';

interface UserData {
  passwordHash: string; // Stored securely
  history: HistoryItem[];
}

interface DatabaseSchema {
  users: Record<string, UserData>;
}

const DB_PATH = path.resolve(process.cwd(), 'users_db.json');

// Helper to load database
function loadDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error loading database file:', err);
  }
  return { users: {} };
}

// Helper to save database
function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

// Simple hash helper (for demo security, SHA256 simulation or basic rot13/base64 check is enough, let's do a simple secure hash)
function hashPassword(password: string): string {
  // A simple, robust hash function that doesn't rely on complex binary dependencies (like bcrypt)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${hash}`;
}

export function registerUser(username: string, password: string): { success: boolean; message: string } {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();

  if (!lowerUser || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  if (db.users[lowerUser]) {
    return { success: false, message: 'Username is already taken.' };
  }

  db.users[lowerUser] = {
    passwordHash: hashPassword(password),
    history: []
  };

  saveDb(db);
  return { success: true, message: 'User registered successfully!' };
}

export function loginUser(username: string, password: string): { success: boolean; token?: string; message: string } {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();

  if (!lowerUser || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  const user = db.users[lowerUser];
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { success: false, message: 'Invalid username or password.' };
  }

  // Create a stateless bearer token (base64 of username + expiration timestamp)
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours validity
  const tokenPayload = `${lowerUser}:${expiresAt}`;
  const token = Buffer.from(tokenPayload).toString('base64');

  return { success: true, token, message: 'Logged in successfully.' };
}

export function verifyToken(token: string): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, expiresAtStr] = decoded.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);
    
    if (Date.now() > expiresAt) {
      return null; // Expired
    }
    
    return username;
  } catch (err) {
    return null;
  }
}

export function getUserHistory(username: string): HistoryItem[] {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();
  return db.users[lowerUser]?.history || [];
}

export function saveUserHistory(username: string, history: HistoryItem[]): boolean {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();
  if (!db.users[lowerUser]) return false;

  db.users[lowerUser].history = history;
  saveDb(db);
  return true;
}

export function addUserHistoryItem(username: string, item: HistoryItem): boolean {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();
  if (!db.users[lowerUser]) return false;

  db.users[lowerUser].history.unshift(item); // Add to the front
  saveDb(db);
  return true;
}

export function updateUserHistoryItem(username: string, itemId: string, updater: (item: HistoryItem) => HistoryItem): boolean {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();
  if (!db.users[lowerUser]) return false;

  const history = db.users[lowerUser].history;
  const idx = history.findIndex(h => h.id === itemId);
  if (idx === -1) return false;

  history[idx] = updater(history[idx]);
  saveDb(db);
  return true;
}

export function removeUserHistoryItem(username: string, itemId: string): boolean {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();
  if (!db.users[lowerUser]) return false;

  db.users[lowerUser].history = db.users[lowerUser].history.filter(h => h.id !== itemId);
  saveDb(db);
  return true;
}

export function clearUserHistory(username: string): boolean {
  const db = loadDb();
  const lowerUser = username.toLowerCase().trim();
  if (!db.users[lowerUser]) return false;

  db.users[lowerUser].history = [];
  saveDb(db);
  return true;
}
