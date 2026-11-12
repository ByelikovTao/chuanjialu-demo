/** 归家汇总家庭传承、家人关系和获授权的相册与动态。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,icon:i}=P;
  const ALBUM_SCROLL_SPEED = 18;
  const ALBUM_RESUME_MS = 1200;
  const PEDIGREE_ADD_WIDTH = 44;
  const PEDIGREE_ADD_GAP = 8;
  const PEDIGREE_ADD_GUTTER = PEDIGREE_ADD_WIDTH + PEDIGREE_ADD_GAP;
  let stopAlbum = null;
  /** 点击家谱节点进入按此人筛选的家庭往事。 */
  function kinNode(id,person,position='',editing=false) {
    const focus=id===person,label=focus?(P.state.familyWorkspace?'当前人物':'档案人'):P.relation(id,person);
    return b(`${P.avatar(id)}<span><strong>${e(P.PEOPLE[id].name)}</strong><small>${e(label)}</small></span>`,'house-story-person',`heritage-pedigree-node ${focus?'is-focus':''}`,`data-id="${e(id)}" data-pedigree-person="${e(id)}" aria-label="${e(P.PEOPLE[id].name)}，${e(label)}，查看相关往事" ${position}${editing?' inert':''}`);
  }
  /** 编辑时为各分支预留一个新节点，配偶的添加线直接从档案人引出。 */
  function compactPedigree(person,groups,partners,editing) {
    const partnerSpacing = editing ? 120 : 136;
    const gutter = editing ? PEDIGREE_ADD_GUTTER : 0;
    const parentCount = groups.parents.length + Number(editing);
    const childCount = groups.children.length + Number(editing);
    const width = Math.max(280, Math.max(parentCount, childCount) * 120,
      112 + partners.length * partnerSpacing + gutter + (editing ? 8 : 24));
    const focusX = (width + gutter - partners.length * partnerSpacing) / 2;
    const focusY = parentCount ? 100 : 4;
    const childY = focusY + 96;
    const height = (childCount ? childY : focusY) + 68;
    const positions=count=>count===1?[focusX]:Array.from({length:count},(_,index)=>56+index*(width-112)/(count-1));
    const parentX=positions(parentCount),childX=positions(childCount),mateX=partners.map((_,index)=>focusX+(index+1)*partnerSpacing);
    const position=(x,y)=>`style="left:${x/width*100}%;top:${y}px"`;
    const node=(id,x,y)=>kinNode(id,person,position(x,y),editing);
    const parentPath=x=>`M${x} 68V84H${focusX}V${focusY}`;
    const childPath=x=>`M${focusX} ${focusY+64}V${focusY+80}H${x}V${childY}`;
    const nodes=groups.parents.map((id,index)=>node(id,parentX[index],4)).join('')+node(person,focusX,focusY)+partners.map((id,index)=>node(id,mateX[index],focusY)).join('')+groups.children.map((id,index)=>node(id,childX[index],childY)).join('');
    const parentLines=groups.parents.map((_,index)=>`<path d="${parentPath(parentX[index])}"/>`).join('');
    const childLines=groups.children.map((_,index)=>`<path d="${childPath(childX[index])}"/>`).join('');
    const coupleLines=mateX.map(x=>`<path class="is-couple" d="M${focusX+56} ${focusY+30}H${x-56}M${focusX+56} ${focusY+34}H${x-56}"/>`).join('');
    const partnerAddX = focusX - 56 - PEDIGREE_ADD_GAP - PEDIGREE_ADD_WIDTH / 2;
    const additions = editing ? [
      { group: 'parents', x: parentX.at(-1), y: 4, path: parentPath(parentX.at(-1)) },
      { group: 'partner', x: partnerAddX, y: focusY, path: `M${partnerAddX + PEDIGREE_ADD_WIDTH / 2} ${focusY + 32}H${focusX - 56}` },
      { group: 'children', x: childX.at(-1), y: childY, path: childPath(childX.at(-1)) }
    ] : [];
    const addNodes = additions.map(({group,x,y})=>P.FamilyTree.homeAddNode(group,position(x,y))).join('');
    const addLines = additions.map(({path})=>`<path class="is-add-link" d="${path}"/>`).join('');
    return `<div class="heritage-pedigree-canvas" style="--pedigree-width:${width}px;--pedigree-add-width:${PEDIGREE_ADD_WIDTH}px;height:${height}px">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g>${parentLines}${childLines}${coupleLines}${addLines}</g></svg>
      ${nodes}${addNodes}
    </div>`;
  }
  /** 每列用两单位标注中点。支线只连到首列的档案人，避免把子女连到未确认的另一位家长。 */
  function pedigreeBranches(count,columns,kind,editing) {
    const fromParents=kind==='parents',rootEdge=fromParents?24:0,branchEdge=fromParents?0:24;
    const branches=Array.from({length:count},(_,index)=>`M${index*2+1} 12V${branchEdge}`).join('');
    const confirmed=count?`<path d="M1 ${rootEdge}V12H${count*2-1}${branches}"/>`:'';
    const addition=editing?`<path class="is-add-link" d="M1 ${rootEdge}V12H${count*2+1}V${branchEdge}"/>`:'';
    return `<svg class="heritage-pedigree-branches" data-pedigree-links="${kind}" viewBox="0 0 ${columns*2} 24" preserveAspectRatio="none" aria-hidden="true">${confirmed}${addition}</svg>`;
  }
  /** 大字号人物卡随姓名自然增高。每位配偶单独与档案人相连。 */
  function readablePedigree(person,{parents,children},partners,editing) {
    const columns=Math.max(parents.length+Number(editing),children.length+Number(editing),partners.length?2:1);
    const renderNodes=members=>members.map(id=>kinNode(id,person,'',editing)).join('');
    const add=group=>editing?P.FamilyTree.homeAddNode(group):'';
    const row=(members,label,kind)=>`<div class="heritage-pedigree-row" data-pedigree-branch="${kind}" role="group" aria-label="${label}">${renderNodes(members)}${add(kind)}</div>`;
    return `<div class="heritage-pedigree-canvas heritage-pedigree-readable${editing?' is-editing':''}" style="--pedigree-columns:${columns};--pedigree-add-width:${PEDIGREE_ADD_WIDTH}px;--pedigree-add-gutter:${PEDIGREE_ADD_GUTTER}px">
      ${parents.length||editing?row(parents,'父母','parents')+pedigreeBranches(parents.length,columns,'parents',editing):''}
      <div class="heritage-pedigree-row heritage-pedigree-focus-row" role="group" aria-label="${partners.length?'档案人与配偶':'档案人'}">${kinNode(person,person,'',editing)}${partners.length?`<div class="heritage-pedigree-partners" role="group" aria-label="配偶">${renderNodes(partners)}</div>`:''}${add('partner')}</div>
      ${children.length||editing?pedigreeBranches(children.length,columns,'children',editing)+row(children,'子女','children'):''}
    </div>`;
  }
  function familyViewPanel(control, content, { map, editing }) {
    const editControl = map ? '' : P.FamilyTree.homeEditControl();
    const tools = editing
      ? `<span class="home-family-edit-title">${i('edit')}编辑谱系</span>${editControl}`
      : editControl + control;
    return `<div class="home-family-panel${map ? ' is-map' : editing ? ' is-editing' : ''}">
      <div class="home-family-panel-tools">${tools}</div>
      <div id="home-family-view">
        ${content}${map ? P.FamilyMap.view() : ''}
      </div>
    </div>`;
  }
  /** 直系与配偶按已知关系连线，隔代与旁系单列，避免画出未经确认的关系。 */
  function kinship(person, viewSwitch, map) {
    const groups=P.FamilyHome.relatives(person),partners=groups.couple.filter(id=>id!==person);
    const editing = !map && P.FamilyTree.homeEditing();
    const name=e(P.PEOPLE[person]?.name||'家人');
    const diagram=P.state.fontLarge?readablePedigree(person,groups,partners,editing):compactPedigree(person,groups,partners,editing);
    const others = !map && (groups.others.length || editing)
      ? `<div class="home-kinship-other">${groups.others.length ? '<h3>其他家人</h3>' : ''}
        <div>${groups.others.map(id => kinNode(id, person, '', editing)).join('')}${editing ? P.FamilyTree.homeAddNode('others') : ''}</div></div>`
      : '';
    // 地图用关系树占位计算卡片高度，编辑时仅让新节点响应添加操作。
    const viewportLabel = editing ? `${name}的家族谱系编辑` : `${name}的已知亲缘关系`;
    const viewport = `<div class="heritage-pedigree-viewport"${map ? ' inert' : ''} role="group" aria-label="${viewportLabel}">${diagram}</div>`;
    return `<div class="heritage-kinship home-kinship-preview">
      ${familyViewPanel(viewSwitch, editing ? viewport + others : viewport, { map, editing })}
      ${editing ? '' : others}
    </div>`;
  }
  function sectionHeading(id, title, action = '') {
    return `<div class="section-heading home-section-heading"><h2 id="${id}">${title}</h2>${action}</div>`;
  }
  function editLink(kind, person, label) {
    return P.FamilyHome.editable(kind, person)
      ? b(i('edit') + '编辑', 'heritage-edit', 'heritage-text-button home-edit-button',
        `data-kind="${kind}" data-person="${e(person)}" aria-label="编辑${label}"`)
      : '';
  }
  /** 示例家庭使用示例全家福，新建家庭在上传前沿用中性的老屋封面。 */
  function mottoArtwork(cover = '') {
    const example = P.Households.isExample();
    const src = cover || (example ? 'assets/zhumen/entry-preview-family.png' : 'assets/family-home/motto-room.webp');
    const alt = cover ? '家训背景图' : example ? '示例全家福' : '';
    return `<div class="home-motto-art${cover ? ' is-uploaded' : ''}"><img src="${e(src)}" alt="${alt}"></div>`;
  }
  function leafHeading(id, title, edit) {
    return `<div class="home-leaf-heading"><h2 id="${id}">${title}</h2>${edit}</div>`;
  }
  function motto(owner) {
    const doc = P.FamilyHome.document('motto');
    const signature = doc?.kind === 'new' ? '立' : '整理确认';
    const copy = doc
      ? `<div class="home-motto-text">
          <blockquote class="home-motto-quote">${e(doc.text)}</blockquote>
          <p class="heritage-caption home-motto-signature">${e(P.PEOPLE[owner].name)} ${signature}</p>
        </div>`
      : '<p class="heritage-empty">家训待整理。</p>';
    return `<section class="home-motto-sheet" data-home-section="motto" aria-labelledby="home-motto-title">
      ${mottoArtwork(doc?.cover)}
      <div class="home-motto-copy">
        ${leafHeading('home-motto-title', '家训', editLink('motto', owner, '家训'))}
        ${copy}
      </div>
    </section>`;
  }
  function surname(owner) {
    const details = P.FamilyHome.surnameDetails(owner);
    return `<section class="home-roots-section" data-home-section="surname" aria-labelledby="home-surname-title">
      <span class="home-roots-mark home-surname-seal">${e(details?.name || '姓')}</span>
      ${leafHeading('home-surname-title', '姓氏源流', editLink('surname', owner, '姓氏源流'))}
      <p class="home-roots-detail home-roots-summary">${e(details?.summary || details?.text || '姓氏源流待整理。')}</p>
    </section>`;
  }
  function origin(owner) {
    const doc = P.FamilyHome.document('origin', owner);
    const earliest = doc?.trace?.earliest;
    return `<section class="home-roots-section" data-home-section="origin" aria-labelledby="home-origin-title">
      <span class="home-roots-mark home-origin-mark" aria-hidden="true">${i('book')}</span>
      ${leafHeading('home-origin-title', '家族寻根', editLink('origin', owner, '家族寻根'))}
      ${earliest ? '<span class="home-origin-timeline" aria-hidden="true"></span>' : ''}
      <div class="home-roots-detail">
        ${earliest ? `<p class="home-origin-date">${e(earliest)}</p>` : ''}
        <p class="home-roots-summary home-origin-summary">${e(doc?.text || '祖籍和家族记载待整理。')}</p>
      </div>
      ${doc ? b('查看详情 ' + i('arrow'), 'heritage-origin', 'heritage-text-button home-origin-link', `data-person="${e(owner)}" aria-label="查看家族寻根详情"`) : ''}
    </section>`;
  }
  function familyTree(owner) {
    const map = P.state.homeFamilyDisplay === 'map';
    const target = map ? 'tree' : 'map';
    const label = map ? '关系树' : '分布地图';
    const viewSwitch = b(i(target) + label, 'home-family-display', 'heritage-text-button',
      `id="home-family-view-switch" data-view="${target}" aria-controls="home-family-view" aria-label="切换到${label}"`);
    return `<section data-home-section="tree" aria-labelledby="home-tree-title">
      ${sectionHeading('home-tree-title', '家族谱系')}
      ${kinship(owner, viewSwitch, map)}
    </section>`;
  }
  function albumCard({ cover, title, route, kind, photoId }) {
    const video = kind === 'clip';
    const thumbnail = cover ? `<img src="${e(cover)}" alt="" loading="lazy" draggable="false">` : video ? '' :
      i('photo') + (photoId ? `<img data-album-photo="${e(photoId)}" alt="" draggable="false" hidden>` : '');
    const playback = video ? `<span class="home-album-play" aria-hidden="true">${i('play')}</span>` : '';
    return l(`<span class="home-album-cover">${thumbnail}${playback}</span>`,
      e(route), 'home-album-card', `aria-label="${e((video ? '查看视频，' : '查看照片，') + title)}"`);
  }
  function albumTrack(entries, id, label) {
    const scrollable = entries.length > 3 ? ' is-scrollable' : '';
    return `<div id="${e(id)}" class="home-album-track${scrollable}" role="group" aria-label="${e(label)}">${entries.map(albumCard).join('')}</div>`;
  }
  function album() {
    const entries = P.Households.recentAlbum(12);
    return `<section data-home-section="album" aria-labelledby="home-album-title">
      ${sectionHeading('home-album-title', '家中留影', l('家庭全部记录 '+i('arrow'), 'house-stories/family', 'heritage-text-button'))}
      ${entries.length
        ? albumTrack(entries, 'home-album-track', '近期照片和视频')
        : `<div class="home-section-empty"><p>家里还没有共享的照片或视频。</p>${l('添加记录', 'house-add', 'heritage-text-button')}</div>`}
    </section>`;
  }
  /** 相册在视野内持续往返，手动滚动结束后从当前位置续播。 */
  function mountAlbum(content) {
    const track = content.querySelector('.home-album-track');
    if (!track) return;
    const state = P.state;
    track.addEventListener('click', event => {
      const card = event.target.closest('.home-album-card');
      if (card) state.albumReturn = {
        from: location.hash.slice(1) || 'home', actor: state.actor, route: card.dataset.nav,
        top: content.scrollTop, left: track.scrollLeft
      };
    });
    if (!track.classList.contains('is-scrollable')) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let direction = 1;
    let resumeTimer = 0;
    let frame = 0;
    const stopSlide = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const startSlide = () => {
      if (frame || resumeTimer || !inView || !track.isConnected || reduceMotion.matches || document.hidden || track.matches(':focus-within')) return;
      let position = track.scrollLeft;
      let previousTime;
      const slide = now => {
        const end = track.scrollWidth - track.clientWidth;
        if (end <= 1) {
          stopSlide();
          return;
        }
        const elapsed = Math.min(now - (previousTime ?? now), 48);
        previousTime = now;
        position = Math.min(position, end);
        if (position <= 0) direction = 1;
        else if (position >= end) direction = -1;

        // 保留小数位置，避免每帧移动不足一像素时被浏览器取整。
        // 接近两端时略微减速，抵达后随下一帧折返。
        const edge = Math.min(1, Math.min(position, end - position) / 20);
        const distance = ALBUM_SCROLL_SPEED * (0.55 + 0.45 * edge) * elapsed / 1000;
        position = Math.max(0, Math.min(end, position + distance * direction));
        track.scrollLeft = position;
        frame = window.requestAnimationFrame(slide);
      };
      frame = window.requestAnimationFrame(slide);
    };
    const syncSlide = () => {
      stopSlide();
      startSlide();
    };
    const pauseForBrowsing = () => {
      stopSlide();
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        resumeTimer = 0;
        startSlide();
      }, ALBUM_RESUME_MS);
    };

    track.addEventListener('pointerdown', pauseForBrowsing, { passive: true });
    track.addEventListener('focusin', stopSlide);
    track.addEventListener('focusout', pauseForBrowsing);
    track.addEventListener('wheel', event => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || (event.shiftKey && event.deltaY !== 0);
      if (horizontal) pauseForBrowsing();
    }, { passive: true });
    track.addEventListener('scroll', () => {
      if (!frame) pauseForBrowsing();
    }, { passive: true });
    reduceMotion.addEventListener('change', syncSlide);
    document.addEventListener('visibilitychange', syncSlide);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= .5;
      syncSlide();
    }, { root: content, threshold: .5 });
    observer.observe(track);
    stopAlbum = () => {
      inView = false;
      stopSlide();
      window.clearTimeout(resumeTimer);
      observer.disconnect();
      reduceMotion.removeEventListener('change', syncSlide);
      document.removeEventListener('visibilitychange', syncSlide);
    };
  }
  function unmountAlbum() {
    stopAlbum?.();
    stopAlbum = null;
  }
  /** 只在同一账号从原记录返回原列表时恢复滚动位置。 */
  function restoreAlbum(content, previousRoute) {
    const position = P.state.albumReturn;
    P.state.albumReturn = null;
    if (!position || position.route !== previousRoute || position.from !== (location.hash.slice(1) || 'home') || position.actor !== P.state.actor) return;
    const track = content.querySelector('.home-album-track');
    if (!track) return;
    track.scrollLeft = position.left;
    content.scrollTop = position.top;
  }
  function activity() {
    const recent = P.Households.recentRecords(3);
    return `<section class="family-dashboard-recent" data-home-section="activity" aria-labelledby="family-recent-heading">
      ${sectionHeading('family-recent-heading', '家中近事', l('查看更多 '+i('arrow'), 'house-stories/family/recent', 'heritage-text-button'))}
      ${P.PhotoStories.homeReplies()}
      ${recent ? `<div class="family-record-list">${recent}</div>` : '<p class="home-section-empty">家里还没有新的共享记录。</p>'}
    </section>`;
  }
  /** 管理入口复用既有编辑动作与确认规则，不在首页复制另一套操作。 */
  function managementRow(kind,person,title,note) {
    return P.FamilyHome.editable(kind,person)?b(`${i('edit')}<span><strong>${title}</strong><small>${e(note)}</small></span>${i('arrow')}`,'heritage-edit','menu-row',`data-kind="${kind}" data-person="${e(person)}"`):'';
  }
  /** 家族来源由档案本人整理，家人可向家训确认人提交建议。 */
  function manage() {
    const person=P.FamilyContext.current();if(!person||!P.FamilyHome.member())return '<div class="page empty"><h2>暂无可整理的家庭内容</h2></div>';
    const home=P.FamilyHome.ensure(),mottoDoc=P.FamilyHome.document('motto',person),pending=home.family.suggestions.filter(item=>item.status==='pending').length;
    const personal=managementRow('surname',person,'姓氏源流','整理姓氏及相关记载')+
      managementRow('origin',person,'家族寻根','补充祖籍、迁徙和家庭资料');
    const family=managementRow('motto',person,mottoDoc?'编辑家庭家训':'建立家庭家训','全家共用，由指定的档案本人确认');
    const suggestions=P.FamilyHome.editable('motto',person)?(pending?b(`${i('family')}<span>家人建议 ${pending}</span>${i('arrow')}`,'heritage-suggestions','menu-row'):''):b(`${i('family')}<span>协助整理家训</span>${i('arrow')}`,'heritage-suggest','menu-row');
    return `<div class="page heritage-manage"><h1 class="page-title">首页内容</h1><p class="page-subtitle">${e(P.PEOPLE[person]?.name||'家人')}的家庭电子族谱</p>${!personal?'<p class="note section">家族来源由档案本人整理，你可以协助提交家训建议。</p>':''}<div class="profile-menu section">${personal}${family}${suggestions}</div>${mottoDoc?`<div class="note section"><strong>当前家庭家训</strong><p class="heritage-review-copy">${e(mottoDoc.text)}</p><p>${e(mottoDoc.source)}</p><p class="caption">${e(P.PEOPLE[home.family.mottoOwner]?.name||'指定本人')}确认 · ${e(mottoDoc.date)}</p></div>`:''}${l('返回我的家庭','profile-family','text-link full section')}</div>`;
  }
  /** 首页围绕当前家庭的档案人，切换预览账号时沿用同一份家庭传承。 */
  function render() {
    const owner = P.FamilyHome.ensure().family.mottoOwner;
    if (!P.FamilyHome.member() || !P.PEOPLE[owner]) {
      return '<div class="page empty"><h2>还没有可查看的家庭档案</h2></div>';
    }
    return `<div class="page home-family heritage-home family-dashboard"><div class="heritage-body">
      <div class="home-heritage-leaf">
        ${motto(owner)}
        <div class="home-roots">
          ${surname(owner)}
          ${origin(owner)}
        </div>
      </div>
      ${familyTree(owner)}
      ${album()}
      ${activity()}
    </div></div>`;
  }
  P.FamilyHomeViews={render,mottoArtwork,albumTrack,mountAlbum,unmountAlbum,restoreAlbum};P.views['home-manage']=manage;
}
