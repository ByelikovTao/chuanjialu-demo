/** 首页、人生、故事、对话与记忆空间视图。内容均为虚构演示材料。 */
'use strict';
{
  const P=window.App;
  const {icon:i,button:b,link:l,escape:e}=P;
  /** 首页汇总全家福、传承资料和家庭记录。 */
  function home() {return P.FamilyHomeViews.render();}
  /** 人物档案统一展示资料，人生事件在传记内部按另一种方式浏览。 */
  function life() {return P.PersonArchive.view();}
  /** 往事和媒体沿用同一详情排版，正文与附件仍按当前访问授权展示。 */
  function story() {
    const s=P.state;
    const item=P.visibleStories().find(x=>x.id===s.storyId);
    const couple=P.Couples.detail(s.storyId,item);
    if(couple)return couple;
    if (!item) {
      const exists=s.stories.some(story=>story.id===s.storyId&&!story.coupleId);
      if (!exists) return `<div class="page"><div class="empty">${i('book')}<h2>没有找到这段记录</h2>${l('返回记录','house-stories','btn')}</div></div>`;
      const waiting=(s.accessRequests || []).some(request=>request.actor===s.actor && request.storyId===s.storyId && ['pending','pending-owner'].includes(request.status));
      return `<div class="page"><div class="empty">${i('lock')}<h2>这段内容暂未向你开放</h2><p>${waiting?'查看申请已提交，等待记录本人决定。':'你可以向记录本人申请查看，也可以返回已分享的故事。'}</p>${b(waiting?'等待本人授权':'申请查看','request-access','btn',waiting?'disabled':'')}${l('返回记录','house-stories','text-link full')}</div></div>`;
    }
    const saved=s.saved.includes(item.id);
    const legacyPhoto=Boolean(item.photoToken&&!item.photoQuestion);
    const title=legacyPhoto?item.quote||item.title:item.title;
    // 老照片未填写拍摄年份时只展示记录时间，避免把上传时间写成拍摄时间。
    const date=item.photoYear?'约拍摄于 '+item.photoYear+' 年':legacyPhoto?'':item.date;
    const quote=item.quote&&item.quote!==title&&!item.text.some(paragraph=>paragraph.includes(item.quote))?
      `<blockquote>${e(item.quote)}</blockquote>`:'';
    const text=item.text.map(paragraph=>`<p class="story-paragraph">${e(paragraph)}</p>`).join('');
    const meta=P.PersonArchive.detailMeta([
      ['记录人',P.PEOPLE[item.author]?.name||'家人'],
      ['关联家人',P.Households.relatedMemberNames(item)],
      ['记录时间',item.recorded],
      ['分享范围',storyScope(item)],
      ['确认状态',item.photoToken?'':storyConfirmation(item)]
    ]);
    const read=legacyPhoto||item.moment&&!item.text.length?'':b(i('volume')+' 听示例朗读','read-transcript','btn secondary',`data-id="${e(item.id)}"`);
    const save=b(i('star')+(saved?' 已收藏':' 收藏'),'save-story','btn outline',`aria-pressed="${saved}"`);
    const source=item.moment&&!item.text.length?'':b('查看原始记录 '+i('arrow'),'source','text-link',`data-id="${e(item.id)}"`);
    const ask=P.PhotoStories.askButton(item);
    const journal = s.homeDiaryStory;
    const diaryPage = journal ? P.FamilyJournal.diaryStoryPage(item) : null;
    const dateLabel = journal
      ? `<p class="caption journal-byline">${e([date || item.recorded, P.FamilyJournal.diaryByline(item)].filter(Boolean).join(' · '))}</p>`
      : date ? `<p class="caption">${e(date)}</p>` : '';
    const article = `<article class="page archive-detail story-detail${journal ? ' bound-paper journal-sheet journal-story diary-leaf' : ''}">
      ${journal ? '' : storyBack(item) +
        `<p class="eyebrow section">${item.babyMilestone?(item.growthSample?'成长记 · 示例':'成长记 · 里程碑'):item.lifeMilestone?'人生节点':item.photoToken?'照片往事':'家庭往事'}</p>`}
      <h1 class="page-title">${e(title)}</h1>
      ${ask?`<div class="story-ask-heading">${dateLabel}${ask}</div>`:dateLabel}
      ${storyMedia(item)}
      ${quote||text?`<div class="section">${quote}${text}</div>`:''}
      ${journal ? P.Households.replyPanel(item, true) : ''}
      ${diaryPage?.navigation || ''}
      <div data-screen-story-tools>${P.HouseScreen.photoButton(item)}${P.HouseScreen.voices(item)}</div>
      ${P.FamilyMoment.playback(item)}${P.PhotoStories.region(item)}
      <div class="story-tools section">${read}${save}</div>
      ${read?'<p class="caption">示例朗读由系统声音生成。</p>':''}
      ${meta}
      <div class="note"><strong>资料来源</strong><p>${e(item.source)}</p>${source}</div>
      ${item.author===s.actor&&!item.photoToken?b(i('share')+' 调整分享范围','share-story','text-link section'):''}
      ${P.PersonArchive.storyMaterials(item)}${familyPerspective(item)}${journal ? '' : P.Households.replyPanel(item)}
    </article>`;
    return diaryPage ? P.FamilyJournal.diaryBook('entry', diaryPage.number, article) : article;
  }
  function storyBack(item){
    const previous=P.state.history?.at(-1)?.split('/')[0];
    const albumLabel={'house-baby':'返回成长相册','house-elders':'返回有声相册'}[previous];
    if(P.Households.fromStoryList())return b(i('back')+' '+(albumLabel||'返回记录'),'back','text-link');
    if(previous==='home')return b(i('back')+' 返回我家','back','text-link');
    if(previous==='house-assistant')return b(i('back')+' 返回'+P.FamilyAssistant.title,'back','text-link');
    if(previous==='archive-item')return b(i('back')+' 返回档案资料','back','text-link');
    if(!previous||item.fromFamily||item.photoToken)return l(i('back')+' 返回记录',item.scope==='private'?'house-stories/personal/recent':'house-stories','text-link');
    if(previous==='life')return b(i('back')+' 返回传记 · 按事件浏览','archive-events','text-link',`data-person="${e(item.commonWith||item.subject)}"`);
    return b(i('back')+' 返回上一页','back','text-link');
  }
  function storyScope(item){
    return item.scope==='private'?'仅自己':item.scope==='selected'?'指定家人':'家庭可见';
  }
  function storyConfirmation(item){
    if(!item.commonWith)return item.pending?'待本人确认':'本人已确认';
    if(item.scope==='private')return '讲述者原稿';
    return P.FamilyContext.inArchive(item,item.commonWith)?'对方已确认纳入':'讲述者记录 · 待对方确认';
  }
  function storyMedia(item){
    let media;
    if(item.houseImage){
      media=`<img src="${e(item.houseImage)}" alt="这件往事的家庭照片">`;
    }else if(item.photoToken){
      media=item.houseBytes?'<p class="caption" data-network-story-photo>正在读取照片…</p>':'<p class="caption">暂无可显示的照片。</p>';
    }else{
      const photo=P.FamilyHome.photo(item,item.subject);
      if(photo){
        media=`<img src="${e(photo.src||photo.poster)}" alt="${e(photo.title)}"><figcaption>${e(photo.sourceLabel)}</figcaption>`;
      }else if(item.id==='first-order'){
        // 口述场景插画保留 AI 配图标记，来源栏继续引用原口述记录。
        media='<img src="assets/zhumen/story-oral-scene.webp" alt="老办公室里的电话"><figcaption>口述故事配图 · AI 生成场景示例</figcaption>';
      }
    }
    return media?`<div class="archive-player section"><figure class="archive-photo-detail">${media}</figure></div>`:'';
  }
  /** 另一位家人的叙述只关联对应事件，私密记录不附加虚构评论。 */
  function familyPerspective(item) {
    if(item.scope==='private'||item.subject!=='father'||P.state.familyWorkspace)return '';
    const text=item.id==='first-order'?'<div class="note"><strong>林慧 · 家人讲述</strong><p>我记得他那天进门的时候，脸上一直带着笑。我们都觉得，日子有了新的盼头。</p></div>':'<p class="caption">同一件事，每个人也许记得不同的细节。</p>';
    return `<div class="section"><div class="section-heading"><h2>家人记得的另一面</h2></div>${text}${b('补充你记得的细节 '+i('plus'),'contribute-story','text-link',`data-id="${item.id}"`)}</div>`;
  }
  /** 来源按钮固定到各条回答；资料或实际引用的故事撤回后不继续展示历史正文。 */
  function messageView(msg) {
    if (msg.type==='user') return `<div class="message user"><p>${e(msg.text)}</p></div>`;
    if((msg.source&&!P.visibleStories().some(item=>item.id===msg.source&&P.FamilyContext.usable(item,P.state.chatTarget)))||!P.ContentChat.messageReadable(msg)||(msg.type==='corrected'&&!P.AnswerFeedback.readable(msg)))return '<div class="message assistant"><p>这条回答引用的资料暂未向你开放。</p></div>';
    const kind=msg.type==='inference'?'AI 推演':msg.type==='unknown'?'记录尚未覆盖':msg.sourceLabel || '据本人记录整理';
    const source=msg.contentSource?P.ContentChat.sourceButton(msg.contentSource,'回看这条回答的原内容'):'';
    const original=msg.type==='memory' && msg.source?b('查看原始记录 '+i('arrow'),'source','text-link',`data-id="${msg.source}"`):'';
    const storyId=msg.storyId||msg.contentSource?.storyId;
    const story=msg.type==='unknown'&&storyId&&P.visibleStories().find(item=>item.id===storyId);
    return `<div class="message assistant ${msg.type==='inference'?'inference':''}"><span class="message-label">${i(msg.type==='inference'?'spark':'source')}${e(kind)}</span><p>${e(msg.text)}</p>${msg.type==='inference'?'<small>结合已有经历生成，不代表本人此刻的真实想法。</small>':''}<div class="content-chat-links">${source}${original}</div>${P.AnswerFeedback.tools(msg)}${story?l('回这条往事给家人留言','story/'+e(story.id)):''}</div>`;
  }
  /** 数字人保留完整人物画面，纠正与反馈由标题栏进入。 */
  function chat() {return P.ContentChat.available(P.state.chatTarget)?P.DigitalHuman.view():P.FamilyContext.locked('digital',P.state.chatTarget);}
  /** 数字人的纠正与反馈集中在服务内，家人留言从对应往事查看。 */
  function chatMessages() {
    const dot=P.AnswerFeedback.hasNotice()?'<span class="chat-task-dot" role="img" aria-label="有待核对反馈或未读处理结果"></span>':'';
    return `<div class="page"><h1 class="page-title">数字人反馈</h1><div class="chat-message-list">
      ${l(i('edit')+'<span>纠正数字人的回答</span>'+dot+i('arrow'),'corrections','menu-row')}</div>${l('返回互动数字人','chat','text-link full section')}</div>`;
  }
  P.chatHasNotice=()=>P.AnswerFeedback.hasNotice();
  P.views['chat-messages']=chatMessages;
  /** 三维记忆空间由专用模块负责模型、相机和物件故事。 */
  function space() { return P.MemorySpace.view(); }
  /** 将核心视图注册给静态原型路由。 */
  Object.assign(P.views,{home,life,story,chat,space});
  P.chatMessageView=messageView;
}
