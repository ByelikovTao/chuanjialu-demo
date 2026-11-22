/** 爸妈的相框原型。两个操作端共用当前家庭的往事，设备状态保留在当前页面内存。 */
'use strict';
{
  const P = window.App;
  const { escape: e, icon: i, button: b, link: l } = P;
  const root = document.getElementById('house-screen-demo');
  const workspaces = new Map();
  const oldPhoto = 'father-first-work-photo';
  const sampleAudio = 'assets/photo-card/sample-reply.wav';
  const tabs = { gift: '准备礼物', photos: '添照片', device: '设备设置' };
  const browseSections = {
    new: { title: '看新照片', icon: 'photo', empty: '新送到相框的照片会出现在这里。' },
    people: { title: '按人找照片', icon: 'family', empty: '家人投来有关联人物的照片后，就能按人翻看。' },
    stories: { title: '讲讲这张', icon: 'mic', empty: '家人邀请你讲照片里的故事时，照片和问题会出现在这里。' }
  };
  const entryReturnLabels = { home: '返回我家', 'house-picks': '返回优选', 'home-album': '返回相册' };
  const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxPhotoBytes = 8 * 1024 * 1024;
  const calendar = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  const slideshowInterval = 9000;
  let demo;
  let actor;
  let route;
  let tab;
  let selected;
  let note;
  let notice = '';
  let draft;
  let slideshow;
  let gift;
  let photoDrafts;
  let dailyDraftIds;
  let dailyMembers = [];
  let dailyNote = '';
  let loadingDaily = false;

  function button(label, action, kind = 'secondary', attrs = '') {
    return `<button type="button" class="screen-button ${kind}" data-screen-action="${action}" ${attrs}>${label}</button>`;
  }

  function clock(now) {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} · ${calendar.format(now)}`;
  }

  function minutes(time) {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  function name(id) {
    return P.PEOPLE[id]?.name || '家人';
  }

  function storyById(id) {
    return P.state.stories.find(story => story.id === id);
  }

  /** 客厅设备是额外的展示对象，只接受本家庭作者明确投送的全家可见照片。 */
  function shareable(story) {
    return Boolean(story?.houseImage && !story.coupleId && story.scope === 'family' &&
      P.state.members.every(id => story.viewers?.includes(id)));
  }

  function sendable(story) {
    return shareable(story) && story.author === P.state.actor && P.FamilyContext.readable(story);
  }

  function workspace() {
    if (workspaces.has(P.state)) return workspaces.get(P.state);
    const example = P.Households.isExample();
    const d = {
      residents: example ? ['father', 'mother'] : ['father'], bound: example, online: true,
      paused: false, volume: 75, quietStart: '22:00', quietEnd: '07:00',
      delivered: new Map(), queued: new Map(), replies: new Map(), activeId: '', browse: null,
      gift: null, opening: false, openingUntil: 0, importedUrls: new Set()
    };
    if (example) {
      for (const id of [oldPhoto, 'nian-first-new-year']) {
        const story = storyById(id);
        if (shareable(story)) {
          const question = id === oldPhoto ? { text: '爸，你还记得第一天上班吗？' } : null;
          d.delivered.set(id, { sender: story.author, note: '', giftOnly: true, question });
        }
      }
      d.activeId = d.delivered.keys().next().value || '';
      if (d.delivered.has(oldPhoto)) {
        d.gift = { coverId: oldPhoto, note: '爸，生日快乐！这张是你第一天上班时拍的，还记得吗？', src: '' };
        showCover(d);
      }
    }
    workspaces.set(P.state, d);
    return d;
  }

  /** 入口读取已有绑定状态；陈家未打开过相框时沿用演示机的默认配对。 */
  function isBound() {
    return workspaces.get(P.state)?.bound ?? P.Households.isExample();
  }

  function homeEntry() {
    const bound = isBound();
    const label = bound ? '给爸妈添照片' : '准备相框礼物';
    const panel = bound ? 'photos' : 'gift';
    return l(`${i('screen')}<span>${label}</span>`, `house-screen//${panel}/home`, 'paper-link home-screen-entry');
  }

  function quiet(d, now = new Date()) {
    const start = minutes(d.quietStart);
    const end = minutes(d.quietEnd);
    const time = now.getHours() * 60 + now.getMinutes();
    return start > end ? time >= start || time < end : time >= start && time < end;
  }

  function connectionLabel(d, now) {
    if (!d.bound) return '待绑定';
    if (!d.online) return '离线';
    return quiet(d, now) ? '安静时段' : '在线';
  }

  function showCover(d) {
    d.browse = null;
    d.activeId = d.gift.coverId;
    d.opening = true;
    // 开机多留一个轮播周期读祝福。即便爸妈不碰按钮，相框也会自己开始放照片。
    d.openingUntil = Date.now() + 2 * slideshowInterval;
    d.paused = false;
  }

  /** 往事收窄授权后，撤掉已显示和排队的内容，避免重新授权时自动上屏。 */
  function prune(d) {
    for (const entries of [d.delivered, d.queued]) {
      for (const id of entries.keys()) {
        if (!shareable(storyById(id))) entries.delete(id);
      }
    }
    if (!d.delivered.has(d.activeId)) d.activeId = d.delivered.keys().next().value || '';
    if (d.browse?.photo && !d.delivered.has(d.browse.photo)) d.browse.photo = '';
    if (d === demo && draft && !d.delivered.has(draft.id)) cancelVoice();
    if (d.gift && !d.delivered.has(d.gift.coverId)) clearGift(d);
    else if (d.gift?.ids) d.gift.ids = d.gift.ids.filter(id => d.delivered.has(id));
  }

  function clearGift(d) {
    if (d.gift?.src) URL.revokeObjectURL(d.gift.src);
    d.gift = null;
    d.opening = false;
  }

  function availablePhotos() {
    return [...P.state.stories.filter(sendable), ...photoDrafts.values()];
  }

  /** 选照片只产生当前操作人的本机草稿，确认装入或投送时才加入全家可见的往事。 */
  async function importPhotos(files) {
    const drafts = photoDrafts;
    const photos = [];
    let rejected = 0;
    for (const file of files) {
      if (drafts !== photoDrafts) break;
      if (!photoTypes.includes(file.type) || !file.size || file.size > maxPhotoBytes) {
        rejected++;
        continue;
      }
      const url = URL.createObjectURL(file);
      try {
        const preview = new Image();
        preview.src = url;
        await preview.decode();
        if (drafts !== photoDrafts) {
          URL.revokeObjectURL(url);
          break;
        }
        const story = P.Households.createStoryDraft({
          title: file.name.replace(/\.[^.]+$/, '') || '家里的照片', text: [], moment: true,
          photoUrl: url, bytes: file.size, relatedMembers: [P.state.actor]
        });
        drafts.set(story.id, story);
        photos.push(story);
      } catch {
        URL.revokeObjectURL(url);
        rejected++;
      }
    }
    return { photos, rejected };
  }

  function publishPhotos(d, ids, relatedMembers = []) {
    const items = ids.map(id => photoDrafts.get(id) || storyById(id));
    if (!items.length || !items.every(sendable)) {
      notice = '有照片已无法分享，请重新选一次。';
      return false;
    }
    const fresh = items.filter(item => photoDrafts.has(item.id));
    if (fresh.length && !P.Households.canUpload(fresh.reduce((sum, item) => sum + item.houseBytes, 0))) {
      notice = '家庭空间不足，请减少本次发送的照片。';
      return false;
    }
    for (const item of fresh) {
      if (relatedMembers.length) item.relatedMembers = P.Households.memberIds(relatedMembers);
      P.state.stories.push(item);
      photoDrafts.delete(item.id);
      d.importedUrls.add(item.houseImage);
    }
    return true;
  }

  function prepareGift(d, { ids, coverId, note: greeting, audio }) {
    if (!ids.includes(coverId) || !publishPhotos(d, ids)) return false;
    cancelVoice();
    clearGift(d);
    // 替换首批预装照片。另行投送的日常照片保留，撤选的礼物照片不会继续轮播。
    const previous = d.delivered;
    d.delivered = new Map();
    for (const id of [coverId, ...ids.filter(id => id !== coverId)]) {
      const queued = d.online ? d.queued.get(id) : null;
      const delivery = queued || previous.get(id) || { sender: actor, note: '', giftOnly: true };
      d.delivered.set(id, delivery);
      // 预装照片本身可离线查看，远程排队的提问和新照提示仍要等联网。
      if (queued) d.queued.delete(id);
    }
    for (const [id, delivery] of previous) {
      if (!delivery.giftOnly && !d.delivered.has(id)) d.delivered.set(id, delivery);
    }
    d.gift = { ids, coverId, sender: actor, note: greeting, audio, src: audio ? URL.createObjectURL(audio) : '' };
    showCover(d);
    pick(coverId);
    notice = '首批照片已装进相框，爸妈开机先看到你选的这一张。';
    return true;
  }

  function say(message) {
    if (!('speechSynthesis' in window) || !demo.volume) return;
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'zh-CN';
    speech.volume = demo.volume / 100;
    speechSynthesis.cancel();
    speechSynthesis.speak(speech);
  }

  function speakerOptions(d, value) {
    return d.residents.map(id => `<option value="${e(id)}" ${id === value ? 'selected' : ''}>${e(name(id))}</option>`).join('');
  }

  function photoButton(story, { fromAlbum = false } = {}) {
    if (!sendable(story) || (fromAlbum && !isBound())) return '';
    const target = 'house-screen/' + e(story.id);
    if (fromAlbum) {
      return l(i('screen') + ' 投到爸妈的相框', target + '/photos/home-album', 'paper-link album-print-send');
    }
    return l(i('screen') + ' 投送到爸妈的相框', target, 'text-link section screen-story-cast');
  }

  function storyReplies(story) {
    if (!P.state.stories.includes(story) || !P.FamilyContext.readable(story)) return [];
    return workspaces.get(P.state)?.replies.get(story.id) || [];
  }

  function voices(story, inAlbum = false) {
    const replies = storyReplies(story);
    if (!replies.length) return '';
    if (inAlbum) return replies.map(reply => P.FamilyEditions.voicePlayer(reply.src, name(reply.person) + (reply.sample ? ' · 示例回话' : ' · 大屏原声'))).join('');
    return `<section class="screen-story-voices section"><h2>大屏回话</h2>${voiceList(replies)}</section>`;
  }

  function voiceList(replies) {
    return replies.map(reply => `<div class="screen-voice"><strong>${e(name(reply.person))} · ${reply.sample ? '示例语音' : '大屏原声'}</strong>
      <audio controls preload="none" src="${e(reply.src)}" aria-label="听${e(name(reply.person))}的回话"></audio></div>`).join('');
  }

  function bookVoices(story) {
    const replies = storyReplies(story).filter(reply => reply.inBook);
    if (!replies.length) return '';
    return `<section class="book-photo-voices section" aria-label="大屏讲述">${voiceList(replies)}</section>`;
  }

  function replyControls(d) {
    const { phase, src, person, message } = draft;
    const waiting = phase === 'permission' || phase === 'stopping';
    const recording = phase === 'recording';
    return `<div class="screen-reply">
      <p data-screen-recording-status role="status">${e(message)}</p>
      ${src ? `<audio controls preload="metadata" src="${e(src)}" aria-label="试听要发送的回话"></audio>
        <label class="screen-field"><span>讲述人</span><select name="speaker">${speakerOptions(d, person)}</select></label>` : ''}
      <div class="screen-actions">
        ${src ? button('发送并留在照片下', 'send-voice', 'primary') : button(i(recording ? 'stop' : 'mic') +
          (recording ? ' 说完了' : ' 开始录音'), 'record', 'primary', waiting ? 'disabled' : '')}
        ${!src && !waiting && !recording ? button('用示例语音', 'sample-voice') : ''}
        ${button('取消', 'cancel-voice', 'plain')}
      </div>
    </div>`;
  }

  function visiblePhotoId(d) {
    return d.browse?.photo || d.activeId;
  }

  /** 三个入口只查看已经到达相框且仍可分享的照片。 */
  function screenPhotos(d) {
    const photos = [];
    for (const [id, delivery] of d.delivered) {
      const story = storyById(id);
      if (shareable(story)) photos.push({ story, delivery });
    }
    return photos;
  }

  function browsePhotos(d, photos = screenPhotos(d)) {
    if (d.browse.type === 'new') {
      return photos.filter(({ delivery }) => delivery.unseen).sort((a, b) => b.delivery.receivedAt - a.delivery.receivedAt);
    }
    if (d.browse.type === 'stories') return photos.filter(({ delivery }) => delivery.question);
    return photos.filter(({ story }) => P.Households.relatedMemberIds(story).includes(d.browse.member));
  }

  function discoveryNav(d) {
    const photos = screenPhotos(d);
    const counts = {
      new: photos.filter(({ delivery }) => delivery.unseen).length,
      stories: photos.filter(({ story, delivery }) => delivery.question &&
        !d.replies.get(story.id)?.some(reply => reply.question === delivery.question)).length
    };
    return `<nav class="screen-discovery" aria-label="相框功能">${Object.entries(browseSections).map(([id, section]) => {
      const count = counts[id];
      const label = `${i(section.icon)}<span>${section.title}</span>${count ? `<small class="screen-count">${count}</small>` : ''}`;
      return button(label, 'browse-' + id, 'secondary screen-discovery-button' + (id === 'new' && count ? ' is-new' : ''),
        `aria-pressed="${d.browse?.type === id}" ${draft ? 'disabled' : ''}`);
    }).join('')}</nav>`;
  }

  function personCards(photos) {
    return P.Households.memberIds().map(id => {
      const count = photos.filter(({ story }) => P.Households.relatedMemberIds(story).includes(id)).length;
      if (!count) return '';
      return button(`${P.avatar(id, 'screen-browse-avatar')}<span class="screen-browse-label">${e(name(id))}</span>
        <small class="screen-browse-meta">${count} 张照片</small>`, 'browse-person', 'secondary screen-browse-card', `data-id="${e(id)}"`);
    }).join('');
  }

  function photoCards(d, photos) {
    return photos.map(({ story, delivery }) => {
      const count = d.replies.get(story.id)?.filter(reply => reply.question === delivery.question).length || 0;
      const detail = d.browse.type === 'stories' ? (count ? `已有 ${count} 段讲述` : '等你讲一讲') : `${name(delivery.sender)}发来`;
      return button(`<img class="screen-browse-image" src="${e(story.houseImage)}" alt="" loading="lazy">
        <span class="screen-browse-label">${e(story.title)}</span><small class="screen-browse-meta">${e(detail)}</small>`,
      'browse-photo', 'secondary screen-browse-card', `data-id="${e(story.id)}"`);
    }).join('');
  }

  function browseView(d) {
    const { type, member, photo } = d.browse;
    const section = browseSections[type];
    const title = member ? `${name(member)}的照片` : section.title;
    const back = photo ? '返回列表' : member ? '返回家人' : '回到轮播';
    const cards = photo ? '' : type === 'people' && !member ? personCards(screenPhotos(d)) : photoCards(d, browsePhotos(d));
    return `<section class="screen-browse" aria-label="${e(title)}">
      <header class="screen-browse-header"><h3 tabindex="-1">${e(title)}</h3>
        ${button(i('back') + back, 'browse-back', 'secondary screen-browse-back', draft ? 'disabled' : '')}</header>
      ${photo ? screenPhoto(d) : cards ? `<div class="screen-browse-grid">${cards}</div>` :
        `<p class="screen-empty">${member ? '相框里暂时没有这位家人的照片。' : section.empty}</p>`}
    </section>`;
  }

  function screenPhoto(d) {
    const id = visiblePhotoId(d);
    const story = storyById(id);
    const delivery = d.delivered.get(id);
    if (!delivery || !shareable(story)) {
      return `<div class="screen-photo-empty">${i('photo')}<p>${d.bound ? '等家人送来一张照片' : '用手机绑定这台屏'}</p>
        ${d.bound ? '' : '<small>演示配对码 486 217</small>'}</div>`;
    }
    const locked = Boolean(draft);
    const greeting = !d.browse && d.gift?.coverId === story.id ? d.gift : null;
    const question = d.browse ? (draft ? draft.question : delivery.question)?.text : '';
    const canReply = d.online && d.bound;
    const photoYear = story.photoYear || (story.moment ? '' : story.year);
    return `<figure class="screen-photo">
      <img src="${e(story.houseImage)}" alt="${e(story.title)}">
      <figcaption><strong>${e(story.title)}</strong><span>${e(name(delivery.sender))} ${delivery.giftOnly ? '选给爸妈的' : '发来'}${photoYear ? ' · ' + e(photoYear) : ''}</span></figcaption>
      ${!d.browse && d.delivered.size > 1 ? `<div class="screen-photo-steps" aria-label="轮播照片">
        ${button(i('back'), 'prev-photo', 'plain', 'aria-label="上一张照片"' + (locked ? ' disabled' : ''))}
        ${button(i('arrow'), 'next-photo', 'plain', 'aria-label="下一张照片"' + (locked ? ' disabled' : ''))}
      </div>` : ''}
    </figure>
    ${greeting && (d.opening || greeting.note || greeting.src) ? `<section class="screen-gift-intro">
      <strong>${d.opening ? '给爸妈的开机礼物' : '家人的祝福'}</strong>
      ${greeting.note ? `<p>${e(greeting.note)}</p>` : ''}
      ${greeting.src ? `<audio controls preload="metadata" aria-label="听家人的祝福" src="${e(greeting.src)}"></audio>` : ''}
      ${d.opening ? button('开始看照片', 'open-frame', 'secondary') : ''}
    </section>` : ''}
    ${question ? `<section class="screen-question"><strong>${e(name(delivery.sender))}想问你</strong><p>${e(question)}</p></section>` : ''}
    ${delivery.note ? `<p class="screen-message">${e(delivery.note)}</p>` : ''}
    ${draft ? replyControls(d) : `<div class="screen-actions">
      ${delivery.note ? button(i('volume') + ' 听留言', 'listen') : ''}
      ${d.browse?.type === 'new' ? button(`<span aria-hidden="true">${delivery.liked ? '♥' : '♡'}</span> 喜欢这张`,
        'like-photo', 'secondary', `aria-pressed="${Boolean(delivery.liked)}" ${canReply ? '' : 'disabled'}`) : ''}
      ${button(i('mic') + (question ? ' 开始讲述' : ' 回一句'), 'reply', 'primary', canReply ? '' : 'disabled')}
    </div>`}`;
  }

  function deviceView(d) {
    return `<div class="screen-device" id="screen-device" tabindex="-1">
      <div class="screen-bezel wood-frame"><div class="screen-glass">
        <header class="screen-device-header"><strong>${i('home')} 爸妈客厅</strong>
          <time class="screen-frame-clock">${clock(new Date())}</time>
          <span class="screen-chip ${d.online && d.bound ? 'is-online' : ''}">${connectionLabel(d)}</span></header>
        <div class="screen-device-grid">${discoveryNav(d)}<div class="screen-gallery">${d.browse ? browseView(d) : screenPhoto(d)}</div></div>
        ${!d.bound && d.delivered.size ? '<p class="screen-sync">演示配对码 486 217 · 联网后可以收新照片</p>' : ''}
        <footer class="screen-device-footer"><span>${e(P.Households.current().name)}</span>
          <div>${button(i(d.paused ? 'play' : 'pause') + (d.paused ? ' 继续轮播' : ' 暂停轮播'), 'pause', 'plain',
            `aria-pressed="${d.paused}" ${d.browse || d.delivered.size < 2 ? 'disabled' : ''}`)}
            <label class="screen-volume">${i('volume')}<input type="range" name="volume" aria-label="大屏音量" min="0" max="100" value="${d.volume}"></label></div>
        </footer>
      </div></div><div class="screen-stand" aria-hidden="true"></div>
    </div>`;
  }

  function dailyMemberFields() {
    return `<fieldset class="screen-daily-members"><legend>照片里有谁（选填）</legend>
      <div class="screen-daily-member-options">${P.Households.memberIds().map(id => `<label>
        <input type="checkbox" name="daily-members" value="${e(id)}" ${dailyMembers.includes(id) ? 'checked' : ''}>${e(name(id))}
      </label>`).join('')}</div>
    </fieldset>`;
  }

  function photoReplies(replies) {
    if (!replies.length) return '';
    const inBook = replies.some(reply => reply.inBook);
    return `<section class="screen-story-replies" aria-label="原照片的回话">${replies.map((reply, index) => `<div>
      ${reply.question ? `<p class="screen-caption">${e(reply.question.text)}</p>` : ''}${voiceList([reply])}
      ${reply.question && !reply.inBook ? button('选入纪事册', 'archive-reply', 'secondary', `data-id="${index}"`) : ''}
      ${reply.inBook ? '<p class="screen-caption">已选入纪事册样页</p>' : ''}</div>`).join('')}
      ${inBook ? l('预览纪事册', 'house-book', 'screen-button secondary') : ''}</section>`;
  }

  function photoPanel(d) {
    const stories = P.state.stories.filter(sendable);
    const item = stories.find(story => story.id === selected);
    const replies = d.replies.get(item?.id) || [];
    const sent = item && d.delivered.get(item.id);
    const queued = item && d.queued.has(item.id);
    const status = queued ? '待送达 · 大屏离线' : sent ? '已送达爸妈客厅' : '待投送';
    const dailyPhotos = dailyDraftIds.map(id => photoDrafts.get(id) || storyById(id)).filter(Boolean);
    return `<div class="screen-phone-content">
      <label class="screen-field screen-import-field"><span>从手机相册挑新照片</span>
        <input type="file" name="daily-files" multiple accept="image/jpeg,image/png,image/webp" ${loadingDaily ? 'disabled' : ''}></label>
      ${loadingDaily ? '<p role="status">正在读取照片…</p>' : ''}
      ${dailyPhotos.length ? `<div class="screen-selected"><img src="${e(dailyPhotos[0].houseImage)}" alt=""><div><strong>已选 ${dailyPhotos.length} 张</strong>
        <p>${e(dailyPhotos.map(photo => photo.title).join('、'))}</p></div></div>
        <p class="screen-caption">发送后，这些照片会存为全家可见的往事。</p>
        ${dailyMemberFields()}
        <label class="screen-field"><span>捎句话（选填）</span><input name="daily-note" maxlength="80" value="${e(dailyNote)}"></label>
        ${button('把选好的照片发到相框', 'send-daily', 'primary', d.bound && !loadingDaily ? '' : 'disabled')}
        ${button('取消选择', 'cancel-daily', 'plain')}` : ''}
      ${!d.bound ? '<p class="screen-caption">首次远程添照，请家人到「设备设置」帮相框联网并绑定。</p>' : ''}
      ${item ? `<form data-screen-form="cast">
        <label class="screen-field"><span>从已分享的往事选一张</span><select name="photo">${stories.map(story =>
          `<option value="${e(story.id)}" ${story.id === selected ? 'selected' : ''}>${e(story.title)}</option>`).join('')}</select></label>
        <div class="screen-selected"><img src="${e(item.houseImage)}" alt="${e(item.title)}"><div><strong>${e(item.title)}</strong><p>${status}</p></div></div>
        ${sent?.liked ? '<p class="screen-caption">爸妈喜欢这张照片</p>' : ''}
        <label class="screen-field"><span>捎句话或问个问题（选填）</span><input name="note" maxlength="80" value="${e(note)}" placeholder="爸，你还记得这张照片吗？"></label>
        <button class="screen-button primary full" type="submit" ${d.bound ? '' : 'disabled'}>${i('send')} 投送到爸妈客厅</button>
        <div class="screen-story-form">
          <p class="screen-caption">在上面写个问题，爸妈就能在「讲讲这张」里回话。</p>
          <button class="screen-button secondary full" type="submit" name="delivery" value="question" ${d.bound ? '' : 'disabled'}>${i('mic')} 邀请爸妈讲讲</button>
        </div>
      </form>
      ${sent || queued || replies.length ? `<div class="screen-actions">
        ${l('打开原照片', 'story/' + e(item.id), 'screen-button plain')}
        ${sent || queued ? button('撤回投送', 'withdraw', 'plain') : ''}
      </div>` : ''}${photoReplies(replies)}` :
        ''}

    </div>`;
  }

  function settingsPanel(d) {
    return `<div class="screen-phone-content">
      <p class="screen-caption">首批照片装好就能看。直接寄回家时，请在场的家人帮爸妈连上家里的 Wi-Fi，再绑定相框，以后在外地也能添照片。</p>
      <p class="screen-caption">设备归属 · ${e(P.Households.current().name)}</p>
      ${Object.keys(P.state.accounts).length > 1 ? `<label class="screen-field"><span>换一位家人添照片（演示）</span>
        <select name="screen-actor">${Object.keys(P.state.accounts).filter(id => P.state.members.includes(id)).map(id =>
          `<option value="${e(id)}"${id === actor ? ' selected' : ''}>${e(name(id))}</option>`).join('')}</select></label>` : ''}
      ${d.bound ? `<div class="screen-actions">${button(d.online ? '模拟断网' : '恢复联网', 'network')}
        ${button('解除演示绑定', 'unbind', 'plain')}</div>
        <form data-screen-form="settings">
          <div class="screen-fields">
            <label class="screen-field"><span>安静开始</span><input type="time" name="quietStart" value="${d.quietStart}" required></label>
            <label class="screen-field"><span>安静结束</span><input type="time" name="quietEnd" value="${d.quietEnd}" required></label>
          </div>
          <p class="screen-caption">安静时段相框会暂停自动轮播。</p>
          <button type="submit" class="screen-button primary full" ${d.online ? '' : 'disabled'}>保存设备设置</button>
        </form>` : `<p class="screen-empty">看一眼大屏上的配对码，再用手机绑定。</p>
        ${button('模拟扫码绑定', 'bind', 'primary full')}`}
    </div>`;
  }

  function phoneReturn() {
    const source = route.split('/')[3];
    if (!Object.hasOwn(entryReturnLabels, source)) return '';
    const label = `${i('back')} ${entryReturnLabels[source]}`;
    const className = 'screen-button plain screen-jump';
    // 从相册进入时返回原来的页码；直接打开深链时可回到入口页。
    return P.state.history?.at(-1)?.split('/')[0] === source ? b(label, 'back', className) : l(label, source, className);
  }

  function phoneView(d) {
    return `<aside class="screen-phone" id="screen-phone" aria-labelledby="screen-phone-title" tabindex="-1">
      ${phoneReturn()}
      <header class="screen-phone-header"><div><h2 id="screen-phone-title">相框管理</h2></div><span>${e(name(P.state.actor))}</span>
        ${button('看大屏', 'jump-device', 'plain screen-jump')}</header>
      <nav class="screen-tabs" aria-label="手机控制功能">${Object.entries(tabs).map(([id, label]) =>
        button(label, 'tab', 'plain', `data-tab="${id}" aria-pressed="${tab === id}"`)).join('')}</nav>
      ${tab === 'gift' ? gift.render() : tab === 'photos' ? photoPanel(d) : settingsPanel(d)}
      <details class="screen-price-note"><summary>相框多少钱？需要开会员吗？</summary>
        <p>相框演示价 699 元／台。试售总价、是否含预装和配送，以门店报价为准。</p>
        <p>新家庭有 1 GB 免费共享空间，可添照片、收回话。需要更大空间时，家人可自选 249 元／家／年的 20 GB 会员。到期后仍可回看已有内容。</p>
      </details>
      <p class="screen-session-note">本页模拟手机和相框。照片和录音仅供本次演示，刷新后清空。</p>
    </aside>`;
  }

  /** 保留当前操作焦点，轮播只更新屏端照片区域。 */
  function paint() {
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const action = focused?.dataset.screenAction;
    const giftAction = focused?.dataset.giftAction;
    const field = focused?.name;
    root.innerHTML = `<header class="screen-demo-heading">
      <div class="screen-demo-nav">${b(i('back') + ' 返回', 'back', 'screen-button secondary')}</div>
      <div class="screen-demo-intro"><h1>爸妈的相框</h1>
        <p>先装好照片和祝福，再把相框送给爸妈。爸妈讲的往事，也能在家庭相册里回听。</p></div>
    </header>
    <div class="screen-demo-grid"><div class="screen-demo-device-wrap">
      <div class="screen-preview-bar"><h2 class="screen-preview-label">相框预览</h2>
        ${button('去手机端 ' + i('arrow'), 'jump-phone', 'plain screen-jump')}</div>${deviceView(demo)}
      <p class="screen-demo-status" role="status">${e(notice)}</p>
    </div>${phoneView(demo)}</div>
    <section class="screen-family-book" aria-labelledby="screen-family-book-heading">
      <h2 id="screen-family-book-heading">给爷爷做一本《爷爷的七十年》</h2>
      <p>比如，知夏把爸爸第一天上班的老照片装进生日相框。爸爸点「回一句」说：“<strong class="text-emphasis">这件衬衫是你奶奶连夜改的。</strong>”知夏再点开家庭相册里的这张照片，就能听到爸爸的原话。</p>
      <p>到了春节，她从全家共享的往事里选出爸爸上班、爸妈成家、念念给爷爷拜年的几段，排成一本电子故事册给孩子看。平时添过的照片，<strong class="text-emphasis">做书时不用再向家人讨一遍</strong>。</p>
      <div class="screen-actions">${l('去家庭相册', 'house-stories', 'screen-button secondary')}
        ${l('选往事，预览故事册', 'house-book', 'screen-button secondary')}</div>
      <p class="screen-caption">故事册可免费预览，保存电子册是家庭会员权益。相框录下的回话可在原照片下回听。</p>
    </section>
    <footer class="screen-demo-footer">
      <a class="screen-research-link" href="briefing.html#strengths" target="_blank" rel="noopener">看同类相框与传家录的区别 ↗</a>
    </footer>`;
    if (action || giftAction || field) {
      const controls = root.querySelectorAll('[data-screen-action], [data-gift-action], [name]');
      const next = [...controls].find(el => {
        if (action) return el.dataset.screenAction === action && el.dataset.tab === focused.dataset.tab && el.dataset.id === focused.dataset.id;
        if (giftAction) return el.dataset.giftAction === giftAction;
        return el.name === field && (focused.type !== 'checkbox' || el.value === focused.value);
      });
      next?.focus({ preventScroll: true });
    }
    for (const audio of root.querySelectorAll('#screen-device audio')) audio.volume = demo.volume / 100;
  }

  function pick(id) {
    const story = storyById(id);
    selected = sendable(story) ? id : '';
    const delivery = demo.queued.get(selected) || demo.delivered.get(selected);
    note = delivery?.question?.text || delivery?.note || story?.photoQuestion || (selected === oldPhoto ? '爸，你还记得第一天上班吗？' : '');
  }

  function showError(form, message) {
    let label = form.querySelector('.screen-form-error');
    if (!label) {
      label = document.createElement('p');
      label.className = 'screen-form-error';
      label.setAttribute('role', 'alert');
      form.append(label);
    }
    label.textContent = message;
  }

  function move(d, step) {
    const ids = [...d.delivered.keys()];
    if (ids.length < 2) return;
    d.activeId = ids[(ids.indexOf(d.activeId) + ids.length + step) % ids.length];
    d.opening = false;
  }

  function openBrowse(d, type) {
    d.browse = { type, member: '', photo: '' };
    d.opening = false;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function openBrowsePhoto(d, id) {
    const entry = d.browse && browsePhotos(d).find(({ story }) => story.id === id);
    if (!entry) return;
    d.browse.photo = id;
    // 只在爸妈主动点开这张时清除新照提醒，自动轮播不改变已看状态。
    entry.delivery.unseen = false;
  }

  function closeBrowse(d) {
    if (!d.browse) return;
    if (d.browse.photo) d.browse.photo = '';
    else if (d.browse.member) d.browse.member = '';
    else d.browse = null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  /** 到达时进入新照列表，正在看的照片及录音可以继续。 */
  function receivePhotos(d, entries) {
    const receivedAt = Date.now();
    for (const [id, delivery] of entries) d.delivered.set(id, { ...delivery, unseen: true, receivedAt });
    if (!d.activeId) d.activeId = d.delivered.keys().next().value || '';
  }

  /** 断网只影响远程添照，恢复时再把排队的照片送达。 */
  function reconnect(d) {
    d.online = true;
    prune(d);
    receivePhotos(d, d.queued);
    d.queued.clear();
  }

  function sendPhotos(d, ids, message, { question = false, relatedMembers } = {}) {
    if (!d.bound || !publishPhotos(d, ids, relatedMembers)) return false;
    const text = message.trim().slice(0, 80);
    const entries = ids.map(id => {
      const previous = d.queued.get(id) || d.delivered.get(id);
      // 同一张可重复提问。保留之前的回话，但新的问题重新进入待讲状态。
      return [id, { sender: actor, note: question ? previous?.note || '' : text, question: question ? { text } : previous?.question }];
    });
    if (d.online) {
      receivePhotos(d, entries);
    } else {
      for (const [id, delivery] of entries) d.queued.set(id, delivery);
    }
    const content = question ? '讲述邀请' : '照片';
    notice = d.online ? `${content}已送达爸妈客厅。` : `${content}已排队，相框联网后送达。`;
    return true;
  }

  function jump(id) {
    const target = root.querySelector(id);
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }

  function cancelVoice() {
    if (!draft) return;
    const current = draft;
    draft = null;
    current.microphone.cancel();
    if (current.src && !current.sample) URL.revokeObjectURL(current.src);
  }

  function openVoice(d) {
    const id = visiblePhotoId(d);
    const delivery = d.delivered.get(id);
    const story = storyById(id);
    if (!d.bound || !d.online || !delivery || !shareable(story) || draft) return;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const related = P.Households.relatedMemberIds(story);
    const current = {
      id: story.id, person: d.residents.find(id => related.includes(id)) || d.residents[0],
      question: d.browse ? delivery.question : null,
      phase: '', src: '', sample: false, message: '说完可以先听一遍，再留在照片下。'
    };
    draft = current;
    current.microphone = window.FamilyVoice.create({
      onStart() {
        if (draft !== current) return;
        current.phase = 'recording';
        current.message = '正在录音 · 00:00';
        paint();
      },
      onTime(seconds) {
        if (draft !== current) return;
        const label = root.querySelector('[data-screen-recording-status]');
        if (label) label.textContent = '正在录音 · ' + P.duration(seconds);
      },
      onAudio(audio) {
        if (draft !== current) return;
        current.src = URL.createObjectURL(audio);
        current.phase = '';
        current.message = '录好了，可以先试听。';
        paint();
      },
      onError() {
        if (draft !== current) return;
        current.phase = '';
        current.message = '麦克风暂时不可用，可以使用示例语音继续。';
        paint();
      }
    });
  }

  function sendVoice(d) {
    const story = storyById(draft?.id);
    if (!draft?.src || !d.online || !d.delivered.has(draft.id) || !shareable(story)) return;
    const replies = d.replies.get(story.id) || [];
    const { src, person, sample, question } = draft;
    replies.push({ src, person, sample, question });
    d.replies.set(story.id, replies);
    // 音频由原往事持有引用。离开录制区只清草稿，重置演示时再释放已发送的音频。
    draft.src = '';
    cancelVoice();
    if (sendable(story)) pick(story.id);
    notice = '回话已留在原照片下。';
  }

  function archiveReply(d, index) {
    const story = storyById(selected);
    const reply = d.replies.get(selected)?.[index];
    if (!sendable(story) || !reply?.question || reply.inBook || !P.Households.selectScreenStory(story)) return;
    reply.inBook = true;
    notice = '这段讲述已选入纪事册样页。';
  }

  function likePhoto(d) {
    const id = d.browse?.photo;
    const delivery = d.delivered.get(id);
    if (!d.bound || !d.online || !delivery || !shareable(storyById(id))) return;
    delivery.liked = !delivery.liked;
    notice = delivery.liked ? `已把喜欢送给${name(delivery.sender)}。` : '已取消喜欢。';
  }

  root.addEventListener('click', event => {
    const giftControl = event.target.closest('[data-gift-action]');
    if (giftControl && gift && !giftControl.disabled) {
      if (giftControl.dataset.giftAction === 'gift-record') cancelVoice();
      gift.click(giftControl.dataset.giftAction, giftControl);
      return;
    }
    const control = event.target.closest('[data-screen-action]');
    if (!control || control.disabled || !demo) return;
    const d = demo;
    const { screenAction: action, id } = control.dataset;
    const previousBrowse = d.browse?.type;
    switch (action) {
      case 'jump-phone':
      case 'jump-device':
        jump(control.dataset.screenAction === 'jump-phone' ? '#screen-phone' : '#screen-device');
        return;
      case 'tab':
        if (!Object.hasOwn(tabs, control.dataset.tab)) return;
        if (tab === 'gift' && control.dataset.tab !== 'gift') gift.suspend();
        tab = control.dataset.tab;
        break;
      case 'send-daily':
        if (sendPhotos(d, dailyDraftIds, dailyNote, { relatedMembers: dailyMembers })) {
          pick(dailyDraftIds[0]);
          dailyDraftIds = [];
          dailyMembers = [];
          dailyNote = '';
        }
        break;
      case 'cancel-daily':
        dailyDraftIds = [];
        dailyMembers = [];
        dailyNote = '';
        break;
      case 'browse-new':
      case 'browse-people':
      case 'browse-stories':
        openBrowse(d, action.slice('browse-'.length));
        break;
      case 'browse-person':
        if (d.browse?.type !== 'people' || !P.Households.memberIds().includes(id)) return;
        d.browse.member = id;
        break;
      case 'browse-photo':
        openBrowsePhoto(d, id);
        break;
      case 'browse-back':
        closeBrowse(d);
        break;
      case 'open-frame':
        d.opening = false;
        d.paused = false;
        break;
      case 'prev-photo':
      case 'next-photo':
        if (!draft) move(d, control.dataset.screenAction === 'prev-photo' ? -1 : 1);
        break;
      case 'pause':
        d.paused = !d.paused;
        break;
      case 'listen': {
        const message = d.delivered.get(visiblePhotoId(d))?.note;
        if (message) say(message);
        return;
      }
      case 'like-photo':
        likePhoto(d);
        break;
      case 'reply':
        gift.suspend();
        openVoice(d);
        break;
      case 'record':
        if (!draft) return;
        if (draft.phase === 'recording') {
          draft.phase = 'stopping';
          draft.message = '正在准备试听…';
          draft.microphone.stop();
        } else if (!draft.phase && !draft.src) {
          draft.phase = 'permission';
          draft.message = '请允许使用麦克风。';
          void draft.microphone.start();
        }
        break;
      case 'sample-voice':
        if (!draft || draft.phase || draft.src) return;
        draft.src = sampleAudio;
        draft.sample = true;
        draft.message = '这是合成示例语音，可以先试听。';
        break;
      case 'cancel-voice':
        cancelVoice();
        break;
      case 'send-voice':
        sendVoice(d);
        break;
      case 'archive-reply':
        archiveReply(d, Number(id));
        break;
      case 'withdraw':
        if (!sendable(storyById(selected))) return;
        if (draft?.id === selected) cancelVoice();
        d.queued.delete(selected);
        d.delivered.delete(selected);
        prune(d);
        notice = '投送已撤回。收到的语音仍可从原照片回听。';
        break;
      case 'network':
        if (d.online) {
          cancelVoice();
          d.online = false;
          notice = '相框已离线，装好的照片和祝福仍然可以看。';
        } else {
          reconnect(d);
          notice = '已联网，待送达的照片已同步到相框。';
        }
        break;
      case 'unbind':
        cancelVoice();
        d.bound = false;
        d.browse = null;
        clearGift(d);
        d.delivered.clear();
        d.queued.clear();
        prune(d);
        notice = '已解除演示绑定，原照片和回话保留在往事里。';
        break;
      case 'bind':
        if (d.bound) return;
        d.bound = true;
        d.online = true;
        notice = '爸妈客厅已绑定到 ' + P.Households.current().name + '。';
        break;
      default:
        return;
    }
    paint();
    if (action.startsWith('browse-')) {
      const heading = root.querySelector('.screen-browse-header h3');
      const trigger = root.querySelector(`[data-screen-action="browse-${previousBrowse}"]`);
      (heading || trigger)?.focus({ preventScroll: true });
    }
  });

  root.addEventListener('change', event => {
    if (!demo) return;
    if (event.target.name === 'screen-actor') {
      P.Households.changeMember(event.target.value);
    } else if (event.target.name.startsWith('gift-')) {
      gift.change(event.target);
    } else if (event.target.name === 'daily-files') {
      void selectDaily(event.target.files);
    } else if (event.target.name === 'daily-members') {
      const checked = [...root.querySelectorAll('[name="daily-members"]:checked')].map(input => input.value);
      dailyMembers = P.Households.memberIds(checked);
    } else if (event.target.name === 'photo') {
      pick(event.target.value);
      paint();
    } else if (event.target.name === 'speaker' && draft && demo.residents.includes(event.target.value)) {
      draft.person = event.target.value;
    }
  });

  async function selectDaily(files) {
    if (loadingDaily || !files.length) return;
    const drafts = photoDrafts;
    loadingDaily = true;
    dailyMembers = [];
    const pending = importPhotos(Array.from(files));
    paint();
    const { photos, rejected } = await pending;
    if (drafts !== photoDrafts) return;
    loadingDaily = false;
    dailyDraftIds = photos.map(story => story.id);
    notice = rejected ? '部分照片无法读取，请选择 8 MB 内的 JPG、PNG 或 WebP 图片。' : '';
    paint();
  }

  root.addEventListener('input', event => {
    if (!demo) return;
    if (event.target.name.startsWith('gift-')) gift.input(event.target);
    if (event.target.name === 'daily-note') dailyNote = event.target.value;
    if (event.target.name === 'note') note = event.target.value;
    if (event.target.name === 'volume') {
      demo.volume = Number(event.target.value);
      for (const audio of root.querySelectorAll('#screen-device audio')) audio.volume = demo.volume / 100;
    }
  });

  root.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    const d = demo;
    if (!d?.bound) return;
    const form = event.target;
    const data = new FormData(form);
    const text = key => String(data.get(key) || '').trim();
    if (form.dataset.screenForm === 'cast') {
      const story = storyById(text('photo'));
      if (!sendable(story)) return showError(form, '这张照片暂时无法投送。请重新选择全家可见的照片。');
      const question = event.submitter?.value === 'question';
      const message = text('note');
      if (question && !message) return showError(form, '先写一句想问爸妈的问题。');
      sendPhotos(d, [story.id], message, { question });
    } else if (form.dataset.screenForm === 'settings' && d.online) {
      d.quietStart = text('quietStart');
      d.quietEnd = text('quietEnd');
      notice = '设备设置已保存。';
    } else {
      return;
    }
    paint();
  });

  function leave() {
    if (!demo) return;
    cancelVoice();
    gift.dispose();
    gift = null;
    for (const item of photoDrafts.values()) URL.revokeObjectURL(item.houseImage);
    photoDrafts = null;
    demo = null;
    clearInterval(slideshow);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    root.replaceChildren();
  }

  function mount(open) {
    root.hidden = !open;
    root.closest('.studio').classList.toggle('screen-demo-mode', open);
    if (!open) {
      leave();
      const d = workspaces.get(P.state);
      if (d) prune(d);
      return;
    }
    const d = workspace();
    let focusPhone = false;
    if (demo !== d || actor !== P.state.actor || route !== location.hash) {
      const switchingActor = demo === d && actor !== P.state.actor;
      leave();
      demo = d;
      actor = P.state.actor;
      route = location.hash;
      const [, photoId, panel, source] = route.split('/');
      tab = switchingActor ? 'photos' : Object.hasOwn(tabs, panel) ? panel : photoId ? 'photos' : 'gift';
      focusPhone = Object.hasOwn(entryReturnLabels, source) && Object.hasOwn(tabs, panel);
      photoDrafts = new Map();
      dailyDraftIds = [];
      dailyMembers = [];
      dailyNote = '';
      loadingDaily = false;
      gift = P.HouseScreenGift.create({
        stories: availablePhotos, importPhotos, refresh: paint,
        deliver: options => prepareGift(d, options),
        readGift: () => d.gift?.sender === actor ? d.gift : null,
        openDevice() {
          if (!d.gift || !d.delivered.has(d.gift.coverId)) return;
          cancelVoice();
          showCover(d);
          paint();
          jump('#screen-device');
        }
      });
      notice = '';
      const requested = storyById(photoId);
      const defaultPhoto = storyById(oldPhoto);
      // 相册的投送入口只预选用户打开的那张照片，授权变更后交由用户重新选图。
      const fallback = source === 'home-album' ? '' : sendable(defaultPhoto) ? oldPhoto : P.state.stories.find(sendable)?.id;
      pick(sendable(requested) ? requested.id : fallback);
      slideshow = setInterval(() => {
        const now = new Date();
        root.querySelector('.screen-frame-clock').textContent = clock(now);
        root.querySelector('.screen-chip').textContent = connectionLabel(d, now);
        if (d.browse || d.paused || d.opening && now.getTime() < d.openingUntil || draft || quiet(d, now) ||
          [...root.querySelectorAll('.screen-gallery audio')].some(player => !player.paused) || d.delivered.size < 2 ||
          root.querySelector('.screen-gallery')?.contains(document.activeElement)) return;
        move(d, 1);
        root.querySelector('.screen-gallery').innerHTML = screenPhoto(d);
      }, slideshowInterval);
    }
    prune(d);
    paint();
    if (focusPhone) jump('#screen-phone');
  }

  function reset() {
    leave();
    for (const d of workspaces.values()) {
      clearGift(d);
      for (const url of d.importedUrls) URL.revokeObjectURL(url);
      for (const replies of d.replies.values()) {
        for (const reply of replies) if (!reply.sample) URL.revokeObjectURL(reply.src);
      }
    }
    workspaces.clear();
  }

  P.views['house-screen'] = () => '';
  P.HouseScreen = { mount, reset, homeEntry, photoButton, voices, bookVoices, replyCount: story => storyReplies(story).length };
}
