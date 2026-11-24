/** 人物资料库：统一人物归属、拍摄者、可见范围，以及影片、相册和传记的查看入口。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,icon:i,badge:t,avatar:a}=P;
  const TABS={overview:'档案总览',video:'视频',photo:'照片',biography:'传记',work:'作品',place:'足迹'};
  const VIDEO_FILTERS={all:'全部视频',film:'人生影片',self:'本人拍摄',family:'家人拍摄'};
  const TYPES={film:'人生影片',photo:'照片',clip:'生活影像',work:TABS.work,document:'书信与原始资料'};
  /** 已有示例资料视为完成本人问答授权；新增家人材料仍须逐份确认，重置时重建。 */
  function ensure() {
    const s=P.state;
    if(s.archiveAssets===null)s.archiveAssets=structuredClone(P.ARCHIVE_DATA.assets).map(item=>({...item,aiAllowed:true}));
    if(s.archiveProfiles===null)s.archiveProfiles=structuredClone(P.ARCHIVE_DATA.people);
    return s;
  }
  /** 选择谁的档案不会改变登录账号，资料仍检查当前访问者的授权。 */
  function readable(item) {return P.FamilyContext.readable(item);}
  /** 追问与来源回看只取得当前获授权的单份资料，不暴露私密条目的正文或媒体路径。 */
  function getItem(id) {const item=ensure().archiveAssets.find(asset=>asset.id===id);return assetReadable(item)?item:null;}
  /** 事件资料同时服从自身和所属事件的权限，直接打开家书地址也不能绕过事件授权。 */
  function assetReadable(item) {return readable(item) && (item.kind!=='document' || P.visibleStories().some(story=>story.id===item.relatedStoryId && story.subject===item.subject));}
  /** 视频合并归档人物与本人拍摄的范围；其他资料按归档人物查询，不生成重复视频条目。 */
  function assets(person,tab) {
    if(!['video','photo','work'].includes(tab))return [];
    return ensure().archiveAssets.filter(item=>assetReadable(item)&&item.inArchive!==false&&(tab==='video'?(item.kind==='film'&&item.subject===person || item.kind==='clip'&&(item.subject===person || item.author===person)):item.subject===person&&item.kind===tab));
  }
  /** 记录页按原分类展示，助手可查询获授权的影片和原始资料。 */
  function familyMaterials({mine=false,includeArchive=false,includePrivate=false,includeAllMedia=false}={}) {
    return ensure().archiveAssets.filter(item=>(includeArchive||item.materialManaged)&&
      (includeAllMedia||(!item.relatedFilmId&&['photo','clip','work'].includes(item.kind)))&&assetReadable(item)&&
      (mine?item.author===P.state.actor:item.inArchive!==false&&(includePrivate||item.scope!=='private')));
  }
  /** 人生影片优先作为成片类型；生活影像按当前查看人物与拍摄者的关系互斥分类。 */
  function videoType(item,person) {return item.kind==='film'?'film':item.author===person?'self':'family';}
  /** 筛选只改变同一资料集合的查看方式，数量与列表采用相同授权及分类规则。 */
  function videos(person,filter='all') {return Object.hasOwn(VIDEO_FILTERS,filter)?assets(person,'video').filter(item=>filter==='all' || videoType(item,person)===filter):[];}
  /** 交片只取已完成拍摄且仍可在线查看的本人正片。家人档案和生活片段不作为交片替代。 */
  function deliveredFilm() {
    const actor=P.state.actor;
    return P.FamilyContext.allowed(actor)?videos(actor,'film')[0]:null;
  }
  function videoPlayer(item, { poster = item.poster } = {}) {
    return `<video data-archive-video="${e(item.id)}" controls playsinline preload="metadata" ${poster ? `poster="${e(poster)}"` : ''} src="${e(item.src)}" aria-label="${e(item.title)}">当前浏览器不支持视频播放。</video>`;
  }
  /** 独立交片页保留示例说明，播放由本人主动发起，返回后可继续浏览家庭内容。 */
  function delivery() {
    const film=deliveredFilm();
    if(!film)return `<div class="page empty"><h2>当前账号暂无可查看的交付影片</h2><p>请核对登录身份，或联系交片顾问。</p>${l('回到我家','home','btn')}</div>`;
    return `<div class="page archive-detail film-delivery-page"><h2 class="page-title">${e(film.title)}</h2><p class="page-subtitle">纪录片已交付，可以开始观看。</p>${b('播放纪录片','play-delivered-film','btn full section')}<div class="archive-player section">${videoPlayer(film)}<p id="archive-video-status" class="caption" role="status">${e(film.sourceLabel)} · ${P.duration(film.duration)}</p></div>${P.FamilyMemories?.filmContribution?.(film)||''}${b(P.state.fontLarge?'使用标准字号':'使用大字号','toggle-font','text-link section')}${captionsView(film)}</div>`;
  }
  /** 一个视频入口内呈现全部及三个互斥类型，包含当前可见数量和准确的空态。 */
  function videoView(person) {
    const filter=P.state.videoFilter,items=videos(person,filter);
    const controls=Object.entries(VIDEO_FILTERS).map(([value,label])=>b(`${label} <span>${videos(person,value).length}</span>`,'video-filter',filter===value?'active':'',`data-value="${value}" aria-pressed="${filter===value}"`)).join('');
    return `<div class="section-heading"><h2>视频 <small>${videos(person).length}</small></h2></div><p class="caption">关于${e(P.PEOPLE[person].name)}的影片，以及这位家人拍下的片段，集中保存在这里。拍摄类型以当前查看人物为准。</p><div class="video-type-filters" role="group" aria-label="视频类型">${controls}</div>${items.length?`<div class="archive-grid section">${items.map(item=>card(item,person)).join('')}</div>`:`<div class="empty">${i('play')}<h2>暂无向你开放的${filter==='all'?'视频':VIDEO_FILTERS[filter]}</h2><p>可以切换其他视频类型，或等待资料分享。</p></div>`}`;
  }
  /** 传记正文整份授权，缺失或未开放时不从其他素材猜测生平。 */
  function biography(person) {
    const profile=ensure().archiveProfiles[person];
    if(profile||(!P.state.familyWorkspace&&person!==P.state.actor))return readable(profile)?profile:null;
    // 新家庭用已确认、当前可见的往事编排传记。每章仍引用原记录。
    const records=events(person).filter(story=>story.confirmedBy||story.inclusions?.[person]?.reviewed);
    if(!records.length)return null;
    return {author:person,tagline:P.PEOPLE[person].name+'的人生记录',bioIntro:'从已经留下的往事，慢慢读到今天。',
      sourceLabel:'按已确认的家庭记录整理',sections:[...records].reverse().map(story=>({
        id:'event-'+story.id,title:story.title,years:story.year+' 年',body:[],storyIds:[story.id]
      }))};
  }
  /** 完整阅读和事件浏览均从当前事件实例取正文，不在传记模板另存一份经历。 */
  function events(person) {return P.visibleStories().filter(item=>P.FamilyContext.inArchive(item,person)).sort((left,right)=>Number(right.year)-Number(left.year));}
  /** 章节叙述与获授权事件组合为即时阅读内容，不改变原记录或扩大其分享范围。 */
  function chapter(person,id) {
    const section=biography(person)?.sections.find(item=>item.id===id);if(!section)return null;
    const stories=events(person).filter(item=>(section.storyIds || []).includes(item.id));
    return {...section,stories,body:[...section.body,...stories.flatMap(item=>item.text)]};
  }
  /** 家书、照片及影像属于具体事件的材料，查看入口先校验事件再校验每份资料。 */
  function storyMaterials(story) {
    if(!P.visibleStories().some(item=>item.id===story.id))return '';
    const items=ensure().archiveAssets.filter(item=>item.relatedStoryId===story.id && item.subject===story.subject && assetReadable(item));
    return `<section class="section event-materials"><div class="section-heading"><h2>这段经历的资料 <small>${items.length}</small></h2></div><p class="caption">相关照片、影像、书信与原始资料，按各自授权展示。</p>${items.length?`<div class="archive-grid">${items.map(item=>card(item,story.subject,story.id)).join('')}</div>`:'<p class="caption">这段经历暂时没有向你开放的附加资料。</p>'}</section>`;
  }
  /** 视频合并后保留四个入口：视频、照片、传记及作品。 */
  function shortcuts(person) {
    const profile=biography(person);
    const items=[['video','play',videos(person).length+' 段','人生影片、本人及家人拍摄'],['photo','photo',assets(person,'photo').length+' 张','人物、生活与地点照片'],['biography','book',profile?profile.sections.length+' 章':ensure().archiveProfiles[person]?'未开放':'待整理','完整阅读与按事件浏览'],['work','book',assets(person,'work').length+' 件','手稿、文章、习作与书画']];
    return `<div class="archive-shortcuts">${items.map(([id,icon,count,note])=>b(`${i(icon)}<strong>${TABS[id]}</strong><span>${count}</span><small>${note}</small>`,'archive-tab',`archive-shortcut ${P.state.lifeTab===id?'active':''}`,`data-value="${id}"`)).join('')}</div>`;
  }
  /** 首页主影片只通过封面进入视频，封面时长与离线示例片一致。 */
  function filmCard(person='father') {
    const item=videos(person,'film')[0];
    if(!item)return '';
    return `<button class="film-cover" type="button" data-action="archive-open" data-id="${item.id}" data-person="${person}" data-tab="video" data-video-filter="film" aria-label="播放${e(item.title)}"><img src="${item.poster}" alt="${e(item.title)}，示例封面"><span class="film-play">${i('play')}<span>${P.duration(item.duration)} · 演示片段</span></span><span class="film-shade"></span></button><div class="film-caption"><div><h2 class="serif">${e(item.title)}</h2><p class="caption">归档于 ${e(P.PEOPLE[person].name)} · 人生影片</p></div></div>`;
  }
  /** 卡片同时标明类型与人物，视频归档人和拍摄者不混为一谈。 */
  function card(item,person,storyId='',family=false) {
    const video=['film','clip'].includes(item.kind);
    const label=video?VIDEO_FILTERS[videoType(item,person)]:TYPES[item.kind];
    const related=family?P.Households.relatedMemberNames(item):'';
    const scope=item.scope==='private'?t('仅自己','warm'):family&&item.scope==='selected'?t('指定家人','gray'):'';
    const alt=family?'':e(item.title)+'，示例封面';
    const playback=video?`<span class="archive-cover-playback">
      ${i('play')}<span class="archive-cover-duration">${P.duration(item.duration)}</span>
    </span>`:'';
    const credits=`${item.kind==='clip'&&!family?`<em>归档人物：${e(P.PEOPLE[item.subject]?.name||'家人')}</em>`:''}
      ${item.kind==='clip'?`<em>拍摄者：${e(P.PEOPLE[item.author]?.name||'家人')}</em>`:''}
      ${family&&item.kind!=='clip'?`<em>提供者：${e(P.PEOPLE[item.author]?.name||'家人')}</em>`:''}
      ${related?`<em>关联家人：${e(related)}</em>`:''}`;
    const content=`<span class="archive-cover"><img src="${e(item.poster)}" alt="${alt}">${playback}</span>
      <span class="archive-card-copy">
        <span class="tags">${t(label,'gray')}${scope}</span><strong>${e(item.title)}</strong><small>${e(item.date)}</small>
        ${video?`<span class="archive-card-credits">${credits}</span>`:credits}
      </span>`;
    return family?l(content,'archive-item/'+e(item.id),'archive-media-card'):
      b(content,'archive-open','archive-media-card',`data-id="${e(item.id)}" data-person="${e(person)}" data-story-id="${e(storyId)}"`);
  }
  function familyCard(item,person){
    return card(item,person||item.subject,'',true);
  }
  /** 分类无资料时提供明确空态，不用不相干人物的内容填满页面。 */
  function listing(person,tab) {
    const items=assets(person,tab);
    const note=tab==='photo'?'这里收录人物、生活与地点照片。文章和书画照片可到「作品」查看。':'家书、作文、手稿和书画照片都可以保存在这里。';
    return `<div class="section-heading"><h2>${TABS[tab]} <small>${items.length}</small></h2></div><p class="caption">${note}</p>${items.length?`<div class="archive-grid section">${items.map(item=>card(item,person)).join('')}</div>`:`<div class="empty">${i(tab==='photo'?'photo':'book')}<h2>暂无向你开放的${TABS[tab]}</h2><p>这里只展示这位家人的已授权资料。</p></div>`}`;
  }
  /** 传记内提供完整阅读与事件浏览；制作入口由档案页顶部统一提供。 */
  function biographyView(person) {
    const mode=P.state.biographyMode;
    const toggle=`<div class="biography-mode-switch" role="group" aria-label="传记查看方式">${[['read','完整阅读'],['events','按事件浏览']].map(([value,label])=>b(label,'biography-mode',mode===value?'active':'',`data-value="${value}" aria-pressed="${mode===value}"`)).join('')}</div>`;
    return `${toggle}${mode==='events'?eventView(person):readingView(person)}`;
  }
  /** 全部章节默认展开以便连贯阅读；正文引用当前事件，章节末尾直达事件及资料。 */
  function chapterView(person,id) {
    const section=chapter(person,id);if(!section)return '';
    const links=section.stories.map(item=>l('查看这段事件及资料：'+e(item.title),'story/'+item.id,'text-link full')).join('');
    return `<details class="archive-chapter" data-archive-chapter="${e(id)}" open><summary><span>${e(section.title)}</span><small>${e(section.years)}</small></summary>${section.body.map(text=>`<p class="story-paragraph">${e(text)}</p>`).join('')}${!section.body.length?'<p class="caption">本章关联的事件暂无向你开放的正文。</p>':''}${links}</details>`;
  }
  /** 新增且尚未编排进章节的事件仍在完整阅读出现，避免与事件浏览形成两份内容。 */
  function additionalEvents(person,profile) {
    const assigned=new Set(profile.sections.flatMap(section=>section.storyIds || [])),items=events(person).filter(item=>!assigned.has(item.id));
    return items.length?`<section class="section biography-additions"><h3>继续写下的人生</h3>${items.map(item=>`<article><h4>${e(item.year)} · ${e(item.title)}</h4>${item.text.map(text=>`<p class="story-paragraph">${e(text)}</p>`).join('')}${l('查看这段事件及资料','story/'+item.id,'text-link')}</article>`).join('')}</section>`:'';
  }
  /** 传记编排自身授权，所引用事件仍另行按访问者权限过滤。 */
  function readingView(person) {
    const profile=biography(person);
    if(!profile){const exists=ensure().archiveProfiles[person];return `<div class="empty">${i(exists?'lock':'book')}<h2>${exists?'传记暂未向你开放':'尚未整理这位家人的传记'}</h2><p>本人确认并分享后，可以在这里按章节阅读。</p></div>`;}
    return `<article class="archive-biography"><p class="eyebrow">${e(P.PEOPLE[person].name)} · 传记</p><h2 class="serif">${e(profile.tagline)}</h2><p class="story-paragraph">${e(profile.bioIntro)}</p><div class="note"><p>${e(profile.sourceLabel)}</p></div><h3 class="section">完整阅读 · ${profile.sections.length} 章</h3>${profile.sections.map(section=>chapterView(person,section.id)).join('')}${additionalEvents(person,profile)}</article>`;
  }
  /** 事件是传记内部的另一种阅读方式，沿用原事件详情、追问和补充流程。 */
  function eventView(person) {
    const items=events(person);
    return `<div class="section-heading"><h2>个人事迹 <small>${items.length}</small></h2></div><p class="caption">与完整阅读使用同一份事件记录，点击查看经过、来源及相关资料。</p>${items.length?items.map(item=>l(`<span class="archive-story-year">${e(item.year)}</span><span><strong>${e(item.title)}</strong><small>${e(item.quote || item.text[0])}</small></span>${i('arrow')}`,'story/'+item.id,'archive-story-row')).join(''):`<div class="empty"><h2>暂无向你开放的人生事件</h2><p>这里只展示当前人物的已授权记录。</p></div>`}`;
  }
  /** 总览只展示四类内容预览，完整分类统一使用上方入口，不再复制一套分类按钮。 */
  function overview(person) {
    const videoItems=videos(person),photos=assets(person,'photo'),works=assets(person,'work'),profile=biography(person);
    return `<p class="caption archive-preview-note">下方展示部分资料预览，完整内容请使用上方四个分类。</p><section data-archive-preview="video"><h2>视频预览</h2>${videoItems.length?`<div class="archive-grid section">${videoItems.slice(0,2).map(item=>card(item,person)).join('')}</div>`:'<p class="caption">暂无向你开放的视频。</p>'}</section><section class="section" data-archive-preview="photo"><h2>照片预览</h2>${photos.length?`<div class="archive-photo-strip section">${photos.slice(0,3).map(item=>card(item,person)).join('')}</div>`:'<p class="caption">暂无向你开放的照片。</p>'}</section><section class="archive-bio-preview section" data-archive-preview="biography"><h2>传记预览</h2><p>${e(profile?.bioIntro || '这位家人分享传记后，就能在这里读到这一路的故事。')}</p></section><section class="section" data-archive-preview="work"><h2>作品预览</h2>${works.length?`<div class="archive-grid section">${works.slice(0,2).map(item=>card(item,person)).join('')}</div>`:'<p class="caption">暂无向你开放的作品。</p>'}</section>`;
  }
  /** 地点沿用获授权事件，场景示例明确非实拍；能进入空间与仅有记录分别标示。 */
  function placeView(person) {
    if(P.state.familyWorkspace&&person==='father'&&P.state.accounts.father.hasSpace){
      return `<h2>足迹</h2><div class="card section"><h3>回忆里的家</h3><p>家庭 VR 已模拟交付，场景以通用示例呈现。</p>
        ${l('查看故里 VR 服务','house-service/vr','btn secondary full')}</div>`;
    }
    const stories=events(person),places=P.ARCHIVE_DATA.places.filter(place=>place.subject===person&&place.storyIds.some(id=>stories.some(story=>story.id===id)));
    return `<h2>足迹</h2><p class="caption">按生活过的地方探索同一份人生记录；能否进入空间会单独标明。</p>${places.length?`<div class="archive-place-list section">${places.map(place=>`<article class="archive-place-card" data-place-id="${place.id}"><img src="${place.hasSpace?'assets/room-portrait.webp':'assets/room.webp'}" alt="${e(place.title)}的AI场景示例，不代表历史实拍"><div class="section-heading"><h3>${e(place.title)}</h3>${t(place.hasSpace?'可走进老家':'仅事件记录','gray')}</div><p>${e(place.description)}</p>${place.hasSpace?l('查看故里 VR 服务','house-service/vr','btn secondary full'):''}${stories.filter(story=>place.storyIds.includes(story.id)).map(story=>l('查看关联事件：'+e(story.title),'story/'+story.id,'text-link full')).join('')}</article>`).join('')}</div>`:'<div class="empty"><h3>暂无向你开放的足迹</h3><p>整理并分享地点相关经历后，可以在这里查看。</p></div>'}`;
  }
  /** 照片翻页遵守进入时的范围，事件资料中的照片不会扩展为整个人物相册。 */
  function photoSequence(person,storyId='') {
    const photos=assets(person,'photo');
    if(!storyId)return photos;
    return P.visibleStories().some(story=>story.id===storyId&&story.subject===person)?photos.filter(item=>item.relatedStoryId===storyId):[];
  }
  /** 范围失效时不给出错误的 0/0 页码；照片本身若仍获授权，可继续单独阅读。 */
  function photoControls(photos,index,label) {
    if(index<0)return '<p class="caption">可以返回照片分类查看当前范围内的照片。</p>';
    return `<div class="archive-photo-controls">${b('上一张','archive-photo-step','btn secondary compact',`data-step="-1" ${index===0?'disabled':''}`)}<span>${label} ${index+1} / ${photos.length}</span>${b('下一张','archive-photo-step','btn secondary compact',`data-step="1" ${index>=photos.length-1?'disabled':''}`)}</div>`;
  }
  /** 返回文案沿用真实来源名称，事件资料只保留一个回到原事件的入口。 */
  function returnLabel(context) {
    const story=P.visibleStories().find(item=>item.id===context.storyId);
    if(story)return '返回事件：'+story.title;
    if(context.storyId)return '返回来源事件';
    const filter=context.tab==='video'&&context.videoFilter&&context.videoFilter!=='all'?' · '+VIDEO_FILTERS[context.videoFilter]:'';
    return '返回'+P.PEOPLE[context.person].name+'的'+TABS[context.tab]+filter;
  }
  /** 添加操作放在具体分类，当前人物和资料类型由入口一次带入。 */
  function addEntry(person,tab) {
    const entries={video:['clip','添加视频'],photo:['photo','添加照片'],biography:['biography','补充一段经历'],work:['work','添加作品']};
    const entry=entries[tab];
    return entry?`<div class="feature-entry">${b(i('plus')+' '+entry[1],'material-new','btn secondary',`data-person="${person}" data-kind="${entry[0]}"`)}</div>`:'';
  }
  /** 人物选择与登录账号分离；已完成视频建档的本人在自己的档案顶部进入纪念书。 */
  function view() {
    const retentionPerson=P.state.archivePerson;if(!P.Billing.online(retentionPerson))return `<div class="page empty"><h1>线上保管已结束</h1><p>原稿未在本演示中删除。可导出本人资料或选择保管服务。</p>${P.button('导出我的资料迁出清单','billing-export','btn')}${P.link('查看保管权益','membership','text-link full section')}</div>`;
    const s=ensure(),person=s.archivePerson;
    if(!s.members.includes(person) || !P.PEOPLE[person])return `<div class="page empty"><h2>没有找到这位人物的档案</h2>${l('返回家庭','family','btn')}</div>`;
    if(person!==s.actor&&!P.FamilyContext.allowed(person))return P.FamilyContext.locked('archive',person);
    const profile=biography(person),tab=s.lifeTab;
    const recordAction=person===s.actor?b('记录一刻','material-new','btn full',`data-person="${e(person)}" data-kind="biography"`):l('记录一刻','record','btn full');
    let body=tab==='overview'?overview(person):tab==='video'?videoView(person):tab==='biography'?biographyView(person):tab==='place'?placeView(person):listing(person,tab);
    // 人物主页与人物志共用交付和授权判断，进入资料分类后专注于浏览该类内容。
    if (tab === 'overview') body = P.Households.storyPersonServices(person) + body;
    // 仅陈远山使用其已有二维示例封面，其余人物保留各自头像，避免错配人物。
    return `<div class="page person-archive-page" data-archive-person="${e(person)}"><div class="archive-cover-heading">${s.actor==='father'?`<div class="form-field archive-person-picker"><label for="archive-person-select">当前查看的人物档案</label><select id="archive-person-select">${s.members.map(id=>`<option value="${id}" ${person===id?'selected':''}>${e(P.PEOPLE[id].name)} · ${e(P.relation(id))}</option>`).join('')}</select></div>`:person!==s.actor?P.FamilyContext.picker():''}<div class="person-heading">${a(person,'large')}<div><h1 class="page-title">${e(P.PEOPLE[person].name)}</h1><p class="caption">${e(P.PEOPLE[person].name)}的人物档案</p><p class="caption">${e(P.relation(person))}${P.PEOPLE[person].born?' · '+e(P.PEOPLE[person].born)+' 年生':''}</p></div></div><p class="page-subtitle">${e(profile?.tagline || '在这里保存影片、相片、传记与创作。')}</p></div>${P.KeepsakeBooks.entry(person)}<div class="section ${tab==='overview'?'':'heritage-family-shortcuts'}">${tab==='overview'?'':l('全家共同往事','house-stories/family','btn secondary')}${recordAction}</div>${shortcuts(person)}<nav class="archive-secondary-tabs" aria-label="档案浏览视角">${['overview','place'].map(id=>b(TABS[id],'archive-tab',tab===id?'active':'',`data-value="${id}"`)).join('')}</nav><section class="archive-content" data-archive-tab="${tab}">${addEntry(person,tab)}${body}</section><p class="archive-demo-note">${s.familyWorkspace?'此家庭的资料来自当前演示填写和选择的文件。':'示例人物与示例资料。'}</p></div>`;
  }
  /** 来源上下文绑定被打开的条目，跨人物拍摄的片段返回时仍保留原资料分区。 */
  function origin(item) {
    if(item.kind==='document')return {person:item.subject,tab:'biography',storyId:item.relatedStoryId};
    const value=P.state.archiveReturn;
    return value?.itemId===item.id?value:{person:item.subject,tab:item.kind==='photo'?'photo':item.kind==='work'?'work':'video',videoFilter:'all'};
  }
  /** 原生字幕之外保留可读文稿，浏览器不支持字幕接口时仍可查看字幕内容。 */
  function captionsView(item) {
    const cues=P.ARCHIVE_DATA.captions[item.src] || [];
    return cues.length?`<details class="archive-captions"><summary>查看示例字幕</summary><ol>${cues.map(cue=>`<li><span>${P.duration(cue.start)}—${P.duration(cue.end)}</span><p>${e(cue.text)}</p></li>`).join('')}</ol></details>`:'';
  }
  function detailMeta(fields){
    const rows=fields.filter(([,value])=>value).map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`);
    return `<dl class="archive-meta">${rows.join('')}</dl>`;
  }
  /** 媒体详情先校验授权，再输出媒体、创作展示图、正文与带当前资料的追问入口。 */
  function detail() {
    const s=ensure(),item=s.archiveAssets.find(asset=>asset.id===s.archiveItemId);
    const fromList=P.Households.fromStoryList();
    const from=s.history?.at(-1)?.split('/')[0];
    const fromHomeAlbum=from==='home'&&s.albumReturn?.route==='archive-item/'+s.archiveItemId;
    const fromFilmIntro = from === 'house-film-intro';
    const listLabel=fromHomeAlbum?'返回相册':{'house-baby':'返回成长相册','house-elders':'返回有声相册','house-assistant':'返回'+P.FamilyAssistant.title,'house-film-intro':'返回影片介绍'}[from]||'返回记录';
    const returnControl=fromList||fromHomeAlbum||from==='house-assistant'||fromFilmIntro?b(listLabel,'back','btn'):l('返回记录','house-stories','btn');
    if(!item)return `<div class="page empty"><h2>没有找到这份档案资料</h2>${returnControl}</div>`;
    if(!assetReadable(item))return `<div class="page empty">${i('lock')}<h2>这份资料暂未向你开放</h2>${returnControl}</div>`;
    const context=origin(item),video=['film','clip'].includes(item.kind),label=video?VIDEO_FILTERS[videoType(item,context.person)]:TYPES[item.kind];
    let media;
    if(video){
      const note=item.materialManaged?'家庭成员提供的视频':`${P.duration(item.duration)} · 无声演示片段，可播放、暂停或拖动进度。`;
      media=`${videoPlayer(item)}
        <p id="archive-video-status" class="caption" role="status">${note}</p>`;
    }else if(item.kind==='photo'){
      const listPhotos=P.Households.storyListPhotos();
      const photos=listPhotos??photoSequence(context.person,context.storyId);
      const index=photos.findIndex(asset=>asset.id===item.id);
      const photoLabel=listPhotos?'家庭照片':context.storyId?'事件内照片':'人物照片';
      media=`<figure class="archive-photo-detail"><img src="${e(item.src||item.poster)}" alt="${e(item.title)}"><figcaption>${e(item.description)}</figcaption></figure>
        ${photoControls(photos,index,photoLabel)}${P.MemoryShare&&item.subject===s.actor?`<div class="memory-actions"><button type="button" class="btn secondary" data-memory="restore" data-id="${e(item.id)}">修复这张老照片</button><button type="button" class="text-link" data-memory="open" data-id="${e(item.id)}">讲讲背后的故事</button></div>`:''}`;
    }else{
      const workImage=item.kind==='work'?(item.materialManaged?item.src:item.poster):'';
      const label=item.materialManaged?'原件照片':'作品展示图 · 原型示意';
      media=`${workImage?`<figure class="archive-photo-detail"><img src="${e(workImage)}" alt="${e(item.title)}"><figcaption>${label}</figcaption></figure>`:''}
        <article>${(item.body||[]).map(text=>`<p class="story-paragraph">${e(text)}</p>`).join('')}</article>`;
    }
    // 详情先核验当前读权限，原件下载再限定到实际提供者。
    const download=item.author===s.actor&&item.fileName&&item.src.startsWith('data:')?
      `<a class="btn secondary full section" href="${e(item.src)}" download="${e(item.fileName)}">下载原件</a>`:'';
    const meta=detailMeta([
      ['归档人物',item.fromFamily?'':P.PEOPLE[item.subject]?.name||'家人'],
      [item.kind==='clip'?'拍摄者':'提供者',P.PEOPLE[item.author]?.name||'家人'],
      ['关联家人',P.Households.relatedMemberNames(item)],
      ['分享范围',item.scope==='private'?'仅自己':item.scope==='selected'?'指定家人':'已授权家庭成员']
    ]);
    const back=fromList||fromHomeAlbum||fromFilmIntro?b(i('back')+' '+listLabel,'back','text-link'):
      b(i('back')+' '+e(returnLabel(context)),'archive-return','text-link',`data-id="${item.id}"`);
    return `<div class="page archive-detail">${back}<p class="eyebrow section">${label} · ${item.materialManaged?'家庭记录':'示例档案'}</p><h1 class="page-title">${e(item.title)}</h1><p class="caption">${e(item.date)}</p><div class="archive-player section">${media}</div>${download}${video?captionsView(item):''}${item.kind==='film'?P.FamilyMemories?.filmContribution?.(item)||'':''}${meta}${item.kind==='photo'?'':`<p class="story-paragraph">${e(item.description)}</p>`}<div class="note"><strong>资料来源</strong><p>${e(item.sourceLabel)}</p></div>${item.relatedStoryId && item.relatedStoryId!==context.storyId && P.visibleStories().some(story=>story.id===item.relatedStoryId)?l('查看关联人生事件','story/'+item.relatedStoryId,'btn secondary full section'):''}</div>`;
  }
  function stepPhoto(step){
    const item=getItem(P.state.archiveItemId);
    if(item?.kind!=='photo'||![-1,1].includes(step))return;
    const context=origin(item);
    const listPhotos=P.Households.storyListPhotos();
    const photos=listPhotos??photoSequence(context.person,context.storyId);
    const index=photos.findIndex(photo=>photo.id===item.id);
    const next=photos[index+step];
    if(index<0||!next)return;
    if(listPhotos){
      // 相册翻页替换当前详情，返回时直接回到原筛选。
      P.navigate('archive-item/'+next.id,{replace:true});
    }else{
      open(next.id,context.person,context.tab,context.storyId||'',context.videoFilter);
    }
  }
  /** 进入详情固定原人物、分区及已核验的父事件，回看仍回到实际打开资料的位置。 */
  function open(id,person=P.state.archivePerson,tab=P.state.lifeTab,storyId='',filter=P.state.videoFilter) {
    const item=getItem(id);
    if(!item)return P.toast('这份资料尚未向当前账号开放。');
    const source=P.visibleStories().find(story=>story.id===storyId && story.id===item.relatedStoryId && story.subject===item.subject);
    if(item.kind==='document'){person=item.subject;tab='biography';}
    P.state.archiveReturn={itemId:id,person,tab,storyId:source?.id};if(tab==='video'){P.state.videoFilter=Object.hasOwn(VIDEO_FILTERS,filter)?filter:'all';P.state.archiveReturn.videoFilter=P.state.videoFilter;}P.state.archivePerson=person;P.navigate('archive-item/'+id);
  }
  /** 离开页面暂停原生视频，进度按账号保留；重置前的旧元素不能写回新状态。 */
  function stopPlayback() {
    document.querySelectorAll('[data-archive-video]').forEach(video=>{
      const time=video.currentTime;
      // 快速离开还未读取元数据的页面时，播放器默认的零进度不能覆盖上一次观看位置。
      if(video.playbackState===P.state&&video.playbackActor===P.state.actor&&Number.isFinite(time)&&(video.readyState>0||time>0)){
        const progress=P.state.archivePlayback[P.state.actor] ||= {};
        progress[video.dataset.archiveVideo]=time;
      }
      video.pause();
    });
  }
  /** 相册内播放与详情共用进度，视频错误只更新对应的媒体块。 */
  function mountVideo(video) {
    video.playbackState=P.state;video.playbackActor=P.state.actor;
    const item=ensure().archiveAssets.find(asset=>asset.id===video.dataset.archiveVideo),cues=P.ARCHIVE_DATA.captions[item?.src] || [];
    if(cues.length && typeof window.VTTCue==='function' && !video.textTracks.length){const track=video.addTextTrack('subtitles','示例字幕','zh');cues.forEach(cue=>track.addCue(new window.VTTCue(cue.start,cue.end,cue.text)));track.mode='showing';}
    const restorePlayback=()=>{
      if(!video.isConnected||video.playbackState!==P.state||video.playbackActor!==P.state.actor||!Number.isFinite(video.duration))return;
      const time=P.state.archivePlayback[P.state.actor]?.[video.dataset.archiveVideo] || 0;
      if(item?.materialManaged)item.duration=video.duration;
      if(time>0&&time<=video.duration)video.currentTime=time;
    };
    if(video.readyState>0)restorePlayback();
    else video.addEventListener('loadedmetadata',restorePlayback,{once:true});
    const showError=()=>{
      const status=video.parentElement?.querySelector('[data-video-status], #archive-video-status');
      if(!video.isConnected||!status)return;
      status.textContent='这段视频暂时无法播放，请确认已保留完整的本地素材文件。';
      status.hidden=false;
    };
    if(video.error)showError();
    else video.addEventListener('error',showError);
  }
  /** 回看定位原章节。相册中播放新视频时暂停其他片段。 */
  function mount() {
    if(P.state.route==='life' && P.state.lifeTab==='biography' && P.state.biographyMode==='read' && P.state.archiveChapterId){const target=[...document.querySelectorAll('[data-archive-chapter]')].find(item=>item.dataset.archiveChapter===P.state.archiveChapterId);target?.scrollIntoView?.({block:'start'});}
    const videos=document.querySelectorAll('[data-archive-video]');
    for(const video of videos){
      mountVideo(video);
      if(videos.length>1)video.addEventListener('play',()=>{
        for(const other of videos)if(other!==video&&!other.paused)other.pause();
      });
    }
  }
  /** 人物档案按指定人物和分类定位资料。 */
  function handleAction(action,element) {
    if(action==='play-delivered-film'){
      const video=element.closest('.film-delivery-page')?.querySelector('video');
      video?.play().then(()=>{
        if(video.isConnected)video.scrollIntoView?.({block:'nearest'});
      }).catch(()=>{
        const status=document.getElementById('archive-video-status');
        if(video.isConnected&&status)status.textContent='暂时无法开始播放，请点击播放器内的播放按钮重试。';
      });
      return true;
    }
    if(action==='video-filter'){if(Object.hasOwn(VIDEO_FILTERS,element.dataset.value)){P.state.videoFilter=element.dataset.value;P.render();}return true;}
    if(action==='biography-mode'){if(['read','events'].includes(element.dataset.value)){P.state.biographyMode=element.dataset.value;P.state.archiveChapterId='';P.render();}return true;}
    if(action==='archive-events'){const person=element.dataset.person;if(P.state.members.includes(person)){P.state.archivePerson=person;P.state.lifeTab='biography';P.state.biographyMode='events';P.state.archiveChapterId='';P.navigate('life/'+person);}return true;}
    if(action==='archive-tab'){if(Object.hasOwn(TABS,element.dataset.value)){P.state.lifeTab=element.dataset.value;if(element.dataset.value==='video')P.state.videoFilter='all';P.render();}return true;}
    if(action==='archive-person'&&P.state.actor!=='father'&&(element.dataset.id||element.value)!==P.state.actor){P.FamilyContext.select(element.dataset.id||element.value);return true;}
    if(action==='archive-person'){const person=element.dataset.id || element.value;if(P.state.members.includes(person)){P.state.lifeTab='overview';P.state.videoFilter='all';P.state.biographyMode='read';P.state.archiveChapterId='';document.getElementById('app-content').scrollTop=0;P.navigate('life/'+person);}return true;}
    if(action==='archive-open'){open(element.dataset.id,element.dataset.person || P.state.archivePerson,element.dataset.tab || P.state.lifeTab,element.dataset.storyId || '',element.dataset.videoFilter || P.state.videoFilter);return true;}
    if(action==='archive-return'){const item=ensure().archiveAssets.find(asset=>asset.id===element.dataset.id);if(item){const context=origin(item);if(context.storyId)return P.navigate('story/'+context.storyId);P.state.archivePerson=context.person;P.state.lifeTab=context.tab;if(context.tab==='video')P.state.videoFilter=context.videoFilter || 'all';P.navigate('life/'+context.person);}return true;}
    if(action==='archive-photo-step'){stepPhoto(Number(element.dataset.step));return true;}
    return false;
  }
  P.PersonArchive={tabs:TABS,view,detail,detailMeta,filmCard,assets,familyMaterials,familyCard,videos,deliveredFilm,videoPlayer,videoType,getItem,biography,chapter,events,storyMaterials,open,handleAction,mount,stopPlayback};
  Object.assign(P.views,{'archive-item':detail,'film-delivery':delivery});
}
