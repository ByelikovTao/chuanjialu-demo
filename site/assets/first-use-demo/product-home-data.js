(function () {
  'use strict';

  const OWNER = 'father';
  const INVITED_ACTOR = 'first-use-self';
  const PREFIX = 'first-use-';
  const workspaces = new WeakMap();
  const wrappedRuntimes = new WeakSet();
  const importedFamilies = new WeakMap();

  function workspaceData(P) {
    let data = workspaces.get(P.state);
    if (!data) {
      data = { familyName: '', photoUrls: new Map(), content: new Map() };
      workspaces.set(P.state, data);
    }
    return data;
  }

  function albumView(P, render) {
    return (...args) => {
      // 留影相册筛掉未同步的照片，首页轮播仍从原列表读取封面。
      const sharedEntries = P.Households.sharedFamilyEntries;
      P.Households.sharedFamilyEntries = (...options) => sharedEntries(...options)
        .filter(({ item }) => item.includeInAlbum !== false);
      try {
        return render(...args);
      } finally {
        P.Households.sharedFamilyEntries = sharedEntries;
      }
    };
  }

  function wrapProductViews(P) {
    if (wrappedRuntimes.has(P)) {
      return;
    }
    const render = P.views.home;
    P.views.home = () => {
      const html = render();
      const data = workspaces.get(P.state);
      if (!data?.familyName) {
        return html;
      }
      // 完整版题头会再加「我们」，独立演示保留用户实际填写的家名。
      const page = document.createElement('template');
      page.innerHTML = html;
      const title = page.content.querySelector('.home-cover > h1');
      if (title) {
        title.textContent = data.familyName;
      }
      return page.innerHTML;
    };
    P.FamilyJournal.albumPreview = albumView(P, P.FamilyJournal.albumPreview);
    P.views['home-album'] = albumView(P, P.views['home-album']);
    P.FamilyJournal.openPhoto = albumView(P, P.FamilyJournal.openPhoto);
    wrappedRuntimes.add(P);
  }

  function mediaUrl(data, record, id) {
    if (!record.file) {
      return record.sample === 'family-reunion'
        ? 'assets/first-use-demo/assets/family-reunion.webp'
        : 'assets/first-use-demo/assets/first-day-at-work.webp';
    }
    // 第一手照片只能追加，同一条记录后续仅会更新叙述，因而可保留已有媒体地址。
    if (!data.photoUrls.has(id)) {
      data.photoUrls.set(id, URL.createObjectURL(record.file));
    }
    return data.photoUrls.get(id);
  }

  function firstLine(value) {
    const line = value.split('\n').find((part) => part.trim())?.trim() || '';
    const characters = Array.from(line);
    return characters.length > 28 ? characters.slice(0, 28).join('') + '…' : line;
  }

  function syncMedia(P, data, records) {
    const previous = new Map([...P.state.stories, ...P.state.archiveAssets].map((item) => [item.id, item]));
    const covers = [];
    const stories = [];
    const clips = [];
    for (const record of records) {
      if (!['cover', 'media', 'journal'].includes(record.kind)) {
        continue;
      }
      const id = PREFIX + 'record-' + record.id;
      const body = record.kind === 'journal' ? record.value : record.note;
      const text = body ? body.split('\n').filter(Boolean) : [];
      const isCover = record.homePhoto || record.kind === 'cover';
      const title = isCover && record.file ? '首页照片' : record.caption || firstLine(body || '') || '家庭往事';
      const previousEntry = previous.get(id);
      const base = {
        ...previousEntry, id, title, author: OWNER, subject: OWNER, confirmedBy: OWNER,
        scope: 'family', viewers: [...P.state.members], fromFamily: true
      };
      if (record.mediaType === 'video' && record.file) {
        clips.push({
          ...base, kind: 'clip', src: mediaUrl(data, record, id), bytes: record.file.size,
          description: body || '', sourceLabel: '家庭成员上传的视频', materialManaged: true
        });
        continue;
      }
      const story = {
        ...base, text, category: '共同回忆', homeCover: Boolean(isCover),
        includeInAlbum: record.includeInAlbum !== false,
        source: record.kind === 'journal' ? '家庭成员文字记录' : '家人分享的照片'
      };
      if (record.kind !== 'journal') {
        story.houseImage = mediaUrl(data, record, id);
        story.houseBytes = record.file?.size || 0;
      }
      (isCover ? covers : stories).push(story);
    }

    // 完整版按倒序读取相片，导入封面时仍让新用户先选的那张排在第一位。
    const importedStories = [...stories, ...covers.reverse()];
    P.state.stories = [...P.state.stories.filter((item) => !item.id.startsWith(PREFIX)), ...importedStories];
    P.state.archiveAssets = [...P.state.archiveAssets.filter((item) => !item.id.startsWith(PREFIX)), ...clips];
    const active = new Set([...importedStories, ...clips].map((item) => item.id));
    for (const [id, url] of data.photoUrls) {
      if (!active.has(id)) {
        URL.revokeObjectURL(url);
        data.photoUrls.delete(id);
      }
    }
  }

  function insertPerson(P, id, name, relation, hasAccount) {
    if (!P.PEOPLE[id]) {
      P.PEOPLE[id] = { name, relation, short: Array.from(name)[0], color: 'sand' };
      P.state.members.push(id);
    }
    if (hasAccount) {
      P.state.accounts[id] ||= P.newAccount();
      P.state.familyInvitations[id] ||= [OWNER];
      P.state.familyAccess[id] ||= { archive: [OWNER], digital: [], space: [] };
      const ownerAccess = P.state.familyAccess[OWNER].archive;
      if (!ownerAccess.includes(id)) {
        ownerAccess.push(id);
      }
      P.state.familyInvitations[OWNER] ||= [];
      if (!P.state.familyInvitations[OWNER].includes(id)) {
        P.state.familyInvitations[OWNER].push(id);
      }
    }
  }

  function syncPeople(P, data, snapshot, initial) {
    const profileOwner = snapshot.invitedBy ? INVITED_ACTOR : OWNER;
    const creator = P.PEOPLE[OWNER];
    if (snapshot.invitedBy) {
      creator.name = snapshot.invitedBy;
      creator.short = Array.from(creator.name)[0];
      insertPerson(P, INVITED_ACTOR, '我', '家人', true);
    }
    const person = P.PEOPLE[profileOwner];
    const profile = JSON.stringify([snapshot.profileName, snapshot.profileDetails]);
    if (data.content.get('profile') !== profile) {
      data.content.set('profile', profile);
      person.name = snapshot.profileName?.trim() || '我';
      person.short = Array.from(person.name)[0];
      if (snapshot.profileDetails) {
        const { birthday = '', hometown, intro, education, work } = snapshot.profileDetails;
        person.birthDate = birthday;
        person.born = birthday.slice(0, 4);
        (P.state.storyPersonDetails ||= {})[profileOwner] = { hometown, intro, education, work };
      }
    }
    for (const invitation of snapshot.invitations || []) {
      if (invitation.status === 'accepted') {
        insertPerson(P, PREFIX + invitation.id, invitation.name, invitation.relation, true);
      }
    }
    for (const record of snapshot.records) {
      if (record.kind === 'tree' && record.value?.trim()) {
        // 旧版只保存了称呼，保留人物，但不补造具体亲属关系或访问权限。
        insertPerson(P, PREFIX + 'person-' + record.id, record.value.trim(), '家人', false);
      }
    }
    if (snapshot.invitedBy && initial) {
      P.changeActor(INVITED_ACTOR, { switchingHousehold: true });
    }
  }

  function syncWriting(P, data, records, familyName) {
    for (const kind of ['motto', 'history']) {
      const text = records.filter((record) => record.kind === kind).map((record) => [
        record.topic, record.value, record.source && '来源 · ' + record.source
      ].filter(Boolean).join('\n')).join('\n\n');
      if (data.content.get(kind) === text) {
        continue;
      }
      data.content.set(kind, text);
      const home = P.FamilyHome.ensure();
      const parent = kind === 'motto' ? home.family : P.FamilyHome.profile(OWNER);
      const field = kind === 'motto' ? 'motto' : 'origin';
      const previous = parent[field];
      // 草稿编辑期间切换页面也沿用完整版的修订号与查看权限。
      const details = kind === 'motto' ? { byline: '' } : { title: familyName + '家史' };
      parent[field] = text ? {
        ...previous, ...details, text, confirmedBy: OWNER, revision: (previous?.revision || 0) + 1
      } : null;
    }
  }

  function apply(P, snapshot) {
    const family = P.Households.current();
    const anchor = importedFamilies.get(P);
    // 如果用户打开了另一个完整版工作区，原有初始化资料不能覆盖过去。
    if (!family || (anchor && anchor !== family)) {
      return;
    }
    importedFamilies.set(P, family);
    const data = workspaceData(P);
    data.familyName = snapshot.familyName;
    family.name = snapshot.familyName;
    P.HOME_NAME = snapshot.familyName;
    wrapProductViews(P);
    syncPeople(P, data, snapshot, !anchor);
    syncMedia(P, data, snapshot.records);
    syncWriting(P, data, snapshot.records, snapshot.familyName);
  }

  window.firstUseProductData = { apply };
}());
