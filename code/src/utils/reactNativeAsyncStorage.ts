// Source - https://stackoverflow.com/questions/76779282/react-native-firebase-auth-persistence-cannot-import-getreactnativepersistence
// Posted by Miguel
// Retrieved 2025-11-06, License - CC BY-SA 4.0

// Define ReactNativeAsyncStorage interface locally
export interface ReactNativeAsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

import {
  Persistence,
  PersistenceInternal,
  PersistenceType,
  PersistenceValue,
  STORAGE_AVAILABLE_KEY,
  StorageEventListener,
} from './reactNativeAsyncStorageTypes';

export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence {
  return class implements PersistenceInternal {
    static type: 'LOCAL' = 'LOCAL';
    readonly type: PersistenceType = PersistenceType.LOCAL;

    async _isAvailable(): Promise<boolean> {
      try {
        if (!storage) return false;
        await storage.setItem(STORAGE_AVAILABLE_KEY, '1');
        await storage.removeItem(STORAGE_AVAILABLE_KEY);
        return true;
      } catch {
        return false;
      }
    }

    _set(key: string, value: PersistenceValue): Promise<void> {
      return storage.setItem(key, JSON.stringify(value));
    }

    async _get<T extends PersistenceValue>(key: string): Promise<T | null> {
      const json = await storage.getItem(key);
      return json ? JSON.parse(json) : null;
    }

    _remove(key: string): Promise<void> {
      return storage.removeItem(key);
    }

    _addListener(_key: string, _listener: StorageEventListener): void {
      // Listeners not supported for React Native storage
    }

    _removeListener(_key: string, _listener: StorageEventListener): void {
      // Listeners not supported for React Native storage
    }
  };
}
