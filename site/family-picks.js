/** 优选使用示例商品演示分类浏览和商品详情，价格只用于原型展示。 */
'use strict';
{
  const P = window.App, { escape: e, icon: i, button: b, link: l } = P;
  const frameName = P.Households.addonOffer('frame').title;
  const ROUTE = 'house-picks';
  const GIFT_LABEL = '准备这份礼物';
  const CATEGORIES = [
    ['all', '全部'],
    ['kitchen', '餐厨'],
    ['home', '日用'],
    ['parents', '长辈之选']
  ];
  const PRODUCTS = [
    {
      id: 'parents-screen', category: 'parents', name: frameName, price: 699, photo: [2, 1],
      screenSize: '10.1 英寸',
      introRoute: 'house-screen-intro//addons'
    },
    {
      id: 'bath-slippers', category: 'parents', name: '防滑浴室拖鞋', price: 29, photo: [1, 1],
      spec: '36–44 码 · 鞋底带排水孔',
      detail: '给爸妈放一双在浴室门口，洗澡时换着穿。鞋底带排水孔和防滑纹。'
    },
    {
      id: 'dinner-set', category: 'kitchen', name: '陶瓷碗盘套装', price: 89, photo: [2, 0],
      spec: '8 件套 · 4 碗 4 盘',
      detail: '适合四口之家日常吃饭。碗和盘可以各自叠起来，收进橱柜少占地方。'
    },
    {
      id: 'glass-containers', category: 'kitchen', name: '玻璃保鲜盒', price: 49, photo: [0, 0],
      spec: '3 件套 · 卡扣密封盖',
      detail: '装切好的水果或没吃完的菜。三种大小可以分开用，收进冰箱也能叠放。'
    },
    {
      id: 'cotton-towels', category: 'home', name: '全棉洗脸毛巾', price: 39, photo: [1, 0],
      spec: '3 条装 · 34 × 75 厘米',
      detail: '洗脸或擦手用。三条不同颜色，家里可以一人用一条，挂在一起也容易分清。'
    },
    {
      id: 'kids-bottle', category: 'home', name: '儿童吸管水杯', price: 59, photo: [0, 1],
      spec: '450 mL · 带肩带',
      detail: '上学、去公园都能带。掀开杯盖就能用吸管喝水，肩带可以调长短。'
    }
  ];

  /** 同一张商品图按格定位，列表和详情共用素材。 */
  function photo(product) {
    const [column, row] = product.photo;
    return `<span class="picks-photo" style="--picks-photo-position:${column * 50}% ${row * 100}%" aria-hidden="true"></span>`;
  }

  function price(product) {
    return `<span class="picks-price"><span>¥</span>${product.price}</span>`;
  }

  function mountedPhoto(product) {
    return `<span class="photo-mount">${photo(product)}</span>`;
  }

  function productSpread(product) {
    return `${mountedPhoto(product)}<span class="picks-feature-label">
      <strong class="picks-feature-title">${e(product.name)}</strong>
      <small class="picks-feature-link">查看详情 ${i('arrow')}</small>
    </span>`;
  }

  function featuredGift(product) {
    // 备礼需要当前家庭的相册。未建家时仍可浏览相框规格和演示价。
    const prepare = P.Households.current()
      ? l(GIFT_LABEL + i('arrow'), 'house-screen//gift/house-picks', 'btn compact')
      : '';
    const details = b(productSpread(product), 'picks-product', 'picks-feature-spread picks-gift-product',
      `data-product="${e(product.id)}" aria-label="查看${e(product.name)}详情"`);
    return `<article class="paper-card bound-paper picks-feature picks-gift">
      ${details}
      <div class="picks-gift-info">
        <p class="picks-gift-package">相框礼盒 · ${e(product.screenSize)} · 含基础家庭空间</p>
        <p class="picks-gift-description">提前装好照片和祝福，送到手就能看。家人也能继续添照片。</p>
      </div>
      <div class="picks-gift-footer">
        <div class="picks-detail-price picks-gift-price">${price(product)}<small>演示价</small></div>${prepare}
      </div>
    </article>`;
  }

  function featuredProduct(product) {
    if (product.introRoute) return featuredGift(product);
    return b(`<span class="picks-feature-spread">${productSpread(product)}</span>
    <span class="picks-feature-caption">
      <small class="picks-feature-spec">${e(product.spec)}</small>
      <span class="picks-feature-detail">${price(product)}<small>演示价</small></span>
    </span>`, 'picks-product', 'paper-card bound-paper picks-feature',
    `data-product="${e(product.id)}" aria-label="${e(product.name)}，${product.price} 元，查看详情"`);
  }

  function thumbnail(product, current) {
    return b(`${mountedPhoto(product)}<strong>${e(product.name)}</strong>`, 'picks-select', 'picks-thumbnail',
      `data-product="${e(product.id)}" aria-pressed="${product.id === current}"`);
  }

  function visibleProducts(category = P.state.picksCategory || 'all') {
    return PRODUCTS.filter(product => category === 'all' || product.category === category);
  }

  function view() {
    const selected = P.state.picksCategory || 'all';
    const categories = CATEGORIES.map(([id, label]) =>
      b(e(label), 'picks-category', 'picks-category', `data-category="${id}" aria-pressed="${selected === id}"`)).join('');
    const visible = visibleProducts(selected);
    // 当前商品不在所选分类时，册页展示该分类的第一件商品。
    const featured = visible.find(product => product.id === P.state.picksProduct) || visible[0];
    return `<div class="page family-picks-page">
      <div class="picks-categories" role="group" aria-label="商品分类">${categories}</div>
      ${featured ? `<section class="picks-gallery" aria-label="商品浏览">
        ${featuredProduct(featured)}
        <h2 class="picks-heading" id="picks-thumbnails-title">选看商品</h2>
        <div class="picks-thumbnails" role="group" aria-labelledby="picks-thumbnails-title">
          ${visible.map(product => thumbnail(product, featured.id)).join('')}
        </div>
      </section>` : ''}
    </div>`;
  }

  function openProduct(product) {
    if (product.introRoute) {
      P.navigate(product.introRoute);
      return;
    }
    P.modal(product.name, `<div class="picks-detail">
      ${photo(product)}
      <div class="picks-detail-price">${price(product)}<small>演示价</small></div>
      <p class="picks-detail-spec">${e(product.spec)}</p>
      <p>${e(product.detail)}${product.detailEmphasis ? `<strong class="text-emphasis"></strong>` : ''}</p>
    </div>`, 'sheet');
  }

  function handleAction(action, element) {
    if (P.state.route !== ROUTE) return false;
    if (action === 'picks-category') {
      const category = element.dataset.category;
      if (CATEGORIES.some(([id]) => id === category)) {
        P.state.picksCategory = category;
        P.render();
        document.querySelector(`[data-action="picks-category"][data-category="${category}"]`)?.focus({ preventScroll: true });
      }
      return true;
    }
    if (action === 'picks-select') {
      const id = element.dataset.product;
      if (element.getAttribute('aria-pressed') !== 'true' && visibleProducts().some(product => product.id === id)) {
        P.state.picksProduct = id;
        P.render();
        document.getElementById('app-content').scrollTop = 0;
        document.querySelector('.picks-gallery [data-action="picks-product"]')?.focus({ preventScroll: true });
      }
      return true;
    }
    if (action !== 'picks-product') return false;
    const product = PRODUCTS.find(item => item.id === element.dataset.product);
    if (product) openProduct(product);
    return true;
  }

  P.views[ROUTE] = view;
  P.FamilyPicks = { handleAction };
}
