/** 传家相框介绍与备礼说明，咨询沿用已有服务单。 */
'use strict';
{
  const P = window.App;
  const {icon: i, link: l} = P;
  const frameName = P.Households.addonOffer('frame').title;
  const assets = 'assets/family-home/frame-intro/';
  const content = document.getElementById('app-content');
  let activeFilm;
  const filmObserver = new MutationObserver(() => {
    if (activeFilm && !activeFilm.isConnected) stopFilm();
  });

  function view() {
    const consult = P.Households.addonEntry('frame', `咨询${frameName}的试售价与配送`, {
      className: 'fm-button',
      returnLabel: `返回${frameName}介绍`
    });
    return `<article id="chuanjia-frame-mobile" class="fm-intro" aria-labelledby="fm-intro-title">
      <div class="fm-hero">
        <span class="fm-seal" aria-hidden="true">传</span>
        <h1 id="fm-intro-title">把今天的照片，<br>送到爸妈客厅</h1>
        <p class="fm-body">你在手机里添张近照，爸妈在${frameName}上就能看，还能给你回一句。</p>
        <figure>
          <div class="fm-photo" data-frame-intro-preview>
            <button type="button" class="fm-film-trigger" data-frame-intro-play
              aria-label="播放《第一个饺子》" aria-controls="fm-intro-film">
              <img width="870" height="580" src="${assets}first-dumpling-cover.webp" alt="">
              <span class="fm-film-play">${i('play')}</span>
            </button>
            <div id="fm-intro-film" class="fm-film-player" hidden>
              <video width="720" height="1280" controls playsinline controlslist="nofullscreen"
                preload="none" aria-label="《第一个饺子》家庭情景视频"></video>
              <button type="button" class="icon-button fm-film-close" aria-label="收起视频" data-frame-intro-film-close>${i('close')}</button>
              <p role="status" hidden>暂时无法播放，请收起后重试。</p>
            </div>
          </div>
          <figcaption class="fm-caption">《第一个饺子》 · 14 秒</figcaption>
        </figure>
        <button class="fm-button" type="button" data-frame-intro-gift data-intro-scroll="fm-gift-title">看看怎么送 ${i('down')}</button>
      </div>

      <section class="fm-section" aria-labelledby="fm-device-title">
        <p class="fm-section-label">爸妈在相框上</p>
        <h2 id="fm-device-title">新照片到了，<br>想说话就回一句</h2>
        <p class="fm-body">有新照时，爸妈点开就能看。听完你的留言，也可以在相框上直接回话。</p>
        <figure>
          <div class="fm-device">
            <img width="1050" height="668" src="${assets}new-photo.webp" alt="相框里显示一张拜年照片，旁边有听留言、喜欢这张和回一句三个按钮。">
          </div>
          <figcaption class="fm-device-actions">听留言　·　喜欢这张　·　回一句</figcaption>
        </figure>
      </section>

      <section class="fm-section fm-stories" aria-labelledby="fm-stories-title">
        <p class="fm-section-label">家人在手机里</p>
        <h2 id="fm-stories-title">爸妈说的话，<br>留在那张照片下</h2>
        <p class="fm-body">打开家庭相册，找到这张照片，就能回听爸妈当时说的话。</p>
        <figure class="fm-phone-example">
          <div class="fm-phone">
            <img width="420" height="732" src="${assets}photo-reply.webp" alt="家庭相册里爸爸第一天上班的旧照片，照片下方可以播放相框回话。">
          </div>
          <figcaption class="fm-phone-label">照片下回听</figcaption>
        </figure>
      </section>

      <section class="fm-section fm-gift" aria-labelledby="fm-gift-title">
        <p class="fm-section-label">送给爸妈的礼物</p>
        <h2 id="fm-gift-title" tabindex="-1">开机第一张，<br>是你挑的全家福</h2>
        <p class="fm-body">备礼时先选好开机照片，再留一句祝福。后来回了外地，也能继续给爸妈添照片。</p>
        <figure>
          <div class="fm-photo">
            <img width="870" height="580" src="${assets}gift.webp" alt="显示全家福的木相框，旁边是浅粉礼盒和祝福卡片。">
          </div>
          <figcaption class="fm-caption">礼盒外观示意</figcaption>
        </figure>

        <div class="fm-gift-offer">
          <div>
            <h3>${frameName}</h3>
            <p class="fm-terms">10.1 英寸 · 可预装照片与祝福</p>
          </div>
          <p class="fm-price">¥699 <small>/ 台 · 演示价</small></p>
        </div>

        <div class="fm-help">
          <details>
            <summary>收到以后，怎么给爸妈添照？ ${i('down')}</summary>
            <p>家人帮爸妈把相框连上家里的 Wi-Fi，再用手机绑定。此后家人从手机添的照片，就能显示在相框上。</p>
          </details>
          <details>
            <summary>需要先开会员吗？ ${i('down')}</summary>
            <p>新家庭有 1 GB 免费共享空间，可用来添照片、收回话。需要更多存储空间时，可以再选会员。</p>
          </details>
        </div>
        <div class="fm-consult">${consult}</div>
        ${P.Households.current() ? `<div class="fm-consult">${l('准备这份礼物' + i('arrow'), 'house-screen//gift/house-screen-intro', 'fm-button')}</div>
          <div class="fm-consult">${l(`体验${frameName} ` + i('arrow'), 'house-screen', 'fm-button')}</div>` : ''}
      </section>
    </article>`;
  }

  function stopFilm() {
    activeFilm.pause();
    activeFilm.removeAttribute('src');
    activeFilm.load();
    activeFilm = null;
    filmObserver.disconnect();
  }

  function openFilm(trigger) {
    const preview = trigger.closest('[data-frame-intro-preview]');
    const player = preview.querySelector('#fm-intro-film');
    const video = player.querySelector('video');
    const status = player.querySelector('[role="status"]');
    status.hidden = true;
    player.previewScrollTop = content.scrollTop;
    trigger.hidden = true;
    player.hidden = false;
    // 只滚动手机内容区，播放画面保留在原来的封面位置。
    const bounds = content.getBoundingClientRect();
    const overflow = preview.getBoundingClientRect().bottom - bounds.bottom;
    if (overflow > 0) content.scrollTop += overflow + 8;
    player.querySelector('[data-frame-intro-film-close]').focus({preventScroll: true});
    // 路由或字号重绘会移除播放器，及时释放正在播放的媒体。
    activeFilm = video;
    filmObserver.observe(content, {childList: true});
    video.src = assets + 'first-dumpling.mp4';
    video.play().catch(error => {
      if (video.isConnected && !player.hidden && error.name !== 'AbortError') status.hidden = false;
    });
  }

  content.addEventListener('click', event => {
    const playFilm = event.target.closest('[data-frame-intro-play]');
    if (playFilm) {
      openFilm(playFilm);
      return;
    }
    const closeFilm = event.target.closest('[data-frame-intro-film-close]');
    if (closeFilm) {
      const preview = closeFilm.closest('[data-frame-intro-preview]');
      const player = preview.querySelector('#fm-intro-film');
      const trigger = preview.querySelector('[data-frame-intro-play]');
      stopFilm();
      player.hidden = true;
      trigger.hidden = false;
      content.scrollTop = player.previewScrollTop;
      trigger.focus({preventScroll: true});
    }
  });

  P.views['house-screen-intro'] = view;
}
