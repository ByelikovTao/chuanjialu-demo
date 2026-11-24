/** 人物资料库：统一人物归属、拍摄者、可见范围，以及影片、相册和传记的查看入口。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,icon:i,badge:t,avatar:a}=P;
  const TABS={overview:'档案总览',video:'视频',photo:'照片',biography:'传记',work:'作品',place:'足迹'};
  const VIDEO_FILTERS={all:'全部视频',film:'人生影片',self:'本人拍摄',family:'家人拍摄'};
  const TYPES={film:'人生影片',photo:'照片',clip:'生活影像',work:TABS.work};
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
  function assetReadable(item) {return Boolean(item && item.kind !== 'document' && readable(item));}
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
  function videoPlayer(item, { poster = item.poster } = {}) {
    return `<video data-archive-video="${e(item.id)}" controls playsinline preload="metadata" ${poster ? `poster="${e(poster)}"` : ''} src="${e(item.src)}" aria-label="${e(item.title)}">当前浏览器不支持视频播放。</video>`;
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
  /** 先校验事件和各份资料的权限，没有可查看资料时省略整个区块。 */
  function storyMaterials(story) {
    if(!P.visibleStories().some(item=>item.id===story.id))return '';
    const items=ensure().archiveAssets.filter(item=>item.relatedStoryId===story.id && item.subject===story.subject && item.kind!=='document' && assetReadable(item));
    if (!items.length) return '';
    return `<section class="section event-materials">
      <div class="section-heading"><h2>这段经历的资料 <small>${items.length}</small></h2></div>
      <p class="caption">相关照片、影像与原始资料，按各自授权展示。</p>
      <div class="archive-grid">${items.map(item=>card(item,story.subject,story.id)).join('')}</div>
    </section>`;
  }
  /** 视频合并后保留四个入口：视频、照片、传记及作品。 */
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
    const route = context.from?.split('/')[0];
    const labels = {
      home: '返回我家',
      'home-album': '返回家庭相册',
      'house-assistant': '返回' + P.FamilyAssistant.title,
      'house-film-intro': '返回影片介绍',
      'house-stories': '返回记录',
      life: '返回人物档案',
      story: '返回往事'
    };
    return route ? labels[route] || '返回上一页' : '返回记录';
  }
  /** 影录沿用通用返回文案，其他资料在公共顶栏提示原入口。 */
  function detailBackLabel() {
    const {archiveItemId, archiveReturn} = P.state;
    return getItem(archiveItemId)?.kind === 'clip' ? '返回上一页' : returnLabel(archiveReturn || {});
  }
  /** 添加操作放在具体分类，当前人物和资料类型由入口一次带入。 */
  function detailPhotos(item) {
    const {from, person = item.subject, storyId} = P.state.archiveReturn || {};
    return P.Households.storyListPhotos(item, from) ?? {
      photos: photoSequence(person, storyId),
      label: storyId ? '事件内照片' : '人物照片'
    };
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
    const context = s.archiveReturn || {};
    if(!item)return P.unavailable('house-stories', '没有找到这份档案资料。');
    if(!assetReadable(item))return P.unavailable('house-stories', '这份档案资料暂未向你开放。');
    const isFilm = item.kind === 'film';
    const isWork = item.kind === 'work';
    const isPhoto = item.kind === 'photo';
    const video = isFilm || item.kind === 'clip';
    const label = video ? VIDEO_FILTERS[videoType(item, context.person ?? item.subject)] : TYPES[item.kind];
    const usesPaper = isWork || video;
    let media;
    if(video){
      const note=item.materialManaged?'家庭成员提供的视频':`${P.duration(item.duration)} · 无声演示片段，可播放、暂停或拖动进度。`;
      media=`${videoPlayer(item)}
        <p id="archive-video-status" class="caption" role="status">${note}</p>`;
    }else if(isPhoto){
      const {photos, label: photoLabel} = detailPhotos(item);
      const index=photos.findIndex(asset=>asset.id===item.id);
      media=`<figure class="archive-photo-detail"><img src="${e(item.src||item.poster)}" alt="${e(item.title)}"><figcaption>${e(item.description)}</figcaption></figure>
        ${photoControls(photos,index,photoLabel)}`;
    }else{
      const workImage=isWork?(item.materialManaged?item.src:item.poster):'';
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
    const source = `<div class="note"><strong>资料来源</strong><p>${e(item.sourceLabel)}</p></div>`;
    if (isPhoto) {
      return `<div class="page archive-detail archive-photo-page">
        <section class="archive-photo-sheet" aria-labelledby="archive-photo-title">
          <h1 id="archive-photo-title">${e(item.title)} ${P.FamilyJournal.seal()}</h1>
          ${item.date ? `<p class="caption">${e(item.date)}</p>` : ''}
          <div class="archive-player">${media}</div>
        </section>
        ${download}${P.HouseScreen.photoButton(item)}${P.HouseScreen.voices(item)}${meta}${source}
      </div>`;
    }
    const relatedStory = item.relatedStoryId && item.relatedStoryId !== context.storyId
      && P.visibleStories().some(story => story.id === item.relatedStoryId)
      ? l('查看关联人生事件', 'story/' + item.relatedStoryId, 'btn secondary full section') : '';
    const content = `<p class="eyebrow section">${label} · ${item.materialManaged ? '家庭记录' : '示例档案'}</p>
      <h1 class="page-title">${e(item.title)}</h1><p class="caption">${e(item.date)}</p>
      <div class="archive-player section">${media}</div>${download}${video ? captionsView(item) : ''}
      ${isFilm ? P.FamilyMemories?.filmContribution?.(item) || '' : ''}${meta}
      <p class="story-paragraph">${e(item.description)}</p>${source}${relatedStory}`;
    const paperClass = usesPaper ? ' archive-paper-detail' : '';
    const filmClass = isFilm ? ' archive-film-detail' : '';
    return `<div class="page archive-detail${paperClass}${filmClass}">
      ${usesPaper ? `<div class="archive-paper-sheet${isWork ? ' archive-work-sheet' : ''}">${content}</div>` : content}</div>`;
  }
  function stepPhoto(step){
    const item=getItem(P.state.archiveItemId);
    if(item?.kind!=='photo'||![-1,1].includes(step))return;
    const {photos} = detailPhotos(item);
    const index=photos.findIndex(photo=>photo.id===item.id);
    const next=photos[index+step];
    if(index<0||!next)return;
    const route = 'archive-item/' + next.id;
    const entry = P.state.archiveReturn;
    const position = P.state.albumReturn;
    if (position?.route === 'archive-item/' + item.id && position.from === entry?.from && position.actor === P.state.actor) {
      position.route = route;
    }
    // 翻页替换当前详情，来源和返回位置都继续指向最初打开照片的页面。
    P.navigate(route, {replace: true, archiveContext: entry});
  }
  /** 进入详情固定原人物、分区及已核验的父事件，回看仍回到实际打开资料的位置。 */
  function open(id,person=P.state.archivePerson,tab=P.state.lifeTab,storyId='',filter=P.state.videoFilter) {
    const item=getItem(id);
    if(!item)return P.toast('这份资料尚未向当前账号开放。');
    const source=P.visibleStories().find(story=>story.id===storyId && story.id===item.relatedStoryId && story.subject===item.subject);
    if (tab === 'video') P.state.videoFilter = Object.hasOwn(VIDEO_FILTERS, filter) ? filter : 'all';
    P.state.archivePerson = person;
    P.navigate('archive-item/' + id, {archiveContext: {person, storyId: source?.id}});
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
    if(action==='archive-open'){open(element.dataset.id,element.dataset.person || P.state.archivePerson,element.dataset.tab || P.state.lifeTab,element.dataset.storyId || '',element.dataset.videoFilter || P.state.videoFilter);return true;}
    if(action==='archive-photo-step'){stepPhoto(Number(element.dataset.step));return true;}
    return false;
  }
  P.PersonArchive={tabs:TABS,detail,detailBackLabel,detailMeta,filmCard,assets,familyMaterials,familyCard,videos,videoPlayer,videoType,getItem,biography,chapter,events,storyMaterials,open,handleAction,mount,stopPlayback};
  Object.assign(P.views,{'archive-item':detail});
}
