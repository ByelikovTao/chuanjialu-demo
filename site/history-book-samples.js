/** 介绍页样书使用固定的虚构内容，翻阅不接触家庭档案或制作订单。 */
'use strict';
{
  const P = window.App;
  const {escape: e, icon: i} = P;
  const dialog = document.getElementById('modal');
  const photoFolder = 'assets/family-home/reference/';
  const books = {
    oldHouse: {
      title: '老屋里的四事',
      category: '老宅往事',
      cover: 'assets/works/father-work-book-home.webp',
      pages: [
        {
          title: '那张靠窗的书桌',
          photo: 'assets/room.webp',
          caption: '老屋的窗边',
          paragraphs: ['小时候，我总在老屋的窗边写字。太阳一斜，桌角就亮起来。', '去外地工作前，我在这儿留了封信，告诉爸妈，我会常回来。']
        },
        {
          title: '去老屋的那条巷子',
          photo: photoFolder + 'old-lane.webp',
          caption: '老街的院门',
          paragraphs: ['放学拐进巷口，远远就能闻到家里飘出的饭香。', '有一回下大雨，我穿着湿鞋回来，奶奶把我的鞋放到了炉边。']
        }
      ]
    },
    everyday: {
      title: '把日子过成故事',
      category: '人生纪事',
      cover: 'assets/works/father-work-book-days.webp',
      pages: [
        {
          title: '等到第一笔订单',
          photo: 'assets/zhumen/story-oral-scene.webp',
          caption: '桌上的电话与簿子',
          paragraphs: ['电话挂断，我赶紧把第一笔订单写进簿子。数字不大，却让我踏实了不少。', '晚上回家，我把这页递给她看。她说，记得给自己煮碗面。']
        },
        {
          title: '搬进新家的第一顿饭',
          photo: photoFolder + 'first-meal.webp',
          caption: '两个人的小饭桌',
          paragraphs: ['那天家具还没摆齐，两个人只顾着先把饭煮上。', '后来桌子换了好几张，我们还能说出那天吃了什么。']
        }
      ]
    },
    reunion: {
      title: '我们的团圆日',
      category: '家庭相册',
      coverPhoto: photoFolder + 'family-reunion.webp',
      pages: [
        {
          title: '这一张全家福',
          photo: photoFolder + 'family-reunion.webp',
          caption: '春节午后的全家福',
          paragraphs: ['为了拍这张照片，爷爷特意把红包揣进兜里，等着给孩子一个惊喜。', '相机响完，孩子还是笑个不停。我们把那张笑得最乱的留了下来。']
        },
        {
          title: '厨房里包饺子',
          photo: photoFolder + 'making-dumplings.webp',
          caption: '年夜饭前一起包饺子',
          paragraphs: ['孩子第一次包饺子，捏了好几回才把边封住。', '下锅前，她把自己包的那只指给每个人看。']
        }
      ]
    }
  };

  function cover(book) {
    if (book.cover) return `<img src="${e(book.cover)}" loading="lazy" alt="${e('《' + book.title + '》成书封面')}">`;
    return `<span class="history-sample-photo-cover"><strong>${e(book.title)}</strong>
      <img src="${e(book.coverPhoto)}" loading="lazy" alt="春节团聚的全家福">
    </span>`;
  }

  function shelf() {
    return `<section class="history-book-shelf" aria-labelledby="history-book-shelf-title">
      <h2 id="history-book-shelf-title">成书示例</h2>
      <div class="history-book-shelf-list">
        ${Object.entries(books).map(([key, book]) => `<button type="button" class="history-book-shelf-entry"
          data-history-sample-open="${key}" aria-haspopup="dialog" aria-label="${e('翻看《' + book.title + '》')}">
          <span class="history-book-shelf-cover" aria-hidden="true">${cover(book)}</span>
          <strong>${e(book.title)}</strong>
          <span class="history-book-shelf-category">${e(book.category)}${i('arrow')}</span>
        </button>`).join('')}
      </div>
    </section>`;
  }

  function spread(page) {
    return `<div class="history-book-spread">
      <div class="history-book-spread-photo">
        <img src="${e(page.photo)}" alt="${e(page.caption + '，场景示意')}">
        <p>${e(page.caption)}</p>
      </div>
      <div class="history-book-spread-copy">
        <h3>${e(page.title)}</h3>
        ${page.paragraphs.map(text => `<p>${e(text)}</p>`).join('')}
      </div>
    </div>`;
  }

  function open(key) {
    if (!Object.hasOwn(books, key)) return;
    const book = books[key];
    P.modal(book.title, `<div class="history-sample-reader" data-history-sample-book="${key}" data-page="0">
      <div id="history-sample-reader-page" class="history-service-preview history-sample-reader-page" role="region" aria-label="样书内容" tabindex="0">
        ${cover(book)}
      </div>
      <nav class="history-sample-reader-controls" aria-label="翻阅样书">
        <button type="button" class="paper-link" data-history-sample-step="-1" aria-controls="history-sample-reader-page" disabled>${i('back')}上一页</button>
        <span data-history-sample-page-status aria-live="polite">封面 · 1 / ${book.pages.length + 1}</span>
        <button type="button" class="paper-link" data-history-sample-step="1" aria-controls="history-sample-reader-page">下一页${i('arrow')}</button>
      </nav>
    </div>`, 'sheet', undefined, {eyebrow: '纸质纪念书 · 虚构样书', closeLabel: '返回样书列表', familySheet: true});
    dialog.querySelector('[data-history-sample-step="1"]').focus({preventScroll: true});
  }

  document.getElementById('app-content').addEventListener('click', event => {
    const button = event.target.closest('[data-history-sample-open]');
    if (button) open(button.dataset.historySampleOpen);
  });

  dialog.addEventListener('click', event => {
    const button = event.target.closest('[data-history-sample-step]');
    const reader = button?.closest('[data-history-sample-book]');
    if (!reader || !dialog.open) return;
    const book = books[reader.dataset.historySampleBook];
    const index = Number(reader.dataset.page) + Number(button.dataset.historySampleStep);
    if (index < 0 || index > book.pages.length) return;

    const page = reader.querySelector('#history-sample-reader-page');
    page.innerHTML = index === 0 ? cover(book) : spread(book.pages[index - 1]);
    // 每次翻到新页从页首读起，按钮在可继续翻阅时保留焦点。
    page.scrollTop = 0;
    reader.dataset.page = String(index);
    const label = index === 0 ? '封面' : '内页';
    reader.querySelector('[data-history-sample-page-status]').textContent = `${label} · ${index + 1} / ${book.pages.length + 1}`;
    reader.querySelector('[data-history-sample-step="-1"]').disabled = index === 0;
    reader.querySelector('[data-history-sample-step="1"]').disabled = index === book.pages.length;
    if (button.disabled) page.focus({preventScroll: true});
  });

  P.HistoryBookSamples = {shelf};
}
