/** 照片、视频和作品可直接保存，影片补图由影片本人处理。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,icon:i}=P;
  const MAX_FILE_BYTES=20*1024*1024;
  const KINDS={photo:'照片',clip:'生活视频',work:'作品'};
  const FILE_TYPES={photo:'image/',clip:'video/',work:'image/'};
  const FAMILY_UPLOAD_TYPES={
    photo:{label:'照片',icon:'photo'},
    clip:{label:'视频',icon:'play'},
    work:{label:KINDS.work,icon:'book'}
  };
  /** 每份草稿只属于当前账号；原始文件内容只留在内存，不上传、不自动保存。 */
  function draft() {
    const s=P.state;
    return s.materialDrafts[s.actor] ||= {id:'',title:'',kind:'photo',subject:s.actor,date:'',description:'',body:'',storyId:'',scope:'private',viewers:[],file:null,loading:false,error:''};
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
      poster:image?(r.file?.data||'assets/zhumen/record-writing-corner.webp'):'assets/family.webp',
      src:r.file?.data||'',fileName:r.file?.name||'',fileType:r.file?.type||'',fileBytes:r.file?.size||0,
      duration:Number(r.duration)||0,sourceLabel:P.PEOPLE[author].name+'提供 · 本地补充资料',
      materialManaged:true,storageBytes:contentBytes(r),confirmedBy:null
    };
  }
  /** 任何实际发布都重新校验当前人物、关联事件与文件，草稿允许保留不完整信息。 */
  function validate(r) {
    if(!Object.hasOwn(KINDS,r.kind)||!P.state.members.includes(r.subject))return '请选择有效的资料类型和归档人物。';
    if(r.fromFamily&&r.subject!==P.state.actor)return '请从当前家庭的往事重新添加这份资料。';
    if(P.state.actor!=='father'&&!P.FamilyContext.invited(r.subject))return '请只向邀请你的人物提交资料，已有内容和草稿可在「记录 → 我上传的」查看。';
    if(r.id&&!archiveItems().some(item=>item.id===r.id&&item.author===P.state.actor&&item.subject===r.subject))return '这份资料不能由当前账号更改归属，请返回核对。';
    if(!P.Billing.uploadAllowed(r.subject,contentBytes(r),r.id))return '当前人物已超容量或保管到期，请先整理、导出或续费；原资料不会被删除。';
    if(!r.title.trim())return '请给资料起一个名字。';
    if(r.loading)return '文件正在读入，请稍候再核对。';
    if(['photo','clip'].includes(r.kind)&&!r.file)return '请选择一份本地照片或视频。';
    if(r.file&&!acceptsFile(r.kind,r.file.type))return '文件类型与资料类型不一致，请重新选择。';
    if(r.kind==='work'&&!r.file&&!r.body.trim())return '请添加一张照片，或写下想保存的文字。';
    if(!['private','family','selected'].includes(r.scope))return '请选择分享范围。';
    if(r.scope==='selected'&&!r.viewers.length)return '请选择指定家人，或先设为仅自己。';
    if(r.storyId&&!P.visibleStories().some(item=>item.id===r.storyId&&item.subject===r.subject))return '关联事件已不可用，请重新选择。';
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
  const STAGES = ['drafts', 'pending', 'archived'];
  let progressTarget = null;
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

  function materialListEntry({title, caption, status, photo = '', icon = 'source', details = '', actions = ''}) {
    const visual = photo
      ? `<img class="material-card-photo" src="${e(photo)}" alt="${e(title)}资料缩略图">`
      : `<span class="material-list-icon">${i(icon)}</span>`;
    return `<article class="material-list-entry">
      ${visual}
      <div class="material-list-copy">
        <h3>${e(title)}</h3>
        <div class="material-list-meta">
          <p class="caption">${e(caption)}</p>
          <span class="material-list-status${status === '退回修改' ? ' is-returned' : ''}">${e(status)}</span>
        </div>
        ${details}
        ${actions ? `<div class="material-list-actions">${actions}</div>` : ''}
      </div>
    </article>`;
  }

  /** 已归档资料只读取档案唯一实例，已完成的提交快照不再重复列出。 */
  function archivedCard(item) {
    const id = `data-id="${e(item.id)}"`;
    const edit = item.relatedFilmId || item.subject !== P.state.actor ? '' : b('更正资料', 'material-edit-existing', 'text-link', id);
    return materialListEntry({
      title: item.title,
      caption: P.PEOPLE[item.subject].name,
      status: item.inArchive === false ? '原稿保留，已移出档案' : '已收录',
      photo: item.kind === 'photo' ? item.poster : '',
      actions: b('查看资料' + i('arrow'), 'archive-open', 'text-link', `${id} data-person="${e(item.subject)}"`) +
        edit + b('撤回分享', 'material-withdraw', 'text-link', id)
    });
  }
  /** 三组互斥分类，退回任务正在编辑时只展示当前草稿，已归档快照不与资料重复。 */
  function collections() {
    const s=P.state,r=draft(),groups={drafts:[],pending:[],archived:[]};
    if (hasDraft(r) && r.kind !== 'document') groups.drafts.push(materialListEntry({
      title: r.title || r.file?.name || '未命名资料',
      caption: r.submissionId ? '正在更正' : '资料草稿',
      status: r.submissionId ? '退回修改' : '草稿',
      actions: l('继续整理' + i('arrow'), 'material-edit')
    }));
    for(const item of s.materialSubmissions.filter(item=>item.author===s.actor)){
      if(item.status==='pending')groups.pending.push(submissionCard(item));
      if(item.status==='returned'&&!(hasDraft(r)&&r.submissionId===item.id))groups.drafts.push(submissionCard(item));
    }
    for(const item of s.pending.filter(item=>item.author===s.actor))groups[experienceStage(item)].push(experienceCard(item));
    for(const item of s.stories.filter(item=>item.author===s.actor&&!item.coupleId))groups[experienceStage(item)].push(experienceCard(item));
    for(const item of archiveItems().filter(item=>item.author===s.actor&&item.materialManaged))groups[item.inArchive===false?'drafts':'archived'].push(archivedCard(item));
    return groups;
  }
  /** 合并展示各进度，保留分组内的原有条目顺序。 */
  function view() {
    const groups = collections();
    const entries = STAGES.flatMap(stage => groups[stage]).join('');
    const target = progressTarget;
    progressTarget = null;
    // 保存或提交后只定位一次，日后从记录页进入仍浏览整张列表。
    if (target?.state === P.state && target.actor === P.state.actor && groups[target.stage].length) {
      const preceding = STAGES.slice(0, STAGES.indexOf(target.stage));
      const index = preceding.reduce((count, stage) => count + groups[stage].length, 0);
      requestAnimationFrame(() => {
        if (target.state !== P.state || target.actor !== P.state.actor || P.state.route !== 'materials') return;
        document.querySelector('#app-content .material-list')?.children[index]?.scrollIntoView({block: 'start'});
      });
    }
    return `<div class="page feature-page material-library-page">
      <section class="material-list" aria-label="上传资料">
        ${entries || '<p class="material-library-empty">还没有上传的资料或保存的草稿。</p>'}
      </section>
      <p class="material-library-note">演示内容只保存在当前页面，刷新或重置会还原。</p>
    </div>`;
  }
  /** 保留草稿保存、核对和交片进度入口，带入要定位的状态。 */
  function open(stage, {replace = false} = {}) {
    if (!STAGES.includes(stage)) return;
    progressTarget = {state: P.state, actor: P.state.actor, stage};
    P.navigate('materials', {replace});
  }
  /** 引用原记录并区分共同回忆是否已纳入，退回更正仍走原补充流程。 */
  function experienceCard(item) {
    const target=item.commonWith||item.subject;
    let status='已收录';
    if(item.status==='pending')status='待核对';
    else if(item.status==='returned')status='退回修改';
    else if(item.commonWith&&!P.FamilyContext.inArchive(item,target))status=item.scope==='private'?'仅自己保存':item.inclusions?.[target]?.reviewed?'未纳入对方传记':'等待对方确认';
    const targetAttr = `data-id="${e(item.id)}"`;
    let actions = '';
    if (!item.status) {
      // 档案离线时，提供者仍能在原稿列表调整自己记录的分享范围。
      actions = P.FamilyContext.readable(item) ? l('查看这段经历' + i('arrow'), 'story/' + e(item.id), 'text-link')
        : b('调整分享范围', 'share-owned', 'text-link', targetAttr);
    }
    const summary = `${item.commonWith ? '共同回忆' : '经历'} · ${P.PEOPLE[target].name}`;
    const scope = item.scope === 'private' ? '仅自己' : item.scope === 'selected' ? '指定家人' : '家庭可见';
    const body = `<p class="feature-prose">${e(item.text.join('\n\n'))}</p>`;
    return materialListEntry({
      title: item.title, caption: `${summary} · ${scope}`, status, icon: 'notebook',
      details: body + (item.feedback ? `<p class="material-list-feedback">${e(item.feedback)}</p>` : ''),
      actions
    });
  }
  /** 个人资料归上传人，入口所选家人用于关联。 */
  function begin(el,discard=false) {
    const s=P.state,{person,kind,from,relatedMember}=el.dataset,fromFamily=from==='family';
    if(!Object.hasOwn(KINDS,kind)||person!==s.actor||!P.FamilyContext.allowed(person)){P.toast('请从当前获授权人物的资料分类添加。');return;}
    const r=s.materialDrafts[s.actor];
    if(!discard&&r?.kind!=='document'&&hasDraft(r)){P.modal('已有一份未完成的资料',`<p>《${e(r.title||r.file?.name||'未命名资料')}》仍在当前账号草稿中。</p>${l('继续这份草稿','material-edit','btn full')}${b('放弃这份草稿并新建','material-discard-draft','btn secondary full section',`data-person="${e(person)}" data-kind="${kind}" data-from="${e(from||'archive')}" data-related-member="${e(relatedMember||'')}"`)}`);return;}
    const form=document.getElementById('material-form');if(form)form.featureState=null;
    s.materialDrafts[s.actor]=null;
    Object.assign(draft(),{subject:person,kind,fromFamily,fromArchive:!fromFamily,
      relatedMembers:P.Households.memberIds([fromFamily ? relatedMember : person])});
    P.navigate('material-edit');
  }
  /** 待本人审核的材料仅向提供者与归档本人展示，不提前进入家人的资料列表。 */
  function submissionCard(item) {
    // 缩略图只来自本次待核对快照，不能借展示卡把它发布到人物正式档案。
    const photo=['photo','work'].includes(item.asset?.kind)?item.asset.src:'';
    const status = item.status === 'pending' ? '待核对' : item.status === 'returned' ? '退回修改' : '已收录';
    const caption = `${P.PEOPLE[item.author].name}提供 → ${P.PEOPLE[item.subject].name}`;
    const id = `data-id="${e(item.id)}"`;
    const actions = item.status === 'returned' && item.draft.relatedFilmId
      ? b('按意见更正' + i('arrow'), 'material-revise', 'text-link', id)
      : '';
    return materialListEntry({
      title: item.title, caption, status, photo,
      details: item.feedback ? `<p class="material-list-feedback">${e(item.feedback)}</p>` : '',
      actions
    });
  }
  /** 新上传使用简化表单，已有资料更正使用完整字段。 */
  function isFamilyUpload(r){
    return Boolean(r?.fromFamily&&!r.id&&!r.submissionId&&Object.hasOwn(FAMILY_UPLOAD_TYPES,r.kind));
  }
  function uploadHeader(){
    const r=P.state.materialDrafts[P.state.actor];
    if (r?.id) return '更正资料';
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
    // 老草稿已有的事件关联可以保留或取消，新上传通过关联家人归类。
    const previousStory=r.storyId&&P.visibleStories().find(story=>story.id===r.storyId&&story.subject===r.subject);
    const storyField=r.storyId?`<label class="form-field"><span>原关联的往事</span><select name="storyId">
      <option value="">取消关联</option><option value="${e(r.storyId)}" selected>${e(previousStory?.title||'原往事暂不可用')}</option>
    </select></label>`:'';
    const workClass = r.kind === 'work' ? ' family-work-upload' : '';
    return `<div class="page feature-page family-upload-page family-media-upload${workClass}">
      <p class="page-subtitle">${r.kind==='work'?'可以直接写家书、作文，也可以上传手稿、书法或画作的照片。':'保存到 '+e(P.Households.current().name)+' 的往事'}</p>
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
        ${r.kind==='work'?`<details class="family-upload-text" ${r.workOpen?'open':''}>
          <summary><span>写一段文字</span>${i('down')}</summary>
          <label class="form-field"><span>文字内容</span><textarea id="material-field-body" name="body" rows="4" maxlength="10000">${e(r.body)}</textarea></label>
        </details>`:''}
        <details class="family-upload-info" ${r.infoOpen||r.storyId&&!previousStory?'open':''}>
          <summary><span>标题、说明和关联家人（选填）<small data-upload-related>${related?'已关联 '+e(related):''}</small></span>${i('down')}</summary>
          <label class="form-field"><span>标题</span><input id="material-field-title" name="title" maxlength="80" value="${e(r.title)}" placeholder="${e(r.file||r.body?uploadName(r):'留空时自动生成')}"></label>
          <label class="form-field"><span>说明</span><textarea id="material-field-description" name="description" rows="2" maxlength="2000" placeholder="想记下的细节">${e(r.description)}</textarea></label>
          <label class="form-field"><span>时间</span><input id="material-field-date" name="date" maxlength="80" value="${e(r.date)}" placeholder="例如 1990 年"></label>
          ${storyField}${P.Households.memberFields(P.Households.relatedMemberIds(r))}
        </details>
        <div class="family-upload-audience">${P.Households.audienceFields('material-field-scope',r.scope,r.viewers)}</div>
        <button class="btn full" type="submit" ${r.loading?'disabled':''}>${r.kind==='work'?'保存':'保存到往事'}</button>
      </form>
    </div>`;
  }
  /** 分类添加固定入口人物与类型；编辑原资料仍保留既有归属，时间可暂不确定。 */
  function edit() {
    const s=P.state,r=draft();
    if(r.kind==='document')return P.unavailable('materials', '书信整理入口已关闭。');
    if(r.subject!==s.actor)return P.unavailable('materials', '请在所属人物的档案中查看这份资料。');
    if(isFamilyUpload(r))return familyUpload(r);
    const stories=P.visibleStories().filter(item=>item.subject===r.subject);
    const title=r.id?'更正资料':{clip:'添加视频',photo:'添加照片',work:'添加作品'}[r.kind]||'整理资料';
    const kindLocked=r.fromArchive;
    const fileLabel={photo:'选择照片',clip:'选择视频',work:'添加照片（选填）'}[r.kind];
    const attachment=fileLabel?`<div class="form-field">
      <label for="material-file">${fileLabel}</label>
      <input id="material-file" type="file" accept="${FILE_TYPES[r.kind]}*">
      <p class="caption" role="status">${e(r.loading?'正在读取文件…':r.file?.name||'单份最多 20 MB · 本地演示')}</p>
      ${r.error?`<p class="feature-error" role="alert">${e(r.error)}</p>`:''}
      ${r.file?b('移除已选文件','material-remove-file','text-link'):''}
    </div>`:'';
    const textField=r.kind==='work'?`<div class="form-field">
      <label for="material-field-body">文字内容（可和照片一起保存）</label>
      <textarea id="material-field-body" name="body" maxlength="10000">${e(r.body)}</textarea>
    </div>`:'';
    return `<div class="page feature-page material-editor-page">
      ${r.id?'':`<h1 class="page-title">${title}</h1>`}
      ${r.fromFamily?`<p class="page-subtitle">保存到 ${e(P.Households.current().name)} 的往事</p>`:''}
      <form id="material-form" class="material-editor-sheet" aria-label="${title}" data-feature-form data-actor="${e(s.actor)}">
        <div class="form-field">
          <label for="material-field-title">资料名称</label>
          <input id="material-field-title" name="title" maxlength="80" value="${e(r.title)}"
            placeholder="${r.kind==='work'?'例如：七岁画的第一幅水彩':'例如：第一次带女儿回老家'}">
        </div>
        <div class="form-field">
          <label for="material-field-kind">资料类型</label>
          <select id="material-field-kind" name="kind" ${kindLocked?'disabled':''}>
            ${Object.entries(KINDS).map(([id,label])=>`<option value="${id}" ${r.kind===id?'selected':''}>${label}</option>`).join('')}
          </select>
          ${kindLocked?`<input type="hidden" name="kind" value="${r.kind}">`:''}
        </div>
        <input type="hidden" name="subject" value="${e(r.subject)}">
        ${attachment}
        ${textField}
        <div class="form-field">
          <label for="material-field-date">${r.kind==='work'?'创作时间（选填）':'时间或人生阶段（选填）'}</label>
          <input id="material-field-date" name="date" maxlength="80" value="${e(r.date)}" placeholder="例如：约1990年代、读小学时">
        </div>
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
        </div>
        ${P.Households.memberFields(P.Households.relatedMemberIds(r))}
        <div class="form-field">
          <label for="material-field-scope">谁可以看</label>
          <select id="material-field-scope" name="scope">
            ${[['private','仅自己'],['selected','指定家人'],['family','当前家庭成员']].map(([id,label])=>`<option value="${id}" ${r.scope===id?'selected':''}>${label}</option>`).join('')}
          </select>
        </div>
        ${r.scope==='selected'?P.shareViewerOptions(r.viewers):''}
      </form>
      <div class="material-editor-actions">
        <button class="btn secondary" type="submit" form="material-form" name="intent" value="draft">保存草稿</button>
        <button class="btn" type="submit" form="material-form" name="intent" value="save">保存资料</button>
      </div>
    </div>`;
  }
  /** 保存前重查容量和原资料归属，避免旧表单覆盖其他家人的资料。 */
  function saveAsset(material, existingId) {
    const {subject, author, storageBytes, viewers: approvedViewers} = material;
    if (!P.Billing.uploadAllowed(subject, storageBytes, existingId)) {
      P.toast('归档容量或保管状态已改变，资料尚未保存。');
      return false;
    }
    const items = archiveItems();
    const existing = existingId ? items.find(item => item.id === existingId) : null;
    if (existingId && (!existing || existing.author !== author || existing.subject !== subject)) {
      P.toast('原资料已变化，请返回列表重新打开。');
      return false;
    }
    const saved = {...material, recordedAt: Date.now(), confirmedBy: subject, approvedViewers: [...approvedViewers],
      aiAllowed: author === subject, inArchive: true};
    if (existing) Object.assign(existing, saved);
    else items.push(saved);
    return true;
  }
  /** 影片是补充资料的授权来源，当前家人必须同时拥有档案和影片的查看权限。 */
  function filmForContribution(id) {
    const film=P.PersonArchive.getItem(id),{actor,members}=P.state;
    if(film?.kind!=='film'||film.subject===actor||!members.includes(actor)||!members.includes(film.subject))return null;
    return P.FamilyContext.allowed(film.subject)?film:null;
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
      const item={id:returned?.id||P.nextId('submission'),assetId:'',title:r.title,subject:r.subject,author:s.actor,status:'pending',draft:r,asset:asset(r,s.actor),feedback:''};
      if(returned)Object.assign(returned,item);
      else s.materialSubmissions.push(item);
    }
    return error;
  }
  /** 核对入口随原影片显示，只允许影片本人处理该影片的待办。 */
  function pendingFilmPhoto(id) {
    const {actor,route,archiveItemId,materialSubmissions}=P.state;
    const film = route === 'archive-item' ? P.PersonArchive.getItem(archiveItemId) : null;
    if(film?.kind!=='film'||film.subject!==actor)return null;
    return materialSubmissions.find(item=>item.id===id&&item.subject===actor&&item.status==='pending'&&item.draft.relatedFilmId===archiveItemId);
  }
  /** 提供者可撤回分享，并在原编辑页保存自己的资料。 */
  function handleAction(action,el) {
    const s=P.state;
    if(action==='material-new'||action==='material-discard-draft'){begin(el,action==='material-discard-draft');return true;}
    if(action==='material-remove-file'){
      const r=draft();
      Object.assign(r,{file:null,loading:false,error:'',readToken:null});
      P.render();
      return true;
    }
    if(action==='material-edit-existing'){
      const item=archiveItems().find(value=>value.id===el.dataset.id&&value.author===s.actor&&value.subject===s.actor&&value.materialManaged&&!value.relatedFilmId);if(!item)return true;
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
      return true;
    }
    if(action==='material-inspect'){
      const item=pendingFilmPhoto(el.dataset.id);if(!item)return true;
      P.modal('核对家人提供的资料',`<h3>${e(item.title)}</h3><p>${e(item.draft.date||'时间待补充')} · ${e(P.PEOPLE[item.author].name)}提供</p>${preview(item.draft)}<p>${e(item.draft.description)}</p><p class="caption">确认后分享给：${item.asset.scope==='private'?'仅提供者自己':item.asset.viewers.map(id=>e(P.PEOPLE[id].name)).join('、')}。</p>${b('确认并归档','material-approve','btn full',`data-id="${item.id}"`)}<form id="material-return-form" data-id="${item.id}" class="section"><label>需要更正什么？<textarea name="feedback" maxlength="1000" required></textarea></label><button type="submit" class="btn secondary full">退回更正</button></form>`);const form=document.getElementById('material-return-form');form.featureState=s;form.dataset.actor=s.actor;return true;
    }
    if(action==='material-approve'){
      const item=pendingFilmPhoto(el.dataset.id);
      if(item&&saveAsset(item.asset,item.assetId)){
        item.status='accepted';
        P.closeModal();P.render();P.toast('照片已收录到这部影片。');
      }
      return true;
    }
    return false;
  }
  /** 提交时再次验证身份与内容，失败仍保留可继续修改的原草稿。 */
  function submit(form,event) {
    if(form.id==='material-return-form'){if(form.featureState!==P.state||form.dataset.actor!==P.state.actor)return true;const item=pendingFilmPhoto(form.dataset.id),feedback=String(new FormData(form).get('feedback')||'').trim();if(item&&feedback){item.status='returned';item.feedback=feedback;P.closeModal();P.render();}return true;}
    if(form.id!=='material-form')return false;
    if(form.featureState!==P.state||form.dataset.actor!==P.state.actor)return true;
    capture();const r=draft();
    if(event.submitter?.value==='draft'){open('drafts');P.toast('资料草稿已保留在当前账号。');return true;}
    const direct=isFamilyUpload(r);
    const ready=direct?{...r,title:r.title.trim()||uploadName(r)}:r;
    if(r.subject!==P.state.actor){P.toast('请从自己的记录添加或更正资料。');return true;}
    const error=validate(ready);if(error){P.toast(error);return true;}
    const saved=asset(ready,P.state.actor,r.id||P.nextId('material'));
    if(!saveAsset(saved,r.id))return true;
    form.featureState=null;P.state.materialDrafts[P.state.actor]=null;
    if(direct&&r.kind==='work'){
      // 新作品直接保存后替换上传表单，保留打开表单的入口。
      P.Households.openStoryList({person:r.subject,section:'work'}, {replace: true});
      P.toast('已保存到作品。');
    }else if(direct){
      // 家庭档案仅展示共享内容，私密资料保存后进入本人档案的对应分类。
      const related=P.Households.relatedMemberIds(saved);
      const privateSection={photo:'photo',clip:'video'}[r.kind]||'recent';
      P.Households.openStoryList(r.scope==='private'?{person:r.subject,section:privateSection}:
        {person:related[0],family:related.length!==1}, {replace: true});
      P.toast(r.scope==='private'?'已保存到人物志。':'已保存到往事。');
    }else{
      // 更正后的资料直接回已收录列表，历史记录不再停留在已提交的表单。
      open('archived', {replace: true});
      P.toast('资料已保存。');
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
  P.MaterialLibrary={view,edit,uploadHeader,capture,handleAction,submit,open,filmForContribution,queueFilmPhoto};
  Object.assign(P.views,{materials:view,'material-edit':edit});
}
