/** 家史、人物志和传家定制共用制作介绍，咨询继续走原定制服务单。 */
'use strict';
{
  const P = window.App;
  const {button: b, escape: e, icon: i} = P;
  const content = document.getElementById('app-content');
  const products = {
    'house-book-intro': {
      key: 'book',
      heading: ['把一家人的往事，', '做成一本书'],
      description: '选出想留给家人的往事和照片，编辑协助整理、排版，确认样书后再印制。',
      preview: P.HistoryBookSamples.shelf(),
      jump: '看看怎么成书',
      steps: [
        ['选材与排版', '由资料本人选出可以入书的文字与照片，编辑整理书稿。'],
        ['核对校样和样书', '先看排版校样，再核对一册实物样书。'],
        ['印制与寄送', '确认样书和印制要求后，再安排印制与寄送。']
      ],
      returnLabel: '返回纸书介绍'
    },
    'house-film-intro': {
      key: 'film',
      heading: ['把家人的讲述，', '拍成一部片'],
      description: '顾问与家人约定采访，整理经本人同意使用的老照片和影像，把讲述剪进一部家庭影片。',
      preview: `<figure class="history-service-preview history-film-sample">
        <video width="768" height="432" controls playsinline controlslist="nofullscreen" preload="none"
          poster="assets/family-home/history-service-sample-poster.webp" aria-label="家庭影片示例《那张靠窗的书桌》">
          <source src="assets/family-home/history-service-sample.mp4" type="video/mp4">
        </video>
        <figcaption><strong>《那张靠窗的书桌》</strong><span>虚构示例 · 合成旁白</span></figcaption>
      </figure>`,
      jump: '看看怎么拍摄',
      steps: [
        ['确认采访安排', '先和顾问沟通拍摄对象、地点和故事，由拍摄对象本人确认资料使用范围。'],
        ['采集素材与核对样片', '采集采访和获准使用的照片、影像，制作样片供本人核对。'],
        ['验收与回看', '样片通过后制作成片，验收后可在人物档案中回看。']
      ],
      returnLabel: '返回影片介绍'

    }
  };

  function has(route) {
    return Object.hasOwn(products, route);
  }

  function title(route) {
    return P.Households.addonOffer(products[route].key).title;
  }

  function stopPlayback() {
    content.querySelector('.history-film-sample video')?.pause();
  }

  function view(product) {
    const item = P.Households.addonOffer(product.key);
    // 家史和人物志按当前人物查找成片，通用定制目录按登录人查找，再统一检查查看权限。
    const person = product.key === 'film'
      ? (P.state.serviceIntroFromCatalog ? P.state.actor : P.state.homeReaderPerson)
      : '';
    const delivered = person ? P.Households.filmAccessControls(person, 'paper-link paper-outline history-service-button') : '';
    const consult = b(e(item.ask), 'house-addon-open', 'paper-link paper-outline history-service-button',
      `data-id="${product.key}" data-person="${e(person)}" data-return="${e(product.returnLabel)}" data-customization-request data-customization-direct aria-haspopup="dialog"`);
    return `<article class="history-service-intro" aria-labelledby="history-service-title">
      <header class="history-service-hero">
        <h1 id="history-service-title" tabindex="-1">${product.heading.map(line => `<span>${e(line)}</span>`).join(' ')}</h1>
        <p>${e(product.description)}</p>
        ${product.preview}
        ${delivered}
        <button type="button" class="paper-link paper-outline history-service-button" data-intro-scroll="history-service-process">
          ${e(product.jump)} ${i('down')}
        </button>
      </header>
      <section class="history-service-section" aria-labelledby="history-service-process">
        <h2 id="history-service-process" tabindex="-1">制作流程</h2>
        <ol class="history-service-steps">
          ${product.steps.map(([heading, text]) => `<li><h3>${e(heading)}</h3><p>${e(text)}</p></li>`).join('')}
        </ol>
      </section>
      <section class="history-service-section" aria-labelledby="history-service-price">
        <h2 id="history-service-price">报价与咨询</h2>
        <div class="history-service-quote">
          <strong>${e(item.price)}</strong>
          <p>按项付费。家庭无需开通会员即可咨询，收到报价后再决定。</p>
          ${consult}
        </div>
      </section>
    </article>`;
  }

  // 产品介绍共用手机内的锚点滚动，查看流程时保留当前路由和返回位置。
  content.addEventListener('click', event => {
    const trigger = event.target.closest('[data-intro-scroll]');
    if (!trigger) return;
    const heading = document.getElementById(trigger.dataset.introScroll);
    const section = heading?.closest('section');
    if (!section || !content.contains(section)) return;
    const top = content.scrollTop + section.getBoundingClientRect().top - content.getBoundingClientRect().top;
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    content.scrollTo({top, behavior});
    heading.focus({preventScroll: true});
  });

  for (const [route, product] of Object.entries(products)) P.views[route] = () => view(product);
  P.HistoryServiceIntro = {has, title, stopPlayback};
}
