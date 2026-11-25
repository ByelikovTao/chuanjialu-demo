(function () {
  'use strict';

  const DATABASE_NAME = 'chuanjialu-first-use-demo-v1';
  const STORE_NAME = 'snapshots';
  const FAMILY_KEY = 'family';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('当前浏览器无法保存演示数据。'));
        return;
      }

      const request = window.indexedDB.open(DATABASE_NAME, 1);
      let blocked = false;

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onblocked = () => {
        blocked = true;
        reject(new Error('演示存储暂时被占用，请关闭其他演示页后重试。'));
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        if (blocked) {
          database.close();
          return;
        }
        resolve(database);
      };
    });
  }

  async function runTransaction(mode, startRequest) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        // 家名、记录与原始媒体一起提交，保存成功以整个事务完成为准。
        const request = startRequest(store);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => {
          reject(transaction.error || new Error('演示存储操作已中止。'));
        };
      });
    } finally {
      // 每次操作独立连接，打开或保存失败后可以直接重试。
      database.close();
    }
  }

  window.firstUseMemoryStore = {
    async load() {
      const snapshot = await runTransaction('readonly', (store) => store.get(FAMILY_KEY));
      return snapshot ?? null;
    },

    async create(snapshot) {
      // 首次写入使用新增语义，家庭已经存在时由事务拒绝覆盖。
      await runTransaction('readwrite', (store) => store.add(snapshot, FAMILY_KEY));
    },

    async update(expected, change) {
      let snapshot;
      // 在同一个事务内读取并追加记录，避免多个演示页同时保存时覆盖彼此的记录。
      await runTransaction('readwrite', (store) => {
        const request = store.get(FAMILY_KEY);
        request.onsuccess = () => {
          const current = request.result;
          if (current?.familyName !== expected.familyName
              || current.invitedBy !== expected.invitedBy
              || current.createdAt !== expected.createdAt) {
            return;
          }
          snapshot = change(current);
          store.put(snapshot, FAMILY_KEY);
        };
        return request;
      });
      if (!snapshot) {
        throw new DOMException('演示家庭已变化。', 'InvalidStateError');
      }
      return snapshot;
    },

    async clear() {
      await runTransaction('readwrite', (store) => store.delete(FAMILY_KEY));
    }
  };
}());
