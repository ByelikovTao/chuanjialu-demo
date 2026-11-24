/** 演示交互：只更新内存状态，不发送邀请、不录制麦克风、不发起支付。 */
'use strict';
{
  const P=window.App;
  const {icon:i,button:b,link:l,badge:t,avatar:a,escape:e}=P;
  /** 整理中的请求只绑定原草稿对象，不作为可跨账号复制的草稿字段。 */
  /** 展开来源，始终先检查当前角色是否有权读取对应材料。 */
  function source(id='first-order') {
    const item=P.visibleStories().find(x=>x.id===id);
    if (!item) return P.toast('这段原始记录暂未向当前账号开放。');
    P.modal('查看原始记录', `<div class="story-source-record">
      <div class="tags">${t(e(item.source))}${t('示例材料', 'gray')}</div>
      <dl class="story-source-meta">
        <div><dt>记录人：</dt><dd>${e(P.PEOPLE[item.author]?.name || '家人')}</dd></div>
        <div><dt>记录日期：</dt><dd>${e(item.recorded)}</dd></div>
      </dl>
      <div class="source-transcript">${e(item.text.join('\n\n'))}</div>
      <p class="caption">原型展示文字记录，不代表已接入真实录音。</p>
      ${b(i('volume') + '朗读这段示例文字', 'read-transcript', 'btn secondary full', `data-id="${e(id)}"`)}
    </div>`, 'dialog', undefined, {familySheet: true});
  }
  /** 系统朗读仅用于辅助演示，明确不会模拟本人原声。 */
  function readTranscript(id) {
    const item=P.visibleStories().find(x=>x.id===id);
    if (!item) return;
    if (!('speechSynthesis' in window)) return P.toast('当前浏览器不支持系统朗读，可以继续查看文字记录。');
    speechSynthesis.cancel();
    const speech=new SpeechSynthesisUtterance(item.text[0]);
    speech.lang='zh-CN';speech.rate=.86;
    speechSynthesis.speak(speech);
    P.toast('正在用系统声音朗读示例文字，并非本人原声。');
  }
  /** 文字回答统一更新会话与无声动作，不让资料追问另外维护第二套消息流。 */
  function completeReply(reply) {
    // 仅在本人已确认、资料仍获授权且问题相同的情况下使用修订答复。
    reply=P.AnswerFeedback.apply(reply);
    if(reply.type!=='corrected'&&!P.Billing.consume(P.state.chatTarget,'qa',P.nextId('qa-request'))){P.toast('当前人物的共享答复额度已用完或年度服务到期，仍可查看资料和留问本人。');return;}
    P.state.chatMessages.push(reply);P.render();P.DigitalHuman?.respond(reply.text);
    setTimeout(()=>{const history=document.querySelector('.avatar-conversation');if(history)history.scrollTop=history.scrollHeight;},20);
  }
  /** 当前媒体或章节优先作为话题；显式新记录和故事入口仍可切换到对应故事。 */
  function sendMessage(text,storyId='') {
    if(!P.ContentChat.available(P.state.chatTarget))return P.toast('这位家人的数字人尚未向你开放。');
    const value=text.trim();
    if (!value) return;
    if(!P.Billing.period(P.state.chatTarget))return P.toast('年度AI服务已到期，仍可查看已交付资料或把问题留给本人。');
    P.state.chatMessages.push({type:'user',text:value});
    if(!storyId && !/刚写|新记录/.test(value)){const contextual=P.ContentChat.reply(value);if(contextual)return completeReply(contextual);}
    const visible=P.visibleStories().filter(item=>P.FamilyContext.usable(item,P.state.chatTarget));
    const wantsLatest=/刚写|新记录/.test(value),latest=wantsLatest?visible.findLast(item=>item.id.startsWith('record-')):null;
    const topic=/创业|订单|最难/.test(value)?'first-order':/书桌|老家|收音机|家书/.test(value)?'old-home':/全家福|春节/.test(value)?'spring':'';
    const id=storyId || (wantsLatest?latest?.id || '':topic || P.state.chatContext?.storyId);
    if(wantsLatest && !storyId)P.state.chatContext=latest?{kind:'story',storyId:latest.id}:null;
    const source=visible.find(item=>item.id===id);
    let reply={type:'unknown',question:value,text:'现有已确认且向你开放的记录尚未覆盖这个问题。可以留给本人慢慢补充。'};
    if(!storyId && !wantsLatest && /困难|建议|怎么做|陪|想你/.test(value))reply={type:'inference',text:'如果眼前有很多事情，不妨先把最重要的一件做扎实。也可以把你的想法讲给家里人听，不必一个人撑着。'};
    else if(source){
      P.state.chatContext={kind:'story',storyId:source.id};
      if(/收音机/.test(value) && !source.text.join('').includes('收音机'))reply.text='已确认的老宅记录讲到了书桌和家书，收音机的具体经历还需要本人补充。';
      else {
        const relation=P.relation('mother'),familyName=P.state.actor==='father'?'林慧':relation==='我'?'你':relation==='家人'?'家人':'你'+relation;
        const text=source.text.join('\n\n').replaceAll('你妈妈',familyName);
        reply={type:'memory',text:source.author===P.state.chatTarget?text:`${P.PEOPLE[source.author].name}的记录提到：${text}`,source:source.id};
      }
    }
    // 历史问题固定当时的资料来源，稍后留问不能跟随后续话题改变。
    if(reply.type==='unknown')reply.storyId=source?.id || '';
    if(reply.type==='memory')reply.sourceLabel=visible.find(item=>item.id===reply.source)?.author===P.state.chatTarget?'据本人记录整理':'据已确认的家庭记录';
    completeReply(reply);
  }
  const INVITE_RELATIONS=P.FamilyTree.relations;
  /** 邀请仅能扩大管理人自己发布且已向家庭开放的往事，家人独立确认过的范围仍由本人维护。 */
  function welcomeStories(){
    if(!P.Billing.online('father'))return [];
    return P.state.stories.filter(item=>item.author==='father'&&item.subject==='father'&&item.scope==='family'&&
      !item.pending&&!item.commonWith&&!item.approvedViewers&&item.inArchive!==false).reverse();
  }
  /** 加入邀请默认只收称呼，可选一条往事供受邀者加入后回看。 */
  function invite(personId='',invitationId='') {
    if(P.state.actor!=='father')return P.modal('邀请加入家庭',`<p>请家庭管理人 ${e(P.PEOPLE.father.name)} 为家人准备加入邀请。</p>`);
    const editing=invitationId?P.state.invitations.find(item=>item.id===invitationId&&item.status==='pending'):null;
    if(invitationId&&!editing)return P.toast('这份邀请已处理，不能继续更正。');
    personId=editing?.personId||personId;
    const available=P.state.members.filter(id=>!P.state.accounts[id]&&id!=='grandpa');
    const claim=available.length?`<label class="form-field"><span>关联家谱中的人物</span><select id="invite-person" name="personId">
      <option value="">新增一位家人</option>${available.map(id=>`<option value="${e(id)}" ${id===personId?'selected':''}>${e(P.PEOPLE[id].name)}</option>`).join('')}
      </select></label>`:'<input type="hidden" name="personId" value="">';
    const stories=welcomeStories();
    const welcome=stories.length?`<label class="form-field section"><span>加入后先看的往事（选填）</span>
      <select name="welcomeStoryId"><option value="">暂不选择</option>
        ${stories.map(story=>`<option value="${e(story.id)}" ${editing?.welcomeStoryId===story.id?'selected':''}>${e(story.title)}</option>`).join('')}
      </select></label><p class="caption">选择后，仅为这位家人开放这一条往事，确认加入时生效。</p>`:'';
    P.modal(editing?'更正加入邀请':'邀请加入家庭',`<form id="invite-form">
      <input type="hidden" name="inviteId" value="${e(editing?.id||'')}">
      <label class="form-field"><span>家人的称呼</span><input id="invite-name" name="name" placeholder="例如 妈妈或陈晨" maxlength="20" required></label>
      <details class="section" ${editing||personId?'open':''}><summary>${available.length?'补充亲属关系或关联家谱人物':'补充亲属关系'}（选填）</summary>
      ${claim}<label class="form-field"><span>对方是我的</span><select id="invite-relation" name="relation"><option value="">先不填写</option>
      ${INVITE_RELATIONS.map(value=>`<option>${value}</option>`).join('')}</select></label></details>
      ${welcome}<p class="caption">生成后可预览家人如何加入。邀请卡用于原型演示。</p>
      <button class="btn full" type="submit">${editing?'保存更正':'生成加入邀请'}</button></form>`);
    fillInvitePerson();
    if(editing&&!available.includes(editing.personId)){
      const form=document.getElementById('invite-form');
      form.elements.name.value=editing.name;
      form.elements.relation.value=INVITE_RELATIONS.includes(editing.relation)?editing.relation:'';
    }
  }
  /** 认领既有人物沿用已记录姓名和关系；新增模式允许自由填写。 */
  function fillInvitePerson() {
    const form=document.getElementById('invite-form');if(!form)return;
    const id=form.elements.personId.value,person=P.PEOPLE[id],name=form.elements.name,relation=form.elements.relation;
    name.value=person?.name || '';name.readOnly=Boolean(person);relation.disabled=Boolean(person);
    const knownRelation=person?P.relation(id,'father'):'';
    relation.value=INVITE_RELATIONS.includes(knownRelation)?knownRelation:'';
  }
  /** 创建一个待确认邀请，保留发起人身份。 */
  function createInvite(form) {
    if(!form.isConnected||P.state.actor!=='father')return;
    const data=new FormData(form),personId=String(data.get('personId') || '');
    const inviteId=String(data.get('inviteId') || ''),editing=P.state.invitations.find(item=>item.id===inviteId && item.status==='pending');
    if(inviteId && !editing)return P.toast('这份邀请已处理，不能保存旧的更正。');
    if(personId && (!P.state.members.includes(personId) || P.state.accounts[personId] || personId==='grandpa'))return P.toast('这位人物当前不需要或不能通过该邀请认领。');
    if(personId && P.state.invitations.some(item=>item.personId===personId && item.status==='pending' && item.id!==inviteId))return P.toast('这位家人已有待核对的认领邀请。');
    const name=personId?P.PEOPLE[personId].name:String(data.get('name') || '').trim();
    if(!name)return P.toast('请填写家人的称呼。');
    const relation=String(data.get('relation')||''),welcomeStoryId=String(data.get('welcomeStoryId')||'');
    if(welcomeStoryId&&!welcomeStories().some(story=>story.id===welcomeStoryId)){
      return P.toast('这条往事的分享范围已变，请重新选择。');
    }
    const id=editing?.id||P.nextId('invite'),target=personId||(editing&&!P.PEOPLE[editing.personId]?editing.personId:P.nextId('guest'));
    const values={id,personId:target,name,relation:personId?P.relation(personId,'father'):INVITE_RELATIONS.includes(relation)?relation:'家人',status:'pending',correctionNote:'',welcomeStoryId};
    if(editing)Object.assign(editing,values);else P.state.invitations.push(values);
    P.state.inviteIndex=P.state.invitations.findIndex(item=>item.id===id);
    P.navigate('invitation');
  }
  /** 只接受当前表单指向的邀请，旧表单不能因预览切换而认领另一个人物。 */
  function acceptInvite(form) {
    const state=P.state,item=state.invitations[state.inviteIndex||0];
    if(!form.isConnected||state.route!=='invitation'||item?.id!==form.elements.inviteId.value||item.status!=='pending'||item.correctionNote)return;
    const id=item.personId;if(P.state.accounts[id])return P.toast('这位人物已经认领账号，请直接切换到该账号。');
    // 等到加入才写入所选往事的名单，并以此时的发布授权为准。
    const welcomeStory=welcomeStories().find(story=>story.id===item.welcomeStoryId);
    item.status='accepted';
    if(!P.PEOPLE[id])P.PEOPLE[id]={name:item.name,short:item.name.slice(0,1),relation:item.relation,born:'',color:'sand'};
    P.state.accounts[id]=P.newAccount();P.state.familyFocus[id]='father';
    if(P.state.familyWorkspace){
      // 仅给已认领账号建立双向档案入口。未认领的族谱人物没有访问授权，旧故事仍以原分享名单为准。
      const otherAccounts = state.members.filter(person => person !== id && Object.hasOwn(state.accounts, person));
      state.familyInvitations[id] = [...otherAccounts];
      state.familyAccess[id] = { archive: [...otherAccounts], digital: [], space: [] };
      for (const person of otherAccounts) {
        const invitations = state.familyInvitations[person] ||= [];
        const access = state.familyAccess[person] ||= { archive: [], digital: [], space: [] };
        if (!invitations.includes(id)) invitations.push(id);
        if (!access.archive.includes(id)) access.archive.push(id);
      }
    }else{
      P.state.familyInvitations[id]=['father'];P.state.familyAccess.father.archive.push(id);
    }
    if(!P.state.members.includes(id))P.state.members.push(id);
    if(welcomeStory&&!welcomeStory.viewers.includes(id))welcomeStory.viewers.push(id);
    P.state.inviteIndex=null;P.changeActor(id);
    const canReadWelcome=welcomeStory&&P.FamilyContext.readable(welcomeStory);
    P.navigate(canReadWelcome?'story/'+welcomeStory.id:'home');
    P.toast(canReadWelcome?'已加入家庭，可以回看为你选的往事。':'已加入家庭，当前正在预览这位家人的账号。');
  }
  /** 人物详情不会将亲属关系视为私人资料访问许可。 */
  function person(id) {
    const p=P.PEOPLE[id];
    if (!p) return;
    // 与首页家谱共用人物志入口，按当前家庭成员身份定位档案。
    const archive = b('查看' + e(p.name) + '的完整档案', 'house-story-person', 'btn full', `data-id="${e(id)}"`);
    P.modal(p.name,`<div class="person-modal-top">${a(id,'large')}<div><h3>${e(p.name)}</h3><p class="caption">${e(P.relation(id))}${p.born?' · '+p.born+'年生':''}</p>${t(id==='grandpa'?'家人记载':'关系已确认',id==='grandpa'?'gray':'')}</div></div><p>${P.state.familyWorkspace?'可以查看这位家人已向你分享的资料。':id==='father'?'可以查看这位家人已分享的人生记录。':id==='grandpa'?'历史人物资料由家人整理，保留记录者身份。':'你们可以一起补充共同经历。'}</p>${archive}${P.state.actor==='father' && !P.state.accounts[id] && id!=='grandpa'?b('邀请本人认领已有人物','invite-claim','btn secondary full',`data-id="${id}"`):''}<p class="caption section">管理身份和亲属称呼不代表可以查看全部个人资料。</p>`);
  }
  /** 仅允许资料本人更改其已有故事的可见范围。 */
  function share(id) {
    const item=P.state.stories.find(x=>x.id===id && x.author===P.state.actor && !x.coupleId);
    if (!item) return P.toast('这段资料的分享范围由本人决定。');
    P.state.shareStoryId=id;
    P.modal('这段故事分享给谁',`<p>${e(item.title)}</p><form id="share-form"><div class="privacy-options">${[['private','仅自己'],['selected','指定家人，按下方名单选择'],['family','当前家庭的家人']].map(([key,name])=>`<label><input type="radio" name="scope" value="${key}" ${item.scope===key?'checked':''}>${name}</label>`).join('')}</div>${P.shareViewerOptions(item.viewers)}<p class="caption">仅“指定家人”使用下方勾选名单；“当前家庭”以保存时成员范围为准，不自动授予未来加入的家人。</p><button class="btn full" type="submit">确认分享范围</button></form>`,'sheet');
  }
  /** 对当前家庭的分享固定到本次成员名单，新增成员不会悄悄扩大访问。 */
  function applyShare(form) {
    const state=P.state;
    const item=state.stories.find(x=>x.id===P.state.shareStoryId && x.author===P.state.actor && !x.coupleId);
    if (!item) return;
    const data=new FormData(form),scope=String(data.get('scope'));
    if(!['private','selected','family'].includes(scope))return;
    const viewers=scope==='family'?[...P.state.members]:scope==='selected'?data.getAll('viewers').filter(id=>P.state.members.includes(id) && id!==P.state.actor):[];
    if(scope==='selected' && !viewers.length)return P.toast('请选择至少一位家人，或改为仅自己。');
    item.scope=scope;item.viewers=viewers;
    // 收紧范围同时取消待接受邀请中的单条授权，后续重新分享时需要重新选择。
    if(scope!=='family'){
      for(const invitation of state.invitations){
        if(invitation.status==='pending'&&invitation.welcomeStoryId===item.id)invitation.welcomeStoryId='';
      }
    }
    // 已纳入的内容不因提供者扩大名单而自动扩大，本人需再次确认新增成员。
    P.closeModal();P.render();P.toast('分享范围已更新，不影响其他家人的独立记录。');
  }
  /** 待处理数量按当前本人或内容提供者计算，不把全部申请只交给家庭管理人。 */
  function pendingCount() {
    const s=P.state;
    return s.accessRequests.filter(request=>request.status==='pending-owner'&&s.stories.some(item=>item.id===request.storyId&&(item.commonWith||item.subject)===s.actor)).length+s.stories.filter(item=>item.commonWith===s.actor&&item.scope!=='private'&&item.viewers.includes(s.actor)&&!item.inclusions?.[s.actor]?.reviewed).length+s.familyRequests.filter(item=>item.person===s.actor&&item.kind!=='digital'&&item.status==='pending').length+s.pending.filter(item=>item.status==='pending' && item.subject===s.actor).length+s.accessRequests.filter(request=>request.status==='pending' && s.stories.some(item=>item.id===request.storyId && item.author===s.actor)).length;
  }
  /** 本人可确认家人补充；查看申请始终交给该内容的分享控制人。 */
  function pending() {
    const additions=P.state.pending.filter(item=>item.status==='pending' && item.subject===P.state.actor).map(x=>`<div class="pending-item"><strong>${e(x.title)}</strong><p>${e(P.PEOPLE[x.author]?.name || '家人')}补充：${e(x.text[0])}</p><p class="caption">分享：${x.scope==='family'?'提交时的家庭成员':x.viewers.map(id=>e(P.PEOPLE[id].name)).join('、')}</p>${b('核对并加入档案','approve-pending','btn compact',`data-id="${x.id}"`)} ${b('退回更正','return-pending','text-link',`data-id="${x.id}"`)}</div>`).join('');
    const requests=P.state.accessRequests.filter(x=>x.status==='pending' && P.state.stories.some(item=>item.id===x.storyId && item.author===P.state.actor)).map(x=>`<div class="pending-item"><strong>查看申请</strong><p>${e(P.PEOPLE[x.actor].name)}希望查看《${e(P.state.stories.find(item=>item.id===x.storyId).title)}》。</p>${b('仅向这位家人开放','approve-access','btn compact',`data-id="${x.id}"`)} ${b('暂不开放','deny-access','text-link',`data-id="${x.id}"`)}</div>`).join('');
    const ownerRequests=P.state.accessRequests.filter(request=>request.status==='pending-owner').map(request=>({request,item:P.state.stories.find(item=>item.id===request.storyId&&(item.commonWith||item.subject)===P.state.actor)})).filter(value=>value.item).map(({request,item})=>`<div class="pending-item"><p>提供者同意向${e(P.PEOPLE[request.actor].name)}分享《${e(item.title)}》，等待你确认。</p>${b('核对新增分享对象','family-consent','btn',`data-id="${item.id}"`)}</div>`).join('');
    const common=P.state.stories.filter(item=>item.commonWith===P.state.actor&&item.scope!=='private'&&item.viewers.includes(P.state.actor)&&!item.inclusions?.[P.state.actor]?.reviewed).map(item=>`<div class="pending-item"><strong>${e(item.title)}</strong><p>${e(P.PEOPLE[item.author].name)}讲述的共同回忆</p>${b('核对纳入与分享范围','family-consent','btn',`data-id="${item.id}"`)}</div>`).join('');
    const permissions=P.state.familyRequests.some(item=>item.person===P.state.actor&&item.kind!=='digital'&&item.status==='pending')?l('处理人生空间开放申请','family-permissions','btn full'):'';
    P.modal('家人的补充与申请',ownerRequests+common+permissions+additions+requests || '<p>暂时没有需要确认的内容。</p>');
  }
  /** 确认后进入档案并标明确认者；退回会保留原稿给提供者继续更正。 */
  function reviewPending(id,approve) {
    const item=P.state.pending.find(entry=>entry.id===id && entry.subject===P.state.actor && entry.status==='pending');
    if(!item)return;
    if(approve){P.state.pending=P.state.pending.filter(entry=>entry.id!==id);const {status,feedback,...story}=item;P.state.stories.push({...story,confirmedBy:P.state.actor,approvedViewers:[...story.viewers],aiAllowed:false});}
    else {item.status='returned';item.feedback='请再核对这段经历的时间、人物与经过，修改后重新提交。';}
    P.closeModal();P.render();P.toast(approve?'已确认补充，保留提供者与原分享范围。':'已退回提供者更正，原稿没有丢失。');
  }
  /** 重复查看申请不会不断堆积；不存在或已获授权的内容不创建申请。 */
  function requestAccess(storyId) {
    const s=P.state;
    if(!s.stories.some(item=>item.id===storyId&&!item.coupleId) || P.visibleStories().some(item=>item.id===storyId))return P.toast('当前不需要申请这段内容。');
    if(!s.accessRequests.some(item=>item.actor===s.actor && item.storyId===storyId && ['pending','pending-owner'].includes(item.status)))s.accessRequests.push({id:P.nextId('access'),actor:s.actor,storyId,status:'pending'});
    P.toast('申请已提交给内容提供者，授权前仍无法查看。');
  }
  /** 授权只增加申请人；拒绝申请不会扩大原有可见范围。 */
  function decideAccess(id,approve) {
    const request=P.state.accessRequests.find(entry=>entry.id===id && entry.status==='pending');
    const item=P.state.stories.find(story=>story.id===request?.storyId && story.author===P.state.actor);
    if(!request || !item)return;
    const owner=item.commonWith||item.subject,approved=item.commonWith?item.inclusions?.[owner]?.viewers:item.approvedViewers;
    if(approve&&owner!==item.author&&(item.commonWith||approved)&&!(approved||[]).includes(request.actor)){
      item.scope='selected';item.viewers=[...new Set([...item.viewers,request.actor])];request.status='pending-owner';
      P.closeModal();P.render();return P.toast('提供者已同意，仍需共同经历的本人确认范围；暂未开放给申请人。');
    }
    request.status=approve?'accepted':'declined';
    if(approve){item.scope='selected';item.viewers=[...new Set([...item.viewers,request.actor])];}
    P.closeModal();P.render();P.toast(approve?'已仅向申请人开放。':'本次暂不开放，原有分享范围保持不变。');
  }
  /** 将获准导出的本人记录作为本地示例 JSON 下载。 */
  function exportRecords() {
    const items=P.state.stories.filter(x=>x.author===P.state.actor&&!x.coupleId);
    const blob=new Blob([JSON.stringify({notice:'示例人物与材料，静态原型导出',person:P.PEOPLE[P.state.actor].name,records:items},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download='人生记录-原型示例导出.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    P.toast('已导出当前账号的示例记录。');
  }
  /** 统一派发按钮动作；新增动作应保持与其界面文案一致。 */
  function act(action,el) {
    const s=P.state;
    if(P.FamilyMoment.handleAction(action)||P.FamilyEditions.handleAction(action,el)||P.Households.handleAction(action,el)||P.FamilyHomeEditor.handleAction(action,el))return;
    if (P.FamilyTree.handleAction(action, el)) return;
    if (action === 'family-album-photo') return P.FamilyJournal.openPhoto(el);
    if (P.FamilyAssistant.handleAction(action, el) || P.FamilyPicks.handleAction(action, el)) return;
    if(P.FamilyContext.handleAction(action,el)||P.FamilyMemories.handleAction(action,el))return;
    if(P.BillingViews.handleAction(action,el))return;
    if(P.Customization.handleAction(action,el))return;
    if(P.MaterialLibrary.handleAction(action,el)||P.AnswerFeedback.handleAction(action,el))return;
    if(P.ContentChat.handleAction(action,el))return;
    if(P.PersonArchive?.handleAction(action,el))return;
    if(P.DigitalHuman?.handleAction(action,el))return;
    const simple={invite,pending,export:exportRecords};
    if (simple[action]) return simple[action]();
    if (action === 'request-access') return requestAccess(el.dataset.id);
    if (action==='source' || action==='listen') return source(el.dataset.id || 'first-order');
    if (action==='read-transcript') return readTranscript(el.dataset.id);
    if (action==='invite-claim') return invite(el.dataset.id);
    if (action==='invite-person-change') return fillInvitePerson();
    if (action==='edit-invite') return invite('',el.dataset.id);
    if (action==='revoke-invite') {const item=s.invitations.find(entry=>entry.id===el.dataset.id && entry.status==='pending');if(s.actor==='father' && item){item.status='revoked';P.render();P.toast('邀请已撤回，不会新增账号或成员。');}return;}
    if (action==='family-tab') {s.familyTab=el.dataset.value;return P.render();}
    if (action==='person') return person(el.dataset.id);
    if (action==='enter-owner') {P.changeActor('father');return P.navigate('home');}
    if (action==='enter-family') {P.changeActor('xia');return P.navigate('home');}
    if (action==='share-owned') return share(el.dataset.id);
    if (action==='share-story') return share(s.storyId);
    if (action==='ask-order' || action==='ask-advice') return P.FamilyAssistant.openQuestion(action==='ask-order'?'第一次创业时最担心什么？':'遇到困难时，你会怎么做？');
    if (action === 'jump-story-conversation') return P.QuestionInbox.focusConversation();
    if (action==='focus-chat') return document.getElementById('chat-input')?.focus();
    if (action==='preview-invite') {s.inviteIndex=Number(el.dataset.index);return P.navigate('invitation');}
    if (action==='correct-invite') {const item=s.invitations[s.inviteIndex || 0];if(item?.status==='pending'){item.correctionNote='姓名、人物或关系需要更正，邀请人修改后请重新核对。';P.render();P.toast('更正请求已保存在当前演示，尚未加入家庭。');}return;}
    if (action==='approve-pending' || action==='return-pending') return reviewPending(el.dataset.id,action==='approve-pending');
    if (action==='approve-access' || action==='deny-access') return decideAccess(el.dataset.id,action==='approve-access');
    if (action === 'toggle-font') {
      const focusId = el.matches(':focus-visible') ? el.id : '';
      P.toggleFont();
      if (focusId) document.getElementById(focusId)?.focus({preventScroll: true});
      return;
    }
    if (action==='clear-chat-context') {s.chatContext=null;return P.render();}
    if (action==='choose-person') return P.modal('选择交流的人物',`<div class="family-selector"><button data-action="close-modal">${a('father')}<span>爸爸的数字人<small>陈远山 · 已获授权</small></span>${i('check')}</button><button data-action="unavailable-person">${a('mother')}<span>妈妈 · 林慧<small>尚未建立或开放数字人</small></span>${i('lock')}</button></div>`);
    if (action==='unavailable-person') return P.toast('这位家人尚未建立或向你开放数字人服务。');
    if (action==='close-modal') return P.closeModal();
  }
  /** 表单只提交到本地演示动作。 */
  function submit(event) {
    event.preventDefault();
    const form=event.target;
    if(P.FamilyMoment.submit(form)||P.Households.submit(form)||P.FamilyHomeEditor.submit(form))return;
    if (P.FamilyTree.submit(form)) return;
    if (P.FamilyAssistant.submit(form)) return;
    if(P.FamilyContext.submit(form)||P.FamilyMemories.submit(form))return;
    if(P.BillingViews.submit(form))return;
    if(P.Customization.submit(form))return;
    if(P.MaterialLibrary.submit(form,event)||P.AnswerFeedback.submit(form,event))return;
    if(P.QuestionInbox?.submit(form))return;
    if (form.id==='chat-form') {const text=String(new FormData(form).get('message') || '');if(text.trim()){P.DigitalHuman.clearDraft();return sendMessage(text);}return;}
    if (form.id==='invite-form') return createInvite(form);
    if (form.id==='accept-invite-form') return acceptInvite(form);
    if (form.id==='share-form') return applyShare(form);
  }
  P.act=act;P.submit=submit;P.sendChatMessage=sendMessage;P.pendingCount=pendingCount;P.welcomeStories=welcomeStories;
}
