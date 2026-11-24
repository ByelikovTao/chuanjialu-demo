/** 归家汇总家庭传承、家人关系和获授权的相册与动态。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l,icon:i}=P;
  const mottoRoute = 'home/motto';
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
  const PEDIGREE_PREVIEW_ROWS = 3;
  const PEDIGREE_DRAG_THRESHOLD = 6;
  let stopAlbum = null;
  let stopCover = null;
  let stopPedigree = null;
  /** 点击家谱节点进入按此人筛选的家庭往事。 */
  function kinNode(id,person,position='',editing=false,framed=false) {
    const focus = id === person;
    const self = id === P.state.actor;
    const name = e(P.PEOPLE[id].name);
    const relation = focus ? (P.state.familyWorkspace ? '当前人物' : '档案人') : P.relation(id, person);
    const label = ['家人', '其他家人'].includes(relation) ? '亲缘待补充' : relation;
    const selfLabel = framed ? '(我)' : '（我）';
    const heading = self
      ? `<strong><span class="heritage-pedigree-name">${name}</span><span class="heritage-pedigree-self">${selfLabel}</span></strong>`
      : `<strong>${name}</strong>`;
    // 首页家谱同时显示我的账号标记和相对档案人的亲属称谓。
    const showRelation = framed || !self;
    const caption = showRelation ? `${heading}<small>${e(label)}</small>` : heading;
    const accessibleName = `${name}${self ? selfLabel : ''}${showRelation ? `，${e(label)}` : ''}`;
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
  /** 相邻两代只画两人之间已有的亲子连线，编辑占位也不参与连线。 */
  function generationBranches(upper, lower, columns, kind) {
    const paths = upper.flatMap((parent, upperIndex) => lower.map((child, lowerIndex) =>
      parent && child && P.FamilyHome.isParent(parent, child)
        ? `M${upperIndex * 2 + 1} 0V12H${lowerIndex * 2 + 1}V24` : '')).join('');
    return paths ? `<svg class="heritage-pedigree-branches" data-pedigree-links="${kind}" viewBox="0 0 ${columns * 2} 24" preserveAspectRatio="none" aria-hidden="true"><path d="${paths}"/></svg>` : '';
  }
  /** 人物卡随字号和姓名自然增高，各代按已知亲缘关系连接。 */
  function readablePedigree(person, { parents, children, generations = new Map() }, partners, editing, framed = false) {
    const hasSide = partners.length > 0 || (framed && editing);
    const extra = generation => generations.get(generation) ?? [];
    const listedGenerations = [...generations.keys()].filter(generation => generation !== null).sort((a, b) => a - b);
    const parentsRow = [...parents, ...(editing ? [null] : []), ...extra(-1)];
    const childrenRow = [...children, ...(editing ? [null] : []), ...extra(1)];
    const peers = extra(0);
    const columns = Math.max(parentsRow.length, childrenRow.length, peers.length + (hasSide ? 2 : 1),
      ...listedGenerations.map(generation => extra(generation).length));
    const renderNode = id => kinNode(id, person, '', editing, framed);
    const renderNodes = members => members.map(renderNode).join('');
    const slot = group => editing ? P.FamilyTree.homeAddNode(group) : '';
    const row = (members, label, kind) => `<div class="heritage-pedigree-row" data-pedigree-branch="${kind}" role="group" aria-label="${label}">${members.map(id => id === null ? slot(kind) : renderNode(id)).join('')}</div>`;
    const elders = listedGenerations.filter(generation => generation < -1).map(generation => {
      const members = extra(generation);
      const lower = generation === -2 ? parentsRow : extra(generation + 1);
      return row(members, '祖辈成员', 'ancestors') + generationBranches(members, lower, columns, generation === -2 ? 'grandparents' : 'ancestors');
    }).join('');
    const juniors = listedGenerations.filter(generation => generation > 1).map(generation => {
      const members = extra(generation);
      const upper = generation === 2 ? childrenRow : extra(generation - 1);
      return generationBranches(upper, members, columns, 'descendants') + row(members, '晚辈成员', 'descendants');
    }).join('');
    const center = renderNode(person);
    const side = partners.length
      ? `<div class="heritage-pedigree-partners" role="group" aria-label="配偶">${renderNodes(partners)}</div>`
      : '';
    // 侧边加号从本人卡片出发。已有配偶时，把加号排在侧列下方，以便小屏同时看到两张卡片。
    const focus = framed
      ? `<div class="heritage-pedigree-main" data-descendants="${children.length ? 'known' : editing ? 'pending' : 'none'}">${center}</div>
         ${hasSide ? `<div class="heritage-pedigree-side">${side}${slot('partner')}</div>` : ''}`
      : center + side + slot('partner');
    return `<div class="heritage-pedigree-canvas heritage-pedigree-readable${editing?' is-editing':''}" style="--pedigree-columns:${columns};--pedigree-slot-width:${PEDIGREE_SLOT_WIDTH}px;--pedigree-slot-gutter:${PEDIGREE_SLOT_GUTTER}px">
      ${elders}
      ${parentsRow.length ? row(parentsRow, '上一辈成员', 'parents') : ''}
      ${parents.length || editing ? pedigreeBranches(parents.length, columns, 'parents', editing) : ''}
      <div class="heritage-pedigree-row heritage-pedigree-focus-row" role="group" aria-label="同辈成员">${focus}${renderNodes(peers)}</div>
      ${children.length || editing ? pedigreeBranches(children.length, columns, 'children', editing) : ''}
      ${childrenRow.length ? row(childrenRow, '下一辈成员', 'children') : ''}
      ${juniors}
      ${extra(null).length ? row(extra(null), '辈分待补充的成员', 'pending') : ''}
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
  /** 图谱内展示当前家庭成员，只有已知的直接亲缘关系使用连线。 */
  function kinship(owner, viewSwitch = '', map = false) {
    const { person, groups } = map ? { person: owner, groups: P.FamilyHome.relatives(owner) } : P.FamilyHome.pedigree(owner);
    const partners = groups.couple.filter(id => id !== person);
    const editing = !map && P.FamilyTree.homeEditing();
    const single = !map && !editing && !groups.parents.length && !partners.length && !groups.children.length && !groups.others.length;
    const name=e(P.PEOPLE[person]?.name||'家人');
    const framed = P.state.route === 'home' && !map;
    const diagram = framed || P.state.fontLarge || groups.generations?.size
      ? readablePedigree(person, groups, partners, editing, framed)
      : compactPedigree(person, groups, partners, editing);
    // 地图用关系树占位计算卡片高度，编辑期间停用已保存成员的往事入口。
    const viewportLabel = editing ? `${name}的家谱编辑` : `${name}的已知亲缘关系`;
    const canvas = framed ? ' data-pedigree-preview' : '';
    const viewport = `<div class="heritage-pedigree-viewport${framed ? ' is-framed' : ''}${single ? ' is-single' : ''}"${canvas}${map ? ' inert' : ''} role="group" aria-label="${viewportLabel}">${diagram}</div>`;
    const hint = framed ? '<p class="heritage-pedigree-pan-hint" id="home-pedigree-pan-hint" hidden>拖动查看更多家人</p>' : '';
    return `<div class="heritage-kinship home-kinship-preview">
      ${familyViewPanel(viewSwitch, viewport + hint, { map, editing })}
    </div>`;
  }
  /** 保留完整图谱，按前三行的实际高度裁出首页视窗，避免大字号遮住人物卡。 */
  function mountPedigree(content) {
    const viewport = content.querySelector('[data-pedigree-preview]');
    if (!viewport) return;
    const canvas = viewport.querySelector('.heritage-pedigree-canvas');
    const rows = canvas.querySelectorAll(':scope > .heritage-pedigree-row');
    const hint = content.querySelector('#home-pedigree-pan-hint');
    const controller = new AbortController();
    const { signal } = controller;
    let gesture = null;
    let dragged = false;

    function updateViewport() {
      if (rows.length > PEDIGREE_PREVIEW_ROWS) {
        const last = rows[PEDIGREE_PREVIEW_ROWS - 1];
        const padding = parseFloat(getComputedStyle(viewport).paddingBlockStart);
        const height = Math.ceil(last.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top + padding);
        const limit = `${height}px`;
        if (viewport.style.getPropertyValue('--pedigree-preview-height') !== limit) {
          viewport.style.setProperty('--pedigree-preview-height', limit);
        }
      }
      const pannable = viewport.scrollHeight > viewport.clientHeight || viewport.scrollWidth > viewport.clientWidth;
      viewport.toggleAttribute('data-pannable', pannable);
      hint.hidden = !pannable;
      if (pannable) {
        viewport.tabIndex = 0;
        viewport.setAttribute('aria-describedby', hint.id);
      } else {
        viewport.removeAttribute('tabindex');
        viewport.removeAttribute('aria-describedby');
      }
    }

    // 触屏和触控板沿用原生滚动。鼠标移动超过阈值后才从人物卡接管拖动。
    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !viewport.hasAttribute('data-pannable')) return;
      dragged = false;
      if (event.pointerType !== 'mouse') return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    }, { signal });
    viewport.addEventListener('pointermove', event => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!dragged) {
        if (Math.hypot(dx, dy) < PEDIGREE_DRAG_THRESHOLD) return;
        viewport.setPointerCapture(event.pointerId);
        viewport.classList.add('is-dragging');
        dragged = true;
      }
      viewport.scrollLeft = gesture.left - dx;
      viewport.scrollTop = gesture.top - dy;
      event.preventDefault();
    }, { signal });
    function finish(event) {
      if (gesture?.id !== event.pointerId) return;
      gesture = null;
      viewport.classList.remove('is-dragging');
    }
    viewport.addEventListener('pointerup', finish, { signal });
    viewport.addEventListener('pointercancel', finish, { signal });
    viewport.addEventListener('lostpointercapture', finish, { signal });
    viewport.addEventListener('pointerleave', event => {
      if (!viewport.hasPointerCapture(event.pointerId)) finish(event);
    }, { signal });
    viewport.addEventListener('dragstart', event => {
      if (gesture) event.preventDefault();
    }, { signal });
    viewport.addEventListener('click', event => {
      if (!dragged || !event.detail) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    }, { capture: true, signal });

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(viewport);
    observer.observe(canvas);
    stopPedigree = () => {
      controller.abort();
      observer.disconnect();
    };
  }
  function unmountPedigree() {
    stopPedigree?.();
    stopPedigree = null;
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

  function coverPhotoList(photos) {
    if (!photos.length) return '';
    return `<ul class="home-cover-manager-grid" aria-label="首页轮播照片">
      ${photos.map(({ src, caption }) => `<li><img src="${e(src)}" alt="${e(caption)}" loading="lazy"></li>`).join('')}
    </ul>`;
  }

  function openCoverPhotos(content) {
    const photos = coverPhotos();
    const dialog = document.getElementById('modal');
    P.modal('全家福轮播', `<div class="home-cover-manager">
      <p class="family-sheet-note">可以一次选多张照片，添加后会在首页自动轮播。</p>
      <p class="home-cover-manager-count" aria-live="polite">${photos.length ? `已添加 ${photos.length} 张` : '还没有添加全家福'}</p>
      <div class="home-cover-manager-photos">${coverPhotoList(photos)}</div>
      <button type="button" class="btn home-cover-manager-add">${i('plus')} 添加照片</button>
      <input type="file" class="home-cover-files" accept="${P.Households.sharedPhotoAccept}" multiple hidden>
    </div>`, 'sheet', dialog, { closeLabel: '关闭全家福轮播', familySheet: true });

    const manager = dialog.querySelector('.home-cover-manager');
    const add = manager.querySelector('.home-cover-manager-add');
    const input = manager.querySelector('.home-cover-files');
    const label = add.innerHTML;
    const controller = new AbortController();
    const { signal } = controller;
    dialog.addEventListener('close', () => controller.abort(), { once: true, signal });
    add.addEventListener('click', () => input.click(), { signal });
    input.addEventListener('change', async () => {
      const files = [...input.files];
      input.value = '';
      if (add.disabled || !files.length) return;
      add.disabled = true;
      add.textContent = '正在添加…';
      try {
        const saved = await P.Households.uploadCoverPhotos(files, signal);
        if (!saved || signal.aborted || !dialog.open || !manager.isConnected) return;
        const updated = coverPhotos();
        manager.querySelector('.home-cover-manager-count').textContent = `已添加 ${updated.length} 张`;
        manager.querySelector('.home-cover-manager-photos').innerHTML = coverPhotoList(updated);
        P.render();
        // 首页重绘后，关闭面板时把焦点交还给新的全家福入口。
        dialog.opener = content.querySelector('.home-cover-window');
        P.toast(`已添加 ${files.length} 张全家福。`);
      } finally {
        add.disabled = false;
        add.innerHTML = label;
        if (dialog.open && manager.isConnected) add.focus({ preventScroll: true });
      }
    }, { signal });
  }

  function cover() {
    const accountName = P.PEOPLE[P.state.actor]?.name;
    const photos = coverPhotos();
    const index = Math.min(P.state.homeCoverIndex || 0, Math.max(photos.length - 1, 0));
    const photo = photos[index];
    const photoLabel = photos.length ? '查看全家福轮播，可以添加照片' : '添加全家福，可一次选择多张照片';
    const slides = photos.map(({ src, caption }, page) => {
      const active = page === index;
      return `<img class="home-cover-slide${active ? ' is-current' : ''}" ${active ? 'src' : 'data-cover-src'}="${e(src)}"
        alt="${e(caption)}" aria-hidden="${!active}" draggable="false">`;
    }).join('');
    return `<header class="home-cover">
      ${P.Households.homeSwitcher()}
      <h1>我们${e(P.FamilyJournal.familyName())}</h1>
      <p class="home-cover-brand">${P.FamilyJournal.seal()} 传家录</p>
      ${accountName ? `<p class="home-account-name">${e(accountName)}</p>` : ''}
      <figure class="home-cover-photo">
        <div class="wood-frame">
          <button type="button" class="home-cover-window" aria-haspopup="dialog" aria-controls="modal"
            aria-label="${photoLabel}${photos.length > 1 ? '。使用左右方向键切换照片' : ''}">
            ${photo ? slides :
              '<span class="home-cover-empty"><span>添加全家福</span><small>可选多张，首页轮播</small></span>'}
          </button>
        </div>
        <figcaption class="home-cover-caption">
          ${photo ? `<span class="home-cover-caption-text">${e(photo.caption)}</span>` : ''}
          ${P.HouseScreen.homeEntry()}
        </figcaption>
      </figure>
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
      : '';
    return `<section class="home-motto-sheet" data-home-section="motto" aria-labelledby="home-motto-title" tabindex="-1">
      <div class="home-motto-preview">
        ${leafHeading('home-motto-title', '家训', action)}
        ${mottoBoard(P.FamilyHome.document('motto'))}
      </div>
      ${pending ? b(`家训建议 · ${pending} 条待核对 ${i('arrow')}`, 'heritage-suggestions', 'heritage-text-button home-edit-button', 'aria-haspopup="dialog"') : ''}
    </section>`;
  }
  /** 来源链接只滚动首页内容区，键盘焦点随阅读位置移到家训。 */
  function focusMotto(viewport) {
    const section = viewport.querySelector('[data-home-section="motto"]');
    if (!section) return;
    viewport.scrollTop += section.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
    section.focus({preventScroll: true});
  }
  function surname(owner) {
    const details = P.FamilyHome.surnameDetails(owner);
    const oralAccount = details?.oralAccount;
    const introduction = e(oralAccount?.text || details?.summary || details?.text || '姓源待整理。');
    return `<section data-home-section="surname" aria-labelledby="home-surname-title">
      ${leafHeading('home-surname-title', '姓源', editLink('surname', owner, '姓源'))}
      <div class="home-surname-card${oralAccount ? ' has-photo' : ''}">
        ${oralAccount ? `<figure class="home-surname-photo">
          <img src="assets/family-home/reference/old-lane-xuan.webp" alt="老街的院门与枣树" loading="lazy">
          <figcaption>老街东头</figcaption>
        </figure>` : ''}
        <div class="home-surname-content">
          <h3>我们${e(details?.name ? details.name + '家' : '家')}从哪里来</h3>
          ${oralAccount ? `<blockquote class="home-surname-text">${introduction}</blockquote>
          <p class="home-surname-author">${e(oralAccount.source)}</p>` : `<p class="home-surname-text">${introduction}</p>`}
          ${details?.text ? l(`看看${e(details.name ? details.name + '姓' : '姓氏')}的来历 ${i('arrow')}`, 'home-surname/' + e(owner), 'paper-link') : ''}
        </div>
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
  function albumCard({ cover, title, route, kind, photoId }, showCaption) {
    const video = kind === 'clip';
    const thumbnail = cover ? `<img src="${e(cover)}" alt="" loading="lazy" draggable="false">` : video ? '' :
      i('photo') + (photoId ? `<img data-album-photo="${e(photoId)}" alt="" draggable="false" hidden>` : '');
    const playback = video ? `<span class="home-album-play" aria-hidden="true">${i('play')}</span>` : '';
    const caption = showCaption ? `<span class="home-album-caption">${e(title)}</span>` : '';
    return l(`<span class="home-album-cover">${thumbnail}${playback}</span>${caption}`,
      e(route), 'home-album-card', `aria-label="${e((video ? '查看视频，' : '查看照片，') + title)}"`);
  }
  function albumTrack(entries, id, label, showCaptions = false) {
    const scrollable = entries.length > 3 ? ' is-scrollable' : '';
    const cards = entries.map(entry => albumCard(entry, showCaptions)).join('');
    return `<div id="${e(id)}" class="home-album-track${scrollable}" role="group" aria-label="${e(label)}">${cards}</div>`;
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
    if (!viewport) return;
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
    viewport.addEventListener('click', event => {
      // 拖动后的合成点击不打开轮播面板，保留横滑换图和键盘激活。
      if (event.detail !== 0 && suppressClick) return;
      openCoverPhotos(content);
      schedule();
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
      if (signal.aborted || !inView || hovered || gesture || document.hidden || content.inert || reduceMotion.matches ||
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
  P.FamilyHomeViews={render,kinship,mountPedigree,unmountPedigree,albumTrack,mountAlbum,unmountAlbum,restoreAlbum,mountCover,unmountCover,mottoRoute,focusMotto};
}
