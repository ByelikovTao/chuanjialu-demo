/** 家庭关系、记录、个人中心与会员页面；收费和授权仅作演示。 */
'use strict';
{
  const P=window.App;
  const {icon:i,button:b,link:l,badge:t,avatar:a,escape:e}=P;
  /** 称呼只来自已知示例关系，viewer 是称呼的观察者；关系不明时使用中性称呼。 */
  function relation(id,viewer=P.state.actor) {
    if(id===viewer)return '我';
    if(P.state.familyWorkspace){
      if(viewer==='father')return P.PEOPLE[id]?.relation||'家人';
      if(id==='father')return {父亲:'子女',母亲:'子女',儿子:'父母',女儿:'父母',孙子:'祖辈',孙女:'祖辈',妻子:'丈夫',丈夫:'妻子',兄弟姐妹:'兄弟姐妹'}[P.PEOPLE[viewer]?.relation]||'家人';
      return '家人';
    }
    const known = {
      father: {xia:'女儿', mother:'妻子', grandpa:'父亲', grandma:'母亲', nian:'孙女'},
      mother: {father:'丈夫', xia:'女儿', grandpa:'公公', grandma:'婆婆', nian:'孙女'},
      grandpa: {father:'儿子', mother:'儿媳', grandma:'妻子', xia:'孙女', nian:'曾孙女'},
      grandma: {father:'儿子', mother:'儿媳', grandpa:'丈夫', xia:'孙女', nian:'曾孙女'},
      xia: {father:'爸爸', mother:'妈妈', grandpa:'爷爷', grandma:'奶奶', nian:'侄女'},
      nian: {father:'爷爷', mother:'奶奶', grandpa:'曾祖父', grandma:'曾祖母', xia:'姑姑'}
    };
    if(known[viewer]?.[id])return known[viewer][id];
    if(viewer==='father')return P.PEOPLE[id]?.relation || '家人';
    if(id==='father')return {儿子:'爸爸',女儿:'爸爸',孙子:'爷爷',孙女:'爷爷',妻子:'丈夫'}[P.PEOPLE[viewer]?.relation] || '家人';
    return '家人';
  }
  /** 家人列表只显示基本身份，不根据关系开放私人资料。 */
  function memberRow(id) {
    const {name} = P.PEOPLE[id];
    const recorded = id === 'grandpa' || id === 'grandma';
    const claimed = Boolean(P.state.accounts[id]);
    const self = id === P.state.actor;
    let status = claimed ? '已加入家庭' : '待本人认领';
    if (recorded) status = '家人记载';
    if (id === 'father') status = P.state.familyWorkspace ? '家庭管理人' : '人生记录已建档';
    const portrait = `<span class="family-member-photo" aria-hidden="true">${a(id)}</span>`;
    const copy = `<span class="family-member-copy">
      <span class="family-member-heading"><strong>${e(name)}</strong><span class="family-member-relation${self ? ' is-self' : ''}">${self ? '（我）' : e(relation(id))}</span></span>
      <span class="family-member-status${!recorded && !claimed ? ' is-awaiting' : ''}">${status}</span>
    </span>`;
    return `<li>${b(portrait + copy + i('arrow'), 'person', 'family-member-row', `data-id="${e(id)}"`)}</li>`;
  }
  function familyInvitations(invitations, canInvite) {
    if (!invitations.length) return '';
    const rows = invitations.map((entry, index) => {
      const {id, name, relation: title, status, correctionNote} = entry;
      const pending = status === 'pending';
      const label = status === 'accepted' ? '已确认加入' : status === 'revoked' ? '邀请已撤回' : '等待家人加入';
      const actions = !pending ? '' : `<div class="family-invitation-actions">
        ${b('预览加入邀请', 'preview-invite', 'paper-link', `data-index="${index}"`)}
        ${canInvite ? b('更正信息', 'edit-invite', 'paper-link', `data-id="${e(id)}"`) + b('撤回', 'revoke-invite', 'paper-link', `data-id="${e(id)}"`) : ''}
      </div>`;
      return `<li class="family-invitation">
        <div class="family-invitation-heading"><strong>${e(name)}</strong><span>${e(title)}</span></div>
        <p class="family-member-status${pending ? ' is-awaiting' : ''}">${label}</p>
        ${correctionNote ? `<p class="caption">${e(correctionNote)}</p>` : ''}
        ${actions}
      </li>`;
    });
    return `<section class="section" aria-labelledby="family-invitation-title">
      <div class="section-heading"><h2 id="family-invitation-title">家庭邀请</h2></div>
      <ul class="family-invitation-list paper-card">${rows.join('')}</ul>
    </section>`;
  }
  /** 关系树和列表共用同一组成员，复杂关系保留列表入口。 */
  function family() {
    const {actor, familyTab, invitations, pending: submissions} = P.state;
    const canInvite = actor === 'father';
    const members = P.Households.memberIds().sort((left, right) => Number(right === actor) - Number(left === actor));
    const familyName = P.Households.current()?.name;
    const tree = familyTab === '关系树';
    const pending = P.pendingCount();
    const ownAdditions = submissions.filter(item => item.author === actor);
    const additionStatus = ownAdditions.length ? `<div class="section stack"><div class="section-heading"><h2>我提交的补充</h2></div>${ownAdditions.map(item => `<div class="card"><h3 class="card-title">${e(item.title)}</h3><p class="caption">${item.status === 'returned' ? '本人建议更正' : '等待本人核对'}</p>${item.feedback ? `<p>${e(item.feedback)}</p>` : ''}${item.status === 'returned' ? b('更正后再次提交', 'edit-pending', 'paper-link', `data-id="${e(item.id)}"`) : '<p class="caption">尚未进入已确认的人生档案。</p>'}</div>`).join('')}</div>` : '';
    const roster = `<ul class="family-roster paper-card" aria-label="家庭成员">${members.map(memberRow).join('')}</ul>`;
    const context = [familyName, !tree && `${members.length} 位家人`].filter(Boolean).join(' · ');
    return `<div class="page family-members-page">
      <div class="family-members-heading">
        <div>
          <div class="section-heading"><h2>${tree ? '家谱' : '家人名册'}</h2></div>
          ${context ? `<p>${e(context)}</p>` : ''}
        </div>
        ${b(i(canInvite ? 'plus' : 'family') + (canInvite ? '邀请家人' : '如何邀请'), 'invite', 'paper-link paper-outline family-invite-entry', 'aria-haspopup="dialog"')}
      </div>
      <div class="family-members-switch" role="group" aria-label="查看方式">
        ${b(i('list') + '家人列表', 'family-tab', 'paper-link', `data-value="列表" aria-pressed="${!tree}"`)}
        ${b(i('tree') + '关系树', 'family-tab', 'paper-link', `data-value="关系树" aria-pressed="${tree}"`)}
      </div>
      <div class="family-members-content">${tree ? P.FamilyHomeViews.kinship(P.FamilyHome.ensure().family.mottoOwner) : roster}</div>
      ${familyInvitations(invitations, canInvite)}
      ${pending ? `<div class="family-members-pending section"><span>${pending} 条补充或查看申请待核对</span>${b('去核对' + i('arrow'), 'pending', 'paper-link')}</div>` : ''}
      ${additionStatus}
      <div class="family-members-footer section">
        ${l('查看一家人的往事' + i('arrow'), 'house-stories/family', 'paper-link')}
      </div>
    </div>`;
  }
  /** 分享名单由当前真实成员生成，同一字段可传递多个指定家人。 */
  function shareViewerOptions(selected=[]) {
    const members=P.state.members.filter(id=>id!==P.state.actor && P.PEOPLE[id]);
    return `<fieldset class="share-viewers"><legend>指定家人时，请勾选可查看的人</legend>${members.map(id=>`<label class="check-row"><input type="checkbox" name="viewers" value="${e(id)}" ${selected.includes(id)?'checked':''}><span>${e(P.PEOPLE[id].name)}<small>${e(relation(id))}</small></span></label>`).join('')}<p class="caption">仅在分享范围为“指定家人”时使用这份名单；可以选择多位家人。</p></fieldset>`;
  }
  /** 录制与文字共用原文确认入口；草稿和 AI 整理为辅助操作，整理扣次单独说明。 */
  function record() {
    const r=P.state.record;
    const context=P.visibleStories().find(story=>story.id===r.storyId);
    const related=r.storyId?`<div class="record-context"><span>关联故事</span><strong>${e(context?.title || '当前未获授权的故事')}</strong>${context?l('回看原故事','story/'+context.id):''}</div>`:'';
    return `<div class="page"><p class="eyebrow">一句话，也值得被记住</p><h1 class="page-title">今天，<br>想讲点什么？</h1><p class="page-subtitle">可以从一张照片、一件小事，或家人的一个问题开始。</p><div class="recording-card"><div class="record-orbit ${r.recording&&!r.paused?'recording':''}">${i('mic')}</div><p id="record-time" class="record-time">${P.duration(r.seconds)}</p><p id="record-status" class="caption">${r.recording?(r.paused?'已暂停 · 录音演示':'正在录制 · 录音演示'):'点击开始，试着讲一段回忆'}</p><div class="record-controls">${b(i(r.recording?(r.paused?'play':'pause'):'mic')+(r.recording?(r.paused?' 继续':' 暂停'):' 开始录音'),'record-toggle','btn')}${r.recording?b(i('stop')+' 结束','record-stop','btn outline'):''}</div><p class="caption demo-note">原型录音为状态演示，可直接在下方输入文字。</p></div><form id="record-form"><input type="hidden" name="storyId" value="${e(r.storyId || '')}">${related}<div class="form-field"><label for="record-kind">这次想记录谁的经历？</label><select id="record-kind" name="kind"><option value="own" ${r.kind!=='contribution'?'selected':''}>记录我自己的人生</option><option value="contribution" ${r.kind==='contribution'?'selected':''}>补充${e(P.PEOPLE[P.FamilyContext.current()]?.name||'家人')}的经历，提交本人核对</option></select><p class="caption">自己的记录由你确认；补充他人的经历，会保留你的讲述者身份。</p></div><div class="form-field"><label for="record-title">给这段回忆起个名字</label><input id="record-title" name="title" maxlength="48" placeholder="例如：第一次离开家去工作" value="${e(r.title)}"></div><div class="form-field"><label for="record-year">这件事大约发生在哪一年？</label><input id="record-year" name="eventYear" type="number" inputmode="numeric" min="1000" max="${new Date().getFullYear()}" step="1" value="${e(r.eventYear)}" required><p class="caption">人生时间线按这年归档，今天的记录日期会另行保留。</p></div><div class="form-field"><label for="record-text">想留下的话</label><textarea id="record-text" name="text" placeholder="慢慢说，也可以直接写下来…">${e(r.text)}</textarea></div><div class="record-form-buttons"><button class="btn" type="submit" name="intent" value="review">查看原文并确认</button><button class="btn secondary" type="submit" name="intent" value="draft">保存草稿</button><button class="btn outline" type="submit" name="intent" value="organize" aria-describedby="record-organize-note">AI 文字整理</button></div><p id="record-organize-note" class="caption record-organize-note">家庭会员可体验 AI 文字整理。</p></form></div>`;
  }
  /** 内容确认将生成方式、提供者和分享范围分别显示。 */
  function review() {
    const r=P.state.record,contribution=r.kind==='contribution' && P.state.actor!=='father';
    if(!r.text.trim())return `<div class="page empty">${i('book')}<h2>还没有可以确认的记录</h2><p>先写下想留下的话，再核对内容与分享范围。</p>${l('开始记录','record','btn')}</div>`;
    return `<div class="page"><p class="eyebrow">在留下之前，再看一遍</p><h1 class="page-title">确认这段记录</h1><div class="tags">${t(r.aiOrganized?'AI 整理示例':'原文记录')}${t(contribution?'提交本人核对':'由我确认','warm')}</div><div class="review-story card section"><h2 class="serif">${e(r.title || '今天的一段回忆')}</h2><p class="caption">事情发生于 ${e(r.eventYear)} 年 · 记录于今天</p><p>${e(r.text || '今天和家人一起翻看旧照片，想起了许多平时没有讲完的事。这段经历，我想慢慢留下来。')}</p></div>${l(i('edit')+' 回去更正内容','record')}<form id="publish-form" class="section"><div class="form-field"><label for="share-scope">确认后，这段故事想分享给谁？</label><select id="share-scope" name="scope"><option value="private" ${r.scope==='private'?'selected':''}>仅自己保存</option><option value="selected" ${r.scope==='selected'?'selected':''}>指定家人，在下方选择</option><option value="family" ${r.scope==='family'?'selected':''}>当前家庭中的家人</option></select><p class="caption">新加入的成员不会自动获得本次分享权限。</p></div>${shareViewerOptions(r.viewers || [])}<label class="check-row"><input name="confirmed" type="checkbox" required><span>我已核对内容，并确认上述分享范围。${contribution?'本次补充内容将提交陈远山本人查看和核对。':''}</span></label><button class="btn full" type="submit">${contribution?'提交陈远山核对':'确认并保存自己的记录'}</button></form><p class="caption section">${contribution?'本人确认后，补充才会进入人生档案，保留你的讲述者身份，并按所选范围保存。':'这段记录由你自己确认和决定分享范围，不需要家庭管理人代为审批。'}</p></div>`;
  }
  /** 我的页面汇总家庭管理、留言索引和服务入口。 */
  function profile() {
    const s = P.state;
    const person = P.PEOPLE[s.actor];
    const pending = P.MaterialLibrary.reviewCount();
    const familyName = P.Households.current()?.name;
    const frame = P.HouseScreen.managementEntry('profile');
    const frameName = P.Households.addonOffer('frame').title;
    const role = s.actor === 'father' ? (s.familyWorkspace ? '家庭管理人' : '档案本人') : '受邀家人';
    return `<div class="page profile-page">
      <header class="profile-cover home-cover">
        ${l(i('settings') + '设置', 'settings', 'paper-link profile-settings')}
        <h1>${e(person.name)}</h1>
        <p class="profile-role">${role}</p>
        <div class="profile-portrait wood-frame" aria-hidden="true">${a(s.actor, 'large')}</div>
        <div class="profile-shortcuts">
          ${l(`${i('family')}<span><strong>${familyName?'切换家庭':'创建家庭'}</strong><small>${e(familyName || '还未加入家庭')}</small></span>${i('arrow')}`,'house-switch','profile-shortcut')}
          ${P.BillingViews.profileSummary()}
        </div>
      </header>
      ${s.draftSaved?`<div class="notice section">有一份还没写完的回忆。${l('查看草稿','materials')}</div>`:''}
      <section class="profile-menu-group" aria-labelledby="profile-family-heading">
        <div class="section-heading home-section-heading"><h2 id="profile-family-heading">家人家事</h2></div>
        <div class="profile-menu profile-main-menu bound-paper">
          ${profileMenu('family','家庭管理','profile-family')}
          ${pending ? profileMenu('check', `待核对 · ${pending} 条`, 'material-inbox') : ''}
          ${P.QuestionInbox.hasNotice() ? profileMenu('chat', '家人留言 · 待查看', 'questions') : ''}
        </div>
      </section>
      <section class="profile-menu-group" aria-labelledby="profile-services-heading">
        <div class="section-heading home-section-heading"><h2 id="profile-services-heading">家庭服务</h2></div>
        <div class="profile-menu profile-main-menu bound-paper">
          ${frame ? profileMenu('screen', frame.bound ? frameName : `${frameName} · 待绑定`, frame.route) : ''}
          ${profileMenu('spark','传家定制','house-addons')}
          ${profileMenu('source','订单与进度','service-orders')}
        </div>
      </section>
      <div class="profile-demo">${P.Households.identityPicker()}</div>
    </div>`;
  }
  /** 分组标题由公共页头显示，正文从说明和对应入口读起。 */
  function profileSection(title, description, menu) {
    return `<div class="page profile-section-page">
      ${description ? `<p class="page-subtitle">${e(description)}</p>` : ''}
      <nav class="profile-menu profile-section-menu" aria-label="${e(title)}">${menu}</nav>
      ${l(i('back') + '返回我的', 'profile', 'paper-link paper-outline profile-section-back section')}
    </div>`;
  }
  /** 家庭管理集中处理成员加入和人生空间授权。 */
  function profileFamily() {
    const menu = profileMenu('family', '成员与邀请', 'family') +
      profileMenu('lock', '空间授权与核对', 'family-permissions');
    return profileSection('家庭管理', '', menu);
  }
  P.views['profile-family'] = profileFamily;
  /** 主菜单以图标、标题、说明还原参考卡片；次级菜单保持同一导航与点击区域。 */
  function profileMenu(icon, text, route) {
    const descriptions={'profile-family':'邀请家人加入，管理查看权限','service-orders':'查看待处理事项与交付进度',family:'查看家庭成员和邀请进度','family-permissions':'设置档案和回忆场景的查看权限，核对共同经历','material-inbox':'查看家人提交的补充，核对后归入档案'};
    const copy=descriptions[route]?`<div class="profile-menu-copy"><span>${text}</span><small>${descriptions[route]}</small></div>`:`<span>${text}</span>`;
    return `<button class="menu-row" type="button" data-nav="${route}">${i(icon)}${copy}${i('arrow')}</button>`;
  }
  /** 全部账号进入同一人物共享服务，不再出售家人个人会员。 */
  function membership() {return P.BillingViews.membership();}
  /** 家人一键确认加入。关联已有族谱人物时，在同一步明确确认身份。 */
  function invitation() {
    const item=P.state.invitations[P.state.inviteIndex || 0];
    if (!item) return `<div class="page empty"><h2>暂无需要核对的邀请</h2>${l('回到家庭','family','btn')}</div>`;
    if (item.status!=='pending') return `<div class="page empty">${i('check')}<h2>${item.status==='accepted'?'已加入'+e(P.HOME_NAME):'这份邀请已撤回'}</h2><p>人物与关系状态已更新，资料仍按授权范围分享。</p>${l('看看家里的故事','home','btn')}</div>`;
    if(item.correctionNote)return `<div class="page empty">${i('edit')}<h2>邀请信息等待更正</h2><p>${e(item.correctionNote)}</p><p class="caption">更正前不会加入家庭、认领人物或确认关系。</p>${P.state.actor==='father'?b('以邀请人身份更正信息','edit-invite','btn',`data-id="${item.id}"`):''}${l('回到家庭查看进度','family','text-link full')}</div>`;
    const claim=P.state.members.includes(item.personId)&&Boolean(P.PEOPLE[item.personId]);
    const relation=item.relation&&item.relation!=='家人'?`<p class="caption">${e(P.PEOPLE.father.name)}邀请自己的${e(item.relation)}加入。</p>`:'';
    const hasWelcomeStory=P.welcomeStories().some(story=>story.id===item.welcomeStoryId);
    return `<div class="page"><div class="invite-hero">${a('father','large')}<p class="caption">受邀人预览 · ${e(P.PEOPLE.father.name)}邀请你</p>
      <h1 class="page-title">加入「${e(P.HOME_NAME)}」</h1><p>一起听故事，也留下你的那一份。</p></div>
      <div class="card section"><p class="caption">这份邀请送给</p><h2 class="card-title">${e(item.name)}</h2>${relation}
      ${claim?'<p class="caption">加入时会确认家谱里的这位家人是你。</p>':''}</div>
      ${hasWelcomeStory?'<p class="note section">发起人为你选了一条往事，加入后就能查看。</p>':''}
      <form id="accept-invite-form" class="section"><input type="hidden" name="inviteId" value="${e(item.id)}">
      <button type="submit" class="btn full">${claim?'确认是我，加入家庭':'加入家庭'}</button></form>
      ${b('信息有误，需要更正','correct-invite','text-link full')}<p class="caption section">加入后，按家人设定的分享范围查看和参与。</p></div>`;
  }
  /** 设置页面只列出本人可控制的分享内容。 */
  function settings() {
    const owned=P.state.stories.filter(x=>x.author===P.state.actor&&!x.coupleId);
    const count=P.pendingCount();
    return `<div class="page"><h1 class="page-title">分享，由你决定。</h1><p class="page-subtitle">亲属关系帮助我们认识彼此。每一段故事的分享范围，仍由本人选择。</p>${count?`<div class="notice row"><span class="grow">${count} 条内容等待你核对</span>${b('查看补充与申请','pending','text-link')}</div>`:''}<div class="section stack">${owned.length?owned.map(x=>`<div class="card"><h2 class="card-title">${e(x.title)}</h2><div class="row between" style="margin-top:12px">${t(x.scope==='private'?'仅自己':x.scope==='selected'?'指定家人':'当前家庭','gray')}${b('调整范围','share-owned','text-link',`data-id="${x.id}"`)}</div></div>`).join(''):`<div class="empty">${i('book')}<p>你还没有创建自己的记录。</p>${l('记录一刻','record','btn')}</div>`}</div><div class="section"><div class="section-heading"><h2>阅读偏好</h2></div>${b(i('book')+(P.state.fontLarge?' 使用标准字号':' 使用大字号'),'toggle-font','btn secondary full')}</div><div class="note section">你的私聊不因亲属绑定而向其他家人公开。管理人只能在获授权的范围内协助。</div></div>`;
  }
  /** 首次进入明确视频客户与受邀家人两条路径。 */
  function welcome() {
    return `<div class="welcome-page"><header class="welcome-brand"><strong>传家录</strong><p>陈远山的人生记录</p><h1>一段影像，<br>连起三代的家。</h1><p>视频服务客户开通家庭，<br>家人通过邀请参与。</p></header><div class="page"><h2 class="section-heading">请选择你的身份</h2><p class="page-subtitle">受邀家人无需重复购买视频，按本人授权查看。</p><div class="welcome-identities section">${b(`${a('father','large')}<span><strong>我是档案本人</strong><small>我开通家庭，管理我的人生记录。</small></span>${i('arrow')}`,'enter-owner','welcome-identity')}${b(`${a('xia','large')}<span><strong>我是受邀家人</strong><small>通过家人的邀请，按授权查看和补充。</small></span>${i('arrow')}`,'enter-family','welcome-identity')}</div>${b('了解视频服务与开通条件','video-service','text-link full section')}<p class="caption section">当前使用已交付订单与已受邀账号的示例，不进行真实注册或验证。</p></div></div>`;
  }
  Object.assign(P.views,{family,record,review,profile,membership,invitation,settings,welcome});
  P.relation=relation;
  P.shareViewerOptions=shareViewerOptions;
}
