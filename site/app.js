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
  const TAB_PARENTS={chat:'profile',space:'profile',life:'house-stories',story:'house-stories','archive-item':'house-stories',family:'profile',invitation:'profile',membership:'profile',settings:'profile',questions:'profile','chat-messages':'profile',record:'profile',review:'profile',welcome:'home'};
  const ROUTE_NAMES={life:'人物档案',story:'往事详情',chat:'互动数字人',space:'故里 VR',family:'成员与邀请',record:'记录一刻',review:'内容确认',membership:'家庭会员',invitation:'加入家庭',settings:'分享与阅读'};
  Object.assign(ROUTE_NAMES, P.Households.titles);
  for (const [route, , label] of MAIN_TABS) ROUTE_NAMES[route] = label;
  const NOTES={home:['看见这个家，读懂这一生','从家训和家谱开始，往下可查看家事和新回复。'],life:['像一本继续写的书','同一事件关联影像、原声与物件。事件时间、记录时间与分享对象分别说明。'],story:['让回忆能被追问','内容来源和确认状态分开表达，仍然可以围绕当前故事继续交流。'],chat:['听得熟悉，也能核对','示例回答区分记录整理、AI 推演与资料不足。语音仅演示交互，不调用麦克风。'],space:['走进他生活过的地方','点击物件、切换年代、跟随讲述。所有历史场景和变化均为示意。'],family:['关系不等于权限','加入家庭、认领人物、确认关系分别核对。新成员不会自动获得指定的私人资料。'],record:['一句话也值得留下','支持真实文字输入与录制状态演示。先保存草稿，再决定是否分享。'],review:['确认之后，再留下','家人补充他人的经历进入待确认，本人确认后保留原讲述者。'],profile:['身份与权益分开','当前账号、家庭角色、个人额度与数字人服务各自表达。'],membership:['一家人共享会员','249 元／家／年，20 GB 家庭总容量。'],invitation:['模拟受邀人视角','确认加入后切换到这位家人的示例账号。'],settings:['分享，由本人决定','分享范围属于个人内容。与另一个人的亲属关系不会自动改变范围。']};
  NOTES.welcome=['从一件家庭往事开始','免费建家、邀请家人，再从原记录回看家人的补充。'];
  NOTES.home=[ROUTE_NAMES.home,'从全家福读起，浏览家训、姓源、家史、家谱、留影和家事。'];
  NOTES['house-assistant'] = [ROUTE_NAMES['house-assistant'], '在当前家庭已分享的资料中提问，回答附原记录。'];
  NOTES['house-picks'] = ['优选', '按分类浏览家庭示例商品，点开看规格与演示价。'];
  NOTES.space=['走进同一个家的不同年代','“看看老家”环顾熟悉的角落，可切换年代、缩放视角和查看物件故事。仅保留全景观察；场景均为示例素材。'];
  NOTES.chat=['和熟悉的人，慢慢聊','二维人像待机会眨眼点头，回应时身体前倾并出现演示口型，讲完缓缓回正。资料追问与纠正保留；没有三维、麦克风或实时语音驱动。'];
  ROUTE_NAMES.welcome='首次进入';
  ROUTE_NAMES['chat-messages']='数字人反馈';
  ROUTE_NAMES.questions = '家人留言';
  ROUTE_NAMES['question-history'] = '留言记录';
  TAB_PARENTS['question-history'] = 'house-stories';
  NOTES.questions = ['家人留言', '从对应的往事查看和回复。'];
  NOTES['question-history'] = ['留言记录', '回看你收发过的留言和回复。'];
  ROUTE_NAMES['archive-item']='档案资料';
  NOTES.life=['资料分类与探索视角分开','视频、照片、传记、作品只保留一套入口；总览仅作预览，足迹标明空间是否开放，事件资料沿用原记录。'];
  NOTES['archive-item']=['每份资料都有自己的查看页','视频可播放，照片可翻页，书信在对应事件中阅读与追问。书信同时检查自身和所属事件的授权。'];
  // 记录承接上传进度，家人提交给本人的待核对事项从个人中心进入。
  Object.assign(ROUTE_NAMES,{materials:'我上传的','material-inbox':'待我核对','material-edit':'整理资料','material-review':'资料核对',corrections:'纠正TA的回答','correction-edit':'提交纠正','correction-review':'本人核对'});
  Object.assign(TAB_PARENTS,{materials:'house-stories','material-inbox':'profile','material-edit':'house-stories','material-review':'house-stories',corrections:'profile','correction-edit':'profile','correction-review':'profile'});
  NOTES.materials=['每份提交都有进度','在「记录 → 我上传的」查看草稿、待核对和已收录的资料。'];
  NOTES['material-inbox']=['确认之后，再归档','只显示交给当前档案本人核对的资料与人生经历。'];
  NOTES.corrections=['原回答保留，修订由本人确认','纠正只影响相同人物、资料和问题的私有演示答复，不直接改写原始资料。'];
  ['material-edit','material-review'].forEach(route=>{NOTES[route]=NOTES.materials;});
  ['correction-edit','correction-review'].forEach(route=>{NOTES[route]=NOTES.corrections;});
  // 纪念书沿用传记与个人中心入口，书稿和订单共享同一份状态。
  Object.assign(ROUTE_NAMES,{books:'纪念书稿','book-edit':'制作纪念书','book-preview':'书稿预览','book-order':'纪念书制作进度'});
  Object.assign(TAB_PARENTS,{books:'profile','book-edit':'house-stories','book-preview':'house-stories','book-order':'profile'});
  for(const route of ['books','book-edit','book-preview','book-order'])NOTES[route]=['把人生留成一本书','选材授权、本人定稿、实物打样与分阶段收费；编辑和印厂进度仅由原型工具模拟，未生成真实 PDF、支付或物流。'];
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
    'settings', 'house-switch', 'membership', 'profile-family', 'materials', 'material-inbox', 'questions', 'question-history',
    'house-addons', 'books', 'family',
  ]);
  // 故人共忆保留独立路由，首页的传承内容另有编辑入口。
  Object.assign(ROUTE_NAMES,{'share-memory':'故人共忆','share-preview':'分享前核对','photo-restore':'AI影像体验','share-gifts':'收到的心意'});
  Object.assign(TAB_PARENTS,{'share-memory':'home','share-preview':'home','photo-restore':'house-stories','share-gifts':'home'});
  Object.assign(ROUTE_NAMES,{'reunion-album':'故人共忆','reunion-albums':'共忆相册'});
  Object.assign(TAB_PARENTS,{'reunion-album':'home','reunion-albums':'home'});
  ROUTE_NAMES['home-manage']='首页内容';TAB_PARENTS['home-manage']='home';
  NOTES['home-manage']=['整理首页内容','档案本人管理姓源和家史。家训维护人编辑正文，也可核对家人提交的建议。'];
  ROUTE_NAMES['home-motto-edit']='编辑家训';TAB_PARENTS['home-motto-edit']='profile';
  NOTES['home-motto-edit']=['编辑家训','修改正文并保存后，回到首页查看更新后的家训。'];
  ROUTE_NAMES['home-origin']='家史';TAB_PARENTS['home-origin']='home';
  NOTES['home-origin']=['家史','从上往下读家人的记载，点「我家」回到首页。'];
  ROUTE_NAMES['home-origin-edit']='编辑家史';TAB_PARENTS['home-origin-edit']='home';
  NOTES['home-origin-edit']=['编辑家史','直接写作，也可以导入文档或先起草，再核对正文。'];
  Object.assign(ROUTE_NAMES, {'home-surname':'姓源', 'home-album':'家庭相册', 'home-diary':'家事'});
  const homeReaders = ['home-origin', 'home-surname', 'home-album', 'home-diary'];
  homeReaders.forEach(route => { TAB_PARENTS[route] = 'home'; });
  Object.assign(NOTES, {
    'home-album': ['家庭相册', '翻页看全家共享的照片，点开后可查看原记录。'],
    'home-diary': ['家事', '按记录时间回看日记，也可以在原记录上补一笔。'],
    'home-surname': ['姓源', '按姓氏阅读公开源流及相关文化资料。']
  });
  ROUTE_NAMES['film-delivery']='我的纪录片';TAB_PARENTS['film-delivery']='home';
  NOTES['film-delivery']=['验证后直达自己的纪录片','只显示当前账号已交付的正片，播放进度与首页和档案详情共用。'];
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
    ['profile-materials', 'materials'],
    ['profile-keepsakes', 'profile'],
    ['profile-services', 'service-orders'],
    ['saved', 'house-stories']
  ]);
  const isServiceIntro = route => route === 'house-screen-intro' || P.HistoryServiceIntro.has(route);
  Object.assign(TAB_PARENTS,{'house-create':'profile','house-add':'house-stories','house-record':'house-stories','house-moment':'house-stories','house-story':'house-stories','house-baby':'house-stories','house-elders':'house-stories',
    'house-switch':'profile','house-addons':'profile','house-service':'profile','service-order':'profile',
    'house-couple':'house-stories','house-couple-setup':'profile','house-screen':'profile'});
  let toastTimer;
  /** 更新当前页面的内存状态预览，不展示未获授权的记录内容。 */
  function updateStatePreview() {
    const s=P.state;
    if(!P.Households.isExample()){
      document.getElementById('state-preview').textContent=JSON.stringify({当前页面:ROUTE_NAMES[s.route],家庭:P.Households.status()},null,2);
      return;
    }
    const value={当前账号:P.PEOPLE[s.actor].name,当前页面:ROUTE_NAMES[s.route],共享服务人物:P.FamilyContext.current(),共享年度:P.Billing.period(P.FamilyContext.current()),可见记录:P.visibleStories().map(x=>({标题:x.title,分享:x.scope})),录制:{录制中:s.record.recording,已暂停:s.record.paused,秒:s.record.seconds,草稿字数:s.record.text.length},数字人:{消息数:s.chatMessages.length},家人人数:s.members.length,本人待处理:P.pendingCount(),我的问题:s.questions.filter(item=>item.from===s.actor || item.owner===s.actor).length,邀请:s.actor==='father'?s.invitations.map(x=>({姓名:x.name,状态:x.status})):[]};
    value.纪念书=s.keepsakeBooks.filter(P.KeepsakeBooks.readable).map(book=>({书名:book.title,版本:book.version,书稿:P.KeepsakeBooks.PHASES[book.phase][0],订单:P.KeepsakeBooks.PHASES[book.phase][1],已付演示金额:P.KeepsakeBooks.paidTotal(book)}));
    document.getElementById('state-preview').textContent=JSON.stringify(value,null,2);
    if(s.spaceCamera){value.记忆空间={模式:s.spaceCamera.mode,相机:s.spaceCamera[s.spaceCamera.mode],物件:s.hotspot,故事展开:Boolean(s.spaceStoryOpen)};document.getElementById('state-preview').textContent=JSON.stringify(value,null,2);}
    if(s.digitalHuman){value.数字人.形象={形象:'二维人物动画片段',称呼:P.DigitalHuman.greeting().title,状态:s.digitalHuman.phase,交流:'预置文字演示'};document.getElementById('state-preview').textContent=JSON.stringify(value,null,2);}
  }
  const phone = document.getElementById('phone');
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
    P.Couples.closeRecorder();
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
  /** 将哈希路由映射为已知页面；未知内容不会作为 HTML 输出。 */
  function readRoute() {
    const hash=location.hash.slice(1) || 'home';
    const [requested,id,detail,view]=hash.split('/');
    // 旧的独立数字人链接统一进入 AI 问家，保留当前家庭与登录身份。
    const retiredDigital = retiredDigitalRoutes.has(requested) || (requested === 'house-service' && id === 'digital');
    // 退役页面改到现有入口。旧上传链接带人物或分类时，继续打开对应档案。
    const oldUploads = requested === 'house-stories' && id === 'mine' && !detail && !view;
    const name = retiredDigital ? 'house-assistant' : oldUploads ? 'materials' : (oldRoutes.get(requested) ?? requested);
    if (name !== requested) window.history.replaceState(null, '', '#' + name);
    P.state.homeDiaryStory = false;
    P.state.historyServiceFromPerson = false;
    P.state.serviceIntroFromCatalog = false;
    if(!P.Households.canRoute(name)){P.state.route='home';return;}
    P.state.historyServiceFromPerson = name === 'house-film-intro' && detail === 'personal';
    P.state.serviceIntroFromCatalog = detail === 'addons' && isServiceIntro(name);
    P.Households.setRoute(name,id,detail,view);
    // 仅在进入空间路由时收起说明，同页重绘仍保留用户的展开选择。
    if(name==='space'&&P.state.route!=='space'&&P.Households.current())P.MemorySpace.enter();
    P.FamilyHomeEditor.enterPage(name);
    P.state.route=P.views[name]?name:'home';
    // 家史整篇阅读。旧链接沿用指定人物的档案授权，末尾章节号无需解析。
    if(name==='home-origin'||name==='home-origin-edit'||P.HistoryServiceIntro.has(name))P.state.homeReaderPerson=id||P.FamilyHome.ensure().family.mottoOwner;
    if(name==='home-surname')P.state.homeReaderPerson=id||P.FamilyContext.current();
    P.state.homeAlbumPage = name === 'home-album' ? id : '';
    P.state.homeDiaryPage = name === 'home-diary' ? id : '';
    P.state.homeDiaryStory = name === 'story' && detail === 'diary';
    if(name==='story'||name==='house-story') P.state.storyId=id || 'first-order';
    if(name==='life'){const person=id || P.FamilyContext.current();if(id&&P.state.actor!=='father'&&id!==P.state.actor&&P.FamilyContext.invited(id)){if(P.state.chatTarget!==id){P.state.chatMessages=[];P.state.chatContext=null;}P.state.familyFocus[P.state.actor]=id;P.state.chatTarget=id;}if(P.state.archivePerson!==person){P.state.lifeTab='overview';P.state.videoFilter='all';P.state.biographyMode='read';P.state.archiveChapterId='';}P.state.archivePerson=person;}
    if(name==='chat'&&id&&P.ContentChat.available(id)&&id!==P.state.chatTarget){
      P.state.chatTarget=id;P.state.chatMessages=[];P.state.chatContext=null;
    }
    if(name==='archive-item')P.state.archiveItemId=id || '';
    if(name==='service-order')P.state.customizationOrderId=id || '';
    if(['book-edit','book-preview','book-order'].includes(name))P.state.keepsakeBookId=id || '';
  }
  /** 只保存当前状态和当前账号绑定的未提交输入，重置后的旧表单不会回灌。 */
  function captureInputs() {P.captureRecord();P.DigitalHuman?.captureDraft();P.QuestionInbox?.captureDrafts();captureFeatureInputs();}
  /** 各功能草稿在切页、换账号与字号变化前保存。 */
  function captureFeatureInputs() {
    P.FamilyHomeEditor.capture();
    P.MaterialLibrary.capture();
    P.AnswerFeedback.capture();
    P.KeepsakeBooks.capture();
    P.FamilyAssistant.capture();
  }
  /** 导航时关闭开屏并清理计时；离开录制页保留输入并暂停演示。 */
  function navigate(route,{replace=false}={}) {
    if(!P.EntryFlow.authenticated()){P.FamilyMoment.close();P.EntryFlow.render();return;}
    P.LoginScroll.close(false);captureInputs();
    if(P.Households.current()&&P.state.actor!=='father'&&route==='life')P.state.archivePerson=P.FamilyContext.current();
    if(['home','house-stories','film-delivery'].includes(route.split('/')[0]))document.getElementById('app-content').scrollTop=0;
    const current=location.hash.slice(1) || 'home';
    if (P.state.record.recording && route!=='record') P.state.record.paused=true;
    closeModal();
    P.state.history=P.state.history || [];
    if (current!==route&&!replace) P.state.history.push(current);
    if (location.hash.slice(1)===route) {readRoute();render();}
    else if(replace)location.replace('#'+route);
    else location.hash=route;
  }
  /** 返回当前演示流程中的上一页，不跳出原型。 */
  function back() {
    const fallback={'home-manage':'home','home-motto-edit':'home-manage','profile-family':'profile','billing-plan':'profile','service-orders':'profile','share-gifts':'share-memory',story:'life',chat:'house-service/digital',space:'house-service/vr',review:'record',membership:'profile',settings:'profile',record:'home',family:'profile-family','family-permissions':'profile-family',invitation:'family',life:'house-stories'};
    Object.assign(fallback,{materials:'house-stories/personal','material-inbox':'profile','material-edit':'materials','material-review':'material-edit','chat-messages':'chat',questions:'profile','question-history':'house-stories/personal',corrections:'chat-messages','correction-edit':'corrections','correction-review':'corrections'});
    Object.assign(fallback,{books:'service-orders','book-edit':'books','book-preview':'books','book-order':'books','house-screen':'profile'});
    let previous;
    if (P.state.serviceIntroFromCatalog) {
      previous = P.state.history?.at(-1) === 'house-addons' ? P.state.history.pop() : 'house-addons';
    } else if (P.state.historyServiceFromPerson) {
      const history = P.state.history;
      const origin = P.state.historyServiceReturn;
      // 从人物志进入时回原来的浏览路径，直接打开介绍链接时回对应人物。
      previous = origin?.path?.startsWith('house-stories/') && history?.at(-1) === origin.path
        ? history.pop() : 'house-stories/' + P.state.homeReaderPerson;
    } else if (P.HistoryServiceIntro.has(P.state.route)) {
      const origin = 'home-origin/' + P.state.homeReaderPerson;
      const prior = P.state.history?.at(-1);
      const defaultOrigin = prior === 'home-origin' && P.state.homeReaderPerson === P.FamilyHome.ensure().family.mottoOwner;
      // 直接打开介绍链接时也回对应家史，避免回到无关的演示页面。
      previous = prior === origin || defaultOrigin ? P.state.history.pop() : origin;
    } else {
      previous = P.state.history?.pop() || P.Households.fallback(P.state.route) || fallback[P.state.route] || 'home';
    }
    captureInputs();if(P.state.record.recording && previous!=='record')P.state.record.paused=true;
    closeModal();location.hash=previous;
  }
  /** 主入口共用底栏与侧栏定义，传家定制归属「我的」。 */
  function renderNavigation() {
    const { route, history } = P.state;
    const editingFromHome = route === 'home-motto-edit' && history?.at(-1) === 'home';
    const active = editingFromHome ? 'home' : P.state.serviceIntroFromCatalog ? 'profile'
      : P.state.historyServiceFromPerson ? 'house-stories' : TAB_PARENTS[route] || route;
    document.getElementById('bottom-nav').innerHTML=MAIN_TABS.map(([route,icon,label,target=route])=>`<button type="button" class="${active===route?'active':''}" data-nav="${target}" ${active===route?'aria-current="page"':''}>${i(icon)}<span>${label}</span></button>`).join('');
    const routes=[...MAIN_TABS,['house-switch','family','创建或切换家庭'],['membership','star','家庭会员'],['house-addons','book','传家定制']];
    if(P.Households.current())routes.push(['house-screen','screen',frameName]);
    document.getElementById('studio-nav').innerHTML=routes.map(([route,icon,label,target=route])=>l(i(icon)+label,target,P.state.route===route?'active':'')).join('');
  }
  /** 次级服务页使用公共标题栏，数字人反馈从服务内部进入。 */
  function renderHeader() {
    const s=P.state;
    const header = document.getElementById('app-header');
    const historyService = P.HistoryServiceIntro.has(s.route);
    if (s.route === 'house-screen-intro' || historyService) {
      const returnLabel = s.serviceIntroFromCatalog ? '返回传家定制'
        : s.historyServiceFromPerson ? '返回人物志' : historyService ? '返回家史' : '返回我家';
      header.innerHTML = b(i('back'), 'back', 'icon-button', `aria-label="${returnLabel}"`) +
        `<p class="app-book-label">${e(ROUTE_NAMES[s.route])}</p>`;
      return;
    }
    if (s.route === 'home-diary' || s.homeDiaryStory) {
      const target = s.homeDiaryStory ? P.FamilyJournal.diaryListFor(s.storyId) : 'home';
      const title = s.homeDiaryStory ? e(P.FamilyJournal.familyName()) + '日记' : '';
      header.innerHTML = l(i('back'), target, 'icon-button', 'aria-label="返回' + (s.homeDiaryStory ? '家庭日记' : '我家') + '"') +
        `<p class="app-book-label">${title}</p>` + l(i('plus') + ' 记一件事', 'house-record/diary', 'paper-link');
      return;
    }
    if (s.route === 'home-origin') {
      const person = s.homeReaderPerson;
      const edit = P.FamilyHome.editable('origin', person) && P.FamilyHome.document('origin', person)
        ? b(i('edit') + '编辑', 'heritage-edit', 'paper-link history-header-edit', `data-kind="origin" data-person="${e(person)}"`)
        : '';
      header.innerHTML = l(i('back') + '我家', 'home', 'paper-link history-back', 'aria-label="返回我家"') + edit;
      return;
    }
    if (s.route === 'home-origin-edit') {
      header.innerHTML = l(i('back') + '家史', 'home-origin/' + e(s.homeReaderPerson), 'paper-link history-back', 'aria-label="返回家史"') +
        '<h1 class="app-book-label">编辑家史</h1>';
      return;
    }
    if (homeReaders.includes(s.route)) {
      const label = s.route === 'home-album' ? '' : ROUTE_NAMES[s.route];
      header.innerHTML = l(i('back'), 'home', 'icon-button', 'aria-label="返回我家"') +
        `<p class="app-book-label">${label}</p>` + l(i('close'), 'home', 'icon-button', 'aria-label="关闭并返回我家"');
      return;
    }
    const main=MAIN_TABS.some(([route])=>route===s.route);
    // 次级页按设计稿保留居中标题与返回；“我的”仍由固定底栏进入。
    const messages=P.Households.current()&&s.route==='chat'?l(i('mail')+'<span>反馈</span>'+(P.chatHasNotice()?'<span class="chat-task-dot" role="img" aria-label="有新回复或待处理消息"></span>':''),'chat-messages','chat-message-trigger'):'';
    const messageHistory = s.route === 'house-stories' && P.Households.current()
      ? l(i('chat') + '留言记录', 'question-history', 'paper-link story-message-history') : '';
    // 分类详情只显示本分类，返回沿用档案模块的总览动作，不退出当前人物。
    if(P.Households.current()&&s.route==='life'&&s.lifeTab!=='overview'){
      const title=P.PersonArchive.tabs[s.lifeTab]||'人生印记';
      document.getElementById('app-header').innerHTML=b(i('back'),'archive-tab','icon-button','data-value="overview" aria-label="返回人生印记总览"')+'<h1>'+title+'</h1>';return;
    }
    const uploadTitle=s.route==='material-edit'?P.MaterialLibrary.uploadHeader():'';
    const milestoneTitle=s.route==='house-moment'&&document.getElementById('moment-form')?.dataset.edition==='milestone'?'记里程碑':'';
    const title = s.route === 'home' && !P.Households.isExample()
      ? P.escape(P.Households.current()?.name || '传家录')
      : uploadTitle || milestoneTitle || ROUTE_NAMES[s.route];
    const backButton=main?'':b(i('back'),'back','icon-button','aria-label="返回上一页"');
    document.getElementById('app-header').innerHTML=`${backButton}<h1>${title}</h1>${messages}${messageHistory}`;
  }
  /** 渲染当前页面，保持状态、预览说明与页面一致。 */
  function render() {
    P.FamilyHomeViews.unmountCover();
    P.FamilyHomeViews.unmountAlbum();
    P.FamilyTree.syncHomeEditor();
    syncFontMode();
    const authenticated = P.EntryFlow.authenticated();
    // 非维护人打开旧编辑链接或在编辑中切换身份时，回首页阅读正式稿。
    if (authenticated && P.state.route === 'home-motto-edit' && !P.FamilyHome.editable('motto')) {
      P.state.route = 'home';
      window.history.replaceState(null, '', '#home');
      document.getElementById('app-content').scrollTop = 0;
    }
    P.HouseScreen.mount(authenticated && P.state.route === 'house-screen');
    P.HistoryServiceIntro.stopPlayback();
    phone.classList.toggle('profile-secondary', authenticated && PROFILE_SECONDARY_ROUTES.has(P.state.route));
    phone.classList.toggle('product-intro', authenticated && isServiceIntro(P.state.route));
    if(!authenticated){P.FamilyMoment.close();P.EntryFlow.render();return;}
    document.getElementById('phone').classList.remove('entry-mode');
    const s=P.state;
    if (s.route === 'home-origin-edit' && !P.FamilyHome.editable('origin', s.homeReaderPerson)) s.route = 'home-origin';
    // 路由标识仅用于还原各页设计稿的封面和标题栏，不参与业务判断。
    document.getElementById('phone').dataset.route=s.route;
    document.getElementById('phone').dataset.actor=s.actor;
    phone.classList.toggle('journal-mode', homeReaders.includes(s.route) || s.route === 'home-origin-edit' || s.homeDiaryStory);
    P.DigitalHuman?.captureDraft();P.QuestionInbox?.captureDrafts();captureFeatureInputs();
    P.PersonArchive?.stopPlayback();
    P.FamilyEditions.stopAlbumAudio();
    const content=document.getElementById('app-content');
    const previousTop=content.scrollTop;
    P.MemorySpace?.unmount();
    P.DigitalHuman?.prepare(s.route==='chat'&&P.ContentChat.available(s.chatTarget));
    document.getElementById('phone').classList.toggle('space-mode',s.route==='space'&&Boolean(P.Households.current())&&P.FamilyContext.allowed('father','space'));
    let page=P.views[s.route]();
    if(P.Households.current()&&s.route==='record'&&s.record.archiveAddition)page=P.FamilyMemories.record(page);
    if(P.Households.current()&&s.actor!=='father'&&s.route==='review')page=P.FamilyMemories.review(page);
    content.innerHTML=page;
    P.PhotoStories.mount();
    P.FamilyMoment.mount();
    content.querySelectorAll('[data-feature-form],[data-feature-action]').forEach(element=>{element.featureState=s;});
    // 表单只属于这一份草稿；重置或提交后到达的 hashchange 不能把旧 DOM 写回新草稿。
    content.querySelectorAll('#record-form,#publish-form').forEach(form=>{form.recordDraft=s.record;});
    content.querySelectorAll('#chat-form,[data-story-question],[data-question-answer]').forEach(form=>{form.draftState=s;form.draftActor=s.actor;});
    content.scrollTop=previousTop;
    P.FamilyHomeViews.mountCover(content);
    P.FamilyHomeViews.mountAlbum(content);
    P.FamilyJournal.mount(content);
    if (s.route === 'home') P.FamilyMap.mount(content);
    renderHeader();renderNavigation();refreshControls();
    const note=(!P.Households.isExample()&&['home','life','profile','chat','space','family'].includes(s.route))||Object.hasOwn(P.Households.titles,s.route)
      ? [ROUTE_NAMES[s.route],'家庭空间内可以记录往事、邀请亲人，并按需开通会员或独立服务。'] : NOTES[s.route] || NOTES.home;
    document.getElementById('review-title').textContent=note[0];
    document.getElementById('review-description').textContent=note[1];
    updateStatePreview();
    if(s.route==='service-order')P.Customization.staffPanel();
    else if(P.Households.current())P.KeepsakeBooks.demo();
    else document.getElementById('book-demo-controls').hidden=true;
    if(P.Households.isExample()&&s.route==='space')P.MemorySpace?.mount();
    if(P.Households.current()&&s.route==='chat'&&P.ContentChat.available(s.chatTarget))P.DigitalHuman?.mount();
    // 首页、交片和成长相册复用档案播放器的字幕、进度与错误提示，离页统一暂停。
    if(P.Households.current()&&['home','archive-item','life','film-delivery','house-baby','house-elders'].includes(s.route))P.PersonArchive?.mount();
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
      P.LoginScroll.close(false);
      captureInputs();
      P.PersonArchive?.stopPlayback();
      P.DigitalHuman?.stop();
    }
    // 草稿按账号保留，未提交的核对操作在离开原账号时失效。
    if (s.actor !== id && s.familyHome) s.familyHome.review = null;
    s.accountDrafts=s.accountDrafts || {};
    s.accountDrafts[s.actor]={record:structuredClone(s.record),saved:Boolean(s.draftSaved)};
    s.actor=id;s.record=structuredClone(s.accountDrafts[id]?.record || P.emptyRecord());
    s.record.recording=false;s.record.paused=false;s.draftSaved=s.accountDrafts[id]?.saved || false;
    s.chatMessages=[];s.chatContext=null;s.chatTarget=P.FamilyContext.current();s.archivePerson=P.FamilyContext.current();s.checkout=null;s.shareStoryId=null;
    if (!switchingHousehold) { closeModal(); render(); }
  }
  /** 字号开关只改变阅读尺寸，不清除正在编辑的文字。 */
  function toggleFont() {captureInputs();P.state.fontLarge=!P.state.fontLarge;render();}
  /** 时钟只更新录制演示；视频进度由原生播放器负责，不保留封面计时器。 */
  function tick() {
    const r=P.state.record;
    if(r.recording && !r.paused) {r.seconds++;const label=document.getElementById('record-time');if(label)label.textContent=P.duration(r.seconds);}
    if (r.recording) updateStatePreview();
  }
  Object.assign(P,{modal,closeModal,closeAddon,toast,navigate,back,render,changeActor,toggleFont,syncFontMode,captureInputs,updatePreview:updateStatePreview});
  /** 所有交互集中注册，反复渲染页面不会叠加监听器。 */
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');
    if(nav){event.preventDefault();if(P.Households.current()&&nav.closest('#bottom-nav')&&nav.dataset.nav==='chat'&&P.state.actor!=='father'){if(P.state.chatTarget!==P.FamilyContext.current())P.state.chatMessages=[];P.state.chatTarget=P.FamilyContext.current();P.state.chatContext=null;}return navigate(nav.dataset.nav);}
    const action=event.target.closest('[data-action]');
    if(!action || action.disabled)return;
    if(action.dataset.action==='back')return back();
    P.act(action.dataset.action,action);
  });
  document.addEventListener('submit',P.submit);
  document.addEventListener('change',event=>{if(event.target.id==='invite-person')P.act('invite-person-change',event.target);});
  document.addEventListener('change',event=>{if(event.target.id==='archive-person-select')P.act('archive-person',event.target);});
  document.getElementById('actor-select').addEventListener('change',event=>{if(!P.Households.changeMember(event.target.value))changeActor(event.target.value);});
  document.getElementById('width-select').addEventListener('change',event=>document.documentElement.style.setProperty('--phone-width',event.target.value+'px'));
  document.getElementById('font-toggle').addEventListener('click',toggleFont);
  document.getElementById('scenario-select').addEventListener('change',event=>{
    const value=event.target.value;
    if(value!=='normal')P.Households.activateExample();
    if(value==='home-empty'){closeModal();P.FamilyHome.empty();navigate('home');}
    if(value==='private'){changeActor('xia');navigate('story/private');}
    if(value==='quota'){const p=P.Billing.period(P.FamilyContext.current());if(p)p.qaUsed=P.Billing.RULES.qa;navigate('chat');}
    if(value==='failure'){P.state.failNextRecord=true;navigate('record');toast('下一次整理将模拟失败，输入内容会保留。');}
    if(value==='normal'){closeModal();P.Households.reset();navigate('home');}
  });
  // 重置家庭演示返回建家入口，旧版应用市场可从独立工具重开。
  document.getElementById('reset-demo').addEventListener('click',()=>{closeModal();P.Households.reset();P.state.history=[];P.EntryFlow.reset();navigate('home');toast('演示已还原，当前没有保存到本地或云端。');});
  document.getElementById('restart-entry').addEventListener('click',()=>P.EntryFlow.reset(true));
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
  /** 刷新或历史恢复进入首页时回到顶部，保持家庭开篇处可见。 */
  window.addEventListener('pageshow',()=>{if(P.state.route==='home')document.getElementById('app-content').scrollTop=0;});
  window.addEventListener('hashchange',event=>{
    if (addonModal.open || baseModal.open) closeModal();
    captureInputs();
    if(P.state.record.recording&&location.hash!=='#record')P.state.record.paused=true;
    const previous=P.state.route,content=document.getElementById('app-content');
    const previousReader = P.state.homeReaderPerson;
    const previousPath = event.oldURL.split('#')[1] || 'home';
    const fromPersonIntro = P.state.historyServiceFromPerson;
    const fromCatalogIntro = P.state.serviceIntroFromCatalog;
    readRoute();
    if (isServiceIntro(P.state.route) && (previous === 'home-origin'
      || (previous === 'house-stories' && P.state.historyServiceFromPerson)
      || (previous === 'house-addons' && P.state.serviceIntroFromCatalog))) {
      P.state.historyServiceReturn = {person: previousReader, path: previousPath, top: content.scrollTop};
    }
    const album = P.state.route === 'home-album';
    const previousAlbumPage = album && previous === 'home-album' ? P.FamilyJournal.albumPage(content) : null;
    const diaryBook = P.state.route === 'home-diary' || P.state.homeDiaryStory;
    const previousDiaryPage = diaryBook ? P.FamilyJournal.diaryPage(content) : null;
    // 进入阅读页时记住首页滚动位置，返回后仍从原来的段落继续。
    const wasDiaryStory = previous === 'story' && event.oldURL.endsWith('/diary');
    const reader = homeReaders.includes(P.state.route) || P.state.homeDiaryStory;
    if(previous==='home' && reader)P.state.homeReaderScrollTop=content.scrollTop;
    const returning=(homeReaders.includes(previous) || wasDiaryStory) && P.state.route==='home';
    const albumDetailRoutes=['story','archive-item','material-edit','house-moment'];
    if(['house-baby','house-elders','house-couple'].includes(previous)&&albumDetailRoutes.includes(P.state.route))P.FamilyEditions.rememberAlbum(content);
    content.scrollTop=0;
    render();
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
    if (diaryBook) P.FamilyJournal.showDiaryTurn(content, previous, previousDiaryPage);
    if(returning)content.scrollTop=P.state.homeReaderScrollTop||0;
    if(['home','house-stories'].includes(P.state.route))P.FamilyHomeViews.restoreAlbum(content,event.oldURL.split('#')[1]||'');
    P.FamilyEditions.positionAlbum(content,albumDetailRoutes.includes(previous));
  });
  if(new URLSearchParams(location.search).get('embedded')==='1')document.body.classList.add('embedded');
  readRoute();render();
  P.FamilyEditions.positionAlbum(document.getElementById('app-content'));
  setInterval(tick,1000);
}
