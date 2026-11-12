/** 爸妈大屏原型。两个操作端共用当前家庭的往事，设备状态保留在当前页面内存。 */
'use strict';
{
  const P = window.App;
  const { escape: e, icon: i, avatar: a, button: b, link: l } = P;
  const root = document.getElementById('house-screen-demo');
  const workspaces = new Map();
  const oldPhoto = 'father-first-work-photo';
  const sampleAudio = 'assets/photo-card/sample-reply.wav';
  const graceMinutes = 15;
  const snoozeMinutes = 10;
  const endOfDay = 23 * 60 + 59;
  const tabs = { photos: '投送照片', reminders: '今日提醒', device: '设备设置' };
  const today = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
  let demo;
  let actor;
  let route;
  let tab;
  let selected;
  let note;
  let notice = '';
  let draft;
  let slideshow;

  function button(label, action, kind = 'secondary', attrs = '') {
    return `<button type="button" class="screen-button ${kind}" data-screen-action="${action}" ${attrs}>${label}</button>`;
  }

  function clock(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
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

  function contacts(d) {
    return P.state.members.filter(id => P.state.accounts[id] && !d.residents.includes(id));
  }

  function makeReminder(person, at, kind, title, synced = true) {
    return { person, at, nextAt: at, phoneTime: at, kind, title, synced, confirmed: false, reported: false, notifiedTo: '' };
  }

  function workspace() {
    if (workspaces.has(P.state)) return workspaces.get(P.state);
    const example = P.Households.isExample();
    const d = {
      residents: example ? ['father', 'mother'] : ['father'], bound: example, online: true,
      paused: false, held: false, volume: 75, quietStart: '22:00', quietEnd: '07:00', time: 9 * 60 + 41,
      delivered: new Map(), queued: new Map(), replies: new Map(), activeId: '',
      reminders: [], callback: null, call: null
    };
    d.contact = contacts(d)[0] || '';
    if (example) {
      for (const id of ['nian-first-new-year', 'father-tea-day']) {
        const story = storyById(id);
        if (shareable(story)) d.delivered.set(id, { sender: story.author, note: '' });
      }
      d.activeId = d.delivered.keys().next().value || '';
      d.reminders = [
        makeReminder('mother', 10 * 60, 'medicine', '吃药提醒'),
        makeReminder('father', 10 * 60 + 30, 'medicine', '吃药提醒'),
        makeReminder('', 15 * 60, 'event', '知夏下午来看你')
      ];
    }
    workspaces.set(P.state, d);
    return d;
  }

  function quiet(d) {
    const start = minutes(d.quietStart);
    const end = minutes(d.quietEnd);
    return start > end ? d.time >= start || d.time < end : d.time >= start && d.time < end;
  }

  /** 往事收窄授权后，撤掉已显示和排队的内容，避免重新授权时自动上屏。 */
  function prune(d) {
    for (const entries of [d.delivered, d.queued]) {
      for (const id of entries.keys()) {
        if (!shareable(storyById(id))) entries.delete(id);
      }
    }
    if (!d.delivered.has(d.activeId)) d.activeId = d.delivered.keys().next().value || '';
    if (d.call && !d.activeId) d.call = null;
  }

  function pending(d) {
    return d.reminders.filter(item => item.synced && !item.confirmed).sort((left, right) => left.nextAt - right.nextAt);
  }

  function reminderState(d, item) {
    if (item.reported) return '本人已确认';
    if (!item.synced) return '待同步';
    if (!d.online) return '设备离线';
    if (d.time >= item.nextAt + graceMinutes) return '到点未确认';
    if (d.time >= item.nextAt) return '等待确认';
    return item.nextAt !== item.at ? '已延后至 ' + clock(item.nextAt) : '待提醒';
  }

  function reminderTitle(item) {
    return item.person ? name(item.person) + ' · ' + item.title : item.title;
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

  function photoButton(story) {
    return sendable(story) ? l(i('screen') + ' 投送到爸妈大屏', 'house-screen/' + e(story.id), 'text-link section screen-story-cast') : '';
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

  function screenPhoto(d) {
    const story = storyById(d.activeId);
    const delivery = d.delivered.get(d.activeId);
    if (!delivery || !shareable(story)) {
      return `<div class="screen-photo-empty">${i('photo')}<p>${d.bound ? '等家人送来一张照片' : '用手机绑定这台屏'}</p>
        ${d.bound ? '' : '<small>演示配对码 486 217</small>'}</div>`;
    }
    const locked = Boolean(draft || d.call?.accepted);
    return `<figure class="screen-photo">
      <img src="${e(story.houseImage)}" alt="${e(story.title)}">
      <figcaption><strong>${e(story.title)}</strong><span>${e(name(delivery.sender))} 投送 · ${e(story.photoYear || story.year || '')}</span></figcaption>
      ${d.delivered.size > 1 ? `<div class="screen-photo-steps" aria-label="轮播照片">
        ${button(i('back'), 'prev-photo', 'plain', 'aria-label="上一张照片"' + (locked ? ' disabled' : ''))}
        ${button(i('arrow'), 'next-photo', 'plain', 'aria-label="下一张照片"' + (locked ? ' disabled' : ''))}
      </div>` : ''}
    </figure>
    ${delivery.note ? `<p class="screen-message">${e(delivery.note)}</p>` : ''}
    ${draft ? replyControls(d) : `<div class="screen-actions">
      ${delivery.note ? button(i('volume') + ' 听留言', 'listen') : ''}
      ${button(i('mic') + ' 回一句', 'reply', 'primary', d.online ? '' : 'disabled')}
    </div>`}`;
  }

  function screenToday(d) {
    const item = pending(d)[0];
    const due = item && d.time >= item.nextAt;
    const heading = item ? (due ? '现在提醒' : '下一件事') : '今天的安排';
    const action = item?.kind === 'medicine' ? '已吃' : '知道了';
    const callback = d.callback;
    return `<div class="screen-today">
      <div class="screen-clock"><time>${clock(d.time)}</time><p>${today}</p></div>
      <section class="screen-agenda ${due ? 'is-due' : ''}" aria-label="今天的安排">
        <span>${heading}</span>
        ${item ? `<h3>${e(reminderTitle(item))}</h3><p>${clock(item.nextAt)}</p>${due ? `<div class="screen-actions">
          ${button(action, 'ack', 'primary')}${button('稍后', 'snooze', 'secondary', d.time === endOfDay ? 'disabled' : '')}</div>` : ''}` :
          `<p>${d.reminders.length ? '今天的提醒都看过了' : '今天还没有安排'}</p>`}
      </section>
      ${d.bound ? `<div class="screen-contact">${d.contact ? a(d.contact) : i('family')}
        <div><strong>${d.contact ? e(name(d.contact)) : '联系家人'}</strong>
          <p>${callback ? (callback.responded ? '家人已接收请求' : '回电请求已发出') : '点一下请家人回电话'}</p></div>
        ${button(callback && !callback.responded ? '已请求' : '请回电话', 'callback', 'secondary',
          !d.online || !d.contact || callback && !callback.responded ? 'disabled' : '')}
      </div>` : ''}
    </div>`;
  }

  function callBanner(d) {
    if (!d.call) return '';
    const caller = e(name(d.call.caller));
    return `<div class="screen-call" role="status"><span>${i('screen')} ${d.call.accepted ? '视频通话演示 · 正在一起看照片' : caller + '来电'}</span>
      <div class="screen-actions">${d.call.accepted ? '' : button('接听', 'answer', 'primary')}
      ${button(d.call.accepted ? '结束通话' : '稍后再接', 'end-call')}</div></div>`;
  }

  function deviceView(d) {
    return `<div class="screen-device" id="screen-device" tabindex="-1">
      <div class="screen-bezel"><div class="screen-glass">
        <header class="screen-device-header"><strong>${i('home')} 爸妈客厅</strong>
          <span class="screen-chip ${d.online && d.bound ? 'is-online' : ''}">${!d.bound ? '待绑定' : !d.online ? '离线' : quiet(d) ? '安静时段' : '在线'}</span></header>
        ${callBanner(d)}
        <div class="screen-device-grid"><div class="screen-gallery">${screenPhoto(d)}</div>${screenToday(d)}</div>
        <footer class="screen-device-footer"><span>${e(P.Households.current().name)}</span>
          <div>${button(i(d.paused ? 'play' : 'pause') + (d.paused ? ' 继续轮播' : ' 暂停轮播'), 'pause', 'plain',
            `aria-pressed="${d.paused}" ${d.delivered.size < 2 || d.call?.accepted ? 'disabled' : ''}`)}
            <label class="screen-volume">${i('volume')}<input type="range" name="volume" aria-label="大屏音量" min="0" max="100" value="${d.volume}"></label></div>
        </footer>
      </div></div><div class="screen-stand" aria-hidden="true"></div>
    </div>`;
  }

  function photoPanel(d) {
    if (d.call) {
      const photo = storyById(d.activeId);
      return `<div class="screen-phone-content">
        <p class="screen-caption">${d.call.accepted ? '正在一起看' : '正在等爸妈接听'}</p>
        ${d.call.accepted ? `<div class="screen-selected screen-shared-photo">
          <img src="${e(photo.houseImage)}" alt="${e(photo.title)}"><strong>${e(photo.title)}</strong></div>` : ''}
        <div class="screen-actions">${d.call.accepted ?
          button('下一张照片', 'call-next', 'primary', d.delivered.size < 2 || draft ? 'disabled' : '') : ''}
          ${button('结束通话', 'end-call', 'secondary')}</div>
      </div>`;
    }
    const stories = P.state.stories.filter(sendable);
    const item = stories.find(story => story.id === selected);
    const replies = d.replies.get(item?.id) || [];
    const sent = item && d.delivered.has(item.id);
    const queued = item && d.queued.has(item.id);
    const status = queued ? '待送达 · 大屏离线' : sent ? '已送达爸妈客厅' : '待投送';
    return `<div class="screen-phone-content">
      ${item ? `<form data-screen-form="cast">
        <label class="screen-field"><span>从我的往事选照片</span><select name="photo">${stories.map(story =>
          `<option value="${e(story.id)}" ${story.id === selected ? 'selected' : ''}>${e(story.title)}</option>`).join('')}</select></label>
        <div class="screen-selected"><img src="${e(item.houseImage)}" alt="${e(item.title)}"><div><strong>${e(item.title)}</strong><p>${status}</p></div></div>
        <label class="screen-field"><span>捎句话（选填）</span><input name="note" maxlength="80" value="${e(note)}" placeholder="爸，你还记得这张照片吗？"></label>
        <button class="screen-button primary full" type="submit" ${d.bound ? '' : 'disabled'}>${i('send')} 投送到爸妈客厅</button>
        ${d.bound ? '' : '<p class="screen-caption">请先在设备设置里绑定大屏。</p>'}
      </form>
      ${sent || queued || replies.length ? `<div class="screen-actions">
        ${l('打开原照片', 'story/' + e(item.id), 'screen-button plain')}
        ${sent || queued ? button('撤回投送', 'withdraw', 'plain') : ''}
      </div>` : ''}${voiceList(replies)}` :
        '<p class="screen-empty">有全家可见的照片往事后，就能投到大屏。</p>'}
      ${button(i('screen') + ' 演示视频一起看', 'call', 'plain', !d.bound || !d.online || !d.delivered.size ? 'disabled' : '')}
    </div>`;
  }

  function reminderPanel(d) {
    const items = [...d.reminders].sort((left, right) => left.phoneTime - right.phoneTime);
    const next = pending(d).find(item => item.nextAt > d.time);
    const notified = [...new Set(items.filter(item => !item.reported && item.notifiedTo).map(item => item.notifiedTo))];
    return `<div class="screen-phone-content">
      <div class="screen-actions screen-clock-actions">
        ${button('到下一条提醒', 'next-reminder', 'primary', next ? '' : 'disabled')}
        ${button('快进 15 分钟', 'advance', 'secondary', d.bound && d.time < endOfDay ? '' : 'disabled')}
      </div>
      <p class="screen-caption">演示时间 ${clock(d.time)} · 到点后 ${graceMinutes} 分钟可查看未确认状态。</p>
      <ul class="screen-reminders">${items.map(item => `<li><time>${clock(item.phoneTime)}</time>
        <div><strong>${e(reminderTitle(item))}</strong><span>${reminderState(d, item)}</span></div></li>`).join('')}</ul>
      ${notified.length ? `<p class="screen-sync">已模拟通知 ${e(notified.map(name).join('、'))}</p>` : ''}
      <details class="screen-details"><summary>添加今日提醒</summary>
        <form data-screen-form="reminder">
          <div class="screen-fields">
            <label class="screen-field"><span>时间</span><input type="time" name="time" value="12:30" required></label>
            <label class="screen-field"><span>类型</span><select name="kind"><option value="medicine">吃药</option><option value="event">家庭安排</option></select></label>
          </div>
          <label class="screen-field"><span>提醒谁</span><select name="person">${speakerOptions(d, d.residents[0])}<option value="">全家</option></select></label>
          <label class="screen-field"><span>捎句话（选填）</span><input name="title" maxlength="28" placeholder="例如 下午三点去复诊"></label>
          <button type="submit" class="screen-button primary full" ${d.bound ? '' : 'disabled'}>保存提醒</button>
        </form>
      </details>
    </div>`;
  }

  function settingsPanel(d) {
    return `<div class="screen-phone-content">
      <p class="screen-caption">设备归属 · ${e(P.Households.current().name)}</p>
      ${d.bound ? `<div class="screen-actions">${button(d.online ? '模拟断网' : '恢复联网', 'network')}
        ${button('解除演示绑定', 'unbind', 'plain')}</div>
        <form data-screen-form="settings">
          <div class="screen-fields">
            <label class="screen-field"><span>安静开始</span><input type="time" name="quietStart" value="${d.quietStart}" required></label>
            <label class="screen-field"><span>安静结束</span><input type="time" name="quietEnd" value="${d.quietEnd}" required></label>
          </div>
          <label class="screen-field"><span>接收回电请求和提醒的家人</span><select name="contact">
            <option value="">暂不设置</option>${contacts(d).map(id => `<option value="${e(id)}" ${d.contact === id ? 'selected' : ''}>${e(name(id))}</option>`).join('')}</select></label>
          <p class="screen-caption">安静时段暂停轮播和自动播报，提醒仍在屏上显示。</p>
          <button type="submit" class="screen-button primary full" ${d.online ? '' : 'disabled'}>保存设备设置</button>
        </form>` : `<p class="screen-empty">看一眼大屏上的配对码，再用手机绑定。</p>
        ${button('模拟扫码绑定', 'bind', 'primary full')}`}
    </div>`;
  }

  function phoneView(d) {
    const request = d.callback?.to === P.state.actor ? d.callback : null;
    return `<aside class="screen-phone" id="screen-phone" aria-label="子女手机控制端" tabindex="-1">
      <header class="screen-phone-header"><div><p>子女手机端</p><h2>爸妈客厅</h2></div><span>${e(name(P.state.actor))}</span>
        ${button('看大屏', 'jump-device', 'plain screen-jump')}</header>
      ${request ? `<div class="screen-request"><p>${request.responded ? '已标记会回电话' : '爸妈请你回个电话'}</p>
        ${request.responded ? '' : button('我来回电话', 'return-call', 'primary')}</div>` : ''}
      <nav class="screen-tabs" aria-label="手机控制功能">${Object.entries(tabs).map(([id, label]) =>
        button(label, 'tab', 'plain', `data-tab="${id}" aria-pressed="${tab === id}"`)).join('')}</nav>
      ${{ photos: photoPanel, reminders: reminderPanel, device: settingsPanel }[tab](d)}
    </aside>`;
  }

  /** 保留当前操作焦点，轮播只更新屏端照片区域。 */
  function paint() {
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const action = focused?.dataset.screenAction;
    const field = focused?.name;
    root.innerHTML = `<header class="screen-demo-heading">
      <div><p class="screen-demo-kicker">传家录 · 家庭设备演示</p><h1>爸妈大屏</h1>
        <p>在手机上送张照片，再到大屏上替爸妈回一句。</p></div>
      ${b(i('back') + ' 返回原型', 'back', 'screen-button secondary')}
    </header>
    <div class="screen-demo-grid"><div class="screen-demo-device-wrap">
      <div class="screen-preview-bar"><p class="screen-preview-label">长辈端 · 客厅演示机</p>
        ${button('去手机端 ' + i('arrow'), 'jump-phone', 'plain screen-jump')}</div>${deviceView(demo)}
      <p class="screen-demo-status" role="status">${e(notice)}</p>
    </div>${phoneView(demo)}</div>`;
    if (action || field) {
      const controls = root.querySelectorAll('[data-screen-action], [name]');
      const next = [...controls].find(el => action ? el.dataset.screenAction === action &&
        el.dataset.tab === focused.dataset.tab : el.name === field);
      next?.focus({ preventScroll: true });
    }
    for (const audio of root.querySelectorAll('#screen-device audio')) audio.volume = demo.volume / 100;
  }

  function pick(id) {
    const story = storyById(id);
    selected = sendable(story) ? id : '';
    note = demo.queued.get(selected)?.note ?? demo.delivered.get(selected)?.note ??
      story?.photoQuestion ?? (selected === oldPhoto ? '爸，你还记得第一天上班吗？' : '');
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
    d.held = false;
  }

  function advance(d, time) {
    if (time === undefined) return;
    const due = pending(d).find(item => item.nextAt > d.time && item.nextAt <= time);
    d.time = time;
    notice = '演示时间已推进到 ' + clock(time) + '。';
    notifyOverdue(d);
    if (due && !quiet(d)) say(reminderTitle(due));
  }

  function notifyOverdue(d) {
    if (!d.online || !contacts(d).includes(d.contact)) return;
    // 每次到点只发一次提醒。恢复联网时先同步屏上的确认，再判断是否需要通知。
    for (const item of d.reminders) {
      if (item.kind === 'medicine' && !item.notifiedTo && reminderState(d, item) === '到点未确认') {
        item.notifiedTo = d.contact;
      }
    }
  }

  /** 先同步本机确认，再展示手机端未确认状态。离线时保留已送达的照片和提醒。 */
  function reconnect(d) {
    d.online = true;
    prune(d);
    for (const [id, delivery] of d.queued) {
      d.delivered.set(id, delivery);
      d.activeId = id;
      d.held = Boolean(delivery.note);
    }
    d.queued.clear();
    for (const item of d.reminders) {
      item.synced = true;
      item.reported = item.confirmed;
      item.phoneTime = item.nextAt;
    }
    notifyOverdue(d);
  }

  function cancelVoice() {
    if (!draft) return;
    const current = draft;
    draft = null;
    current.microphone.cancel();
    if (current.src && !current.sample) URL.revokeObjectURL(current.src);
  }

  function openVoice(d) {
    if (!d.online || !d.delivered.has(d.activeId) || draft) return;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const story = storyById(d.activeId);
    const related = P.Households.relatedMemberIds(story);
    const current = {
      id: story.id, person: d.residents.find(id => related.includes(id)) || d.residents[0],
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
    const { src, person, sample } = draft;
    replies.push({ src, person, sample });
    d.replies.set(story.id, replies);
    // 音频由原往事持有引用。离开录制区只清草稿，重置演示时再释放已发送的音频。
    draft.src = '';
    cancelVoice();
    d.held = false;
    if (sendable(story)) pick(story.id);
    notice = '回话已留在原照片下。';
  }

  root.addEventListener('click', event => {
    const control = event.target.closest('[data-screen-action]');
    if (!control || control.disabled || !demo) return;
    const d = demo;
    switch (control.dataset.screenAction) {
      case 'jump-phone':
      case 'jump-device': {
        const target = root.querySelector(control.dataset.screenAction === 'jump-phone' ? '#screen-phone' : '#screen-device');
        target.scrollIntoView({ block: 'start' });
        target.focus({ preventScroll: true });
        return;
      }
      case 'tab':
        if (Object.hasOwn(tabs, control.dataset.tab)) tab = control.dataset.tab;
        break;
      case 'prev-photo':
      case 'next-photo':
        if (!draft && !d.call?.accepted) move(d, control.dataset.screenAction === 'prev-photo' ? -1 : 1);
        break;
      case 'pause':
        d.paused = !d.paused;
        if (!d.paused) d.held = false;
        break;
      case 'listen': {
        const message = d.delivered.get(d.activeId)?.note;
        if (message) say(message);
        return;
      }
      case 'reply':
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
      case 'withdraw':
        if (!sendable(storyById(selected))) return;
        if (draft?.id === selected) cancelVoice();
        d.queued.delete(selected);
        d.delivered.delete(selected);
        prune(d);
        notice = '投送已撤回。收到的语音仍可从原照片回听。';
        break;
      case 'callback':
        if (d.online && contacts(d).includes(d.contact) && (!d.callback || d.callback.responded)) {
          d.callback = { to: d.contact, responded: false };
          notice = '回电请求已送到 ' + name(d.contact) + ' 的手机演示端。';
        }
        break;
      case 'return-call':
        if (d.callback?.to === P.state.actor) d.callback.responded = true;
        break;
      case 'call':
        if (d.bound && d.online && d.activeId && !d.call) d.call = { caller: P.state.actor, accepted: false };
        break;
      case 'answer':
        if (d.online && d.call) d.call.accepted = true;
        break;
      case 'end-call':
        d.call = null;
        break;
      case 'call-next':
        if (d.call?.accepted && !draft) move(d, 1);
        break;
      case 'next-reminder':
        advance(d, pending(d).find(item => item.nextAt > d.time)?.nextAt);
        break;
      case 'advance':
        advance(d, Math.min(endOfDay, d.time + graceMinutes));
        break;
      case 'ack':
      case 'snooze': {
        const item = pending(d)[0];
        if (!item || d.time < item.nextAt) return;
        if (control.dataset.screenAction === 'snooze') {
          item.nextAt = Math.min(endOfDay, d.time + snoozeMinutes);
          if (d.online) item.phoneTime = item.nextAt;
          item.notifiedTo = '';
          notice = '已延后至 ' + clock(item.nextAt) + '。';
        } else {
          item.confirmed = true;
          item.reported = d.online;
          notice = d.online ? '已确认，手机端可以查看。' : '大屏已记下确认，联网后同步到手机。';
        }
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        break;
      }
      case 'network':
        if (d.online) {
          cancelVoice();
          d.online = false;
          d.call = null;
          notice = '模拟断网。已同步的提醒仍会在屏上出现。';
        } else {
          reconnect(d);
          notice = '已联网，待送达的照片与确认记录已同步。';
        }
        break;
      case 'unbind':
        cancelVoice();
        d.bound = false;
        d.call = null;
        d.callback = null;
        d.delivered.clear();
        d.queued.clear();
        d.reminders = [];
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
  });

  root.addEventListener('change', event => {
    if (!demo) return;
    if (event.target.name === 'photo') {
      pick(event.target.value);
      paint();
    } else if (event.target.name === 'speaker' && draft && demo.residents.includes(event.target.value)) {
      draft.person = event.target.value;
    }
  });

  root.addEventListener('input', event => {
    if (!demo) return;
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
      const delivery = { sender: P.state.actor, note: text('note').slice(0, 80) };
      if (d.online) {
        cancelVoice();
        d.delivered.set(story.id, delivery);
        d.activeId = story.id;
        d.held = Boolean(delivery.note);
      } else {
        d.queued.set(story.id, delivery);
      }
      notice = d.online ? '照片已送达爸妈客厅。' : '照片已排队，屏幕联网后送达。';
    } else if (form.dataset.screenForm === 'reminder') {
      const kind = text('kind');
      const person = text('person');
      const at = minutes(text('time'));
      // 用药回执必须明确归属，家里的共同安排可以发给全家。
      if (kind === 'medicine' && !d.residents.includes(person)) return showError(form, '请选一位需要吃药提醒的家人。');
      if (!Number.isInteger(at) || at <= d.time || at > endOfDay) return showError(form, '请选择晚于演示时钟的今日时间。');
      const title = text('title').slice(0, 28) || (kind === 'medicine' ? '吃药提醒' : '家庭安排');
      d.reminders.push(makeReminder(person, at, kind, title, d.online));
      notice = d.online ? '已同步到爸妈大屏。' : '提醒待同步，屏幕联网后生效。';
    } else if (form.dataset.screenForm === 'settings' && d.online) {
      d.quietStart = text('quietStart');
      d.quietEnd = text('quietEnd');
      const contact = contacts(d).includes(text('contact')) ? text('contact') : '';
      if (d.contact !== contact) {
        d.contact = contact;
        d.callback = null;
      }
      notice = '设备设置已保存。';
    } else {
      return;
    }
    paint();
  });

  function leave() {
    if (!demo) return;
    cancelVoice();
    demo.call = null;
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
    if (demo !== d || actor !== P.state.actor || route !== location.hash) {
      leave();
      demo = d;
      actor = P.state.actor;
      route = location.hash;
      const [, photoId, panel] = route.split('/');
      tab = Object.hasOwn(tabs, panel) ? panel : 'photos';
      notice = '';
      const requested = storyById(photoId);
      const defaultPhoto = storyById(oldPhoto);
      pick(sendable(requested) ? requested.id : sendable(defaultPhoto) ? oldPhoto : P.state.stories.find(sendable)?.id);
      slideshow = setInterval(() => {
        if (d.paused || d.held || d.call || draft || quiet(d) || d.delivered.size < 2 ||
          root.querySelector('.screen-gallery')?.contains(document.activeElement)) return;
        move(d, 1);
        root.querySelector('.screen-gallery').innerHTML = screenPhoto(d);
      }, 9000);
    }
    prune(d);
    paint();
  }

  function reset() {
    leave();
    for (const d of workspaces.values()) {
      for (const replies of d.replies.values()) {
        for (const reply of replies) if (!reply.sample) URL.revokeObjectURL(reply.src);
      }
    }
    workspaces.clear();
  }

  P.views['house-screen'] = () => '';
  P.HouseScreen = { mount, reset, photoButton, voices, replyCount: story => storyReplies(story).length };
}
