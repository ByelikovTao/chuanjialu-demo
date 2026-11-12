/** 单条照片的本机演示存储。分享凭证和发起人标识分开，收件页只读取该卡片。 */
'use strict';
{
  const databaseName = 'chuanjia-photo-invites';
  const storeName = 'cards';
  const tokenPattern = /^[a-f0-9]{40}$/;
  const growthPhoto = 'assets/zhumen/book-cover-photo.png';
  const elderPhoto = 'assets/zhumen/life-young-portrait-demo.png';
  const listeners = new Set();
  const network = document.querySelector('meta[name="photo-trial"]')?.content === 'online';
  const trialStorage = databaseName + ':trial';
  if (network && location.pathname !== '/photo-card.html') {
    const entry = /^#trial\/([a-f0-9]{40})$/.exec(location.hash);
    if (entry) {
      localStorage.setItem(trialStorage, entry[1]);
      history.replaceState(null, '', '#home');
    }
  }
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(databaseName) : null;
  let database;

  function token() {
    return Array.from(crypto.getRandomValues(new Uint8Array(20)), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function ownerKey() {
    let key = localStorage.getItem(databaseName + ':owner');
    if (!key) {
      key = token();
      localStorage.setItem(databaseName + ':owner', key);
    }
    return key;
  }

  function open() {
    if (!database) {
      database = new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'token' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return database;
  }

  async function transact(mode, start) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      let value;
      transaction.oncomplete = () => resolve(value);
      transaction.onabort = () => reject(transaction.error || new Error('事务未保存'));
      start(transaction.objectStore(storeName), result => { value = result; });
    });
  }

  function notify() {
    channel?.postMessage('changed');
    for (const listener of listeners) listener();
  }
  if (channel) channel.onmessage = () => { for (const listener of listeners) listener(); };

  function get(key) {
    if (!tokenPattern.test(key)) return Promise.resolve(null);
    return transact('readonly', (cards, done) => {
      const request = cards.get(key);
      request.onsuccess = () => done(request.result || null);
    });
  }

  async function owned(key, owner) {
    const card = await get(key);
    return card?.owner === owner ? {
      ...card,
      invitations: [{ token: card.token, revoked: card.revoked }, ...(card.invitations || [])]
    } : null;
  }

  async function create(owner, { question, photo }) {
    const card = { token: token(), owner, question, photo, storyInvite: true, created: Date.now(), revoked: false, replies: [] };
    await transact('readwrite', (cards, done) => { cards.add(card); done(card); });
    notify();
    return card;
  }

  async function guest(key) {
    const entry = await get(key);
    const card = entry?.root ? await get(entry.root) : entry;
    const invitation = entry?.root ? card?.invitations?.find(item => item.token === key) : card;
    if (!card?.storyInvite || !invitation || invitation.revoked) return null;
    return { token: key, photo: card.photo, question: card.question };
  }

  // 邀请、回复和撤回同事务更新原记录，音频随原照片集中保存。
  async function update(key, change) {
    if (!tokenPattern.test(key)) return false;
    const saved = await transact('readwrite', (cards, done) => {
      const request = cards.get(key);
      request.onsuccess = () => {
        const entry = request.result;
        if (!entry?.root) return apply(entry, entry);
        const root = cards.get(entry.root);
        root.onsuccess = () => apply(root.result, root.result?.invitations?.find(item => item.token === key));
      };
      function apply(card, invitation) {
        const accepted = Boolean(card?.storyInvite && invitation && change(card, invitation, cards));
        if (accepted) cards.put(card);
        done(accepted);
      }
    });
    if (saved) notify();
    return saved;
  }

  async function invite(key, owner, id) {
    if (!tokenPattern.test(id)) return null;
    const saved = await update(key, (card, invitation, cards) => {
      if (card.token !== key || card.owner !== owner) return false;
      card.invitations ||= [];
      if (card.invitations.some(item => item.token === id)) return true;
      if (card.invitations.length >= 20) return false;
      cards.add({ token: id, root: key });
      card.invitations.push({ token: id, revoked: false });
      return true;
    });
    return saved ? { token: id } : null;
  }

  function reply(key, reply) {
    return update(key, (card, invitation) => {
      if (invitation.revoked) return false;
      if (card.replies.some(item => item.id === reply.id)) return true;
      card.replies.push({ ...reply, inviteToken: key, created: Date.now() });
      return true;
    });
  }

  function revoke(key, owner) {
    return update(key, (card, invitation) => {
      if (card.owner !== owner) return false;
      invitation.revoked = true;
      return true;
    });
  }

  function revokeAll(key, owner) {
    return update(key, card => {
      if (card.token !== key || card.owner !== owner) return false;
      card.revoked = true;
      for (const item of card.invitations || []) item.revoked = true;
      return true;
    });
  }

  async function post(action, data, fileName) {
    const file = fileName && data[fileName];
    let body;
    const headers = {};
    if (file) {
      body = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        if (key === fileName) body.append(key, value, key);
        else body.append(key, String(value));
      }
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch('/api/photo-invites/' + action, {
        method: 'POST', headers, body, cache: 'no-store', signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw Object.assign(new Error('分享服务请求失败'), { code: result.error });
    }
    return action === 'photo' || action === 'audio' ? response.blob() : response.json();
  }

  const local = { owned, create, guest, reply, revoke, revokeAll, invite };
  const remote = {
    owned: (key, owner) => post('owned', { token: key, owner }),
    async create(owner, { id, question, photo }) {
      const result = await post('create', { id, owner, question, photo: photo || undefined, trialKey: localStorage.getItem(trialStorage) }, 'photo');
      if (!result) throw new Error('分享服务不可用');
      return result;
    },
    async guest(key, withPhoto = true) {
      const card = await post('guest', { token: key });
      if (card?.hasPhoto && withPhoto) {
        card.photo = await post('photo', { token: key });
        if (!card.photo) return null;
      }
      return card;
    },
    async reply(key, payload) {
      const data = payload.audio ? { token: key, id: payload.id, audio: payload.audio } : { token: key, ...payload };
      return Boolean((await post('reply', data, 'audio'))?.saved);
    },
    invite: (key, owner, id) => post('invite', { token: key, owner, id }),
    revoke: (key, owner) => post('revoke', { token: key, owner }),
    revokeAll: (key, owner) => post('revoke', { token: key, owner, all: true }),
    photo: (key, owner) => post('photo', { token: key, owner }),
    audio: (key, owner, id) => post('audio', { token: key, owner, id })
  };
  window.PhotoInvites = {
    ...(network ? remote : local), network, growthPhoto, elderPhoto, token, ownerKey, subscribe: listener => listeners.add(listener)
  };
}
