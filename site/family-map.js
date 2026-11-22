/** 家庭分布按最近登录城市聚合。本地原型只使用获准展示的示例城市。 */
'use strict';
{
  const P = window.App, { escape: e, button: b } = P;
  const MAP_BOUNDS = { west: 95, east: 132, south: -6, north: 70 };
  const LONGITUDE_SPAN = MAP_BOUNDS.east - MAP_BOUNDS.west;
  const LATITUDE_SPAN = MAP_BOUNDS.north - MAP_BOUNDS.south;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.5;
  const DETAIL_ZOOM = 1.75;
  const DRAG_THRESHOLD = 5;
  const VIEW_CENTER = { x: 0.5, y: 0.5 };
  const DEMO_CITIES = {
    guiyang: { name: '贵阳', longitude: 106.63, latitude: 26.65 },
    hangzhou: { name: '杭州', longitude: 120.15, latitude: 30.27 }
  };
  const DEMO_LOGIN_CITIES = { father: 'guiyang', xia: 'hangzhou', nian: 'hangzhou' };
  const PROVINCE_LABELS = [
    ['青海', 98.5, 35.5], ['甘肃', 103.5, 38.2], ['内蒙古', 114.2, 42.2],
    ['四川', 101, 31.2], ['云南', 99.1, 25.2]
  ];
  const SEA_LABELS = [['黄海', 124.2, 35.5], ['东海', 125.7, 27.3], ['南海', 115.2, 19.7]];
  const OVERVIEW_CITIES = [['北京', 116.3942, 39.9017], ['广州', 113.2618, 23.1247]];
  const DETAIL_CITIES = [
    ['兰州', 103.7901, 36.058], ['西安', 108.8931, 34.277], ['成都', 104.0681, 30.6719],
    ['重庆', 106.593, 29.5669], ['武汉', 114.2681, 30.582], ['长沙', 112.968, 28.2019],
    ['南京', 118.778, 32.052], ['上海', 121.4346, 31.2184], ['福州', 119.2981, 26.0819],
    ['昆明', 102.6974, 25.0429], ['南宁', 108.3181, 22.8219]
  ];

  function cityGroups() {
    const groups = new Map();
    if (!P.Households.isExample() || !P.FamilyHome.member()) return groups;
    for (const id of P.Households.memberIds()) {
      const city = DEMO_LOGIN_CITIES[id];
      // 待认领人物没有账号，也就没有可显示的登录城市。
      if (!city || !Object.hasOwn(P.state.accounts, id)) continue;
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city).push(id);
    }
    return groups;
  }

  /** 底图、地名和家人点位共用同一经纬度范围。 */
  function mapPosition(longitude, latitude) {
    const x = (longitude - MAP_BOUNDS.west) / LONGITUDE_SPAN * 100;
    const y = (MAP_BOUNDS.north - latitude) / LATITUDE_SPAN * 100;
    return `--map-point-x:${x}%;--map-point-y:${y}%`;
  }

  function placeLabel([name, longitude, latitude], classes) {
    return `<span class="home-map-place ${classes}" style="${mapPosition(longitude, latitude)}">${e(name)}</span>`;
  }

  /** 同城家人共用一个地理点位，各自可进入关联往事。 */
  function cityPin(key, members) {
    const { name, longitude, latitude } = DEMO_CITIES[key];
    const people = members.map(id => {
      const memberName = e(P.PEOPLE[id].name);
      return b(`${P.avatar(id, '', { originalPortrait: true })}<span class="home-map-member-name">${memberName}</span>`, 'house-story-person', 'home-map-member',
        `data-id="${e(id)}" aria-label="查看${memberName}的相关往事"`);
    }).join('');
    return `<div class="home-map-pin" data-city="${key}" style="${mapPosition(longitude, latitude)}" role="group" aria-label="${e(name)}的家人">
      <div class="home-map-members">${people}</div>
      <span class="home-map-pin-dot" aria-hidden="true"></span>
      <span class="home-map-city-name">${e(name)}</span>
    </div>`;
  }

  function view() {
    const groups = cityGroups();
    const labels = [
      ...PROVINCE_LABELS.map(place => placeLabel(place, '')),
      ...SEA_LABELS.map(place => placeLabel(place, 'is-sea')),
      ...OVERVIEW_CITIES.map(place => placeLabel(place, 'is-city')),
      ...DETAIL_CITIES.map(place => placeLabel(place, 'is-city is-detail'))
    ].join('');
    return `<div class="home-map-surface" role="group" aria-label="最近登录城市分布示意">
      <div class="home-map-viewport" id="home-map-viewport">
        <div class="home-map-world">
          <div class="home-map-geography" style="--longitude-span:${LONGITUDE_SPAN};--latitude-span:${LATITUDE_SPAN}">
            <img src="assets/family-home/login-city-map.webp" alt="" decoding="async" fetchpriority="high" draggable="false">
            <div aria-hidden="true">${labels}</div>
            ${Array.from(groups, ([key, ids]) => cityPin(key, ids)).join('')}
          </div>
        </div>
      </div>
      <span class="home-map-label">登录城市示意</span>
      ${groups.size ? '' : '<p class="heritage-caption home-map-empty">暂无可展示的登录城市。</p>'}
      <div class="home-map-zoom" role="group" aria-label="地图缩放">
        <button type="button" data-map-zoom="-1" aria-controls="home-map-viewport" aria-label="缩小地图" aria-disabled="true">−</button>
        <button type="button" data-map-zoom="1" aria-controls="home-map-viewport" aria-label="放大地图" aria-disabled="false">+</button>
      </div>
    </div>`;
  }

  /** 每次打开分布图先展示全景，缩放和拖动只更新地图视口。 */
  function mount(content) {
    const surface = content.querySelector('.home-map-surface');
    if (!surface) return;
    const viewport = surface.querySelector('.home-map-viewport');
    const world = viewport.querySelector('.home-map-world');
    const controls = surface.querySelector('.home-map-zoom');
    const [zoomOut, zoomIn] = controls.querySelectorAll('button');
    const pointers = new Map();
    let zoom = 1;
    let offsetX = 0;
    let offsetY = 0;
    let dragged = false;

    function setView(nextZoom, x, y) {
      zoom = nextZoom;
      // 平移量按视口比例保存，调整手机预览宽度后也不会拖出空白。
      offsetX = Math.min(0, Math.max(1 - zoom, x));
      offsetY = Math.min(0, Math.max(1 - zoom, y));
      world.style.setProperty('--map-size', `${zoom * 100}%`);
      world.style.setProperty('--map-x', `${offsetX / zoom * 100}%`);
      world.style.setProperty('--map-y', `${offsetY / zoom * 100}%`);
      viewport.classList.toggle('is-zoomed', zoom > 1);
      world.classList.toggle('is-detail', zoom >= DETAIL_ZOOM);
      zoomOut.setAttribute('aria-disabled', String(zoom === 1));
      zoomIn.setAttribute('aria-disabled', String(zoom === MAX_ZOOM));
    }

    function zoomAt(value, anchor = VIEW_CENTER, target = anchor) {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(1, value));
      const ratio = nextZoom / zoom;
      // 缩放前后的同一地点贴住指针或两指中心，拖到边缘时由视口范围限制。
      setView(nextZoom, target.x - (anchor.x - offsetX) * ratio, target.y - (anchor.y - offsetY) * ratio);
    }

    function relativePoint(x, y, bounds) {
      return { x: (x - bounds.left) / bounds.width, y: (y - bounds.top) / bounds.height };
    }

    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-map-zoom]');
      if (!button || button.getAttribute('aria-disabled') === 'true') return;
      zoomAt(zoom + Number(button.dataset.mapZoom) * ZOOM_STEP);
    });
    // 普通滚轮继续滚动首页，组合键滚动才缩放地图。
    viewport.addEventListener('wheel', event => {
      if ((!event.ctrlKey && !event.metaKey) || !event.deltaY) return;
      event.preventDefault();
      const anchor = relativePoint(event.clientX, event.clientY, viewport.getBoundingClientRect());
      zoomAt(zoom - Math.sign(event.deltaY) * ZOOM_STEP, anchor);
    }, { passive: false });

    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointers.size >= 2) return;
      if (!pointers.size) dragged = false;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        dragged = true;
        for (const id of pointers.keys()) viewport.setPointerCapture(id);
      }
    });
    viewport.addEventListener('pointermove', event => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const { clientX: x, clientY: y } = event;
      const bounds = viewport.getBoundingClientRect();
      if (pointers.size === 2) {
        const other = Array.from(pointers.values()).find(point => point !== previous);
        const distance = Math.hypot(previous.x - other.x, previous.y - other.y);
        if (distance > 0) {
          const anchor = relativePoint((previous.x + other.x) / 2, (previous.y + other.y) / 2, bounds);
          const target = relativePoint((x + other.x) / 2, (y + other.y) / 2, bounds);
          zoomAt(zoom * Math.hypot(x - other.x, y - other.y) / distance, anchor, target);
        }
      } else if (zoom > 1) {
        const dx = x - previous.x;
        const dy = y - previous.y;
        if (!dragged) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          dragged = true;
          viewport.setPointerCapture(event.pointerId);
        }
        setView(zoom, offsetX + dx / bounds.width, offsetY + dy / bounds.height);
      }
      pointers.set(event.pointerId, { x, y });
    });
    const endPointer = event => pointers.delete(event.pointerId);
    viewport.addEventListener('pointerup', endPointer);
    viewport.addEventListener('pointercancel', endPointer);
    viewport.addEventListener('pointerleave', event => {
      if (!viewport.hasPointerCapture(event.pointerId)) endPointer(event);
    });
    viewport.addEventListener('dragstart', event => event.preventDefault());
    // 从家人头像开始拖图时，抬手不会误打开这位家人的记录。
    viewport.addEventListener('click', event => {
      if (!dragged || !event.detail) return;
      event.preventDefault();
      event.stopPropagation();
    }, { capture: true });
    viewport.addEventListener('focusin', event => {
      if (zoom === 1 || !event.target.matches('.home-map-member:focus-visible')) return;
      const bounds = viewport.getBoundingClientRect();
      const member = event.target.getBoundingClientRect();
      if (member.left >= bounds.left && member.right <= bounds.right &&
          member.top >= bounds.top && member.bottom <= bounds.bottom) return;
      const point = relativePoint(member.left + member.width / 2, member.top + member.height / 2, bounds);
      setView(zoom, offsetX + VIEW_CENTER.x - point.x, offsetY + VIEW_CENTER.y - point.y);
    });
  }

  P.FamilyMap = { view, mount };
}
