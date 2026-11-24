/** 静态原型入口：路由、预览工具和模拟时钟。双击 index.html 即可运行。 */
'use strict';
{
  const P=window.App;
  const {icon:i,button:b,link:l,avatar:a,escape:e}=P;
  /** 底栏和侧栏共用栏目定义，第四项可指定实际入口，第一项用于判断栏目选中状态。 */
  const MAIN_TABS = [
    ['home', 'house', '我家'],
    ['house-stories', 'notebook', P.Households.titles['house-stories'], 'house-stories/personal'],
    ['house-assistant', 'sparkles', P.FamilyAssistant.title],
    ['house-picks', 'shoppingBag', '优选'],
    ['profile', 'user', '我的']
  ];
  /** 辅助页面归属对应主栏目，详情、会员与问题页也保留明确的底栏选中项。 */
  const TAB_PARENTS={chat:'profile',story:'house-stories','archive-item':'house-stories',family:'profile',invitation:'profile',membership:'profile',questions:'profile','chat-messages':'profile',welcome:'home'};
  const ROUTE_NAMES={story:'往事详情',chat:'互动数字人',family:'成员与邀请',membership:'家庭会员',invitation:'加入家庭'};
  Object.assign(ROUTE_NAMES, P.Households.titles);
  for (const [route, , label] of MAIN_TABS) ROUTE_NAMES[route] = label;
  const NOTES={home:['看见这个家，读懂这一生','从家训和家谱开始，往下可查看家事和新回复。'],story:['让回忆能被追问','内容来源和确认状态分开表达，仍然可以围绕当前故事继续交流。'],chat:['听得熟悉，也能核对','示例回答区分记录整理、AI 推演与资料不足。语音仅演示交互，不调用麦克风。'],family:['关系不等于权限','加入家庭、认领人物、确认关系分别核对。新成员不会自动获得指定的私人资料。'],profile:['身份与权益分开','当前账号、家庭角色、个人额度与数字人服务各自表达。'],membership:['一家人共享会员','249 元／家／年，20 GB 家庭总容量。'],invitation:['模拟受邀人视角','确认加入后切换到这位家人的示例账号。']};
  NOTES.welcome=['从一件家庭往事开始','免费建家、邀请家人，再从原记录回看家人的补充。'];
  NOTES.home=[ROUTE_NAMES.home,'从全家福读起，浏览家训、姓源、家史、家谱、留影和家事。'];
  NOTES['house-assistant'] = [ROUTE_NAMES['house-assistant'], '在当前家庭已分享的资料中提问，回答附原记录。'];
  NOTES['house-picks'] = ['优选', '按分类浏览家庭示例商品，点开看规格与演示价。'];
  NOTES.chat=['和熟悉的人，慢慢聊','二维人像待机会眨眼点头，回应时身体前倾并出现演示口型，讲完缓缓回正。资料追问与纠正保留；没有三维、麦克风或实时语音驱动。'];
  ROUTE_NAMES.welcome='首次进入';
  ROUTE_NAMES['chat-messages']='数字人反馈';
  ROUTE_NAMES.questions = '家人留言';
  ROUTE_NAMES['question-history'] = '留言记录';
  TAB_PARENTS['question-history'] = 'house-stories';
  NOTES.questions = ['家人留言', '从对应的往事查看和回复。'];
  NOTES['question-history'] = ['留言记录', '回看你收发过的留言和回复。'];
  ROUTE_NAMES['archive-item']='档案资料';
  NOTES['archive-item']=['每份资料都有自己的查看页','视频可播放，照片可翻页，作品详情沿用各自的分享权限。'];
  // 记录承接资料的草稿和上传进度。
  Object.assign(ROUTE_NAMES,{materials:'我上传的','material-edit':'整理资料',corrections:'纠正TA的回答','correction-edit':'提交纠正','correction-review':'本人核对'});
  Object.assign(TAB_PARENTS,{materials:'house-stories','material-edit':'house-stories',corrections:'profile','correction-edit':'profile','correction-review':'profile'});
  NOTES.materials=['每份提交都有进度','在「记录 → 我上传的」查看草稿、待核对和已收录的资料。'];
  NOTES.corrections=['原回答保留，修订由本人确认','纠正只影响相同人物、资料和问题的私有演示答复，不直接改写原始资料。'];
  NOTES['material-edit']=NOTES.materials;
  ['correction-edit','correction-review'].forEach(route=>{NOTES[route]=NOTES.corrections;});
  Object.assign(ROUTE_NAMES,{'family-permissions':'空间授权与核对'});
  Object.assign(TAB_PARENTS,{'family-permissions':'profile'});
  Object.assign(ROUTE_NAMES,{'billing-plan':'收费方案','service-orders':'订单与进度'});
  Object.assign(TAB_PARENTS,{'billing-plan':'profile','service-orders':'profile'});
  // 个人中心只保留分组入口，二级页与其返回路径统一归属我的。
  ROUTE_NAMES['profile-family'] = '家庭管理';
  TAB_PARENTS['profile-family'] = 'profile';
  NOTES['profile-family'] = ['按需展开，清楚好找', '在这里管理家庭成员与空间授权。'];
  // 「我的」可直接打开的内页共用家册样式，资料草稿也可从「我的」直达。
  const PROFILE_SECONDARY_ROUTES = new Set([
    'house-switch', 'membership', 'profile-family', 'materials', 'questions', 'question-history',
    'house-addons', 'family',
  ]);
  ROUTE_NAMES['home-motto-edit']='编辑家训';TAB_PARENTS['home-motto-edit']='profile';
  NOTES['home-motto-edit']=['编辑家训','修改正文并保存后，回到首页查看更新后的家训。'];
  ROUTE_NAMES['home-origin']='家史';TAB_PARENTS['home-origin']='home';
  NOTES['home-origin']=['家史','从上往下读家人的记载，点「我家」回到首页。'];
  ROUTE_NAMES['home-origin-edit']='编辑家史';TAB_PARENTS['home-origin-edit']='home';
  NOTES['home-origin-edit']=['编辑家史','直接写作，也可以导入文档或先起草，再核对正文。'];
  Object.assign(ROUTE_NAMES, {'home-surname':'姓源', 'home-album':'家庭相册', 'home-diary':'家事'});
  const assistantReaders = ['home-origin', 'home-surname'];
  const homeReaders = [...assistantReaders, 'home-album', 'home-diary'];
  homeReaders.forEach(route => { TAB_PARENTS[route] = 'home'; });
  Object.assign(NOTES, {
    'home-album': ['家庭相册', '翻页看全家共享的照片，点开后可查看原记录。'],
    'home-diary': ['家事', '按记录时间回看日记，也可以在原记录上补一笔。'],
    'home-surname': ['姓源', '按姓氏阅读公开源流及相关文化资料。']
  });
  const frameName = P.Households.addonOffer('frame').title;
  ROUTE_NAMES['house-screen'] = frameName;
  ROUTE_NAMES['house-screen-intro'] = frameName;
  TAB_PARENTS['house-screen-intro']='home';
  NOTES['house-screen-intro'] = [frameName, '了解照片投送、语音回话与送礼准备。'];
  for (const route of ['house-book-intro', 'house-film-intro']) {
    ROUTE_NAMES[route] = P.HistoryServiceIntro.title(route);
    TAB_PARENTS[route] = 'home';
    NOTES[route] = [ROUTE_NAMES[route], '先查看产品和流程，再按需咨询。'];
  }
  const retiredDigitalRoutes = new Set(['house-digital-intro', 'chat', 'chat-messages', 'corrections', 'correction-edit', 'correction-review']);
  const oldRoutes = new Map([
    ['settings', 'profile'],
    ['profile-materials', 'materials'],
    ['material-inbox', 'profile'],
    ['material-review', 'materials'],
    ['profile-keepsakes', 'profile'],
    ['profile-services', 'service-orders'],
    ['saved', 'house-stories'],
    ['share-memory', 'home'],
    ['share-preview', 'home'],
    ['share-gifts', 'home'],
    ['photo-restore', 'home'],
    ['reunion-album', 'home'],
    ['reunion-albums', 'home'],
    ['record', 'house-add'],
    ['review', 'house-add'],
    ['home-manage', 'home'],
    ['film-delivery', 'home'],
    ['space', 'home'],
    ['books', 'service-orders'],
    ['book-edit', 'service-orders'],
    ['book-preview', 'service-orders'],
    ['book-order', 'service-orders'],
    ['house-baby', 'house-stories/personal'],
    ['house-elders', 'house-stories/personal'],
    ['house-couple', 'house-stories/personal'],
    ['house-couple-setup', 'profile-family']
  ]);
  const isServiceIntro = route => route === 'house-screen-intro' || P.HistoryServiceIntro.has(route);
  Object.assign(TAB_PARENTS,{'house-create':'profile','house-add':'house-stories','house-moment':'house-stories','house-story':'house-stories',
    'house-switch':'profile','house-addons':'profile','service-order':'profile',
    'house-screen':'profile'});
  let toastTimer;
  const navigationEntries = new Map();
  const navigationSession = crypto.getRandomValues(new Uint32Array(2)).join('-');
  let navigationId = 0;
  let currentEntry = null;
  // 按家庭工作区记住切换后的身份，切回家谱时仍使用所选成员定位。
  const pedigreeSelections = new WeakMap();

  function ownedEntry(entry) {
    return entry?.workspace === P.state && entry.actor === P.state.actor ? entry : null;
  }

  function registerEntry(path, {replace = true, parent = null, tab, archive, restoreParent} = {}) {
    const id = navigationSession + '-' + ++navigationId;
    const entry = {path, parent, tab, archive, restoreParent, workspace: P.state, actor: P.state.actor};
    navigationEntries.set(id, entry);
    const update = replace ? 'replaceState' : 'pushState';
    window.history[update]({ chuanjiaEntry: id }, '', '#' + path);
    return entry;
  }

  function saveNavigationPosition(entry) {
    if (!entry) return;
    const content = document.getElementById('app-content');
    entry.position = {top: content.scrollTop, left: content.querySelector('.home-album-track')?.scrollLeft, windowTop: window.scrollY};
  }
  /** 更新当前页面的内存状态预览，不展示未获授权的记录内容。 */
  function updateStatePreview() {
    const s=P.state;
    if(!P.Households.isExample()){
      document.getElementById('state-preview').textContent=JSON.stringify({当前页面:ROUTE_NAMES[s.route],家庭:P.Households.status()},null,2);
      return;
    }
    const value={当前账号:P.PEOPLE[s.actor].name,当前页面:ROUTE_NAMES[s.route],共享服务人物:P.FamilyContext.current(),共享年度:P.Billing.period(P.FamilyContext.current()),可见记录:P.visibleStories().map(x=>({标题:x.title,分享:x.scope})),数字人:{消息数:s.chatMessages.length},家人人数:s.members.length,本人待处理:P.pendingCount(),我的问题:s.questions.filter(item=>item.from===s.actor || item.owner===s.actor).length,邀请:s.actor==='father'?s.invitations.map(x=>({姓名:x.name,状态:x.status})):[]};
    document.getElementById('state-preview').textContent=JSON.stringify(value,null,2);
    if(s.digitalHuman){value.数字人.形象={形象:'二维人物动画片段',称呼:P.DigitalHuman.greeting().title,状态:s.digitalHuman.phase,交流:'预置文字演示'};document.getElementById('state-preview').textContent=JSON.stringify(value,null,2);}
  }
  const phone = document.getElementById('phone');
  const topNav = document.getElementById('app-header');
  const appContent = document.getElementById('app-content');
  const collapsibleTopNavRoutes = new Set(['home', 'story', 'house-story']);
  const topNavCollapseDistance = 32;
  let topNavCollapse = 0;
  const baseModal = document.getElementById('modal');
  const addonModal = document.getElementById('addon-modal');
  const blockedByDialog = new Set();

  /** 只暂停手机里的下层控件。原先已被其他功能禁用的内容仍由原功能恢复。 */
  function syncDialogLayers() {
    const active = addonModal.open ? addonModal : baseModal.open ? baseModal : null;
    for (const child of phone.children) {
      if (child === addonModal.parentElement || child.id === 'toast') continue;
      const block = active && child !== active.parentElement;
      if (block && !child.inert) {
        child.inert = true;
        blockedByDialog.add(child);
      } else if (!block && blockedByDialog.delete(child)) {
        child.inert = false;
      }
    }
  }
  function dismissDialog(el) {
    if (!el.open) return;
    const returnFocus = el.contains(document.activeElement) || document.activeElement === document.body;
    const trigger = el.opener;
    el.close();
    el.opener = null;
    syncDialogLayers();
    if (returnFocus) {
      const target = trigger?.isConnected && !trigger.closest('[inert]') ? trigger : document.getElementById('app-content');
      target.focus({preventScroll:true});
    }
  }
  function closeAddon() {
    if (!addonModal.open) return;
    dismissDialog(addonModal);
    addonModal.addonContext = null;
    P.state.modal = baseModal.open ? baseModal.querySelector('.modal-header h2').textContent : null;
    updateStatePreview();
  }
  /** 在手机容器内展示居中弹窗或底部面板，嵌套咨询时保留下层商品详情。 */
  function modal(title, body, presentation = 'dialog', el = baseModal, {eyebrow = '', closeLabel = '关闭弹层', familySheet = false} = {}) {
    if (el !== addonModal) closeAddon();
    if (!el.open) el.opener = document.activeElement;
    el.dataset.presentation=presentation;
    // 同一手机弹层也承载普通业务，每次打开时按本次内容切换家册样式。
    el.classList.toggle('family-paper-sheet', familySheet);
    const titleHtml = `<h2 id="${el.id}-title">${P.escape(title)}</h2>`;
    const heading = eyebrow ? `<div class="modal-heading"><p>${P.escape(eyebrow)}</p>${titleHtml}</div>` : titleHtml;
    const closeButton = b(i('close'), 'close-modal', 'icon-button', `aria-label="${P.escape(closeLabel)}" title="${P.escape(closeLabel)}"`);
    el.firstElementChild.innerHTML=`<div class="modal-header">${heading}${closeButton}</div>${body}`;
    el.querySelectorAll('[data-feature-form]').forEach(form=>{form.featureState=P.state;});
    if (!el.open) el.show();
    if (familySheet) el.scrollTop = 0;
    syncDialogLayers();
    P.state.modal=title;updateStatePreview();
  }
  /** 关闭弹层先保留首页草稿，再停止媒体朗读，避免声音在页面外继续。 */
  function closeModal() {
    closeAddon();
    P.FamilyHomeEditor.capture();
    dismissDialog(baseModal);P.state.modal=null;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  /** 短反馈不代替必要的确认页面。 */
  function toast(message) {
    const el=document.getElementById('toast');
    clearTimeout(toastTimer);el.textContent=message;el.classList.add('show');
    toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
    updateStatePreview();
  }
  /** 无法打开的详情返回可用列表，权限仍由原视图核对。 */
  function unavailable(route, message) { return { unavailable: true, route, message }; }
  /** 旧链接映射到在用入口，只给兼容新版的人物志保留成员参数。 */
  function activeRoutePath(path) {
    const [route, id, detail, view] = path.split('/');
    if (retiredDigitalRoutes.has(route) || (route === 'house-service' && id === 'digital')) return 'house-assistant';
    if (route === 'house-stories' && id === 'mine' && !detail && !view) return 'materials';
    if (route === 'life') {
      const person = P.Households.memberIds([id])[0];
      return person ? 'house-stories/' + person : 'house-stories/personal';
    }
    if (route === 'house-record') {
      if (id === 'home-album') return 'home-album';
      if (id === 'diary') return 'home-diary';
      if (id === 'home-cover') return 'home';
      return 'house-add';
    }
    if (route === 'house-moment' && ['milestone', 'elder'].includes(detail)) return 'house-add';
    if (route === 'house-service') {
      if (id === 'frame') return 'house-screen-intro//addons';
      if (id === 'book') return 'house-book-intro//addons';
      if (id === 'film') {
        const person = P.Households.memberIds([detail])[0];
        return person ? 'house-film-intro/' + person + '/personal' : 'house-film-intro//addons';
      }
      return 'house-addons';
    }
    if (route === 'material-edit' && id === 'document') return 'materials';
    return oldRoutes.get(route) ?? path;
  }
  /** 将哈希路由映射为已知页面；未知内容不会作为 HTML 输出。 */
  function readRoute() {
    const requested = location.hash.slice(1) || 'home';
    const hash = activeRoutePath(requested);
    const [name, id, detail, view] = hash.split('/');
    const recorded = ownedEntry(navigationEntries.get(window.history.state?.chuanjiaEntry));
    currentEntry = recorded?.path === requested ? recorded : registerEntry(hash);
    if (hash !== requested) {
      currentEntry.path = hash;
      window.history.replaceState(window.history.state, '', '#' + hash);
    }
    // 历史记录随浏览器条目和账号恢复，直达链接不继承其他入口的来源。
    const parents = [];
    for (let entry = currentEntry.parent; entry; entry = entry.parent) parents.unshift(entry.path);
    P.state.history = parents;
    P.state.archiveReturn = name === 'archive-item' ? currentEntry.archive || null : null;
    P.state.homeDiaryStory = false;
    P.state.homeDiaryAuthor = '';
    P.state.storyConversationEntry = false;
    P.state.historyServiceFromPerson = false;
    P.state.serviceIntroFromCatalog = false;
    if(!P.Households.canRoute(name)){P.state.route='home';return;}
    P.state.historyServiceFromPerson = name === 'house-film-intro' && detail === 'personal';
    P.state.serviceIntroFromCatalog = detail === 'addons' && isServiceIntro(name);
    P.Households.setRoute(name,id,detail,view);
    P.FamilyHomeEditor.enterPage(name);
    P.state.route=P.views[name]?name:'home';
    // 家史整篇阅读。旧链接沿用指定人物的档案授权，末尾章节号无需解析。
    if(name==='home-origin'||name==='home-origin-edit'||P.HistoryServiceIntro.has(name))P.state.homeReaderPerson=id||P.FamilyHome.ensure().family.mottoOwner;
    if(name==='home-surname')P.state.homeReaderPerson=id||P.FamilyContext.current();
    P.state.homeAlbumPage = name === 'home-album' ? id : '';
    P.state.homeDiaryPage = name === 'home-diary' ? id : '';
    P.state.homeDiaryAnchor = name === 'home-diary' ? view || currentEntry.diaryAnchor : '';
    P.state.homeDiaryStory = name === 'story' && detail === 'diary';
    if (name === 'home-diary' || P.state.homeDiaryStory) {
      const author = P.state.homeDiaryStory ? view : detail;
      P.state.homeDiaryAuthor = P.Households.memberIds([author])[0] || '';
    }
    P.state.storyConversationEntry = name === 'story' && detail === 'comments';
    if(name==='story'||name==='house-story') P.state.storyId=id || 'first-order';
    if(name==='chat'&&id&&P.ContentChat.available(id)&&id!==P.state.chatTarget){
      P.state.chatTarget=id;P.state.chatMessages=[];P.state.chatContext=null;
    }
    if(name==='archive-item')P.state.archiveItemId=id || '';
    if(name==='service-order')P.state.customizationOrderId=id || '';
  }
  /** 只保存当前状态和当前账号绑定的未提交输入，重置后的旧表单不会回灌。 */
  function captureInputs() {P.DigitalHuman?.captureDraft();P.QuestionInbox?.captureDrafts();captureFeatureInputs();}
  /** 各功能草稿在切页、换账号与字号变化前保存。 */
  function captureFeatureInputs() {
    P.FamilyHomeEditor.capture();
    P.MaterialLibrary.capture();
    P.AnswerFeedback.capture();
    P.FamilyAssistant.capture();
  }
  /** 导航前保存当前输入与位置，离开页面时关闭弹层。 */
  function navigate(route,{replace=false, archiveContext, mainTab, reset=false, restoreParent}={}) {
    captureInputs();
    if(P.Households.current()&&P.state.actor!=='father'&&route==='life')P.state.archivePerson=P.FamilyContext.current();
    const previousUrl = location.href;
    const current=location.hash.slice(1) || 'home';
    const origin = ownedEntry(currentEntry);
    if (!mainTab && !reset && origin?.parent?.path === route) {
      back();
      return;
    }
    mainTab ||= MAIN_TABS.find(([key, , , target = key]) => key === route && target === route)?.[0];
    closeModal();
    if (route === current && origin && !mainTab && !reset) {
      if (archiveContext && route.startsWith('archive-item/')) {
        origin.archive = {...archiveContext, from: origin.archive?.from};
      }
      readRoute();render();
      return;
    }
    const parent = mainTab || reset ? null : replace ? origin?.parent : origin;
    const archive = route.startsWith('archive-item/') && (parent || archiveContext)
      ? {...archiveContext, from: parent?.path} : null;
    registerEntry(route, {replace: replace || route === current, parent, archive, restoreParent,
      tab: mainTab || (!reset && origin ? activeTab() : undefined)});
    window.dispatchEvent(new HashChangeEvent('hashchange', {oldURL: previousUrl, newURL: location.href}));
  }
  /** 重新排定日记页码后同步地址与当前历史条目，保留原有返回路径。 */
  function replaceDiaryListRoute(route, anchor) {
    const entry = ownedEntry(currentEntry);
    if (P.state.route !== 'home-diary' || !entry) return;
    entry.diaryAnchor = anchor;
    P.state.homeDiaryAnchor = anchor;
    if (entry.path === route) return;
    entry.path = route;
    P.state.homeDiaryPage = route.split('/')[1] || '';
    window.history.replaceState(window.history.state, '', '#' + route);
  }
  /** 返回当前演示流程中的上一页，不跳出原型。 */
  function back(defaultRoute) {
    const entry = ownedEntry(currentEntry);
    const parentPath = entry?.parent?.path;
    // 日记翻篇或保存后，按当前篇目所在页返回。原列表页匹配时继续恢复浏览位置。
    if (P.state.homeDiaryStory && defaultRoute?.split('/')[0] === 'home-diary') {
      defaultRoute = P.FamilyJournal.diaryListFor(P.state.storyId);
      if (parentPath !== defaultRoute) {
        navigate(defaultRoute, {replace: true, reset: parentPath !== 'home'});
        return;
      }
    }
    if (entry?.parent) {
      if (!back.pending) {
        back.pending = true;
        window.history.back();
      }
      return;
    }
    const fallback={'home-motto-edit':'home','profile-family':'profile','billing-plan':'profile','service-orders':'profile',story:'house-stories/personal',membership:'profile',family:'profile-family','family-permissions':'profile-family',invitation:'family'};
    Object.assign(fallback,{materials:'house-stories/personal','material-edit':'materials','chat-messages':'chat',questions:'profile','question-history':'house-stories/personal',corrections:'chat-messages','correction-edit':'corrections','correction-review':'corrections'});
    fallback['house-screen'] = 'profile';
    let previous;
    if (P.state.route === 'archive-item') {
      previous = 'house-stories';
    } else if (P.state.serviceIntroFromCatalog) {
      previous = 'house-addons';
    } else if (P.state.historyServiceFromPerson) {
      previous = 'house-stories/' + P.state.homeReaderPerson;
    } else if (P.HistoryServiceIntro.has(P.state.route)) {
      previous = 'home-origin/' + P.state.homeReaderPerson;
    } else {
      previous = P.Households.fallback(P.state.route) || fallback[P.state.route] || 'home';
    }
    navigate(defaultRoute || previous, {replace: true, reset: true});
  }
  /** 家训复用首页，在独立地址中保留问答来路，也能与底栏回首页区分。 */
  function isAssistantReader(path = '') {
    return path === P.FamilyHomeViews.mottoRoute || assistantReaders.includes(path.split('/')[0]);
  }
  function readingFromAssistant({history}) {
    return history?.at(-1) === 'house-assistant' && isAssistantReader(currentEntry?.path);
  }

  function activeTab() {
    const entry = ownedEntry(currentEntry);
    if (entry?.tab) return entry.tab;
    const { route, homeDiaryStory } = P.state;
    return homeDiaryStory ? 'home' : P.state.serviceIntroFromCatalog ? 'profile'
      : P.state.historyServiceFromPerson ? 'house-stories' : TAB_PARENTS[route] || route;
  }

  /** 二级页沿用进入时的主栏目，直达链接使用当前路由的默认归属。 */
  function renderNavigation() {
    const active = activeTab();
    document.getElementById('bottom-nav').innerHTML=MAIN_TABS.map(([route,icon,label,target=route])=>`<button type="button" class="${active===route?'active':''}" data-nav="${target}" ${active===route?'aria-current="page"':''}>${i(icon)}<span>${label}</span></button>`).join('');
    const routes=[...MAIN_TABS,['house-switch','family','创建或切换家庭'],['membership','star','家庭会员'],['house-addons','book','传家定制']];
    if(P.Households.current())routes.push(['house-screen','screen',frameName]);
    document.getElementById('studio-nav').innerHTML=routes.map(([route,icon,label,target=route])=>l(i(icon)+label,target,P.state.route===route?'active':'')).join('');
  }
  /** 首页和往事详情在滚动初段逐渐收窄，回到页首时恢复完整顶栏。 */
  function syncTopNavHeight() {
    const progress = collapsibleTopNavRoutes.has(P.state.route)
      ? Math.min(1, Math.max(0, appContent.scrollTop) / topNavCollapseDistance)
      : 0;
    if (progress === topNavCollapse) return;
    topNavCollapse = progress;
    topNav.style.setProperty('--top-nav-collapse', String(progress));
  }

  /** 各业务页复用同一个顶栏节点。 */
  function renderTopNav(title, leading = '', trailing = '') {
    syncTopNavHeight();
    const label = e(title);
    topNav.innerHTML = `<div class="top-nav-start">${leading}</div>
      <h1 class="top-nav-title" title="${label}">${label}</h1>
      <div class="top-nav-end">${trailing}</div>`;
  }

  /** 各页只提供标题、返回入口和右侧操作，布局由公共顶栏负责。 */
  function renderHeader() {
    const s = P.state;
    const fromAssistant = readingFromAssistant(s);
    const backButton = (label, fallback) => {
      const attrs = `aria-label="${e(label)}"`;
      return fallback ? P.returnLink(i('back'), fallback, 'top-nav-icon', attrs)
        : b(i('back'), 'back', 'top-nav-icon', attrs);
    };
    const storyBack = phone.querySelector('.story-reading-page > .story-reading-back');
    if (storyBack) {
      renderTopNav(ROUTE_NAMES[s.route]);
      storyBack.setAttribute('aria-label', storyBack.textContent.trim());
      storyBack.classList.add('top-nav-icon');
      storyBack.innerHTML = i('back');
      topNav.querySelector('.top-nav-start').append(storyBack);
      return;
    }
    const historyService = P.HistoryServiceIntro.has(s.route);
    if (s.route === 'house-screen-intro' || historyService) {
      const fromPicks = s.route === 'house-screen-intro' && s.history?.at(-1) === 'house-picks';
      const returnLabel = fromPicks ? '返回优选' : s.serviceIntroFromCatalog ? '返回传家定制'
        : s.historyServiceFromPerson ? '返回人物志' : historyService ? '返回家史' : '返回我家';
      renderTopNav(ROUTE_NAMES[s.route], backButton(returnLabel));
      return;
    }
    if (s.route === 'home-diary' || s.homeDiaryStory) {
      const target = s.homeDiaryStory ? P.FamilyJournal.diaryListFor(s.storyId) : 'home';
      const title = s.homeDiaryStory ? P.FamilyJournal.familyName() + '日记' : '家庭日记';
      renderTopNav(title, backButton(s.homeDiaryStory ? '返回家庭日记' : '返回我家', target));
      return;
    }
    if (s.route === 'home-origin') {
      const person = s.homeReaderPerson;
      const edit = P.FamilyHome.editable('origin', person) && P.FamilyHome.document('origin', person)
        ? b(i('edit') + '编辑', 'heritage-edit', 'history-header-edit', `data-kind="origin" data-person="${e(person)}"`)
        : '';
      renderTopNav(ROUTE_NAMES[s.route], fromAssistant ? backButton('返回AI问家') : backButton('返回我家', 'home'), edit);
      return;
    }
    if (s.route === 'home-origin-edit') {
      renderTopNav(ROUTE_NAMES[s.route], backButton('返回家史', 'home-origin/' + s.homeReaderPerson));
      return;
    }
    if (homeReaders.includes(s.route)) {
      const destination = fromAssistant ? '返回AI问家' : '返回我家';
      const closeLabel = `aria-label="关闭并${destination}"`;
      const close = fromAssistant ? b(i('close'), 'back', 'top-nav-icon', closeLabel)
        : P.returnLink(i('close'), 'home', 'top-nav-icon', closeLabel);
      renderTopNav(ROUTE_NAMES[s.route], backButton(destination, fromAssistant ? undefined : 'home'), close);
      return;
    }
    const main = !ownedEntry(currentEntry)?.parent && MAIN_TABS.some(([route])=>route===s.route);
    // 次级页按设计稿保留居中标题与返回；“我的”仍由固定底栏进入。
    const messages=P.Households.current()&&s.route==='chat'?l(i('mail')+'<span>反馈</span>'+(P.chatHasNotice()?'<span class="chat-task-dot" role="img" aria-label="有新回复或待处理消息"></span>':''),'chat-messages','chat-message-trigger'):'';
    const messageHistory = s.route === 'house-stories' && P.Households.current()
      ? l(i('chat') + '留言记录', 'question-history', 'story-message-history') : '';
    const uploadTitle=s.route==='material-edit'?P.MaterialLibrary.uploadHeader():'';
    const title = s.route === 'home' && !P.Households.isExample()
      ? P.Households.current()?.name || '传家录'
      : uploadTitle || ROUTE_NAMES[s.route];
    const returnLabel = s.route === 'archive-item' ? P.PersonArchive.detailBackLabel()
      : fromAssistant ? '返回AI问家' : '返回上一页';
    renderTopNav(title || '传家录', main ? '' : backButton(returnLabel), messages + messageHistory);
  }
  /** 渲染当前页面，保持状态、预览说明与页面一致。 */
  function render() {
    P.FamilyHomeViews.unmountCover();
    P.FamilyHomeViews.unmountAlbum();
    P.FamilyHomeViews.unmountPedigree();
    P.FamilyTree.syncHomeEditor();
    syncFontMode();
    // 非维护人打开旧编辑链接或在编辑中切换身份时，回首页阅读正式稿。
    if (P.state.route === 'home-motto-edit' && !P.FamilyHome.editable('motto')) {
      P.state.route = 'home';
      window.history.replaceState(null, '', '#home');
      document.getElementById('app-content').scrollTop = 0;
    }
    const screenDemo = P.state.route === 'house-screen';
    // 相框演示替换手机内容区，顶栏和底栏随画面切换并继续复用原节点。
    const navigation = document.getElementById('bottom-nav');
    const contentAnchor = document.getElementById(screenDemo ? 'house-screen-demo' : 'app-content');
    if (contentAnchor.previousElementSibling !== topNav) contentAnchor.before(topNav);
    if (contentAnchor.nextElementSibling !== navigation) contentAnchor.after(navigation);
    P.HouseScreen.mount(screenDemo);
    P.HistoryServiceIntro.stopPlayback();
    phone.classList.toggle('profile-secondary', PROFILE_SECONDARY_ROUTES.has(P.state.route));
    phone.classList.toggle('product-intro', isServiceIntro(P.state.route));
    const s=P.state;
    if (s.route === 'home-origin-edit' && !P.FamilyHome.editable('origin', s.homeReaderPerson)) s.route = 'home-origin';
    // 路由标识仅用于还原各页设计稿的封面和标题栏，不参与业务判断。
    document.getElementById('phone').dataset.route=s.route;
    document.getElementById('phone').dataset.actor=s.actor;
    phone.classList.toggle('journal-mode', homeReaders.includes(s.route) || s.route === 'home-origin-edit');
    P.DigitalHuman?.captureDraft();P.QuestionInbox?.captureDrafts();captureFeatureInputs();
    P.PersonArchive?.stopPlayback();
    const content=document.getElementById('app-content');
    const previousTop=content.scrollTop;
    P.DigitalHuman?.prepare(s.route==='chat'&&P.ContentChat.available(s.chatTarget));
    let page=P.views[s.route]();
    if (page?.unavailable) {
      back(page.route);
      toast(page.message);
      return;
    }
    content.innerHTML=page;
    P.FamilyMoment.mount();
    content.querySelectorAll('[data-feature-form],[data-feature-action]').forEach(element=>{element.featureState=s;});
    content.querySelectorAll('#chat-form,[data-story-question],[data-question-answer]').forEach(form=>{form.draftState=s;form.draftActor=s.actor;});
    content.scrollTop=previousTop;
    P.FamilyHomeViews.mountCover(content);
    P.FamilyHomeViews.mountAlbum(content);
    P.FamilyHomeViews.mountPedigree(content, pedigreeSelections.get(s) === s.actor);
    if (s.route === 'home') P.FamilyMap.mount(content);
    renderHeader();renderNavigation();refreshControls();
    P.FamilyJournal.mount(content);
    const note=(!P.Households.isExample()&&['home','profile','family'].includes(s.route))||Object.hasOwn(P.Households.titles,s.route)
      ? [ROUTE_NAMES[s.route],'家庭空间内可以记录往事、邀请亲人，并按需开通会员或独立服务。'] : NOTES[s.route] || NOTES.home;
    document.getElementById('review-title').textContent=note[0];
    document.getElementById('review-description').textContent=note[1];
    updateStatePreview();
    if(s.route==='service-order')P.Customization.staffPanel();
    else document.getElementById('customization-demo-controls').hidden=true;
    if(P.Households.current()&&s.route==='chat'&&P.ContentChat.available(s.chatTarget))P.DigitalHuman?.mount();
    // 首页、交片和成长相册复用档案播放器的字幕、进度与错误提示，离页统一暂停。
    if(P.Households.current()&&['home','archive-item'].includes(s.route))P.PersonArchive?.mount();
  }
  /** 预览角色包含已接受邀请的人物，各账号草稿互相隔离。 */
  function refreshControls() {
    const actorSelect=document.getElementById('actor-select'),members=P.Households.memberOptions();
    if(members||!P.Households.isExample()){
      actorSelect.innerHTML=members?members.map(person=>`<option value="${person.id}" ${person.selected?'selected':''}>${P.escape(person.name)}</option>`).join(''):'<option>待创建家庭</option>';
      actorSelect.disabled=!members;
      return;
    }
    actorSelect.disabled=false;
    actorSelect.innerHTML=Object.keys(P.state.accounts).map(id=>`<option value="${id}">${id==='father'?'本人':P.relation(id,'father')} · ${P.escape(P.PEOPLE[id].name)}</option>`).join('');
    actorSelect.value=P.state.actor;
  }
  /** 登录前后和重置共用字号状态，弹层与工具按钮一并同步。 */
  function syncFontMode() {
    const large=P.state.fontLarge;
    document.getElementById('phone').classList.toggle('large-type',large);
    document.body.classList.toggle('large-text',large);
    const toggle=document.getElementById('font-toggle');
    toggle.setAttribute('aria-pressed',String(large));
    toggle.textContent=large?'标准字号':'大字号';
  }
  /** 切换模拟账号时不把上一个人的私聊或草稿带给新角色。 */
  function changeActor(id, {switchingHousehold = false} = {}) {
    const s=P.state;
    if (!s.accounts[id]) return;
    // 换家前已在原工作区捕获输入，旧表单仍在 DOM 时不能读取到新身份。
    if (!switchingHousehold) {
      captureInputs();
      P.PersonArchive?.stopPlayback();
      P.DigitalHuman?.stop();
    }
    // 草稿按账号保留，核对和档案详情的来源只由原来打开它们的账号使用。
    if (s.actor !== id) {
      pedigreeSelections.set(s, id);
      if (s.familyHome) s.familyHome.review = null;
      s.archiveReturn = null;
      s.history = [];
    }
    s.actor=id;
    s.chatMessages=[];s.chatContext=null;s.chatTarget=P.FamilyContext.current();s.archivePerson=P.FamilyContext.current();s.checkout=null;s.shareStoryId=null;
    if (!switchingHousehold) {
      if (!ownedEntry(currentEntry)) readRoute();
      closeModal();render();
    }
  }
  /** 字号开关只改变阅读尺寸，不清除正在编辑的文字。 */
  function toggleFont() {captureInputs();P.state.fontLarge=!P.state.fontLarge;render();}
  Object.assign(P,{modal,closeModal,closeAddon,toast,unavailable,navigate,replaceDiaryListRoute,back,render,changeActor,toggleFont,syncFontMode,captureInputs,updatePreview:updateStatePreview});
  /** 所有交互集中注册，反复渲染页面不会叠加监听器。 */
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');
    if (nav) {
      event.preventDefault();
      const destination = nav.dataset.nav;
      const mainTab = nav.closest('#bottom-nav, #studio-nav')
        ? MAIN_TABS.find(([route, , , target = route]) => target === destination)?.[0] : undefined;
      return navigate(destination, {mainTab, replace: nav.hasAttribute('data-paper-turn')});
    }
    const action=event.target.closest('[data-action]');
    if(!action || action.disabled)return;
    if(action.dataset.action==='back')return back(action.dataset.returnRoute);
    P.act(action.dataset.action,action);
  });
  document.addEventListener('submit',P.submit);
  document.addEventListener('change',event=>{if(event.target.id==='invite-person')P.act('invite-person-change',event.target);});
  document.getElementById('actor-select').addEventListener('change',event=>{if(!P.Households.changeMember(event.target.value))changeActor(event.target.value);});
  document.getElementById('width-select').addEventListener('change',event=>document.documentElement.style.setProperty('--phone-width',event.target.value+'px'));
  document.getElementById('font-toggle').addEventListener('click',toggleFont);
  document.getElementById('scenario-select').addEventListener('change',event=>{
    const value=event.target.value;
    if(value!=='normal')P.Households.activateExample();
    if(value==='home-empty'){closeModal();P.FamilyHome.empty();navigate('home');}
    if(value==='private'){changeActor('xia');navigate('story/private');}
    if(value==='quota'){const p=P.Billing.period(P.FamilyContext.current());if(p)p.qaUsed=P.Billing.RULES.qa;navigate('chat');}
    if(value==='normal'){closeModal();P.Households.reset();navigate('home');}
  });
  // 重置家庭演示返回建家入口，旧版应用市场可从独立工具重开。
  document.getElementById('reset-demo').addEventListener('click',()=>{closeModal();P.Households.reset();P.state.history=[];navigate('home');toast('演示已还原，当前没有保存到本地或云端。');});
  phone.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || (!addonModal.open && !baseModal.open)) return;
    event.preventDefault();
    event.stopPropagation();
    if (addonModal.open) closeAddon();
    else closeModal();
  });
  addonModal.parentElement.addEventListener('click', event => {
    if (event.target === addonModal.parentElement) closeAddon();
  });
  /** 浏览器前进、返回与应用跳转共用同一套位置恢复。 */
  function changeRoute(previousPath) {
    back.pending = false;
    const leaving = ownedEntry(currentEntry);
    saveNavigationPosition(leaving);
    if (addonModal.open || baseModal.open) closeModal();
    captureInputs();
    const previous=P.state.route,content=document.getElementById('app-content');
    const previousReader = P.state.homeReaderPerson;
    const fromPersonIntro = P.state.historyServiceFromPerson;
    const fromCatalogIntro = P.state.serviceIntroFromCatalog;
    readRoute();
    if (previous === 'house-assistant' && readingFromAssistant(P.state)) {
      P.FamilyAssistant.rememberSource(content, currentEntry.path);
    }
    if (isServiceIntro(P.state.route) && (previous === 'home-origin'
      || (previous === 'house-stories' && P.state.historyServiceFromPerson)
      || (previous === 'house-addons' && P.state.serviceIntroFromCatalog))) {
      P.state.historyServiceReturn = {person: previousReader, path: previousPath, top: content.scrollTop};
    }
    const album = P.state.route === 'home-album';
    const previousAlbumPage = album && previous === 'home-album' ? P.FamilyJournal.albumPage(content) : null;
    const diaryBook = P.state.route === 'home-diary' || P.state.homeDiaryStory;
    const previousDiaryPage = diaryBook ? P.FamilyJournal.diaryPage(content) : null;
    content.scrollTop=0;
    const arriving = currentEntry;
    render();
    if (back.pending || currentEntry !== arriving) return;
    if (P.state.route === 'house-assistant' && isAssistantReader(previousPath)) {
      P.FamilyAssistant.restoreSource(content, previousPath);
    }
    if (album) P.FamilyJournal.showAlbumTurn(content, previous, previousAlbumPage);
    if (P.state.route === 'home-origin') {
      const historyReturn = P.state.historyServiceReturn;
      const fromService = P.HistoryServiceIntro.has(previous) && historyReturn?.person === P.state.homeReaderPerson;
      // 从产品介绍回来时对准原来的文末位置，也把键盘焦点交还给那个入口。
      if (fromService) content.scrollTop = historyReturn.top;
      const trigger = fromService && content.querySelector(`.history-article-actions [data-nav^="${previous}/"]`);
      (trigger || content.querySelector('.history-article'))?.focus({preventScroll: true});
    }
    if (fromPersonIntro && P.state.route === 'house-stories' && P.state.historyServiceReturn?.path === location.hash.slice(1)) {
      content.scrollTop = P.state.historyServiceReturn.top;
      content.querySelector(`[data-profile-service][data-nav^="${previous}/"]`)?.focus({preventScroll: true});
    }
    if (fromCatalogIntro && P.state.route === 'house-addons' && P.state.historyServiceReturn?.path === 'house-addons') {
      content.scrollTop = P.state.historyServiceReturn.top;
      content.querySelector(`[data-nav="${previous}//addons"]`)?.focus({preventScroll: true});
    }
    if (P.HistoryServiceIntro.has(P.state.route)) document.getElementById('history-service-title')?.focus({preventScroll: true});
    if (diaryBook) P.FamilyJournal.showDiaryTurn(content, previousDiaryPage);
    if (P.state.storyConversationEntry && !currentEntry.position) P.QuestionInbox.focusConversation();
    if(['home','house-stories'].includes(P.state.route))P.FamilyHomeViews.restoreAlbum(content,previousPath);
    if (currentEntry.position) {
      const {top, left, windowTop} = currentEntry.position;
      content.scrollTop = top;
      const track = content.querySelector('.home-album-track');
      if (track && left !== undefined) track.scrollLeft = left;
      if (P.state.route === 'house-screen') window.scrollTo(0, windowTop);
    } else if (currentEntry.path === P.FamilyHomeViews.mottoRoute) {
      P.FamilyHomeViews.focusMotto(content);
    }
    // 只有返回这次导航的原入口时，才恢复入口上已经打开的弹层。
    if (leaving?.parent === arriving) leaving.restoreParent?.();
  }

  function restoreBrowserEntry() {
    const incoming = navigationEntries.get(window.history.state?.chuanjiaEntry);
    const path = location.hash.slice(1) || 'home';
    if (ownedEntry(currentEntry) && incoming === currentEntry && currentEntry.path === path) return;
    changeRoute(currentEntry?.path || 'home');
  }

  window.history.scrollRestoration = 'manual';
  appContent.addEventListener('scroll', syncTopNavHeight, { passive: true });
  window.addEventListener('popstate', restoreBrowserEntry);
  window.addEventListener('hashchange', restoreBrowserEntry);
  if(new URLSearchParams(location.search).get('embedded')==='1')document.body.classList.add('embedded');
  readRoute();render();
  if (P.state.storyConversationEntry) P.QuestionInbox.focusConversation();
  if (currentEntry.path === P.FamilyHomeViews.mottoRoute) P.FamilyHomeViews.focusMotto(document.getElementById('app-content'));
}
