/** 资料补充与整理：本地文件与文字草稿、提供者核对、本人审核和统一档案归档。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,badge:t,icon:i}=P;
  const MAX_FILE_BYTES=20*1024*1024;
  const KINDS={photo:'照片',clip:'生活视频',document:'书信与文字资料',work:'作品'};
  const FILE_TYPES={photo:'image/',clip:'video/',work:'image/'};
  const FAMILY_UPLOAD_TYPES={
    photo:{label:'照片',icon:'photo'},
    clip:{label:'视频',icon:'play'},
    work:{label:KINDS.work,icon:'book'}
  };
  /** 每份草稿只属于当前账号；原始文件内容只留在内存，不上传、不自动保存。 */
  function draft() {
    const s=P.state;
    return s.materialDrafts[s.actor] ||= {id:'',title:'',kind:'photo',subject:s.archivePerson||s.actor,date:'',description:'',body:'',storyId:'',scope:'private',viewers:[],file:null,loading:false,error:''};
  }
  /** 渲染前捕获有效表单，账号切换或重置后的旧元素不能回写新草稿。 */
  function capture() {
    const form=document.getElementById('material-form');
    if(!form || form.featureState!==P.state || form.dataset.actor!==P.state.actor)return;
    const data=new FormData(form),r=draft();
    for(const key of ['title','kind','subject','date','description','body','storyId','scope'])r[key]=String(data.get(key)||'');
    r.viewers=data.getAll('viewers').filter(id=>P.state.members.includes(id)&&id!==P.state.actor);
    r.relatedMembers=P.Households.memberIds(data.getAll('relatedMembers'));
    if(isFamilyUpload(r)){
      r.infoOpen=Boolean(form.querySelector('.family-upload-info[open]'));
      r.workOpen=Boolean(form.querySelector('.family-upload-text[open]'));
    }
  }
  /** 已归档资料由档案模块持有，管理页不另外复制一套内容库。 */
  function archiveItems() {P.PersonArchive.assets(P.state.actor,'photo');return P.state.archiveAssets;}
  /** 分享遵循现有成员快照，不把未来加入的家人自动放进资料名单。 */
  function viewers(r) {return r.scope==='family'?[...P.state.members]:r.scope==='selected'?[...r.viewers]:[];}
  function contentBytes(r) {
    return (r.file?.size||0)+new TextEncoder().encode(r.body).length;
  }
  function acceptsFile(kind,type) {
    return typeof type==='string'&&Boolean(FILE_TYPES[kind]&&type.startsWith(FILE_TYPES[kind]));
  }
  /** 创作照片与文字归入同一份资料，原件名称和大小用于重新编辑与下载。 */
  function asset(r,author,id=P.nextId('material')) {
    const image=['photo','work'].includes(r.kind);
    return {
      id,subject:r.subject,author,kind:r.kind,title:r.title.trim(),date:r.date.trim()||'时间待补充',year:'',
      description:r.description.trim(),body:r.body.trim()?[r.body.trim()]:[],scope:r.scope,viewers:viewers(r),
      relatedMembers:P.Households.relatedMemberIds(r),fromFamily:Boolean(r.fromFamily),
      relatedStoryId:r.storyId||'',relatedFilmId:r.relatedFilmId||'',
      poster:image?(r.file?.data||'assets/zhumen/record-writing-corner.png'):'assets/family.png',
      src:r.file?.data||'',fileName:r.file?.name||'',fileType:r.file?.type||'',fileBytes:r.file?.size||0,
      duration:Number(r.duration)||0,sourceLabel:P.PEOPLE[author].name+'提供 · 本地补充资料',
      materialManaged:true,storageBytes:contentBytes(r),confirmedBy:null
    };
  }
  /** 任何实际发布都重新校验当前人物、关联事件与文件，草稿允许保留不完整信息。 */
  function validate(r) {
    if(!Object.hasOwn(KINDS,r.kind)||!P.state.members.includes(r.subject))return '请选择有效的资料类型和归档人物。';
    if(r.fromFamily&&r.subject!==P.state.actor)return '请从当前家庭的往事重新添加这份资料。';
    if(r.babyMember&&!P.FamilyEditions.validDate(r.date))return '请填写有效的拍摄日期。';
    if(P.state.actor!=='father'&&!P.FamilyContext.invited(r.subject))return '请只向邀请你的人物提交资料，已有内容和草稿可在“我提交的资料”查看。';
    if(r.id&&!archiveItems().some(item=>item.id===r.id&&item.author===P.state.actor&&item.subject===r.subject))return '这份资料不能由当前账号更改归属，请返回核对。';
    if(!P.Billing.uploadAllowed(r.subject,contentBytes(r),r.id))return '当前人物已超容量或保管到期，请先整理、导出或续费；原资料不会被删除。';
    if(!r.title.trim())return '请给资料起一个名字。';
    if(r.loading)return '文件正在读入，请稍候再核对。';
    if(['photo','clip'].includes(r.kind)&&!r.file)return '请选择一份本地照片或视频。';
    if(r.file&&!acceptsFile(r.kind,r.file.type))return '文件类型与资料类型不一致，请重新选择。';
    if(r.kind==='document'&&!r.body.trim())return '请填写要保存的文字正文。';
    if(r.kind==='work'&&!r.file&&!r.body.trim())return '请添加一张照片，或写下想保存的文字。';
    if(!['private','family','selected'].includes(r.scope))return '请选择分享范围。';
    if(r.scope==='selected'&&!r.viewers.length)return '请选择指定家人，或先设为仅自己。';
    if(r.storyId&&!P.visibleStories().some(item=>item.id===r.storyId&&item.subject===r.subject))return '关联事件已不可用，请重新选择。';
    if(r.kind==='document'&&!r.storyId)return '书信与文字资料需要关联一段人生事件。';
    if(r.subject!==P.state.actor&&!P.state.accounts[r.subject])return '这位家人尚未认领账号，可以先保存草稿，待本人加入后提交核对。';
    return '';
  }
  /** 资料预览使用本地读入内容，视频和照片不自动播放或请求外部服务。 */
  function preview(r) {
    const image=r.file&&['photo','work'].includes(r.kind)?`<img class="feature-media" src="${e(r.file.data)}" alt="${e(r.title||'待整理照片')}">`:'';
    if(r.kind==='photo')return image;
    if(r.kind==='clip'&&r.file)return `<video class="feature-media" controls playsinline preload="metadata" src="${e(r.file.data)}"></video>`;
    const body=r.body||(!image?r.description:'');
    return image+(body?`<p class="feature-prose">${e(body)}</p>`:'');
  }
  const STAGES={drafts:'草稿',pending:'待核对',archived:'已归档'};
  /** 未提交表单包含文字、文件读取和时间说明，不因只填了部分字段而丢失。 */
  function hasDraft(r){return Boolean(r&&(r.title||r.body||r.file||r.description||r.loading||
    (r.date&&r.date!==r.defaultDate)));}
  /** 共同回忆未提交或未纳入时保留原稿状态，不能误显示为已经归档。 */
  function experienceStage(item) {
    if(item.status==='pending')return 'pending';
    if(item.status==='returned')return 'drafts';
    if(item.commonWith&&!P.FamilyContext.inArchive(item,item.commonWith))return item.scope==='private'||item.inclusions?.[item.commonWith]?.reviewed?'drafts':'pending';
    return 'archived';
  }
  /** 已归档资料只读取档案唯一实例，已完成的提交快照不再重复列出。 */
  function archivedCard(item) {
    const editButton=item.relatedFilmId?'':b('更正资料','material-edit-existing','text-link',`data-id="${item.id}"`);
    return `<article class="card">${item.kind==='photo'&&item.poster?`<img class="material-card-photo" src="${e(item.poster)}" alt="${e(item.title)}资料缩略图">`:''}<h3>${e(item.title)}</h3><p class="caption">${e(P.PEOPLE[item.subject].name)} · ${item.inArchive===false?'原稿保留，已移出档案':'已归档'}</p>${b('查看资料','archive-open','text-link',`data-id="${item.id}" data-person="${item.subject}"`)} ${editButton} ${b('撤回分享','material-withdraw','text-link',`data-id="${item.id}"`)}</article>`;
  }
  /** 三组互斥分类，退回任务正在编辑时只展示当前草稿，已归档快照不与资料重复。 */
  function collections() {
    const s=P.state,r=draft(),groups={drafts:[],pending:[],archived:[]};
    if(hasDraft(r))groups.drafts.push(`<article class="card"><h3>${e(r.title||r.file?.name||'未命名资料')}</h3><p class="caption">${r.submissionId?'已退回，正在更正':'资料草稿 · 尚未提交'}</p>${l('继续整理','material-edit')}</article>`);
    const record=s.record,recordDraft=Boolean(record.title||record.text||record.recording||s.draftSaved);
    if(recordDraft)groups.drafts.push(`<article class="card"><h3>${e(record.title||'未命名的记录草稿')}</h3><p class="caption">${record.pendingId?'已退回，正在更正':'记录草稿 · 尚未提交'}</p>${l('继续填写','record')}</article>`);
    for(const item of s.materialSubmissions.filter(item=>item.author===s.actor)){
      if(item.status==='pending')groups.pending.push(submissionCard(item));
      if(item.status==='returned'&&!(hasDraft(r)&&r.submissionId===item.id))groups.drafts.push(submissionCard(item));
    }
    for(const item of s.pending.filter(item=>item.author===s.actor))if(!(recordDraft&&record.pendingId===item.id))groups[experienceStage(item)].push(experienceCard(item,false));
    for(const item of s.stories.filter(item=>item.author===s.actor&&!item.coupleId))groups[experienceStage(item)].push(experienceCard(item,false));
    for(const item of archiveItems().filter(item=>item.author===s.actor&&item.materialManaged))groups[item.inArchive===false?'drafts':'archived'].push(archivedCard(item));
    return groups;
  }
  /** 只展示当前分组；初次进入优先草稿，再看待核对，无待办时展示已归档。 */
  function view() {
    const s=P.state,groups=collections(),stage=s.materialTabs[s.actor]||(groups.drafts.length?'drafts':groups.pending.length?'pending':'archived');
    s.materialTabs[s.actor]=stage;
    const descriptions={drafts:'尚未提交的内容和退回更正的原稿，可以继续完善。',pending:'已提交给本人，确认后会进入对应档案。',archived:'已确认保存的资料与人生经历，沿用原分享范围。'};
    const empty={drafts:'没有未完成的草稿。',pending:'没有等待本人核对的资料。',archived:'还没有已归档的内容。'};
    const tabs=Object.entries(STAGES).map(([key,label])=>b(`<span>${label}</span><small>${groups[key].length}</small>`,'material-stage',key===stage?'active':'',`data-stage="${key}" role="tab" id="material-tab-${key}" aria-controls="material-stage-panel" aria-selected="${key===stage}"`)).join('');
    return `<div class="page feature-page"><h1 class="page-title">我提交的资料</h1><p class="page-subtitle">草稿、核对进度和归档结果，分开查看。</p><div class="material-stage-tabs" role="tablist" aria-label="提交进度">${tabs}</div><section id="material-stage-panel" class="material-stage-panel" role="tabpanel" aria-labelledby="material-tab-${stage}"><p class="caption">${descriptions[stage]}</p><div class="section stack">${groups[stage].join('')||`<div class="empty"><p>${empty[stage]}</p></div>`}</div></section>${l('去人生印记添加资料','life','text-link full section')}<p class="caption section">演示内容只保存在当前页面，刷新或重置会还原。</p></div>`;
  }
  /** 保存或提交后直接显示对应阶段；切换选择只属于当前账号。 */
  function open(stage){if(!Object.hasOwn(STAGES,stage))return;P.state.materialTabs[P.state.actor]=stage;P.navigate('materials');}
  /** 待我核对按归档本人过滤，各类资料与人生经历分别沿用原审核动作。 */
  function inbox() {
    const s=P.state,materials=s.materialSubmissions.filter(item=>item.subject===s.actor&&item.status==='pending');
    const experiences=s.pending.filter(item=>item.subject===s.actor&&item.status==='pending');
    return `<div class="page feature-page"><h1 class="page-title">待我核对</h1><p class="page-subtitle">家人提交给你的资料和人生经历，确认后才进入你的档案。</p><div class="section stack">${materials.map(submissionCard).join('')+experiences.map(item=>experienceCard(item,true)).join('')||'<p class="caption">暂时没有需要你核对的资料。</p>'}</div>${l('返回我的','profile','text-link full')}</div>`;
  }
  /** 引用原记录并区分共同回忆是否已纳入，退回更正仍走原补充流程。 */
  function experienceCard(item,reviewing) {
    const target=item.commonWith||item.subject;
    let status='已归档';
    if(item.status==='pending')status='等待本人核对';
    else if(item.status==='returned')status='已退回更正';
    else if(item.commonWith&&!P.FamilyContext.inArchive(item,target))status=item.scope==='private'?'仅自己保存':item.inclusions?.[target]?.reviewed?'未纳入对方传记':'等待对方确认';
    const actions=reviewing?b('确认并归档','approve-pending','btn secondary',`data-id="${item.id}"`)+b('退回更正','return-pending','text-link',`data-id="${item.id}"`):item.status==='returned'?b('按意见更正','edit-pending','text-link',`data-id="${item.id}"`):!item.status?l('查看人生经历','story/'+item.id,'text-link'):'';
    return `<article class="card"><h3>${e(item.title)}</h3><p class="caption">${item.commonWith?'共同回忆':'人生经历'} · ${e(P.PEOPLE[target].name)} · ${status} · ${item.scope==='private'?'仅自己':item.scope==='selected'?'指定家人':'家庭可见'}</p><p class="feature-prose">${e(item.text.join('\n\n'))}</p>${item.feedback?`<p>${e(item.feedback)}</p>`:''}${actions}</article>`;
  }
  /** 家庭入口按上传人保存，预选的关联人物只用于浏览。人物档案入口继续按本人核对。 */
  function begin(el,discard=false) {
    const s=P.state,{person,kind,from,relatedMember}=el.dataset,fromFamily=from==='family';
    if(!['photo','clip','work','biography'].includes(kind)||!P.FamilyContext.allowed(person)){P.toast('请从当前获授权人物的资料分类添加。');return;}
    if(kind==='biography'){
      P.captureRecord();if(s.record.text.trim()){P.modal('还有一份未完成的记录',`<p>请先完成或保存现有草稿。</p>${l('继续草稿','record','btn full')}`);return;}
      s.record={...P.emptyRecord(),kind:person===s.actor?'own':'contribution',subject:person,archiveAddition:true};P.navigate('record');return;
    }
    const babyMember=fromFamily&&['photo','clip'].includes(kind)?P.Households.memberIds([el.dataset.babyMember])[0]||'':'';
    const r=s.materialDrafts[s.actor];
    if(!discard&&hasDraft(r)){P.modal('已有一份未完成的资料',`<p>《${e(r.title||r.file?.name||'未命名资料')}》仍在当前账号草稿中。</p>${l('继续这份草稿','material-edit','btn full')}${b('放弃这份草稿并新建','material-discard-draft','btn secondary full section',`data-person="${e(person)}" data-kind="${kind}" data-from="${e(from||'archive')}" data-related-member="${e(relatedMember||'')}" data-baby-member="${e(babyMember)}"`)}`);return;}
    const form=document.getElementById('material-form');if(form)form.featureState=null;
    s.materialDrafts[s.actor]=null;
    const date=babyMember?P.FamilyEditions.today():'';
    Object.assign(draft(),{subject:person,kind,fromFamily,fromArchive:!fromFamily,babyMember,date,defaultDate:date,
      relatedMembers:P.Households.memberIds([babyMember||(fromFamily?relatedMember:person)])});
    P.navigate('material-edit');
  }
  /** 待本人审核的材料仅向提供者与归档本人展示，不提前进入家人的资料列表。 */
  function submissionCard(item) {
    const canReview=item.subject===P.state.actor&&item.status==='pending';
    // 缩略图只来自本次待核对快照，不能借展示卡把它发布到人物正式档案。
    const photo=['photo','work'].includes(item.asset?.kind)?item.asset.src:'';
    return `<article class="card">${photo?`<img class="material-card-photo" src="${e(photo)}" alt="待核对资料缩略图">`:''}<h3>${e(item.title)}</h3><p>${t(item.status==='pending'?'等待本人核对':item.status==='returned'?'已退回更正':'已归档',item.status==='pending'?'warm':'gray')}</p><p class="caption">${e(P.PEOPLE[item.author].name)}提供 → ${e(P.PEOPLE[item.subject].name)}</p>${item.feedback?`<p>${e(item.feedback)}</p>`:''}${canReview?b('核对这份资料','material-inspect','btn secondary compact',`data-id="${item.id}"`):item.status==='returned'&&item.author===P.state.actor?b('按意见更正','material-revise','text-link',`data-id="${item.id}"`):''}</article>`;
  }
  /** 家庭成员新上传的资料直接入档，原有资料更正与替家人提交继续走核对。 */
  function isFamilyUpload(r){
    return Boolean(r?.fromFamily&&!r.id&&!r.submissionId&&Object.hasOwn(FAMILY_UPLOAD_TYPES,r.kind));
  }
  function uploadHeader(){
    const r=P.state.materialDrafts[P.state.actor];
    return isFamilyUpload(r)?'添加'+FAMILY_UPLOAD_TYPES[r.kind].label:'';
  }
  function uploadName(r){
    const fileName=r.file?.name?.replace(/\.[^.]+$/u,'').trim();
    return (fileName||r.body.trim().split(/\r?\n/,1)[0]||FAMILY_UPLOAD_TYPES[r.kind].label).slice(0,80);
  }
  function familyUpload(r){
    const {label,icon}=FAMILY_UPLOAD_TYPES[r.kind];
    const photo=r.file&&r.kind!=='clip'?`<img src="${e(r.file.data)}" alt="">`:i(icon);
    const fileLabel=r.kind==='work'?(r.file?'更换照片':'选择手稿或书画照片'):(r.file?'更换':'选择')+label;
    const related=P.Households.relatedMemberNames(r);
    // 成长阶段按拍摄日期计算，补传孕期影像时可以直接填写原来的日期。
    const babyDate=r.babyMember?`<label class="form-field"><span>拍摄日期</span>
      <input id="material-field-date" name="date" type="date" min="1900-01-01" max="${P.FamilyEditions.today()}" value="${e(r.date)}" required></label>`:'';
    // 老草稿已有的事件关联可以保留或取消，新上传通过关联家人归类。
    const previousStory=r.storyId&&P.visibleStories().find(story=>story.id===r.storyId&&story.subject===r.subject);
    const storyField=r.storyId?`<label class="form-field"><span>原关联的往事</span><select name="storyId">
      <option value="">取消关联</option><option value="${e(r.storyId)}" selected>${e(previousStory?.title||'原往事暂不可用')}</option>
    </select></label>`:'';
    return `<div class="page feature-page family-upload-page">
      <p class="page-subtitle">${r.kind==='work'?'可以直接写家书、作文，也可以上传手稿、书法或画作的照片。':r.babyMember?'记到 '+e(P.PEOPLE[r.babyMember].name)+' 的成长时间线':'保存到 '+e(P.Households.current().name)+' 的往事'}</p>
      <form id="material-form" class="family-upload-form" data-feature-form data-actor="${e(P.state.actor)}">
        <input type="hidden" name="kind" value="${e(r.kind)}">
        <input type="hidden" name="subject" value="${e(r.subject)}">
        <div>
          <label class="family-upload-file">${photo}
            <span><strong>${fileLabel}</strong><small role="status">${e(r.loading?'正在读取文件…':r.file?.name||'单份最多 20 MB')}</small></span>
            <input id="material-file" type="file" accept="${FILE_TYPES[r.kind]}*" aria-label="${fileLabel}">
          </label>
          ${r.error?`<p class="feature-error" role="alert">${e(r.error)}</p>`:''}
          ${r.file?b('移除文件','material-remove-file','text-link'):''}
        </div>
        ${babyDate}
        ${r.kind==='work'?`<details class="family-upload-text" ${(r.workOpen??Boolean(r.body))?'open':''}>
          <summary><span>写一段文字</span>${i('down')}</summary>
          <label class="form-field"><span>文字内容</span><textarea id="material-field-body" name="body" rows="4" maxlength="10000">${e(r.body)}</textarea></label>
        </details>`:''}
        <details class="family-upload-info" ${r.infoOpen||r.storyId&&!previousStory?'open':''}>
          <summary><span>标题、说明和关联家人（选填）<small data-upload-related>${related?'已关联 '+e(related):''}</small></span>${i('down')}</summary>
          <label class="form-field"><span>标题</span><input id="material-field-title" name="title" maxlength="80" value="${e(r.title)}" placeholder="${e(r.file||r.body?uploadName(r):'留空时自动生成')}"></label>
          <label class="form-field"><span>说明</span><textarea id="material-field-description" name="description" rows="2" maxlength="2000" placeholder="想记下的细节">${e(r.description)}</textarea></label>
          ${r.babyMember?'':`<label class="form-field"><span>时间</span><input id="material-field-date" name="date" maxlength="80" value="${e(r.date)}" placeholder="例如 1990 年"></label>`}
          ${storyField}${P.Households.memberFields(P.Households.relatedMemberIds(r),r.babyMember)}
        </details>
        <div class="family-upload-audience">${P.Households.audienceFields('material-field-scope',r.scope,r.viewers)}</div>
        <button class="btn full" type="submit" ${r.loading?'disabled':''}>${r.kind==='work'?'保存':'保存到往事'}</button>
      </form>
    </div>`;
  }
  /** 分类添加固定入口人物与类型；编辑原资料仍保留既有归属，时间可暂不确定。 */
  function edit() {
    const s=P.state,r=draft();
    if(isFamilyUpload(r))return familyUpload(r);
    const stories=P.visibleStories().filter(item=>item.subject===r.subject);
    const title=r.id?'更正资料':{clip:'添加视频',photo:'添加照片',work:'添加作品'}[r.kind]||'整理资料';
    const kindLocked=r.fromArchive;
    const subjectLocked=r.fromArchive||r.id;
    const people=s.actor==='father'?s.members:[...new Set([s.actor,...(s.familyInvitations[s.actor]||[])])];
    const fileLabel={photo:'选择照片',clip:'选择视频',work:'添加照片（选填）'}[r.kind];
    const attachment=fileLabel?`<div class="form-field">
      <label for="material-file">${fileLabel}</label>
      <input id="material-file" type="file" accept="${FILE_TYPES[r.kind]}*">
      <p class="caption" role="status">${e(r.loading?'正在读取文件…':r.file?.name||'单份最多 20 MB · 本地演示')}</p>
      ${r.error?`<p class="feature-error" role="alert">${e(r.error)}</p>`:''}
      ${r.file?b('移除已选文件','material-remove-file','text-link'):''}
    </div>`:'';
    const textField=['work','document'].includes(r.kind)?`<div class="form-field">
      <label for="material-field-body">${r.kind==='work'?'文字内容（可和照片一起保存）':'书信或文字正文'}</label>
      <textarea id="material-field-body" name="body" maxlength="10000">${e(r.body)}</textarea>
    </div>`:'';
    return `<div class="page feature-page">
      <h1 class="page-title">${title}</h1>
      ${r.fromFamily?`<p class="page-subtitle">保存到 ${e(P.Households.current().name)} 的往事</p>`:''}
      <form id="material-form" data-feature-form data-actor="${e(s.actor)}">
        <div class="form-field">
          <label for="material-field-kind">资料类型</label>
          <select id="material-field-kind" name="kind" ${kindLocked?'disabled':''}>
            ${Object.entries(KINDS).map(([id,label])=>`<option value="${id}" ${r.kind===id?'selected':''}>${label}</option>`).join('')}
          </select>
          ${kindLocked?`<input type="hidden" name="kind" value="${r.kind}">`:''}
        </div>
        ${r.fromFamily?`<input type="hidden" name="subject" value="${e(r.subject)}">`:`<div class="form-field">
          <label for="material-field-subject">归档到谁的人生</label>
          <select id="material-field-subject" name="subject" ${subjectLocked?'disabled':''}>
            ${people.map(id=>`<option value="${e(id)}" ${r.subject===id?'selected':''}>${e(P.PEOPLE[id].name)}</option>`).join('')}
          </select>
          ${subjectLocked?`<input type="hidden" name="subject" value="${e(r.subject)}">`:''}
        </div>`}
        ${attachment}
        <div class="form-field">
          <label for="material-field-title">资料名称</label>
          <input id="material-field-title" name="title" maxlength="80" value="${e(r.title)}"
            placeholder="${r.kind==='work'?'例如：七岁画的第一幅水彩':'例如：第一次带女儿回老家'}">
        </div>
        <div class="form-field">
          <label for="material-field-date">${r.kind==='work'?'创作时间（选填）':'时间或人生阶段（选填）'}</label>
          <input id="material-field-date" name="date" maxlength="80" value="${e(r.date)}" placeholder="例如：约1990年代、读小学时">
        </div>
        ${textField}
        <div class="form-field">
          <label for="material-field-description">这份资料背后的故事</label>
          <textarea id="material-field-description" name="description" maxlength="2000" placeholder="谁在画面里？当时发生了什么？">${e(r.description)}</textarea>
        </div>
        <div class="form-field">
          <label for="material-field-storyId">关联人生事件</label>
          <select id="material-field-storyId" name="storyId">
            <option value="">暂不关联</option>
            ${stories.map(item=>`<option value="${e(item.id)}" ${r.storyId===item.id?'selected':''}>${e(item.title)}</option>`).join('')}
          </select>
          ${r.kind==='document'?'<p class="caption">书信资料需要关联一段人生事件。</p>':''}
        </div>
        ${P.Households.memberFields(P.Households.relatedMemberIds(r))}
        <div class="form-field">
          <label for="material-field-scope">谁可以看</label>
          <select id="material-field-scope" name="scope">
            ${[['private','仅自己'],['selected','指定家人'],['family','当前家庭成员']].map(([id,label])=>`<option value="${id}" ${r.scope===id?'selected':''}>${label}</option>`).join('')}
          </select>
        </div>
        ${r.scope==='selected'?P.shareViewerOptions(r.viewers):''}
        <div class="feature-actions">
          <button class="btn secondary" type="submit" name="intent" value="draft">保存草稿</button>
          <button class="btn" type="submit" name="intent" value="review">查看整理预览</button>
        </div>
      </form>
    </div>`;
  }
  /** 确认页不把提供者的核对误称为另一个人物的本人认证。 */
  function review() {
    const r=draft(),other=r.subject!==P.state.actor;
    const related=P.Households.relatedMemberNames(r);
    return `<div class="page feature-page"><h1 class="page-title">核对资料与分享</h1><h2>${e(r.title||'未命名资料')}</h2><p class="caption">${r.fromFamily?'家庭：'+e(P.Households.current().name):'归档人物：'+e(P.PEOPLE[r.subject]?.name||'待选择')} · 提供者：${e(P.PEOPLE[P.state.actor].name)}</p>${related?`<p class="caption">关联家人 · ${e(related)}</p>`:''}<p>${e(r.date||'时间待补充')}</p><div class="section">${preview(r)}</div><p class="feature-prose section">${e(r.description)}</p><div class="note section">核对后可见：${r.scope==='private'?'仅提供者自己':viewers(r).map(id=>e(P.PEOPLE[id].name)).join('、')}。${other?'资料将交给归档本人核对；审核时本人可查看本次提交，未确认前不进入公开档案。':r.fromFamily?'由你核对后保存到往事。':'由你核对后进入自己的档案。'}分享不会自动扩展到新成员。</div><form id="material-confirm-form" data-feature-form data-actor="${P.state.actor}" class="section"><label class="check-row"><input name="confirmed" type="checkbox" required><span>我已核对资料及分享对象，了解这是本地演示。</span></label><button class="btn full" type="submit">${other?'提交本人核对':'确认并归档'}</button></form>${l('回去更正','material-edit','text-link full')}</div>`;
  }
  /** 归档只变更既有材料的内容，不改变归档人物或拍摄归属。 */
  function store(item) {
    if(!P.Billing.uploadAllowed(item.subject,item.asset.storageBytes||0,item.assetId)){P.toast('归档容量或保管状态已改变，材料保留待核对。');return false;}
    const items=archiveItems(),existing=items.find(value=>value.id===item.assetId);
    const saved={...item.asset,recordedAt:Date.now(),confirmedBy:item.subject,approvedViewers:[...item.asset.viewers],aiAllowed:item.author===item.subject,inArchive:true};
    if(existing){if(existing.author!==item.author||existing.subject!==item.subject)return false;Object.assign(existing,saved,{id:existing.id});}
    else items.push(saved);
    item.status='accepted';return true;
  }
  /** 影片是补充资料的授权来源，当前家人必须同时拥有档案和影片的查看权限。 */
  function filmForContribution(id) {
    const film=P.PersonArchive.getItem(id),{actor,members}=P.state;
    if(film?.kind!=='film'||film.subject===actor||!members.includes(actor)||!members.includes(film.subject))return null;
    return P.FamilyContext.allowed(film.subject)?film:null;
  }
  /** 通用资料和影片照片写入同一个本人核对队列，退回重提沿用原任务。 */
  function stageSubmission(r,returned) {
    const author=P.state.actor;
    const item={id:returned?.id||P.nextId('submission'),assetId:r.id,title:r.title,subject:r.subject,author,status:'pending',draft:structuredClone(r),asset:asset(r,author,r.id||P.nextId('material'))};
    if(item.subject===item.author)store(item);
    if(returned)return Object.assign(returned,item);
    P.state.materialSubmissions.push(item);
    return item;
  }
  /** 人物、影片和可见范围固定，照片在本人确认后才进入档案。 */
  function queueFilmPhoto(filmId,file,description,submissionId) {
    const film=filmForContribution(filmId),s=P.state;
    if(!film)return '这部影片目前无法补充照片，请联系顾问。';
    const returned=s.materialSubmissions.find(item=>item.id===submissionId&&item.author===s.actor&&item.subject===film.subject&&item.status==='returned'&&item.draft.relatedFilmId===film.id);
    if(submissionId&&!returned)return '这份补充已处理，请返回影片查看。';
    const r={id:'',title:`《${film.title}》的一张老照片`,kind:'photo',subject:film.subject,date:'',description,body:'',storyId:'',relatedFilmId:film.id,scope:'selected',viewers:[film.subject],file};
    const error=validate(r);
    if(!error){
      const item=stageSubmission(r,returned);
      if(returned)item.feedback='';
    }
    return error;
  }
  /** 提供者可以立即撤回原分享；正文更正交由本人重新核对，保留旧已核对版本。 */
  function handleAction(action,el) {
    const s=P.state;
    if(action==='material-stage'){if(Object.hasOwn(STAGES,el.dataset.stage)){s.materialTabs[s.actor]=el.dataset.stage;P.render();}return true;}
    if(action==='material-new'||action==='material-discard-draft'){begin(el,action==='material-discard-draft');return true;}
    if(action==='material-remove-file'){
      const r=draft();
      Object.assign(r,{file:null,loading:false,error:'',readToken:null});
      P.render();
      return true;
    }
    if(action==='material-edit-existing'){
      const item=archiveItems().find(value=>value.id===el.dataset.id&&value.author===s.actor&&value.materialManaged&&!value.relatedFilmId);if(!item)return true;
      const current=s.materialDrafts[s.actor];if(current&&(current.title||current.body||current.file)){if(current.id===item.id)P.navigate('material-edit');else P.toast('请先完成或放弃当前资料草稿，再更正另一份资料。');return true;}
      const file=item.src?{
        data:item.src,name:item.fileName||'原已归档文件',type:item.fileType||FILE_TYPES[item.kind]+'*',
        size:item.fileBytes??item.storageBytes
      }:null;
      s.materialDrafts[s.actor]={id:item.id,title:item.title,kind:item.kind,subject:item.subject,date:item.date,description:item.description,body:item.body.join('\n\n'),storyId:item.relatedStoryId,scope:item.scope,viewers:[...item.viewers],duration:item.duration,loading:false,error:'',file,fromFamily:item.fromFamily,relatedMembers:P.Households.relatedMemberIds(item)};
      P.navigate('material-edit');return true;
    }
    if(action==='material-withdraw'){const item=archiveItems().find(value=>value.id===el.dataset.id&&value.author===s.actor);if(item){item.scope='private';item.viewers=[];for(const pending of s.materialSubmissions.filter(value=>value.assetId===item.id&&value.author===s.actor&&value.status==='pending')){pending.asset.scope='private';pending.asset.viewers=[];pending.draft.scope='private';pending.draft.viewers=[];}P.render();P.toast('已撤回分享，待核对的更正也不会恢复旧分享名单。');}return true;}
    if(action==='material-revise'){
      const item=s.materialSubmissions.find(value=>value.id===el.dataset.id&&value.author===s.actor&&value.status==='returned');
      if(!item)return true;
      if(item.draft.relatedFilmId)P.FamilyMemories.openFilmPhoto(item.draft.relatedFilmId,item);
      else {s.materialDrafts[s.actor]={...structuredClone(item.draft),submissionId:item.id};P.navigate('material-edit');}
      return true;
    }
    if(action==='material-inspect'){
      const item=s.materialSubmissions.find(value=>value.id===el.dataset.id&&value.subject===s.actor&&value.status==='pending');if(!item)return true;
      P.modal('核对家人提供的资料',`<h3>${e(item.title)}</h3><p>${e(item.draft.date||'时间待补充')} · ${e(P.PEOPLE[item.author].name)}提供</p>${preview(item.draft)}<p>${e(item.draft.description)}</p><p class="caption">确认后分享给：${item.asset.scope==='private'?'仅提供者自己':item.asset.viewers.map(id=>e(P.PEOPLE[id].name)).join('、')}。</p>${b('确认并归档','material-approve','btn full',`data-id="${item.id}"`)}<form id="material-return-form" data-id="${item.id}" class="section"><label>需要更正什么？<textarea name="feedback" maxlength="1000" required></textarea></label><button type="submit" class="btn secondary full">退回更正</button></form>`);const form=document.getElementById('material-return-form');form.featureState=s;form.dataset.actor=s.actor;return true;
    }
    if(action==='material-approve'){const item=s.materialSubmissions.find(value=>value.id===el.dataset.id&&value.subject===s.actor&&value.status==='pending');if(item&&store(item)){P.closeModal();P.render();P.toast('已核对并归档；问答引用仍需本人单独授权。');}return true;}
    return false;
  }
  /** 提交时再次验证身份与内容，失败仍保留可继续修改的原草稿。 */
  function submit(form,event) {
    if(form.id==='material-return-form'){if(form.featureState!==P.state||form.dataset.actor!==P.state.actor)return true;const item=P.state.materialSubmissions.find(value=>value.id===form.dataset.id&&value.subject===P.state.actor&&value.status==='pending'),feedback=String(new FormData(form).get('feedback')||'').trim();if(item&&feedback){item.status='returned';item.feedback=feedback;P.closeModal();P.render();}return true;}
    if(!['material-form','material-confirm-form'].includes(form.id))return false;
    if(form.featureState!==P.state||form.dataset.actor!==P.state.actor)return true;
    capture();const r=draft();
    if(form.id==='material-form'&&event.submitter?.value==='draft'){open('drafts');P.toast('资料草稿已保留在当前账号。');return true;}
    const direct=form.id==='material-form'&&isFamilyUpload(r);
    const ready=direct?{...r,title:r.title.trim()||uploadName(r)}:r;
    const error=validate(ready);if(error){P.toast(error);return true;}
    if(form.id==='material-form'&&!direct){P.navigate('material-review');return true;}
    if(!direct&&!new FormData(form).get('confirmed'))return true;
    const returned=P.state.materialSubmissions.find(value=>value.id===r.submissionId&&value.author===P.state.actor&&value.status==='returned');
    const item=stageSubmission(ready,returned);
    form.featureState=null;P.state.materialDrafts[P.state.actor]=null;
    if(item.status==='accepted'&&r.babyMember){
      if(P.state.history?.at(-1)?.split('/')[0]==='house-baby')P.back();
      else P.navigate('house-baby/'+r.babyMember,{replace:true});
      P.toast('已保存到宝宝成长。');
    }else if(item.status==='accepted'&&r.fromFamily&&r.kind==='work'){
      P.Households.openStoryList({person:r.subject,section:'work'});
      P.toast('已保存到作品。');
    }else if(item.status==='accepted'&&r.fromFamily){
      // 家庭档案仅展示共享内容，私密资料保存后进入本人档案的对应分类。
      const related=P.Households.relatedMemberIds(item.asset);
      const privateSection={photo:'photo',clip:'video'}[r.kind]||'recent';
      P.Households.openStoryList(r.scope==='private'?{person:r.subject,section:privateSection}:
        {person:related[0],family:related.length!==1});
      P.toast(r.scope==='private'?'已保存到个人档案。':'已保存到往事。');
    }else{
      open(item.status==='accepted'?'archived':'pending');
      P.toast(item.status==='accepted'?'资料已进入对应人物档案。':'已提交本人核对，尚未向其他家人开放。');
    }
    return true;
  }
  /** 文件读取结果绑定原状态、账号和草稿；切换或重置后不写入另一份资料。 */
  function readFile(input) {
    capture();const s=P.state,actor=s.actor,r=draft(),file=input.files?.[0];if(!file)return;
    const token={};r.readToken=token;r.loading=false;
    if(!file.size||file.size>MAX_FILE_BYTES||!acceptsFile(r.kind,file.type)){
      r.error=`请选择有效且不超过 20 MB 的${r.kind==='clip'?'视频':'图片'}。`;
      P.render();
      return;
    }
    const reader=new FileReader();r.loading=true;r.error='';
    reader.onload=()=>{
      if(P.state!==s||s.materialDrafts[actor]!==r||r.readToken!==token)return;
      r.loading=false;r.duration=0;r.file={name:file.name,type:file.type,size:file.size,data:String(reader.result)};
      if(s.actor===actor&&s.route==='material-edit'){
        const title=document.getElementById('material-field-title');
        if(title&&!title.value&&!isFamilyUpload(r))title.value=file.name.slice(0,80);
        P.render();
      }
    };
    reader.onerror=()=>{if(P.state!==s||s.materialDrafts[actor]!==r||r.readToken!==token)return;r.loading=false;r.error='文件未能读入，请重新选择。';if(s.actor===actor)P.render();};reader.readAsDataURL(file);P.render();
  }
  /** 类型、人物和分享切换先保存现有文字，再更新对应的表单字段。 */
  document.addEventListener('change',event=>{
    if(event.target.id==='material-file')return readFile(event.target);
    const {name}=event.target;
    const form=event.target.closest('#material-form');
    if(!form)return;
    const related=name==='relatedMembers'&&form.querySelector('[data-upload-related]');
    if(related){
      capture();
      const names=P.Households.relatedMemberNames(draft());
      related.textContent=names?'已关联 '+names:'';
      return;
    }
    if(!['kind','subject','scope'].includes(name))return;
    if(name==='scope'&&event.target.hasAttribute('data-record-audience'))return;
    capture();
    if(name==='kind'){
      // 切换类型后，仍在读取的文件不得回填到另一类资料。
      const r=draft();
      Object.assign(r,{loading:false,error:'',readToken:null});
      if(r.file&&!acceptsFile(r.kind,r.file.type))r.file=null;
    }
    P.render();
  });
  /** 只统计交给当前本人处理的资料，不向其他家人显示私有提交数量。 */
  function pendingCount() {return P.state.materialSubmissions.filter(item=>item.subject===P.state.actor&&item.status==='pending').length;}
  /** 个人中心的核对数量与核对页使用同一组本人资料和经历。 */
  function reviewCount(){return pendingCount()+P.state.pending.filter(item=>item.subject===P.state.actor&&item.status==='pending').length;}
  P.MaterialLibrary={view,edit,review,uploadHeader,capture,handleAction,submit,pendingCount,reviewCount,open,filmForContribution,queueFilmPhoto};
  Object.assign(P.views,{materials:view,'material-inbox':inbox,'material-edit':edit,'material-review':review});
}
