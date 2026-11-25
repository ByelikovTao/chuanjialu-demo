(function () {
  'use strict';

  const product = window.App;
  const host = window.parent;
  const bridge = new URLSearchParams(window.location.search).get('bridge');
  if (host === window || !bridge) {
    return;
  }

  const data = window.firstUseProductData;
  const nativeModal = product.modal;
  const nativeUploadCoverPhotos = product.Households.uploadCoverPhotos;
  const PHOTO_TIMEOUT_MS = 20000;
  const photoRequests = new Map();
  let requestSequence = 0;
  let familyKey;
  let firstUseFamily;

  function send(message) {
    // 独立演示支持本地文件和沙箱，消息只发给当前父窗口。
    host.postMessage({ ...message, bridge }, '*');
  }

  function createFamily(snapshot) {
    if (product.Households.current()) {
      product.Households.reset();
    }
    const form = document.createElement('form');
    form.id = 'house-create-form';
    form.innerHTML = '<input name="name"><input name="person"><button type="submit"></button>';
    form.elements.namedItem('name').value = snapshot.familyName;
    form.elements.namedItem('person').value = snapshot.profileName || '我';
    product.Households.submit(form);
    return product.Households.current();
  }

  function isFirstUseFamily() {
    return firstUseFamily && product.Households.current() === firstUseFamily;
  }

  function sync(snapshot) {
    if (!snapshot || typeof snapshot.familyName !== 'string' || !snapshot.familyName.trim() ||
        !Array.isArray(snapshot.records)) {
      return;
    }
    try {
      const nextFamilyKey = snapshot.createdAt ?? snapshot.familyName;
      if (familyKey !== nextFamilyKey) {
        firstUseFamily = createFamily(snapshot);
        if (!firstUseFamily) {
          throw new Error('无法创建演示家庭。');
        }
        familyKey = nextFamilyKey;
      }
      // 本机演示数据只写入建家时建立的工作区，其他家庭仍使用自己的完整版流程。
      if (!isFirstUseFamily()) {
        return;
      }
      data.apply(product, snapshot);
      product.render();
      send({ type: 'first-use:loaded' });
    } catch (error) {
      console.error('首次体验首页无法同步。', error);
      send({ type: 'first-use:error' });
    }
  }

  function showProductModal(...args) {
    const result = nativeModal(...args);
    const manager = document.querySelector('#modal[open] .home-cover-manager');
    if (isFirstUseFamily() && manager && !manager.querySelector('#product-cover-album')) {
      const choice = document.createElement('label');
      choice.className = 'product-cover-album-choice';
      const checkbox = document.createElement('input');
      checkbox.id = 'product-cover-album';
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      choice.append(checkbox, '同时保存到留影');
      manager.querySelector('.home-cover-manager-add').before(choice);
    }
    return result;
  }

  function uploadCoverPhotos(files, signal) {
    if (!isFirstUseFamily()) {
      return nativeUploadCoverPhotos(files, signal);
    }
    if (signal?.aborted) {
      return Promise.resolve(false);
    }
    const checkbox = document.getElementById('product-cover-album');
    const includeInAlbum = checkbox?.checked !== false;
    if (checkbox) {
      checkbox.disabled = true;
    }
    return new Promise((resolve) => {
      const id = ++requestSequence;
      const finish = (ok) => {
        window.clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        photoRequests.delete(id);
        if (checkbox) {
          checkbox.disabled = false;
        }
        resolve(ok);
      };
      const abort = () => finish(false);
      const timeout = window.setTimeout(() => {
        product.toast('照片暂时无法保存，请稍后再试。');
        finish(false);
      }, PHOTO_TIMEOUT_MS);
      photoRequests.set(id, finish);
      signal?.addEventListener('abort', abort, { once: true });
      send({ type: 'first-use:photos', id, files, includeInAlbum });
    });
  }

  function openEditor(event) {
    if (!isFirstUseFamily()) {
      return;
    }
    const target = event.target.closest('[data-action], [data-nav]');
    if (!target || target.disabled) {
      return;
    }
    const action = target.dataset.action;
    let editor;
    if (action === 'heritage-edit' && product.state.route === 'home') {
      editor = { motto: 'motto', origin: 'history' }[target.dataset.kind];
    } else if (['tree-edit-home', 'invite', 'invite-claim'].includes(action)) {
      editor = 'invite';
    } else if (action === 'house-story-profile-edit') {
      editor = 'profile';
    } else if (target.dataset.nav?.split('/')[0] === 'house-add' && product.state.route === 'home-album') {
      editor = 'media';
    } else if (target.dataset.nav?.split('/')[0] === 'house-moment' && product.state.route === 'home-diary') {
      editor = 'journal';
    }
    if (editor) {
      // 引导中已有持久化编辑器，沿用同一份本机家庭资料。
      event.preventDefault();
      event.stopPropagation();
      send({ type: 'first-use:action', action: editor });
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== host || event.data?.bridge !== bridge) {
      return;
    }
    const message = event.data;
    if (message.type === 'first-use:sync') {
      sync(message.snapshot);
    } else if (message.type === 'first-use:photo-result') {
      const finish = photoRequests.get(message.id);
      if (finish) {
        if (message.ok !== true && typeof message.error === 'string' && message.error) {
          product.toast(message.error);
        }
        finish(message.ok === true);
      }
    }
  });

  document.addEventListener('click', openEditor, { capture: true });
  product.modal = showProductModal;
  product.Households.uploadCoverPhotos = uploadCoverPhotos;
  send({ type: 'first-use:ready' });
}());
