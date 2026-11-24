/** 往事中的照片邀请。分享凭证只属于这条往事，访客回复在详情里回看。 */
'use strict';
{
  const P = window.App;
  const invites = window.PhotoInvites;
  const { escape: e, button: b, link: l } = P;
  const sessionKey = 'chuanjia-story-invite-tokens';
  const workspaceKey = 'chuanjia-photo-trial-workspace';
  const tokenStorage = invites.network ? localStorage : sessionStorage;
  const samplePhoto = 'assets/zhumen/life-wedding-demo.webp';
  const sampleAudio = 'assets/photo-card/sample-reply.wav';
  const maxBytes = 8 * 1024 ** 2;
  const pictureTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const questions = ['你还记得这张照片是在哪儿拍的吗？', '照片里的人都是谁？', '那天发生了什么事？'];
  let panel;
  let sending = false;
  let previewUrl = '';
  const viewMediaUrls = [];

  function tokens() {
    return JSON.parse(tokenStorage.getItem(sessionKey) || '[]');
  }

  function updateTokens(next) {
    tokenStorage.setItem(sessionKey, JSON.stringify(next));
  }

  // 本地文件刷新即重置。网络联调在同一发起人浏览器保留往事，只有显式重置才关闭链接。
  async function endSession({ reset = false } = {}) {
    if (invites.network && !reset) return;
    try {
      if (invites.network) localStorage.removeItem(workspaceKey);
      const keys = tokens();
      if (!keys.length) return;
      const owner = invites.ownerKey();
      await Promise.all(keys.map(key => invites.revokeAll(key, owner)));
      updateTokens(tokens().filter(key => !keys.includes(key)));
    } catch {
      // 存储暂时不可用时保留待关闭的凭证，下次打开时重试。
    }
  }

  function composer({ first = false, relatedMembers = [] } = {}) {
    const questionFields = `<fieldset class="story-photo-questions"><legend>选一句问题</legend>
        ${questions.map((question, index) => b(e(question), 'story-photo-question', 'btn secondary',
          `data-question-index="${index}" aria-pressed="${index === 0}"`)).join('')}
      </fieldset>
      <label class="form-field"><span>想问家人什么？可以改成自己的话</span><textarea name="question" maxlength="120" rows="2" required>${e(questions[0])}</textarea></label>`;
    return `<form id="story-photo-form" class="house-form section">
      <p class="caption">保存到 ${e(P.Households.current().name)} 的往事</p>
      <figure class="story-invite-preview"><img src="${samplePhoto}" alt="当前选择的照片">
        <figcaption id="story-photo-sample" class="caption">当前使用示例照片</figcaption></figure>
      <label class="form-field"><span>${first?'选一张家里的老照片':'换成家里的照片'}</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp"></label>
      ${first ? `<p class="caption" data-first-photo-question>准备问家人「${e(questions[0])}」</p>
      <details><summary>换一句问题（选填）</summary>${questionFields}</details>` : questionFields}
      <details><summary>补充照片年代（可选）</summary>
        <label class="form-field"><span>大约是哪一年拍的？</span><input name="photoYear" type="number" inputmode="numeric" min="1800" max="${new Date().getFullYear()}" step="1" placeholder="例如 1986"></label>
      </details>
      ${P.Households.memberFields(relatedMembers)}
      ${P.Households.audienceFields('story-photo-scope', 'family')}
      <p class="caption" data-photo-audience-note>选「当前家庭成员」可生成单张照片链接，拿到链接的人可免登录回话。链接可单独撤回。</p>
      <button class="btn full" type="submit">保存往事并生成照片链接</button>
      ${first ? l('稍后再发，回到我家', 'home', 'text-link full') : l('只记录文字或其他往事', 'house-record', 'text-link full')}
    </form>`;
  }

  function updateQuestionSelection(form) {
    const selected = form.elements.question.value.trim();
    const summary = form.querySelector('[data-first-photo-question]');
    if (summary) summary.textContent = selected ? '准备问家人「' + selected + '」' : '请填写一句想问家人的话。';
    for (const option of form.querySelectorAll('[data-question-index]')) {
      option.setAttribute('aria-pressed', String(selected === questions[option.dataset.questionIndex]));
    }
  }

  document.addEventListener('input', event => {
    const input = event.target;
    if (input.form?.id === 'story-photo-form' && input.name === 'question') updateQuestionSelection(input.form);
  });

  // 校验失败时展开选填区，让浏览器能定位到用户需要修改的字段。
  document.addEventListener('invalid', event => {
    if (event.target.form?.id !== 'story-photo-form') return;
    const details = event.target.closest('details');
    if (details) details.open = true;
  }, true);

  function validPhoto(file) {
    return pictureTypes.includes(file.type) && file.size <= maxBytes;
  }

  document.addEventListener('change', event => {
    const input = event.target;
    if (input.form?.id !== 'story-photo-form') return;
    if (input.name === 'scope') {
      const shareLink = input.value === 'family';
      input.form.querySelector('[data-photo-audience-note]').textContent = shareLink
        ? '选「当前家庭成员」可生成单张照片链接，拿到链接的人可免登录回话。链接可单独撤回。'
        : '照片按所选范围保存在往事里。';
      input.form.querySelector('button[type=submit]').textContent = shareLink ? '保存往事并生成照片链接' : '保存往事';
      return;
    }
    if (input.name !== 'image') return;
    const image = input.form.querySelector('img');
    if (image.src.startsWith('blob:')) URL.revokeObjectURL(image.src);
    const file = input.files[0];
    if (file && !validPhoto(file)) {
      input.value = '';
      P.toast('请选 8 MB 内的 JPG、PNG 或 WebP 照片。');
    }
    const selected = input.files[0];
    previewUrl = selected ? URL.createObjectURL(selected) : '';
    image.src = previewUrl || samplePhoto;
    input.form.querySelector('#story-photo-sample').hidden = Boolean(selected);
  });

  async function publish(form) {
    if (sending || !P.Households.current()) return;
    const question = form.elements.question.value.trim();
    const photo = form.elements.image.files[0];
    const bytes = photo?.size || 0;
    const photoYear = form.elements.photoYear.valueAsNumber;
    if (form.elements.photoYear.value && (!Number.isInteger(photoYear) || photoYear < 1800 || photoYear > new Date().getFullYear())) {
      return P.toast('请填一个有效的拍摄年份，或留空。');
    }
    if (!question) return P.toast('先写一句想问家人的话。');
    if (photo && !validPhoto(photo)) return P.toast('请选 8 MB 内的 JPG、PNG 或 WebP 照片。');
    if (bytes && !P.Households.canUpload(bytes)) return P.toast('当前家庭空间不足，已保留照片和问题。');
    const data = new FormData(form);
    const audience = P.Households.recordAudience(data);
    if (!audience) return;
    const relatedMembers = P.Households.memberIds(data.getAll('relatedMembers'));
    const save = photoToken => P.Households.saveStory({
      title: question, text: [], quote: question, photoUrl: photo ? URL.createObjectURL(photo) : samplePhoto,
      bytes, photoToken, photoYear: photoYear || undefined, relatedMembers, ...audience
    });
    // 范围收窄时只保存家庭记录，单张照片链接仅在明确选择当前家庭成员时生成。
    if (audience.scope !== 'family') {
      save();
      P.toast('照片已按所选范围保存。');
      return;
    }

    const state = P.state;
    const actor = state.actor;
    const controls = Array.from(form.elements).filter(control => !control.disabled);
    sending = true;
    controls.forEach(control => { control.disabled = true; });
    let card;
    let owner;
    let published = false;
    try {
      owner = invites.ownerKey();
      tokens();
      if (invites.network && (form.createQuestion !== question || form.createPhoto !== photo)) {
        form.createId = invites.token();
        form.createQuestion = question;
        form.createPhoto = photo;
      }
      card = await invites.create(owner, { id: form.createId, question, photo: photo || null });
      if (P.state !== state || state.actor !== actor || !form.isConnected) {
        await invites.revoke(card.token, owner);
        return;
      }
      updateTokens([...tokens(), card.token]);
      save(card.token);
      published = true;
      persistWorkspace();
      P.toast('往事已保存，可以复制照片链接。');
    } catch (error) {
      if (card) void invites.revoke(card.token, owner).catch(() => {});
      P.toast(error.code === 'TRIAL_ENTRY_REQUIRED'
        ? '请先打开发起人试用入口，再生成照片链接。'
        : '暂时没有保存，照片和问题还在，可以再试一次。');
    } finally {
      sending = false;
      if (!published) controls.forEach(control => { control.disabled = false; });
    }
  }

  function submit(form) {
    if (form.id === 'story-ask-form') {
      void attachQuestion(form);
      return true;
    }
    if (form.id !== 'story-photo-form') return false;
    void publish(form);
    return true;
  }

  function region(story) {
    if (!story.photoToken) return '';
    const manage = story.author === P.state.actor ? `<details class="story-share-management section">
      <summary>分享管理</summary>
      <div data-story-share-links><p class="caption">正在读取照片链接…</p></div>
      ${b('调整分享范围', 'share-story', 'btn secondary full')}
    </details>` : '';
    return `<section class="card story-invite-panel section" data-story-invite="${e(story.id)}">
      ${story.photoQuestion ? `<div class="story-asked-question"><p class="caption">想问长辈</p><p>${e(story.photoQuestion)}</p></div>` : ''}
      ${story.author===P.state.actor?`<div class="story-quick-share" data-story-quick-share hidden></div>`:''}
      <h2>家人的语音</h2>
      <div data-story-voices><p class="caption">正在查看这张照片的回复…</p></div>
      <div data-story-followup></div>
      ${manage}
      <div data-story-text-replies></div>
    </section>`;
  }

  function playback(reply, urls = panel.urls) {
    if (reply.text) return `<p class="story-invite-text">${e(reply.text)}</p>`;
    return `<audio controls preload="metadata" aria-label="家人的语音" src="${e(replySource(reply, urls))}"></audio>`;
  }

  function replySource(reply, urls) {
    const src = reply.sample ? sampleAudio : URL.createObjectURL(reply.audio);
    if (!reply.sample) urls.push(src);
    return src;
  }

  function release() {
    for (const url of panel?.urls || []) URL.revokeObjectURL(url);
    if (panel) panel.urls = [];
  }

  function replyList(card, story, urls, replies = card.replies) {
    return replies.map(reply => {
      const number = card.invitations.findIndex(item => item.token === (reply.inviteToken || story.photoToken)) + 1;
      return `<article class="story-invite-reply"><strong>第 ${number || 1} 位家人 · ${reply.text ? '留言' : '语音'}</strong>
        ${reply.sample ? '<span class="caption"> · 示例语音</span>' : ''}${playback(reply, urls)}</article>`;
    }).join('');
  }

  function sharing(invitation, index, open) {
    const title = index ? `第 ${index + 1} 位家人的链接` : '照片回话链接';
    if (invitation.revoked) {
      return `<p class="caption story-link-status">${index ? title + '已撤回' : '链接已撤回'}，收到的回复仍可回听。</p>`;
    }
    const guestLink = new URL('photo-card.html#reply/' + invitation.token, location.href).href;
    return `<details class="story-invite-sharing" data-story-invite-token="${e(invitation.token)}" ${open ? 'open' : ''}><summary>${title}</summary>
      <p class="caption">${invites.network ? '复制链接发到微信。' : ''}家人可以免登录查看这一张照片和问题。照片链接可以单独撤回。</p>
      <label class="form-field"><span>请家人回话的照片链接</span><input ${index === 0 ? 'id="story-guest-link"' : ''} data-story-invite-link value="${e(guestLink)}" readonly></label>
      ${b('复制链接', 'story-photo-copy', 'btn full')}
      <a class="btn secondary full story-guest-link" href="${e(guestLink)}" target="_blank" rel="noopener">${invites.network ? '预览长辈页面' : '在新标签打开长辈端'}</a>
      ${b('撤回这条链接', 'story-photo-revoke', 'text-link full')}
    </details>`;
  }

  function canInvite(story, state = P.state) {
    return story.author === state.actor && story.scope === 'family' && state.members.every(id => story.viewers.includes(id));
  }

  function canAsk(story, state = P.state) {
    if (!story || story.photoToken || !canInvite(story, state)) return false;
    return (story.babyMilestone && story.houseImage === invites.growthPhoto) ||
      (story.lifeMilestone && story.houseImage === invites.elderPhoto) ||
      (story.moment && story.houseImage?.startsWith('blob:'));
  }

  function askButton(story, { album = false } = {}) {
    return canAsk(story) ? b('问长辈', 'story-ask-elder', album ? 'btn secondary compact album-ask' : 'btn secondary compact',
      album ? `data-album-story="${e(story.id)}"` : '') : '';
  }

  function ask(story, fromAlbum) {
    if (!canAsk(story)) return;
    const samples = {
      'nian-first-new-year': '妈，还记得念念第一次给长辈拜年时是什么样吗？',
      'father-first-work-photo': '爸，这张照片是你刚参加工作时拍的吗？第一天印象最深的是什么？'
    };
    const question = samples[story.id] || (story.babyMilestone ? '你还记得那天发生了什么吗？' : questions[2]);
    P.modal('问长辈', `<form id="story-ask-form" class="house-form" data-story="${e(story.id)}" data-from-album="${fromAlbum}">
      <label class="form-field"><span>想问一句什么？</span><textarea name="question" rows="2" maxlength="120" required>${e(question)}</textarea></label>
      <p class="caption">这次分享这张照片和这一句话，家人点开就可以回语音。</p>
      <button type="submit" class="btn full section">生成回话链接</button>
    </form>`, 'sheet');
  }

  /** 邀请只附加到已保存的往事。授权或页面变化时撤回刚生成的链接。 */
  async function attachQuestion(form) {
    if (sending) return;
    const state = P.state;
    const actor = state.actor;
    const hash = location.hash;
    const story = P.visibleStories().find(item => item.id === form.dataset.story);
    const fromAlbum = form.dataset.fromAlbum === 'true';
    const inContext = () => fromAlbum ? state.route === 'house-elders' : state.storyId === story?.id;
    if (!canAsk(story, state) || !inContext()) return;
    const question = form.elements.question.value.trim();
    if (!question || question.length > 120) return P.toast('写一句想问长辈的话，最多 120 字。');
    const source = story.houseImage;
    const current = () => P.state === state && state.actor === actor && inContext() && location.hash === hash &&
      form.isConnected && form.closest('dialog')?.open && story.houseImage === source && canAsk(story, state);
    const controls = [...form.elements];
    sending = true;
    controls.forEach(control => { control.disabled = true; });
    let owner;
    let card;
    let attached = false;
    try {
      // 本机文件模式使用白名单内的示例图片，联调与用户选图继续上传原照片。
      let photo = source;
      if (invites.network || ![invites.growthPhoto, invites.elderPhoto].includes(source)) {
        const response = await fetch(source);
        if (!response.ok) throw new Error('照片读取失败');
        photo = await response.blob();
        if (!validPhoto(photo)) throw new Error('照片格式或大小不符合要求');
      }
      if (!current()) return;
      owner = invites.ownerKey();
      if (form.createQuestion !== question) {
        form.createId = invites.token();
        form.createQuestion = question;
      }
      card = await invites.create(owner, { id: form.createId, question, photo });
      if (!current()) {
        await invites.revoke(card.token, owner);
        return;
      }
      updateTokens([...tokens(), card.token]);
      story.photoToken = card.token;
      story.photoQuestion = question;
      attached = true;
      persistWorkspace();
      P.closeModal();
      const showLink = () => {
        const content = document.getElementById('app-content');
        const host = panel?.host;
        if (host?.dataset.storyInvite === story.id) content.scrollTop += host.getBoundingClientRect().top - content.getBoundingClientRect().top - 16;
      };
      if (fromAlbum) {
        window.addEventListener('hashchange', showLink, { once: true });
        P.navigate('story/' + story.id);
      } else {
        P.render();
        showLink();
      }
      P.toast('回话链接已生成。');
    } catch (error) {
      if (card && !attached) void invites.revoke(card.token, owner).catch(() => {});
      if (current()) P.toast(error.code === 'TRIAL_ENTRY_REQUIRED'
        ? '请先打开发起人试用入口，再生成照片链接。'
        : '暂时没有生成链接，问题还在，可以再试一次。');
    } finally {
      sending = false;
      if (!attached) controls.forEach(control => { control.disabled = false; });
    }
  }

  function render(card, story) {
    const current = panel;
    current.card = card;
    const { host } = current;
    const canManage = canInvite(story);
    const hasVoice = story.guestVoiceCount > 0;
    // 分享操作只更新控件，避免已有语音在复制、撤回或生成链接时重新加载。
    if (current.replyCount !== card.replies.length) {
      release();
      current.replyCount = card.replies.length;
      const voices = replyList(card, story, current.urls, card.replies.filter(reply => !reply.text));
      const text = replyList(card, story, current.urls, card.replies.filter(reply => reply.text));
      host.querySelector('[data-story-voices]').innerHTML = voices || '<p class="caption">家人回的语音会出现在这里。</p>';
      host.querySelector('[data-story-text-replies]').innerHTML = text
        ? `<details class="section"><summary>照片的文字回复</summary>${text}</details>` : '';
    }
    host.querySelector('[data-story-followup]').innerHTML = canManage && hasVoice && card.invitations.length < 21
      ? b('再问一位家人', 'story-photo-followup', 'btn secondary full', current.inviting ? 'disabled' : '') : '';

    const manage = host.querySelector('.story-share-management');
    if (!manage) return;
    // 首次分享直接提供复制动作；收到回复或撤回链接后，在分享管理中继续处理。
    const quickShare = host.querySelector('[data-story-quick-share]');
    const firstLink = card.invitations.find(item => !item.revoked);
    const showQuickShare = story.scope === 'family' && !card.replies.length && Boolean(firstLink);
    quickShare.hidden = !showQuickShare;
    if (showQuickShare && quickShare.dataset.token !== firstLink.token) {
      quickShare.dataset.token = firstLink.token;
      const guestLink = new URL('photo-card.html#reply/' + firstLink.token, location.href).href;
      quickShare.innerHTML = b(invites.network ? '复制链接发给家人' : '复制照片链接', 'story-photo-copy', 'btn full') +
        (story.photoQuestion ? `<a class="text-link full story-guest-link" href="${e(guestLink)}" target="_blank" rel="noopener">打开长辈端</a>` : '');
    }
    const links = manage.querySelector('[data-story-share-links]');
    const opened = new Set(Array.from(links.querySelectorAll('[data-story-invite-token][open]'), item => item.dataset.storyInviteToken));
    const active = card.invitations.find(item => item.token === current.activeInvite && !item.revoked);
    // 新成员不会改变旧往事的可见名单，发起人仍可管理已有照片链接。
    links.innerHTML = card.invitations.map((invitation, index) =>
      story.scope === 'family' || invitation.revoked
        ? sharing(invitation, index, active ? active === invitation : opened.has(invitation.token) || (!index && !hasVoice))
        : '').join('');
    if (active && story.scope === 'family') {
      current.activeInvite = null;
      manage.open = true;
      const link = links.querySelector(`[data-story-invite-token="${active.token}"] summary`);
      requestAnimationFrame(() => {
        if (!link?.isConnected) return;
        const content = document.getElementById('app-content');
        content.scrollTop += link.getBoundingClientRect().top - content.getBoundingClientRect().top - 16;
        link.focus({ preventScroll: true });
      });
    }
  }

  function hasUnreadVoice(story) {
    return story.author === P.state.actor && (story.guestVoiceCount || 0) > (story.guestVoiceSeen || 0);
  }

  function countContent(story) {
    const total = (story.replies?.length || 0) + (story.guestReplyCount || 0) + P.HouseScreen.replyCount(story);
    return total + ' 条补充' + (hasUnreadVoice(story) ? ' <span class="story-new-reply">有新回复</span>' : '');
  }

  function homeReplyContent(stories) {
    const unread = stories.filter(story => story.photoToken && hasUnreadVoice(story));
    const latest = unread.reverse().sort((left, right) => (right.guestVoiceAt || 0) - (left.guestVoiceAt || 0))[0];
    return latest ? { id: latest.id, button: l(
      `<span class="story-new-reply">有新回复</span><span class="heritage-reply-title">${e(latest.title)}</span>`,
      'story/' + e(latest.id), 'btn secondary full heritage-reply-button') } : { id: '', button: '' };
  }

  function homeReplies() {
    const reply = homeReplyContent(P.visibleStories());
    return `<div data-home-photo-replies="${e(reply.id)}" aria-live="polite">${reply.button}</div>`;
  }

  function countLabel(story) {
    const count = countContent(story);
    return story.photoToken ? `<span data-photo-count="${e(story.id)}" aria-live="polite">${count}</span>` : count;
  }

  function albumReplies(story) {
    return story.photoToken ? `<div class="album-replies" data-album-replies="${e(story.id)}">
      <p class="caption" data-reply-placeholder>等长辈回话</p></div>` : '';
  }

  /** 相册引用原往事的回复。只追加新语音，刷新计数时保留正在播放的元素。 */
  async function loadAlbumReplies(host, card, owner) {
    if (!host.isConnected || host.loadingReplies) return;
    const state = P.state;
    const actor = state.actor;
    const shown = host.shownReplies ||= new Set();
    const replies = card.replies.filter(reply => (reply.sample || reply.audio || reply.hasAudio) && !shown.has(reply.id));
    const placeholder = host.querySelector('[data-reply-placeholder]');
    if (!replies.length) {
      if (!shown.size && card.replies.length && placeholder) placeholder.textContent = '点开照片可看家人的留言';
      return;
    }
    host.loadingReplies = true;
    try {
      if (invites.network) await loadVoices({ token: card.token, replies }, owner);
      if (P.state !== state || state.actor !== actor || !host.isConnected) return;
      const controls = replies.map(reply => {
        const source = replySource(reply, viewMediaUrls);
        shown.add(reply.id);
        return P.FamilyEditions.voicePlayer(source, reply.sample ? '听示例回话' : '听长辈回话');
      }).join('');
      placeholder?.remove();
      host.insertAdjacentHTML('beforeend', controls);
    } catch {
      if (placeholder?.isConnected) placeholder.textContent = '暂时无法读取语音，点开照片查看';
    } finally {
      host.loadingReplies = false;
    }
  }

  function updateCounts(story, card) {
    if (card.replies.length < (story.guestReplyCount || 0)) return;
    story.guestReplyCount = card.replies.length;
    // 语音回复按收到的顺序追加。普通留言仍计入总数，不触发语音提醒。
    const voices = card.replies.filter(reply => reply.sample || reply.audio || reply.hasAudio);
    story.guestVoiceCount = voices.length;
    story.guestVoiceAt = voices.at(-1)?.created || 0;
  }

  function revealUnreadVoice(current, story) {
    if (!current.opening || document.hidden) return;
    current.opening = false;
    const seen = story.guestVoiceSeen || 0;
    if (story.author !== P.state.actor || seen >= story.guestVoiceCount) return;
    const voice = current.host.querySelectorAll('audio')[seen];
    if (!voice) return;
    story.guestVoiceSeen = story.guestVoiceCount;
    persistWorkspace();
    requestAnimationFrame(() => {
      if (panel !== current || !voice.isConnected) return;
      const content = document.getElementById('app-content');
      const reply = voice.closest('.story-invite-reply');
      content.scrollTop += reply.getBoundingClientRect().top - content.getBoundingClientRect().top - 16;
      voice.focus({ preventScroll: true });
    });
  }

  async function loadMedia(current, story, card, owner) {
    if (!invites.network) return;
    const photo = current.host.closest('.story-detail')?.querySelector('[data-network-story-photo]');
    if (photo && card.hasPhoto && !story.houseImage) {
      const blob = await invites.photo(story.photoToken, owner);
      if (!blob) throw new Error('照片读取失败');
      if (panel === current) {
        story.houseImage = URL.createObjectURL(blob);
        const image = document.createElement('img');
        image.alt = '这件往事的家庭照片';
        image.src = story.houseImage;
        photo.replaceWith(image);
        const screenTools = current.host.closest('.story-detail')?.querySelector('[data-screen-story-tools]');
        if (screenTools) screenTools.insertAdjacentHTML('afterbegin', P.HouseScreen.photoButton(story));
      }
    }
    await loadVoices(card, owner, current.audio);
  }

  async function loadVoices(card, owner, cache = new Map()) {
    await Promise.all(card.replies.filter(reply => reply.hasAudio).map(async reply => {
      if (!cache.has(reply.id)) {
        const blob = await invites.audio(card.token, owner, reply.id);
        if (!blob) throw new Error('语音读取失败');
        cache.set(reply.id, blob);
      }
      reply.audio = cache.get(reply.id);
    }));
  }

  function persistWorkspace() {
    if (!invites.network) return;
    try { localStorage.setItem(workspaceKey, JSON.stringify(P.Households.photoWorkspace())); }
    catch { /* 本机空间不足时保留当前页面内存，分享和回听仍可用。 */ }
  }

  async function refresh(force = false) {
    const current = panel;
    if (!current || !current.host.isConnected || current.state !== P.state) return;
    const story = P.visibleStories().find(item => item.id === current.host.dataset.storyInvite);
    if (!story?.photoToken) return;
    if (current.loading) {
      current.refreshAgain ||= force;
      return;
    }
    current.loading = true;
    try {
      const owner = invites.ownerKey();
      const card = await invites.owned(story.photoToken, owner);
      if (panel !== current || current.state !== P.state || !current.host.isConnected) return;
      if (!card) {
        current.host.querySelector('[data-story-voices]').innerHTML = '<p class="caption">这条照片分享暂时无法读取。</p>';
        const links = current.host.querySelector('[data-story-share-links]');
        if (links) links.textContent = '照片链接暂时无法读取。';
        return;
      }
      const revision = JSON.stringify([card.replies.length, card.invitations, story.scope]);
      if (revision !== current.revision) {
        await loadMedia(current, story, card, owner);
        if (panel !== current || current.state !== P.state || !current.host.isConnected) return;
        current.revision = revision;
        updateCounts(story, card);
        render(card, story);
      }
      revealUnreadVoice(current, story);
    } catch {
      if (panel === current && !current.revision) {
        current.host.querySelector('[data-story-voices]').innerHTML = '<p class="caption">暂时无法读取，稍后会重试。</p>';
        const links = current.host.querySelector('[data-story-share-links]');
        if (links) links.textContent = '照片链接暂时无法读取。';
      }
    } finally {
      current.loading = false;
      if (current.refreshAgain) {
        current.refreshAgain = false;
        void refresh();
      }
    }
  }

  async function refreshCounts() {
    const state = P.state;
    const actor = state.actor;
    const labels = Array.from(document.querySelectorAll('[data-photo-count]'));
    const albumHosts = Array.from(document.querySelectorAll('[data-album-replies]'));
    const home = document.querySelector('[data-home-photo-replies]');
    if (!labels.length && !albumHosts.length && !home) return;
    const storyIds = new Set([...labels.map(label => label.dataset.photoCount), ...albumHosts.map(host => host.dataset.albumReplies)]);
    const stories = P.visibleStories().filter(story => story.photoToken && (storyIds.has(story.id) || home && story.author === actor));
    if (!stories.length) return;
    try {
      const owner = invites.ownerKey();
      // 首页和列表共用回复计数。旧页面返回的结果不能更新切换后的家庭或身份。
      const results = await Promise.allSettled(stories.map(story => invites.owned(story.photoToken, owner)));
      if (P.state !== state || state.actor !== actor || ![home, ...labels, ...albumHosts].some(element => element?.isConnected)) return;
      const byId = new Map(stories.map((story, index) => {
        const result = results[index];
        const card = result.status === 'fulfilled' ? result.value : null;
        if (card) updateCounts(story, card);
        return [story.id, { story, card }];
      }));
      for (const label of labels) {
        const story = byId.get(label.dataset.photoCount)?.story;
        if (story && label.isConnected) {
          const next = countContent(story);
          if (label.innerHTML !== next) label.innerHTML = next;
        }
      }
      for (const host of albumHosts) {
        const card = byId.get(host.dataset.albumReplies)?.card;
        if (card) void loadAlbumReplies(host, card, owner);
      }
      if (home?.isConnected) {
        const next = homeReplyContent(stories);
        if (home.dataset.homePhotoReplies !== next.id) {
          home.dataset.homePhotoReplies = next.id;
          home.innerHTML = next.button;
        }
      }
    } catch {
      // 读取暂不可用时保留已显示的回复状态，后续刷新会重试。
    }
  }

  function refreshVisible() {
    void refresh();
    void refreshCounts();
  }

  function mount() {
    const composer = document.querySelector('#story-photo-form img');
    if (previewUrl && composer?.src !== previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = '';
    }
    release();
    for (const url of viewMediaUrls.splice(0)) URL.revokeObjectURL(url);
    for (const image of document.querySelectorAll('[data-album-photo]')) void loadViewPhoto(image);
    const host = document.querySelector('[data-story-invite]');
    panel = host ? { host, state: P.state, revision: '', opening: true, urls: [], audio: new Map() } : null;
    persistWorkspace();
    refreshVisible();
  }

  async function revokeStory(story) {
    if (!story.photoToken || story.author !== P.state.actor) return;
    await invites.revokeAll(story.photoToken, invites.ownerKey());
  }

  async function copy(element) {
    const details = element.closest('.story-invite-sharing') ||
      element.closest('[data-story-invite]')?.querySelector('.story-invite-sharing');
    const input = details?.querySelector('[data-story-invite-link]');
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input.value);
      P.toast(invites.network ? '链接已复制，可以粘贴到微信发给家人。' : '链接已复制。');
    } catch {
      const manage = details.closest('.story-share-management');
      if (manage) manage.open = true;
      details.open = true;
      input.focus();
      input.select();
      P.toast('链接已选中，可以复制。');
    }
  }

  async function followup(story, element) {
    const current = panel;
    if (!current?.card || current.inviting || !canInvite(story) || !story.guestVoiceCount) return;
    const state = P.state;
    const actor = state.actor;
    const owner = invites.ownerKey();
    const id = current.nextInviteId || invites.token();
    current.nextInviteId = id;
    current.activeInvite = id;
    current.inviting = true;
    element.disabled = true;
    try {
      const invitation = await invites.invite(story.photoToken, owner, id);
      if (!invitation) throw new Error('未生成邀请');
      current.nextInviteId = null;
      if (P.state !== state || story.scope !== 'family' || !state.members.every(member => story.viewers.includes(member))) {
        await invites.revoke(invitation.token, owner);
        return;
      }
      if (panel === current && state.actor === actor) {
        await refresh(true);
        P.toast('新链接已生成，可以发给另一位家人。');
      }
    } catch {
      if (panel === current) P.toast('暂时没有生成新链接，可以再试一次。');
    } finally {
      current.inviting = false;
      element.disabled = false;
      const button = current.host.querySelector('[data-action="story-photo-followup"]');
      if (button) button.disabled = false;
    }
  }

  async function revokeLink(story, token) {
    const state = P.state;
    try {
      await invites.revoke(token, invites.ownerKey());
      if (P.state === state && state.storyId === story.id) {
        P.closeModal();
        void refresh(true);
        P.toast('照片链接已撤回。');
      }
    } catch {
      P.toast('暂时没能撤回，请再试一次。');
    }
  }

  function handleAction(key, element) {
    if (key === 'story-ask-elder') {
      const fromAlbum = Boolean(element.dataset.albumStory);
      if (fromAlbum && P.state.route !== 'house-elders') return true;
      const id = element.dataset.albumStory || P.state.storyId;
      ask(P.visibleStories().find(item => item.id === id), fromAlbum);
      return true;
    }
    if (key === 'story-photo-question') {
      const form = element.closest('#story-photo-form');
      const question = questions[element.dataset.questionIndex];
      if (form && question) {
        form.elements.question.value = question;
        updateQuestionSelection(form);
      }
      return true;
    }
    if (!key.startsWith('story-photo-')) return false;
    if (key === 'story-photo-copy') {
      void copy(element);
      return true;
    }
    const story = P.visibleStories().find(item => item.id === P.state.storyId);
    if (!story?.photoToken || story.author !== P.state.actor) return true;
    if (key === 'story-photo-followup') {
      void followup(story, element);
    } else {
      const token = element.dataset.inviteToken || element.closest('details')?.dataset.storyInviteToken;
      if (!panel?.card?.invitations.some(item => item.token === token && !item.revoked)) return true;
      if (key === 'story-photo-revoke') {
        P.modal('撤回照片链接', '<p>撤回后，家人无法通过这条链接查看照片或补话。已收到的回复仍留在往事里。</p>' +
          b('确认撤回', 'story-photo-revoke-confirm', 'btn full section', `data-invite-token="${e(token)}"`) + b('继续分享', 'close-modal', 'text-link full'), 'sheet');
      } else if (key === 'story-photo-revoke-confirm') {
        void revokeLink(story, token);
      }
    }
    return true;
  }

  /** 联网恢复后原图仍从现有授权接口读取。 */
  async function loadViewPhoto(image) {
    const state = P.state;
    const { albumPhoto } = image.dataset;
    const story = P.visibleStories().find(item => item.id === albumPhoto);
    if (!invites.network || !story?.photoToken || !story.houseBytes) return;
    try {
      const blob = await invites.photo(story.photoToken, invites.ownerKey());
      if (blob && P.state === state && image.isConnected) {
        const src = URL.createObjectURL(blob);
        viewMediaUrls.push(src);
        image.src = src;
        image.hidden = false;
      }
    } catch {
      // 照片暂不可用时保留原有文字和详情入口。
    }
  }

  document.addEventListener('play', event => {
    const host = panel?.host.contains(event.target) ? panel.host : event.target.closest('[data-album-replies]');
    if (!host) return;
    const story = P.visibleStories().find(item => item.id === (host.dataset.storyInvite || host.dataset.albumReplies));
    if (story?.author === P.state.actor) {
      const heard = Array.from(host.querySelectorAll('audio')).indexOf(event.target) + 1;
      story.guestVoiceSeen = Math.max(story.guestVoiceSeen || 0, heard);
      persistWorkspace();
    }
  }, true);
  invites.subscribe(refreshVisible);
  window.addEventListener('focus', refreshVisible);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshVisible(); });
  P.PhotoStories = { composer, region, askButton, countLabel, albumReplies, homeReplies, loadViewPhoto, mount, submit, handleAction, revokeStory, endSession };
  if (invites.network) {
    try {
      const snapshot = JSON.parse(localStorage.getItem(workspaceKey) || 'null');
      P.Households.restorePhotoWorkspace(snapshot, samplePhoto);
    } catch { /* 本机快照损坏时直接进入当前原型。 */ }
    setInterval(() => { if (!document.hidden) refreshVisible(); }, 3500);
  } else {
    void endSession();
  }
}
