/** 伴侣邀请与双人记录。照片和原声存入同一条往事，家庭可见范围由两人共同确认。 */
'use strict';
{
  const P = window.App, { escape: e, button: b, link: l, icon: i, avatar: a } = P;
  const setupRoute = 'house-couple-setup';
  const albumRoute = 'house-couple';
  const demoRecords = [
    { title: '第一次约会', eventDate: '1988-03-20', author: 'father', mark: '约会', text: ['约在茶馆见面，一聊就到了天黑。'] },
    { title: '第一次旅行', eventDate: '1988-10-02', author: 'mother', mark: '旅行', photo: 'assets/zhumen/couple-first-trip-demo.webp' },
    { title: '领证纪念日', eventDate: '1989-09-16', author: 'father', mark: '纪念日', photo: 'assets/zhumen/life-wedding-demo.webp' }
  ];
  const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxPhotoBytes = 8 * 1024 ** 2;
  let voiceDraft;

  function relation(person = P.state.actor) {
    return P.state.coupleRelations?.find(pair => pair.members.includes(person));
  }

  function activePair() {
    const pair = relation();
    return pair?.status === 'accepted' && pair.members.every(id => P.state.members.includes(id) && P.state.accounts[id]) ? pair : null;
  }

  function otherMember(pair) {
    return pair.members.find(id => id !== P.state.actor);
  }

  function pairStory(pair, id) {
    return pair && P.state.stories.find(story => story.coupleId === pair.id && story.id === id);
  }

  /** 家庭阅读按家庭编号和确认时的名单检查，跨家庭相同的人物编号不能串用。 */
  function familyReadable(story) {
    const grant = story.coupleGrant;
    const { actor, accounts, members } = P.state;
    return Boolean(grant && grant.familyId === P.Households.current()?.id && accounts[actor] &&
      members.includes(actor) && grant.viewers.includes(actor) && story.relatedMembers.every(id => grant.approvedBy.includes(id)));
  }

  /** 指定家庭读取源档案里的同一个对象，切换家庭不复制照片或语音。 */
  function sharedFromOtherFamilies() {
    const current = P.Households.current();
    if (!current) return [];
    return P.Households.families().filter(family => family.id !== current.id)
      .flatMap(family => family.workspace.stories.filter(story => story.coupleId && familyReadable(story)));
  }

  function profileLabel() {
    const pair = relation();
    if (pair?.status === 'accepted') return '伴侣关系';
    if (pair?.invitee === P.state.actor) return '伴侣邀请 · 待确认';
    return pair ? '伴侣邀请 · 等待确认' : '邀请伴侣';
  }

  function previewAs(person) {
    return P.Households.isExample() ? b('切换到' + e(P.PEOPLE[person].name) + '（演示）', 'house-member', 'text-link',
      `data-id="${e(person)}"`) : '';
  }

  function setup() {
    const pair = relation();
    const other = pair && otherMember(pair);
    const name = other ? e(P.PEOPLE[other].name) : '';
    let content;
    if (activePair()) {
      content = `<h2>你和${name}已关联</h2><p class="page-subtitle">到往事里一起记下你们的日子。</p>
        ${l('打开相伴记', albumRoute, 'btn full section')}`;
    } else if (pair?.invitee === P.state.actor) {
      content = `<h2>${name}邀请你一起记录</h2><p class="page-subtitle">确认后，两人可以一起添加照片和原声。</p>
        ${b('接受伴侣邀请', 'couple-accept', 'btn full section', `data-id="${e(pair.id)}"`)}
        ${b('暂不接受', 'couple-dismiss', 'text-link full', `data-id="${e(pair.id)}"`)}`;
    } else if (pair) {
      content = `<h2>已邀请${name}</h2><p class="page-subtitle">等对方确认后，「相伴记」会出现在「记录」里。</p>
        <div class="couple-inline-actions">${previewAs(other)}${b('撤回邀请', 'couple-dismiss', 'text-link', `data-id="${e(pair.id)}"`)}</div>`;
    } else if (P.Households.isExample()) {
      const label = P.state.actor === 'mother' ? '邀请陈远山' : P.state.actor === 'father' ? '邀请林慧' : '以陈远山身份邀请林慧';
      content = `<h2>邀请伴侣</h2><p class="page-subtitle">用陈远山和林慧的示例账号体验双人记录。</p>
        ${b(label, 'couple-demo-invite', 'btn full section')}`;
    } else {
      const candidates = P.Households.memberIds().filter(id => id !== P.state.actor && P.state.accounts[id] && !relation(id));
      content = candidates.length ? `<h2>邀请伴侣</h2><form id="couple-invite-form" class="house-form section">
        <label class="form-field"><span>邀请谁</span><select name="person" required>${candidates.map(id =>
          `<option value="${e(id)}">${e(P.PEOPLE[id].name)}</option>`).join('')}</select></label>
        <button type="submit" class="btn full">发送伴侣邀请</button></form>` :
        `<h2>邀请伴侣</h2><p class="page-subtitle">可以先请伴侣加入家庭，再发出双人记录邀请。</p>
          ${l('查看家人关系与邀请', 'family', 'btn secondary full section')}`;
    }
    return `<div class="page family-edition-page couple-edition"><section class="card couple-panel">${content}</section></div>`;
  }

  function createInvite(from, to) {
    if (from === to || relation(from) || relation(to) ||
        ![from, to].every(id => P.state.accounts[id] && P.state.members.includes(id))) return false;
    const pairs = P.state.coupleRelations ||= [];
    pairs.push({ id: P.nextId('couple'), members: [from, to], invitee: to, status: 'pending' });
    return true;
  }

  function sharing(story, pair) {
    const request = story.coupleRequest;
    const grant = story.coupleGrant;
    const actor = P.state.actor;
    const attrs = `data-story-id="${e(story.id)}"`;
    if (grant) {
      const target = P.Households.families().find(family => family.id === grant.familyId);
      return `<p class="caption">双方已确认 · 已分享给${e(target?.name || '指定家庭')}</p>
        ${b('撤回家庭分享', 'couple-revoke-share', 'text-link', attrs)}`;
    }
    if (request) {
      const target = P.Households.families().find(family => family.id === request.familyId);
      const recipient = e(target?.name || '指定家庭');
      const requestAttrs = `${attrs} data-id="${e(request.id)}"`;
      if (request.by === actor) {
        return `<p class="caption">分享给${recipient} · 等${e(P.PEOPLE[otherMember(pair)].name)}确认</p>
          ${b('撤回申请', 'couple-dismiss-share', 'text-link', requestAttrs)}`;
      }
      return `<p class="caption">${e(P.PEOPLE[request.by].name)}已确认分享给${recipient}</p>
        <div class="couple-inline-actions">${b('同意分享', 'couple-approve-share', 'btn secondary compact', requestAttrs)}
          ${b('暂不分享', 'couple-dismiss-share', 'text-link', requestAttrs)}</div>`;
    }
    return b(i('share') + ' 分享给家人', 'couple-share', 'text-link', attrs);
  }

  function recordByline(story) {
    return `${story.authorName}${story.houseImage ? '上传' : '记录'}${story.coupleSample ? ' · 示例' : ''}`;
  }

  function originalVoice(story) {
    return story.houseVoice ? P.FamilyEditions.voicePlayer(story.houseVoice.url, '听' + story.houseVoice.authorName + '说') : '';
  }

  function albumRecord(story, pair) {
    const photo = Boolean(story.houseImage);
    const share = `<div class="couple-sharing">${sharing(story, pair)}</div>`;
    let extra;
    if (photo) {
      const voice = story.houseVoice ? originalVoice(story) : story.author === P.state.actor ?
        `<p class="caption">等${e(P.PEOPLE[otherMember(pair)].name)}补一句</p>` :
        b(i('mic') + ' 补一句语音', 'couple-record', 'btn secondary compact', `data-story-id="${e(story.id)}"`);
      extra = `<div class="couple-original-voice">${voice}</div>${share}`;
    } else {
      extra = `<div class="couple-note-footer"><p class="caption">${e(story.text[0] || '')}</p>${share}</div>`;
    }
    const tile = P.FamilyEditions.albumTile({ item: story, kind: photo ? 'photo' : 'story' },
      { byline: recordByline(story), mark: story.coupleMark, scopeLabel: '', extra });
    return `<article class="album-tile couple-memory" id="couple-record-${e(story.id)}" data-couple-record="${e(story.id)}">${tile}</article>`;
  }

  /** 发生日期决定相册顺序，分享和补录只更新对应原记录。 */
  function timeline(pair) {
    const entries = P.state.stories.filter(story => story.coupleId === pair.id).map(story => {
      const period = P.FamilyEditions.calendarTime(story.eventDate) || P.FamilyEditions.calendarTime(story.date);
      return { story, period, date: period?.date };
    }).sort((left, right) => (left.period?.order ?? Infinity) - (right.period?.order ?? Infinity));
    const periods = new Map();
    for (const entry of entries) {
      const key = entry.period?.key || 'undated';
      if (!periods.has(key)) periods.set(key, { key, label: entry.period?.label || '日期待补充', entries: [] });
      periods.get(key).entries.push(entry);
    }
    const sections = [...periods.values()].map(({ key, label, entries: records }) => ({ key, label,
      body: P.FamilyEditions.albumDays(records, ({ story }) => albumRecord(story, pair), date => `${date.month} 月 ${date.day} 日`) }));
    return sections.length ? P.FamilyEditions.album(pair.id, 'couple', sections) :
      '<section class="card couple-panel section"><h2>从一张合照开始</h2><p class="page-subtitle">对方可以在照片下留一段原声。</p></section>';
  }

  function album() {
    const pair = activePair();
    if (!pair) return `<div class="page"><div class="empty">${i('lock')}<h2>双方确认后可查看</h2>
      ${l('查看伴侣邀请', setupRoute, 'btn secondary')}</div></div>`;
    return `<div class="page family-edition-page couple-edition">
      <div class="couple-heading"><div class="couple-avatars">${pair.members.map(id => a(id)).join('')}</div>
        <div><strong>${pair.members.map(id => e(P.PEOPLE[id].name)).join(' · ')}</strong>
          <p class="caption">${i('lock')} 默认仅两人可见</p></div>
        ${b(i('plus') + ' 添加照片', 'couple-photo', 'btn secondary compact')}</div>
      <div class="couple-inline-actions">${previewAs(otherMember(pair))}${l('伴侣关系', setupRoute, 'text-link')}</div>
      ${timeline(pair)}</div>`;
  }

  function detail(id, visible) {
    const own = pairStory(activePair(), id);
    const story = own || (visible?.coupleId ? visible : null);
    if (!story) return '';
    const shared = familyReadable(story);
    const fromAlbum = P.state.history?.at(-1) === albumRoute;
    const back = fromAlbum ? b(i('back') + ' 返回相伴记', 'back', 'text-link') :
      l(i('back') + (shared ? ' 返回记录' : ' 返回相伴记'), shared ? 'house-stories/family' : albumRoute, 'text-link');
    const photo = story.houseImage ? `<figure class="couple-photo"><img src="${e(story.houseImage)}" alt="${e(story.title)}"></figure>` : '';
    return `<div class="page archive-detail couple-edition"><div class="edition-album">
      ${back}<p class="caption">${shared ? '两人已确认分享给这个家' : '仅两人可见'}</p>
      <h2 class="page-title">${e(story.title)}</h2><p class="caption">${e(story.date)} · ${e(recordByline(story))}</p>
      ${photo}${story.text.map(line => `<p class="story-paragraph">${e(line)}</p>`).join('')}${originalVoice(story)}</div></div>`;
  }

  function photoForm() {
    P.modal('添加照片', `<form id="couple-photo-form" class="house-form">
      <label class="family-upload-file">${i('photo')}<span><strong>选择照片</strong><small data-couple-file-name>单张最多 8 MB</small></span>
        <input type="file" name="photo" accept="${photoTypes.join(',')}" required></label>
      <label class="form-field"><span>标题（选填）</span><input name="title" maxlength="40" placeholder="如 一起去看海"></label>
      <label class="form-field"><span>拍摄日期（默认今天）</span><input name="date" type="date" max="${P.FamilyEditions.today()}" value="${P.FamilyEditions.today()}"></label>
      <button type="submit" class="btn full">保存到相册</button></form>`, 'sheet');
  }

  function createRecord(pair, { title, eventDate, author = P.state.actor, photo = '', bytes = 0, mark = '', text = [], sample = false }) {
    const now = new Date();
    const familyId = P.Households.current().id;
    const id = P.nextId('couple-story-' + familyId);
    // 原照片和语音继续归在一条往事里，每条各自记录公开授权。
    P.state.stories.push({
      id, coupleId: pair.id, coupleFamilyId: familyId, coupleMark: mark, coupleSample: sample,
      title, category: '两个人的日子', author, authorName: P.PEOPLE[author].name,
      relatedMembers: [...pair.members], fromFamily: true, scope: 'private', viewers: [], text,
      date: new Date(eventDate + 'T00:00:00').toLocaleDateString('zh-CN', { dateStyle: 'long' }), eventDate, year: eventDate.slice(0, 4),
      recorded: now.toLocaleDateString('zh-CN'), recordedAt: now.getTime(), houseImage: photo, houseBytes: bytes
    });
    return id;
  }

  function seedDemo(pair) {
    if (!P.Households.isExample() || !['father', 'mother'].every(id => pair.members.includes(id))) return;
    if (P.state.stories.some(story => story.coupleId === pair.id)) return;
    for (const record of demoRecords) createRecord(pair, { ...record, sample: true });
  }

  function savePhoto(form, pair) {
    const photo = form.elements.photo.files[0];
    if (!photo?.size || photo.size > maxPhotoBytes || !photoTypes.includes(photo.type)) {
      P.toast('请选择 8 MB 内的 JPG、PNG 或 WebP 照片。');
      return;
    }
    if (!P.Households.canUpload(photo.size)) return P.toast('当前家庭空间不足。');
    const title = form.elements.title.value.trim() || '一张合照';
    const eventDate = form.elements.date.value || P.FamilyEditions.today();
    if (!P.FamilyEditions.validDate(eventDate)) return P.toast('请填写有效的拍摄日期。');
    if (title.length > 40) return P.toast('标题最多 40 字。');
    const id = createRecord(pair, { title, eventDate, photo: URL.createObjectURL(photo), bytes: photo.size });
    P.closeModal();
    P.render();
    document.getElementById('couple-record-' + id)?.scrollIntoView({ block: 'nearest' });
  }

  function shareForm(story) {
    const currentId = P.Households.current().id;
    const options = P.Households.families().map(family =>
      `<option value="${e(family.id)}" ${family.id === currentId ? 'selected' : ''}>${e(family.name)}</option>`).join('');
    P.modal('分享给家人', `<form id="couple-share-form" class="house-form" data-story-id="${e(story.id)}">
      <p>《${e(story.title)}》</p>
      <label class="form-field"><span>选择家庭</span><select name="family" required>${options}</select></label>
      <p class="caption">两人确认后，这个家庭可以查看这一条记录。</p>
      <button type="submit" class="btn full">确认并请伴侣确认</button></form>`, 'sheet');
  }

  function saveShareRequest(form, story) {
    if (!story || story.coupleRequest || story.coupleGrant) return;
    const target = P.Households.families().find(family => family.id === form.elements.family.value);
    if (!target) return P.toast('请选择一个家庭。');
    // 第一位确认时固定目标与名单，新加入的家人需要双方另行确认。
    story.coupleRequest = { id: P.nextId('couple-share'), by: P.state.actor, familyId: target.id, viewers: [...target.workspace.members] };
    P.closeModal();
    P.render();
  }

  function closeRecorder() {
    const draft = voiceDraft;
    if (!draft) return;
    voiceDraft = null;
    draft.recorder.cancel();
    draft.host.querySelector('audio')?.pause();
    if (draft.url) URL.revokeObjectURL(draft.url);
  }

  function currentDraft(draft) {
    return draft === voiceDraft && draft.state === P.state && draft.actor === P.state.actor &&
      P.state.route === albumRoute && draft.host.isConnected && draft.host.closest('dialog')?.open &&
      pairStory(activePair(), draft.story.id) === draft.story && !draft.story.houseVoice;
  }

  function drawRecorder(draft, status = '') {
    if (!currentDraft(draft)) return;
    const { host, phase, url } = draft;
    const record = phase === 'recording' ? b('说完了', 'couple-voice-stop', 'btn full') :
      b(url ? '重新录音' : '开始录音', 'couple-voice-start', 'btn secondary full', phase ? 'disabled' : '');
    host.innerHTML = `<p class="caption" role="status">${e(status || '说说你记得的那一刻，最多 1 分钟。')}</p>${record}
      ${url ? `<audio class="couple-voice-preview" controls src="${e(url)}" aria-label="试听语音"></audio>
        ${b('保存到照片下', 'couple-voice-save', 'btn full')}` : ''}`;
  }

  function openRecorder(story) {
    closeRecorder();
    P.modal('补一句语音', '<div id="couple-voice-recorder" class="stack"></div>', 'sheet');
    const draft = { state: P.state, actor: P.state.actor, story, host: document.getElementById('couple-voice-recorder'), phase: '' };
    draft.recorder = window.FamilyVoice.create({
      onStart: () => { draft.phase = 'recording'; drawRecorder(draft, '正在录音 · 00:00'); },
      onTime: seconds => {
        if (currentDraft(draft) && draft.phase === 'recording') draft.host.querySelector('[role="status"]').textContent = '正在录音 · ' + P.duration(seconds);
      },
      onAudio: audio => {
        if (!currentDraft(draft)) return;
        draft.phase = '';
        draft.audio = audio;
        draft.url = URL.createObjectURL(audio);
        drawRecorder(draft, '录好了，可以先试听。');
      },
      onError: () => { draft.phase = ''; drawRecorder(draft, '请允许使用麦克风，再试一次。'); }
    });
    voiceDraft = draft;
    drawRecorder(draft);
  }

  function recordAction(action) {
    const draft = voiceDraft;
    if (!draft || !currentDraft(draft)) return;
    if (action === 'couple-voice-start' && !draft.phase) {
      draft.host.querySelector('audio')?.pause();
      if (draft.url) URL.revokeObjectURL(draft.url);
      draft.url = '';
      draft.phase = 'starting';
      drawRecorder(draft, '请允许使用麦克风。');
      void draft.recorder.start();
    } else if (action === 'couple-voice-stop' && draft.phase === 'recording') {
      draft.phase = 'saving';
      drawRecorder(draft, '正在准备试听…');
      draft.recorder.stop();
    } else if (action === 'couple-voice-save' && draft.url && !draft.phase) {
      if (!P.Households.canUpload(draft.audio.size)) return P.toast('当前家庭空间不足。');
      const story = draft.story;
      const hadShare = story.coupleRequest || story.coupleGrant;
      // 两次确认只覆盖当时的内容，后来补录的声音需要重新确认。
      delete story.coupleRequest;
      delete story.coupleGrant;
      story.houseVoice = { url: draft.url, bytes: draft.audio.size, authorName: P.PEOPLE[draft.actor].name };
      draft.url = '';
      P.closeModal();
      P.render();
      if (hadShare) P.toast('语音已保存，分享前请两人重新确认。');
    }
  }

  function handleAction(action, element) {
    if (!action.startsWith('couple-')) return false;
    const actor = P.state.actor;
    if (P.state.route === setupRoute) {
      const pair = relation();
      if (action === 'couple-demo-invite' && P.Households.isExample() && !pair) {
        const from = actor === 'mother' ? 'mother' : 'father';
        P.state.accounts.mother ||= P.newAccount();
        if (createInvite(from, from === 'father' ? 'mother' : 'father')) {
          if (actor !== from) P.changeActor(from);
          else P.render();
        } else P.toast('已有一份伴侣邀请正在处理。');
      } else if (pair?.status === 'pending' && pair.id === element.dataset.id) {
        if (action === 'couple-accept' && pair.invitee === actor) {
          pair.status = 'accepted';
          seedDemo(pair);
          P.navigate('house-stories/family');
        } else if (action === 'couple-dismiss') {
          P.state.coupleRelations = P.state.coupleRelations.filter(item => item !== pair);
          P.render();
        }
      }
      return true;
    }
    const pair = activePair();
    if (P.state.route !== albumRoute || !pair) return true;
    if (action === 'couple-photo') { photoForm(); return true; }
    if (action.startsWith('couple-voice-')) { recordAction(action); return true; }
    const story = pairStory(pair, element.dataset.storyId);
    if (!story) return true;
    const request = story.coupleRequest;
    if (action === 'couple-record' && story.houseImage && story.author !== actor && !story.houseVoice) openRecorder(story);
    if (action === 'couple-share' && !request && !story.coupleGrant) shareForm(story);
    if (action === 'couple-approve-share' && request && request.id === element.dataset.id && request.by !== actor &&
        P.Households.families().some(family => family.id === request.familyId)) {
      story.coupleGrant = { familyId: request.familyId, viewers: request.viewers, approvedBy: [request.by, actor] };
      delete story.coupleRequest;
      P.render();
    }
    if (action === 'couple-dismiss-share' && request && request.id === element.dataset.id) { delete story.coupleRequest; P.render(); }
    if (action === 'couple-revoke-share' && story.coupleGrant) { delete story.coupleGrant; P.render(); }
    return true;
  }

  function submit(form) {
    if (form.id === 'couple-invite-form') {
      if (form.isConnected && P.state.route === setupRoute) {
        if (createInvite(P.state.actor, form.elements.person.value)) P.render();
        else P.toast('这位家人当前无法接受邀请。');
      }
      return true;
    }
    if (!['couple-photo-form', 'couple-share-form'].includes(form.id)) return false;
    const pair = activePair();
    if (!pair || P.state.route !== albumRoute || !form.isConnected || !form.closest('dialog')?.open) return true;
    if (form.id === 'couple-photo-form') savePhoto(form, pair);
    else saveShareRequest(form, pairStory(pair, form.dataset.storyId));
    return true;
  }

  document.addEventListener('change', event => {
    const file = event.target;
    if (file.form?.id === 'couple-photo-form' && file.name === 'photo') {
      file.form.querySelector('[data-couple-file-name]').textContent = file.files[0]?.name || '单张最多 8 MB';
    }
  });
  window.addEventListener('pagehide', closeRecorder);
  Object.assign(P.views, { [setupRoute]: setup, [albumRoute]: album });
  P.Couples = { profileLabel, hasAlbum: () => Boolean(activePair()), familyReadable, sharedFromOtherFamilies, detail, handleAction, submit, closeRecorder };
}
