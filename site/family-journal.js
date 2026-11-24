/** 家庭相册、家事与姓源的阅读视图。相册和日记按页浏览。 */
'use strict';
{
  const P = window.App;
  const { escape: e, icon: i, button: b, link: l } = P;
  const PHOTOS_PER_PAGE = 2;
  const DIARY_PREVIEW_ROWS = 3;
  let diaryListObserver;
  let diaryListLayout;

  function familyName() {
    return P.Households.isExample() ? P.FamilyHome.ensure().family.name : P.Households.current()?.name || '我家';
  }

  function seal() {
    const surname = P.Households.current()?.seal;
    return surname ? `<span class="family-seal" aria-hidden="true">${e(surname)}</span>` : '';
  }

  function paperLink(label, route) {
    return l(label + ' ' + i('arrow'), route, 'paper-link');
  }

  function media(cover, alt, lazy = true) {
    if (cover) return '<img src="' + e(cover) + '" alt="' + e(alt) + '"' + (lazy ? ' loading="lazy"' : '') + ' draggable="false">';
    return i('photo');
  }

  function photoEntries() {
    return P.Households.sharedFamilyEntries().filter(({ item, kind, material }) =>
      kind === 'photo' && (material ? item.poster : item.houseImage));
  }

  function photoCover({ item, material }) {
    return material ? item.poster : item.houseImage;
  }

  function albumPhotoContent(entry) {
    return `<span class="photo-mount">${media(photoCover(entry), '')}</span>
      <span class="album-photo-caption">${e(entry.item.title)}</span>`;
  }

  function photoCard(entry) {
    const { item } = entry;
    return b(albumPhotoContent(entry), 'family-album-photo', 'album-photo',
      'data-id="' + e(item.id) + '" data-source="' + (entry.material ? 'archive' : 'story') + '" aria-label="查看照片 ' + e(item.title) + '"');
  }

  function albumPreview() {
    const photos = photoEntries().slice(0, PHOTOS_PER_PAGE);
    const previews = photos.map(entry => `<span class="album-photo">${albumPhotoContent(entry)}</span>`).join('');
    const cover = `<span class="bound-paper album-preview">
      <strong class="album-preview-title">${e(familyName())}相册 ${seal()}</strong>
      ${previews ? `<span class="album-preview-photos">${previews}</span>` :
        '<span class="home-section-empty">家里还没有共享的照片。</span>'}
      <span class="album-preview-caption">翻开相册 ${i('arrow')}</span>
    </span>`;
    return `<section data-home-section="album" aria-labelledby="home-album-title">
      <div class="section-heading home-section-heading"><h2 id="home-album-title">留影</h2></div>
      ${l(cover, 'home-album', 'album-preview-open', 'aria-label="翻开相册"')}
    </section>`;
  }

  function turnPages({ previous, next, position, previousLabel = '上一页', nextLabel = '下一页' }) {
    const turn = (route, label, icon, side) => {
      const text = icon === 'back' ? i(icon) + label : label + i(icon);
      const cls = 'paper-link paper-turn-' + side;
      return route ? l(text, e(route), cls, `data-paper-turn="${side}"`) :
        `<span class="${cls}" aria-hidden="true">${text}</span>`;
    };
    return `<nav class="paper-pagination" aria-label="翻页">
      ${turn(previous, previousLabel, 'back', 'previous')}
      <span class="paper-position" aria-label="第 ${e(position.replace(' / ', ' 页，共 '))} 页">${e(position)}</span>
      ${turn(next, nextLabel, 'arrow', 'next')}
    </nav>`;
  }

  function album() {
    const photos = photoEntries();
    const total = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE));
    const requested = Number(P.state.homeAlbumPage);
    const page = Number.isInteger(requested) ? Math.max(1, Math.min(requested, total)) : 1;
    const pagePhotos = photos.slice((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE);
    const hint = page < total ? '向左滑，翻到下一页' : '向右滑，翻回上一页';
    return `<section class="bound-paper journal-sheet family-album" aria-labelledby="family-album-title"
      tabindex="-1" data-album-page="${page}" data-paper-swipe>
      <div class="album-deck">
        <div class="album-leaf">
          <header class="journal-heading-row"><h1 id="family-album-title">${e(familyName())}相册 ${seal()}</h1>
          </header>
          ${photos.length ? `<div class="family-album-photos">${pagePhotos.map(photoCard).join('')}</div>
            ${total > 1 ? turnPages({ previous: page > 1 && 'home-album/' + (page - 1), next: page < total && 'home-album/' + (page + 1), position: page + ' / ' + total }) +
              `<p class="paper-swipe-hint">${hint}</p>` : ''}` :
            '<p class="home-section-empty">家里还没有共享的照片。</p>'}
        </div>
      </div>
    </section>`;
  }

  /** 每次打开照片重新按当前家庭与账号检查访问范围，册页只负责浏览。 */
  function openPhoto(element) {
    const entry = photoEntries().find(({ item, material }) =>
      item.id === element.dataset.id && (material ? 'archive' : 'story') === element.dataset.source);
    if (!entry || P.state.route !== 'home-album') return;
    const { item, material } = entry;
    const date = item.photoYear ? '约 ' + item.photoYear + ' 年' : item.date || '';
    const route = (material ? 'archive-item/' : 'story/') + item.id;
    const send = P.HouseScreen.photoButton(item, { fromAlbum: true });
    P.modal(item.title, `<figure class="album-print">
      <div class="album-print-media">${media(item.photoPrint || photoCover(entry), item.title, false)}</div>
      <figcaption><strong>${e(item.title)}</strong>${date ? `<span>${e(date)}</span>` : ''}
        ${send ? `<div class="album-print-actions">${send}</div>` : ''}
      </figcaption>
      </figure>${paperLink('查看原记录', e(route))}`, 'photo-print', undefined, { closeLabel: '关闭照片' });
  }

  function diaryEntries(author = '') {
    return P.Households.sharedFamilyEntries().filter(({ item, material }) =>
      !material && item.fromFamily && !item.coupleId && (!author || item.author === author))
      .sort(({ item: first }, { item: second }) => diaryDate(second).order - diaryDate(first).order);
  }

  function diaryListRoute(page, author) {
    if (author) return 'home-diary/' + page + '/' + e(author);
    return page > 1 ? 'home-diary/' + page : 'home-diary';
  }

  function diaryStoryRoute(item, author) {
    const route = 'story/' + e(item.id) + '/diary';
    return author ? route + '/' + e(author) : route;
  }

  function diaryBook(part, number, leaf) {
    return `<div class="diary-book" tabindex="-1" role="group" aria-label="家庭日记"
      data-diary-part="${part}" data-diary-page="${number}" data-paper-swipe>${leaf}</div>`;
  }

  function diarySwipeHint(next, nextLabel, previousLabel) {
    const hint = next ? '向左滑，翻到' + nextLabel : '向右滑，翻回' + previousLabel;
    return `<p class="paper-swipe-hint">${hint}</p>`;
  }

  /** 详情翻篇与返回列表使用同一筛选，旧链接与不匹配的筛选链接沿用全家日记排序。 */
  function diaryStoryContext(id) {
    const author = P.state.homeDiaryAuthor;
    if (author) {
      const entries = diaryEntries(author);
      if (entries.some(({ item }) => item.id === id)) return { entries, author };
    }
    return { entries: diaryEntries(), author: '' };
  }

  function diaryStoryPage(item) {
    const { entries, author } = diaryStoryContext(item.id);
    const index = entries.findIndex(entry => entry.item.id === item.id);
    const number = index + 1;
    const previous = number > 1 && diaryStoryRoute(entries[index - 1].item, author);
    const next = number > 0 && number < entries.length && diaryStoryRoute(entries[index + 1].item, author);
    const navigation = previous || next
      ? turnPages({ previous, next, position: number + ' / ' + entries.length, previousLabel: '上一篇', nextLabel: '下一篇' }) +
        diarySwipeHint(next, '下一篇', '上一篇')
      : '';
    return { number, navigation };
  }

  function diaryListFor(id) {
    const { entries, author } = diaryStoryContext(id);
    if (!entries.some(({ item }) => item.id === id)) return diaryListRoute(1, author);
    const layout = diaryListLayout;
    if (layout?.workspace === P.state && layout.actor === P.state.actor && layout.author === author &&
        layout.frame === diaryFrame() && layout.ids.length === entries.length &&
        layout.ids.every((itemId, index) => itemId === entries[index].item.id)) {
      return diaryListRoute(diaryPageForStory(layout.pages, id), author);
    }
    // 直达详情或浏览尺寸已改变时，交由列表按篇目定位新页码。
    return 'home-diary//' + e(author) + '/' + e(id);
  }

  /** 日记按记录时间分月，照片拍摄年代仍由详情单独显示。 */
  function diaryDate(item) {
    const recorded = item.recorded?.match(/^(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
    if (!recorded) return { month: '日期待补充', day: item.recorded || item.date || '', order: item.recordedAt || 0 };
    const [, year, month, day] = recorded;
    return {
      month: year + ' 年 ' + Number(month) + ' 月',
      day: Number(month) + '月' + Number(day) + '日',
      order: item.recordedAt || Date.UTC(Number(year), Number(month) - 1, Number(day))
    };
  }

  function diaryByline(item) {
    return (item.authorName || P.PEOPLE[item.author]?.short || P.PEOPLE[item.author]?.name || '家人') + '记';
  }

  function diaryRow({ item }, { latest = false, excerpt = false, author, measure = false } = {}) {
    const date = diaryDate(item).day;
    const latestLabel = latest ? '<span class="journal-latest">最新</span> ' : '';
    const meta = `<small>${excerpt ? '' : latestLabel}${e(date ? date + ' · ' : '')}${e(diaryByline(item))}</small>`;
    const previewText = excerpt && latest && item.text?.[0];
    const copy = `<span class="journal-row-copy">
      ${excerpt ? '' : meta}
      <strong>${excerpt ? latestLabel : ''}${e(item.title)}</strong>
      ${excerpt ? meta : ''}
      ${previewText ? `<span class="journal-excerpt">${e(previewText)}</span>` : ''}
    </span>`;
    const thumbnail = measure ? '' : item.houseImage ? media(item.houseImage, '') : i('notebook');
    const thumb = `<span class="journal-row-thumb">${thumbnail}</span>`;
    const route = measure ? '' : diaryStoryRoute(item, author);
    return l(copy + thumb + i('arrow'), route, 'journal-row', `data-diary-id="${e(item.id)}"`);
  }

  function diaryPreview() {
    const entries = diaryEntries().slice(0, DIARY_PREVIEW_ROWS);
    return `<section data-home-section="activity" aria-labelledby="home-diary-title">
      <div class="section-heading home-section-heading"><h2 id="home-diary-title">家事</h2></div>
      <div class="bound-paper diary-preview">
        <h3>${e(familyName())}日记 ${seal()}</h3>
        ${entries.length ? `<p class="journal-divider">最近更新 · ${e(diaryDate(entries[0].item).day)}</p>
          ${entries.map((entry, index) => diaryRow(entry, { latest: index === 0, excerpt: true })).join('')}` :
          '<p class="home-section-empty">家里还没有新的共享记录。</p>'}
        ${paperLink('翻开家庭日记', 'home-diary')}
      </div>
    </section>`;
  }

  function diaryAuthorFilter(author) {
    const options = P.Households.memberIds().map(id =>
      `<option value="${e(id)}"${id === author ? ' selected' : ''}>${e(P.PEOPLE[id].name)}</option>`);
    return `<label class="diary-author-filter"><span>记录人</span>
      <span class="diary-author-choice">
        <select id="diary-author"><option value="">全部家人</option>${options.join('')}</select>${i('down')}
      </span>
    </label>`;
  }

  function diaryMonths(pageEntries, { author, latest, measure = false }) {
    const months = new Map();
    for (const entry of pageEntries) {
      const { month } = diaryDate(entry.item);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(entry);
    }
    return Array.from(months, ([month, rows]) => `<section class="journal-month" data-diary-month="${e(month)}">
      <h2 class="journal-divider">${e(month)}</h2>
      ${rows.map(entry => diaryRow(entry, { author, latest: entry === latest, measure })).join('')}
    </section>`).join('');
  }

  function diary() {
    const author = P.state.homeDiaryAuthor;
    return diaryBook('list', 1, `<section class="bound-paper journal-sheet family-diary diary-leaf"
      aria-labelledby="family-diary-title" data-diary-author="${e(author)}">
      <h1 id="family-diary-title">${e(familyName())}日记 ${seal()}</h1>
      ${diaryAuthorFilter(author)}
      <div class="diary-list-entries">
        <div class="diary-list-rows"></div>
        <div class="diary-list-measurement" aria-hidden="true" inert><div></div></div>
      </div>
      <div class="diary-list-pagination"></div>
    </section>`);
  }

  function diaryFrame() {
    const phone = document.getElementById('phone');
    return [phone.clientWidth, phone.clientHeight, window.innerHeight, P.state.fontLarge].join('/');
  }

  function diaryPageForStory(pages, id) {
    return pages.findIndex(page => page.some(({ item }) => item.id === id)) + 1;
  }

  /** 使用排版高度，避免纸页翻转时的透视影响分页。 */
  function diaryBlockSize(element) {
    return Number.parseFloat(getComputedStyle(element).blockSize);
  }

  /** 每页重算月标题的空间，按顺序纳入能放下的条目。至少保留一条完整记录。 */
  function paginateDiary(entries, measurement, available) {
    const rowHeights = new Map();
    const monthHeights = new Map();
    let monthGap = 0;
    for (const group of measurement.children) {
      let rowsHeight = 0;
      for (const row of group.querySelectorAll('.journal-row')) {
        const height = diaryBlockSize(row);
        rowHeights.set(row.dataset.diaryId, height);
        rowsHeight += height;
      }
      monthHeights.set(group.dataset.diaryMonth, diaryBlockSize(group) - rowsHeight);
      monthGap = Math.max(monthGap, Number.parseFloat(getComputedStyle(group).marginBlockStart) || 0);
    }

    let page = [];
    const pages = [page];
    const months = new Set();
    let occupied = 0;
    for (const entry of entries) {
      const { month } = diaryDate(entry.item);
      const rowHeight = rowHeights.get(entry.item.id);
      const monthHeight = monthHeights.get(month);
      let height = rowHeight;
      if (!months.has(month)) height += monthHeight + (months.size ? monthGap : 0);
      if (page.length && occupied + height > available) {
        page = [];
        pages.push(page);
        months.clear();
        occupied = 0;
        height = rowHeight + monthHeight;
      }
      page.push(entry);
      months.add(month);
      occupied += height;
    }
    return pages;
  }

  function mountDiaryList(content, book, sheet) {
    const author = P.state.homeDiaryAuthor;
    const entries = diaryEntries(author);
    const ids = entries.map(({ item }) => item.id);
    const list = sheet.querySelector('.diary-list-entries');
    const rows = list.querySelector('.diary-list-rows');
    const measurement = list.querySelector('.diary-list-measurement > div');
    const pagination = sheet.querySelector('.diary-list-pagination');
    measurement.innerHTML = diaryMonths(entries, { author, latest: entries[0], measure: true });
    let anchor = P.state.homeDiaryAnchor;
    const requested = Number(P.state.homeDiaryPage);
    let renderedPage;

    function layout() {
      const margins = getComputedStyle(book);
      const chrome = diaryBlockSize(sheet) - diaryBlockSize(list) +
        Number.parseFloat(margins.marginBlockStart) + Number.parseFloat(margins.marginBlockEnd);
      const pages = paginateDiary(entries, measurement, diaryBlockSize(content) - chrome);
      const total = pages.length;
      const requestedPage = Number.isInteger(requested) ? Math.min(total, Math.max(1, requested)) : 1;
      const page = diaryPageForStory(pages, anchor) || requestedPage;
      const current = pages[page - 1];
      anchor = current.some(({ item }) => item.id === anchor) ? anchor : current[0]?.item.id;
      diaryListLayout = { workspace: P.state, actor: P.state.actor, author, frame: diaryFrame(), ids, pages };
      const pageKey = JSON.stringify([page, total, current.map(({ item }) => item.id)]);
      if (pageKey === renderedPage) return;
      renderedPage = pageKey;
      const emptyMessage = author ? '这位家人还没有可查看的日记。' : '家里还没有新的共享记录。';
      const focused = document.activeElement;
      rows.innerHTML = diaryMonths(current, { author, latest: entries[0] }) || `<p class="home-section-empty">${emptyMessage}</p>`;
      pagination.innerHTML = total > 1 ? turnPages({ previous: page > 1 && diaryListRoute(page - 1, author),
        next: page < total && diaryListRoute(page + 1, author), position: page + ' / ' + total }) : '';
      if (focused && !focused.isConnected) book.focus({ preventScroll: true });
      book.dataset.diaryPage = String(page);
      P.replaceDiaryListRoute(diaryListRoute(page, author), anchor);
    }

    layout();
    const observer = new ResizeObserver(() => {
      if (book.isConnected) layout();
      else observer.disconnect();
    });
    observer.observe(content);
    observer.observe(measurement);
    diaryListObserver = observer;
  }

  function surnameFields(fields = [], extraClass = '') {
    if (!fields.length) return '';
    return `<dl class="surname-reader-fields${extraClass ? ' ' + extraClass : ''}">${fields.map(({ label, value, fullWidth }) =>
      `<div${fullWidth ? ' class="is-full"' : ''}><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`;
  }

  function surnamePopulation({ total, rank, regions } = {}) {
    // 合并人口与名次，只展示已有数字，避免缺项时出现空分隔符。
    const population = [total && `约 ${total}人`, rank && `全国第 ${rank}`].filter(Boolean).join(' · ');
    const fields = [
      { label: total ? '当代人口' : '人口排名', value: population, fullWidth: true },
      { label: '主要分布', value: regions?.join('、'), fullWidth: true }
    ].filter(field => field.value);
    if (!fields.length) return '';
    return `<section class="surname-reader-population" aria-labelledby="surname-population-title">
      <h2 id="surname-population-title" class="surname-reader-section-title">人口参考</h2>
      ${surnameFields(fields)}
    </section>`;
  }

  /** 每条源流独立展示，不用固定步骤或数量推断其他支系。 */
  function surnameOrigin(origins = []) {
    if (!origins.length) return '';
    return `<details class="surname-reader-origin" open>
      <summary class="surname-reader-section-title">阅读姓氏源流 ${i('down')}</summary>
      <ul class="surname-reader-entries" role="list">
        ${origins.map(({ title, tags, text }) => `<li class="surname-reader-entry">
          <h2>${e(title)}</h2>
          ${tags?.length ? `<p class="surname-reader-meta surname-reader-entry-context">${e(tags.join(' · '))}</p>` : ''}
          <p class="surname-reader-text">${e(text)}</p>
        </li>`).join('')}
      </ul>
    </details>`;
  }

  /** 没有条目的字段不占位，标题仅列出当前姓氏已有的类目。 */
  function surnameCulture({ regions, hallNames, ancestralHalls } = {}) {
    const groups = [
      { label: '郡望', items: regions },
      { label: '堂号', items: hallNames },
      { label: '祠堂', items: ancestralHalls }
    ].filter(group => group.items?.length);
    if (!groups.length) return '';

    const labels = groups.map(group => group.label);
    const lastLabel = labels.pop();
    const title = labels.length ? labels.join('、') + '与' + lastLabel : lastLabel;
    return `<details class="surname-reader-culture" open>
      <summary class="surname-reader-section-title">${e(title)} ${i('down')}</summary>
      <dl class="surname-reader-culture-list">
        ${groups.map(({ label, items }) => `<div>
          <dt>${e(label)}</dt>
          <dd><ul class="surname-reader-culture-items" role="list">
            ${items.map(({ name, context }) => `<li>
              <div class="surname-reader-culture-name">
                <strong>${e(name)}</strong>
                ${context ? `<span>${e(context)}</span>` : ''}
              </div>
            </li>`).join('')}
          </ul></dd>
        </div>`).join('')}
      </dl>
    </details>`;
  }

  function surname() {
    const person = P.state.homeReaderPerson;
    const details = P.FamilyHome.surnameDetails(person);
    if (!details) {
      return '<article class="paper-card journal-sheet surname-reader surname-reader-public"><p class="surname-reader-text">姓源待整理。</p></article>';
    }
    const { name, culture, record } = details;
    const { spelling, facts, population, origins, traditions } = culture || {};
    const title = name ? `${name}姓的来历` : '姓氏来历';
    const nameLength = name ? [...name].length : 0;
    const showGlyph = nameLength > 0 && nameLength <= 2;
    const intro = culture?.intro || culture?.text;
    // 没有公共条目时，仍可从现有入口阅读已发布的姓源正文。
    const familyText = !culture && record?.text;
    return `<article class="paper-card journal-sheet surname-reader surname-reader-public">
      <header class="surname-reader-heading">
        ${showGlyph ? `<span class="surname-reader-glyph${nameLength === 2 ? ' is-compound' : ''}" aria-hidden="true">${e(name)}</span>` : ''}
        <div>
          <p class="surname-reader-meta">公开姓氏资料</p>
          <h1>${e(title)} ${showGlyph
            ? `<span class="family-seal surname-reader-character${nameLength === 2 ? ' is-compound' : ''}" aria-hidden="true">${e(name)}</span>` : ''}</h1>
          ${spelling?.pinyin || spelling?.traditional ? `<p class="surname-reader-pronunciation">
            ${spelling.pinyin ? `<span lang="zh-Latn">${e(spelling.pinyin)}</span>` : ''}
            ${spelling.traditional ? `<span>繁体「${e(spelling.traditional)}」</span>` : ''}
          </p>` : ''}
        </div>
      </header>
      ${intro ? `<p class="surname-reader-intro surname-reader-text">${e(intro)}</p>` : ''}
      ${surnameFields(facts, 'surname-reader-facts')}
      ${surnamePopulation(population)}
      ${surnameOrigin(origins)}
      ${surnameCulture(traditions)}
      ${culture ? '' : '<p class="surname-reader-empty">公开姓氏资料待整理。</p>'}
      ${familyText ? `<section class="surname-reader-entry">
        <h2>家人整理的姓源</h2>
        <p class="surname-reader-text">${e(familyText)}</p>
      </section>` : ''}
    </article>`;
  }

  function albumPage(content) {
    const book = content.querySelector('.family-album');
    if (!book) return null;
    return { book, number: Number(book.dataset.albumPage), leaf: book.querySelector('.album-leaf') };
  }

  /** 旧页在新页渲染后仅作装订处的动画叠层，交互始终由当前页接收。 */
  function animatePaperTurn(leaf, overlay, motion, kind) {
    const deck = leaf.parentElement;
    const motionAttribute = 'data-' + kind + '-motion';
    overlay.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    overlay.inert = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.add(kind + '-turn-overlay');
    deck.setAttribute(motionAttribute, motion);
    deck.append(overlay);
    const moving = motion === 'previous' ? leaf : overlay;
    const animations = moving.getAnimations?.() || [];
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      overlay.remove();
      deck.removeAttribute(motionAttribute);
    });
  }

  function showAlbumTurn(content, previousRoute, previousPage) {
    const current = albumPage(content);
    if (!current) return;
    current.book.focus({ preventScroll: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let motion;
    let overlay;
    if (previousRoute === 'home') {
      motion = 'open';
      overlay = document.createElement('div');
      overlay.className = 'album-opening-cover';
      overlay.innerHTML = `<div class="album-cover-title">${e(familyName())}相册 ${seal()}</div>`;
    } else if (previousPage && previousPage.number !== current.number) {
      motion = previousPage.number < current.number ? 'next' : 'previous';
      overlay = previousPage.leaf;
    } else {
      return;
    }

    animatePaperTurn(current.leaf, overlay, motion, 'album');
  }

  function diaryPage(content) {
    const book = content.querySelector('.diary-book');
    if (book) {
      const leaf = book.querySelector('.diary-leaf');
      return { book, part: book.dataset.diaryPart, number: Number(book.dataset.diaryPage),
        author: leaf.dataset.diaryAuthor, leaf };
    }
    const cover = content.querySelector('.diary-preview');
    return cover ? { part: 'cover', leaf: cover } : null;
  }

  function showDiaryTurn(content, previousPage) {
    const current = diaryPage(content);
    if (!current?.book) return;
    current.book.focus({ preventScroll: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 切换记录人时从筛选结果的第一页开始，无需翻页动画。
    if (current.part === 'list' && previousPage?.part === 'list' && current.author !== previousPage.author) return;

    // 从首页进入时翻开原封面，照片和摘要随封面一起转动。
    if (previousPage?.part === 'cover') {
      animatePaperTurn(current.leaf, previousPage.leaf, 'open', 'diary');
    } else if (previousPage && (previousPage.part !== current.part || previousPage.number !== current.number)) {
      const forward = previousPage.part === current.part ? previousPage.number < current.number : current.part === 'entry';
      previousPage.leaf.querySelectorAll('audio, video').forEach(media => media.pause());
      animatePaperTurn(current.leaf, previousPage.leaf, forward ? 'next' : 'previous', 'diary');
    }
  }

  /** 只有相册和日记使用横向翻页，纵向滑动继续滚动当页正文。 */
  function mount(content) {
    diaryListObserver?.disconnect();
    diaryListObserver = undefined;
    const paper = content.querySelector('.family-album[data-paper-swipe], .diary-book[data-paper-swipe]');
    if (!paper) return;
    const currentPage = paper.querySelector('.album-leaf, .diary-leaf') || paper;
    if (paper.dataset.diaryPart === 'list') mountDiaryList(content, paper, currentPage);
    currentPage.querySelector('#diary-author')?.addEventListener('change', event => {
      P.navigate(diaryListRoute(1, event.target.value), { replace: true });
      content.querySelector('#diary-author')?.focus({ preventScroll: true });
    });
    const editingControl = 'input, textarea, select, audio, video, [contenteditable]';
    function turn(side) {
      const route = currentPage.querySelector('[data-paper-turn="' + side + '"]')?.dataset.nav;
      if (route) P.navigate(route, { replace: true });
      return Boolean(route);
    }

    paper.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest(editingControl)) return;
      const side = { ArrowRight: 'next', ArrowLeft: 'previous' }[event.key];
      if (side && turn(side)) event.preventDefault();
    });

    let start;
    paper.addEventListener('touchstart', event => {
      start = event.touches.length === 1 && !event.target.closest(editingControl) ? event.touches[0] : null;
    }, { passive: true });
    paper.addEventListener('touchend', event => {
      if (!start || event.touches.length) return;
      const end = event.changedTouches[0];
      const deltaX = end.clientX - start.clientX;
      const deltaY = end.clientY - start.clientY;
      start = null;
      if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.4) return;
      // 横扫只翻页，触点结束时不再触发页内按钮。
      if (event.cancelable) event.preventDefault();
      turn(deltaX < 0 ? 'next' : 'previous');
    }, { passive: false });
    paper.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  }

  P.FamilyJournal = { familyName, seal, albumPreview, diaryPreview, diaryByline, openPhoto, mount,
    albumPage, showAlbumTurn, diaryBook, diaryStoryPage, diaryListFor, diaryPage, showDiaryTurn };
  Object.assign(P.views, { 'home-album': album, 'home-diary': diary, 'home-surname': surname });
}
