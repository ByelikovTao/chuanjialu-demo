/** 家庭切换、家庭会员与单项交付。原有业务页直接使用当前家庭工作区。 */
'use strict';
{
  const P=window.App,{escape:e,icon:i,link:l,button:b}=P;
  const PLAN = {
    price: 249,
    freeGB: 1,
    legacyFreeGB: 2,
    memberGB: 20,
    books: 2,
    storyLimit: 30,
    plannedAudioHours: 8
  };
  const EXAMPLE='example', exampleName=P.HOME_NAME;
  const services={
    film:{title:'AI 人生故事片',summary:'顾问上门采集口述和老照片，确认主角小样，再交付成片。',price:'15,000 元／位',route:'film-delivery'},
    digital:{title:'数字人创建',summary:'用本人授权的资料创建互动数字人，家人可在授权范围内提问并回看引用来源。',price:'按人物与制作范围报价',route:'chat'},
    vr:{title:'VR 房间建模',summary:'将房间、老宅或家庭纪念空间做成可漫游的三维场景，家人可在授权范围内查看物件和故事。',price:'按空间和采集范围报价',route:'space'}
  };
  const titles={'house-create':'创建家庭','house-switch':'创建或切换家庭','house-add':'添加记录','house-record':'记录一件往事','house-story':'家庭往事','house-moment':'记一刻',
    'house-stories':'记录','house-baby':'宝宝成长','house-elders':'爸妈的日子','house-couple':'两个人的日子','house-couple-setup':'伴侣邀请',
    'house-book':'家庭故事册','house-book-preview':'故事册预览','house-book-saved':'已保存故事册','house-addons':'独立增值服务','house-service':'服务详情'};
  const RECORD_SCOPES={private:'仅自己',selected:'指定家人',family:'当前家庭成员'};
  const STORY_PROFILE_LIMITS = { name: 24, intro: 600, hometown: 48, education: 1200, work: 1200 };
  const STORY_CATEGORIES={
    photo:{label:'照片',kind:'photo',unit:'张'},
    video:{label:'视频',kind:'clip',unit:'段',preview:2},
    work:{label:'作品',kind:'work',unit:'件',preview:2}
  };

  function newRegistry(){
    const start=new URLSearchParams(location.search).get('start');
    const example={id:EXAMPLE,name:'陈家示例',workspace:P.state,people:{...P.PEOPLE},orders:[],books:[],
      membership:null,freeGB:PLAN.freeGB};
    return {active:start==='new'?'':EXAMPLE,example,families:[],nextFamily:0,routeId:'',routeDetail:''};
  }
  let registry=newRegistry();

  function current(){return registry.active===EXAMPLE?registry.example:registry.families.find(item=>item.id===registry.active);}
  function families(){return [...registry.families,registry.example];}
  function isExample(){return registry.active===EXAMPLE;}
  function isOwner(){return P.state.actor==='father';}
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
  function activeBooks(f){return f.books.filter(book=>book.period===f.membership?.start);}
  function canUpload(bytes,excluding=''){return storage(excluding)+bytes<=capacity()*1024**3;}
  function canUseSpace(){return P.FamilyContext.allowed('father','space');}
  function jump(label,route,primary=false){return l(label,route,primary?'btn full':'btn secondary full');}
  function action(label,key,primary=false,attrs=''){return b(label,key,primary?'btn full':'btn secondary full',attrs);}
  function toolbar(...items){return `<div class="house-actions section">${items.join('')}</div>`;}
  function page(title,note,body,extra=''){
    return `<div class="page house-page ${extra}"><h1 class="page-title">${title}</h1><p class="page-subtitle">${note}</p>${body}</div>`;
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
      toolbar(jump('免费创建家庭','house-create',true),action('进入陈家示例','house-example')));
  }
  function create(){
    return page('创建我的家庭','填好家庭名称和称呼，就可以发第一张老照片。',
      form('house-create-form',field('家庭名称','name','例如 陈家')+field('你的称呼','person','例如 知夏'),'免费创建家庭'));
  }
  function switcher(){
    return page('我的家庭','每个家的家谱、档案、往事和权益分别管理。',
      toolbar(jump('创建新家庭','house-create',true))+families().map(f=>
        card(e(f.name),f.id===EXAMPLE?'完整功能示例':membershipActive(f)?'家庭会员':'免费家庭',
          toolbar(action('进入'+e(f.name),'house-switch',false,`data-id="${f.id}"`)))).join(''));
  }
  function captureBeforeSwitch(){
    if(!P.render)return;
    P.captureInputs();
    P.MemorySpace.unmount();
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
      source.people={...P.PEOPLE};
      for(const person of Object.keys(P.PEOPLE))delete P.PEOPLE[person];
      Object.assign(P.PEOPLE,target.people);
      P.state=target.workspace;
      P.HOME_NAME=id===EXAMPLE?exampleName:target.name;
    }
    registry.active=id;
    return true;
  }
  function selectHouse(id,route='home'){
    if(!activate(id))return;
    P.navigate(route);
    P.state.history=[];
  }
  function reset(){
    captureBeforeSwitch();
    P.HouseScreen.reset();
    void P.PhotoStories.endSession({ reset: true });
    for(const f of [registry.example,...registry.families]){
      for(const story of f.workspace.stories){
        if(story.houseImage?.startsWith('blob:'))URL.revokeObjectURL(story.houseImage);
        if(story.houseVoice?.url)URL.revokeObjectURL(story.houseVoice.url);
      }
    }
    P.state=P.resetDemoState();
    P.HOME_NAME=exampleName;
    registry=newRegistry();
  }

  // 联调时只恢复照片往事和它所属的家庭身份。旧版资料和付费等演示状态继续按原来的方式初始化。
  const photoWorkspaceFields=['actor','idSequence','accounts','members','invitations','familyAccess','familyInvitations','familyFocus'];
  function photoWorkspace() {
    const snapshot=family=>{
      const state=Object.fromEntries(photoWorkspaceFields.map(key=>[key,family.workspace[key]]));
      state.stories=family.workspace.stories.filter(story=>story.photoToken).map(story=>({...story,houseImage:'',houseVoice:undefined}));
      return {id:family.id,name:family.name,people:family.workspace===P.state?P.PEOPLE:family.people,
        freeGB:family.freeGB,state};
    };
    return {active:registry.active,nextFamily:registry.nextFamily,example:snapshot(registry.example),families:registry.families.map(snapshot)};
  }
  function restorePhotoWorkspace(snapshot,samplePhoto){
    if(!snapshot?.example?.state||!Array.isArray(snapshot.families))return;
    const restore=(family,workspace)=>{
      const stories=new Map(workspace.stories.map(story=>[story.id,story]));
      for(const key of photoWorkspaceFields)workspace[key]=family.state[key];
      // 示例也可收到回话，恢复时按往事编号合并，保留原来那一条及其示例照片。
      for(const story of family.state.stories){
        const seed=stories.get(story.id);
        stories.set(story.id,{...seed,...story,houseImage:seed?.houseImage||(story.houseBytes?'':samplePhoto)});
      }
      workspace.stories=[...stories.values()];
      // 试点前的快照未保存免费额度，恢复时沿用原有的 2 GB。
      return {id:family.id,name:family.name,workspace,people:family.people,orders:[],books:[],
        membership:null,freeGB:family.freeGB??PLAN.legacyFreeGB};
    };
    const example=restore(snapshot.example,registry.example.workspace);
    // 旧联调快照没有示例宝宝的生日，保留已有修改并补齐新增的示例字段。
    example.people.nian={...registry.example.people.nian,...example.people.nian};
    const families=snapshot.families.map(family=>restore(family,P.initialState(false)));
    registry.example=example;
    registry.families=families;
    registry.nextFamily=snapshot.nextFamily;
    // 示例工作区可能还没有发生切换，其人物表也要与保存的身份对应。
    for(const person of Object.keys(P.PEOPLE))delete P.PEOPLE[person];
    Object.assign(P.PEOPLE,example.people);
    if(snapshot.active)activate(snapshot.active);
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
  function memberFields(selected=[],fixed=''){
    return `<fieldset class="record-members"><legend>关联家人（选填）</legend>
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
  function openStoryList(filters){
    const family=current();
    if(family)family.storyOrder='recent';
    P.navigate(storyListRoute(filters));
  }
  function fromStoryList(){
    return ['house-stories','house-baby','house-elders'].includes(P.state.history?.at(-1)?.split('/')[0]);
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
        ${l(option('edit','往事','写几句话，记下一件家里的事'),'house-record'+suffix,'menu-row')}</div>
      ${l('发张老照片，请家人说两句','house-record/photo'+suffix,'btn secondary full section')}`);
  }
  function sharedRecord(){
    const family=current();
    if(!family)return empty();
    if(registry.routeId==='photo'){
      const first=!isExample()&&!P.state.stories.some(story=>story.photoToken);
      const title=first?'发第一张老照片':'给老照片添句话';
      const note=first?'选一张家里的老照片，发给家人，请他们说说照片背后的故事。':'选一张照片，问家人一件想知道的事。';
      return page(title,note,P.PhotoStories.composer({first,relatedMembers:memberIds([registry.routeDetail])}));
    }
    return page('留下一件家里的事',`保存到 ${e(family.name)} · 写下你记得的细节。`,
      form('house-record-form',field('往事标题','title','例如 院子里的合照',48)+
        '<label class="form-field"><span>写下你记得的事</span><textarea name="text" maxlength="5000" rows="5" required></textarea></label>'+
        '<label class="form-field"><span>选一张照片（可选）</span><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>'+
        memberFields(memberIds([registry.routeId]))+audienceFields('house-record-scope')+
        '<p class="caption">分享按保存时选定的家人开放。</p>','保存往事')+
      toolbar(jump('录音或补写家人的经历','record')));
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
  function recordRows(entries,{showRelated=false,activity=false}={}){
    const labels={photo:['photo','照片'],clip:['play','视频'],work:['book','作品'],story:['edit','往事']};
    const activityLabels={photo:'分享了照片',clip:'分享了视频',work:'分享了作品',story:'记录了往事'};
    return entries.map(({item,kind,material})=>{
      const [icon,label]=kind==='story'&&item.houseVoice?['mic','语音']:labels[kind];
      const cover=item.houseImage||(material&&(!activity||item.kind!=='clip')?item.poster:'');
      const thumb=cover?`<img src="${e(cover)}" alt="" loading="lazy">`:i(icon);
      const name=e(item.authorName||P.PEOPLE[item.author]?.name||'家人');
      const replies=!activity&&!material&&(showRelated||item.photoToken)?P.PhotoStories.countLabel(item):'';
      const notice=material?'':P.QuestionInbox.storyNotice(item);
      const related=showRelated?relatedMemberNames(item):'';
      const scope=!activity&&!item.coupleId&&['private','selected'].includes(item.scope)?RECORD_SCOPES[item.scope]:'';
      const route=(material?'archive-item/':'story/')+e(item.id);
      const recorded = activity && (item.recorded || item.date);
      const meta = activity
        ? `${name} · ${item.babyMilestone ? '记录了成长里程碑' : item.houseVoice ? '留下了语音' : activityLabels[kind]}${recorded ? ' · ' + e(recorded) : ''}`
        : [item.babyMilestone?'成长里程碑':label,name,e(item.recorded||item.date||''),scope,replies].filter(Boolean).join(' · ')+notice;
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
  function recentRecords(limit) {
    return recordRows(sharedFamilyEntries().slice(0, limit), {activity:true});
  }
  /** 首页相册复用共享记录的权限。保留近期顺序，首屏最多提前一段可播放的视频。 */
  function recentAlbum(limit) {
    const entries = sharedFamilyEntries().filter(({ item, kind, material }) =>
      (kind === 'photo' && (material ? item.poster : item.houseImage)) || (kind === 'clip' && item.src));
    const firstVideo = entries.findIndex(({ kind }) => kind === 'clip');
    if (firstVideo > 2) {
      const [video] = entries.splice(firstVideo, 1);
      entries.splice(2, 0, video);
    }
    return entries.slice(0, limit).map(albumEntry);
  }
  function albumEntry({ item, kind, material }) {
    return {
      title: item.title,
      kind,
      cover: material ? (kind === 'clip' && item.materialManaged ? '' : item.poster) : item.houseImage,
      photoId: !material && item.photoToken && item.houseBytes ? item.id : '',
      route: `${material ? 'archive-item' : 'story'}/${item.id}`
    };
  }
  function storyCards(entries,person,preview=false){
    const cards=entries.map(({item,kind,material})=>{
      if(material)return P.PersonArchive.familyCard(item,person);
      const related=relatedMemberNames(item);
      const author=item.authorName||P.PEOPLE[item.author]?.name||'家人';
      const replies=` · ${P.PhotoStories.countLabel(item)}`;
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
  /** 家庭档案和首页复用共享范围，私密记录由本人在个人档案回看。 */
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
  /** 从往事打开相册时，翻页继续使用原入口的共享范围或所选家人。 */
  function storyListPhotos(){
    if(!fromStoryList())return null;
    const [route,id='',detail='',view='']=P.state.history.at(-1).split('/');
    if(route!=='house-stories')return P.FamilyEditions.listPhotos(route,id);
    const filters=storyFilters(id,detail,view);
    const photos=filteredStories(filters).filter(({kind,material})=>kind==='photo'&&material);
    if(filters.section==='photo'&&current()?.storyOrder==='photo-year'){
      photos.sort((left,right)=>storyPhotoYear(right)-storyPhotoYear(left));
    }
    return photos.map(({item})=>item);
  }
  function storyArchiveHeading(person){
    return `<div class="story-archive-heading">
      <div class="story-archive-intro">
        <div class="story-archive-identity story-person-identity">
          ${P.avatar(person)}
          <div class="story-person-name">
            <h2 class="story-archive-title">${e(P.PEOPLE[person].name)}</h2>
            <p class="story-archive-meta">个人档案</p>
          </div>
        </div>
        ${l(i('plus')+' 添加记录','house-add/'+e(person),'btn compact story-archive-add')}
      </div>
    </div>`;
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
          <label class="form-field"><span>姓名</span><input name="name" value="${e(member.name)}" maxlength="${limits.name}" required></label>
          <div class="story-person-editor-pair">
            <label class="form-field"><span>生日</span><input type="date" name="birthday" value="${e(birthday)}"
              min="1900-01-01" max="${P.FamilyEditions.today()}"></label>
            <label class="form-field"><span>籍贯</span><input name="hometown" value="${e(details?.hometown || '')}"
              maxlength="${limits.hometown}" placeholder="例如 贵州贵阳"></label>
          </div>
          <label class="form-field"><span>个人简介</span><textarea name="intro" rows="3" maxlength="${limits.intro}">${e(intro)}</textarea></label>
        </section>
        <section class="story-person-editor-section" aria-labelledby="story-person-experience-fields">
          <h3 id="story-person-experience-fields">人生经历</h3>
          <label class="form-field"><span>求学经历</span><textarea name="education" rows="3" maxlength="${limits.education}"
            placeholder="可写年份、学校和专业，多段可分行">${e(details?.education || '')}</textarea></label>
          <label class="form-field"><span>工作经历</span><textarea name="work" rows="3" maxlength="${limits.work}"
            placeholder="可写年份、单位和岗位，多段可分行">${e(details?.work || '')}</textarea></label>
        </section>
      </div>
      <footer class="story-person-editor-footer">
        <p class="modal-error" data-story-profile-error role="alert" hidden></p>
        ${b('取消', 'close-modal', 'btn secondary')}
        <button type="submit" class="btn">保存资料</button>
      </footer>
    </form>`, 'sheet');
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

  /** 播放和对话始终检查对应人物的交付与授权，未开放的服务只进入该人物的服务说明。 */
  function personServiceAccess(key, person) {
    if (key === 'film') {
      const film = P.PersonArchive.videos(person, 'film')[0];
      return film ? { route: 'archive-item/' + film.id, label: '观看纪录片' } : null;
    }
    return P.ContentChat.available(person) ? { route: 'chat/' + person, label: '进入数字人' } : null;
  }

  function personServiceDelivered(key, person) {
    const account = P.state.accounts[person];
    return Boolean(key === 'film' ? account?.videoDelivered : account?.hasDigital);
  }

  function storyPersonServices(person) {
    const entries = [
      ['film', 'play', 'AI 纪录片', '观看'],
      ['digital', 'mic', '数字人', '对话']
    ].map(([key, icon, title, readyLabel]) => {
      const access = personServiceAccess(key, person);
      const label = access ? readyLabel : personServiceDelivered(key, person) ? '查看权限' : '了解制作';
      const route = access?.route || `house-service/${key}/${person}`;
      return l(`${i(icon)}<strong class="story-person-service-title">${title}</strong>
        <span class="story-person-service-action">${label}${i('arrow')}</span>`,
        e(route), 'story-person-service', `data-profile-service="${key}" aria-label="${e(P.PEOPLE[person].name + '的' + title + '，' + label)}"`);
    }).join('');
    return `<div id="story-person-services" class="story-person-service-list" role="group" aria-label="增值服务">${entries}</div>`;
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
    const birth = birthday
      ? `<time datetime="${e(birthday.iso)}">${birthday.year} 年 ${birthday.month} 月 ${birthday.day} 日</time>`
      : '待补充';
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
    const written = [['求学经历', details?.education], ['工作经历', details?.work]]
      .filter(([, text]) => text)
      .map(([label, text]) => `<div><h3>${label}</h3><p>${e(text)}</p></div>`).join('');
    const edit = canEditStoryProfile(person) ? b(i('edit') + ' 编辑资料', 'house-story-profile-edit',
      'story-person-action story-person-edit', `data-id="${e(person)}"`) : '';
    const add = l(i('plus') + ' 添加记录', 'house-add/' + e(person), 'story-person-action story-person-add story-archive-add');
    return `<section class="story-person-card" aria-labelledby="story-person-title">
      <header class="story-person-card-header">
        <div class="story-person-identity">
          ${P.avatar(person)}
          <div class="story-person-name">
            <p class="story-archive-meta">个人档案</p>
            <h2 id="story-person-title" class="story-archive-title">${e(member.name)}</h2>
          </div>
        </div>
        <div class="story-person-actions">${edit}${add}</div>
      </header>
      ${storyPersonServices(person)}
      <div class="story-person-summary">
        <dl class="story-person-facts">
          <div><dt>生日</dt><dd>${birth}</dd></div>
          <div><dt>籍贯</dt><dd>${e(details?.hometown || (canReadDetails ? '待补充' : '暂无可查看'))}</dd></div>
          <div><dt>与我的关系</dt><dd>${e(P.relation(person))}</dd></div>
        </dl>
        <h3 id="story-person-intro">个人简介</h3>
        <p>${e(intro || '暂无可查看的简介。')}</p>
      </div>
    </section>
    <section class="story-archive-section" aria-labelledby="story-person-experiences">
      <div class="story-archive-section-heading"><h2 id="story-person-experiences">人生经历</h2></div>
      ${written ? `<div class="story-person-summary story-person-written">${written}</div>` : ''}
      ${timeline ? `<ol class="story-person-timeline">${timeline}</ol>` : ''}
      ${!written && !timeline ? '<p class="story-person-summary">暂无可查看的人生经历。</p>' : ''}
    </section>`;
  }
  function storyArchivePicker({family,person}) {
    // 家庭记录固定在首项。家人称呼以登录者为视角，切换档案只改变浏览对象。
    const options = [{label: '家庭全部记录', route: 'house-stories', active: family}, ...memberIds().map(id => ({
      label: `${P.PEOPLE[id].name}（${P.relation(id)}）`,
      route: storyListRoute({person: id}),
      active: id === person
    }))];
    const selected = options.find(option => option.active) || options[0];
    const rows = options.map(option => {
      const label = e(option.label);
      const item = option === selected
        ? `<span class="story-archive-member-option" aria-current="true">${label}${i('check')}</span>`
        : l(label, option.route, 'story-archive-member-option');
      return `<li>${item}</li>`;
    }).join('');
    const currentLabel = e(selected.label);
    return `<details id="house-story-member" class="story-archive-member">
      <summary aria-label="切换档案，当前为${currentLabel}">
        ${i('family')}<span>${currentLabel}</span>${i('down')}
      </summary>
      <div class="story-archive-member-popover">
        <ul aria-label="可切换的档案">${rows}</ul>
      </div>
    </details>`;
  }
  function storySectionHeading(title,action=''){
    return `<div class="story-archive-section-heading"><h2>${title}</h2>${action}</div>`;
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
  function storyOverview(entries,categories,filters){
    const recentRoute=storyListRoute({...filters,section:'recent'});
    const latest=entries.slice(0,3);
    const recent=`<section class="story-archive-section">
      ${storySectionHeading('最近记录',latest.length?l('查看全部 '+i('arrow'),recentRoute,'text-link story-archive-link','aria-label="查看全部最近记录"'):'')}
      ${latest.length?`<div class="story-archive-list">${recordRows(latest)}</div>`:storyArchiveEmpty(filters)}
    </section>`;
    const previews=categories.map(([id,{label,unit,preview},records])=>{
      const photos=id==='photo';
      // 照片条复用首页的滚动行为，使用完整的当前可见照片集合。
      const list=photos?records:records.filter(entry=>!latest.includes(entry)).slice(0,preview);
      if(!list.length)return '';
      const route=storyListRoute({...filters,section:id});
      const cards=photos?P.FamilyHomeViews.albumTrack(list.map(albumEntry),
        filters.family?'family-photo-track':'profile-photo-track',`${filters.family?'家庭':'个人'}档案照片`)
        : id==='video'?storyCards(list,filters.person,true)
        :`<div class="story-archive-list">${recordRows(list)}</div>`;
      return `<section class="story-archive-section" data-archive-preview="${id}">
        ${storySectionHeading(label,l(`${records.length} ${unit} ${i('arrow')}`,route,'text-link story-archive-link',
          `aria-label="查看全部${label}"`))}
        ${cards}
      </section>`;
    }).join('');
    return {recent,previews};
  }
  function sharedStories(){
    const family=current();if(!family)return empty();
    const filters=storyFilters();
    const {person,section}=filters;
    const overview=section==='overview';
    const familyOverview=overview&&filters.family;
    const entries=filteredStories(filters);
    const categories=Object.entries(STORY_CATEGORIES).map(([id,category])=>
      [id,category,entries.filter(entry=>entry.kind===category.kind)]);
    const tabs=[['overview',filters.family?'总览':'简介'],...categories.map(([id,{label}])=>[id,label])].map(([id,label])=>
      l(label,storyListRoute({...filters,section:id}),'',id===section?'aria-current="page"':'')).join('');
    const categoryNav=`<nav class="story-archive-tabs${filters.family?'':' story-person-tabs'}" aria-label="档案分类">${tabs}</nav>`;
    const topics=familyOverview?`<section class="story-archive-section">
      ${storySectionHeading('专题相册')}${P.FamilyEditions.entrances()}
    </section>`:'';
    const noRecords=storyArchiveEmpty(filters);
    let body;
    if(section==='recent'){
      body=`<section class="story-archive-section">
        ${storySectionHeading('最近记录',`<span class="story-archive-meta">${entries.length} 条</span>`)}
        ${entries.length?`<div class="story-archive-list">${recordRows(entries,{showRelated:true})}</div>`:noRecords}
      </section>`;
    }else if(overview){
      const {recent,previews}=storyOverview(entries,categories,filters);
      body=familyOverview?recent+topics+categoryNav+previews:entries.length?recent+previews:noRecords;
    }else{
      const [,{label,unit},records]=categories.find(([id])=>id===section);
      const byYear=family.storyOrder==='photo-year';
      const order=section==='photo'&&records.length?`<select id="house-story-order" aria-label="照片排列方式">
        <option value="recent" ${!byYear?'selected':''}>最近记录</option><option value="photo-year" ${byYear?'selected':''}>按照片年代</option>
      </select>`:'';
      body=`<section class="story-archive-section">
        ${storySectionHeading(`${label} <small class="story-archive-meta">${records.length} ${unit}</small>`,order)}
        ${section==='work'?'<p class="caption">家书、作文、手稿和书画照片都可以保存在这里。</p>':''}
        ${records.length?(section==='photo'&&byYear?photoYears(records,person):storyCards(records,person)):noRecords}
      </section>`;
    }
    return `<div class="page house-page family-story-page">
      ${storyArchivePicker(filters)}
      ${familyOverview?'':categoryNav}
      ${person?(overview?storyPersonOverview(person):storyArchiveHeading(person)):''}
      <div class="archive-content" data-archive-tab="${section}">${body}</div>
      ${familyOverview?`<nav class="story-archive-tools" aria-label="整理家庭档案">
        ${l(i('book')+' 家庭故事册 '+i('arrow'),'house-book','story-archive-tool')}
        ${l(i('family')+' 共同回忆与故事集 '+i('arrow'),'common-memories','story-archive-tool')}
      </nav>`:''}
    </div>`;
  }
  function replyPanel(story){
    const questions=P.QuestionInbox.storyPanel(story);
    if(story.scope==='private')return questions;
    const notes=(story.replies||[]).map(reply=>card(e(P.PEOPLE[reply.author]?.name||'家人'),e(reply.text))).join('')+
      form('house-reply-form',`<input type="hidden" name="story" value="${e(story.id)}"><label class="form-field"><span>我记得…</span><textarea name="text" rows="3" maxlength="800" required></textarea></label><p class="caption">能看原往事的家人也能看你的补写。</p>`,'补充这段往事');
    const familyNotes=story.photoToken?`<details class="card section"><summary>家人补写</summary>${notes}</details>`:'<h2>家人补写</h2>'+notes;
    return `<section class="house-page section">${questions}${familyNotes}</section>`;
  }
  function bookCandidates(){
    return P.visibleStories().filter(story=>story.scope==='family'&&P.state.members.every(id=>story.viewers.includes(id)&&
      (id===story.author||!P.state.familyAccess[story.subject]||P.state.familyAccess[story.subject].archive.includes(id)||id===story.subject)&&
      (!story.approvedViewers||story.approvedViewers.includes(id))&&
      (!story.commonWith||story.inclusions?.[story.commonWith]?.active&&story.inclusions[story.commonWith].viewers.includes(id))));
  }
  function bookBody(story,index){
    const linked=P.FamilyHome.photo(story,story.subject);
    const image=story.houseImage||(linked?.scope==='family'&&P.state.members.every(id=>linked.viewers.includes(id)&&
      (id===linked.author||id===linked.subject||!P.state.familyAccess[linked.subject]||P.state.familyAccess[linked.subject].archive.includes(id))&&
      (!linked.approvedViewers||linked.approvedViewers.includes(id)))?linked.poster:'');
    const author=P.PEOPLE[story.author]?.name||'家人';
    const photo=image?`<img class="family-book-photo" src="${e(image)}" alt="这篇往事的家庭照片">`:
      story.photoToken&&story.houseBytes?`<img class="family-book-photo" data-book-photo="${e(story.id)}" alt="这篇往事的家庭照片" hidden>`:'';
    return `<article class="book-page family-book-chapter">
      <header><p class="eyebrow">第 ${index+1} 页</p><h2>${e(story.title)}</h2>
        <p class="caption">${e(author)} 记录${story.recorded?' · '+e(story.recorded):''}</p></header>
      ${photo}
      ${story.text.map(value=>`<p class="house-copy">${e(value)}</p>`).join('')}
      ${(story.replies||[]).map(reply=>`<div class="family-book-reply"><p class="caption">${e(P.PEOPLE[reply.author]?.name||'家人')}补写</p><p class="house-copy">${e(reply.text)}</p></div>`).join('')}
      ${P.FamilyMoment.playback(story)}${P.PhotoStories.bookVoices(story)}</article>`;
  }
  function bookCover(title,count,label){
    return `<header class="book-cover family-book-cover"><div class="family-book-label">
      <p class="eyebrow">${label}</p><h1>${e(title)}</h1>
      <p class="caption">${count?'收录 '+count+' 篇往事':'留给家人的一本书'}</p>
    </div></header>`;
  }
  const bookThemes={
    photos:{title:'老家的三张照片',match:isPhotoStory},
    together:{title:'一家人的团圆',match:()=>true}
  };
  function chooseBookTheme(f,key){
    if(!Object.hasOwn(bookThemes,key))return;
    const theme=bookThemes[key];
    const entries=bookCandidates().filter(theme.match).slice(-3);
    if(!entries.length)return P.toast('先记录一条全家可见的照片往事。');
    updateBookDraft(f,theme.title,entries.map(story=>story.id));
  }
  /** 更换主题或应用手动选择后，从新样册的第一页开始预览。 */
  function updateBookDraft(f,title,ids){
    f.bookDraft={title,ids};
    f.previewPage=0;
    P.render();
    document.getElementById('app-content').scrollTop=0;
  }
  function bookSelection(f,candidates=bookCandidates()){
    const draft=f.bookDraft||{title:f.name+'的故事册',ids:candidates.slice(-3).map(story=>story.id)};
    const allowed=new Set(candidates.map(story=>story.id));
    return {title:draft.title,ids:draft.ids.filter(id=>allowed.has(id))};
  }
  function bookEditor(candidates,selection){
    const selected=new Set(selection.ids);
    const choices=candidates.map(story=>`<label class="check-row family-book-choice">
      <input type="checkbox" name="stories" value="${e(story.id)}" ${selected.has(story.id)?'checked':''}>
      <span><strong>${e(story.title)}</strong><small>${e(P.PEOPLE[story.author]?.name||'家人')}${story.date?' · '+e(story.date):''}</small></span>
    </label>`).join('');
    return `<details class="family-book-editor" ${selected.size?'':'open'}>
      <summary>${i('edit')} 编辑样册 ${i('down')}</summary>
      <p class="caption">也可以按主题选取最近的往事。</p>
      <div class="family-book-themes">${Object.entries(bookThemes).map(([key,theme])=>
        b(theme.title,'house-book-theme','btn outline compact',`data-theme="${key}" ${candidates.some(theme.match)?'':'disabled'}`)).join('')}</div>
      ${form('house-book-form',`<label class="form-field"><span>册名</span><input name="title" value="${e(selection.title)}" maxlength="36" required></label>
        <fieldset class="family-book-choices"><legend>收录的往事</legend><p class="caption">从全家可见的往事中选 1 至 ${PLAN.storyLimit} 篇。</p>
          <div class="family-book-choices-list">${choices}</div></fieldset>`,'更新样册')}
    </details>`;
  }
  function bookPager(index,count){
    return `<nav class="family-book-pager" aria-label="样页翻页">
      ${b(i('back'),'house-book-page','icon-button',`data-page="${index-1}" aria-label="上一页" ${index===0?'disabled':''}`)}
      <span class="caption">${index+1} / ${count}</span>
      ${b(i('arrow'),'house-book-page','icon-button',`data-page="${index+1}" aria-label="下一页" ${index===count-1?'disabled':''}`)}
    </nav>`;
  }
  function bookShelf(books){
    if(!books.length)return '';
    return `<section class="section"><div class="section-heading"><h2>已保存的故事册</h2></div>
      <div class="family-record-list">${books.map(book=>l(
        `<span class="family-record-thumb">${i('book')}</span><span class="family-record-copy"><strong>${e(book.title)}</strong><small>收录 ${book.ids.length} 篇往事</small></span>${i('arrow')}`,
        'house-book-saved/'+e(book.id),'family-record-row')).join('')}</div>
    </section>`;
  }
  function preview(){
    const f=current();if(!f)return empty();
    const candidates=bookCandidates();
    const selection=bookSelection(f,candidates);
    const entries=selection.ids.map(id=>candidates.find(story=>story.id===id));
    const index=Math.min(f.previewPage||0,Math.max(0,entries.length-1));
    const controls=candidates.length?`<div class="family-book-controls">
      ${bookEditor(candidates,selection)}${entries.length?b('保存故事册','house-book-save','btn compact'):''}
    </div>`:'';
    const sample=entries.length?`<section class="section" aria-label="故事册样页">
      <div class="family-book-reading-bar"><p>样页预览</p>${entries.length>1?bookPager(index,entries.length):''}</div>
      ${bookBody(entries[index],index)}
    </section>`:'';
    const start=candidates.length?'':`<section class="family-book-start section">
      <h2>从一段往事开始</h2><p>留下一张老照片或一段文字，设为全家可见，就能排成故事册样页。</p>
      <div class="family-book-controls">
        ${l('发张老照片','house-record/photo','btn compact')}${l('写一段往事','house-record','text-link')}
      </div>
    </section>`;
    return `<div class="page house-page family-book-page">
      ${bookCover(selection.title,entries.length,entries.length?'免费样册':'电子故事册')}
      ${controls}${sample}${start}${bookShelf(f.books)}
    </div>`;
  }
  function savedBook(){
    const f=current(),book=f?.books.find(item=>item.id===registry.routeId);
    if(!book)return preview();
    const candidates=bookCandidates(),entries=book.ids.map(id=>candidates.find(story=>story.id===id)).filter(Boolean);
    return `<div class="page house-page family-book-page house-book-saved">
      ${bookCover(book.title,entries.length,'已保存')}
      <div class="family-book-controls">
        ${l(i('back')+' 返回故事册','house-book','text-link')}
        ${entries.length?b('打印或另存为 PDF','house-book-print','btn compact'):''}
      </div>
      ${entries.length!==book.ids.length?'<p class="notice section">有往事的分享范围已改变，已隐藏对应内容。</p>':''}
      ${entries.length?`<section class="section family-book-chapters" aria-label="故事册正文">${entries.map(bookBody).join('')}</section>`:''}
    </div>`;
  }
  function saveBook(f){
    const draft=bookSelection(f);
    const {ids}=draft;
    if(!ids.length)return P.toast('先挑选全家都能阅读的往事。');
    if(!membershipActive(f))return confirmCheckout(f,true);
    // 同一组往事和册名再次打开原册；更改原文或补写无需重复占用本数。
    const existing=activeBooks(f).find(book=>book.title===draft.title&&book.ids.join()===ids.join());
    if(existing)return P.navigate('house-book-saved/'+existing.id);
    if(activeBooks(f).length>=PLAN.books)return P.toast('本会员年度的 2 本额度已用完。');
    const id=P.nextId('family-book');
    f.books.push({id,title:draft.title,ids,period:f.membership.start});
    P.navigate('house-book-saved/'+id);
  }
  function membership(){
    const f=current();if(!f)return pricing();
    const active=membershipActive(f);
    return page('家庭会员',e(f.name)+' · '+(active?'已开通':'免费家庭'),
      `<section class="plan-card featured section"><p class="plan-price"><strong>¥${PLAN.price}</strong> <span>／家／年</span></p>
      <p>家庭总容量 ${capacity()} GB${active?' · 本期剩余故事册 '+(PLAN.books-activeBooks(f).length)+' 本':''}</p>
      ${active?'<p class="caption">有效至 '+e(f.membership.end)+'</p>':''}<p class="caption">当前已用 ${(storage()/1024**2).toFixed(1)} MB</p>
      ${toolbar(active?jump('打开家庭故事册','house-book',true):action('模拟开通家庭会员','house-checkout',true))}</section>`+
      entitlementCards()+toolbar(jump('查看服务订单','service-orders')));
  }
  function entitlementCards(){
    return card(`免费家庭 · ${freeCapacity()} GB`,
      '建家、发照片、邀请家人回语音。原声可以从照片下回听，也可按家人找往事、预览故事册。')+
      card(`家庭会员 · ${PLAN.memberGB} GB`,
        `一位家人开通，获授权的家人共享。每会员年可保存 ${PLAN.books} 本电子故事册，有录音的页可回听，图文可另存 PDF。拟每年提供 ${PLAN.plannedAudioHours} 小时录音转写与整理，家人核对后可搜索往事。`)+
      card('到期与续费',
        '第二年有新照片和录音想整理时，可以续费。到期后恢复本家的免费额度，超额时暂停新增文件。已有照片、语音和故事册仍可在授权范围内回看。');
  }
  function pricing(){
    const family=current();
    return page('家庭服务收费',`试点新家庭免费共享 ${PLAN.freeGB} GB，家庭会员 ${PLAN.price} 元／家／年。`,
      entitlementCards()+toolbar(jump(family?'查看家庭会员':'免费创建家庭',family?'membership':'house-create',true)));
  }
  function addons(){
    return page('家庭增值服务','每项单独咨询和交付，免费家庭也可选购。',Object.entries(services).map(([key,value])=>
      card(value.title,value.price,toolbar(jump('了解'+value.title,'house-service/'+key)))).join('')+
      card('人工纪念书','编辑、样书和印制分段确认。适合需要人工整理和实物印制的家庭。',toolbar(jump('查看制作流程','books'))));
  }
  function serviceActions(key,f,person,order){
    // 陈家示例先有交付内容，服务入口仍按各账号的查看授权显示。
    if(key==='vr'&&f){
      if(canUseSpace())return jump('进入故里 VR','space',true);
      if(!isOwner())return P.state.accounts.father?.hasSpace?
        b('向家庭管理人申请开放','family-request','btn full',`data-person="father" data-kind="space"`):
        '<p class="caption">可请家庭管理人登记故里 VR 咨询。</p>';
    }
    const digital=key==='digital'&&f?P.state.members.filter(id=>P.ContentChat.available(id)):[];
    const access=digital.map(id=>jump('进入'+e(P.PEOPLE[id].name)+'的数字人','chat/'+e(id),true)).join('');
    if(digital.includes(person))return access;
    if(order?.status==='已模拟交付')return key==='film'?jump('进入已交付服务','film-delivery',true):access;
    if(order)return access+jump('查看咨询与交付进度','service-orders',!access);
    return access+action(key==='digital'&&access?'咨询制作自己的数字人（演示）':'提交咨询意向（演示）',
      'house-request',!access,`data-id="${key}"`);
  }
  function personServiceActions(key, person, order) {
    const access = personServiceAccess(key, person);
    if (access) return jump(access.label, e(access.route), true);
    if (personServiceDelivered(key, person)) {
      const kind = key === 'film' ? 'archive' : 'digital';
      if (person !== P.state.actor && P.FamilyContext.invited(person) && !P.FamilyContext.allowed(person, kind)) {
        return b('向本人申请开放', 'family-request', 'btn full', `data-person="${e(person)}" data-kind="${kind}"`);
      }
      return `<p class="caption">${person === P.state.actor ? '当前暂无可打开的交付内容，可到服务订单核对。' : '这项内容暂未向你开放，请联系档案本人确认分享范围。'}</p>`;
    }
    if (order && (person === P.state.actor || order.requesters?.includes(P.state.actor))) {
      return jump('查看咨询进度', 'service-orders', true);
    }
    return action('提交咨询意向（演示）', 'house-request', true, `data-id="${key}" data-person="${e(person)}"`);
  }

  function service(){
    const key=registry.routeId;
    if(!Object.hasOwn(services,key))return addons();
    const item=services[key],f=current();
    const fromProfile=Boolean(key!=='vr'&&registry.routeDetail);
    if(fromProfile&&!f)return empty();
    const person=fromProfile?memberIds([registry.routeDetail])[0]:key==='vr'?'father':P.state.actor;
    if(!person)return addons();
    const order=f?.orders.find(value=>value.key===key&&value.person===person);
    const customer=f&&(key!=='digital'||fromProfile)?card(key==='vr'?'服务家庭':'服务人物',e(key==='vr'?f.name:P.PEOPLE[person]?.name||'家人')):'';
    const actions=fromProfile?personServiceActions(key,person,order):serviceActions(key,f,person,order);
    const back=fromProfile?jump('返回个人档案','house-stories/'+e(person)):jump('返回增值服务','house-addons');
    return page(item.title,item.summary,customer+card('收费方式',item.price)+toolbar(actions,back));
  }
  function orders(){
    const f=current();if(!f)return empty();
    const actor=P.state.actor;
    const visible=f.orders.filter(order=>!order.person||order.person===actor||order.requesters?.includes(actor)||order.key==='vr'&&canUseSpace());
    const legacy=P.state.billingOrders.filter(order=>order.kind==='book'&&order.actor===actor);
    return page('服务订单',e(f.name)+' · 演示订单',visible.map(order=>{
      const personal=order.person&&(order.key==='film'||order.key==='digital');
      const title=personal?order.title+' · '+(P.PEOPLE[order.person]?.name||'家人'):order.title;
      const route='house-service/'+order.key+(personal&&order.person!==actor?'/'+e(order.person):'');
      const pending=order.status==='咨询意向已登记';
      const controls=pending&&order.person===actor?toolbar(action('模拟顾问交付','house-deliver',false,`data-id="${order.id}"`)):
        order.key?toolbar(jump(pending||personal&&order.person!==actor?'查看服务详情':'打开交付内容',route)):'';
      return card(e(title),e(order.price)+' · '+e(order.status),controls);
    }).join('')+
      legacy.map(order=>card('人工纪念书编辑','¥'+e(order.cash)+' · 已模拟支付',toolbar(jump('查看制作进度','book-order/'+order.bookId)))).join('')+
      (!visible.length&&!legacy.length?card('暂无订单','开通家庭会员或咨询增值服务后可在这里查看。'):'')+
      toolbar(jump('查看家庭会员','membership'),jump('查看独立增值服务','house-addons')));
  }
  function confirmCheckout(f,saveAfter=false){
    if(!f||membershipActive(f))return;
    P.modal('确认开通家庭会员',`<p>为「${e(f.name)}」开通家庭会员，${PLAN.price} 元／家／年。</p>
      <p class="section">全家共享 ${PLAN.memberGB} GB 总容量 · 每年可保存 ${PLAN.books} 本电子故事册</p>
      ${saveAfter?'<p class="caption">确认后会保存你刚预览的这本故事册。</p>':''}
      ${toolbar(action(saveAfter?'模拟开通并保存':'确认模拟开通','house-pay',true,`data-id="${f.id}" ${saveAfter?'data-save-book="true"':''}`),
        b(saveAfter?'返回样页':'返回','close-modal','btn outline full'))}`,'sheet');
  }
  function deliver(order){
    const s=P.state,person=order.person;
    if(order.status!=='咨询意向已登记'||person!==s.actor)return;
    if(order.key==='film'){
      const seed=P.ARCHIVE_DATA.assets.find(item=>item.kind==='film');
      const asset={...structuredClone(seed),id:P.nextId('film'),title:'人生故事片 · 交付演示样片',subject:person,author:person,viewers:[person],scope:'private',sourceLabel:'虚构人物通用样片'};
      P.PersonArchive.assets(person,'video');
      s.archiveAssets.push(asset);
      s.accounts[person].videoDelivered=true;
    }
    if(order.key==='digital')Object.assign(s.accounts[person],{hasDigital:true,standaloneDigital:true});
    if(order.key==='vr')s.accounts[person].hasSpace=true;
    order.status='已模拟交付';
    P.render();
    P.toast('交付已更新，可打开体验。');
  }

  function handleAction(key,el){
    if(key==='video-service'){P.navigate('house-service/film');return true;}
    if(!key.startsWith('house-'))return false;
    const f=current(),id=el.dataset.id;
    switch(key){
      case 'house-example':selectHouse(EXAMPLE);break;
      case 'house-switch':selectHouse(id);break;
      case 'house-member':changeMember(id);break;
      case 'house-story-profile-edit':
        if(f)openStoryProfileEditor(id);
        break;
      case 'house-story-person':
        if(f&&memberIds([id]).length)openStoryList({person:id});
        break;
      case 'house-book-theme':if(f)chooseBookTheme(f,el.dataset.theme);break;
      case 'house-book-page':{
        const index=Number(el.dataset.page);
        if(f&&Number.isInteger(index)&&index>=0&&index<bookSelection(f).ids.length){
          f.previewPage=index;
          P.render();
        }
        break;
      }
      case 'house-book-save':if(f)saveBook(f);break;
      case 'house-book-print':window.print();break;
      case 'house-checkout':confirmCheckout(f);break;
      case 'house-pay':{
        if(!f||f.id!==id||membershipActive(f))break;
        const saveAfter=el.dataset.saveBook==='true';
        // 从样页开通前再核对可用素材，避免分享范围变更后只开通却无法保存。
        if(saveAfter&&(!['house-book','house-book-preview'].includes(P.state.route)||!bookSelection(f).ids.length)){
          P.closeModal();P.render();P.toast('故事册素材已变化，请重新预览。');break;
        }
        const start=P.state.billingToday;
        f.membership={start,end:P.Billing.shift(start,1)};
        f.orders.push({title:'家庭会员 · 一年',price:'¥'+PLAN.price,status:'模拟已开通'});
        P.closeModal();
        if(saveAfter){
          saveBook(f);P.toast('家庭会员已模拟开通，故事册已保存。');
        }else{
          P.render();P.toast('家庭会员已模拟开通。');
        }
        break;
      }
      case 'house-request':{
        if(!Object.hasOwn(services,id))break;
        if(!f){P.navigate('house-create');break;}
        const actor=P.state.actor;
        const target=el.dataset.person;
        const person=id==='vr'?'father':target||actor;
        if(id==='vr'&&!isOwner()){P.toast('请由家庭管理人登记家庭 VR 咨询。');break;}
        if(target&&(id==='vr'||P.state.route!=='house-service'||registry.routeId!==id||registry.routeDetail!==person||
            !memberIds([person]).length||personServiceDelivered(id,person)))break;
        let order=f.orders.find(order=>order.key===id&&order.person===person);
        if(!order){
          order={id:P.nextId('addon'),person,key:id,title:services[id].title,price:services[id].price,status:'咨询意向已登记'};
          f.orders.push(order);
        }
        // 家人可以登记咨询意向，订单归属和交付权限继续绑定服务人物。
        if(target&&person!==actor){
          order.requesters=[...new Set([...(order.requesters||[]),actor])];
        }
        P.navigate('service-orders');
        break;
      }
      case 'house-deliver':{
        const order=f?.orders.find(item=>item.id===id);
        if(order)deliver(order);
        break;
      }
      case 'house-service-demo':
        if(Object.hasOwn(services,id)){activate(EXAMPLE);if(id==='film')P.changeActor('father');selectHouse(EXAMPLE,services[id].route);}
        break;
    }
    return true;
  }
  function submit(element){
    if(element.id==='story-person-edit-form'){
      saveStoryProfile(element);
      return true;
    }
    if(!['house-create-form','house-record-form','house-reply-form','house-book-form'].includes(element.id))return false;
    const data=new FormData(element),value=name=>String(data.get(name)||'').trim(),f=current();
    if(element.id==='house-create-form'){
      const name=value('name'),person=value('person'),submitButton=element.querySelector('button[type="submit"]');
      if(submitButton.disabled)return true;
      if(!name||!person){P.toast('请填写家庭名称和你的称呼。');return true;}
      submitButton.disabled=true;
      const id='home-'+(++registry.nextFamily);
      registry.families.push({id,name,people:{father:{name:person,short:person.slice(0,1),relation:'家庭管理人',color:'sand'}},
        workspace:P.initialState(false),orders:[],books:[],membership:null,freeGB:PLAN.freeGB});
      selectHouse(id,'house-record/photo');
      return true;
    }
    if(!f)return true;
    if(element.id==='house-record-form'){
      const title=value('title'),storyText=value('text'),file=data.get('image');
      if(!title||!storyText)return true;
      const audience=recordAudience(data);
      if(!audience)return true;
      const bytes=file?.size||0;
      if(bytes&&(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||bytes>20*1024**2)){
        P.toast('请选 20 MB 内的 JPG、PNG、WEBP 或 GIF 照片。');return true;
      }
      if(bytes&&!canUpload(bytes)){P.toast('当前家庭空间不足，已保留表单内容。');return true;}
      saveStory({title,text:[storyText],quote:storyText.slice(0,52),photoUrl:bytes?URL.createObjectURL(file):'',bytes,
        relatedMembers:data.getAll('relatedMembers'),...audience});
    }else if(element.id==='house-reply-form'){
      const story=P.visibleStories().find(item=>item.id===value('story'));
      if(story&&story.scope!=='private'&&value('text')){
        (story.replies ||= []).push({author:P.state.actor,text:value('text')});
        P.render();P.toast('已补写到同一件往事。');
      }
    }else{
      const ids=data.getAll('stories'),allowed=new Set(bookCandidates().map(item=>item.id));
      if(!value('title')||!ids.length||ids.length>PLAN.storyLimit||ids.some(id=>!allowed.has(id))){
        P.toast('请填写册名，并从全家可见的往事中选 1 至 30 篇。');return true;
      }
      updateBookDraft(f,value('title'),[...new Set(ids)]);
    }
    return true;
  }
  /** 关联人物和访问名单分开保存，只有分享范围决定访问权限。 */
  function saveStory({title,text,quote,photoUrl,bytes,photoToken,photoYear,moment=false,houseVoice,eventDate,dateLabel,babyMilestone=false,lifeMilestone=false,
    replaceComposer=false,relatedMembers=[],scope='family',viewers=scope==='family'?[...P.state.members]:[]}){
    const id=P.nextId('family-story'),actor=P.state.actor,now=new Date(),year=(eventDate||dateLabel)?.slice(0,4)||String(now.getFullYear());
    const happened=eventDate?new Date(eventDate+'T00:00:00'):now;
    const date=dateLabel||(moment?happened.toLocaleDateString('zh-CN',{dateStyle:'long'}):year+'年');
    const source=moment?'家人随手记录':photoToken?'家人分享的照片':'家庭成员文字记录';
    const category=babyMilestone?'宝宝成长':lifeMilestone?'人生节点':'共同回忆';
    P.state.stories.push({id,title,text,quote,author:actor,subject:actor,photoToken,photoYear,moment,houseVoice,eventDate,babyMilestone,lifeMilestone,
      scope,viewers,relatedMembers:memberIds(relatedMembers),fromFamily:true,confirmedBy:actor,category,houseImage:photoUrl,houseBytes:bytes,
      year,date,recorded:now.toLocaleDateString('zh-CN'),recordedAt:now.getTime(),source,duration:photoToken?'照片':houseVoice?'语音':'文字记录'});
    P.navigate('story/'+id,{replace:replaceComposer});
  }
  function memberOptions(){
    return current()&&!isExample()?Object.keys(P.state.accounts).map(id=>({id,name:P.PEOPLE[id].name,selected:id===P.state.actor})):null;
  }
  function changeMember(id){
    if(!current()||!P.state.accounts[id])return false;
    P.changeActor(id);
    return true;
  }
  function identityPicker(){
    const alternatives=Object.keys(P.state.accounts).filter(id=>id!==P.state.actor);
    return alternatives.length?`<details class="section"><summary>切换家人身份（演示）</summary>${toolbar(...alternatives.map(id=>action(e(P.PEOPLE[id].name),'house-member',false,`data-id="${id}"`)))}</details>`:'';
  }
  const oldHome=P.views.home;
  P.views.home=()=>current()?oldHome():empty();
  P.views.welcome=empty;
  Object.assign(P.views,{
    'house-create':create,'house-switch':switcher,'house-add':addRecord,'house-record':sharedRecord,'house-story':P.views.story,'house-stories':sharedStories,
    'house-moment':()=>P.FamilyMoment.view(memberIds([registry.routeId]),registry.routeDetail),
    'house-baby':()=>P.FamilyEditions.baby(registry.routeId,registry.routeView),
    'house-elders':()=>P.FamilyEditions.elders(registry.routeId),
    'house-book':preview,'house-book-preview':preview,'house-book-saved':savedBook,'house-addons':addons,'house-service':service,
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
    if(input.matches('[data-record-audience]')){
      input.form.querySelector('[data-record-viewers]').hidden=input.value!=='selected';
    }else if(f&&input.id==='house-story-order'){
      f.storyOrder=input.value==='photo-year'?'photo-year':'recent';
      P.render();
    }
  });
  P.Households={titles,isExample,current,families,membershipActive,capacity,storage,canUpload,canUseSpace,memberOptions,changeMember,identityPicker,replyPanel,handleAction,submit,saveStory,recentRecords,recentAlbum,sharedFamilyEntries,reset,photoWorkspace,restorePhotoWorkspace,
    memberIds,memberFields,relatedMemberIds,relatedMemberNames,audienceFields,recordAudience,openStoryList,fromStoryList,storyListPhotos,profileEntries,
    canRoute:name=>Boolean(current()&&Object.hasOwn(P.views,name))||['home','welcome','house-create','house-switch','billing-plan','house-addons','house-service','house-assistant','house-picks'].includes(name),
    activateExample:()=>activate(EXAMPLE),
    setRoute:(_route,id,detail,view)=>{registry.routeId=id||'';registry.routeDetail=detail||'';registry.routeView=view||'';},
    fallback:route=>({'house-create':'house-switch','house-switch':'profile','house-add':'house-stories','house-record':'house-stories','house-moment':'house-stories','house-story':'house-stories','house-stories':'home','house-baby':'house-stories','house-elders':'house-stories','house-couple':'house-stories','house-couple-setup':'profile-family',
      'house-book':'profile','house-book-preview':'house-book','house-book-saved':'house-book','house-addons':'profile-services','house-service':'house-addons'})[route],
    status:()=>{const f=current();return f?{名称:f.name,身份:P.PEOPLE[P.state.actor]?.name,
      往事:P.state.stories.filter(story=>!story.coupleId).length+P.visibleStories().filter(story=>story.coupleId).length,容量:capacity(),
      故事册:membershipActive(f)?PLAN.books-activeBooks(f).length:0}:null;}
  };
}
