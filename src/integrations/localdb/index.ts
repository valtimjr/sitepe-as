import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'partsManagerDB';
const DB_VERSION = 1;
const PARTS_STORE = 'parts';
const LIST_ITEMS_STORE = 'list_items';

// Fixed local user ID for a single-user local application
const LOCAL_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // A random UUID

interface Part {
  id: string; // Adiciona um ID para IndexedDB
  codigo: string;
  descricao: string;
}

interface ListItem {
  id: string;
  codigo_peca: string;
  descricao: string;
  quantidade: number;
  af: string;
  user_id: string;
}

let db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PARTS_STORE)) {
        const partsStore = db.createObjectStore(PARTS_STORE, { keyPath: 'id' });
        partsStore.createIndex('codigo', 'codigo', { unique: true });
        partsStore.createIndex('descricao', 'descricao', { unique: false });
      }
      if (!db.objectStoreNames.contains(LIST_ITEMS_STORE)) {
        const listItemsStore = db.createObjectStore(LIST_ITEMS_STORE, { keyPath: 'id' });
        listItemsStore.createIndex('user_id', 'user_id', { unique: false });
        listItemsStore.createIndex('af', 'af', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB opened successfully');
      seedPartsData(db); // Seed data on first successful open/upgrade
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject('Failed to open IndexedDB');
    };
  });
}

async function seedPartsData(dbInstance: IDBDatabase) {
  const transaction = dbInstance.transaction(PARTS_STORE, 'readwrite');
  const store = transaction.objectStore(PARTS_STORE);

  const countRequest = store.count();
  countRequest.onsuccess = () => {
    if (countRequest.result === 0) {
      const initialParts = [
        { id: uuidv4(), codigo: 'P001', descricao: 'Filtro de Óleo' },
        { id: uuidv4(), codigo: 'P002', descricao: 'Pastilha de Freio Dianteira' },
        { id: uuidv4(), codigo: 'P003', descricao: 'Vela de Ignição' },
        { id: uuidv4(), codigo: 'P004', descricao: 'Amortecedor Traseiro' },
        { id: uuidv4(), codigo: 'P005', descricao: 'Bateria 12V' },
        { id: uuidv4(), codigo: 'P006', descricao: 'Correia Dentada' },
        { id: uuidv4(), codigo: 'P007', descricao: 'Pneu Aro 15' },
        { id: uuidv4(), codigo: 'P008', descricao: 'Lâmpada Farol H4' },
        { id: uuidv4(), codigo: 'P009', descricao: 'Radiador' },
        { id: uuidv4(), codigo: 'P010', descricao: 'Disco de Freio' },
      ];

      initialParts.forEach(part => store.add(part));
      console.log('Initial parts data seeded.');
    }
  };
  countRequest.onerror = (event) => console.error('Error counting parts for seeding:', (event.target as IDBRequest).error);
}

// --- Parts Management ---

export const getParts = async (): Promise<Part[]> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(PARTS_STORE, 'readonly');
    const store = transaction.objectStore(PARTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as Part[]);
    request.onerror = () => reject('Failed to get parts');
  });
};

export const insertPart = async (part: Omit<Part, 'id'>): Promise<void> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(PARTS_STORE, 'readwrite');
    const store = transaction.objectStore(PARTS_STORE);

    // Check if part with same codigo already exists
    const index = store.index('codigo');
    const getRequest = index.get(part.codigo);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        // Update existing part
        const existingPart = getRequest.result as Part;
        const updateRequest = store.put({ ...existingPart, ...part });
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject('Failed to update part');
      } else {
        // Add new part
        const addRequest = store.add({ id: uuidv4(), ...part });
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject('Failed to add part');
      }
    };
    getRequest.onerror = () => reject('Failed to check for existing part');
  });
};

export const searchParts = async (query: string): Promise<Part[]> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(PARTS_STORE, 'readonly');
    const store = transaction.objectStore(PARTS_STORE);
    const allPartsRequest = store.getAll();

    allPartsRequest.onsuccess = () => {
      const allParts = allPartsRequest.result as Part[];
      if (!query) {
        resolve(allParts);
        return;
      }
      const lowerCaseQuery = query.toLowerCase();
      const filteredParts = allParts.filter(part =>
        part.codigo.toLowerCase().includes(lowerCaseQuery) ||
        part.descricao.toLowerCase().includes(lowerCaseQuery)
      );
      resolve(filteredParts);
    };
    allPartsRequest.onerror = () => reject('Failed to search parts');
  });
};

// --- List Items Management ---

export const getListItems = async (): Promise<ListItem[]> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(LIST_ITEMS_STORE, 'readonly');
    const store = transaction.objectStore(LIST_ITEMS_STORE);
    const index = store.index('user_id');
    const request = index.getAll(LOCAL_USER_ID);

    request.onsuccess = () => resolve(request.result as ListItem[]);
    request.onerror = () => reject('Failed to get list items');
  });
};

export const addItemToList = async (item: Omit<ListItem, 'id' | 'user_id'>): Promise<void> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(LIST_ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(LIST_ITEMS_STORE);
    const newItem: ListItem = { ...item, id: uuidv4(), user_id: LOCAL_USER_ID };
    const request = store.add(newItem);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to add item to list');
  });
};

export const updateListItem = async (updatedItem: ListItem): Promise<void> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(LIST_ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(LIST_ITEMS_STORE);
    const request = store.put({ ...updatedItem, user_id: LOCAL_USER_ID }); // Ensure user_id is correct

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to update list item');
  });
};

export const deleteListItem = async (id: string): Promise<void> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(LIST_ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(LIST_ITEMS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to delete list item');
  });
};

export const clearList = async (): Promise<void> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(LIST_ITEMS_STORE, 'readwrite');
    const store = transaction.objectStore(LIST_ITEMS_STORE);
    const index = store.index('user_id');
    const request = index.openCursor(IDBKeyRange.only(LOCAL_USER_ID));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject('Failed to clear list');
  });
};

export const getUniqueAfs = async (): Promise<string[]> => {
  const dbInstance = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(LIST_ITEMS_STORE, 'readonly');
    const store = transaction.objectStore(LIST_ITEMS_STORE);
    const index = store.index('user_id');
    const request = index.getAll(LOCAL_USER_ID);

    request.onsuccess = () => {
      const items = request.result as ListItem[];
      const afs = new Set<string>();
      items.forEach(item => {
        if (item.af) {
          afs.add(item.af);
        }
      });
      resolve(Array.from(afs).sort());
    };
    request.onerror = () => reject('Failed to get unique AFs');
  });
};