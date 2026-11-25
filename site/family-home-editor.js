/** 首页编辑与确认：本人草稿、家庭家训建议和正式内容分别维护，提交时重验身份与版本。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,icon:i,link:l}=P,F=P.FamilyHome;
  const MOTTO_EDIT_ROUTE='home-motto-edit';
  const ORIGIN_EDIT_ROUTE = 'home-origin-edit';
  const MOTTO_TEXT_LIMIT = 60;
  const MOTTO_BYLINE_LIMIT = 24;
  const MOTTO_LENGTH_ERROR = `家训正文最多 ${MOTTO_TEXT_LIMIT} 字，请删减后再保存。`;
  const LABELS={surname:'姓源',origin:'家史',motto:'家训',suggestion:'家训整理建议'};
  const ORIGIN_TITLE_LIMIT = 32;
  const ORIGIN_TEXT_LIMIT = 6000;
  const ORIGIN_NOTES_LIMIT = 1000;
  const TEXT_INPUT = '#heritage-text';
  const writingPreviews = new WeakMap();
  const importRequests = new WeakMap();
  /** 家人可提交建议，只有维护人可以保存正式家训。 */
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
    if (kind === 'motto') {
      return home.drafts[id] = { text: doc?.text || '', byline: F.mottoByline(doc), revision: doc?.revision || 0 };
    }
    const surname = kind === 'surname' ? F.surnameDetails(person) : null;
    return home.drafts[id] = {
      text: kind === 'origin' ? originText(doc) : doc?.text || surname?.text || '',
      source: doc?.source || surname?.source || '',
      kind: doc?.kind || 'new',
      date: doc?.date || today(),
      revision: revision(kind, person),
      ...(surname ? { surname: surname.name } : {}),
      ...(kind === 'origin' ? {title: F.originTitle(doc), trace: doc?.trace ? {...doc.trace} : undefined} : {})
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
    const text = String(data.get('text') || '');
    if (kind === 'motto') {
      const byline = String(data.get('byline') || '');
      if (text !== value.text || byline !== value.byline) value.dirty = true;
      value.text = text;
      value.byline = byline;
      return;
    }
    const fields = {
      text,
      source: kind === 'origin' ? value.source : String(data.get('source') || ''),
      kind: String(data.get('kind') || 'new'),
      date: String(data.get('date') || today())
    };
    Object.assign(value, fields);
    if (kind === 'surname') value.surname = String(data.get('surname') || '').trim();
    if (kind === 'origin') value.title = String(data.get('title') || '').trim();
  }
  /** 旧版的年代条目依原顺序读成段落，沿用原日期和题名；新文章按原文显示。 */
  function originText(doc) {
    const text = doc?.text || '';
    if (doc?.title) return text;
    return text.replace(
      /^((?:约\s*)?[1-9]\d{3}[^·\n]*)\s*·\s*([^｜\n]+)｜([^\n]*)$/gm,
      (_, date, title, body) => `${date.trim()}，${title.trim().replace(/[，。！？；]$/u, '')}。${body.trim()}\n`
    );
  }
  function articleParagraphs(text) {
    return text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
      .map(line => `<p>${e(line)}</p>`).join('');
  }
  /** 换行只影响排版，正文计数、润色采纳和保存使用同一个字数口径。 */
  function mottoTextLength(text) {
    return Array.from(text.replace(/[\r\n]/g, '')).length;
  }

  function updateMottoTextCount(input) {
    const length = mottoTextLength(input.value);
    const counter = input.form.querySelector('#motto-editor-text-count');
    counter.textContent = `${length} / ${MOTTO_TEXT_LIMIT} 字`;
    counter.classList.toggle('is-at-limit', length >= MOTTO_TEXT_LIMIT);
    input.setAttribute('aria-invalid', String(length > MOTTO_TEXT_LIMIT));
    input.form.querySelector('#motto-editor-error').textContent = length > MOTTO_TEXT_LIMIT ? MOTTO_LENGTH_ERROR : '';
    input.parentElement.dataset.content = input.value;
  }
  function polishButton(panelId, text, className = 'paper-link') {
    return b(i('sparkles') + 'AI 润色', 'heritage-polish', className,
      `aria-expanded="false" aria-controls="${panelId}"${text.trim() ? '' : ' disabled'}`);
  }
  function originTextFields(value) {
    return `
      <div class="history-writing-tools" role="group" aria-label="写作方式">
        ${b(i('edit') + '自己写', 'heritage-write', 'paper-link')}
        ${b(i('source') + '上传文档', 'heritage-import', 'paper-link')}
        ${b(i('sparkles') + 'AI 帮写', 'heritage-ai-start', 'paper-link', 'aria-haspopup="dialog"')}
      </div>
      <input type="file" id="history-file" accept=".txt,.docx" hidden>
      <div class="history-book-page history-manuscript">
        <label class="heritage-caption" for="heritage-title">篇名</label>
        <input id="heritage-title" name="title" maxlength="${ORIGIN_TITLE_LIMIT}" value="${e(value.title)}" placeholder="给家史起个篇名" required>
        <div class="history-text-heading">
          <label class="history-section-title" for="heritage-text">家史正文</label>
          ${polishButton('history-polish-result', value.text)}
        </div>
        <textarea id="heritage-text" name="text" rows="8" maxlength="${ORIGIN_TEXT_LIMIT}" placeholder="从一件想留给家人的往事写起。" required>\n${e(value.text)}</textarea>
      </div>
      <section id="history-polish-result" class="history-polish-result" data-polish-result aria-label="润色建议" hidden></section>`;
  }
  function textFields(kind,value) {
    if (kind === 'origin') return originTextFields(value);
    const surname=kind==='surname'?`<label for="heritage-surname">姓氏（可填写复姓）</label><input id="heritage-surname" name="surname" maxlength="8" value="${e(value.surname || '')}" required>`:'';
    const label = `<label for="heritage-text">${LABELS[kind]}</label>`;
    const text=`<textarea id="heritage-text" name="text" rows="7" maxlength="1800" required>${e(value.text)}</textarea>`;
    const source=`<label for="heritage-source">资料来源或讲述者</label><input id="heritage-source" name="source" maxlength="180" value="${e(value.source)}">`;
    return surname + label + text + source;
  }
  function mottoTextField(value) {
    const length = mottoTextLength(value.text);
    return `<section class="motto-editor-section" aria-labelledby="motto-editor-text-title">
      <div class="motto-manuscript">
        <div class="motto-editor-heading-row">
          <h2 class="motto-editor-heading" id="motto-editor-text-title"><label for="heritage-text">家训正文</label></h2>
          <div class="motto-writing-actions" role="group" aria-label="家训写作辅助">
            ${b(i('sparkles') + 'AI 生成', 'heritage-ai-start', 'paper-link motto-writing-action', 'aria-haspopup="dialog"')}
            ${polishButton('motto-polish-result', value.text, 'paper-link motto-writing-action')}
          </div>
        </div>
        <div class="motto-text-entry" data-content="${e(value.text)}">
          <textarea id="heritage-text" name="text" rows="3" aria-invalid="${length > MOTTO_TEXT_LIMIT}" aria-describedby="motto-editor-text-count motto-editor-error" placeholder="写下想和家人一起记住的话。" required>\n${e(value.text)}</textarea>
        </div>
        <div class="motto-manuscript-footer">
          <span class="heritage-caption motto-editor-text-count${length >= MOTTO_TEXT_LIMIT ? ' is-at-limit' : ''}" id="motto-editor-text-count">${length} / ${MOTTO_TEXT_LIMIT} 字</span>
          <div class="motto-editor-byline">
            <label for="motto-byline">作者落款</label>
            <input id="motto-byline" type="text" name="byline" maxlength="${MOTTO_BYLINE_LIMIT}" value="${e(value.byline)}" placeholder="填写落款">
          </div>
        </div>
      </div>
      <section id="motto-polish-result" class="motto-polish-result" data-polish-result aria-label="润色建议" hidden></section>
    </section>`;
  }
  function editorForm(kind,person,value) {
    const motto = kind === 'motto';
    const origin = kind === 'origin';
    return `<form class="heritage-editor" id="heritage-form" data-home-form data-feature-form data-actor="${e(P.state.actor)}" data-kind="${kind}" data-person="${e(person)}">
      ${motto ? mottoTextField(value) : textFields(kind,value)}
      <p class="heritage-form-error"${motto ? ' id="motto-editor-error"' : ''} role="alert">${motto && mottoTextLength(value.text) > MOTTO_TEXT_LIMIT ? e(MOTTO_LENGTH_ERROR) : ''}</p>
      ${motto ? `<button type="submit" class="paper-link paper-outline motto-editor-save">${P.icon('check')}保存</button>` : origin ?
        `<div class="history-editor-actions history-edit-footer">${b('保存草稿','heritage-save','paper-link')}
          <button type="submit" class="paper-link paper-outline">${i('check')}核对内容</button></div>` :
        `<div class="heritage-editor-actions">${b('保存草稿','heritage-save','btn secondary')}<button type="submit" class="btn">核对${kind==='suggestion'?'建议':'内容'}</button></div>`}
    </form>`;
  }
  /** 旧链接仍指向同一份家庭家训。有人先确认了新版时，只保留当前账号实际修改过的草稿。 */
  function enterPage(route) {
    if (route !== MOTTO_EDIT_ROUTE || !F.editable('motto')) return;
    if (P.state.route === route && P.state.homeEditActor === P.state.actor) return;
    P.state.homeEditActor = P.state.actor;
    const home = F.ensure();
    const person = home.family.mottoOwner;
    const value = draft('motto', person);
    const current = revision('motto', person);
    if (value.revision === current) return;
    if (value.dirty) {
      value.revision = current;
      value.rebased = true;
    } else {
      delete home.drafts[key('motto', person)];
    }
  }
  function editMotto() {
    if (!F.editable('motto')) return P.views.home();
    enterPage(MOTTO_EDIT_ROUTE);
    const person = F.ensure().family.mottoOwner;
    const value=draft('motto',person);
    const notice=value.rebased?'<p class="notice section">首页家训已有更新，请对照后再保存草稿中的文字。</p>':'';
    return `<div class="page heritage-edit-page">${notice}${editorForm('motto',person,value)}</div>`;
  }
  function originRoute(person) {
    return 'home-origin/' + person;
  }
  function editOrigin(person) {
    if (!allowed('origin', person)) return readOrigin(person);
    const value = draft('origin', person);
    return `<div class="page heritage-edit-page history-edit-page">${editorForm('origin', person, value)}</div>`;
  }
  /** 家训和家史在独立页编辑，姓源和家人建议在手机弹层整理。 */
  function open(kind,person=P.FamilyContext.current()) {
    if(!allowed(kind,person))return P.toast('这项内容由对应的档案本人确认。');
    if(kind==='motto'){
      if(P.state.route===MOTTO_EDIT_ROUTE){
        P.closeModal();
        return;
      }
      P.navigate(MOTTO_EDIT_ROUTE+'/'+F.ensure().family.mottoOwner);
      return;
    }
    if (kind === 'origin' && P.state.route === ORIGIN_EDIT_ROUTE && P.state.homeReaderPerson === person) {
      P.closeModal();
      return;
    }
    const value=draft(kind,person),stale=value.revision!==revision(kind,person);
    // 重新打开时保留输入并明确提示正式版本已变，避免草稿永久卡在旧修订号。
    if(stale)value.revision=revision(kind,person);
    if (kind === 'origin') {
      P.navigate(ORIGIN_EDIT_ROUTE + '/' + person);
      if (stale) P.toast('正式内容已有更新，请核对暂存的草稿。');
      return;
    }
    const notice=stale?'正式内容已有更新，已保留你的草稿，请对照首页重新核对。':kind==='suggestion'?'建议会交给家训维护人核对，采纳后才会更新首页。':'先保存草稿，核对后再展示给获授权的家人。';
    const title=kind==='suggestion'?'协助整理家训':'整理'+LABELS[kind];
    P.modal(title,`<p class="heritage-caption">${notice}</p>${editorForm(kind,person,value)}`);
  }
  /** 预览只可写回原编辑页、原账号的对应草稿，切换页面或角色后失效。 */
  function currentWritingForm() {
    const kind = P.state.route === MOTTO_EDIT_ROUTE ? 'motto' : 'origin';
    if (kind === 'origin' && P.state.route !== ORIGIN_EDIT_ROUTE) return null;
    const form = document.querySelector('#app-content [data-home-form]');
    if (!form || form.dataset.kind !== kind || form.featureState !== P.state) return null;
    if (form.dataset.actor !== P.state.actor || !allowed(kind, form.dataset.person)) return null;
    return form;
  }
  function clearPolish(form) {
    const panel = form.querySelector('[data-polish-result]');
    panel.hidden = true;
    panel.replaceChildren();
    form.querySelector('[data-action="heritage-polish"]').setAttribute('aria-expanded', 'false');
    if (writingPreviews.get(form)?.type === 'polish') writingPreviews.delete(form);
  }
  function updateWritingText(input) {
    const form = input.form;
    form.querySelector('[data-action="heritage-polish"]').disabled = !input.value.trim();
    if (form.dataset.kind === 'motto') updateMottoTextCount(input);
    else form.querySelector('.heritage-form-error').textContent = '';
    clearPolish(form);
  }
  function showWritingSheet(title, content, kind = 'origin') {
    P.modal(title, `<div class="history-writing-sheet">${content}</div>`, 'sheet', undefined,
      {familySheet: true, closeLabel: '返回编辑' + LABELS[kind]});
  }
  function startAiDraft(form) {
    importRequests.delete(form);
    clearPolish(form);
    writingPreviews.delete(form);
    capture();
    const kind = form.dataset.kind;
    const motto = kind === 'motto';
    const choices = motto ? `
      <label for="motto-ai-form">生成体裁</label>
      <select id="motto-ai-form" aria-describedby="motto-ai-theme">
        ${P.FamilyHistoryWriting.mottoDraftForms.map(({ value, label, detail }) =>
          `<option value="${e(value)}">${e(detail ? label + '（' + detail + '）' : label)}</option>`).join('')}
      </select>
      <p class="heritage-caption" id="motto-ai-theme" hidden>诗体可按诚信、勤俭、敬亲、和睦或读书生成示例。</p>` : '';
    const label = motto ? '你们家看重哪些做法？' : '你想记下什么？';
    const placeholder = motto ? '例如，家里看重守信，答应别人的事尽力做到。' : '写几条线索，比如谁、在哪里、发生了什么。';
    showWritingSheet(motto ? 'AI 生成家训' : 'AI 帮写', `
      ${choices}
      <label for="history-ai-notes">${label}</label>
      <textarea id="history-ai-notes" rows="4" maxlength="${ORIGIN_NOTES_LIMIT}" placeholder="${placeholder}"></textarea>
      <p class="heritage-form-error" role="alert" hidden></p>
      <div class="history-editor-actions">${b('生成初稿', 'heritage-ai-generate', 'paper-link paper-outline')}</div>`, kind);
    document.getElementById(motto ? 'motto-ai-form' : 'history-ai-notes').focus();
  }
  function previewDraft(form, sheet) {
    const notes = sheet.querySelector('#history-ai-notes');
    if (!notes) return;
    const writer = P.FamilyHistoryWriting;
    const clues = notes.value.trim();
    const format = sheet.querySelector('#motto-ai-form')?.value;
    const verse = writer.mottoDraftForms.find(({ value, detail }) => value === format && detail);
    const text = format ? writer.draftMotto(clues, format, '') : clues && writer.draftFromNotes(clues);
    // 家训正文沿用编辑页的字数上限，超限初稿保留线索供用户精简。
    if (!text || (format && mottoTextLength(text) > MOTTO_TEXT_LIMIT)) {
      const error = sheet.querySelector('[role="alert"]');
      if (text) error.textContent = MOTTO_LENGTH_ERROR;
      else if (verse) error.textContent = '请在线索中写下诚信、勤俭、敬亲、和睦或读书等主题。';
      else error.textContent = format ? '先写下一点家里的做法。' : '先写下一点想记的往事。';
      error.hidden = false;
      notes.focus();
      return;
    }
    showCandidate(form, 'draft', text, { verse });
  }
  function showCandidate(form, type, text, { filename = '', verse } = {}) {
    const original = form.querySelector(TEXT_INPUT).value;
    const hasText = Boolean(original.trim());
    const kind = form.dataset.kind;
    const motto = kind === 'motto';
    const importing = type === 'import';
    const mode = motto ? 'replace' : 'append';
    const title = importing ? '核对导入文字' : verse ? '核对初稿 · ' + verse.label : '核对初稿';
    let caption = '示例初稿，请核对人物和往事。';
    if (importing) caption = filename;
    else if (motto) caption = verse ? '按主题选用的诗体示例，可采用后继续修改。' : '请核对家训初稿，可采用后继续修改。';
    const applyLabel = motto ? (hasText ? '替换正文草稿' : '使用初稿')
      : hasText ? '追加到正文' : importing ? '导入正文' : '使用初稿';
    clearPolish(form);
    writingPreviews.set(form, {type, text, original});
    showWritingSheet(title, `
      <p class="heritage-caption">${e(caption)}</p>
      <div class="history-writing-copy${motto ? ' motto-draft-copy' : ''}" role="region" aria-label="正文预览" tabindex="0">${motto ? e(text) : articleParagraphs(text)}</div>
      <div class="history-editor-actions">
        ${hasText && importing ? b('替换正文', 'heritage-writing-apply', 'paper-link', 'data-history-apply="replace"') : ''}
        ${hasText && motto ? b('保留原文', 'close-modal', 'paper-link') : ''}
        ${b(applyLabel, 'heritage-writing-apply', 'paper-link paper-outline', `data-history-apply="${mode}"`)}
      </div>`, kind);
    document.querySelector(`#modal [data-history-apply="${mode}"]`).focus({preventScroll: true});
  }
  async function importDocument(input, form) {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const request = {};
    importRequests.set(form, request);
    try {
      const text = await P.FamilyHistoryWriting.readDocument(file, ORIGIN_TEXT_LIMIT);
      if (request !== importRequests.get(form) || form !== activeForm()) return;
      capture();
      showCandidate(form, 'import', text, { filename: file.name });
    } catch (error) {
      if (request !== importRequests.get(form) || form !== activeForm()) return;
      form.querySelector('.heritage-form-error').textContent = error.message;
    }
  }
  function previewPolish(form) {
    const input = form.querySelector(TEXT_INPUT);
    const original = input.value;
    if (!original.trim()) return;
    const panel = form.querySelector('[data-polish-result]');
    const toggle = form.querySelector('[data-action="heritage-polish"]');
    if (!panel.hidden) {
      clearPolish(form);
      return;
    }
    const motto = form.dataset.kind === 'motto';
    const writing = P.FamilyHistoryWriting;
    const {text, changes} = motto ? writing.polishMotto(original) : writing.polish(original);
    const tooLong = motto && mottoTextLength(text) > MOTTO_TEXT_LIMIT;
    const canApply = original !== text && !tooLong;
    const marked = part => part.changed ? `<mark>${e(part.text)}</mark>` : e(part.text);
    const copy = motto ? `<div class="motto-polish-copy">${changes.map(marked).join('')}</div>`
      : `<div class="history-writing-copy" role="region" aria-label="润色稿预览" tabindex="0">${changes.filter(line => line.text.trim()).map(line => `<p>${marked(line)}</p>`).join('')}</div>`;
    const note = tooLong ? MOTTO_LENGTH_ERROR : '这段文字已经顺畅，可以保留原文。';
    if (canApply) writingPreviews.set(form, {type: 'polish', original, text});
    panel.innerHTML = `<div class="history-polish-heading"><h2 class="history-section-title" tabindex="-1">润色建议</h2>
        ${canApply ? `<span class="heritage-caption">${motto ? '改动处' : '示例润色 · 改动处'}</span>` : ''}</div>
      ${canApply ? copy : `<p>${e(note)}</p>`}
      <div class="history-editor-actions">${b('保留原文', 'heritage-polish-dismiss', 'paper-link')}
        ${canApply ? b((motto ? '' : i('check')) + '使用润色稿', 'heritage-writing-apply', motto ? 'paper-link' : 'paper-link paper-outline', 'data-history-apply="replace"') : ''}
      </div>`;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (motto) panel.querySelector('h2').focus({preventScroll: true});
    panel.scrollIntoView({block: 'nearest'});
  }
  /** 采纳只写回当前草稿，原文发生变化后旧建议不能覆盖新输入。 */
  function applyCandidate(form, mode) {
    const candidate = writingPreviews.get(form);
    if (!candidate) return;
    const input = form.querySelector(TEXT_INPUT);
    if (input.value !== candidate.original) return;
    const merged = mode === 'append' && input.value.trim()
      ? input.value.trimEnd() + '\n\n' + candidate.text : candidate.text;
    const motto = form.dataset.kind === 'motto';
    if ((motto ? mottoTextLength(merged) : merged.length) > (motto ? MOTTO_TEXT_LIMIT : ORIGIN_TEXT_LIMIT)) {
      P.toast(motto ? MOTTO_LENGTH_ERROR : `正文最多 ${ORIGIN_TEXT_LIMIT} 字，请先精简原文或导入内容。`);
      return;
    }
    if (candidate.type !== 'polish') P.closeModal();
    writingPreviews.delete(form);
    input.value = merged;
    updateWritingText(input);
    capture();
    input.focus();
  }
  function handleWriting(action, element) {
    const form = currentWritingForm();
    if (!form) return;
    const sheet = element.closest('#modal[open] .history-writing-sheet');
    if (sheet) {
      if (action === 'heritage-ai-generate') previewDraft(form, sheet);
      if (action === 'heritage-writing-apply') applyCandidate(form, element.dataset.historyApply);
      return;
    }
    if (!form.contains(element) || form !== activeForm()) return;
    if (form.dataset.kind === 'origin') {
      if (action === 'heritage-write') form.querySelector(TEXT_INPUT).focus();
      if (action === 'heritage-import') form.querySelector('#history-file').click();
    }
    if (action === 'heritage-ai-start') startAiDraft(form);
    if (action === 'heritage-polish') previewPolish(form);
    if (action === 'heritage-polish-dismiss') {
      clearPolish(form);
      form.querySelector('[data-action="heritage-polish"]').focus();
    }
    if (action === 'heritage-writing-apply') applyCandidate(form, element.dataset.historyApply);
  }
  /** 正文与落款共同保存，署名的变动不影响确认人、来源及编辑权限。 */
  function saveMotto(form) {
    const person = form.dataset.person;
    const value = draft('motto', person);
    const text = value.text;
    const byline = value.byline.trim();
    if (!text.trim()) return '请先填写家训正文。';
    if (mottoTextLength(text) > MOTTO_TEXT_LIMIT) return MOTTO_LENGTH_ERROR;
    if (value.byline.length > MOTTO_BYLINE_LIMIT) return `作者落款最多 ${MOTTO_BYLINE_LIMIT} 字。`;
    if (value.revision !== revision('motto', person)) return '首页家训已更新，请返回首页重新打开编辑页。';

    const home = F.ensure();
    const current = F.document('motto', person);
    if (current?.text !== text || F.mottoByline(current) !== byline) {
      const original = current || { kind: 'new', source: '', date: today(), confirmedBy: P.state.actor };
      home.family.motto = { ...original, text, byline, revision: value.revision + 1 };
    }
    if (value.suggestionId) {
      const suggestion = home.family.suggestions.find(item => item.id === value.suggestionId);
      if (suggestion) suggestion.status = 'accepted';
    }
    // 导航会暂存仍在编辑的表单，先解除绑定，避免刚保存的旧表单重新生成草稿。
    form.featureState = null;
    delete home.drafts[key('motto', person)];
    P.navigate('home');
    P.toast('家训已保存。');
    return '';
  }
  /** 家人建议与档案资料仍需先核对，再提交。 */
  function review(form) {
    const {kind,person}=form.dataset,value=draft(kind,person);
    if(!value.text.trim())return '请先填写内容。';
    if (kind === 'surname' && !value.surname) return '请填写姓氏。';
    if (kind === 'origin' && !value.title) return '请填写家史标题。';
    if (kind === 'origin' && value.title.length > ORIGIN_TITLE_LIMIT) return `标题最多 ${ORIGIN_TITLE_LIMIT} 字。`;
    if (kind === 'origin' && value.text.length > ORIGIN_TEXT_LIMIT) return `正文最多 ${ORIGIN_TEXT_LIMIT} 字。`;
    if(value.revision!==revision(kind,person))return '正式内容已经更新，请关闭弹层后重新整理。';
    const id=P.nextId('home-review');F.ensure().review={id,key:key(kind,person),actor:P.state.actor,person,kind,value:structuredClone(value)};
    const origin = kind === 'origin';
    const actions = `<div class="${origin ? 'history-editor-actions' : 'heritage-editor-actions'}">
      ${b('返回修改', 'heritage-edit', origin ? 'paper-link' : 'btn secondary', `data-kind="${kind}" data-person="${e(person)}"`)}
      ${b(kind === 'suggestion' ? '提交建议' : '确认并展示', 'heritage-publish', origin ? 'paper-link paper-outline' : 'btn', `data-review="${id}"`)}
    </div>`;
    const metadata=kind==='surname'?`<p class="heritage-caption">姓氏：${e(value.surname)}</p>`:'';
    const heading = kind === 'origin' ? `<h3 class="history-review-title">${e(value.title)}</h3>` : '';
    const sources = !origin && value.source ? `<p class="heritage-caption">来源或缘由：${e(value.source)}</p>` : '';
    const note = kind === 'suggestion' ? '提交给家训维护人核对。' : '确认后展示给有权阅读这份档案的家人。';
    if (origin) {
      showWritingSheet('确认家史', `${heading}<div class="history-writing-copy" role="region" aria-label="正文预览" tabindex="0">${articleParagraphs(value.text)}</div>
        <p class="heritage-caption">${note}</p>${actions}`);
    } else {
      P.modal('确认'+LABELS[kind], `<div class="heritage-review-copy">${e(value.text)}</div>${metadata}${sources}<p class="heritage-caption">${note}</p>${actions}`);
    }
    return '';
  }
  /** 发布前重验账号、确认权和修订号，家史发布后回到阅读页。 */
  function publish(id) {
    const home=F.ensure(),entry=home.review;
    if(!entry||entry.kind==='motto'||entry.id!==id||entry.actor!==P.state.actor||!allowed(entry.kind,entry.person))return P.toast('确认已失效，请重新打开对应内容。');
    const {kind,person,value}=entry;if(value.revision!==revision(kind,person))return P.toast('内容已更新，请重新核对。');
    const doc={text:value.text.trim(),source:value.source.trim(),date:value.date,confirmedBy:P.state.actor,revision:value.revision+1};
    if(kind==='suggestion')home.family.suggestions.push({id:P.nextId('motto-suggestion'),author:P.state.actor,text:doc.text,source:doc.source,status:'pending'});
    else {
      const profile=F.profile(person);
      if (kind === 'surname') {
        profile.surname = value.surname;
        profile.surnameOrigin = doc;
      } else {
        profile.origin = { ...doc, title: value.title, trace: value.trace };
      }
    }
    // 核对弹层下方的旧页面表单还在，先解除绑定，避免导航时把已发布的内容重新写为草稿。
    const pageForm=document.querySelector('#app-content [data-home-form]');
    if(pageForm?.dataset.kind===kind&&pageForm.dataset.person===person)pageForm.featureState=null;
    delete home.drafts[entry.key];home.review=null;P.closeModal();
    if (kind === 'origin') P.navigate(originRoute(person), {replace: true});
    else if (P.state.route === 'home') P.render();
    else P.navigate('home');
    if (kind === 'origin') P.toast('家史已更新。');
    else P.toast(kind === 'suggestion' ? '建议已提交，等待家训维护人核对。' : '已确认，首页内容已更新。');
  }
  /** 新旧链接读取同一份正式文章，仍按人物档案授权展示。 */
  function readOrigin(person) {
    if (!F.readable(person)) return P.unavailable('home', '这份家史暂未向你开放。');
    const doc = F.document('origin', person);
    if (!doc) {
      const edit = F.editable('origin', person)
        ? b('写家史', 'heritage-edit', 'paper-link', `data-kind="origin" data-person="${e(person)}"`)
        : '';
      return `<div class="page empty"><h1>家史待整理</h1>${edit}</div>`;
    }
    const writer = P.PEOPLE[doc.confirmedBy]?.name;
    return `<article class="history-article" aria-labelledby="history-title" tabindex="-1">
      <div class="history-book-page">
        <header class="history-article-heading">
          <h1 id="history-title">${e(F.originTitle(doc))} ${P.FamilyJournal.seal()}</h1>
          ${writer ? `<p class="history-article-byline">${e(writer)}记</p>` : ''}
        </header>
        <div class="history-article-copy">${articleParagraphs(originText(doc))}</div>
      </div>
      <footer class="history-article-footer">
        <div class="history-article-actions" role="group" aria-label="家史制作服务">
          ${l(i('book') + '制作纸质书', 'house-book-intro/' + e(person), 'paper-link paper-outline')}
          ${l(i('play') + '制作家庭纪录片', 'house-film-intro/' + e(person), 'paper-link paper-outline')}
        </div>
      </footer>
    </article>`;
  }
  /** 只有家训维护人可以查看待核对的建议并取用到草稿。 */
  function suggestions() {
    if(!F.editable('motto'))return;
    P.modal('家人整理的建议',F.ensure().family.suggestions.filter(item=>item.status==='pending').map(item=>`<div class="heritage-suggestion"><strong>${e(P.PEOPLE[item.author]?.name||'家人')}的建议</strong><p>${e(item.text)}</p>${b('取用并核对','heritage-use-suggestion','btn secondary',`data-id="${e(item.id)}"`)}</div>`).join('')||'<p>暂无待核对建议。</p>');
  }
  /** 所有新增动作统一进入原型原有事件代理，重复渲染不增加监听器。 */
  function handleAction(action,element) {
    if(!action.startsWith('heritage-'))return false;
    const person=element.dataset.person||P.FamilyContext.current();
    if(action==='heritage-edit')open(element.dataset.kind,person);
    else if(action==='heritage-save'){
      const form=activeForm();
      if(!form || form.dataset.kind === 'motto')return true;
      capture();
      P.closeModal();
      if (form.dataset.kind === 'origin') P.navigate(originRoute(form.dataset.person), {replace: true});
      P.toast('草稿已暂存，本次打开期间可继续编辑。');
    }
    else if(action==='heritage-publish')publish(element.dataset.review);
    else if(action==='heritage-suggest')open('suggestion',person);
    else if(action==='heritage-suggestions')suggestions();
    else if(action==='heritage-use-suggestion'&&F.editable('motto',person)){
      const item=F.ensure().family.suggestions.find(value=>value.id===element.dataset.id&&value.status==='pending');
      if (item) {
        const value = draft('motto', F.ensure().family.mottoOwner);
        Object.assign(value, {text: item.text, suggestionId: item.id, dirty: true});
        open('motto', person);
      }
    }
    else handleWriting(action, element);
    return true;
  }
  /** 表单由当前状态绑定，越权或陈旧表单不写入草稿及正式内容。 */
  function submit(form) {
    if(!form.matches('[data-home-form]'))return false;
    if(form!==activeForm())return true;
    capture();
    const error = form.dataset.kind === 'motto' ? saveMotto(form) : review(form);
    if (error) form.querySelector('[role="alert"]').textContent = error;
    return true;
  }
  Object.assign(P.views,{
    'home-origin':()=>readOrigin(P.state.homeReaderPerson||P.FamilyContext.current()),
    [ORIGIN_EDIT_ROUTE]: () => editOrigin(P.state.homeReaderPerson),
    [MOTTO_EDIT_ROUTE]:editMotto
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'history-ai-notes') {
      const alert = input.closest('#modal[open] .history-writing-sheet')?.querySelector('[role="alert"]');
      if (alert) alert.hidden = true;
    }
    if (input.id !== 'heritage-text' || !input.form || input.form !== activeForm()) return;
    if (['motto', 'origin'].includes(input.form.dataset.kind)) updateWritingText(input);
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.id === 'motto-ai-form') {
      const sheet = input.closest('#modal[open] .history-writing-sheet');
      if (!sheet) return;
      sheet.querySelector('#motto-ai-theme').hidden = input.value === 'plain';
      sheet.querySelector('[role="alert"]').hidden = true;
    }
    if (input.id === 'history-file' && input.form === activeForm()) importDocument(input, input.form);
  });
  P.FamilyHomeEditor={capture,enterPage,handleAction,submit};
}
