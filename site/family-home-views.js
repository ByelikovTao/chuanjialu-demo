/** 归家汇总家庭传承、家人关系和获授权的相册与动态。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,icon:i}=P;
  const COVER_INTERVAL_MS = 3200;
  const COVER_SLIDE_MS = 480;
  const COVER_DRAG_SETTLE_MS = 260;
  const COVER_DRAG_SLOP = 6;
  const COVER_SWIPE_DISTANCE = 42;
  const ALBUM_SCROLL_SPEED = 18;
  const ALBUM_RESUME_MS = 1200;
  const PEDIGREE_MEMBER_WIDTH = 112;
  const PEDIGREE_MEMBER_HEIGHT = 64;
  const PEDIGREE_MEMBER_STEP = 120;
  const PEDIGREE_SLOT_WIDTH = 44;
  const PEDIGREE_SLOT_GUTTER = 52;
  let stopAlbum = null;
  let stopCover = null;
  /** 点击家谱节点进入按此人筛选的家庭往事。 */
  function kinNode(id,person,position='',editing=false) {
    const focus = id === person;
    const self = id === P.state.actor;
    const name = e(P.PEOPLE[id].name);
    const label = focus ? (P.state.familyWorkspace ? '当前人物' : '档案人') : P.relation(id, person);
    const caption = self
      ? `<strong><span class="heritage-pedigree-name">${name}</span><span class="heritage-pedigree-self">（我）</span></strong>`
      : `<strong>${name}</strong><small>${e(label)}</small>`;
    const accessibleName = self ? `${name}（我）` : `${name}，${e(label)}`;
    return b(`${P.avatar(id, '', { originalPortrait: true })}<span>${caption}</span>`, 'house-story-person',
      `heritage-pedigree-node${focus ? ' is-focus' : ''}${self ? ' is-self' : ''}`,
      `data-id="${e(id)}" data-pedigree-person="${e(id)}" aria-label="${accessibleName}，查看相关往事" ${position}${editing ? ' inert' : ''}`);
  }
  /** 编辑时按空框的较窄尺寸扩展图谱，虚线与已保存的亲缘线分开。 */
  function compactPedigree(person,groups,partners,editing) {
    const partnerSpacing = editing ? PEDIGREE_MEMBER_STEP : 136;
    const gutter = editing ? PEDIGREE_SLOT_GUTTER : 0;
    const parentCount = groups.parents.length;
    const childCount = groups.children.length;
    const minimumWidth = editing || parentCount || childCount || partners.length ? 280 : PEDIGREE_MEMBER_WIDTH;
    const width = Math.max(minimumWidth, Math.max(parentCount, childCount) * PEDIGREE_MEMBER_STEP + gutter,
      (partners.length + 1) * partnerSpacing + gutter);
    const halfMember = PEDIGREE_MEMBER_WIDTH / 2;
    const halfSlot = PEDIGREE_SLOT_WIDTH / 2;
    const slotInset = (PEDIGREE_MEMBER_HEIGHT - PEDIGREE_SLOT_WIDTH) / 2;
    const focusX = (width + gutter - partners.length * partnerSpacing) / 2;
    const focusY = parentCount || editing ? 100 : 4;
    const childY = focusY + 96;
    const height = (childCount || editing ? childY : focusY) + 68;
    const positions = count => {
      if (!count) return {nodes: [], slot: focusX};
      if (editing) {
        const start = (width - count * PEDIGREE_MEMBER_STEP - PEDIGREE_SLOT_WIDTH) / 2;
        return {
          nodes: Array.from({length: count}, (_, index) => start + halfMember + index * PEDIGREE_MEMBER_STEP),
          slot: width - start - halfSlot
        };
      }
      return {nodes: count === 1 ? [focusX] :
        Array.from({length: count}, (_, index) => halfMember + index * (width - PEDIGREE_MEMBER_WIDTH) / (count - 1))};
    };
    const parents = positions(parentCount);
    const children = positions(childCount);
    const mateX = partners.map((_,index)=>focusX+(index+1)*partnerSpacing);
    const position=(x,y)=>`style="left:${x/width*100}%;top:${y}px"`;
    const node=(id,x,y)=>kinNode(id,person,position(x,y),editing);
    const parentPath=(x,start=4+PEDIGREE_MEMBER_HEIGHT)=>`M${x} ${start}V84H${focusX}V${focusY}`;
    const childPath=(x,end=childY)=>`M${focusX} ${focusY+PEDIGREE_MEMBER_HEIGHT}V${focusY+80}H${x}V${end}`;
    const nodes=groups.parents.map((id,index)=>node(id,parents.nodes[index],4)).join('')+node(person,focusX,focusY)+partners.map((id,index)=>node(id,mateX[index],focusY)).join('')+groups.children.map((id,index)=>node(id,children.nodes[index],childY)).join('');
    const parentLines=parents.nodes.map(x=>`<path d="${parentPath(x)}"/>`).join('');
    const childLines=children.nodes.map(x=>`<path d="${childPath(x)}"/>`).join('');
    const coupleLines=mateX.map(x=>`<path class="is-couple" d="M${focusX+halfMember} ${focusY+30}H${x-halfMember}M${focusX+halfMember} ${focusY+34}H${x-halfMember}"/>`).join('');
    const partnerSlot = focusX - halfMember - gutter + halfSlot;
    const parentSlotTop = 4 + slotInset;
    const parentSlotBottom = parentSlotTop + PEDIGREE_SLOT_WIDTH;
    const childSlotTop = childY + slotInset;
    const slots = editing ? [
      {group: 'parents', x: parents.slot, y: parentSlotTop, path: parentCount
        ? `M${parents.slot} ${parentSlotBottom}V84H${Math.max(focusX, parents.nodes.at(-1))}` : parentPath(parents.slot, parentSlotBottom)},
      {group: 'partner', x: partnerSlot, y: focusY + slotInset, path: `M${partnerSlot + halfSlot} ${focusY + 32}H${focusX - halfMember}`},
      {group: 'children', x: children.slot, y: childSlotTop, path: childCount
        ? `M${Math.max(focusX, children.nodes.at(-1))} ${focusY + 80}H${children.slot}V${childSlotTop}` : childPath(children.slot, childSlotTop)}
    ] : [];
    const slotLines = slots.map(slot => `<path class="is-add-link" d="${slot.path}"/>`).join('');
    return `<div class="heritage-pedigree-canvas" style="--pedigree-width:${width}px;--pedigree-slot-width:${PEDIGREE_SLOT_WIDTH}px;height:${height}px">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><g>${parentLines}${childLines}${coupleLines}${slotLines}</g></svg>
      ${nodes}${slots.map(slot => P.FamilyTree.homeAddNode(slot.group, position(slot.x, slot.y))).join('')}
    </div>`;
  }
  /** 每列用两单位标注中点。支线只连到首列的档案人，避免把子女连到未确认的另一位家长。 */
  function pedigreeBranches(count,columns,kind,editing) {
    const fromParents=kind==='parents',rootEdge=fromParents?24:0,branchEdge=fromParents?0:24;
    const branches=Array.from({length:count},(_,index)=>`M${index*2+1} 12V${branchEdge}`).join('');
    const confirmed = count ? `<path d="M1 ${rootEdge}V12H${count * 2 - 1}${branches}"/>` : '';
    const extensionPath = count ? `M${count * 2 - 1} 12H${count * 2 + 1}V${branchEdge}` : `M1 ${rootEdge}V${branchEdge}`;
    const extension = editing ? `<path class="is-add-link" d="${extensionPath}"/>` : '';
    return `<svg class="heritage-pedigree-branches" data-pedigree-links="${kind}" viewBox="0 0 ${columns*2} 24" preserveAspectRatio="none" aria-hidden="true">${confirmed}${extension}</svg>`;
  }
  /** 大字号人物卡随姓名自然增高。每位配偶单独与档案人相连。 */
  function readablePedigree(person,{parents,children},partners,editing) {
    const columns=Math.max(parents.length+Number(editing),children.length+Number(editing),partners.length?2:1);
    const renderNodes=members=>members.map(id=>kinNode(id,person,'',editing)).join('');
    const slot = group => editing ? P.FamilyTree.homeAddNode(group) : '';
    const row=(members,label,kind)=>`<div class="heritage-pedigree-row" data-pedigree-branch="${kind}" role="group" aria-label="${label}">${renderNodes(members)}${slot(kind)}</div>`;
    return `<div class="heritage-pedigree-canvas heritage-pedigree-readable${editing?' is-editing':''}" style="--pedigree-columns:${columns};--pedigree-slot-width:${PEDIGREE_SLOT_WIDTH}px;--pedigree-slot-gutter:${PEDIGREE_SLOT_GUTTER}px">
      ${parents.length||editing?row(parents,'上方成员','parents')+pedigreeBranches(parents.length,columns,'parents',editing):''}
      <div class="heritage-pedigree-row heritage-pedigree-focus-row" role="group" aria-label="${partners.length?'家谱中心人物与配偶':'家谱中心人物'}">${kinNode(person,person,'',editing)}${partners.length?`<div class="heritage-pedigree-partners" role="group" aria-label="配偶">${renderNodes(partners)}</div>`:''}${slot('partner')}</div>
      ${children.length||editing?pedigreeBranches(children.length,columns,'children',editing)+row(children,'下方成员','children'):''}
    </div>`;
  }
  function familyViewPanel(control, content, { map, editing }) {
    const editControl = map ? '' : P.FamilyTree.homeEditControl();
    const tools = editing ? '<p class="home-family-edit-hint">点「＋」添加成员</p>' + editControl : editControl + control;
    return `<div class="home-family-panel${map ? ' is-map' : editing ? ' is-editing' : ''}">
      ${tools ? `<div class="home-family-panel-tools">${tools}</div>` : ''}
      <div id="home-family-view">
        ${content}${map ? P.FamilyMap.view() : ''}
      </div>
    </div>`;
  }
  /** 直系与配偶按已知关系连线，隔代与旁系单列，避免画出未经确认的关系。 */
  function kinship(owner, viewSwitch = '', map = false) {
    const { person, groups } = map ? { person: owner, groups: P.FamilyHome.relatives(owner) } : P.FamilyHome.pedigree(owner);
    const partners = groups.couple.filter(id => id !== person);
    const editing = !map && P.FamilyTree.homeEditing();
    const single = !map && !editing && !groups.parents.length && !partners.length && !groups.children.length && !groups.others.length;
    const name=e(P.PEOPLE[person]?.name||'家人');
    const diagram=P.state.fontLarge?readablePedigree(person,groups,partners,editing):compactPedigree(person,groups,partners,editing);
    const others = !map && groups.others.length
      ? `<div class="home-kinship-other"><h3>其他家人</h3>
        <div>${groups.others.map(id => kinNode(id, person, '', editing)).join('')}</div></div>`
      : '';
    // 地图用关系树占位计算卡片高度，编辑期间停用已保存成员的往事入口。
    const viewportLabel = editing ? `${name}的家谱编辑` : `${name}的已知亲缘关系`;
    const viewport = `<div class="heritage-pedigree-viewport${single ? ' is-single' : ''}"${map ? ' inert' : ''} role="group" aria-label="${viewportLabel}">${diagram}</div>`;
    return `<div class="heritage-kinship home-kinship-preview">
      ${familyViewPanel(viewSwitch, editing ? viewport + others : viewport, { map, editing })}
      ${editing ? '' : others}
    </div>`;
  }
  function editLink(kind, person, label) {
    return P.FamilyHome.editable(kind, person)
      ? b(i('edit') + '编辑', 'heritage-edit', 'heritage-text-button home-edit-button',
        `data-kind="${kind}" data-person="${e(person)}" aria-label="编辑${label}"`)
      : '';
  }
  function leafHeading(id, title, edit) {
    return `<div class="home-leaf-heading"><h2 id="${id}">${title}</h2>${edit}</div>`;
  }
  function coverPhotos() {
    const photos = P.Households.sharedFamilyEntries().filter(({ item }) => item.homeCover && item.scope === 'family' && item.houseImage)
      .map(({ item }) => ({ src: item.houseImage, caption: item.title }));
    if (P.Households.isExample()) {
      photos.push(
        { src: 'assets/family-home/reference/family-reunion.webp', caption: '2026 年除夕 · 在爷爷奶奶家' },
        { src: 'assets/family.webp', caption: '过年时，我们拍了一张全家福' },
        { src: 'assets/family-home/reference/making-dumplings.webp', caption: '一家人在家包饺子' }
      );
    }
    return photos;
  }
  function cover() {
    const photos = coverPhotos();
    const index = Math.min(P.state.homeCoverIndex || 0, Math.max(photos.length - 1, 0));
    const photo = photos[index];
    const uploadLabel = '上传全家福，可选择多张照片' + (photos.length > 1 ? '。使用左右方向键切换照片' : '');
    const slides = photos.map(({ src, caption }, page) => {
      const active = page === index;
      return `<img class="home-cover-slide${active ? ' is-current' : ''}" ${active ? 'src' : 'data-cover-src'}="${e(src)}"
        alt="${e(caption)}" aria-hidden="${!active}" draggable="false">`;
    }).join('');
    return `<header class="home-cover">
      ${P.Households.homeSwitcher()}
      <h1>我们${e(P.FamilyJournal.familyName())}</h1>
      <p class="home-cover-brand">${P.FamilyJournal.seal()} 传家录</p>
      <p class="home-family-role">我的身份 · <strong>${e(P.Households.familyRole())}</strong></p>
      <figure class="home-cover-photo">
        <div class="wood-frame">
          <button type="button" class="home-cover-window" aria-label="${uploadLabel}" title="点击照片上传，可选择多张">
            ${photo ? slides : '<span class="home-cover-empty">点击上传全家福</span>'}
          </button>
        </div>
        <figcaption class="home-cover-caption">
          ${photo ? `<span class="home-cover-caption-text">${e(photo.caption)}</span>` : ''}
          ${P.HouseScreen.homeEntry()}
        </figcaption>
      </figure>
      <input type="file" class="home-cover-files" accept="${P.Households.sharedPhotoAccept}" multiple hidden>
    </header>`;
  }
  /** 首页与内容管理共用已保存的正文和作者落款。 */
  function mottoBoard(doc) {
    const byline = P.FamilyHome.mottoByline(doc);
    const copy = doc
      ? `<div class="home-motto-text">
          <blockquote class="home-motto-quote">${e(doc.text)}</blockquote>
          ${byline ? `<p class="heritage-caption home-motto-signature">${e(byline)}</p>` : ''}
        </div>`
      : '<p class="heritage-empty">家训待整理。</p>';
    return `<div class="home-motto-board wood-frame">
      ${doc?.cover ? `<div class="home-motto-art is-uploaded"><img src="${e(doc.cover)}" alt="家训背景图"></div>` : ''}
      ${copy}
    </div>`;
  }
  function motto(owner) {
    const canEdit = P.FamilyHome.editable('motto', owner);
    const family = P.FamilyHome.ensure().family;
    const pending = canEdit ? family.suggestions.filter(item => item.status === 'pending').length : 0;
    const action = canEdit
      ? b(`<span class="heritage-text-button home-edit-button">${i('edit')}编辑</span>`,
        'heritage-edit', 'home-motto-action', `data-kind="motto" data-person="${e(owner)}" aria-label="编辑家训"`)
      : P.FamilyHome.member() ? b('提交家训建议', 'heritage-suggest', 'heritage-text-button home-edit-button',
        `data-person="${e(owner)}" aria-haspopup="dialog"`) : '';
    return `<section class="home-motto-sheet" data-home-section="motto" aria-labelledby="home-motto-title">
      <div class="home-motto-preview">
        ${leafHeading('home-motto-title', '家训', action)}
        ${mottoBoard(P.FamilyHome.document('motto'))}
      </div>
      ${pending ? b(`家训建议 · ${pending} 条待核对 ${i('arrow')}`, 'heritage-suggestions', 'heritage-text-button home-edit-button', 'aria-haspopup="dialog"') : ''}
    </section>`;
  }
  function surname(owner) {
    const details = P.FamilyHome.surnameDetails(owner);
    const oralAccount = details?.oralAccount;
    const introduction = oralAccount ? oralAccount.text :
      details?.summary || details?.text || '姓源待整理。';
    return `<section data-home-section="surname" aria-labelledby="home-surname-title">
      ${leafHeading('home-surname-title', '姓源', editLink('surname', owner, '姓源'))}
      <div class="paper-card home-surname-card">
        <h3>我们${e(details?.name ? details.name + '家' : '家')}从哪里来</h3>
        <div class="home-surname-content${oralAccount ? ' has-photo' : ''}">
          ${oralAccount ? `<figure><span class="photo-mount"><img src="assets/family-home/reference/old-lane.webp" alt="老街的院门与枣树" loading="lazy"></span><figcaption>老街东头</figcaption></figure>` : ''}
          <div><p>${e(introduction)}</p>${oralAccount ? `<p class="home-surname-author">${e(oralAccount.source)}</p>` : ''}</div>
        </div>
        ${details?.text ? l(`看看${e(details.name ? details.name + '姓' : '姓氏')}的来历 ${i('arrow')}`, 'home-surname/' + e(owner), 'paper-link') : ''}
      </div>
    </section>`;
  }
  function origin(owner) {
    const doc = P.FamilyHome.document('origin', owner);
    return `<section data-home-section="origin" aria-labelledby="home-origin-title">
      ${leafHeading('home-origin-title', '家史', editLink('origin', owner, '家史'))}
      ${doc ? `<div class="home-history-cover">
        ${l(`<span class="home-history-book" aria-hidden="true">
          <span class="home-history-binding"><span></span><span></span><span></span><span></span></span>
          <strong class="home-history-title">${e(P.FamilyHome.originTitle())}</strong>
          ${P.FamilyJournal.seal()}
        </span><span>翻开家史 ${i('arrow')}</span>`, 'home-origin/' + e(owner), 'home-history-open')}
      </div>` : '<p class="paper-card home-section-empty">家史待整理。</p>'}
    </section>`;
  }
  function familyTree(owner) {
    const map = P.state.homeFamilyDisplay === 'map';
    const target = map ? 'tree' : 'map';
    const label = map ? '关系树' : '分布地图';
    const viewSwitch = b(i(target) + label, 'home-family-display', 'heritage-text-button',
      `id="home-family-view-switch" data-view="${target}" aria-controls="home-family-view" aria-label="切换到${label}"`);
    return `<section data-home-section="tree" aria-labelledby="home-tree-title">
      <div class="section-heading home-section-heading"><h2 id="home-tree-title">家谱</h2></div>
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
  /** 自动切换从相框边缘进入，拖动松手后从手指停下的位置继续移动或回弹。 */
  function slideCoverPhotos(previous, next, direction, signal, { start = 0, snapBack = false } = {}) {
    const edge = direction * 100;
    const end = snapBack ? 0 : -edge;
    const timing = {
      duration: start ? COVER_DRAG_SETTLE_MS : COVER_SLIDE_MS,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      fill: 'both'
    };
    const inactive = snapBack ? next : previous;
    inactive.classList.add('is-leaving');
    const animations = [
      previous.animate({ transform: [`translateX(${start}%)`, `translateX(${end}%)`] }, timing),
      next.animate({ transform: [`translateX(${edge + start}%)`, `translateX(${edge + end}%)`] }, timing)
    ];
    const stop = () => {
      inactive.classList.remove('is-leaving');
      signal.removeEventListener('abort', stop);
      animations.forEach(animation => animation.cancel());
    };
    signal.addEventListener('abort', stop, { once: true });
    return Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (!signal.aborted) stop();
    });
  }

  /** 保留相框和页面位置，只在图片就绪后切换照片和说明。 */
  function mountCover(content) {
    const cover = content.querySelector('.home-cover');
    const viewport = cover?.querySelector('.home-cover-window');
    const fileInput = cover?.querySelector('.home-cover-files');
    if (!viewport || !fileInput) return;
    const slides = [...viewport.querySelectorAll('.home-cover-slide')];

    const state = P.state;
    const caption = cover.querySelector('.home-cover-caption-text');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();
    const { signal } = controller;
    const unavailable = new Set();
    let index = slides.findIndex(slide => slide.classList.contains('is-current'));
    let request = 0;
    let timer;
    let inView = false;
    let hovered = false;
    let gesture;
    let slideFinished;
    let suppressClick = false;
    let uploading = false;

    viewport.addEventListener('click', event => {
      // 鼠标拖动后仍可能合成点击，短拖回弹也不打开选图；键盘激活照常处理。
      if (!uploading && (event.detail === 0 || !suppressClick)) fileInput.click();
    }, { signal });
    fileInput.addEventListener('change', async () => {
      const files = [...fileInput.files];
      fileInput.value = '';
      if (uploading || !files.length) return;
      uploading = true;
      try {
        const saved = await P.Households.uploadCoverPhotos(files, signal);
        if (!saved || signal.aborted) return;
        const restoreFocus = viewport.matches(':focus-visible');
        P.render();
        if (restoreFocus) content.querySelector('.home-cover-window')?.focus({ preventScroll: true });
        P.toast(`已添加 ${files.length} 张全家福。`);
      } finally {
        uploading = false;
      }
    }, { signal });

    const adjacentPage = direction => {
      for (let offset = 1; offset < slides.length; offset++) {
        const page = (index + direction * offset + slides.length) % slides.length;
        if (!unavailable.has(page)) return page;
      }
    };
    const prepareSlide = page => {
      const slide = slides[page];
      if (slide && !slide.hasAttribute('src')) slide.src = slide.dataset.coverSrc;
      return slide;
    };
    const prepareNeighbors = () => {
      prepareSlide(adjacentPage(-1));
      prepareSlide(adjacentPage(1));
    };
    const clearPreview = drag => {
      if (!drag.preview) return;
      drag.photo.style.removeProperty('transform');
      drag.preview.style.removeProperty('transform');
      drag.preview.classList.remove('is-previewing');
    };
    const movePhotos = (previous, next, direction, options) => {
      slideFinished = slideCoverPhotos(previous, next, direction, signal, options).then(() => {
        slideFinished = null;
      });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (signal.aborted || !inView || hovered || gesture || document.hidden || reduceMotion.matches ||
          viewport.matches(':focus-visible') || unavailable.size >= slides.length - 1) return;
      timer = window.setTimeout(() => rotate(1), COVER_INTERVAL_MS);
    };
    const selectSlide = (page, direction, start = 0) => {
      if (gesture) {
        clearPreview(gesture);
        gesture = null;
      }
      const previous = slides[index];
      const slide = slides[page];
      previous.classList.remove('is-current');
      previous.setAttribute('aria-hidden', 'true');
      index = state.homeCoverIndex = page;
      slide.classList.add('is-current');
      slide.setAttribute('aria-hidden', 'false');
      caption.textContent = slide.alt;
      if (!reduceMotion.matches) movePhotos(previous, slide, direction, { start });
      prepareNeighbors();
      schedule();
    };
    const show = async (page, direction) => {
      window.clearTimeout(timer);
      const version = ++request;
      const slide = prepareSlide(page);
      try {
        await slide.decode();
      } catch {
        // 遇到无法读取的照片保留当前画面，之后轮播时跳过该照片。
        unavailable.add(page);
        if (version === request) schedule();
        return;
      }
      // 等上一张滑到位，只处理等待期间最后一次选图，避免多张照片同时移动。
      if (slideFinished) await slideFinished;
      if (signal.aborted || version !== request) return;
      selectSlide(page, direction);
    };
    const rotate = direction => {
      const page = adjacentPage(direction);
      if (page !== undefined) return show(page, direction);
    };

    // 相框获得键盘焦点时暂停自动切换，方向键仍可浏览相邻照片。
    viewport.addEventListener('focusin', schedule, { signal });
    viewport.addEventListener('focusout', () => queueMicrotask(schedule), { signal });
    viewport.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      rotate(event.key === 'ArrowRight' ? 1 : -1);
    }, { signal });
    viewport.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      hovered = true;
      schedule();
    }, { signal });
    viewport.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      hovered = false;
      schedule();
    }, { signal });
    viewport.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      // 接管尚在加载的切换，防止读图完成时覆盖手指位置。
      request++;
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        width: viewport.getBoundingClientRect().width,
        photo: slides[index],
        offset: 0
      };
      viewport.setPointerCapture(event.pointerId);
      schedule();
    }, { signal });
    const dragPhotos = event => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= COVER_DRAG_SLOP) suppressClick = true;
      if (slides.length < 2) return;
      // 确定横向意图后才移动照片，纵向滚动和缩放继续由浏览器处理。
      if (!gesture.axis && Math.abs(dx) >= COVER_DRAG_SLOP && Math.abs(dx) > Math.abs(dy) * 1.4) gesture.axis = 'x';
      if (!gesture.axis && Math.abs(dy) >= COVER_DRAG_SLOP && Math.abs(dy) > Math.abs(dx)) gesture.axis = 'y';
      if (gesture.axis !== 'x' || slideFinished || reduceMotion.matches || !gesture.width) return;

      const direction = dx <= 0 ? 1 : -1;
      const page = adjacentPage(direction);
      const preview = prepareSlide(page);
      if (preview !== gesture.preview) {
        clearPreview(gesture);
        gesture.preview = null;
        gesture.offset = 0;
      }
      if (!preview?.naturalWidth) return;
      const offset = Math.max(-100, Math.min(100, dx / gesture.width * 100));
      gesture.page = page;
      gesture.direction = direction;
      gesture.preview = preview;
      gesture.offset = offset;
      gesture.photo.style.transform = `translateX(${offset}%)`;
      preview.style.transform = `translateX(${offset + direction * 100}%)`;
      preview.classList.add('is-previewing');
    };
    viewport.addEventListener('pointermove', dragPhotos, { signal });
    const finishGesture = event => {
      if (gesture?.id !== event.pointerId) return;
      const released = event.type === 'pointerup';
      if (released) dragPhotos(event);
      else suppressClick = true;
      const drag = gesture;
      gesture = null;
      const dx = event.clientX - drag.x;
      const advance = released && drag.axis === 'x' && Math.abs(dx) >= COVER_SWIPE_DISTANCE;
      clearPreview(drag);
      // 预览尚未加载或上一段动画仍在收尾时，沿用原来的换图入口。
      if (advance) {
        if (drag.preview) selectSlide(drag.page, drag.direction, drag.offset);
        else rotate(dx < 0 ? 1 : -1);
        return;
      }
      if (drag.offset && !reduceMotion.matches) {
        movePhotos(drag.photo, drag.preview, drag.direction, { start: drag.offset, snapBack: true });
      }
      schedule();
    };
    viewport.addEventListener('pointerup', finishGesture, { signal });
    viewport.addEventListener('pointercancel', finishGesture, { signal });
    viewport.addEventListener('lostpointercapture', finishGesture, { signal });
    document.addEventListener('visibilitychange', schedule, { signal });
    reduceMotion.addEventListener('change', schedule, { signal });
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= .5;
      schedule();
    }, { root: content, threshold: .5 });
    observer.observe(viewport);
    prepareNeighbors();
    stopCover = () => {
      controller.abort();
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }
  function unmountCover() {
    stopCover?.();
    stopCover = null;
  }
  /** 正式稿及来源对家人可读，待核对的建议只呈现给维护人。 */
  function manageMotto() {
    const family = P.FamilyHome.ensure().family;
    const doc = P.FamilyHome.document('motto');
    const canEdit = P.FamilyHome.editable('motto');
    const personAttr = `data-person="${e(family.mottoOwner)}"`;
    const ownerName = P.PEOPLE[family.mottoOwner]?.name || '家训维护人';
    const action = canEdit
      ? b(i('edit') + (doc ? '编辑' : '建立家训'), 'heritage-edit', 'paper-link manage-motto-action',
        `${personAttr} data-kind="motto" aria-label="${doc ? '编辑' : '建立'}家训"`)
      : b(i('edit') + '提交家训建议', 'heritage-suggest', 'paper-link manage-motto-action',
        `${personAttr} aria-describedby="manage-suggestion-recipient" aria-haspopup="dialog"`);
    const pending = canEdit ? family.suggestions.filter(item => item.status === 'pending').length : 0;
    return `<section class="manage-motto" aria-labelledby="manage-motto-title">
      <div class="manage-motto-preview">
        <div class="manage-section-heading"><h2 id="manage-motto-title">家训</h2>${action}</div>
        ${mottoBoard(doc)}
      </div>
      ${doc?.source || doc?.date ? `<div class="manage-motto-caption">
        ${doc.source ? `<p>${e(doc.source)}</p>` : ''}
        ${doc.date ? `<time datetime="${e(doc.date)}">${e(doc.date)} 确认</time>` : ''}
      </div>` : ''}
      ${canEdit ? '' : `<p class="manage-motto-caption" id="manage-suggestion-recipient">建议由${e(ownerName)}核对。</p>`}
      ${pending ? b(`家人建议 · ${pending} 条待核对 ${i('arrow')}`, 'heritage-suggestions', 'paper-link manage-pending', 'aria-haspopup="dialog"') : ''}
    </section>`;
  }
  function managementRow(kind, person, title, note, art) {
    const dialog = kind === 'surname' ? ' aria-haspopup="dialog"' : '';
    return b(`<span class="manage-entry-art" aria-hidden="true">${art}</span>
      <span class="manage-entry-copy"><strong>${title}</strong><small>${note}</small></span>${i('arrow')}`,
      'heritage-edit', 'manage-archive-row', `data-kind="${kind}" data-person="${e(person)}"${dialog}`);
  }
  function manage() {
    const person = P.FamilyContext.current();
    const back = l(i('back') + '返回我家', 'home', 'paper-link manage-back');
    if (!person || !P.FamilyHome.member()) {
      return `<div class="page heritage-manage"><p class="manage-readonly">暂无可整理的家庭内容。</p>${back}</div>`;
    }
    const rows = [];
    if (P.FamilyHome.editable('surname', person)) {
      const surname = P.FamilyHome.surnameDetails(person)?.name;
      const art = surname && surname.length <= 2 ? `<span>${e(surname)}</span>` : i('edit');
      rows.push(managementRow('surname', person, '姓源', '整理姓氏来历与家人口述', art));
    }
    if (P.FamilyHome.editable('origin', person)) {
      rows.push(managementRow('origin', person, '家史', '整理一篇家史正文', i('book')));
    }
    return `<div class="page heritage-manage">
      ${manageMotto()}
      <section class="manage-archive" aria-labelledby="manage-archive-title">
        <div class="manage-section-heading"><h2 id="manage-archive-title">${e(P.PEOPLE[person]?.name || '家人')}的家谱</h2></div>
        ${rows.length ? `<div class="manage-archive-list paper-card">${rows.join('')}</div>` : '<p class="manage-readonly">姓源与家史由档案本人整理。</p>'}
      </section>
      ${back}
    </div>`;
  }
  /** 首页围绕当前家庭的档案人，切换预览账号时沿用同一份家庭传承。 */
  function render() {
    const owner = P.FamilyHome.ensure().family.mottoOwner;
    if (!P.FamilyHome.member() || !P.PEOPLE[owner]) {
      return '<div class="page empty"><h2>还没有可查看的家庭档案</h2></div>';
    }
    return `<div class="page home-family heritage-home family-dashboard"><div class="heritage-body">
      ${cover()}
      ${motto(owner)}
      ${surname(owner)}
      ${origin(owner)}
      ${familyTree(owner)}
      ${P.FamilyJournal.albumPreview()}
      ${P.FamilyJournal.diaryPreview()}
    </div></div>`;
  }
  P.FamilyHomeViews={render,kinship,albumTrack,mountAlbum,unmountAlbum,restoreAlbum,mountCover,unmountCover};P.views['home-manage']=manage;
}
