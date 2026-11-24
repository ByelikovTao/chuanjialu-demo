/** 成长记和长辈岁月是家庭档案的两种浏览方式，详情始终打开原记录。 */
'use strict';
{
  const P = window.App, { escape: e, icon: i, link: l, button: b, avatar: a } = P;
  const albumPositions = new WeakMap();
  const pad = value => String(value).padStart(2, '0');

  function today() {
    const now = new Date();
    return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
  }

  function dateParts(value = '') {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/\s+/g, '').replace(/[年月]/g, '-').replace(/日$/, '');
    const parts = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(normalized);
    if (!parts) return null;
    const [, year, month, day] = parts.map(Number);
    const iso = [parts[1], pad(month), pad(day)].join('-');
    const date = new Date(iso + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? { year, month, day, iso } : null;
  }

  function validDate(value, allowFuture = false) {
    const date = dateParts(value);
    return Boolean(date && date.iso === value && value >= '1900-01-01' && (allowFuture || value <= today()));
  }

  function displayDate(date) {
    return `${date.year} 年 ${date.month} 月 ${date.day} 日`;
  }

  /** 年月、年份和年代保留原有精度，旧照片不会因为缺少日期被排到某一天。 */
  function calendarTime(value) {
    const date = dateParts(value);
    const text = String(value ?? '').replace(/\s+/g, '');
    const period = /^([1-9]\d{3})(?:年(?:(\d{1,2})月|(代))?|[-/](\d{1,2}))?$/.exec(text);
    if (!date && !period) return null;
    const year = date?.year ?? Number(period[1]);
    const monthPart = period?.[2] || period?.[4];
    const month = date?.month ?? Number(monthPart || 0);
    const decade = Boolean(period?.[3]);
    if ((monthPart && (month < 1 || month > 12)) || (decade && year % 10 !== 0)) return null;
    const key = month ? `${year}-${pad(month)}` : decade ? `${year}-decade` : String(year);
    const label = month ? `${year} 年 ${month} 月` : decade ? `${year} 年代` : `${year} 年`;
    const order = year * 10000 + month * 100 + (date?.day || 0) - Number(decade);
    return { date, key, label, order };
  }

  /** 按足月计算，月底出生的宝宝在较短月份以该月末为满月日。 */
  function ageAt(birth, date) {
    if (!date) return 'undated';
    if (!birth || date.iso < birth.iso) return 'pregnancy';
    if (date.iso === birth.iso) return 'birth';
    const monthEnd = new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
    const months = (date.year - birth.year) * 12 + date.month - birth.month;
    return String(months - Number(date.day < Math.min(birth.day, monthEnd)));
  }

  function ageLabel(age) {
    if (age === 'undated') return '日期待补充';
    if (age === 'pregnancy') return '孕期';
    if (age === 'birth') return '出生';
    const months = Number(age);
    if (months < 36) return age + ' 月龄';
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    return years + ' 岁' + (remainder ? ' ' + remainder + ' 个月' : '');
  }

  function growthReady(person) {
    return Boolean(person && (P.PEOPLE[person].expecting || dateParts(P.PEOPLE[person].birthDate)));
  }

  function babyPerson(id) {
    // 有生日的普通家庭成员也能手动选择，默认只打开已经设置成长资料的宝宝。
    return P.Households.memberIds([id])[0] ||
      P.Households.memberIds().find(person => typeof P.PEOPLE[person].expecting === 'boolean' && growthReady(person)) || '';
  }

  function elderPerson(id) {
    return P.Households.memberIds([id])[0] || (P.Households.isExample() ? 'father' : P.state.actor);
  }

  function personHeader(person, type, note = '', controls = '') {
    const label = type === 'baby' ? '选择宝宝' : '选择长辈';
    const picker = `<select id="edition-${type}-person" data-edition-person="${type}" aria-label="${label}">
          ${person ? '' : '<option value="">选择已有家人</option>'}
          ${P.Households.memberIds().map(id => `<option value="${e(id)}" ${id === person ? 'selected' : ''}>${e(P.PEOPLE[id].name)}</option>`).join('')}
          ${person && type === 'baby' ? '<option value="_add">＋ 添加宝宝</option>' : ''}
        </select>`;
    return `<div class="edition-person">${person ? a(person, 'large') : ''}
      <div class="edition-person-copy">${controls ? `<div class="edition-profile-controls">${picker}${controls}</div>` : picker}${note}</div>
    </div>`;
  }

  /** 相册和照片翻页共用已授权的记录顺序，日期不完整的旧记录排在末尾。 */
  function growthEntries(person) {
    if (!growthReady(person)) return [];
    return P.Households.profileEntries(person)
      .filter(({ item, kind }) => item.babyMilestone || kind === 'photo' || kind === 'clip')
      .map(entry => ({ ...entry, date: dateParts(entry.item.eventDate) || dateParts(entry.item.date) }))
      .sort((left, right) => (left.date?.iso || '9999-12-31').localeCompare(right.date?.iso || '9999-12-31'));
  }

  function albumTile({ item, kind, material }, { byline = '', mark = item.babyMilestone ? '里程碑' : '', extra = '',
    scopeLabel = item.scope === 'private' ? '仅自己' : item.scope === 'selected' ? '指定家人' : '' } = {}) {
    const route = (material ? 'archive-item/' : 'story/') + e(item.id);
    const title = e(item.title);
    const notes = [byline, scopeLabel].filter(Boolean).join(' · ');
    const label = `<span class="album-tile-label"><strong>${title}</strong>${mark ? `<small>${mark}</small>` : ''}
      ${notes ? `<small class="album-byline">${e(notes)}</small>` : ''}</span>`;
    if (kind === 'clip' && item.src) {
      return `<figure class="album-tile album-video">${P.PersonArchive.videoPlayer(item, { poster: item.materialManaged ? '' : item.poster })}
        <p class="caption album-video-status" data-video-status role="status" hidden></p>
        <figcaption>${l(label + i('arrow'), route, 'album-caption')}${extra}</figcaption></figure>`;
    }
    const source = item.houseImage || (material && kind === 'photo' ? item.src || item.poster : '');
    if (source || kind === 'photo') {
      const image = source ? `<img src="${e(source)}" alt="${title}" loading="lazy" decoding="async">` :
        `<span class="album-photo-empty" aria-hidden="true">${i('photo')}查看照片</span>
        <img data-album-photo="${e(item.id)}" alt="${title}" decoding="async" hidden>`;
      return `<figure class="album-tile album-photo${mark || extra ? ' album-photo-feature' : ''}">
        ${l(image, route, 'album-photo-open', `aria-label="查看照片 ${title}"`)}
        <figcaption>${label}${extra}</figcaption></figure>`;
    }
    const icon = mark ? 'star' : item.houseVoice ? 'mic' : kind === 'clip' ? 'play' : 'book';
    const note = l(i(icon) + label + i('arrow'), route, 'album-tile album-note');
    return extra ? `<article class="album-tile">${note}${extra}</article>` : note;
  }

  function albumDays(records, renderTile, dateLabel = displayDate) {
    const days = new Map();
    for (const entry of records) {
      const key = entry.date?.iso || '';
      if (!days.has(key)) days.set(key, []);
      days.get(key).push(entry);
    }
    return [...days].map(([key, entries]) => `<div class="album-day" ${key ? 'data-album-date' : ''}>
      ${key ? `<time class="album-day-date" datetime="${key}">${dateLabel(entries[0].date)}</time>` : ''}
      <div class="album-day-tiles">${entries.map(entry => renderTile(entry)).join('')}</div></div>`).join('');
  }

  function album(person, edition, sections, start = '') {
    const jump = edition === 'baby' ? '跳到阶段' : '跳到年月';
    const label = { baby: '成长相册', elder: '有声相册', couple: '双人相册' }[edition];
    const options = sections.map(({ key, label }) => `<option value="${e(key)}">${label}</option>`).join('');
    const timeline = sections.map(({ key, label, body }) => `<section class="album-stage" data-album-stage="${e(key)}" aria-labelledby="album-stage-${e(key)}">
      <h2 id="album-stage-${e(key)}" tabindex="-1">${label}</h2>${body}</section>`).join('');
    return `<section class="edition-album" data-edition-album="${edition}" data-album-person="${e(person)}" data-album-start="${e(start)}"
      aria-label="${label}">
      <div class="album-toolbar"><span>${edition === 'elder' ? '有声相册' : '相册时间线'}</span>
        <select id="album-stage-jump" aria-label="${jump}"><option value="">${jump}</option>
          <option value="start">相册开头</option>${options}</select></div>
      ${timeline}</section>`;
  }

  /** 生日是独立节点，实际拍摄和发生日期决定照片、视频和里程碑的先后。 */
  function growthAlbum(person, birthday, oldStage) {
    const entries = growthEntries(person);
    const stages = new Map();
    const firstDate = entries[0]?.date;
    if (!birthday || (firstDate && firstDate.iso < birthday.iso)) stages.set('pregnancy', []);
    if (birthday) stages.set('birth', []);
    for (const entry of entries) {
      const stage = ageAt(birthday, entry.date);
      if (!stages.has(stage)) stages.set(stage, []);
      stages.get(stage).push(entry);
    }
    // 旧地址仍能定位阶段。原先的 0 月龄包含生日当天，拆分后无同名分组时定位到出生。
    const start = stages.has(oldStage) ? oldStage : oldStage === '0' && birthday ? 'birth' : '';
    const sections = [...stages].map(([key, records]) => {
      const empty = key === 'birth'
        ? `<time class="album-day-date" datetime="${birthday.iso}">${displayDate(birthday)}</time>`
        : '<p class="caption">可以先放一张孕期照片，记下等待见面的日子。</p>';
      return { key, label: ageLabel(key), body: records.length ? albumDays(records, albumTile) : empty };
    });
    return album(person, 'baby', sections, start);
  }

  function baby(id, oldStage) {
    const person = babyPerson(id);
    const birthday = person && dateParts(P.PEOPLE[person].birthDate);
    const ready = growthReady(person);
    const dueDate = person && dateParts(P.PEOPLE[person].dueDate);
    const profileNote = birthday ? displayDate(birthday) + '出生' : dueDate ? '预产期 ' + displayDate(dueDate) : '孕期记录';
    const birthdayNote = ready ? `<p class="caption">${profileNote}
      ${b(birthday ? '修改生日' : '填写生日', 'edition-birthday', 'text-link', `data-person="${e(person)}"`)}</p>` : '';
    const add = ready ? b(i('plus') + ' 添加记录', 'edition-growth-add', 'btn secondary compact', `data-person="${e(person)}"`) : '';
    let body;
    if (!person) {
      body = `<p class="page-subtitle">从孕期开始，慢慢留下长大的每一刻。</p>
        ${b('添加宝宝', 'edition-add-baby', 'btn compact')}`;
    } else if (!ready) {
      body = `<section class="section"><p class="page-subtitle">孕期就可以记录。出生后填上生日，照片和里程碑会接着按月龄排列。</p>
        ${b('设置成长资料', 'edition-birthday', 'btn compact', `data-person="${e(person)}"`)}</section>`;
    } else {
      body = growthAlbum(person, birthday, oldStage);
    }
    return `<div class="page family-edition-page baby-edition">${personHeader(person, 'baby', birthdayNote, add)}${body}</div>`;
  }

  function elderTime(item) {
    const exact = calendarTime(item.eventDate);
    if (exact) return exact;
    const photoTime = calendarTime(item.photoYear);
    // 旧的照片问答只存过上传时间时，不能把上传时间当作拍摄时间。
    if (photoTime || (item.photoToken && !item.photoQuestion)) return photoTime;
    return calendarTime(item.date?.split('·')[0]) || calendarTime(item.year);
  }

  function elderEntries(person) {
    return P.Households.profileEntries(person).filter(({ kind }) => ['photo', 'clip', 'story'].includes(kind))
      .map(entry => {
        const time = elderTime(entry.item);
        return { ...entry, time, date: time?.date };
      }).sort((left, right) => (right.time?.order || 0) - (left.time?.order || 0));
  }

  function voicePlayer(src, label) {
    return `<div class="album-voice">${b(i('play') + `<span>${e(label)}</span>`, 'edition-voice', 'album-voice-button',
      `aria-pressed="false" data-voice-label="${e(label)}"`)}<audio src="${e(src)}" preload="none"></audio></div>`;
  }

  function elderTile(entry, person) {
    const { item } = entry;
    const author = P.PEOPLE[item.author]?.name || '家人';
    const recorder = item.author === person ? '本人记录' : author + ' 帮忙记';
    const byline = item.lifeSample ? recorder + ' · 示意照片' : recorder;
    const mark = item.lifeMilestone ? '人生节点' : '';
    const voice = item.houseVoice?.url ? voicePlayer(item.houseVoice.url, item.houseVoice.sample ? '听示例语音' : '听原声') : '';
    const ask = entry.material || item.babyMilestone ? '' : P.PhotoStories.askButton(item, { album: true });
    const replies = entry.material ? '' : P.PhotoStories.albumReplies(item);
    const screenVoices = entry.material ? '' : P.HouseScreen.voices(item, true);
    return albumTile(entry, { byline, mark, extra: voice + ask + replies + screenVoices });
  }

  function elders(id) {
    const person = elderPerson(id);
    const records = elderEntries(person);
    const periods = new Map();
    for (const entry of records) {
      const key = entry.time?.key || 'undated';
      if (!periods.has(key)) periods.set(key, { key, label: entry.time?.label || '时间待补充', records: [] });
      periods.get(key).records.push(entry);
    }
    const sections = [...periods.values()].map(({ key, label, records: entries }) => ({
      key, label, body: albumDays(entries, entry => elderTile(entry, person), date => `${date.month} 月 ${date.day} 日`)
    }));
    const record = l(i('plus') + ' 记一刻', 'house-moment/' + e(person) + '/elder', 'btn secondary compact');
    const body = sections.length ? album(person, 'elder', sections)
      : '<p class="page-subtitle section">先拍一张，或说一句，留下一件家里的小事。</p>';
    return `<div class="page family-edition-page elder-edition">${personHeader(person, 'elder', '', record)}${body}</div>`;
  }

  function listPhotos(route, id) {
    const entries = route === 'house-baby' ? growthEntries(babyPerson(id)) : elderEntries(elderPerson(id));
    return entries.filter(({ kind, material }) => kind === 'photo' && material).map(({ item }) => item);
  }

  function jumpToStage(album, stage, moveFocus = false) {
    const viewport = album.closest('#app-content');
    if (stage === 'start') {
      viewport.scrollTop = 0;
      if (moveFocus) (viewport.querySelector('[data-edition-person]') || album.querySelector('select')).focus({ preventScroll: true });
      return;
    }
    const section = [...album.querySelectorAll('[data-album-stage]')].find(item => item.dataset.albumStage === stage);
    if (!section) return;
    const toolbar = album.querySelector('.album-toolbar');
    viewport.scrollTop += section.getBoundingClientRect().top - viewport.getBoundingClientRect().top - toolbar.offsetHeight;
    if (moveFocus) section.querySelector('h2').focus({ preventScroll: true });
  }

  /** 打开原记录前记住账号、人物和专版，返回同一相册时恢复阅读位置。 */
  function rememberAlbum(viewport) {
    const album = viewport.querySelector('[data-edition-album]');
    if (album) albumPositions.set(P.state, {
      edition: album.dataset.editionAlbum, person: album.dataset.albumPerson, actor: P.state.actor, top: viewport.scrollTop
    });
  }

  function positionAlbum(viewport, returning = false) {
    const album = viewport.querySelector('[data-edition-album]');
    if (!album) return;
    const position = albumPositions.get(P.state);
    if (returning && position && position.actor === P.state.actor &&
        position.person === album.dataset.albumPerson && position.edition === album.dataset.editionAlbum) {
      viewport.scrollTop = position.top;
    } else if (album.dataset.albumStart) {
      jumpToStage(album, album.dataset.albumStart);
    }
    albumPositions.delete(P.state);
  }

  function openGrowthAdd(person) {
    const upload = (kind, title, icon) => b(i(icon) + title, 'material-new', 'btn secondary full',
      `data-person="${e(P.state.actor)}" data-kind="${kind}" data-from="family" data-baby-member="${e(person)}"`);
    P.modal('添加成长记录', `<div class="stack growth-add-options">
      ${upload('photo', '添加照片', 'photo')}${upload('clip', '添加视频', 'play')}
      ${l(i('star') + '记里程碑', 'house-moment/' + e(person) + '/milestone', 'btn secondary full')}
    </div>`, 'sheet');
  }

  function openBabyForm(person = '') {
    const profile = P.PEOPLE[person];
    const birthdayOnly = growthReady(person);
    P.modal(person ? birthdayOnly ? '宝宝生日' : '成长资料' : '添加宝宝', `<form id="baby-birth-form" data-person="${e(person)}">
      ${person ? '' : '<label class="form-field"><span>宝宝小名</span><input name="nickname" maxlength="20" required placeholder="例如 小满"></label>'}
      ${birthdayOnly ? '<input type="hidden" name="stage" value="born">' : `<label class="form-field"><span>现在的阶段</span>
        <select name="stage" data-baby-stage><option value="pregnancy">孕期</option><option value="born">已出生</option></select></label>`}
      <label class="form-field"><span data-baby-date-label>${birthdayOnly ? '出生日期' : '预产期（选填）'}</span>
        <input type="date" name="birthday" min="1900-01-01" ${birthdayOnly ? `max="${today()}" required` : ''}
          value="${e(profile?.birthDate || '')}"></label>
      <button type="submit" class="btn full">${person ? '保存' : '开始记录'}</button></form>`, 'sheet');
  }

  function handleAction(action, element) {
    if (action === 'edition-voice') {
      const audio = element.nextElementSibling;
      if (!audio?.matches('audio')) return true;
      if (audio.paused) void audio.play().catch(() => {
        if (audio.isConnected) P.toast('暂时无法播放这段语音，可以再试一次。');
      });
      else audio.pause();
      return true;
    }
    if (!['edition-growth-add', 'edition-birthday', 'edition-add-baby'].includes(action)) return false;
    if (P.state.route !== 'house-baby') return true;
    const person = P.Households.memberIds([element.dataset.person])[0];
    if (action === 'edition-growth-add') {
      if (growthReady(person)) openGrowthAdd(person);
    } else if (person || action === 'edition-add-baby') openBabyForm(person);
    return true;
  }

  function submit(form) {
    if (form.id !== 'baby-birth-form') return false;
    let person = P.Households.memberIds([form.dataset.person])[0];
    if (P.state.route !== 'house-baby' || !form.closest('dialog')?.open || form.dataset.person && !person) return true;
    const date = form.elements.birthday.value;
    const stage = form.elements.stage.value;
    const expecting = stage === 'pregnancy';
    if (!expecting && stage !== 'born') return true;
    if ((!expecting || date) && !validDate(date, expecting)) {
      P.toast(expecting ? '请填写有效的预产期。' : '请填写有效的出生日期。');
      return true;
    }
    if (!person) {
      const name = form.elements.nickname.value.trim();
      if (!name || name.length > 20) {
        P.toast('请填写宝宝小名。');
        return true;
      }
      // 宝宝是家庭关系中的成员，可在孕期先归档照片和声音。
      person = P.nextId('baby');
      P.PEOPLE[person] = { name, short: name.slice(0, 2), relation: '孩子', color: 'rose' };
      P.state.members.push(person);
    }
    if (expecting) Object.assign(P.PEOPLE[person], { expecting: true, dueDate: date });
    else Object.assign(P.PEOPLE[person], { expecting: false, birthDate: date, born: date.slice(0, 4) });
    P.navigate('house-baby/' + person, { replace: true });
    return true;
  }

  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('[data-baby-stage]')) {
      const born = input.value === 'born';
      const date = input.form.elements.birthday;
      input.form.querySelector('[data-baby-date-label]').textContent = born ? '出生日期' : '预产期（选填）';
      date.required = born;
      if (born) date.max = today();
      else date.removeAttribute('max');
    } else if (input.dataset.editionPerson) {
      if (input.value === '_add') {
        input.selectedIndex = Array.from(input.options).findIndex(option => option.defaultSelected);
        openBabyForm();
        return;
      }
      const person = P.Households.memberIds([input.value])[0];
      if (person) P.navigate((input.dataset.editionPerson === 'baby' ? 'house-baby/' : 'house-elders/') + person, { replace: true });
    } else if (input.id === 'album-stage-jump' && input.value) {
      jumpToStage(input.closest('.edition-album'), input.value, true);
      input.value = '';
    }
  });
  function syncVoice(audio, playing) {
    const control = audio.closest('.album-voice')?.querySelector('.album-voice-button');
    if (!control) return;
    control.setAttribute('aria-pressed', String(playing));
    control.querySelector('.icon').outerHTML = i(playing ? 'pause' : 'play');
    control.querySelector('span').textContent = playing ? '暂停播放' : control.dataset.voiceLabel;
  }

  // 同一相册只播放一段媒体，离开页面时停止旧录音。
  document.addEventListener('play', event => {
    const album = event.target.closest('.edition-album');
    if (!album) return;
    for (const media of album.querySelectorAll('audio,video')) {
      if (media !== event.target && !media.paused) media.pause();
    }
    syncVoice(event.target, true);
  }, true);
  for (const event of ['pause', 'ended']) document.addEventListener(event, value => syncVoice(value.target, false), true);

  function stopAlbumAudio() {
    document.querySelectorAll('.edition-album audio').forEach(audio => audio.pause());
  }

  P.FamilyEditions = { baby, elders, listPhotos, rememberAlbum, positionAlbum, handleAction, submit,
    today, validDate, calendarTime, voicePlayer, stopAlbumAudio, album, albumDays, albumTile };
}
