/** 汇报导图和演示选择器共用功能清单，演示直接进入原型已有路由。 */
'use strict';
{
  const catalog = [
    ['home', '我家与家训', 'home',
      '从家训、姓源和家史翻到家谱，点框内的「分布地图」。城市点位直接显示家人，点头像可看相关往事。下方相册可以左右滑动，点开近期照片和视频。切换为陈远山可编辑与添加成员。'],
    ['tree', '家史', 'home-origin/father',
      '按时间先后查看家族线索，文末附家族记载和资料来源。'],
    ['families', '建家与切换', 'house-switch',
      '从创建新家庭开始，填家庭名称和称呼。同一账号可参与多个家庭，各家的内容分别管理。'],
    ['invite', '成员与邀请', 'family',
      '查看家人关系，再体验邀请亲人加入。家谱里也可以保留尚未认领账号的家人。'],
    ['permissions', '人生空间授权', 'family-permissions',
      '查看人生档案的授权。亲属关系和资料的开放范围独立管理。'],
    ['privacy', '大字号', 'profile',
      '在「我的」首页直接切换大字号。打开本人记录的详情，可以调整这条记录的分享范围。'],
    ['stories', '家庭全部记录', 'house-stories',
      '点底栏「记录」先进入本人档案。再从顶部下拉框选择「家庭全部记录」，即可查看向你开放的家庭共享内容。'],
    ['assistant', 'AI问家', 'house-assistant',
      '试问家训、照片、语音或成长往事，点回答下方的资料回看原记录。原型根据当前家庭已共享的内容查找。'],
    ['picks', '优选', 'house-picks',
      '按餐厨、日用和长辈之选浏览，点开保鲜盒、毛巾等商品看规格与演示价。传家相框可打开演示机。'],
    ['by-person', '切换人物志', 'house-stories/father',
      '现在查看与陈远山相关的往事。上传时可关联多位家人，同一条记录可从这些家人的入口找到。'],
    ['upload', '上传家庭记录', 'house-add',
      '选照片、视频、文字或作品，填写必要内容。关联家人可以多选，可见范围单独设置。'],
    ['moment', '记一刻', 'house-moment',
      '试试拍一张或说一句。照片和原声可以一起留在同一条往事里。'],
    ['review', '资料草稿与上传', 'materials',
      '从「记录 → 我上传的」查看草稿、上传进度和已收录的资料。'],
    ['messages', '家人留言', 'question-history',
      '从「记录 → 留言记录」回看对话，打开对应往事查看或回复。新的留言或回复会在「我的」提醒。'],
    ['screen-photo', '投照片与回语音', 'house-screen//photos',
      '知夏翻出爸爸第一天上班的照片。用手机把照片送到客厅，切到大屏点「回一句」，再回手机打开原照片听爸爸的讲述。这里演示的是一家人收到相框后怎么用。'],
    ['screen-settings', '绑定与离线同步', 'house-screen//device',
      '在设备设置里体验配对和安静时段。相框离线时能看装好的照片，恢复联网后会收到家人新发来的照片。'],
    ['keepsake', '纸质纪念书介绍', 'house-book-intro/father',
      '浏览样书和纸书服务说明，按需咨询。'],
    ['person', '人物志', 'house-stories/father',
      '查看陈远山的小传、留影、影录和作品。'],
    ['film', '人生故事片样片', 'archive-item/father-life-film',
      '播放示例影片，查看与人物和往事的关联。专业服务交付以确认后的成片为准。'],
    ['membership', '家庭会员与容量', 'membership',
      '对照免费和会员权益，查看家庭总容量和模拟开通入口。'],
    ['services', '传家定制', 'house-addons',
      '进入影片、纸质书和相框的介绍页，查看样例、办理流程与咨询方式。'],
    ['orders', '服务订单与交付', 'service-orders',
      '可先到独立服务详情模拟咨询，再在这里查看该服务的进度。'],
    ['billing', '收费权益说明', 'billing-plan',
      '查看新家庭的免费试用额度、家庭会员权益和到期规则。']
  ];

  // 导图叶子和原型选择框共用功能清单，链接使用同一个功能编号。
  const branches = [
    {
      id: 'family', title: '建起一个家',
      groups: [
        { topic: 'home', children: ['tree'] },
        { title: '家庭管理', children: ['families', 'invite'] },
        { title: '权限与设置', children: ['permissions', 'privacy'] }
      ]
    },
    {
      id: 'record', title: '记录往事',
      groups: [
        { title: '留下记录', children: ['upload', 'moment'] },
        { topic: 'stories', children: ['by-person'] },
        { topic: 'assistant' },
        { topic: 'review' }
      ]
    },
    {
      id: 'together', title: '请家人补一句',
      groups: [
        { title: '家人留话与补写', children: ['messages'] }
      ]
    },
    {
      id: 'daily', title: '传家相框',
      groups: [
        { title: '传家相框', children: ['screen-photo', 'screen-settings'] }
      ]
    },
    {
      id: 'legacy', title: '回看与传承',
      groups: [
        { topic: 'person' },
        { title: '纸书与影片', children: ['keepsake', 'film'] }
      ]
    },
    {
      id: 'services', title: '会员与服务',
      groups: [
        { title: '会员与收费', children: ['membership', 'billing'] },
        { topic: 'services', children: ['orders', 'picks'] }
      ]
    }
  ];

  function branchTopicIds(branch) {
    return branch.groups.flatMap(({ topic, children = [] }) => topic ? [topic, ...children] : children);
  }

  const topics = new Map(catalog.map(([id, title, route, guide]) => [id, { title, route, guide }]));
  for (const branch of branches) {
    for (const id of branchTopicIds(branch)) topics.get(id).branch = branch.title;
  }

  const steps = new Map([...document.querySelectorAll('[data-briefing-step]')].map(link => [
    link.dataset.briefingStep, { link, panel: document.getElementById(link.dataset.briefingStep) }
  ]));
  const picker = document.getElementById('briefing-topic');
  const frame = document.getElementById('briefing-preview');
  const layout = document.getElementById('briefing-demo-layout');
  const mapPlane = document.querySelector('.briefing-map-plane');
  const mapCore = mapPlane.querySelector('.briefing-map-core');
  const mapWires = mapPlane.querySelector('.briefing-map-wires');
  const mapConnections = document.getElementById('briefing-map-connections');
  const branchList = document.getElementById('briefing-map-branches');
  const editionIds = new Set(['baby', 'elders', 'couple']);
  let topicId = 'home';

  function curve(fromX, fromY, toX, toY) {
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`;
  }

  function verticalBranches(parent, children) {
    const trunkX = parent.left + 10;
    return [
      `M ${trunkX} ${parent.bottom} V ${children.at(-1).y - 8}`,
      ...children.map(child =>
        `M ${trunkX} ${child.y - 8} Q ${trunkX} ${child.y} ${child.left} ${child.y}`)
    ];
  }

  /** 按节点实际位置画线，字号或宽度变化后仍接到相应节点。 */
  function drawMapWires() {
    const plane = mapPlane.getBoundingClientRect();
    if (!plane.width) return;

    const stacked = getComputedStyle(mapPlane).getPropertyValue('--map-layout').trim() === 'stacked';
    const measure = element => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left - plane.left,
        right: box.right - plane.left,
        y: box.top + box.height / 2 - plane.top,
        bottom: box.bottom - plane.top
      };
    };
    const core = measure(mapCore);
    const branchNodes = Array.from(branchList.children, element => ({
      element,
      box: measure(element.querySelector('.briefing-map-node'))
    }));
    const mainPaths = stacked ? verticalBranches(core, branchNodes.map(branch => branch.box)) : [];
    const groupPaths = [];
    const leafPaths = [];

    branchNodes.forEach(({ element, box }, index) => {
      const leftSide = !stacked && element.classList.contains('left');
      const groups = Array.from(element.querySelectorAll('.briefing-map-group'), group => ({
        element: group,
        box: measure(group.querySelector('.briefing-map-parent'))
      }));
      if (stacked) {
        groupPaths.push(...verticalBranches(box, groups.map(group => group.box)));
      } else {
        const coreEdge = leftSide ? core.left : core.right;
        const startY = core.y + (index % 3 - 1) * 12;
        mainPaths.push(curve(coreEdge, startY, leftSide ? box.right : box.left, box.y));
        for (const { box: group } of groups) {
          groupPaths.push(curve(leftSide ? box.left : box.right, box.y, leftSide ? group.right : group.left, group.y));
        }
      }

      for (const { element: group, box: parent } of groups) {
        for (const label of group.querySelectorAll('.briefing-map-leaf > *')) {
          const leaf = measure(label);
          const nearText = leftSide ? leaf.right + 4 : leaf.left - 4;
          leafPaths.push(curve(leftSide ? parent.left : parent.right, parent.y, nearText, leaf.y));
        }
      }
    });

    mapWires.setAttribute('viewBox', `0 0 ${plane.width} ${plane.height}`);
    mapConnections.innerHTML = mainPaths.map(path => `<path class="briefing-map-main-wire" d="${path}"/>`).join('') +
      groupPaths.map(path => `<path class="briefing-map-group-wire" d="${path}"/>`).join('') +
      leafPaths.map(path => `<path class="briefing-map-leaf-wire" d="${path}"/>`).join('');
  }

  /** 节点地址可以直接分享，手写无效地址回到已有主题或总览。 */
  function render(focusHeading = false) {
    const [requested, id] = location.hash.slice(1).split('/');
    if (requested === 'briefing-content') return;
    const step = steps.has(requested) ? requested : 'features';
    for (const [key, { panel, link }] of steps) {
      panel.hidden = key !== step;
      if (key === step) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    if (step === 'demo') {
      const fromNode = topics.has(id);
      showTopic(fromNode ? id : topicId, fromNode);
    }
    if (focusHeading) {
      steps.get(step).panel.querySelector('h2').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function showTopic(id, fromNode) {
    const item = topics.get(id);
    topicId = id;
    picker.value = id;
    document.getElementById('briefing-topic-group').textContent = item.branch;
    document.getElementById('briefing-topic-title').textContent = item.title;
    document.getElementById('briefing-topic-guide').textContent = item.guide;
    document.getElementById('briefing-open-prototype').href = 'index.html#' + item.route;
    layout.classList.toggle('wide', item.route.split('/')[0] === 'house-screen');
    frame.title = '可操作原型 · ' + item.title;
    // 直接点节点时回到功能入口，点「原型演示」章节时接着当前操作。
    if (fromNode || !frame.hasAttribute('src')) {
      frame.src = 'index.html?embedded=1#' + item.route;
    }
  }

  function topicLink(id) {
    return `<a class="briefing-map-link${editionIds.has(id) ? ' edition' : ''}" href="#demo/${id}">${topics.get(id).title}</a>`;
  }

  /** 带原型入口的父节点可点击。专版内的功能说明跟在对应父节点下。 */
  function renderMapGroup({ title, topic, children = [], details = [] }) {
    const leaves = children.map(id => `<li class="briefing-map-leaf">${topicLink(id)}</li>`)
      .concat(details.map(text => `<li class="briefing-map-leaf"><span>${text}</span></li>`));
    return `<li class="briefing-map-group">
      <h4 class="briefing-map-parent">${topic ? topicLink(topic) : `<span>${title}</span>`}</h4>
      ${leaves.length ? `<ul class="briefing-map-leaves">${leaves.join('')}</ul>` : ''}
    </li>`;
  }

  branchList.innerHTML = branches.map(({ id, title, groups }, index) =>
    `<section class="briefing-map-branch ${index < 3 ? 'left' : 'right'}" style="--branch-row:${index % 3 + 1}"
      aria-labelledby="briefing-branch-${id}">
      <h3 class="briefing-map-node" id="briefing-branch-${id}">
        <svg class="briefing-map-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <use href="#briefing-icon-${id}"/>
        </svg>${title}
      </h3>
      <ul class="briefing-map-groups">${groups.map(renderMapGroup).join('')}</ul>
    </section>`).join('');
  document.getElementById('briefing-map-count').textContent = `${branches.length} 个分支 · ${topics.size} 个演示入口`;
  picker.innerHTML = branches.map(branch =>
    `<optgroup label="${branch.title}">${branchTopicIds(branch).map(id =>
      `<option value="${id}">${topics.get(id).title}</option>`).join('')}</optgroup>`).join('');
  picker.addEventListener('change', () => { location.hash = 'demo/' + picker.value; });
  window.addEventListener('hashchange', () => render(true));
  render();
  new ResizeObserver(drawMapWires).observe(mapPlane);
}
