/** 首页、人生、故事、对话与记忆空间视图。内容均为虚构演示材料。 */
'use strict';
{
  const P=window.App;
  const {icon:i,button:b,link:l,escape:e}=P;
  /** 首页汇总全家福、传承资料和家庭记录。 */
  function home() {return P.FamilyHomeViews.render();}
  /** 往事和媒体沿用同一详情排版，正文与附件仍按当前访问授权展示。 */
  function story() {
    const s=P.state;
    const item=P.visibleStories().find(x=>x.id===s.storyId);
    if (!item) {
      const exists=s.stories.some(story=>story.id===s.storyId&&!story.coupleId);
      return P.unavailable('house-stories', exists ? '这段往事暂未向你开放。' : '没有找到这段往事。');
    }
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
    const source=item.moment&&!item.text.length?'':b('查看原始记录 '+i('arrow'),'source','text-link',`data-id="${e(item.id)}"`);
    const diaryPage = s.homeDiaryStory ? P.FamilyJournal.diaryStoryPage(item) : null;
    const previous = s.history?.at(-1)?.split('/')[0];
    const dateLabel = date ? `<p class="caption">${e(date)}</p>` : '';
    const category = item.babyMilestone ? (item.growthSample ? '成长记 · 示例' : '成长记 · 里程碑')
      : item.lifeMilestone ? '人生节点' : item.photoToken ? '照片往事' : '家庭往事';
    const audio = read ? `<div class="story-tools section">${read}</div><p class="caption">示例朗读由系统声音生成。</p>` : '';
    const replies = P.Households.replyPanel(item);
    const conversationEntry = s.storyConversationEntry && replies
      ? b(i('chat') + '看留言', 'jump-story-conversation', 'text-link story-conversation-link', 'aria-controls="story-conversation"')
      : '';
    // 三个入口共用正文和留言区，日记仅在阅读流程中加翻篇控件。
    const article = `<article class="page story-reading-page archive-detail story-detail${diaryPage ? ' diary-leaf' : ''}">
      ${storyBack(item, previous)}
      <div class="story-reading-heading">
        <p class="eyebrow section">${category}</p><h1 class="page-title">${e(title)}</h1>
        ${conversationEntry ? `<div class="story-ask-heading">${dateLabel}${conversationEntry}</div>` : dateLabel}
        ${P.FamilyJournal.seal()}
      </div>
      ${storyMedia(item)}
      ${quote || text ? `<div class="section story-reading-body">${quote}${text}</div>` : ''}
      ${diaryPage?.navigation || ''}
      <div data-screen-story-tools>${P.HouseScreen.photoButton(item)}${P.HouseScreen.voices(item)}</div>
      ${P.FamilyMoment.playback(item)}
      ${audio ? `<div class="story-reading-audio">${audio}</div>` : ''}
      <section class="story-reading-info"><h2>记录信息</h2>${meta}</section>
      <div class="note"><strong>资料来源</strong><p>${e(item.source)}</p>${source}</div>
      ${item.author===s.actor?b(i('share')+' 调整分享范围','share-story','text-link section'):''}
      ${P.PersonArchive.storyMaterials(item)}${familyPerspective(item)}
      ${replies ? `<section id="story-conversation" tabindex="-1" aria-label="留言与补写">${replies}</section>` : ''}
    </article>`;
    return diaryPage ? P.FamilyJournal.diaryBook('entry', diaryPage.number, article) : article;
  }
  function storyBack(item, previous) {
    const content = label => `${i('back')}<span>${e(label)}</span>`;
    const style = 'text-link story-reading-back';
    if (P.state.homeDiaryStory) {
      return P.returnLink(content('返回家庭日记'), P.FamilyJournal.diaryListFor(item.id), style);
    }
    const labels = {
      'house-stories': '返回记录',
      'question-history': '返回留言记录',
      'questions': '返回家人留言',
      'home': '返回我家',
      'home-album': '返回家庭相册',
      'materials': '返回我上传的',
      'house-assistant': '返回' + P.FamilyAssistant.title,
      'archive-item': '返回档案资料'
    };
    // 直接打开往事时回记录列表，从其他页面进入时回到实际来源。
    if (!previous) {
      if (P.state.storyConversationEntry) return P.returnLink(content('返回留言记录'), 'question-history', style);
      const route = item.scope === 'private' ? 'house-stories/personal/recent' : 'house-stories';
      return P.returnLink(content('返回记录'), route, style);
    }
    return b(content(labels[previous] || '返回上一页'), 'back', style);
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
    return `<div class="section"><div class="section-heading"><h2>家人记得的另一面</h2></div>${text}</div>`;
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
  /** 将核心视图注册给静态原型路由。 */
  Object.assign(P.views,{home,story,chat});
  P.chatMessageView=messageView;
}
