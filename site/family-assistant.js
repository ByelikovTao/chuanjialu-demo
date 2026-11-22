/** 家庭助手在原型内查询已共享的资料，回答和回看共用原记录。 */
'use strict';
{
  const P = window.App, { escape: e, button: b, link: l, icon: i } = P;
  const ROUTE = 'house-assistant';
  const TITLE = 'AI问家';
  const FORM_ID = 'family-assistant-form';
  const LIMIT = 160;
  const STREAM_INTERVAL_MS = 48;
  const STREAM_MAX_STEPS = 56;
  const TYPES = {
    photo: ['照片', 'photo', /照片|相片|图片|相册/],
    video: ['视频', 'play', /视频|影片|短片|录像/],
    voice: ['语音', 'mic', /语音|录音|原声|音频/],
    work: ['作品', 'book', /作品|书法|画作/],
    text: ['文字记录', 'edit', /文字记录|文字往事|书信/],
    motto: ['家训', 'book', /家训/],
    surname: ['姓源', 'source', /姓氏源流|姓氏来源|姓源|姓氏|姓什么/],
    origin: ['家史', 'source', /家史|家族寻根|家族溯源|家庭溯源|家族来源|寻根|溯源|祖籍|迁徙/]
  };
  const WHEN = /哪(?:一|几)?[年月日]|什么时候|何时|哪天|哪月|拍摄时间|日期/;
  const LIST = /哪些|多少|几[张段条件个]|最近|最新|看看|查找|有没有/;
  const COMMON_WORDS = /我们家|家里|我家|家庭|请问|告诉我|有哪些|是什么|有没有|最近|最新|添加|上传|查看|看看|查找|找找|记录了|记载了/g;
  const STOP = new Set(['的', '了', '在', '和', '是', '有', '吗', '呢', '我', '想', '哪', '个', '一', '几', '张', '段', '条', '年',
    '请', '里', '中', '上', '什么', '啥', '谁', '哪里', '怎么', '如何', '记录', '资料', '内容']);
  const words = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', { granularity: 'word' }) : null;
  const sessions = new WeakMap();

  /** 只保留问题和草稿。切家、切身份或撤回权限后，答案始终按当前资料重新查找。 */
  function session() {
    if (!sessions.has(P.state)) sessions.set(P.state, new Map());
    const accounts = sessions.get(P.state);
    if (!accounts.has(P.state.actor)) accounts.set(P.state.actor, { questions: [], draft: '' });
    return accounts.get(P.state.actor);
  }

  function mediaSource({ item, kind, material }) {
    const type = { film: 'video', clip: 'video', story: 'text', document: 'text' }[kind] ||
      (Object.hasOwn(TYPES, kind) ? kind : 'text');
    const types = [type];
    if (!material && (item.houseVoice || item.guestVoiceCount > 0)) types.push('voice');
    const body = material ? item.body : item.text;
    const captions = type === 'video' ? P.ARCHIVE_DATA.captions[item.src] || [] : [];
    const passages = [
      item.description, ...(Array.isArray(body) ? body : [body]), ...captions.map(cue => cue.text), item.quote
    ].filter(Boolean);
    const people = [...new Set([item.author, item.subject, ...P.Households.relatedMemberIds(item)])];
    const names = people.filter(id => P.PEOPLE[id]).map(id => {
      const person = P.PEOPLE[id];
      return `${person.name} ${person.short || ''} ${P.relation(id)}`;
    });
    return {
      title: item.title,
      types,
      date: item.photoYear ? `${item.photoYear} 年` : String(item.date || item.eventDate || item.year || ''),
      route: `${material ? 'archive-item' : 'story'}/${item.id}`,
      cover: material ? item.poster : item.houseImage,
      passages,
      keywords: [item.category, item.authorName, item.sourceLabel, ...names].filter(Boolean).join(' ')
    };
  }

  function familySources() {
    const family = P.FamilyHome;
    const owner = family.ensure().family.mottoOwner;
    const motto = family.document('motto');
    const surname = family.surnameDetails(owner);
    const origin = family.document('origin', owner);
    const originRoute = 'home-origin/' + owner;
    const heritage = [
      { title: '家训', types: ['motto'], passages: [motto?.text], route: 'home', cover: motto?.cover },
      { title: TYPES.surname[0], types: ['surname'], passages: [surname?.name && `这个家的姓氏是${surname.name}。`, surname?.text], route: 'home' },
      { title: TYPES.origin[0], types: ['origin'], passages: [
        origin?.trace?.ancestralHome && `祖籍与支系记载为 ${origin.trace.ancestralHome}。`,
        origin?.text, origin?.trace?.earliest, origin?.trace?.migration
      ], route: originRoute }
    ];
    return [
      ...P.Households.sharedFamilyEntries({ includeAllMedia: true }).map(mediaSource),
      ...heritage.map(source => ({ ...source, passages: source.passages.filter(Boolean) })).filter(source => source.passages.length)
    ];
  }

  function normalize(text) {
    return String(text || '').normalize('NFKC').toLowerCase();
  }

  function termsFor(question) {
    let phrase = normalize(question).replace(COMMON_WORDS, ' ').replace(new RegExp(WHEN.source, 'g'), ' ');
    const types = Object.entries(TYPES).filter(([, [, , pattern]]) => pattern.test(question));
    for (const [, [, , pattern]] of types) phrase = phrase.replace(new RegExp(pattern.source, 'g'), ' ');
    const segments = words
      ? Array.from(words.segment(phrase)).filter(({ isWordLike }) => isWordLike).map(({ segment }) => segment)
      : phrase.match(/[\p{L}\p{N}]+/gu) || [];
    const terms = segments.filter(segment => !STOP.has(segment));
    return { types: types.map(([type]) => type), terms: [...new Set(terms)] };
  }

  function rank(source, terms) {
    if (!terms.length) return 1;
    const title = normalize(source.title);
    const metadata = normalize([source.date, source.keywords].join(' '));
    const text = normalize(source.passages.join(' '));
    const points = terms.map(term => title.includes(term) ? 6 : metadata.includes(term) ? 3 : text.includes(term) ? 2 : 0);
    return points.filter(Boolean).length >= Math.ceil(terms.length / 2)
      ? points.reduce((sum, point) => sum + point, 0)
      : 0;
  }

  /** 照片依靠标题、说明和关联家人查找。视频只引用已有说明或字幕，未转写的语音提供原录音入口。 */
  function reply(question, sources) {
    const { types, terms } = termsFor(question);
    const list = LIST.test(question);
    const matches = sources
      .filter(source => !types.length || types.some(type => source.types.includes(type)))
      .map(source => ({ source, score: rank(source, terms) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score);
    if (!matches.length || (!types.length && !terms.length && !list)) {
      return { text: '目前的家庭档案里没有找到对应记录。可以试试家人的名字、照片标题或年份。', sources: [] };
    }
    const related = matches.slice(0, 3).map(({ source }) => source);
    const [first] = related;
    if (WHEN.test(question) && first.date) {
      const year = first.date.match(/\d{4}/)?.[0];
      const date = /哪一?年/.test(question) && year ? `${year} 年` : first.date;
      return { text: `《${first.title}》记载的时间是 ${date}。`, sources: related };
    }
    if (list || (!terms.length && types.some(type => ['photo', 'video', 'voice', 'work', 'text'].includes(type)))) {
      const label = types.length === 1 ? `与${TYPES[types[0]][0]}相关的记录` : '家庭记录';
      return { text: `找到 ${matches.length} 条${label}。`, sources: related };
    }
    const passage = first.passages.find(value => terms.some(term => normalize(value).includes(term))) || first.passages[0];
    const text = passage
      ? `《${first.title}》里有这段记载。\n${passage.length > 180 ? passage.slice(0, 180) + '…' : passage}`
      : `找到《${first.title}》${first.date ? '，记录时间为 ' + first.date : ''}。可以打开原资料查看。`;
    return { text, sources: related };
  }

  function sourceLink(source) {
    const labels = source.types.map(type => TYPES[type][0]);
    const media = source.cover ? `<img src="${e(source.cover)}" alt="" loading="lazy">` : i(TYPES[source.types[0]][1]);
    return l(`<span class="assistant-source-image">${media}</span>
      <span class="assistant-source-copy"><strong>${e(source.title)}</strong><small>${e([...labels, source.date].filter(Boolean).join(' · '))}</small></span>
      ${i('arrow')}`, e(source.route), 'assistant-source-link');
  }

  function turn(question, sources) {
    const answer = reply(question, sources);
    return `<li class="assistant-turn">
      <p class="assistant-question">${e(question)}</p>
      <div class="assistant-response">
        <span class="assistant-avatar">${i('spark')}</span>
        <div class="assistant-answer">
          <p>${e(answer.text)}</p>
          ${answer.sources.length ? `<div class="assistant-sources">
            <h3>出处</h3>
            ${answer.sources.map(sourceLink).join('')}
          </div>` : ''}
        </div>
      </div>
    </li>`;
  }

  function emptyState(title, description, actionLabel, route) {
    return `<section class="assistant-empty">
      <span class="assistant-empty-icon">${i('spark')}</span>
      <h2>${e(title)}</h2>
      <p>${e(description)}</p>
      ${l(e(actionLabel), route, 'btn')}
    </section>`;
  }

  function welcome(sources) {
    if (!sources.length) {
      return emptyState('先留下一份家庭记录', '分享照片、视频或语音后，就可以在这里提问。', '添加记录', 'house-add');
    }
    const suggestions = [];
    if (sources.some(source => source.types.includes('photo'))) suggestions.push(['photo', '最近有哪些家庭照片？']);
    if (sources.some(source => source.route === 'story/nian-first-new-year')) suggestions.push(['clock', '念念第一次拜年是哪一年？']);
    if (sources.some(source => source.types.includes('motto'))) suggestions.push(['book', '家训是什么？']);
    if (!suggestions.length) suggestions.push(['list', '最近有哪些家庭记录？']);
    const prompts = suggestions.map(([icon, question]) => b(
      `<span class="assistant-suggestion-icon">${i(icon)}</span><span>${e(question)}</span>${i('arrow')}`,
      'assistant-ask', 'assistant-suggestion',
      `data-question="${e(question)}" data-feature-action data-actor="${e(P.state.actor)}"`
    )).join('');
    return `<section class="assistant-welcome">
      <div class="assistant-intro">
        <div>
          <h2>想找家里的<br>哪段往事？</h2>
          <p>家训、照片、视频和语音都能查。</p>
        </div>
        <img class="assistant-cover" src="assets/zhumen/service-album-corner.webp" alt="">
      </div>
      <section class="assistant-suggestions" aria-labelledby="assistant-suggestions-title">
        <h3 id="assistant-suggestions-title">试着问一句</h3>
        <div class="assistant-suggestion-list">${prompts}</div>
      </section>
    </section>`;
  }

  function view() {
    if (!P.Households.current()) {
      return `<div class="page family-assistant-page">
        ${emptyState('先创建或加入家庭', '建家或加入后，就能查询家人共享的记录。', '创建或切换家庭', 'house-switch')}
      </div>`;
    }
    const { questions, draft } = session();
    const sources = familySources();
    return `<div class="page family-assistant-page">
      ${questions.length
        ? `<ol class="assistant-turns" aria-label="家庭问答" role="log">${questions.map(question => turn(question, sources)).join('')}</ol>`
        : welcome(sources)}
      <form class="assistant-composer" id="${FORM_ID}" data-feature-form data-actor="${e(P.state.actor)}">
        <div class="assistant-input-row">
          <input name="question" aria-label="问一个关于家里的问题" placeholder="问问家里的记录" value="${e(draft)}" maxlength="${LIMIT}" enterkeyhint="send" required>
          <button type="submit" class="assistant-send">${i('send')}<span>发送</span></button>
        </div>
        <p class="assistant-form-error" role="alert"></p>
      </form>
    </div>`;
  }

  function active(element) {
    return P.state.route === ROUTE && P.Households.current() && element?.isConnected &&
      element.featureState === P.state && element.dataset.actor === P.state.actor;
  }

  function capture() {
    const form = document.getElementById(FORM_ID);
    if (active(form)) session().draft = form.elements.question.value;
  }

  /** 只对刚提交的回答逐步显示。切换页面或重绘后，旧节点失效并停止计时。 */
  function streamAnswer(answer) {
    if (!answer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const paragraph = answer.querySelector('p');
    const characters = Array.from(paragraph.textContent);
    const batchSize = Math.max(1, Math.ceil(characters.length / STREAM_MAX_STEPS));
    const scrollArea = document.getElementById('app-content');
    answer.setAttribute('aria-busy', 'true');
    paragraph.textContent = '';
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      if (!answer.isConnected) {
        window.clearInterval(timer);
        return;
      }
      // 正在回看前面的对话时，不把滚动位置拉回最新回答。
      const followAnswer = scrollArea.scrollHeight - scrollArea.clientHeight - scrollArea.scrollTop <= 16;
      const steps = Math.max(1, Math.floor((performance.now() - startedAt) / STREAM_INTERVAL_MS));
      const end = Math.min(characters.length, steps * batchSize);
      paragraph.textContent = characters.slice(0, end).join('');
      if (end === characters.length) {
        window.clearInterval(timer);
        answer.removeAttribute('aria-busy');
      }
      if (followAnswer) scrollArea.scrollTop = scrollArea.scrollHeight;
    }, STREAM_INTERVAL_MS);
  }

  function ask(value) {
    const form = document.getElementById(FORM_ID);
    if (!active(form)) return;
    const question = String(value || '').trim();
    if (!question || question.length > LIMIT) {
      form.querySelector('[role="alert"]').textContent = '请填写一个简短的问题。';
      return;
    }
    const editing = document.activeElement === form.elements.question;
    form.elements.question.value = '';
    session().questions.push(question);
    P.render();
    const latestTurn = document.querySelector('.assistant-turn:last-child');
    streamAnswer(latestTurn?.querySelector('.assistant-answer'));
    latestTurn?.scrollIntoView({ block: 'start' });
    if (editing) document.getElementById(FORM_ID)?.elements.question.focus({ preventScroll: true });
  }

  function submit(form) {
    if (form.id !== FORM_ID) return false;
    if (active(form)) ask(form.elements.question.value);
    return true;
  }

  function handleAction(action, element) {
    if (action !== 'assistant-ask') return false;
    if (active(element)) ask(element.dataset.question);
    return true;
  }

  P.views[ROUTE] = view;
  P.FamilyAssistant = { title: TITLE, capture, submit, handleAction };
}
