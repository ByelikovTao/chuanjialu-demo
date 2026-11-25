(function () {
  'use strict';

  const SAMPLE_PATH = 'assets/first-day-at-work.webp';
  const INSTALL_HINT = '模拟下载安装';
  const WELCOME_DURATION_MS = 3000;
  const PRODUCT_LOAD_TIMEOUT_MS = 8000;
  const SAMPLE_HOME_PHOTOS = [
    { mediaType: 'image', caption: '陈家除夕', sample: 'family-reunion' },
    { mediaType: 'image', caption: '爸爸第一天上班' }
  ];
  const INVITED_FAMILY = {
    familyName: '我们陈家',
    invitedBy: '陈知夏',
    records: [
      { id: '1', kind: 'cover', ...SAMPLE_HOME_PHOTOS[0] },
      {
        id: '2',
        kind: 'media',
        ...SAMPLE_HOME_PHOTOS[1],
        note: '那天是你爷爷送我去的。他一直站在路口，等我进了门才走。'
      }
    ]
  };
  const EXTRA_CONTENT = {
    motto: { title: '记录家训', label: '家训正文' },
    journal: { title: '记一件家事', label: '今天想记下家里的哪件事？' },
    history: { title: '记一段家史', label: '家史正文' },
    tree: { title: '给家谱添一位家人', label: '家人的姓名或称呼' },
    profile: { title: '个人资料' }
  };
  const PROFILE_FIELDS = {
    birthday: '生日',
    hometown: '籍贯',
    intro: '小传',
    education: '求学',
    work: '从业'
  };
  const SECTION_LABELS = {
    cover: '全家福',
    motto: '家训',
    history: '家史',
    tree: '家谱',
    media: '留影',
    journal: '家庭日记',
    profile: '个人资料'
  };
  const FIRST_MEMORY_MESSAGES = {
    cover: '这个家的第一张全家福，是你留下的。',
    motto: '这个家的第一句家训，是你留下的。',
    journal: '你为这个家记下了第一件家事。',
    history: '你为这个家记下了第一段家史。',
    tree: '家谱里的第一位家人，是你记下的。'
  };

  const element = (id) => document.getElementById(id);
  const steps = new Map(Array.from(
    document.querySelectorAll('[data-step]'), (screen) => [screen.dataset.step, screen]
  ));
  const store = window.firstUseMemoryStore;
  const writing = window.firstUseWriting;
  const invitations = window.firstUseInvitations;
  const stage = element('main-content');
  const backButton = element('step-back');
  const appGetButton = element('app-get');
  const installStatus = element('install-status');
  const nextMemoryButton = element('next-memory');
  const coverCheckbox = element('use-as-cover');
  const resetDialog = element('reset-dialog');
  const welcomeDialog = element('welcome-dialog');
  const photoSetupDialog = element('photo-setup-dialog');
  const familyNameInput = element('family-name');
  const familyNamePreview = element('family-name-preview');
  const familyNameSuggestion = element('family-name-suggestion');
  const confirmFamilyName = element('confirm-family-name');
  const homePhotoRail = element('home-photo-rail');
  const homePhotoButton = element('add-home-photos');
  const homePhotoInput = element('home-photo-file');
  const homeSetupActions = element('home-setup-actions');
  const productLanding = element('product-landing');
  const productView = element('product-view');
  const productLoading = element('product-loading');
  const shell = productLanding.closest('.shell');
  const path = ['app-store'];
  const homeMediaUrls = [];
  const welcomeMediaUrls = [];
  let snapshot = null;
  let homePhotos = [];
  let showingSamplePhotos = false;
  let currentPhoto = 0;
  let homeScrollTop = 0;
  let draft = null;
  let homePhotoDraft = [];
  let homePhotoPreviewUrl = '';
  let previewUrl = '';
  let previewFailed = false;
  let extraKind = '';
  let installationTimer = 0;
  let welcomeTimer = 0;
  let welcomePending = false;
  let productFrame = null;
  let productBridge = '';
  let productReady = false;
  let productLoadTimer = 0;
  let installed = false;
  let busy = false;

  function showError(id, message = '') {
    const feedback = element(id);
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function landingOnProduct() {
    return Boolean(snapshot && !snapshot.onboardingPending && path.at(-1) === 'home');
  }

  function productLoadFailed() {
    window.clearTimeout(productLoadTimer);
    productLoading.hidden = false;
    element('product-status').textContent = '我家暂时未加载，请重试。';
    element('product-retry').hidden = false;
  }

  function unmountProduct() {
    window.clearTimeout(productLoadTimer);
    productFrame?.remove();
    productFrame = null;
    productBridge = '';
    productReady = false;
  }

  function mountProduct() {
    unmountProduct();
    productLoading.hidden = false;
    element('product-status').textContent = '正在打开我家…';
    element('product-retry').hidden = true;
    const frame = document.createElement('iframe');
    frame.id = 'product-home-frame';
    frame.title = '传家录 · 我家';
    frame.tabIndex = -1;
    frame.inert = true;
    frame.sandbox.add('allow-scripts', 'allow-forms', 'allow-same-origin');
    frame.referrerPolicy = 'no-referrer';
    productBridge = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => (
      byte.toString(16).padStart(2, '0')
    )).join('');
    frame.src = 'product-home.html?embedded=1&start=new&bridge=' + productBridge + '#home';
    productFrame = frame;
    productView.prepend(frame);
    productLoadTimer = window.setTimeout(productLoadFailed, PRODUCT_LOAD_TIMEOUT_MS);
  }

  function sendToProduct(message) {
    productFrame?.contentWindow?.postMessage({ ...message, bridge: productBridge }, '*');
  }

  function syncProduct() {
    if (!productReady || !snapshot || snapshot.onboardingPending) {
      return;
    }
    // 子页只需要入谱信息，手机号留在生成模拟邀请的演示页面。
    const members = (snapshot.invitations || []).map(({ id, name, relation, status }) => ({
      id, name, relation, status
    }));
    sendToProduct({ type: 'first-use:sync', snapshot: { ...snapshot, invitations: members } });
  }

  async function addProductPhotos({ id, files, includeInAlbum }) {
    const validBatch = Array.isArray(files) && files.length > 0 && files.every((file) => (
      file instanceof File && file.size > 0 && file.type.startsWith('image/')
    ));
    const ok = validBatch && await saveHomePhotos(files, homePhotoButton, 'home-photo-error', {
      includeInAlbum: includeInAlbum !== false
    });
    const error = validBatch ? element('home-photo-error').textContent : '请选择可以打开的照片。';
    sendToProduct({ type: 'first-use:photo-result', id, ok, error });
  }

  function receiveProductMessage(event) {
    const message = event.data;
    // 本地文件没有可比对的站点来源，使用当前框架和本次加载的随机标识确认消息。
    if (!message || !productBridge || message.bridge !== productBridge || event.source !== productFrame?.contentWindow) {
      return;
    }
    if (message.type === 'first-use:ready') {
      productReady = true;
      syncProduct();
    } else if (message.type === 'first-use:loaded') {
      window.clearTimeout(productLoadTimer);
      productLoading.hidden = true;
      productFrame.tabIndex = 0;
      productFrame.inert = false;
      if (welcomePending && landingOnProduct()) {
        welcomePending = false;
        showWelcome();
      }
    } else if (message.type === 'first-use:error') {
      productLoadFailed();
    } else if (landingOnProduct() && message.type === 'first-use:photos') {
      void addProductPhotos(message);
    } else if (landingOnProduct() && message.type === 'first-use:action') {
      if (message.action === 'media') {
        openMedia();
      } else if (message.action === 'invite') {
        goTo('family-invite');
      } else if (['motto', 'history', 'profile', 'journal'].includes(message.action)) {
        openExtra(message.action);
      }
    }
  }

  function renderStep() {
    const current = path.at(-1);
    for (const [key, screen] of steps) {
      screen.hidden = key !== current;
      if (screen.hidden) {
        for (const video of screen.querySelectorAll('video')) {
          video.pause();
        }
      }
    }
    backButton.hidden = path.length < 2;
    element('start-over').hidden = current === 'app-store';
    const showProduct = landingOnProduct();
    productLanding.hidden = !showProduct;
    shell.classList.toggle('product-active', showProduct);
    if (showProduct) {
      if (!productFrame) {
        mountProduct();
      }
      return;
    }
    const heading = steps.get(current).querySelector('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    // 从栏目返回时回到离开首页的位置，其他页面从顶部开始。
    stage.scrollTop = current === 'home' ? homeScrollTop : 0;
  }

  function goTo(step) {
    const current = path.at(-1);
    if (!steps.has(step) || current === step || busy) {
      return;
    }
    if (step === 'app-store') {
      homeScrollTop = 0;
    } else if (current === 'home') {
      homeScrollTop = stage.scrollTop;
    }
    if (step === 'home' || step === 'app-store') {
      // 到达首页后才算完成初始化，返回按钮无需再绕回登录和建家。
      path.length = 0;
    }
    if (step === 'family-invite') {
      invitations.render();
    }
    path.push(step);
    renderStep();
  }

  function mediaElement(record, objectUrls) {
    const display = document.createElement(record.mediaType === 'video' ? 'video' : 'img');
    display.className = 'record-media';
    if (record.mediaType === 'video') {
      display.controls = true;
      display.preload = 'metadata';
      display.playsInline = true;
      display.setAttribute('aria-label', record.caption);
    } else {
      display.alt = record.file && (record.homePhoto || record.kind === 'cover')
        ? '首页照片'
        : record.caption;
    }
    if (record.file) {
      const url = URL.createObjectURL(record.file);
      objectUrls.push(url);
      display.src = url;
    } else {
      display.src = record.sample === 'family-reunion' ? 'assets/family-reunion.webp' : SAMPLE_PATH;
    }
    return display;
  }

  function setDraft(nextDraft, useAsCover = false) {
    draft = nextDraft;
    previewFailed = false;
    element('media-draft').hidden = !draft;
    const preview = element('media-preview');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = '';
    }
    preview.replaceChildren();
    preview.hidden = !draft;
    const caption = element('media-caption');
    caption.textContent = draft ? draft.caption : '';
    caption.hidden = !draft;
    element('media-picker-label').textContent = draft ? '重新选照片或视频' : '从手机选照片或视频';
    coverCheckbox.disabled = draft?.mediaType !== 'image';
    coverCheckbox.checked = useAsCover && !coverCheckbox.disabled;
    element('cover-choice').hidden = coverCheckbox.disabled;
    element('media-continue').hidden = !draft;
    nextMemoryButton.disabled = !draft;
    showError('media-error');
    if (draft) {
      const previewUrls = [];
      const display = mediaElement(draft, previewUrls);
      previewUrl = previewUrls[0] || '';
      display.addEventListener('error', () => {
        if (preview.contains(display)) {
          previewFailed = true;
          nextMemoryButton.disabled = true;
          showError('media-error', '当前浏览器无法打开这份素材，请另选一份。');
        }
      });
      preview.append(display);
    }
  }

  function selectLocalFile(fileInput, useAsCover = false) {
    const file = fileInput.files[0];
    if (!file) {
      return;
    }
    fileInput.value = '';
    const mediaType = file.type.split('/')[0];
    const supported = mediaType === 'image' || (!useAsCover && mediaType === 'video');
    if (!file.size || !supported) {
      setDraft(null);
      showError('media-error', useAsCover ? '请选择一张可以打开的全家福照片。' : '请选择可以打开的照片或视频。');
      return;
    }
    setDraft({ mediaType, file, caption: file.name }, useAsCover);
  }

  async function persist(change, errorId, button, validate) {
    if (busy) {
      return false;
    }
    busy = true;
    const readyLabel = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = '正在保存…';
    showError(errorId);
    try {
      if (validate && !(await validate())) {
        showError(errorId, '选中的照片里有无法打开的图片，请重新选择。');
        return false;
      }
      if (snapshot) {
        snapshot = await store.update(snapshot, change);
      } else {
        // 确认家名或接受邀请时即建档，不以留下第一份记忆为前提。
        const nextSnapshot = { ...change(), createdAt: Date.now() };
        await store.create(nextSnapshot);
        snapshot = nextSnapshot;
      }
      return true;
    } catch (error) {
      let message = '这次保存未完成，请再试一次。';
      if (error?.name === 'ConstraintError') {
        message = '当前浏览器已有家庭，请刷新后进入「我家」。';
      } else if (error?.name === 'InvalidStateError') {
        message = '演示中的家庭已变化，请刷新后再试。';
      } else if (error?.name === 'QuotaExceededError') {
        message = '本机可用空间不足，请选择较小的照片或视频后再试。';
      }
      showError(errorId, message);
      return false;
    } finally {
      busy = false;
      button.textContent = readyLabel;
      button.removeAttribute('aria-busy');
      button.disabled = false;
    }
  }

  function withRecords(current, additions) {
    const records = current.records;
    return {
      ...current,
      records: [...records, ...additions.map((record, index) => ({
        ...record,
        id: String(records.length + index + 1)
      }))]
    };
  }

  async function acceptInvitation(event) {
    if (snapshot) {
      return;
    }
    if (await persist(() => INVITED_FAMILY, 'invite-error', event.currentTarget)) {
      element('home-save-status').textContent = '欢迎加入「' + snapshot.familyName + '」。';
      renderHome();
      goTo('home');
    }
  }

  function readFamilyName() {
    return familyNameInput.value.trim();
  }

  function suggestedFamilyName(name) {
    return /^\p{Script=Han}{1,2}$/u.test(name) ? '我们' + name + '家' : '';
  }

  function renderFamilyNamePreview() {
    const name = readFamilyName();
    const suggestion = suggestedFamilyName(name);
    familyNamePreview.textContent = name || '你的家名';
    element('family-name-credit').hidden = !name;
    confirmFamilyName.disabled = !name;
    familyNameSuggestion.textContent = suggestion ? '若是姓氏，可用「' + suggestion + '」' : '';
    familyNameSuggestion.hidden = !suggestion;
    element('family-name-hint').hidden = Boolean(suggestion);
    showError('name-error');
  }

  async function saveRecord(record, errorId, button) {
    if (!snapshot) {
      showError(errorId, '请先创建家庭。');
      return;
    }
    const change = record.kind === 'profile'
      ? (current) => ({ ...current, profileName: record.value, profileDetails: record.details })
      : (current) => withRecords(current, [record]);
    if (await persist(change, errorId, button)) {
      setDraft(null);
      const section = SECTION_LABELS[record.kind];
      const message = '已保存到「' + section + '」。';
      renderHome();
      if (path.at(-2) === 'guide' && snapshot.onboardingPending) {
        const guideStatus = element('guide-save-status');
        guideStatus.textContent = message;
        guideStatus.hidden = false;
        path.pop();
        renderStep();
      } else {
        element('home-save-status').textContent = message;
        goTo('home');
      }
    }
  }

  function showWelcome() {
    element('welcome-family-name').textContent = snapshot.familyName;
    const creatorName = snapshot.profileName?.trim();
    // 姓名沿用人物志的资料，跳过姓名的创建者也能收到祝福。
    element('welcome-title').textContent = creatorName
      ? creatorName + '，这个家是你建起来的。'
      : '这个家，是你建起来的。';
    const photo = element('welcome-photo');
    // 欢迎卡只使用这个家庭真正保存的照片，没有上传时只显示家名和祝福。
    const cover = snapshot.records.find((record) => record.homePhoto || record.kind === 'cover');
    photo.hidden = !cover;
    if (cover) {
      photo.src = mediaElement(cover, welcomeMediaUrls).src;
    } else {
      photo.removeAttribute('src');
    }
    welcomeDialog.showModal();
    welcomeTimer = window.setTimeout(() => welcomeDialog.close(), WELCOME_DURATION_MS);
  }

  async function enterHome(event) {
    if (!snapshot?.onboardingPending || busy) {
      return;
    }
    const errorId = {
      home: 'home-entry-error',
      guide: 'guide-error',
      extra: 'extra-error'
    }[path.at(-1)];
    let firstEntry = false;
    // 同一家庭从任一个入口进入都只触发一次祝福，并和状态变更一起持久化。
    const completeSetup = (current) => {
      firstEntry = Boolean(current.onboardingPending && !current.invitedBy);
      return { ...current, onboardingPending: false };
    };
    if (await persist(completeSetup, errorId, event.currentTarget)) {
      homeScrollTop = 0;
      welcomePending = firstEntry;
      renderHome();
      if (path.at(-1) === 'home') {
        renderStep();
      } else {
        goTo('home');
      }
    }
  }

  function firstMemoryMessage(record) {
    if (record.kind === 'media') {
      return record.mediaType === 'video'
        ? '这个家的第一段视频，是你留下的。'
        : '这个家的第一张照片，是你留下的。';
    }
    return FIRST_MEMORY_MESSAGES[record.kind] ?? '这个家的第一份记忆，是你留下的。';
  }

  function updatePhotoPage(index) {
    currentPhoto = index;
    const photo = homePhotos[index];
    const caption = element('home-photo-caption');
    // 保留示意或内置照片的图注，用户上传的文件名不作为首页图注。
    const photoCaption = photo.file ? '' : photo.caption;
    caption.textContent = showingSamplePhotos ? '示意照片' : photoCaption;
    caption.hidden = !caption.textContent;
    element('home-photo-count').textContent = (index + 1) + ' / ' + homePhotos.length;
    element('home-photo-prev').setAttribute('aria-disabled', String(index === 0));
    element('home-photo-next').setAttribute('aria-disabled', String(index === homePhotos.length - 1));
  }

  function showPhoto(index) {
    if (index < 0 || index >= homePhotos.length) {
      return;
    }
    const offset = homePhotoRail.children[index].offsetLeft;
    homePhotoRail.scrollTo({ left: offset, behavior: 'instant' });
    updatePhotoPage(index);
  }

  function syncPhotoPage() {
    if (homePhotos.length < 2 || !homePhotoRail.clientWidth) {
      return;
    }
    // 每个可继续滑动的页面使用同样的步长，页码跟随当前占据主要位置的照片。
    const slideWidth = homePhotoRail.children[1].offsetLeft;
    const index = Math.min(homePhotos.length - 1, Math.round(homePhotoRail.scrollLeft / slideWidth));
    if (index !== currentPhoto) {
      updatePhotoPage(index);
    }
  }

  function renderHomePhotos(photos, firstVisibleId) {
    showingSamplePhotos = photos.length === 0;
    // 示例只用于展示首页的样子，挑选的照片才会写入这个家庭。
    homePhotos = showingSamplePhotos ? SAMPLE_HOME_PHOTOS : photos;
    const hasMultiple = homePhotos.length > 1;
    element('home-photo-title').textContent = showingSamplePhotos ? '首页轮播效果预览' : '首页照片';
    element('home-photo-swipe').hidden = !hasMultiple;
    element('home-photo-pages').hidden = !hasMultiple;
    homePhotoRail.tabIndex = hasMultiple ? 0 : -1;
    if (hasMultiple) {
      homePhotoRail.setAttribute('aria-label', '首页照片，使用左右方向键翻看');
    } else {
      homePhotoRail.removeAttribute('aria-label');
    }
    homePhotoRail.replaceChildren(...homePhotos.map((photo) => mediaElement(photo, homeMediaUrls)));
    homePhotoRail.scrollLeft = 0;
    updatePhotoPage(0);
    const firstVisibleIndex = homePhotos.findIndex((photo) => photo.id === firstVisibleId);
    if (firstVisibleId && firstVisibleIndex > 0) {
      showPhoto(firstVisibleIndex);
    }
    homePhotoButton.textContent = showingSamplePhotos ? '添加首页照片' : '继续添加照片';
    homePhotoButton.classList.toggle('primary', showingSamplePhotos);
    homeSetupActions.querySelector('[data-go="guide"]').hidden = showingSamplePhotos;
    homeSetupActions.querySelector('[data-enter-home]').classList.toggle('primary', !showingSamplePhotos);
  }

  function clearHomePhotoDraft() {
    element('photo-setup-preview').removeAttribute('src');
    if (homePhotoPreviewUrl) {
      URL.revokeObjectURL(homePhotoPreviewUrl);
    }
    homePhotoPreviewUrl = '';
    homePhotoDraft = [];
  }

  function shouldAskPhotoName() {
    return showingSamplePhotos && !snapshot.profileName && !snapshot.invitedBy;
  }

  function selectHomePhotos(event) {
    const files = Array.from(event.currentTarget.files);
    homePhotoInput.value = '';
    if (busy || photoSetupDialog.open || !snapshot || !files.length) {
      return;
    }
    if (files.some((file) => !file.size || !file.type.startsWith('image/'))) {
      showError('home-photo-error', '首页只展示照片，请重新选择图片。');
      return;
    }
    // 首次保存时可顺手录入姓名，已填写的成员和追加照片沿用直接保存。
    if (shouldAskPhotoName()) {
      clearHomePhotoDraft();
      homePhotoDraft = files;
      homePhotoPreviewUrl = URL.createObjectURL(files[0]);
      element('photo-setup-preview').src = homePhotoPreviewUrl;
      element('photo-setup-count').textContent = '已选 ' + files.length + ' 张照片';
      element('photo-setup-name').value = '';
      element('photo-setup-album').checked = true;
      showError('photo-setup-error');
      photoSetupDialog.showModal();
      return;
    }
    void saveHomePhotos(files, homePhotoButton, 'home-photo-error', {
      includeInAlbum: element('home-photo-album').checked
    });
  }

  async function saveHomePhotos(files, button, errorId, { name = '', includeInAlbum = true } = {}) {
    const validate = async () => {
      // 整组选中的照片都能打开后才一起保存，失败时保留首页已有照片。
      const results = await Promise.allSettled(files.map(async (file) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        try {
          image.src = url;
          await image.decode();
        } finally {
          URL.revokeObjectURL(url);
        }
      }));
      return results.every((result) => result.status === 'fulfilled');
    };
    const addPhotos = (current) => {
      // 每张照片只存一条记录，留影引用同一个文件。
      const photos = files.map((file) => ({
        kind: 'media', mediaType: 'image', homePhoto: true, includeInAlbum, caption: '首页照片', file
      }));
      const next = withRecords(current, photos);
      // 用户这一屏填写的姓名随图片一起提交，空姓名保留人物志已有资料。
      if (name) {
        next.profileName = name;
      }
      return next;
    };
    if (await persist(addPhotos, errorId, button, validate)) {
      const firstAdded = snapshot.records.at(-files.length);
      element('home-save-status').textContent = '已添加 ' + files.length + ' 张首页照片。';
      renderHome(firstAdded.id);
      return true;
    }
    return false;
  }

  function renderHome(firstVisibleId) {
    for (const url of homeMediaUrls.splice(0)) {
      URL.revokeObjectURL(url);
    }
    const isSetup = Boolean(snapshot.onboardingPending);
    steps.get('home').toggleAttribute('data-setup', isSetup);
    homeSetupActions.hidden = !isSetup;
    element('home-creator').hidden = !isSetup;
    if (!isSetup) {
      syncProduct();
      return;
    }

    element('home-family-name').textContent = snapshot.familyName;
    element('guide-family-name').textContent = snapshot.familyName;
    element('guide-invitation-label').textContent = snapshot.invitations?.length
      ? '邀请家人'
      : '邀请第一位家人';
    element('home-membership-label').textContent = '由你创建';
    const photos = snapshot.records.filter((record) => record.homePhoto || record.kind === 'cover');
    renderHomePhotos(photos, firstVisibleId);
    element('home-photo-album-choice').hidden = shouldAskPhotoName();
    element('home-creator-title').textContent = photos.length
      ? '首页照片已保存'
      : '这个家，是你建起来的。';
    const firstMemory = snapshot.records[0];
    let creatorMessage = '照片可多选，也可以以后再加。';
    if (photos.length > 0) {
      creatorMessage = photos.length > 1
        ? '这是你为这个家留下的第一组照片。'
        : '这是你为这个家留下的第一张照片。';
    } else if (firstMemory) {
      creatorMessage = firstMemoryMessage(firstMemory);
    }
    element('home-photo-intro').textContent = creatorMessage;
  }

  function openMedia() {
    setDraft(null);
    goTo('media');
  }

  function openExtra(kind) {
    if (busy || !snapshot || !Object.hasOwn(EXTRA_CONTENT, kind)) {
      return;
    }
    extraKind = kind;
    const isProfile = kind === 'profile';
    const fromGuide = path.at(-1) === 'guide';
    steps.get('extra').dataset.kind = kind;
    element('extra-title').textContent = EXTRA_CONTENT[kind].title;
    element('extra-field').hidden = isProfile;
    const profileField = element('profile-field');
    profileField.hidden = !isProfile;
    profileField.disabled = !isProfile;
    const extraInput = element('extra-value');
    extraInput.disabled = isProfile;
    if (isProfile) {
      element('profile-value').value = snapshot.profileName || '';
      for (const key of Object.keys(PROFILE_FIELDS)) {
        element('profile-' + key).value = snapshot.profileDetails?.[key] || '';
      }
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      element('profile-birthday').max = today.getFullYear() + '-' + month + '-' + day;
      writing.prepare(kind, ['intro', 'education', 'work'].map((key) => ({
        label: PROFILE_FIELDS[key], input: element('profile-' + key)
      })));
    } else {
      element('extra-label').textContent = EXTRA_CONTENT[kind].label;
      extraInput.value = '';
      writing.prepare(kind, [{ label: EXTRA_CONTENT[kind].label, input: extraInput }]);
    }
    element('extra-enter-home').hidden = !fromGuide;
    element('extra-submit').textContent = fromGuide ? '保存' : '保存到我家';
    showError('extra-error');
    goTo('extra');
  }

  function startInstall() {
    if (installed) {
      goTo('login');
      return;
    }
    appGetButton.disabled = true;
    appGetButton.setAttribute('aria-busy', 'true');
    appGetButton.textContent = '安装中';
    installStatus.textContent = '正在演示下载和安装…';
    installationTimer = window.setTimeout(() => {
      installed = true;
      appGetButton.textContent = '打开';
      appGetButton.disabled = false;
      appGetButton.removeAttribute('aria-busy');
      installStatus.textContent = '安装完成，可以打开传家录。';
      if (path.at(-1) === 'app-store') {
        appGetButton.focus({ preventScroll: true });
      }
    }, 650);
  }

  async function resetDemo() {
    if (busy) {
      return;
    }
    const button = element('confirm-reset');
    busy = true;
    button.disabled = true;
    showError('global-error');
    try {
      // 重置只清除首次体验自己的本机记忆库。
      await store.clear();
    } catch {
      showError('global-error', '演示暂时无法重置，请再试一次。');
      return;
    } finally {
      resetDialog.close();
      busy = false;
      button.disabled = false;
    }
    window.clearTimeout(installationTimer);
    window.clearTimeout(welcomeTimer);
    welcomePending = false;
    welcomeDialog.close();
    photoSetupDialog.close();
    unmountProduct();
    installed = false;
    snapshot = null;
    familyNameInput.value = '';
    element('home-photo-album').checked = true;
    renderFamilyNamePreview();
    for (const url of homeMediaUrls.splice(0)) {
      URL.revokeObjectURL(url);
    }
    homePhotoRail.replaceChildren();
    homePhotos = [];
    element('home-save-status').textContent = '';
    const feedbackIds = [
      'invite-error', 'media-error', 'home-photo-error', 'home-entry-error',
      'guide-error', 'guide-save-status', 'extra-error', 'photo-setup-error'
    ];
    for (const id of feedbackIds) {
      showError(id);
    }
    appGetButton.disabled = false;
    appGetButton.removeAttribute('aria-busy');
    appGetButton.textContent = '获取';
    installStatus.textContent = INSTALL_HINT;
    setDraft(null);
    goTo('app-store');
  }

  function bindEvents() {
    window.addEventListener('message', receiveProductMessage);
    element('product-retry').addEventListener('click', mountProduct);
    invitations.bind({ getSnapshot: () => snapshot, persist, onChanged: () => renderHome() });
    appGetButton.addEventListener('click', startInstall);
    element('accept-invitation').addEventListener('click', acceptInvitation);
    for (const link of document.querySelectorAll('[data-go]')) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (link.dataset.go === 'guide') {
          showError('guide-error');
          showError('guide-save-status');
        }
        goTo(link.dataset.go);
      });
    }
    for (const button of document.querySelectorAll('[data-enter-home]')) {
      button.addEventListener('click', enterHome);
    }
    element('close-welcome').addEventListener('click', () => welcomeDialog.close());
    welcomeDialog.addEventListener('close', () => {
      window.clearTimeout(welcomeTimer);
      element('welcome-photo').removeAttribute('src');
      for (const url of welcomeMediaUrls.splice(0)) {
        URL.revokeObjectURL(url);
      }
      if (landingOnProduct()) {
        productFrame?.focus({ preventScroll: true });
      }
    });
    backButton.addEventListener('click', () => {
      if (!busy && path.length > 1) {
        path.pop();
        renderStep();
      }
    });
    for (const id of ['start-over', 'product-reset']) {
      element(id).addEventListener('click', () => {
        if (!busy) {
          resetDialog.showModal();
        }
      });
    }
    element('cancel-reset').addEventListener('click', () => resetDialog.close());
    element('confirm-reset').addEventListener('click', resetDemo);
    element('memory-file').addEventListener('change', (event) => selectLocalFile(event.currentTarget));
    element('cover-file').addEventListener('change', (event) => selectLocalFile(event.currentTarget, true));
    element('choose-sample').addEventListener('click', () => {
      setDraft({ mediaType: 'image', caption: '爸爸第一天上班' });
    });
    nextMemoryButton.addEventListener('click', () => {
      if (!draft || previewFailed) {
        return;
      }
      const record = { ...draft, kind: coverCheckbox.checked ? 'cover' : 'media' };
      void saveRecord(record, 'media-error', nextMemoryButton);
    });
    familyNameInput.addEventListener('input', renderFamilyNamePreview);
    familyNameSuggestion.addEventListener('click', () => {
      // 建议由创建者点选后写入输入框，预览和最终保存使用同一个家名。
      const suggestion = suggestedFamilyName(readFamilyName());
      if (suggestion) {
        familyNameInput.value = suggestion;
        renderFamilyNamePreview();
        confirmFamilyName.focus({ preventScroll: true });
      }
    });
    element('family-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (snapshot || busy) {
        return;
      }
      const familyName = readFamilyName();
      if (!familyName) {
        showError('name-error', '请先填写家庭名字。');
        familyNameInput.focus();
        return;
      }
      if (await persist(() => ({ familyName, records: [], onboardingPending: true }), 'name-error', confirmFamilyName)) {
        renderHome();
        goTo('home');
      }
    });
    homePhotoButton.addEventListener('click', () => {
      if (!busy) {
        homePhotoInput.click();
      }
    });
    homePhotoInput.addEventListener('change', selectHomePhotos);
    element('photo-setup-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = element('photo-setup-save');
      const options = {
        name: element('photo-setup-name').value.trim(),
        includeInAlbum: element('photo-setup-album').checked
      };
      if (homePhotoDraft.length && await saveHomePhotos(homePhotoDraft, button, 'photo-setup-error', options)) {
        photoSetupDialog.close();
      }
    });
    element('photo-setup-cancel').addEventListener('click', () => {
      if (!busy) {
        photoSetupDialog.close();
      }
    });
    photoSetupDialog.addEventListener('cancel', (event) => {
      if (busy) {
        event.preventDefault();
      }
    });
    photoSetupDialog.addEventListener('close', () => {
      // 原生关闭事件可能晚于再次选图，已打开时保留新的预览。
      if (!photoSetupDialog.open) {
        clearHomePhotoDraft();
      }
    });
    homePhotoRail.addEventListener('scroll', syncPhotoPage, { passive: true });
    homePhotoRail.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showPhoto(currentPhoto + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });
    element('home-photo-prev').addEventListener('click', () => showPhoto(currentPhoto - 1));
    element('home-photo-next').addEventListener('click', () => showPhoto(currentPhoto + 1));
    for (const button of document.querySelectorAll('[data-extra]')) {
      button.addEventListener('click', () => openExtra(button.dataset.extra));
    }
    element('extra-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const isProfile = extraKind === 'profile';
      const input = element(isProfile ? 'profile-value' : 'extra-value');
      const value = input.value.trim();
      if (!value) {
        showError('extra-error', isProfile ? '请填写你的姓名。' : '写下一点内容，就可以保存。');
        input.focus();
        return;
      }
      const record = { kind: extraKind, value };
      if (isProfile) {
        record.details = Object.fromEntries(Object.keys(PROFILE_FIELDS).map((key) => [
          key, element('profile-' + key).value.trim()
        ]));
      } else if (extraKind === 'motto') {
        // 有出处的家训可按原文保存，来源和主题单独记录。
        record.value = input.value;
        Object.assign(record, writing.mottoDetails());
      }
      const button = event.submitter || event.currentTarget.querySelector('[type="submit"]');
      void saveRecord(record, 'extra-error', button);
    });
  }

  async function init() {
    element('invite-sender').textContent = INVITED_FAMILY.invitedBy + '邀请你加入这个家。';
    element('invite-family-name').textContent = INVITED_FAMILY.familyName;
    bindEvents();
    renderFamilyNamePreview();
    setDraft(null);
    try {
      snapshot = await store.load();
      if (snapshot) {
        renderHome();
        goTo('home');
      }
    } catch {
      showError('global-error', '当前浏览器暂时无法读取本机演示数据。');
    }
  }

  void init();
}());
