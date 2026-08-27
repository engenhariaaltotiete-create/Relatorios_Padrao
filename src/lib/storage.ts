import type { AnyReport } from '../types';
import { normalizeAnyReport } from './helpers';

const DB_NAME = 'relatorio-servicos-nao-vinculados';
const STORE = 'reports';
const FALLBACK_KEY = 'rsnv_reports_fallback_v1';
let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const request = indexedDB.open(DB_NAME);
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir armazenamento local'));
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode); const req = action(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}

function fallbackRead(): AnyReport[] {
  try { const parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]'); return Array.isArray(parsed) ? parsed.map(normalizeAnyReport) : []; }
  catch { return []; }
}
function fallbackWrite(reports: AnyReport[]) { localStorage.setItem(FALLBACK_KEY, JSON.stringify(reports)); }

export const reportStorage = {
  async all(): Promise<AnyReport[]> {
    try { const rows = await run<any[]>('readonly', (store) => store.getAll()); return (rows || []).map(normalizeAnyReport); }
    catch (error) { console.warn('IndexedDB indisponível. Usando armazenamento alternativo.', error); return fallbackRead(); }
  },
  async get(id: string): Promise<AnyReport | null> {
    try { const row = await run<any>('readonly', (store) => store.get(id)); return row ? normalizeAnyReport(row) : null; }
    catch { return fallbackRead().find((r) => r.id === id) || null; }
  },
  async put(report: AnyReport): Promise<void> {
    report.updatedAt = new Date().toISOString();
    try { await run('readwrite', (store) => store.put(report)); }
    catch (error) { console.warn('Falha no IndexedDB; gravando no modo alternativo.', error); const rows = fallbackRead().filter((r) => r.id !== report.id); rows.push(report); fallbackWrite(rows); }
  },
  async remove(id: string): Promise<void> {
    try { await run('readwrite', (store) => store.delete(id)); }
    catch { fallbackWrite(fallbackRead().filter((r) => r.id !== id)); }
  },
};
