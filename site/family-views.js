/** 家庭关系、记录、个人中心与会员页面；收费和授权仅作演示。 */
'use strict';
{
  const P=window.App;
  const {icon:i,button:b,link:l,avatar:a,escape:e}=P;
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
    const additionStatus = ownAdditions.length ? `<div class="section stack"><div class="section-heading"><h2>我提交的补充</h2></div>${ownAdditions.map(item => `<div class="card"><h3 class="card-title">${e(item.title)}</h3><p class="caption">${item.status === 'returned' ? '本人建议更正' : '等待本人核对'}</p>${item.feedback ? `<p>${e(item.feedback)}</p>` : ''}<p class="caption">尚未进入已确认的人生档案。</p></div>`).join('')}</div>` : '';
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
  /** 我的页面汇总家庭管理、留言索引和服务入口。 */
  function profile() {
    const s = P.state;
    const person = P.PEOPLE[s.actor];
    const familyName = P.Households.familyDisplayName();
    const frame = P.HouseScreen.managementEntry('profile');
    const frameName = P.Households.addonOffer('frame').title;
    const role = s.actor === 'father' ? (s.familyWorkspace ? '家庭管理人' : '档案本人') : '受邀家人';
    return `<div class="page profile-page">
      <header class="profile-cover">
        <div class="profile-identity">
          <label class="profile-avatar-control" title="更换头像">
            <input id="profile-avatar-file" type="file" class="sr-only" accept="${P.Households.sharedPhotoAccept}">
            <span class="sr-only">更换头像</span>
            <span class="profile-portrait wood-frame" aria-hidden="true">${a(s.actor, 'large')}</span>
            <span class="profile-avatar-mark" aria-hidden="true">${i('photo')}</span>
          </label>
          <div class="profile-identity-copy"><h1>${e(person.name)}</h1><p class="profile-role">${role}</p></div>
        </div>
        <div class="profile-shortcuts">
          ${l(`${i('family')}<span><strong>${familyName?'切换家庭':'创建家庭'}</strong><small>${e(familyName || '还未加入家庭')}</small></span>${i('arrow')}`,'house-switch','profile-shortcut')}
          ${P.BillingViews.profileSummary()}
        </div>
        ${b(i('book') + '<span>大字号</span><span class="profile-font-track" aria-hidden="true"></span>',
          'toggle-font', 'profile-font-row', `id="profile-font-toggle" role="switch" aria-checked="${Boolean(s.fontLarge)}"`)}
      </header>
      <nav class="profile-menu profile-main-menu" aria-labelledby="profile-menu-title">
        <h2 id="profile-menu-title">家庭与服务</h2>
        ${profileMenu('family','家庭管理','profile-family')}
        ${P.QuestionInbox.hasNotice() ? profileMenu('chat', '家人留言 · 待查看', 'questions') : ''}
        ${frame ? profileMenu('screen', frame.bound ? frameName : `${frameName} · 待绑定`, frame.route) : ''}
        ${profileMenu('spark','传家定制','house-addons')}
        ${profileMenu('source','订单与进度','service-orders')}
      </nav>
    </div>`;
  }
  /** 分组标题由公共页头显示，正文从说明和对应入口读起。 */
  function profileSection(title, description, menu) {
    return `<div class="page profile-section-page">
      ${description ? `<p class="page-subtitle">${e(description)}</p>` : ''}
      <nav class="profile-menu profile-section-menu" aria-label="${e(title)}">${menu}</nav>
      ${P.returnLink(i('back') + '返回我的', 'profile', 'paper-link paper-outline profile-section-back section')}
    </div>`;
  }
  /** 家庭管理集中处理成员加入和人生空间授权。 */
  function profileFamily() {
    const menu = profileMenu('family', '成员与邀请', 'family') +
      profileMenu('lock', '空间授权与核对', 'family-permissions');
    return profileSection('家庭管理', P.Households.current()?.name, menu);
  }
  P.views['profile-family'] = profileFamily;
  /** 主菜单以图标、标题、说明还原参考卡片；次级菜单保持同一导航与点击区域。 */
  function profileMenu(icon, text, route) {
    const descriptions={'profile-family':'邀请家人加入，管理查看权限','service-orders':'查看待处理事项与交付进度',family:'查看家庭成员和邀请进度','family-permissions':'设置人生档案的查看权限，核对共同经历'};
    const copy=descriptions[route]?`<div class="profile-menu-copy"><span>${text}</span><small>${descriptions[route]}</small></div>`:`<span>${text}</span>`;
    return `<button class="menu-row" type="button" data-nav="${route}">${i(icon)}${copy}${i('arrow')}</button>`;
  }
  /** 全部账号进入同一人物共享服务，不再出售家人个人会员。 */
  function membership() {return P.BillingViews.membership();}
  /** 家人一键确认加入。关联已有族谱人物时，在同一步明确确认身份。 */
  function invitation() {
    const item=P.state.invitations[P.state.inviteIndex || 0];
    if (!item) return P.unavailable('family', '暂无需要核对的邀请。');
    if (item.status === 'accepted') return P.unavailable('home', '这份邀请已确认。');
    if (item.status !== 'pending') return P.unavailable('family', '这份邀请已失效。');
    if(item.correctionNote)return `<div class="page empty">${i('edit')}<h2>邀请信息等待更正</h2><p>${e(item.correctionNote)}</p><p class="caption">更正前不会加入家庭、认领人物或确认关系。</p>${P.state.actor==='father'?b('以邀请人身份更正信息','edit-invite','btn',`data-id="${item.id}"`):''}${l('回到家庭查看进度','family','text-link full')}</div>`;
    const claim=P.state.members.includes(item.personId)&&Boolean(P.PEOPLE[item.personId]);
    const relation=item.relation&&item.relation!=='家人'?`<p class="caption">${e(P.PEOPLE.father.name)}邀请自己的${e(item.relation)}加入。</p>`:'';
    const hasWelcomeStory=P.welcomeStories().some(story=>story.id===item.welcomeStoryId);
    return `<div class="page family-join-page">
      <article class="family-admin-sheet family-join-letter" aria-labelledby="family-join-title">
        <header class="invite-hero">${a('father','large')}
          <h1 id="family-join-title" class="page-title">加入「${e(P.HOME_NAME)}」</h1>
          <p class="caption">受邀人预览 · ${e(P.PEOPLE.father.name)}邀请你</p>
        </header>
        <div class="family-join-recipient">
          <p class="caption">这份邀请送给</p><h2 class="card-title">${e(item.name)}</h2>${relation}
          ${claim ? '<p class="caption">加入时会确认家谱里的这位家人是你。</p>' : ''}
          ${hasWelcomeStory ? '<p class="caption">发起人为你选了一条往事，加入后就能查看。</p>' : ''}
        </div>
      </article>
      <p class="caption family-join-scope">加入后，按家人设定的分享范围查看和参与。</p>
      <form id="accept-invite-form" class="section"><input type="hidden" name="inviteId" value="${e(item.id)}">
      <button type="submit" class="btn full">${claim?'确认是我，加入家庭':'加入家庭'}</button></form>
      ${b('信息有误，需要更正', 'correct-invite', 'text-link full family-admin-text-action')}
    </div>`;
  }
  Object.assign(P.views,{family,profile,membership,invitation});
  P.relation=relation;
  P.shareViewerOptions=shareViewerOptions;
}
