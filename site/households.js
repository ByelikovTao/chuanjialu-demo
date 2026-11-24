/** 家庭切换、家庭会员与单项交付。原有业务页直接使用当前家庭工作区。 */
'use strict';
{
  const P=window.App,{escape:e,icon:i,link:l,button:b}=P;
  const PLAN = {
    price: 249,
    freeGB: 1,
    memberGB: 20,
    plannedAudioHours: 8
  };
  const EXAMPLE='example', PARTNER_EXAMPLE='partner-example', exampleName=P.HOME_NAME;
  function unitQuote(label, amount, unit) {
    return {price: `${label} ${amount} ${unit}`, priceLabel: label, amount, unit};
  }
  const services = {
    film: {
      title: 'AI 人生故事片', ask: '咨询故事片拍摄',
      summary: '征得本人同意后，顾问上门采访并收集老照片。确认小样后制作成片。',
      ...unitQuote('试点参考价', '15,000', '元／位'),
      next: '顾问会先确认拍摄对象、地点和想讲的故事，再约定采集安排。'
    },
    book: {
      title: '纸质纪念书', ask: '咨询纸书制作',
      summary: '编辑帮你从已获授权的往事里选材、排版。家人先看校样，确认样书后再印制。',
      price: '编辑、样书、印制分段报价', next: '编辑会先了解想收录哪些往事、准备印几册，再给出分项报价。'
    },
    frame: {
      title: '传家相框', ask: '咨询门店试售价',
      summary: '家人可以用手机添照片，爸妈能在相框上回语音。门店会单独说明选片预装和配送费用。',
      ...unitQuote('演示价', '699', '元／台'),
      next: '门店会确认设备售价、是否包含预装和配送，再由你决定是否购买。'
    }
  };
  const titles={'house-create':'创建家庭','house-switch':'创建或切换家庭','house-add':'添加记录','house-story':'家庭往事','house-moment':'记一刻',
    'house-stories':'记录',
    'house-addons':'传家定制','service-order':'定制进度'};
  const RECORD_SCOPES={private:'仅自己',selected:'指定家人',family:'当前家庭成员'};
  const SHARED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const SHARED_PHOTO_ACCEPT = SHARED_PHOTO_TYPES.join(',');
  const SHARED_PHOTO_MAX_BYTES = 20 * 1024 ** 2;
  const SHARED_PHOTO_ERROR = '请选 20 MB 内的 JPG、PNG、WEBP 或 GIF 照片。';
  const STORY_PROFILE_LIMITS = { name: 24, intro: 600, hometown: 48, education: 1200, work: 1200 };
  const STORY_RECENT_LABEL = '新记';
  const STORY_CATEGORIES={
    photo:{label:'留影',kind:'photo',unit:'张'},
    video:{label:'影录',kind:'clip',unit:'段',preview:2},
    work:{label:'作品',kind:'work',unit:'件',preview:2}
  };

  /** 林家的档案主是林慧，陈远山以本家的配偶成员身份加入同一份家庭工作区。 */
  function partnerExample() {
    const workspace = P.initialState(false);
    workspace.actor = 'partner';
    workspace.members.push('partner');
    workspace.accounts.partner = P.newAccount();
    workspace.familyFocus.partner = 'father';
    workspace.familyInvitations.partner = ['father'];
    workspace.familyAccess.father.archive.push('partner');
    workspace.familyAccess.partner = {archive: [], digital: [], space: []};
    workspace.familyHome.profiles.father = {surname: '林', origin: null};
    workspace.familyHome.family.motto = {
      text: '待人有礼，处事有信。\n一家有事，一家商量。', source: '林慧示例手书',
      kind: 'new', date: '2026-10-29', confirmedBy: 'father', revision: 1
    };
    // 两位成员各有署名照片，可以用自己的身份体验投送到相框。
    const photos = [{
      id: 'lin-first-meal', title: '1989 年 · 成家后的第一顿饭', category: '相伴成家',
      homeCover: true, year: '1989', date: '1989年', houseImage: 'assets/family-home/reference/first-meal.webp',
      text: ['在旧屋支了张小桌，后来的日子就从这一顿饭开始。'], source: '林慧示例口述'
    }, {
      id: 'lin-frame-wedding', title: '1989 年 · 成家那天的合影', category: '相伴成家',
      year: '1989', date: '1989年', houseImage: 'assets/zhumen/life-wedding-demo.webp',
      text: ['那天我们都穿得格外整齐。照片洗出来以后，我把它收进了相册第一页。']
    }, {
      id: 'lin-frame-trip', title: '2018 年 · 旅行路上的合影', category: '山河同行',
      year: '2018', date: '2018年', houseImage: 'assets/zhumen/couple-first-trip-demo.webp',
      text: ['那天没赶行程，走累了就停下歇歇。回来翻相册，我最喜欢这一张。']
    }, {
      id: 'lin-frame-dumplings', title: '2026 年 · 除夕一起包饺子', category: '团圆时刻',
      year: '2026', date: '2026年除夕', houseImage: 'assets/family-home/reference/making-dumplings.webp',
      text: ['一家人围在桌前，边擀皮边说话，等饺子下锅时才发现包了满满两盘。']
    }, {
      id: 'lin-frame-old-lane', title: '2025 年 · 再回老街走一趟', category: '故乡记忆',
      author: 'partner', year: '2025', date: '2025年秋', houseImage: 'assets/family-home/reference/old-lane.webp',
      text: ['老街的路还是那么窄。走到以前那扇门前，我停下来拍了一张。']
    }, {
      id: 'lin-frame-tea', title: '2026 年 · 午后泡一壶茶', category: '家里日常',
      author: 'partner', year: '2026', date: '2026年', houseImage: 'assets/family-home/reference/afternoon-tea.webp',
      text: ['下午阳光进了屋，我泡了壶茶，叫林慧来坐一会儿。']
    }];
    workspace.stories.push(...photos.map(({author = 'father', ...photo}) => ({
      author, subject: author, confirmedBy: author, relatedMembers: [...workspace.members],
      scope: 'family', viewers: [...workspace.members], fromFamily: true, houseBytes: 0,
      recorded: '2026年10月29日',
      source: `${author === 'father' ? '林慧' : '陈远山'}的家庭记录 · 虚构示例`,
      ...photo
    })));
    return {
      id: PARTNER_EXAMPLE, name: '林家', seal: '林', workspace,
      people: {
        father: {...P.PEOPLE.mother, relation: '家庭管理人'},
        partner: {...P.PEOPLE.father, relation: '丈夫'}
      },
      accountLinks: {partner: `${EXAMPLE}:father`, father: `${EXAMPLE}:mother`},
      orders: [], membership: null, freeGB: PLAN.freeGB
    };
  }

  function newRegistry(){
    const start=new URLSearchParams(location.search).get('start');
    const example={id:EXAMPLE,name:'陈家示例',seal:'陈',workspace:P.state,people:{...P.PEOPLE},orders:[],
      membership:null,freeGB:PLAN.freeGB};
    return {active:start==='new'?'':EXAMPLE,example,families:[partnerExample()],profileAvatars:new Map(),nextFamily:0,routeId:'',routeDetail:''};
  }
  let registry=newRegistry();

  function current(){return registry.active===EXAMPLE?registry.example:registry.families.find(item=>item.id===registry.active);}
  function families(){return [...registry.families,registry.example];}
  function isExample(){return registry.active===EXAMPLE;}
  function familyDisplayName(family = current()) {
    return family?.id === EXAMPLE ? '陈家' : family?.name || '';
  }
  function familyPeople(family) {
    return family.workspace === P.state ? P.PEOPLE : family.people;
  }
  function accountKey(family, person) {
    return family.accountLinks?.[person] ?? `${family.id}:${person}`;
  }
  function profileAvatar(person) {
    const family = current();
    return family ? registry.profileAvatars.get(accountKey(family, person)) : undefined;
  }
  function familyRole(family = current(), person = family?.workspace.actor) {
    if (!family || !person) return '';
    if (person === 'father') return family.workspace.familyWorkspace ? '家庭管理人' : '档案本人';
    const relation = familyPeople(family)[person]?.relation;
    if (['妻子', '丈夫', '配偶'].includes(relation) || family.id === EXAMPLE && person === 'mother') return '配偶';
    return relation || '家庭成员';
  }
  /** 认领后的关系按家庭编号与本地成员匹配，名字相同或亲属称谓相同不代表同一账号。 */
  function familyChoices() {
    const active = current();
    if (!active || !P.state.members.includes(P.state.actor) || !Object.hasOwn(P.state.accounts, P.state.actor)) return [];
    const account = accountKey(active, P.state.actor);
    return [registry.example, ...registry.families].flatMap(family => {
      const person = family.workspace.members.find(id => Object.hasOwn(family.workspace.accounts, id) &&
        Object.hasOwn(familyPeople(family), id) && accountKey(family, id) === account);
      return person ? [{family, person, selected: family === active}] : [];
    });
  }
  function homeSwitcher() {
    return familyChoices().length > 1
      ? b(i('switch') + '切换家庭', 'house-switch-open', 'paper-link home-family-switch', 'aria-haspopup="dialog" aria-controls="modal"')
      : '';
  }
  /** 两个入口展示同一账号在各家庭中的姓名、身份和当前标记。 */
  function familySwitchOptions(choices) {
    const rows = choices.map(({family, person, selected}) => {
      const name = familyDisplayName(family);
      const identity = familyPeople(family)[person].name;
      const seal = family.seal ? e(family.seal) : i('house');
      const status = selected ? `<span class="home-family-option-current">${i('check')}当前家庭</span>` : i('arrow');
      return b(`<span class="home-family-option-seal" aria-hidden="true">${seal}</span>
        <span class="home-family-option-copy"><strong>${e(name)}</strong><small>${e(identity)} · ${e(familyRole(family, person))}</small></span>${status}`,
        'house-switch', 'home-family-option', `data-id="${e(family.id)}" aria-pressed="${selected}"`);
    });
    return `<div class="home-family-options" role="group" aria-label="可切换的家庭">${rows.join('')}</div>`;
  }

  function openHomeSwitcher() {
    const choices = familyChoices();
    if (P.state.route !== 'home' || choices.length < 2) return;
    P.modal('切换家庭', familySwitchOptions(choices), 'sheet', undefined,
      {familySheet: true, closeLabel: '关闭切换家庭'});
  }
  function membershipActive(f=current()){
    return Boolean(f?.membership&&f.membership.start<=f.workspace.billingToday&&f.workspace.billingToday<f.membership.end);
  }
  function freeCapacity() {
    return current()?.freeGB ?? PLAN.freeGB;
  }
  function capacity() {
    return membershipActive() ? PLAN.memberGB : freeCapacity();
  }
  function storage(excluding=''){
    return (P.state.archiveAssets||[]).filter(item=>item.id!==excluding).reduce((sum,item)=>sum+(item.storageBytes||0),0)+
      P.state.stories.reduce((sum,story)=>sum+(story.houseBytes||0)+(story.houseVoice?.bytes||0),0);
  }
  function canUpload(bytes,excluding=''){return storage(excluding)+bytes<=capacity()*1024**3;}
  function jump(label,route,primary=false){return l(label,route,primary?'btn full':'btn secondary full');}
  function action(label,key,primary=false,attrs=''){return b(label,key,primary?'btn full':'btn secondary full',attrs);}
  function toolbar(...items){return `<div class="house-actions section">${items.join('')}</div>`;}
  function page(title,note,body,extra=''){
    // 公共页头已显示同名标题时，正文可从说明开始。
    const heading = title ? `<h1 class="page-title">${title}</h1>` : '';
    return `<div class="page house-page ${extra}">${heading}<p class="page-subtitle">${note}</p>${body}</div>`;
  }
  function card(title,note,controls=''){return `<section class="card house-card section"><h2>${title}</h2><p>${note}</p>${controls}</section>`;}
  function field(label,name,placeholder,max=24){
    return `<label class="form-field"><span>${label}</span><input name="${name}" maxlength="${max}" required placeholder="${placeholder}"></label>`;
  }
  function form(id,body,label){
    return `<form id="${id}" class="house-form section">${body}<button type="submit" class="btn full">${label}</button></form>`;
  }
  function empty(){
    return page('把一家人的故事留在这里','先免费建一个家，家人可用各自身份一起补写往事。',
      toolbar(jump('免费创建家庭','house-create',true),action('进入陈家示例','house-example')),
      'family-welcome-empty');
  }
  function create(){
    return page('创建我的家庭','填好家庭名称和称呼，就可以发第一张老照片。',
      form('house-create-form',field('家庭名称','name','例如 陈家')+field('你的称呼','person','例如 知夏'),'免费创建家庭'),
      'family-create-page');
  }
  function switcher() {
    const choices = familyChoices();
    return `<div class="page house-page family-switch-page">
      ${choices.length ? familySwitchOptions(choices) : '<p class="page-subtitle">还未加入家庭</p>'}
      ${l(i('plus') + '创建新家庭', 'house-create', 'paper-link paper-outline family-switch-create')}
      ${current() ? '' : action('进入陈家示例', 'house-example')}
    </div>`;
  }
  function captureBeforeSwitch(){
    if(!P.render)return;
    P.captureInputs();
    P.closeModal();
    P.PersonArchive.stopPlayback();
    P.DigitalHuman.stop();
  }
  function activate(id){
    const target=id===EXAMPLE?registry.example:registry.families.find(item=>item.id===id);
    if(!target)return false;
    if(P.state!==target.workspace){
      captureBeforeSwitch();
      // 旧模块共用 PEOPLE 对象。切换时保留引用，替换其中的当前家庭人物。
      const source=current()||registry.example;
      if (source.workspace === P.state) source.people = {...P.PEOPLE};
      for(const person of Object.keys(P.PEOPLE))delete P.PEOPLE[person];
      Object.assign(P.PEOPLE,target.people);
      P.state=target.workspace;
      P.HOME_NAME=id===EXAMPLE?exampleName:target.name;
    }
    registry.active=id;
    return true;
  }
  function selectHouse(id,route='home',person){
    const fontLarge = P.state.fontLarge;
    if(!activate(id))return;
    // 换家时优先使用同一账号在目标家的成员身份，不能沿用该家最后一个演示账号。
    if (person) {
      if (P.state.actor !== person) P.changeActor(person, {switchingHousehold: true});
      P.state.fontLarge = fontLarge;
    }
    P.navigate(route);
    P.state.history=[];
  }
  function chooseFamily(id) {
    if (!['home', 'house-switch'].includes(P.state.route)) return;
    const choice = familyChoices().find(({family}) => family.id === id);
    if (!choice) return;
    if (choice.selected && P.state.route === 'home') {
      P.closeModal();
      return;
    }
    selectHouse(id, 'home', choice.person);
  }
  function reset(){
    captureBeforeSwitch();
    P.HouseScreen.reset();
    for(const f of [registry.example,...registry.families]){
      for(const story of f.workspace.stories){
        if(story.houseImage?.startsWith('blob:'))URL.revokeObjectURL(story.houseImage);
        if(story.houseVoice?.url)URL.revokeObjectURL(story.houseVoice.url);
      }
    }
    for (const source of registry.profileAvatars.values()) URL.revokeObjectURL(source);
    P.state=P.resetDemoState();
    P.HOME_NAME=exampleName;
    registry=newRegistry();
  }

  function memberIds(ids=P.state.members){
    return [...new Set(ids)].filter(id=>P.state.members.includes(id)&&Object.hasOwn(P.PEOPLE,id));
  }
  /** 旧记录按归档人物查找，已确认纳入的共同经历也可从对方名下找到。 */
  function relatedMemberIds(item){
    if(item.coupleId&&item.coupleFamilyId!==current()?.id)return [];
    if(Array.isArray(item.relatedMembers))return memberIds(item.relatedMembers);
    const members=[item.subject||item.author];
    if(item.commonWith&&P.FamilyContext.inArchive(item,item.commonWith))members.push(item.commonWith);
    return memberIds(members);
  }
  function relatedMemberNames(item){
    return relatedMemberIds(item).map(id=>P.PEOPLE[id].name).join('、');
  }
  /** 关联只记录涉及的人，包含家谱中尚未认领账号的家人。 */
  function memberFields(selected=[],fixed='',compact=false){
    return `<fieldset class="record-members"><legend${compact?' class="sr-only"':''}>关联家人（选填）</legend>
      ${fixed?`<input type="hidden" name="relatedMembers" value="${e(fixed)}">`:''}
      <div class="record-member-options">${memberIds().map(id=>`<label class="check-row">
        <input type="checkbox" name="relatedMembers" value="${e(id)}" ${id===fixed?'checked disabled':selected.includes(id)?'checked':''}>
        <span>${e(P.PEOPLE[id].name)}${id===P.state.actor?'（我）':''}</span></label>`).join('')}</div>
      <p class="caption">可以多选，查看权限在下方单独设置。</p></fieldset>`;
  }
  function audienceFields(id,scope='private',viewers=[]){
    return `<label class="form-field"><span>谁可以看</span><select id="${id}" name="scope" data-record-audience>
      ${Object.entries(RECORD_SCOPES).map(([value,label])=>`<option value="${value}" ${value===scope?'selected':''}>${label}</option>`).join('')}
    </select></label><div data-record-viewers ${scope==='selected'?'':'hidden'}>${P.shareViewerOptions(viewers)}</div>`;
  }
  /** 按提交时的分享范围核对名单，关联人物不参与计算。 */
  function recordAudience(data){
    const scope=String(data.get('scope')||'');
    if(!Object.hasOwn(RECORD_SCOPES,scope))return null;
    const viewers=scope==='family'?memberIds():scope==='selected'?
      memberIds(data.getAll('viewers')).filter(id=>id!==P.state.actor):[];
    if(scope==='selected'&&!viewers.length){P.toast('请选择至少一位家人，或改为仅自己。');return null;}
    return {scope,viewers};
  }
  /** 旧的上传筛选地址仍可打开同一家庭分类，列表按当前账号的共享权限展示。 */
  function storyFilters(id=registry.routeId,detail=registry.routeDetail,view=registry.routeView){
    const segments=id==='mine'?[detail,view]:[id,detail];
    const family=segments.every(value=>!value)||segments.includes('family');
    const person=family?'':memberIds(segments)[0]||memberIds([P.state.actor])[0]||'';
    const section=segments.find(value=>value==='recent'||Object.hasOwn(STORY_CATEGORIES,value))||'overview';
    return {person,section,family};
  }
  function storyListRoute({person='',section='overview',family=false}={}){
    return ['house-stories',family?'family':person,section==='overview'?'':section].filter(Boolean).join('/');
  }
  function openStoryList(filters, {replace = false} = {}){
    const family=current();
    if(family)family.storyOrder='recent';
    P.navigate(storyListRoute(filters), {replace});
  }
  function addRecord(){
    const person=e(P.state.actor);
    const related=memberIds([registry.routeId])[0]||'';
    const suffix=related?'/'+e(related):'';
    const mediaOptions=[
      ['photo','photo','照片','留下一张家里的照片'],
      ['clip','play','视频','保存家人拍下的生活片段'],
      ['work','book','作品','写一段文字，或上传手稿、书画照片']
    ];
    const option=(icon,title,note)=>`${i(icon)}<span><strong>${title}</strong><small>${note}</small></span>${i('arrow')}`;
    return page('想留下一点什么？',`保存到 ${e(current().name)} · 可以记给自己，也可以分享给家人。`,
      `<div class="family-add-options section">
        ${l(option('mic','记一刻','随手拍张照片，或留一段原声'),'house-moment'+suffix,'menu-row')}
        ${mediaOptions.map(([kind,icon,title,note])=>
        b(option(icon,title,note),'material-new','menu-row',`data-person="${person}" data-kind="${kind}" data-from="family" data-related-member="${e(related)}"`)).join('')}
      </div>`,
      'family-add-page');
  }
  function isPhotoStory(story){
    return Boolean(story.photoToken||story.houseImage||story.houseBytes);
  }
  /** 时间线只引用已授权的往事与归档资料，原件和分享范围由各模块维护。 */
  function recentEntries({includePrivate=false,includeAllMedia=false}={}){
    const stories=P.visibleStories().filter(item=>item.inArchive!==false&&(includePrivate||item.scope!=='private'||item.coupleId))
      .reverse().map(item=>({item,kind:isPhotoStory(item)?'photo':'story'}));
    const materials=P.PersonArchive.familyMaterials({includeArchive:true,includePrivate,includeAllMedia}).map(item=>({item,kind:item.kind,material:true}));
    const date=({item})=>item.recordedAt||Date.parse(item.recorded||item.date)||0;
    return [...stories,...materials].sort((left,right)=>date(right)-date(left));
  }
  function storyReplyCount(item) {
    return ((item.replies?.length || 0) + P.HouseScreen.replyCount(item)) + ' 条补充';
  }
  function recordRows(entries,{showRelated=false}={}){
    const labels={photo:['photo','照片'],clip:['play','视频'],work:['book','作品'],story:['edit','往事']};
    return entries.map(({item,kind,material})=>{
      const [icon,label]=kind==='story'&&item.houseVoice?['mic','语音']:labels[kind];
      const cover=item.houseImage||(material?item.poster:'');
      const thumb=cover?`<img src="${e(cover)}" alt="" loading="lazy">`:i(icon);
      const name=e(item.authorName||P.PEOPLE[item.author]?.name||'家人');
      const replies=!material&&(showRelated||item.photoToken)?storyReplyCount(item):'';
      const notice=material?'':P.QuestionInbox.storyNotice(item);
      const related=showRelated?relatedMemberNames(item):'';
      const scope=!item.coupleId&&['private','selected'].includes(item.scope)?RECORD_SCOPES[item.scope]:'';
      const route=(material?'archive-item/':'story/')+e(item.id);
      const meta = [item.babyMilestone?'成长里程碑':label,name,e(item.recorded||item.date||''),scope,replies].filter(Boolean).join(' · ')+notice;
      return l(`<span class="family-record-thumb">${thumb}</span>
        <span class="family-record-copy"><strong>${e(item.title)}</strong><small>${meta}</small>${related?`<small>关联 ${e(related)}</small>`:''}</span>${i('arrow')}`,
      route,'family-record-row');
    }).join('');
  }
  /** 家庭公开入口只汇总当前账号有权查看的共享内容。伴侣记录须授权给当前家庭。 */
  function sharedFamilyEntries({ includeAllMedia = false } = {}) {
    const familyId = current()?.id;
    return recentEntries({ includeAllMedia }).filter(({ item }) =>
      item.coupleId ? item.coupleGrant?.familyId === familyId : item.scope !== 'private');
  }
  function albumEntry({ item, kind, material }) {
    return {
      title: item.title,
      kind,
      cover: material ? (kind === 'clip' && item.materialManaged ? '' : item.poster) : item.houseImage,
      route: `${material ? 'archive-item' : 'story'}/${item.id}`
    };
  }
  function storyCards(entries,person,preview=false){
    const cards=entries.map(({item,kind,material})=>{
      if(material)return P.PersonArchive.familyCard(item,person);
      const related=relatedMemberNames(item);
      const author=item.authorName||P.PEOPLE[item.author]?.name||'家人';
      const replies=` · ${storyReplyCount(item)}`;
      const photoCover=kind==='photo'?`<span class="archive-cover story-archive-thumb">${item.houseImage?`<img src="${e(item.houseImage)}" alt="" loading="lazy">`:i('photo')}</span>`:'';
      return l(`${photoCover}
        <span class="archive-card-copy"><strong>${e(item.title)}</strong><small>${item.houseVoice?'语音 · ':''}${e(author)} · ${e(item.photoYear?item.photoYear+' 年':item.date)}${replies}${P.QuestionInbox.storyNotice(item)}</small>
        ${related?`<small>关联 ${e(related)}</small>`:''}
        ${item.scope==='family'||item.coupleId?'':`<span class="badge gray">${RECORD_SCOPES[item.scope]}</span>`}</span>`,
        'story/'+e(item.id),'archive-media-card');
    }).join('');
    return `<div class="archive-grid${preview?'':' section'}">${cards}</div>`;
  }
  function storyPhotoYear({item,material}){
    const materialYear=material?item.year||item.date?.match(/^\s*(\d{4})(?=\s*年(?!代)|[-/]|$)/)?.[1]:0;
    return Number(item.photoYear||materialYear||(item.coupleId?item.year:0))||0;
  }
  function photoYears(entries,person){
    const groups=new Map();
    for(const entry of entries){
      const year=storyPhotoYear(entry);
      if(!groups.has(year))groups.set(year,[]);
      groups.get(year).push(entry);
    }
    return Array.from(groups).sort(([left],[right])=>right-left).map(([year,entries])=>
      `<section class="section story-photo-year"><h3>${year?year+' 年':'拍摄年代待补充'}</h3>${storyCards(entries,person)}</section>`).join('');
  }
  /** 家庭档案和首页复用共享范围，私密记录由本人在人物志回看。 */
  function filteredStories({family,person}){
    if(family)return sharedFamilyEntries();
    const ownProfile = person === P.state.actor;
    return recentEntries({ includePrivate: ownProfile }).filter(({ item, kind, material }) => {
      if(item.scope==='private'&&!item.coupleId)return ownProfile&&item.author===P.state.actor;
      if (ownProfile && material && kind === 'work' && item.subject === person && item.author === person) return true;
      return !person || relatedMemberIds(item).includes(person);
    });
  }
  /** 专版只浏览有权打开的同一条记录。未关联的本人记录可在本人名下找到。 */
  function profileEntries(person){
    if(!memberIds([person]).length)return [];
    return recentEntries({includePrivate:true}).filter(({item})=>{
      if(item.coupleId)return false;
      const members=relatedMemberIds(item);
      return members.includes(person)||(!members.length&&item.author===person&&item.subject===person);
    });
  }
  /** 共享照片在两类档案里使用同一顺序，私人照片和专版相册保留自己的可见范围。 */
  function storyListPhotos(item, from = '') {
    const [route, id = '', detail = '', view = ''] = from.split('/');
    if (route !== 'house-stories') return null;

    const isArchivePhoto = ({kind, material}) => kind === 'photo' && material;
    const shared = sharedFamilyEntries().filter(isArchivePhoto);
    const sharedIds = new Set(shared.map(entry => entry.item.id));
    const isShared = sharedIds.has(item.id);
    const entries = isShared ? shared : filteredStories(storyFilters(id, detail, view))
      .filter(entry => isArchivePhoto(entry) && !sharedIds.has(entry.item.id));
    if (current()?.storyOrder === 'photo-year') {
      entries.sort((left, right) => storyPhotoYear(right) - storyPhotoYear(left));
    }
    return {photos: entries.map(entry => entry.item), label: isShared ? '家庭照片' : '个人照片'};
  }
  function storyPersonCover(person) {
    return `<header class="story-person-cover">
      ${P.avatar(person, 'story-person-portrait')}
      <h2 id="story-person-title" class="story-archive-title">${e(P.PEOPLE[person].name)}</h2>
      <p class="story-person-title-slip">人物志</p>
    </header>`;
  }

  function storyPersonActions(person, overview) {
    const edit = overview && canEditStoryProfile(person) ? b(i('edit') + ' 编辑资料', 'house-story-profile-edit',
      'story-person-action story-person-edit', `data-id="${e(person)}"`) : '';
    const add = l(i('plus') + ' 添加记录', 'house-add/' + e(person), 'story-person-action');
    return `<div class="story-person-actions">${edit}${add}</div>`;
  }
  function canEditStoryProfile(person) {
    return person === P.state.actor && Object.hasOwn(P.state.accounts, person) && memberIds([person]).length > 0;
  }

  function openStoryProfileEditor(person) {
    const { person: selected, section } = storyFilters();
    if (!canEditStoryProfile(person) || P.state.route !== 'house-stories' || person !== selected || section !== 'overview') return;
    const member = P.PEOPLE[person];
    const details = P.state.storyPersonDetails?.[person];
    const intro = details?.intro ?? P.PersonArchive.biography(person)?.bioIntro ?? '';
    const birthday = P.FamilyEditions.calendarTime(member.birthDate)?.date?.iso || '';
    const limits = STORY_PROFILE_LIMITS;
    P.modal('编辑资料', `<form id="story-person-edit-form" data-feature-form data-person="${e(person)}">
      <div class="story-person-editor-body">
        <section class="story-person-editor-section" aria-labelledby="story-person-basic-fields">
          <h3 id="story-person-basic-fields">基本资料</h3>
          <div class="story-person-editor-paper">
            <label class="form-field"><span>姓名</span><input name="name" value="${e(member.name)}" maxlength="${limits.name}" required></label>
            <div class="story-person-editor-pair">
              <label class="form-field"><span>生日</span><input type="date" name="birthday" value="${e(birthday)}"
                min="1900-01-01" max="${P.FamilyEditions.today()}"></label>
              <label class="form-field"><span>籍贯</span><input name="hometown" value="${e(details?.hometown || '')}"
                maxlength="${limits.hometown}" placeholder="例如 贵州贵阳"></label>
            </div>
          </div>
        </section>
        <section class="story-person-editor-section" aria-labelledby="story-person-intro-fields">
          <h3 id="story-person-intro-fields">小传</h3>
          <textarea name="intro" rows="4" maxlength="${limits.intro}" aria-labelledby="story-person-intro-fields"
            placeholder="写下想留在人物志里的几句话">\n${e(intro)}</textarea>
        </section>
        <section class="story-person-editor-section" aria-labelledby="story-person-experience-fields">
          <h3 id="story-person-experience-fields">经历</h3>
          <div class="story-person-editor-paper">
            <label class="form-field"><span>求学</span><textarea name="education" rows="3" maxlength="${limits.education}"
              placeholder="可写年份、学校和专业，多段可分行">\n${e(details?.education || '')}</textarea></label>
            <label class="form-field"><span>从业</span><textarea name="work" rows="3" maxlength="${limits.work}"
              placeholder="可写年份、单位和岗位，多段可分行">\n${e(details?.work || '')}</textarea></label>
          </div>
        </section>
      </div>
      <footer class="story-person-editor-footer">
        <p class="modal-error" data-story-profile-error role="alert" hidden></p>
        ${b('取消', 'close-modal', 'btn secondary')}
        <button type="submit" class="btn">保存资料</button>
      </footer>
    </form>`, 'sheet', undefined, {familySheet: true, closeLabel: '返回人物志'});
    const form = document.getElementById('story-person-edit-form');
    const error = form.querySelector('[data-story-profile-error]');
    form.addEventListener('input', () => { error.hidden = true; });
  }

  /** 核对当前家庭、登录人和档案对象。旧弹层或切换身份后的表单不能更新他人的资料。 */
  function saveStoryProfile(form) {
    const person = form.dataset.person;
    const { person: selected, section } = storyFilters();
    if (!canEditStoryProfile(person) || person !== selected || section !== 'overview' || P.state.route !== 'house-stories' ||
        form.featureState !== P.state || !form.closest('dialog')?.open) return;

    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    const name = value('name');
    const birthday = value('birthday');
    const details = { intro: value('intro'), hometown: value('hometown'), education: value('education'), work: value('work') };
    const limits = STORY_PROFILE_LIMITS;
    let message = '';
    if (!name || name.length > limits.name) message = `请输入 ${limits.name} 字以内的姓名。`;
    else if (birthday && !P.FamilyEditions.validDate(birthday)) message = '请选择有效的生日，日期不能晚于今天。';
    else if (Object.keys(details).some(field => details[field].length > limits[field])) message = '资料超过可填写的长度，请缩短后再保存。';
    if (message) {
      const error = form.querySelector('[data-story-profile-error]');
      error.hidden = false;
      error.textContent = message;
      return;
    }

    const member = P.PEOPLE[person];
    if (member.name !== name) {
      member.name = name;
      member.short = Array.from(name).slice(0, 2).join('');
    }
    // 只有出生年份的旧档案不因保存其他字段丢失年份，清空完整生日时一并清除对应年份。
    if (birthday || P.FamilyEditions.calendarTime(member.birthDate)?.date) {
      member.birthDate = birthday;
      member.born = birthday.slice(0, 4);
    }
    (P.state.storyPersonDetails ||= {})[person] = details;
    P.closeModal();
    P.render();
    document.querySelector('[data-action="house-story-profile-edit"]')?.focus({ preventScroll: true });
    P.toast('个人资料已保存。');
  }

  function personFilmAccess(person) {
    const film = P.PersonArchive.videos(person, 'film')[0];
    return film ? {route: 'archive-item/' + film.id, label: '观看纪录片'} : null;
  }

  /** 影片观看与申请使用同一组权限判断，未授权时不生成影片链接。 */
  function filmAccessControls(person, className = 'btn full') {
    if (!memberIds([person]).length) return '';
    const access = personFilmAccess(person);
    if (access) return l(access.label + i('arrow'), e(access.route), className);
    if (!P.state.accounts[person]?.videoDelivered) return '';

    const customization = P.Customization.latest('film', person);
    if (customization) return l('查看定制进度' + i('arrow'), P.Customization.route(customization), className);
    if (person !== P.state.actor && P.FamilyContext.invited(person) && !P.FamilyContext.allowed(person)) {
      return b('向本人申请开放', 'family-request', className, `data-person="${e(person)}" data-kind="archive"`);
    }
    return person === P.state.actor
      ? '<p class="caption">当前暂无可打开的交付内容，可到服务订单核对。</p>'
      : '<p class="caption">这项内容暂未向你开放，请联系档案本人确认分享范围。</p>';
  }

  function storyPersonServices(person) {
    const content = `${i('play')}<strong class="story-person-service-title">AI 纪录片</strong>
      <span class="story-person-service-action">查看影片介绍${i('arrow')}</span>`;
    const attrs = `data-profile-service="film" aria-label="${e(P.PEOPLE[person].name + '的 AI 纪录片，查看影片介绍')}"`;
    return `<div id="story-person-services" class="story-person-service-list" role="group" aria-label="传家定制">
      ${l(content, 'house-film-intro/' + e(person) + '/personal', 'story-person-service', attrs)}
    </div>`;
  }

  /** 本人填写的简介、籍贯和经历沿用人物档案的可见范围，传记和原记录仍单独核验。 */
  function storyPersonOverview(person) {
    const member = P.PEOPLE[person];
    const profile = P.PersonArchive.biography(person);
    const canReadDetails = person === P.state.actor ||
      (P.state.archiveProfiles?.[person] ? Boolean(profile) : P.FamilyContext.allowed(person));
    const details = canReadDetails ? P.state.storyPersonDetails?.[person] : null;
    const intro = details?.intro ?? profile?.bioIntro;
    const birthday = P.FamilyEditions.calendarTime(member.birthDate)?.date;
    // 旧档案可能只有出生年份，按原有精度展示，不补造月日。年份沿用资料授权。
    const birthYear = canReadDetails ? P.FamilyEditions.calendarTime(member.born)?.label : '';
    const birth = birthday
      ? `<time datetime="${e(birthday.iso)}">${birthday.year} 年 ${birthday.month} 月 ${birthday.day} 日</time>`
      : e(birthYear || '待补充');
    const hometown = details?.hometown;
    const chapters = (profile?.sections || []).filter(section => /^\d{4}/.test(section.years));
    const events = new Map(P.PersonArchive.events(person).filter(item => item.scope !== 'private').map(item => [item.id, item]));
    const timeline = chapters.map(chapter => {
      const title = chapter.title.replace(/^[一二三四五六七八九十]+、/, '');
      const heading = `<span><small>${e(chapter.years)}</small><strong>${e(title)}</strong></span>`;
      const stories = (chapter.storyIds || []).map(id => events.get(id)).filter(Boolean);
      const chapterContent = chapter.body.map(text => `<p>${e(text)}</p>`).join('') +
        stories.map(story => l('查看往事 · ' + e(story.title), 'story/' + e(story.id), 'text-link story-person-source')).join('');
      return `<li class="story-person-experience">${chapterContent
        ? `<details><summary>${heading}${i('down')}</summary><div class="story-person-experience-copy">${chapterContent}</div></details>`
        : `<div class="story-person-experience-label">${heading}</div>`}</li>`;
    }).join('');
    const written = [['求学', details?.education], ['从业', details?.work]]
      .filter(([, text]) => text)
      .map(([label, text]) => `<div><h4>${label}</h4><p>${e(text)}</p></div>`).join('');
    return `<section class="story-person-summary" aria-labelledby="story-person-intro">
      <h3 id="story-person-intro" class="story-person-chapter-title">小传</h3>
      <p>${e(intro || '暂无可查看的小传。')}</p>
      <section class="story-person-facts-card" aria-labelledby="story-person-facts-title">
        <h4 id="story-person-facts-title" class="story-person-facts-title">${i('source')}基本资料</h4>
        <dl class="story-person-facts">
          <div><dt>出生</dt><dd${birthday || birthYear ? '' : ' class="is-muted"'}>${birth}</dd></div>
          <div><dt>籍贯</dt><dd${hometown ? '' : ' class="is-muted"'}>${e(hometown || (canReadDetails ? '待补充' : '暂无可查看'))}</dd></div>
          <div><dt>与我的关系</dt><dd>${e(P.relation(person))}</dd></div>
        </dl>
      </section>
    </section>
    <section class="story-archive-section" aria-labelledby="story-person-experiences">
      <div class="story-archive-section-heading"><h3 id="story-person-experiences" class="story-person-chapter-title">经历</h3></div>
      ${written ? `<div class="story-person-summary story-person-written">${written}</div>` : ''}
      ${timeline ? `<ol class="story-person-timeline">${timeline}</ol>` : ''}
      ${!written && !timeline ? '<p class="story-person-summary">暂无可查看的经历。</p>' : ''}
    </section>`;
  }
  function storyArchivePicker({family,person}) {
    // 家庭记录固定在首项。家人称呼以登录者为视角，切换档案只改变浏览对象。
    const members = memberIds().map(id => {
      const name = P.PEOPLE[id].name;
      const relation = P.relation(id);
      return {name, relation, label: `${name}（${relation}）`, route: storyListRoute({person: id}), active: id === person};
    });
    const options = [{label: '家庭全部记录', route: 'house-stories', active: family}, ...members];
    const selected = options.find(option => option.active) || options[0];
    const rows = options.map(option => {
      const label = i(option.name ? 'person' : 'family') + e(option.label);
      const item = option === selected
        ? `<span class="story-archive-member-option" aria-current="true">${label}${i('check', 'story-archive-member-check')}</span>`
        : l(label, option.route, 'story-archive-member-option');
      return `<li>${item}</li>`;
    }).join('');
    const currentLabel = e(selected.label);
    return `<details id="house-story-member" class="story-archive-member">
      <summary aria-label="切换档案，当前为${currentLabel}">
        <span class="story-archive-member-symbol">${i('family')}</span>
        <span class="story-archive-member-identity">
          <span class="story-archive-member-caption">切换档案</span>
          <strong>${e(selected.name || selected.label)}${selected.name ? `<small>（${e(selected.relation)}）</small>` : ''}</strong>
        </span>
        ${i('down')}
      </summary>
      <div class="story-archive-member-popover">
        <ul aria-label="可切换的档案">${rows}</ul>
      </div>
    </details>`;
  }
  function storySectionHeading(title, action = '', personChapter = false) {
    const heading = personChapter
      ? `<h3 class="story-person-chapter-title">${title}</h3>`
      : `<h2>${title}</h2>`;
    return `<div class="story-archive-section-heading">${heading}${action}</div>`;
  }
  function storyArchiveEmpty(filters){
    if(filters.section==='work')return `<div class="story-archive-empty">${i('book')}
      <h3>暂无可查看的作品</h3></div>`;
    return `<div class="story-archive-empty">${i('notebook')}
      <h3>${filters.family?'暂无向你开放的共享记录':'这里还没有记录'}</h3>
      <p>可以从一张照片，或一句话开始。</p>
    </div>`;
  }
  /** 总览用少量记录展示各类资料，展开后仍访问原记录与当前筛选。 */
  function storyOverview(entries, categories, filters) {
    const recentRoute=storyListRoute({...filters,section:'recent'});
    const latest=entries.slice(0,3);
    const recentLink = latest.length
      ? l('查看全部 ' + i('arrow'), recentRoute, 'text-link story-archive-link', `aria-label="查看全部${STORY_RECENT_LABEL}"`)
      : '';
    const recent=`<section class="story-archive-section">
      ${storySectionHeading(STORY_RECENT_LABEL, recentLink, Boolean(filters.person))}
      ${latest.length?`<div class="story-archive-list">${recordRows(latest)}</div>`:storyArchiveEmpty(filters)}
    </section>`;
    const previews=categories.map(([id,{label,unit,preview},records])=>{
      const photos=id==='photo';
      // 照片条复用首页的滚动行为，使用完整的当前可见照片集合。
      const list=photos?records:records.filter(entry=>!latest.includes(entry)).slice(0,preview);
      if(!list.length)return '';
      const route=storyListRoute({...filters,section:id});
      const cards=photos?P.FamilyHomeViews.albumTrack(list.map(albumEntry),
        filters.family?'family-photo-track':'profile-photo-track',`${filters.family?'家庭':'个人'}档案照片`, filters.family)
        : id==='video'?storyCards(list,filters.person,true)
        :`<div class="story-archive-list">${recordRows(list)}</div>`;
      return `<section class="story-archive-section" data-archive-preview="${id}">
        ${storySectionHeading(label,l(`${records.length} ${unit} ${i('arrow')}`,route,'text-link story-archive-link',
          `aria-label="查看全部${label}"`))}
        ${cards}
      </section>`;
    }).join('');
    return recent + previews;
  }
  function sharedStories(){
    const family=current();if(!family)return empty();
    const filters=storyFilters();
    const {person,section}=filters;
    const overview=section==='overview';
    const entries=filteredStories(filters);
    // 家庭与人物志共用分类题签，链接仍按原分类标识查找记录。
    const categories = Object.entries(STORY_CATEGORIES).map(([id, category]) =>
      [id, category, entries.filter(entry => entry.kind === category.kind)]);
    const tabs=[['overview',filters.family?'总览':'小传'],...categories.map(([id,{label}])=>[id,label])].map(([id,label])=>
      l(label,storyListRoute({...filters,section:id}),'',id===section?'aria-current="page"':'')).join('');
    const categoryNav=`<nav class="story-archive-tabs${filters.family?'':' story-person-tabs'}" aria-label="${filters.family?'档案分类':'人物志目录'}">${tabs}</nav>`;
    const noRecords=storyArchiveEmpty(filters);
    let body;
    if(section==='recent'){
      body=`<section class="story-archive-section">
        ${storySectionHeading(STORY_RECENT_LABEL, `<span class="story-archive-meta">${entries.length} 条</span>`, Boolean(person))}
        ${entries.length?`<div class="story-archive-list">${recordRows(entries,{showRelated:true})}</div>`:noRecords}
      </section>`;
    }else if(overview){
      body = filters.family || entries.length ? storyOverview(entries, categories, filters) : noRecords;
    }else{
      const [,{label,unit},records]=categories.find(([id])=>id===section);
      const byYear=family.storyOrder==='photo-year';
      const order=section==='photo'&&records.length?`<select id="house-story-order" aria-label="照片排列方式">
        <option value="recent" ${!byYear?'selected':''}>最近收录在前</option><option value="photo-year" ${byYear?'selected':''}>按照片年代</option>
      </select>`:'';
      body=`<section class="story-archive-section">
        ${storySectionHeading(`${label} <small class="story-archive-meta">${records.length} ${unit}</small>`,order)}
        ${section==='work'?'<p class="caption">家书、作文、手稿和书画照片都可以保存在这里。</p>':''}
        ${records.length?(section==='photo'&&byYear?photoYears(records,person):storyCards(records,person)):noRecords}
      </section>`;
    }
    const content = `<div class="archive-content" data-archive-tab="${section}">
      ${person && overview ? storyPersonOverview(person) : ''}${body}
    </div>`;
    // 个人各分类共用册面和目录，家庭全部记录仍按集合浏览。
    const reading = person ? `<article class="story-person-volume" aria-labelledby="story-person-title">
      ${storyPersonCover(person)}${categoryNav}${storyPersonActions(person, overview)}
      ${overview ? `<section class="story-archive-section story-person-service-section" aria-labelledby="story-person-services-title">
        <div class="story-archive-section-heading"><h3 id="story-person-services-title">传家定制</h3></div>
        ${storyPersonServices(person)}
      </section>` : ''}
      ${content}
    </article>` : `${categoryNav}${content}`;
    const picker = storyArchivePicker(filters);
    const uploads = overview
      ? l(i('source') + '我上传的', 'materials', 'paper-link paper-outline story-archive-uploads')
      : '';
    return `<div class="page house-page family-story-page${filters.family ? ' family-story-collection' : ''}">
      <div class="story-archive-toolbar">${picker}${uploads}</div>
      ${reading}
    </div>`;
  }
  function replyPanel(story){
    const questions=P.QuestionInbox.storyPanel(story);
    if(story.scope==='private')return questions;
    const replyForm = form('house-reply-form',`<input type="hidden" name="story" value="${e(story.id)}"><label class="form-field"><span>我记得…</span><textarea name="text" rows="3" maxlength="800" required></textarea></label><p class="caption">能看原往事的家人也能看你的补写。</p>`,'补充这段往事');
    const notes = (story.replies || []).map(reply => `<div class="story-family-note">
      <strong>${e(P.PEOPLE[reply.author]?.name || '家人')}</strong><p>${e(reply.text)}</p></div>`).join('');
    // 照片往事继续折叠补写，其他往事直接显示补写内容。
    const familyNotes = story.photoToken
      ? `<details class="story-family-notes"><summary>家人补写${i('arrow')}</summary>${notes}${replyForm}</details>`
      : `<section class="story-family-notes" aria-label="家人补写"><h2>家人补写</h2>${notes}${replyForm}</section>`;
    return `<section class="house-page section">${questions}${familyNotes}</section>`;
  }
  const membershipRenewalNote = '第二年有新照片和录音想整理时，可以续费。到期后恢复本家的免费额度，超额时暂停新增文件。已有照片、语音和往事仍可按授权回看。';

  function membershipComparison(heading, title, columns, rows, review = false) {
    return `<section class="membership-section" aria-labelledby="${heading}">
      <div class="membership-section-heading">
        <h2 id="${heading}">${title}</h2>${review ? '<span class="membership-review-label">待评审</span>' : ''}
      </div>
      <div class="membership-table-frame"><table class="membership-table" aria-labelledby="${heading}">
        <thead><tr>${columns.map(column => `<th scope="col">${e(column)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(([scenario, free, member]) => `<tr>
          <th scope="row">${e(scenario)}</th><td>${e(free)}</td><td>${e(member)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  function membership() {
    const family = current();
    if (!family) return pricing();
    const active = membershipActive(family);
    const annualPrice = `¥${PLAN.price}`;
    // 日均价按 365 天折算并保留两位小数，确认开通时按现有年费结算。
    const dailyPrice = (PLAN.price / 365).toFixed(2);
    const used = (storage() / 1024 ** 2).toFixed(1);
    const comparison = [
      ['存照片和录音', `${freeCapacity()} GB`, `${PLAN.memberGB} GB`],
      ['录音转成文字', '回听原声', `拟每年 ${PLAN.plannedAudioHours} 小时转写与整理`],
      ['找一段往事', '按家人找', '拟搜索核对后的口述文字']
    ];
    // 拟新增能力单列，评审时可核对功能范围与开放时点。
    const proposals = [
      ['整理旧照片', '上传后自己归类', '批量识别照片背面题字，建议年代和人物'],
      ['收集长辈口述', '手动发照片提问', '按主题定期发题，汇总长辈回复'],
      ['一起修家册', '各自补充往事', '在同一稿件里分工、批注和核对'],
      ['修订家史', '档案本人编辑正文', '查看历史版本并恢复'],
      ['留存原始资料', '在应用内回看', '按人物或主题打包已获授权的原图、原声和文字']
    ];
    const offer = active
      ? `<p class="membership-amount"><strong>${capacity()} GB</strong> 家庭总容量</p>
        <p class="membership-price-term">有效至 ${e(family.membership.end)}</p>`
      : `<p class="membership-amount"><strong>${annualPrice}</strong> ／家／年</p>
        <p class="membership-price-term">折合约 ¥${dailyPrice}／家／天</p>
        <p>一人开通，获授权的家人共享</p>`;
    const footerInfo = active ? '<span>家庭会员已开通</span>' : `<span>全家共享 ${PLAN.memberGB} GB</span>`;
    const footerAction = active
      ? l('查看服务订单' + i('arrow'), 'service-orders', 'membership-action')
      : b('开通家庭会员' + i('arrow'), 'house-checkout', 'membership-action', 'aria-haspopup="dialog"');

    return `<div class="membership-page">
      <div class="membership-content">
        <section class="membership-price-card" aria-label="本家会员状态与价格">
          <p class="membership-status">${e(family.name)} · ${active ? '家庭会员' : '免费家庭'}</p>
          ${P.FamilyJournal.seal()}
          ${offer}
          <p class="membership-storage">当前已用 ${used} MB</p>
        </section>
        ${membershipComparison('membership-comparison-title', '免费与会员有什么不同',
          ['你想做的事', '免费家庭', '家庭会员'], comparison)}
        <div class="membership-notes">
          <p>两种方案均可发照片、邀请家人回语音。</p>
          <p>纸质纪念书、家庭影片可单独选购。</p>
        </div>
        ${membershipComparison('membership-proposals-title', '拟新增权益',
          ['使用场景', '免费做法', '拟新增会员能力'], proposals, true)}
        <div class="membership-details">
          <details><summary>到期与续费</summary><p>${membershipRenewalNote}</p></details>
          ${active ? '' : l('订单与进度' + i('arrow'), 'service-orders', 'membership-orders')}
        </div>
      </div>
      <footer class="membership-footer">${footerInfo}${footerAction}</footer>
    </div>`;
  }
  function entitlementCards(){
    return `<div class="pricing-plans">
      ${card(`免费家庭 · ${freeCapacity()} GB`, '建家、发照片、邀请家人回语音。原声可以从照片下回听，也可按家人找往事。')}
      <section class="card house-card">
        <h2>家庭会员 · ${PLAN.memberGB} GB</h2>
        <p class="pricing-annual-rate">¥${PLAN.price}／家／年</p>
        <p>一位家人开通，获授权的家人共享。拟每年提供 ${PLAN.plannedAudioHours} 小时录音转写与整理，家人核对后可搜索往事。</p>
      </section>
      ${card('到期与续费', membershipRenewalNote)}
    </div>`;
  }
  function pricing(){
    const family=current();
    return page('家庭服务收费', '按家庭计费，会员权益由获授权的家人共享。',
      entitlementCards()+toolbar(jump(family?'查看家庭会员':'免费创建家庭',family?'membership':'house-create',true)), 'billing-plan-page');
  }
  function consultationOnly(key) {
    return key === 'book' || key === 'frame';
  }
  function servicePerson(key, target) {
    return consultationOnly(key) ? P.state.actor : target || P.state.actor;
  }
  function findServiceOrder(key, person) {
    return current()?.orders.find(order => !order.customization && order.key === key && order.person === person);
  }
  function visibleOrder(order) {
    if (order?.customization) return P.Customization.canView(order);
    if (order?.key === 'vr') return false;
    const actor = P.state.actor;
    return Boolean(order && (!order.person || order.person === actor || order.requesters?.includes(actor)));
  }
  function addonOffer(key) {
    if (!Object.hasOwn(services, key)) return null;
    const {title, ask, price} = services[key];
    return {title, ask, price};
  }
  function addonEntry(key, label, {person, returnLabel = '返回原内容', className = 'text-link'} = {}) {
    if (!current() || !Object.hasOwn(services, key)) return '';
    const target = servicePerson(key, person);
    const customization = P.Customization.latest(key, target);
    if (customization) return l('查看定制进度', P.Customization.route(customization), className);
    const existingLabel = key === 'frame' ? `补充${services.frame.title}咨询需求` : '查看' + services[key].title + '咨询';
    const text = visibleOrder(findServiceOrder(key, target)) ? existingLabel : label;
    return b(`<span data-addon-label>${e(text)}</span>`, 'house-addon-open', className,
      `data-id="${e(key)}" data-person="${e(target)}" data-return="${e(returnLabel)}"`);
  }
  function addons() {
    // 传家定制只上架已有介绍页可承接的项目，交付和咨询仍走各自原有流程。
    const frame = P.HouseScreen.offerEntry('house-addons');
    const catalog = [
      ['film', 'house-film-intro//addons', '查看影片介绍', 'assets/family-home/history-service-sample-poster.webp'],
      ['book', 'house-book-intro//addons', '查看纸书介绍', 'assets/zhumen/book-cover-photo.webp'],
      ['frame', frame.route, frame.label, 'assets/family-home/frame-intro/gift.webp']
    ];
    const rows = catalog.map(([key, route, label, image]) => {
      const item = services[key];
      const content = `<img src="${image}" alt="">
        <span><strong>${e(item.title)}</strong><small>${e(item.price)}</small></span>${i('arrow')}`;
      return l(content, route, 'service-catalog-row', `aria-label="${e(item.title + '，' + label)}"`);
    }).join('');
    return page('', `专业制作按项委托，${services.frame.title}按台购买。免费家庭也可单独咨询。`,
      `<div class="service-catalog-list">${rows}</div>`, 'service-catalog-page');
  }

  /** 同一家庭、服务和对象只建一条咨询。替家人咨询只加入经办名单，不改变任何内容授权。 */
  function registerServiceRequest(family, key, person) {
    let order = findServiceOrder(key, person);
    if (!order) {
      const item = services[key];
      order = {id:P.nextId('addon'), person, key, title:item.title, price:item.price, status:'咨询意向已登记'};
      family.orders.push(order);
    }
    if (person !== P.state.actor) order.requesters = [...new Set([...(order.requesters || []), P.state.actor])];
    return order;
  }

  function addonAccess(key, person) {
    return key === 'film' ? filmAccessControls(person) : '';
  }

  function serviceSheetPrice(item) {
    const price = item.amount
      ? `<strong>${e(item.amount)}</strong> <small>${e(item.unit)}</small>`
      : `<b>${e(item.price)}</b>`;
    return `<div class="family-sheet-price"><span>${e(item.priceLabel || '收费方式')}</span>${price}</div>`;
  }

  function showAddon(context) {
    const {key, person, returnLabel} = context;
    const item = services[key];
    const dialog = document.getElementById('addon-modal');
    const access = addonAccess(key, person);
    const receipt = visibleOrder(findServiceOrder(key, person));
    const category = key === 'frame' ? '实物商品' : '单项定制';
    const subject = key === 'film' ? P.PEOPLE[person].name : current().name;
    let title = item.title;
    let contextLine = `${category} · ${subject}`;
    let description = item.summary;
    let note = '';
    let quote = '';
    let action = access;
    // 有可查看的交付或授权提示时优先展示；已登记的咨询只显示回执。
    if (!access && receipt) {
      title = '咨询意向已登记';
      contextLine = `${item.title} · ${subject}`;
      description = item.next;
      note = '模拟咨询 · 本次未产生费用。';
      action = P.state.route === 'service-orders' ? b(e(returnLabel), 'close-modal', 'btn') : jump('订单与进度', 'service-orders');
    } else if (!access) {
      note = '无需会员，收到报价后再决定是否购买。';
      quote = serviceSheetPrice(item);
      action = b(e(item.ask), 'house-addon-register', 'btn', `data-id="${e(key)}"`);
    }
    dialog.addonContext = context;
    P.modal(title, `<p class="family-sheet-summary">${e(description)}</p>${note ? `<p class="family-sheet-note">${e(note)}</p>` : ''}
      <div class="family-sheet-footer">${quote}${action}</div>`, 'sheet', dialog, {eyebrow:contextLine, closeLabel:returnLabel, familySheet:true});
    const firstAction = dialog.querySelector('.family-sheet-footer :is(button, a)') || dialog.querySelector('.modal-header button');
    firstAction.focus({preventScroll:true});
  }

  function openAddon(el) {
    const family = current();
    const key = el.dataset.id;
    if (!family || !Object.hasOwn(services, key)) return;
    const person = servicePerson(key, el.dataset.person);
    if (!memberIds([person]).length) return;
    const returnLabel = el.dataset.return || '返回原内容';
    const allowOther = el.hasAttribute('data-customization-request');
    // 旧相框咨询打开需求表，提交时继续沿用本人已有的服务单。
    if (P.Customization.supports(key) && (key === 'frame' || allowOther || P.Customization.latest(key, person) ||
      (!visibleOrder(findServiceOrder(key, person)) && !addonAccess(key, person)))) {
      const startAtForm = el.hasAttribute('data-customization-direct');
      const item = services[key];
      P.Customization.open({key, item, priceHtml: startAtForm ? '' : serviceSheetPrice(item), person, allowOther, returnLabel, startAtForm});
      return;
    }
    showAddon({family, key, person, actor:P.state.actor, returnLabel, trigger:el});
  }

  function submitAddon(el) {
    const dialog = el.closest('#addon-modal[open]');
    const context = dialog?.addonContext;
    // 家庭、账号和交付状态可能已变化，提交时重新校验，旧弹层不能代替当前家人登记。
    if (!context || context.key !== el.dataset.id || context.family !== current() || context.actor !== P.state.actor ||
        !memberIds([context.person]).length) return;
    if (!addonAccess(context.key, context.person)) {
      registerServiceRequest(context.family, context.key, context.person);
      const label = context.trigger.querySelector('[data-addon-label]');
      if (label) {
        const personal = context.trigger.hasAttribute('data-profile-service');
        label.textContent = personal ? '查看咨询进度' : '查看' + services[context.key].title + '咨询';
        if (personal) context.trigger.setAttribute('aria-label', P.PEOPLE[context.person].name + '的' + services[context.key].title + '，查看咨询进度');
      }
    }
    showAddon(context);
  }
  const ORDER_ICONS = { book: 'book', film: 'play', digital: 'chat', frame: 'screen' };
  const ORDER_GROUPS = { pending: '待我处理', active: '进行中', closed: '已完成及关闭' };

  function serviceOrderCard({key, title, price, status}, controls = '', group = '') {
    const icon = Object.hasOwn(ORDER_ICONS, key) ? ORDER_ICONS[key] : 'source';
    return `<article class="paper-card house-card service-order-card">
      <h3 class="service-order-title">${i(icon)}<span>${e(title)}</span></h3>
      <div class="service-order-footer">
        <div class="service-order-meta">
          ${price ? `<p>${e(price)}</p>` : ''}
          ${status ? `<span class="service-order-status${group === 'pending' ? ' is-pending' : ''}">${e(status)}</span>` : ''}
        </div>
        ${controls}
      </div>
    </article>`;
  }

  function appendServiceOrder(groups, order) {
    if (order.key === 'digital') {
      groups.closed.push(serviceOrderCard({...order, status: '服务已下架'}));
      return;
    }
    if (order.customization) {
      const customization = P.Customization;
      const [status, position] = customization.progress(order);
      // 只有当前账号有确认或付款操作时才进入待办，等待顾问或其他家人时留在进行中。
      let group = 'active';
      if (position === -1 || position === 4) group = 'closed';
      else if (customization.needsAction(order)) group = 'pending';
      const info = {...order, title: customization.listTitle(order), price: order.customization.quote?.price || order.price, status};
      const film = customization.deliveredFilmRoute(order);
      const viewOrder = jump(group === 'pending' ? '去处理' : '查看进度', customization.route(order));
      const controls = film ? toolbar(jump('观看影片', film), viewOrder) : toolbar(viewOrder);
      groups[group].push(serviceOrderCard(info, controls, group));
      return;
    }

    const pending = order.status === '咨询意向已登记';
    const group = pending ? 'active' : 'closed';
    const isFilm = order.key === 'film' && order.person;
    const actor = P.state.actor;
    let title = order.title;
    let controls = '';
    if (isFilm) title += ' · ' + (P.PEOPLE[order.person]?.name || '家人');
    if (order.key === 'frame') title = services.frame.title;
    if (consultationOnly(order.key)) {
      controls = addonEntry(order.key, '查看咨询回执', {returnLabel: '返回订单与进度', className: 'btn secondary full'});
    } else if (pending && order.person === actor) {
      controls = action('模拟顾问交付', 'house-deliver', false, `data-id="${e(order.id)}"`);
    } else if (isFilm) {
      const film = !pending && order.assetId ? P.PersonArchive.getItem(order.assetId) : null;
      const target = film ? 'archive-item/' + e(film.id) : !pending && !order.assetId ? personFilmAccess(order.person)?.route : '';
      const person = memberIds([order.person])[0];
      const intro = person ? 'house-film-intro/' + e(person) + '/personal' : 'house-film-intro//addons';
      controls = target ? jump('观看影片', target) : jump('查看影片介绍', intro);
    }
    groups[group].push(serviceOrderCard({...order, title}, controls ? toolbar(controls) : ''));
  }

  function orders() {
    const family = current();
    if (!family) return empty();
    const groups = {pending: [], active: [], closed: []};
    family.orders.filter(visibleOrder).reverse().forEach(order => appendServiceOrder(groups, order));

    const sections = Object.entries(ORDER_GROUPS).filter(([group]) => groups[group].length).map(([group, label]) => `
      <section class="service-orders-group" aria-labelledby="orders-${group}">
        <div class="section-heading"><h2 id="orders-${group}">${label}</h2></div>
        <div class="service-orders-list">${groups[group].join('')}</div>
      </section>`);
    return `<div class="page house-page service-orders-page">
      <div class="service-orders-heading">
        <p class="service-orders-context">${e(family.name)} · 演示订单</p>
      </div>
      ${sections.length ? sections.join('') : `<section class="paper-card service-order-card service-orders-empty">
        <h2>暂无订单</h2><p>开通家庭会员或提交定制需求后，可在这里查看进度。</p>
      </section>`}
    </div>`;
  }
  function confirmCheckout(f){
    if(!f||membershipActive(f))return;
    const confirm = b('确认模拟开通', 'house-pay', 'btn', `data-id="${e(f.id)}"`);
    P.modal('开通家庭会员', `
      <p class="family-sheet-summary">全家共享 ${PLAN.memberGB} GB 总容量。</p>
      <div class="family-sheet-footer">
        <div class="family-sheet-price"><span>每家每年</span><strong>¥${PLAN.price}</strong></div>${confirm}
      </div>`, 'sheet', undefined, {eyebrow: f.name, closeLabel: '返回家庭会员', familySheet: true});
  }
  /** 现有影片交付和定制验收共用样片归档，本人确认后才加入其私密档案。 */
  function createDemoFilm(person) {
    if (person !== P.state.actor || !memberIds([person]).length) return null;
    const seed = P.ARCHIVE_DATA.assets.find(item => item.kind === 'film');
    if (!seed) return null;
    const asset = {...structuredClone(seed), id:P.nextId('film'), title:'人生故事片 · 交付演示样片',
      subject:person, author:person, viewers:[person], scope:'private', sourceLabel:'虚构人物通用样片'};
    P.PersonArchive.assets(person, 'video');
    P.state.archiveAssets.push(asset);
    P.state.accounts[person].videoDelivered = true;
    return asset;
  }

  function deliver(order){
    const s=P.state,person=order.person;
    if(order.customization||!Object.hasOwn(services,order.key)||consultationOnly(order.key)||order.status!=='咨询意向已登记'||person!==s.actor)return;
    if (order.key === 'film') {
      const film = createDemoFilm(person);
      if (!film) return;
      order.assetId = film.id;
    }
    order.status='已模拟交付';
    P.render();
    P.toast('交付已更新，可打开体验。');
  }

  function handleAction(key,el){
    if (key === 'family-request' && el.closest('#addon-modal')) {
      P.closeAddon();
      return P.FamilyContext.handleAction(key,el);
    }
    if (key === 'close-modal' && el.closest('#addon-modal')) {
      P.closeAddon();
      return true;
    }
    if(key==='video-service'){P.navigate('house-film-intro//addons');return true;}
    if(!key.startsWith('house-'))return false;
    const f=current(),id=el.dataset.id;
    switch(key){
      case 'house-addon-open':openAddon(el);break;
      case 'house-addon-register':submitAddon(el);break;
      case 'house-example':selectHouse(EXAMPLE);break;
      case 'house-switch-open':openHomeSwitcher();break;
      case 'house-switch':chooseFamily(id);break;
      case 'house-member':changeMember(id);break;
      case 'house-story-profile-edit':
        if(f)openStoryProfileEditor(id);
        break;
      case 'house-story-person':
        if(f&&memberIds([id]).length)openStoryList({person:id});
        break;
      case 'house-checkout':confirmCheckout(f);break;
      case 'house-pay':{
        if(!f||f.id!==id||membershipActive(f))break;
        const start=P.state.billingToday;
        f.membership={start,end:P.Billing.shift(start,1)};
        f.orders.push({title:'家庭会员 · 一年',price:'¥'+PLAN.price,status:'模拟已开通'});
        P.closeModal();
        P.render();
        P.toast('家庭会员已模拟开通。');
        break;
      }
      case 'house-deliver':{
        const order=f?.orders.find(item=>item.id===id);
        if(order)deliver(order);
        break;
      }
    }
    return true;
  }
  function submit(element){
    if(element.id==='story-person-edit-form'){
      saveStoryProfile(element);
      return true;
    }
    if(!['house-create-form','house-reply-form'].includes(element.id))return false;
    const data=new FormData(element),value=name=>String(data.get(name)||'').trim(),f=current();
    if(element.id==='house-create-form'){
      const name=value('name'),person=value('person'),submitButton=element.querySelector('button[type="submit"]');
      if(submitButton.disabled)return true;
      if(!name||!person){P.toast('请填写家庭名称和你的称呼。');return true;}
      submitButton.disabled=true;
      const id='home-'+(++registry.nextFamily);
      const accountLinks = f ? {father: accountKey(f, P.state.actor)} : undefined;
      registry.families.push({id,name,people:{father:{name:person,short:person.slice(0,1),relation:'家庭管理人',color:'sand'}},
        accountLinks,workspace:P.initialState(false),orders:[],membership:null,freeGB:PLAN.freeGB});
      selectHouse(id);
      return true;
    }
    if(!f)return true;
    if(element.id==='house-reply-form'){
      const story=P.visibleStories().find(item=>item.id===value('story'));
      if(story&&story.scope!=='private'&&value('text')){
        (story.replies ||= []).push({author:P.state.actor,text:value('text')});
        P.render();P.toast('已补写到同一件往事。');
      }
    }
    return true;
  }
  /** 关联人物和访问名单分开保存，只有分享范围决定访问权限。 */
  function createStoryDraft({title,text,quote,photoUrl,bytes,photoToken,photoYear,moment=false,houseVoice,eventDate,dateLabel,babyMilestone=false,lifeMilestone=false,
    relatedMembers=[],scope='family',viewers=scope==='family'?[...P.state.members]:[]}){
    const id=P.nextId('family-story'),actor=P.state.actor,now=new Date(),year=(eventDate||dateLabel)?.slice(0,4)||String(now.getFullYear());
    const happened=eventDate?new Date(eventDate+'T00:00:00'):now;
    const date=dateLabel||(moment?happened.toLocaleDateString('zh-CN',{dateStyle:'long'}):year+'年');
    const source=moment?'家人随手记录':photoToken?'家人分享的照片':'家庭成员文字记录';
    const category=babyMilestone?'宝宝成长':lifeMilestone?'人生节点':'共同回忆';
    return {id,title,text,quote,author:actor,subject:actor,photoToken,photoYear,moment,houseVoice,eventDate,babyMilestone,lifeMilestone,
      scope,viewers,relatedMembers:memberIds(relatedMembers),fromFamily:true,confirmedBy:actor,category,houseImage:photoUrl,houseBytes:bytes,
      year,date,recorded:now.toLocaleDateString('zh-CN'),recordedAt:now.getTime(),source,duration:photoToken?'照片':houseVoice?'语音':'文字记录'};
  }
  function validSharedPhoto(file) {
    return file.size > 0 && file.size <= SHARED_PHOTO_MAX_BYTES && SHARED_PHOTO_TYPES.includes(file.type);
  }
  /** 头像只存于本次原型会话，使用共享账号编号衔接换家，读图完成后重验当前身份。 */
  async function updateProfileAvatar(input) {
    const file = input.files[0];
    const family = current();
    const workspace = P.state;
    const actor = workspace.actor;
    if (!file || !family || input.disabled || workspace.route !== 'profile' ||
        !workspace.members.includes(actor) || !Object.hasOwn(workspace.accounts, actor)) return;
    input.value = '';
    if (!validSharedPhoto(file)) {
      P.toast('请选择 20 MB 内的 JPG、PNG、WebP 或 GIF 照片。');
      return;
    }

    const isCurrent = () => input.isConnected && current() === family && P.state === workspace && workspace.actor === actor;
    const restoreFocus = input.matches(':focus-visible');
    input.disabled = true;
    let source = '';
    let saved = false;
    try {
      source = URL.createObjectURL(file);
      const image = new Image();
      image.src = source;
      await image.decode();
      if (!isCurrent()) return;
      const key = accountKey(family, actor);
      const previous = registry.profileAvatars.get(key);
      registry.profileAvatars.set(key, source);
      if (previous) URL.revokeObjectURL(previous);
      saved = true;
    } catch {
      if (isCurrent()) P.toast('头像图片无法读取，请重新选择。');
    } finally {
      input.disabled = false;
      if (!saved && source) URL.revokeObjectURL(source);
    }
    if (saved) {
      P.render();
      if (restoreFocus) document.getElementById(input.id)?.focus({preventScroll: true});
      P.toast('头像已更新。');
    }
  }
  function saveCoverPhotos(photos) {
    // 封面按上传时间倒序读取，倒序保存本批照片，让先选的一张先显示。
    const stories = [...photos].reverse().map(photo => ({ ...createStoryDraft(photo), homeCover: true }));
    P.state.stories.push(...stories);
    P.state.homeCoverIndex = 0;
  }
  /** 全家福属于当前家庭共享记录，整批校验通过后才写入轮播。 */
  async function uploadCoverPhotos(files, signal) {
    const workspace = P.state;
    const actor = workspace.actor;
    if (!files.length || !current() || !workspace.members.includes(actor)) return false;
    if (!files.every(validSharedPhoto)) {
      P.toast('请选择 20 MB 内的 JPG、PNG、WebP 或 GIF 照片。');
      return false;
    }
    const bytes = files.reduce((total, file) => total + file.size, 0);
    if (!canUpload(bytes)) {
      P.toast('当前家庭空间不足，请减少照片后重试。');
      return false;
    }
    const photos = [];
    let saved = false;
    try {
      for (const file of files) {
        const photoUrl = URL.createObjectURL(file);
        photos.push({ title: '全家福', text: [], quote: '', photoUrl, bytes: file.size });
        const image = new Image();
        image.src = photoUrl;
        await image.decode();
        if (signal.aborted || P.state !== workspace || workspace.actor !== actor) return false;
      }
      // 读图期间其他上传可能占用空间，提交前按当前余额再校验一次。
      if (!canUpload(bytes)) {
        P.toast('当前家庭空间不足，请减少照片后重试。');
        return false;
      }
      saveCoverPhotos(photos);
      saved = true;
      return true;
    } catch {
      if (!signal.aborted) P.toast('有照片无法读取，请重新选择。');
      return false;
    } finally {
      if (!saved) photos.forEach(photo => URL.revokeObjectURL(photo.photoUrl));
    }
  }
  function saveStory(options){
    const story=createStoryDraft(options);
    P.state.stories.push(story);
    P.navigate('story/'+story.id+(options.diary?'/diary':''),{replace:options.replaceComposer??Boolean(options.diary)});
  }
  function memberOptions(){
    return current()&&!isExample()?Object.keys(P.state.accounts).map(id=>({id,name:P.PEOPLE[id].name,selected:id===P.state.actor})):null;
  }
  function changeMember(id){
    if(!current()||!P.state.accounts[id])return false;
    P.changeActor(id);
    return true;
  }
  const oldHome=P.views.home;
  P.views.home=()=>current()?oldHome():empty();
  P.views.welcome=empty;
  Object.assign(P.views,{
    'house-create':create,'house-switch':switcher,'house-add':addRecord,'house-story':P.views.story,'house-stories':sharedStories,
    'house-moment':()=>P.FamilyMoment.view(memberIds([registry.routeId])),
    'house-addons':addons,
    membership,'billing-plan':pricing,'service-orders':orders
  });
  P.BillingViews.profileSummary=()=>l(`${i('star')}<span><strong>家庭会员</strong><small>${membershipActive()?'已开通':'查看共享权益'}</small></span>${i('arrow')}`,
    'membership','profile-shortcut profile-service-summary');
  // 捕获阶段拦下外部操作。按下时阻止原生控件提前响应，点击完成时才收起名单。
  function dismissStoryMemberPicker(event) {
    const picker = document.querySelector('#house-story-member[open]');
    if (!picker || picker.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'click') {
      picker.open = false;
      picker.querySelector('summary').focus({ preventScroll: true });
    }
  }
  document.addEventListener('pointerdown', dismissStoryMemberPicker, { capture: true });
  document.addEventListener('click', dismissStoryMemberPicker, { capture: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const picker = event.target.closest('#house-story-member[open]');
    if (!picker) return;
    event.preventDefault();
    picker.open = false;
    picker.querySelector('summary').focus();
  });
  document.addEventListener('change',event=>{
    const input=event.target,f=current();
    if (input.id === 'profile-avatar-file') {
      void updateProfileAvatar(input);
    } else if(input.matches('[data-record-audience]')){
      input.form.querySelector('[data-record-viewers]').hidden=input.value!=='selected';
    }else if(f&&input.id==='house-story-order'){
      f.storyOrder=input.value==='photo-year'?'photo-year':'recent';
      P.render();
    }
  });
  P.Households={titles,isExample,current,families,familyDisplayName,familyRole,profileAvatar,homeSwitcher,membershipActive,capacity,storage,canUpload,memberOptions,changeMember,replyPanel,handleAction,submit,saveStory,sharedFamilyEntries,reset,addonOffer,addonEntry,storyPersonServices,filmAccessControls,createDemoFilm,
    createStoryDraft,uploadCoverPhotos,sharedPhotoAccept:SHARED_PHOTO_ACCEPT,memberIds,memberFields,relatedMemberIds,relatedMemberNames,audienceFields,recordAudience,openStoryList,storyListPhotos,profileEntries,
    canRoute:name=>Boolean(current()&&Object.hasOwn(P.views,name))||['home','welcome','house-create','house-switch','billing-plan','house-addons','house-assistant','house-picks','house-screen-intro'].includes(name),
    activateExample:()=>activate(EXAMPLE),
    setRoute:(_route,id,detail,view)=>{registry.routeId=id||'';registry.routeDetail=detail||'';registry.routeView=view||'';},
    fallback:route=>({'house-create':'house-switch','house-switch':'profile','house-add':'house-stories','house-moment':'house-stories','house-story':'house-stories','house-stories':'home',
      'house-addons':'profile','service-order':'service-orders'})[route],
    status:()=>{const f=current();return f?{名称:f.name,身份:P.PEOPLE[P.state.actor]?.name,
      往事:P.state.stories.filter(story=>!story.coupleId).length+P.visibleStories().filter(story=>story.coupleId).length,容量:capacity()}:null;}
  };
}
