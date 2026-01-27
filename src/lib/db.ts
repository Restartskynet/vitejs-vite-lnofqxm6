import type {
    PersistedData,
    PersistedFill,
    PersistedSettings,
    PersistedAdjustment,
    ImportHistoryEntry,
    CURRENT_SCHEMA_VERSION,
  } from '../types/importHistory';
  import { CURRENT_SCHEMA_VERSION as SCHEMA_VERSION } from '../types/importHistory';
  
  const DB_NAME = 'RestartRiskDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'appData';
  const DATA_KEY = 'persistedState';
  
  /**
   * Open IndexedDB connection
   */
  function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  
  /**
   * Get persisted data from IndexedDB
   */
  export async function loadPersistedData(): Promise<PersistedData | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(DATA_KEY);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const data = request.result as PersistedData | undefined;
          
          // Check schema version
          if (data && data.schemaVersion !== SCHEMA_VERSION) {
            console.warn(`Schema version mismatch: stored=${data.schemaVersion}, current=${SCHEMA_VERSION}`);
            // Return null to trigger fresh start (safe fallback)
            resolve(null);
            return;
          }
          
          resolve(data || null);
        };
        
        tx.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Failed to load persisted data:', error);
      return null;
    }
  }
  
  /**
   * Save data to IndexedDB
   */
  export async function savePersistedData(data: PersistedData): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ ...data, schemaVersion: SCHEMA_VERSION }, DATA_KEY);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        
        tx.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Failed to save persisted data:', error);
      throw error;
    }
  }
  
  /**
   * Clear all persisted data from IndexedDB
   */
  export async function clearPersistedData(): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(DATA_KEY);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
        
        tx.oncomplete = () => db.close();
      });
    } catch (error) {
      console.error('Failed to clear persisted data:', error);
      throw error;
    }
  }
  
  /**
   * Create empty persisted data structure
   */
  export function createEmptyPersistedData(settings: PersistedSettings): PersistedData {
    return {
      schemaVersion: SCHEMA_VERSION,
      fills: [],
      fillFingerprints: [],
      settings,
      importHistory: [],
      adjustments: [],
    };
  }
  
  /**
   * Check if IndexedDB is available
   */
  export function isIndexedDBAvailable(): boolean {
    try {
      return typeof indexedDB !== 'undefined';
    } catch {
      return false;
    }
  }