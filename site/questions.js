/** 往事里的真人留言，正文和回答仅提问者及接收本人可见。 */
'use strict';
{
  const P=window.App,{escape:e,link:l,badge:t}=P;
  const QUESTION_LIMIT=240,ANSWER_LIMIT=2000;
  const STORY_ROUTES=['story','house-story'];

  function storyId(item){
    return item.storyId||(item.contentContext?.kind==='story'?item.contentContext.storyId:'');
  }
  function entries(){
    return P.state.questions.filter(item=>item.from===P.state.actor||item.owner===P.state.actor);
  }
  function notice(item){
    return item.owner===P.state.actor&&item.status==='pending'||
      item.from===P.state.actor&&item.status==='answered'&&item.replyRead===false;
  }
  function hasNotice(){
    const visible=new Set(P.visibleStories().map(story=>story.id));
    return entries().some(item=>notice(item)&&(!storyId(item)||visible.has(storyId(item))));
  }
  function storyNotice(story){
    return entries().some(item=>storyId(item)===story.id&&notice(item))?' <span class="story-new-reply">有留言待查看</span>':'';
  }
  function drafts(){
    const actor=P.state.actor;
    const draft=P.state.questionDrafts[actor]||={answers:{}};
    draft.stories||={};
    return draft;
  }
  /** 草稿按账号及往事隔离，切换身份或重置后不能写回旧页面。 */
  function captureDrafts(){
    document.querySelectorAll('[data-story-question],[data-question-answer]').forEach(form=>{
      if(form.draftState!==P.state||form.draftActor!==P.state.actor)return;
      if(form.dataset.storyQuestion)drafts().stories[form.dataset.storyQuestion]=form.elements.question.value;
      else if(P.state.questions.some(item=>item.id===form.dataset.questionAnswer&&item.owner===P.state.actor&&item.status==='pending')){
        drafts().answers[form.dataset.questionAnswer]=form.elements.answer.value;
      }
    });
  }
  function recipient(story){
    const owner=story.commonWith||story.subject||story.author;
    if(story.scope==='private'||owner===P.state.actor||!P.state.members.includes(owner)||!P.state.accounts[owner])return '';
    if(owner!==story.author&&(!story.viewers.includes(owner)||story.approvedViewers&&!story.approvedViewers.includes(owner)||
      story.commonWith&&!P.FamilyContext.inArchive(story,owner)))return '';
    return owner;
  }
  function status(item){
    return item.status==='answered'?'本人已回复':item.owner===P.state.actor?'待你回复':'等待本人回复';
  }
  function card(item){
    const canAnswer=item.owner===P.state.actor&&item.status==='pending';
    const original=!storyId(item)&&P.ContentChat.resolve(item.contentContext);
    return `<article class="card question-card"><div class="row between">
      <strong>${e(P.PEOPLE[item.from]?.name||'家人')}的留言</strong>${t(status(item),item.status==='answered'?'':'warm')}</div>
      <p class="story-paragraph">${e(item.text)}</p><p class="caption">留给 ${e(P.PEOPLE[item.owner]?.name||'家人')}</p>
      ${original?P.ContentChat.sourceButton(item.contentContext,'查看关联资料'):''}
      ${item.status==='answered'?`<div class="note section"><strong>${e(P.PEOPLE[item.owner]?.name||'家人')} · 本人回复</strong><p class="story-invite-text">${e(item.answer)}</p></div>`:canAnswer?`
      <form class="section" data-question-answer="${e(item.id)}"><label class="form-field">
      <span>写下你的回答</span><textarea name="answer" maxlength="${ANSWER_LIMIT}" required>${e(drafts().answers[item.id]||'')}</textarea></label>
      <button class="btn" type="submit">回复这位家人</button></form>`:''}</article>`;
  }
  function storyPanel(story){
    const items=entries().filter(item=>storyId(item)===story.id);
    const owner=recipient(story);
    if(!owner&&!items.length)return '';
    // 只有提问者打开对应往事才清除提醒，消息索引和家人账号都不会标记已读。
    for(const item of items)if(item.from===P.state.actor&&item.status==='answered')item.replyRead=true;
    const form=owner?`<details class="card house-card section"><summary>给${e(P.PEOPLE[owner].name)}留言</summary>
      <p class="caption">留言和回复仅你和这位家人可见。</p>
      <form data-story-question="${e(story.id)}" class="house-form"><label class="form-field"><span>关于这段往事，你想问什么？</span>
      <textarea name="question" maxlength="${QUESTION_LIMIT}" required>${e(drafts().stories[story.id]||'')}</textarea></label>
      <button class="btn" type="submit">留下问题</button></form></details>`:'';
    const cards=items.length?`<div class="stack section">${items.slice().reverse().map(card).join('')}</div>`:'';
    return `<section class="house-page section"><h2>真人留言</h2>${cards}${form}</section>`;
  }
  function view(){
    const visible=new Map(P.visibleStories().map(story=>[story.id,story]));
    const items=entries().slice().reverse().map(item=>{
      const id=storyId(item),story=visible.get(id);
      if(!id){
        // 旧留言没有对应往事，仍可在这里查看和回复。
        if(item.from===P.state.actor&&item.status==='answered')item.replyRead=true;
        return card(item);
      }
      if(!story)return '';
      return `<article class="card question-card"><h2>${e(story.title)}</h2>
        <p>${e(status(item))}${notice(item)?' · 有留言待查看':''}</p>${l('回这条往事查看','story/'+e(id),'btn secondary')}</article>`;
    }).filter(Boolean);
    return `<div class="page"><p class="page-subtitle">点开对应的往事查看留言和回复。</p>
      <div class="section stack">${items.join('')||'<p class="note">还没有留言。可以打开一条家庭往事，给记录的家人留个问题。</p>'}</div>
      ${l('查看家庭往事','house-stories/family','btn secondary full section')}</div>`;
  }
  function submit(form){
    const id=form.dataset.storyQuestion,answerId=form.dataset.questionAnswer;
    if(!id&&!answerId)return false;
    const state=P.state;
    if(form.draftState!==state||form.draftActor!==state.actor)return true;
    const stories=P.visibleStories();
    if(id){
      const story=stories.find(item=>item.id===id);
      const owner=STORY_ROUTES.includes(state.route)&&state.storyId===id&&story?recipient(story):'';
      if(!owner){P.toast('这条往事暂时无法留言。');return true;}
      const text=form.elements.question.value.trim();
      if(!text||text.length>QUESTION_LIMIT){P.toast(`请填写 1—${QUESTION_LIMIT} 字的问题。`);return true;}
      if(!state.questions.some(item=>storyId(item)===id&&item.from===state.actor&&item.owner===owner&&item.text===text&&item.status==='pending')){
        state.questions.push({id:P.nextId('question'),from:state.actor,owner,text,storyId:id,status:'pending',answer:'',replyRead:false});
      }
      form.elements.question.value='';delete drafts().stories[id];
      P.render();P.toast('留言已留在这条往事里。');return true;
    }
    const item=state.questions.find(entry=>entry.id===answerId&&entry.owner===state.actor&&entry.status==='pending');
    const linked=item&&storyId(item);
    if(!item||linked&&(!STORY_ROUTES.includes(state.route)||state.storyId!==linked||!stories.some(story=>story.id===linked))){
      P.toast('请从对应的往事回复这条留言。');return true;
    }
    const answer=form.elements.answer.value.trim();
    if(!answer||answer.length>ANSWER_LIMIT){P.toast(`请填写 1—${ANSWER_LIMIT} 字的回答。`);return true;}
    item.answer=answer;item.status='answered';item.replyRead=false;delete drafts().answers[item.id];
    P.render();P.toast('本人回复已保存，提问家人可以查看。');return true;
  }
  P.QuestionInbox={view,storyPanel,storyNotice,submit,captureDrafts,hasNotice};
  P.views.questions=view;
}
