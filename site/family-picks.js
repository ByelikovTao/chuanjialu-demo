/** 优选使用示例商品演示分类浏览和商品详情，价格只用于原型展示。 */
'use strict';
{
  const P = window.App, { escape: e, icon: i, button: b, link: l } = P;
  const ROUTE = 'house-picks';
  const CATEGORIES = [
    ['all', '全部'],
    ['kitchen', '厨房餐桌'],
    ['home', '居家日用'],
    ['parents', '爸妈好物']
  ];
  const PRODUCTS = [
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
      id: 'dinner-set', category: 'kitchen', name: '陶瓷碗盘套装', price: 89, photo: [2, 0],
      spec: '8 件套 · 4 碗 4 盘',
      detail: '适合四口之家日常吃饭。碗和盘可以各自叠起来，收进橱柜少占地方。'
    },
    {
      id: 'kids-bottle', category: 'home', name: '儿童吸管水杯', price: 59, photo: [0, 1],
      spec: '450 mL · 带肩带',
      detail: '上学、去公园都能带。掀开杯盖就能用吸管喝水，肩带可以调长短。'
    },
    {
      id: 'bath-slippers', category: 'parents', name: '防滑浴室拖鞋', price: 29, photo: [1, 1],
      spec: '36–44 码 · 鞋底带排水孔',
      detail: '给爸妈放一双在浴室门口，洗澡时换着穿。鞋底带排水孔和防滑纹。'
    },
    {
      id: 'parents-screen', category: 'parents', name: '爸妈大屏相框', price: 699, photo: [2, 1],
      spec: '10.1 英寸 · 手机投照片',
      detail: '孩子的近照、周末聚餐的合影，都可以用手机发到爸妈客厅的相框。爸妈看完可以点一下回语音。',
      demoRoute: 'house-screen', demoLabel: '查看大屏演示'
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

  function productCard(product) {
    return b(`${photo(product)}<span class="picks-product-info">
      <strong>${e(product.name)}</strong>
      <small>${e(product.spec)}</small>
      ${price(product)}
    </span>`, 'picks-product', 'picks-product', `data-product="${e(product.id)}" aria-label="${e(product.name)}，${product.price} 元，查看详情"`);
  }

  function view() {
    const selected = P.state.picksCategory || 'all';
    const categories = CATEGORIES.map(([id, label]) =>
      b(e(label), 'picks-category', 'picks-category', `data-category="${id}" aria-pressed="${selected === id}"`)).join('');
    const visible = PRODUCTS.filter(product => selected === 'all' || product.category === selected);
    return `<div class="page family-picks-page">
      <h2 class="picks-heading">家庭严选</h2>
      <div class="picks-categories" role="group" aria-label="商品分类">${categories}</div>
      <section class="picks-grid" aria-label="商品列表">${visible.map(productCard).join('')}</section>
    </div>`;
  }

  function openProduct(product) {
    const demo = product.demoRoute && P.Households.current()
      ? l(e(product.demoLabel) + i('arrow'), product.demoRoute, 'btn secondary full')
      : '';
    P.modal(product.name, `<div class="picks-detail">
      ${photo(product)}
      <div class="picks-detail-price">${price(product)}<small>演示价</small></div>
      <p class="picks-detail-spec">${e(product.spec)}</p>
      <p>${e(product.detail)}</p>
      ${demo}
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
    if (action !== 'picks-product') return false;
    const product = PRODUCTS.find(item => item.id === element.dataset.product);
    if (product) openProduct(product);
    return true;
  }

  P.views[ROUTE] = view;
  P.FamilyPicks = { handleAction };
}
