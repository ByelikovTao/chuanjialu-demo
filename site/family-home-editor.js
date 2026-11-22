/** 首页编辑与确认：本人草稿、家庭家训建议和正式内容分别维护，提交时重验身份与版本。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l}=P,F=P.FamilyHome;
  const MOTTO_EDIT_ROUTE='home-motto-edit';
  const LABELS={surname:'姓源',origin:'家史',motto:'家训',suggestion:'家训整理建议'};
  const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_COVER_BYTES = 8 * 1024 ** 2;
  const MAX_COVER_EDGE = 1280;
  const ORIGIN_TRACE_FIELDS=[
    {name:'earliest',label:'最早可追溯记录',placeholder:'例如 1938年 · 陈明德出生'},
    {name:'ancestralHome',label:'祖籍与支系',placeholder:'填写家中资料记载的祖籍或支系'},
    {name:'migration',label:'迁徙线索',placeholder:'有年代时写在开头，再写迁出地、迁入地'}
  ];
  /** 家庭指定本人负责家训，其他成员只能提交建议，不能直接发布。 */
  function allowed(kind,person) {return kind==='suggestion'?F.member():Object.hasOwn(LABELS,kind)&&F.editable(kind,person);}
  /** 草稿按账号、人物及段落隔离；多人查看共用家训但不共用未提交文字。 */
  function key(kind,person) {return [P.state.actor,person,kind].join(':');}
  /** 草稿沿用正式内容的修订号，避免旧表单覆盖新版本。 */
  function revision(kind,person) {return F.document(kind,person)?.revision||0;}
  /** 日期遵循本任务的上海时区，不受浏览器或执行主机时区影响。 */
  function today() {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  /** 首次打开从当前正式内容起草，尚无内容时保留空白。 */
  function draft(kind,person) {
    const home=F.ensure(),id=key(kind,person);if(home.drafts[id])return home.drafts[id];
    const doc=kind==='suggestion'?null:F.document(kind,person);
    const surname = kind === 'surname' ? F.surnameDetails(person) : null;
    return home.drafts[id] = {
      text: doc?.text || surname?.text || '',
      source: doc?.source || surname?.source || '',
      kind: doc?.kind || 'new',
      date: doc?.date || today(),
      revision: revision(kind, person),
      ...(surname ? { surname: surname.name } : {}),
      ...(kind === 'motto' ? { cover: doc?.cover || '' } : {}),
      ...(kind === 'origin' ? { trace: { ...doc?.trace } } : {})
    };
  }
  /** 核对弹层打开时冻结页面输入，只读取当前可操作区域内绑定到当前账号的表单。 */
  function activeForm() {
    const root=document.querySelector('#modal[open]')||document.getElementById('app-content');
    const form=root?.querySelector('[data-home-form]');
    if(!form||form.featureState!==P.state||form.dataset.actor!==P.state.actor)return null;
    return allowed(form.dataset.kind,form.dataset.person)?form:null;
  }
  function capture() {
    const form=activeForm();
    if(!form)return;
    const {kind,person}=form.dataset;
    const data=new FormData(form),value=draft(kind,person);
    value.text=String(data.get('text')||'');
    value.source=String(data.get('source')||'');
    value.kind=String(data.get('kind')||'new');
    value.date=String(data.get('date')||today());
    if (kind === 'surname') value.surname = String(data.get('surname') || '').trim();
    if(kind==='origin'){
      value.trace=Object.fromEntries(ORIGIN_TRACE_FIELDS.map(({name})=>[name,String(data.get(name)||'').trim()]));
    }
  }
  /** 未知线索可以留空，和家族记载、来源一起由档案本人核对发布。 */
  function traceFields(trace) {
    return `<fieldset class="heritage-trace-fields"><legend>家史线索（选填）</legend>
      ${ORIGIN_TRACE_FIELDS.map(({name,label,placeholder})=>`<label for="heritage-trace-${name}">${label}</label><input id="heritage-trace-${name}" name="${name}" maxlength="180" placeholder="${placeholder}" value="${e(trace?.[name]||'')}">`).join('')}
    </fieldset>`;
  }
  /** 旧记载只保留正文与来源，缺少的溯源字段等待本人补录。 */
  function originTrace(trace,source) {
    return `<dl class="heritage-origin-trace">
      ${ORIGIN_TRACE_FIELDS.map(({name,label})=>`<div><dt>${label}</dt><dd>${e(trace?.[name]||'待补录')}</dd></div>`).join('')}
      <div class="heritage-origin-trace-source"><dt>家庭资料来源</dt><dd>${e(source||'待补录')}</dd></div>
    </dl>`;
  }
  function coverField(cover) {
    return `<fieldset class="heritage-trace-fields heritage-cover-field">
      <legend>家训背景图</legend>
      <div data-home-cover-preview>${P.FamilyHomeViews.mottoArtwork(cover)}</div>
      <label class="form-field"><span>选择新图片</span><input type="file" name="cover" accept="${COVER_TYPES.join(',')}"></label>
      <div class="heritage-cover-tools">
        <p class="heritage-caption" data-home-cover-status aria-live="polite">支持 8 MB 以内的 JPG、PNG 或 WebP。</p>
        ${b('恢复默认图', 'heritage-cover-reset', 'text-link', `data-home-cover-reset ${cover ? '' : 'disabled'}`)}
      </div>
    </fieldset>`;
  }
  function updateCover(form, cover, message) {
    form.querySelector('[data-home-cover-preview]').innerHTML = P.FamilyHomeViews.mottoArtwork(cover);
    form.querySelector('[data-home-cover-status]').textContent = message;
    form.querySelector('[data-home-cover-reset]').disabled = !cover;
  }
  /** 图片先解码并缩小，避免大图拖慢首页。异步结果只交给发起读取的当前草稿。 */
  async function changeCover(form, input) {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    const value = draft('motto', form.dataset.person);
    const status = form.querySelector('[data-home-cover-status]');
    if (!COVER_TYPES.includes(file.type) || file.size > MAX_COVER_BYTES) {
      status.textContent = '请选择 8 MB 以内的 JPG、PNG 或 WebP。';
      return;
    }
    const request = Symbol('家训背景图');
    const submitButton = form.querySelector('[type="submit"]');
    form.coverRequest = request;
    submitButton.disabled = true;
    status.textContent = '正在读取图片…';
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (form !== activeForm() || form.coverRequest !== request) return;
      const scale = Math.min(1, MAX_COVER_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      value.cover = canvas.toDataURL('image/webp', 0.88);
      updateCover(form, value.cover, '已换图，确认后显示在首页。');
    } catch {
      if (form === activeForm() && form.coverRequest === request) {
        status.textContent = '这张图片无法读取，请重新选择。';
      }
    } finally {
      URL.revokeObjectURL(url);
      if (form.coverRequest === request) {
        form.coverRequest = null;
        submitButton.disabled = false;
      }
    }
  }
  function resetCover(form) {
    if (!form || form.dataset.kind !== 'motto') return;
    form.coverRequest = null;
    form.querySelector('[type="submit"]').disabled = false;
    draft('motto', form.dataset.person).cover = '';
    updateCover(form, '', '已恢复默认背景图，确认后更新首页。');
  }
  /** 文本输入均有可见标签；长文本保持原段落，来源和立训时间独立填写。 */
  function textFields(kind,value,page=false) {
    const surname=kind==='surname'?`<label for="heritage-surname">姓氏（可填写复姓）</label><input id="heritage-surname" name="surname" maxlength="8" value="${e(value.surname || '')}" required>`:'';
    const label=page?'家训正文':LABELS[kind];
    const originHelp = kind === 'origin'
      ? '<p class="heritage-caption" id="heritage-origin-format">时间节点每行一条，可按「1963年 · 标题｜正文」填写。</p>'
      : '';
    const text=`<label for="heritage-text">${label}</label>${originHelp}<textarea id="heritage-text" name="text" rows="7" maxlength="1800"${page?' placeholder="写下想和家人一起记住的话。"':''}${originHelp?' aria-describedby="heritage-origin-format"':''} required>${e(value.text)}</textarea>`;
    const source=`<label for="heritage-source">${kind==='motto'?'传承来源或立训缘由':'资料来源或讲述者'}</label><input id="heritage-source" name="source" maxlength="180" value="${e(value.source)}" ${kind==='origin'?'required':''}>`;
    const motto=kind==='motto'?`<label for="heritage-kind">家训来源</label><select id="heritage-kind" name="kind"><option value="new" ${value.kind==='new'?'selected':''}>由本人新立</option><option value="inherited" ${value.kind==='inherited'?'selected':''}>沿用家族传承</option></select><label for="heritage-date">立训或整理确认日期</label><input id="heritage-date" name="date" type="date" value="${e(value.date)}" required>`:'';
    return page?text+coverField(value.cover)+motto+source:surname+text+source+(kind==='origin'?traceFields(value.trace):'');
  }
  function editorForm(kind,person,value,page=false) {
    return `<form class="heritage-editor" id="heritage-form" data-home-form data-feature-form data-actor="${e(P.state.actor)}" data-kind="${kind}" data-person="${e(person)}">
      ${textFields(kind,value,page)}
      <p class="heritage-form-error" role="alert"></p>
      <div class="heritage-editor-actions">${b('保存草稿','heritage-save','btn secondary')}<button type="submit" class="btn">核对${kind==='suggestion'?'建议':'内容'}</button></div>
    </form>`;
  }
  /** 路由明确记录编辑对象。只有进入该页时才更新草稿基准，字号重绘不会跳过版本检查。 */
  function enterPage(route,id) {
    if(route!==MOTTO_EDIT_ROUTE)return;
    const person=id||P.FamilyContext.current();
    if(P.state.route===route&&P.state.homeEditPerson===person)return;
    P.state.homeEditPerson=person;
    if(!P.state.members.includes(person)||!allowed('motto',person))return;
    const value=draft('motto',person),current=revision('motto',person);
    if(value.revision!==current){
      value.revision=current;
      value.rebased=true;
    }
  }
  function editMotto() {
    const person=P.state.homeEditPerson;
    if(!P.state.members.includes(person)||!allowed('motto',person)){
      return `<div class="page empty"><h2>这项内容由对应的档案本人编辑</h2>${l('返回首页内容','home-manage','btn')}</div>`;
    }
    const value=draft('motto',person);
    const notice=value.rebased?'<p class="notice section">正式内容已有更新，已保留你的草稿，请对照首页重新核对。</p>':'';
    return `<div class="page heritage-edit-page"><p class="page-subtitle">全家共用一份家训。沿用家族传承时，请写明来源。</p>${notice}${editorForm('motto',person,value,true)}</div>`;
  }
  /** 家训编辑使用独立页，姓氏、溯源和家人建议在弹层中整理。 */
  function open(kind,person=P.FamilyContext.current()) {
    if(!allowed(kind,person))return P.toast('这项内容由对应的档案本人确认。');
    if(kind==='motto'){
      if(P.state.route===MOTTO_EDIT_ROUTE&&P.state.homeEditPerson===person){
        P.closeModal();
        return;
      }
      P.navigate(MOTTO_EDIT_ROUTE+'/'+person);
      return;
    }
    const value=draft(kind,person),stale=value.revision!==revision(kind,person);
    // 重新打开时保留输入并明确提示正式版本已变，避免草稿永久卡在旧修订号。
    if(stale)value.revision=revision(kind,person);
    const notice=stale?'正式内容已有更新，已保留你的草稿，请对照首页重新核对。':kind==='suggestion'?'建议交给家庭指定的档案本人核对，提交后不会直接替换家训。':'先保存草稿，核对后再展示给获授权的家人。';
    const title=kind==='suggestion'?'协助整理家训':'整理'+LABELS[kind];
    P.modal(title,`<p class="heritage-caption">${notice}</p>${editorForm(kind,person,value)}`);
  }
  /** 核对页冻结本次输入；返回修改或关闭都保留草稿，不擅自发布。 */
  function review(form) {
    const {kind,person}=form.dataset,value=draft(kind,person);
    if(!value.text.trim())return '请先填写内容。';
    if (kind === 'surname' && !value.surname) return '请填写姓氏。';
    if (kind === 'origin' && !value.source.trim()) return '请填写家庭资料来源。';
    if(kind==='motto'&&(!['new','inherited'].includes(value.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(value.date)))return '请检查家训来源与日期。';
    if(kind==='motto'&&value.kind==='inherited'&&!value.source.trim())return '请填写传承家训的来源。';
    if(value.revision!==revision(kind,person))return kind==='motto'?'正式内容已经更新，请返回首页内容后重新打开编辑页。':'正式内容已经更新，请关闭弹层后重新整理。';
    const id=P.nextId('home-review');F.ensure().review={id,key:key(kind,person),actor:P.state.actor,person,kind,value:structuredClone(value)};
    const metadata=kind==='motto'?`<p class="heritage-caption">${value.kind==='new'?'本人新立':'家族传承'} · ${e(value.date)}</p>`:kind==='surname'?`<p class="heritage-caption">姓氏：${e(value.surname)}</p>`:'';
    const sources=kind==='origin'?originTrace(value.trace,value.source.trim()):value.source?`<p class="heritage-caption">来源或缘由：${e(value.source)}</p>`:'';
    const cover = kind === 'motto' ? P.FamilyHomeViews.mottoArtwork(value.cover) : '';
    P.modal('确认'+LABELS[kind],`${cover}<div class="heritage-review-copy">${e(value.text)}</div>${metadata}${sources}<p class="heritage-caption">${kind==='motto'?'由你确认后，本家庭统一使用这份家训。':kind==='suggestion'?'提交给家庭指定本人，等待核对。':'确认后展示给有权阅读这份档案的家人。'}</p><div class="heritage-editor-actions">${b('返回修改','heritage-edit','btn secondary',`data-kind="${kind}" data-person="${e(person)}"`)}${b(kind==='suggestion'?'提交建议':'确认并展示','heritage-publish','btn',`data-review="${id}"`)}</div>`);
    return '';
  }
  /** 发布前重验账号、确认权和修订号，完成后返回首页查看结果。 */
  function publish(id) {
    const home=F.ensure(),entry=home.review;
    if(!entry||entry.id!==id||entry.actor!==P.state.actor||!allowed(entry.kind,entry.person))return P.toast('确认已失效，请重新打开对应内容。');
    const {kind,person,value}=entry;if(value.revision!==revision(kind,person))return P.toast('内容已更新，请重新核对。');
    const doc={text:value.text.trim(),source:value.source.trim(),date:value.date,confirmedBy:P.state.actor,revision:value.revision+1};
    if(kind==='motto'){home.family.motto={...doc,kind:value.kind,cover:value.cover};if(value.suggestionId){const suggestion=home.family.suggestions.find(item=>item.id===value.suggestionId);if(suggestion)suggestion.status='accepted';}}
    else if(kind==='suggestion')home.family.suggestions.push({id:P.nextId('motto-suggestion'),author:P.state.actor,text:doc.text,source:doc.source,status:'pending'});
    else {
      const profile=F.profile(person);
      if (kind === 'surname') {
        profile.surname = value.surname;
        profile.surnameOrigin = doc;
      } else {
        profile.origin = { ...doc, trace: value.trace };
      }
    }
    // 核对弹层下方的旧页面表单还在，先解除绑定，避免导航时把已发布的内容重新写为草稿。
    const pageForm=document.querySelector('#app-content [data-home-form]');
    if(pageForm?.dataset.kind===kind&&pageForm.dataset.person===person)pageForm.featureState=null;
    delete home.drafts[entry.key];home.review=null;P.closeModal();
    if (P.state.route === 'home') P.render();
    else P.navigate('home');
    P.toast(kind==='suggestion'?'建议已提交，等待指定的档案本人确认。':'已确认，首页内容已更新。');
  }
  /** 沿用自由文本线索，年代范围按起始时间排序，保留家人填写的完整范围。 */
  function readOriginClue(label, value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const chineseDate = /^(?:约\s*)?[1-9]\d{3}年(?:\s*\d{1,2}月(?:\s*\d{1,2}[日号])?|春节|[春夏秋冬]季?|代|初|末)?/;
    const numericDate = /^[1-9]\d{3}(?:[-/]\d{1,2}(?:[-/]\d{1,2})?)?(?=[\s·：:至到—–-]|$)/;
    const start = text.match(chineseDate)?.[0] || text.match(numericDate)?.[0];
    if (!start) return { label, text };
    const [year, month = 0, day = 0] = start.match(/\d+/g).map(Number);
    if (month > 12 || day > 31) return { label, text };
    const range = text.slice(start.length).match(/^\s*[至到—–-]\s*[1-9]\d{3}(?!\d)年?/);
    const date = start + (range?.[0] || '');
    return {
      label,
      date,
      text: text.slice(date.length).replace(/^[\s·：:，,]+/, '') || label,
      order: year * 10000 + month * 100 + day
    };
  }
  /** 正文中单独写成“年代 · 记载”的行并入时间轴，其余段落照原样阅读。 */
  function readOriginRecord(value) {
    const dated = [];
    const paragraphs = [];
    for (const line of String(value ?? '').split(/\r?\n/)) {
      const clue = readOriginClue('家族记载', line);
      const rest = clue?.date ? line.trim().slice(clue.date.length).trimStart() : '';
      if (rest.startsWith('·') && rest.slice(1).trim()) dated.push(clue);
      else paragraphs.push(line);
    }
    return { dated, text: paragraphs.join('\n').trim() };
  }
  function originChapter({ date, text }) {
    const separator = text.indexOf('｜');
    const title = separator > 0 ? text.slice(0, separator) : text.split(/(?<=[。！？])/, 1)[0];
    const body = separator > 0 ? text.slice(separator + 1).trim() : text;
    return { date, title, body };
  }
  function historyBook(person, page, leaf) {
    return `<div class="history-book" tabindex="-1" role="group" aria-label="家史"
      data-history-person="${e(person)}" data-history-page="${page}" data-paper-swipe>${leaf}</div>`;
  }
  function historyPage(content) {
    const book = content.querySelector('.history-book');
    if (!book) return null;
    return { book, person: book.dataset.historyPerson, number: Number(book.dataset.historyPage), leaf: book.querySelector('.history-leaf') };
  }
  /** 只在同一家史内复用刚离开的书页，切换其他人物时重新读取正文。 */
  function showHistoryTurn(content, previousRoute, previousPage) {
    const current = historyPage(content);
    if (!current) return;
    current.book.focus({ preventScroll: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (previousRoute === 'home') {
      const cover = document.createElement('div');
      cover.className = 'bound-paper journal-sheet history-opening-cover';
      const art = P.Households.isExample()
        ? '<img src="assets/family-home/reference/old-lane.webp" alt="">'
        : P.icon('book');
      cover.innerHTML = `<strong>${e(P.FamilyJournal.familyName())}家史 ${P.FamilyJournal.seal()}</strong>
        <span class="history-cover-art">${art}</span>`;
      P.FamilyJournal.animatePaperTurn(current.leaf, cover, 'open', 'history');
    } else if (previousPage?.person === current.person && previousPage.number !== current.number) {
      const direction = previousPage.number < current.number ? 'next' : 'previous';
      P.FamilyJournal.animatePaperTurn(current.leaf, previousPage.leaf, direction, 'history');
    }
  }
  function originChapterView(chapter, page, chapters, route, person) {
    const sample = P.Households.isExample() && person === 'father' && chapter.title === '成家后的第一顿饭' && chapter.date === '1989年';
    const next = page < chapters.length;
    const hint = next ? '向左滑，翻到下一篇' : page > 1 ? '向右滑，翻回上一篇' : '向右滑，返回目录';
    return historyBook(person, page, `<article class="bound-paper journal-sheet history-chapter history-leaf">
      <p class="history-period">${e(chapter.date)}</p>
      <h1>${e(chapter.title)}</h1>
      ${sample ? '<figure><img src="assets/family-home/reference/first-meal.webp" alt="陈远山与林慧在小饭桌前吃饭的示例照片"></figure>' : ''}
      <p class="heritage-reader-text">${e(chapter.body)}</p>
      ${P.FamilyJournal.turnPages({
        previous: page > 1 ? route + '/' + (page - 1) : route,
        next: next && route + '/' + (page + 1),
        position: page + ' / ' + chapters.length,
        previousLabel: page > 1 ? '上一篇' : '目录',
        nextLabel: '下一篇'
      })}
      <p class="paper-swipe-hint">${hint}</p>
    </article>`);
  }
  /** 详情只读取已确认且已授权的记载，年代不详的线索保留在目录的资料来源。 */
  function readOrigin(person) {
    if (!F.readable(person)) return `<div class="page empty"><h2>家史暂未开放</h2>${l('返回我家', 'home', 'btn section')}</div>`;
    const doc = F.document('origin', person);
    if (!doc) return '<div class="page empty"><p>家史待整理。</p></div>';
    const record = readOriginRecord(doc.text);
    const clues = ORIGIN_TRACE_FIELDS.map(({ name, label }) => readOriginClue(label, doc.trace?.[name])).filter(Boolean);
    const chapters = [...clues.filter(clue => clue.date), ...record.dated]
      .sort((first, second) => first.order - second.order).map(originChapter);
    const undated = clues.filter(clue => !clue.date);
    const page = Number(P.state.homeHistoryPage);
    const route = 'home-origin/' + e(person);
    if (Number.isInteger(page) && chapters[page - 1]) {
      return originChapterView(chapters[page - 1], page, chapters, route, person);
    }
    const sources = undated.length || record.text || doc.source;
    return historyBook(person, 0, `<article class="bound-paper journal-sheet history-contents history-leaf">
      <h1>${e(P.FamilyJournal.familyName())}家史 ${P.FamilyJournal.seal()}</h1>
      ${chapters.length ? `<h2 class="journal-divider">目录</h2>
        <ol class="history-chapters" role="list">
          ${chapters.map(({ date, title }, index) => `<li>${l(
            `<span>${e(date)}</span><strong>${e(title)}</strong>${P.icon('arrow')}`,
            route + '/' + (index + 1), 'history-index-row')}</li>`).join('')}
        </ol>
        ${l(P.icon('arrow') + ' 从第一篇读起', route + '/1', 'paper-link history-first', 'data-paper-turn="next"')}` : ''}
      ${sources ? `<details class="history-source"><summary>家族记载与资料来源</summary>
        ${undated.length ? `<dl class="heritage-origin-clues">
          ${undated.map(({ label, text }) => `<div><dt>${label}</dt><dd>${e(text)}</dd></div>`).join('')}
        </dl>` : ''}
        ${record.text ? `<p class="heritage-reader-text">${e(record.text)}</p>` : ''}
        ${doc.source ? `<p class="heritage-origin-source">资料来源 · ${e(doc.source)}</p>` : ''}
      </details>` : ''}
      ${P.Households.addonEntry('vr', '了解家中老宅的 VR 建模', { returnLabel: '返回家史目录', className: 'paper-link' })}
    </article>`);
  }
  /** 家人的建议保留讲述者，只有指定本人可取用到待确认草稿。 */
  function suggestions() {
    if(!F.editable('motto',''))return;
    P.modal('家人整理的建议',F.ensure().family.suggestions.filter(item=>item.status==='pending').map(item=>`<div class="heritage-suggestion"><strong>${e(P.PEOPLE[item.author]?.name||'家人')}的建议</strong><p>${e(item.text)}</p>${b('取用并核对','heritage-use-suggestion','btn secondary',`data-id="${e(item.id)}"`)}</div>`).join('')||'<p>暂无待核对建议。</p>');
  }
  /** 所有新增动作统一进入原型原有事件代理，重复渲染不增加监听器。 */
  function handleAction(action,element) {
    if(!action.startsWith('heritage-'))return false;
    const person=element.dataset.person||P.FamilyContext.current();
    if(action==='heritage-edit')open(element.dataset.kind,person);
    else if (action === 'heritage-cover-reset') resetCover(activeForm());
    else if(action==='heritage-save'){
      const form=activeForm();
      if(!form)return true;
      capture();
      if(form.dataset.kind==='motto')P.back();
      else P.closeModal();
      P.toast('草稿已保留在本次演示中，仅自己可见。');
    }
    else if(action==='heritage-publish')publish(element.dataset.review);
    else if(action==='heritage-suggest')open('suggestion',person);
    else if(action==='heritage-suggestions')suggestions();
    else if(action==='heritage-use-suggestion'&&F.editable('motto',person)){
      const item=F.ensure().family.suggestions.find(value=>value.id===element.dataset.id&&value.status==='pending');
      if(item){const value=draft('motto',person);Object.assign(value,{text:item.text,source:item.source||P.PEOPLE[item.author]?.name+'整理建议',suggestionId:item.id});open('motto',person);}
    }
    return true;
  }
  /** 表单由当前状态绑定，越权或陈旧表单不写入草稿及正式内容。 */
  function submit(form) {
    if(!form.matches('[data-home-form]'))return false;
    if(form!==activeForm() || form.coverRequest)return true;
    capture();const error=review(form);if(error)form.querySelector('[role="alert"]').textContent=error;return true;
  }
  Object.assign(P.views,{
    'home-origin':()=>readOrigin(P.state.homeReaderPerson||P.FamilyContext.current()),
    [MOTTO_EDIT_ROUTE]:editMotto
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'cover' && input.form?.dataset.kind === 'motto' && input.form === activeForm()) {
      void changeCover(input.form, input);
    }
  });
  P.FamilyHomeEditor={capture,enterPage,handleAction,submit,historyPage,showHistoryTurn};
}
