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
      '分别查看人物档案、数字人和故里的授权。亲属关系和各项服务的开放范围独立管理。'],
    ['privacy', '记录权限与大字号', 'settings',
      '选择一条我上传的往事，试试仅自己、指定家人和当前家庭三种分享范围。这里也能切换大字号。'],
    ['stories', '家庭全部记录', 'house-stories',
      '点底栏「记录」先进入本人档案。再从顶部下拉框选择「家庭全部记录」，即可查看向你开放的家庭共享内容。'],
    ['assistant', 'AI问家', 'house-assistant',
      '试问家训、照片、语音或成长往事，点回答下方的资料回看原记录。原型根据当前家庭已共享的内容查找。'],
    ['picks', '优选', 'house-picks',
      '按餐厨、日用和长辈之选浏览，点开保鲜盒、毛巾等商品看规格与演示价。爸妈大屏相框可打开演示机。'],
    ['by-person', '切换人物志', 'house-stories/father',
      '现在查看与陈远山相关的往事。上传时可关联多位家人，同一条记录可从这些家人的入口找到。'],
    ['upload', '上传家庭记录', 'house-add',
      '选照片、视频、文字或作品，填写必要内容。关联家人可以多选，可见范围单独设置。'],
    ['moment', '记一刻', 'house-moment',
      '试试拍一张或说一句。照片和原声可以一起留在同一条往事里。'],
    ['old-photo', '发老照片问长辈', 'house-record/photo/father',
      '用示例结婚照问爸爸一句，保存给当前家庭。打开长辈端回语音，再到原照片点「再问一位家人」，让两段话留在同一张照片下。'],
    ['review', '资料提交与核对', 'profile-materials',
      '从「我提交的资料」查看整理进度，或打开「待我核对」处理家人补充的材料。'],
    ['messages', '家人留话', 'questions',
      '打开一条留言，沿着入口回到对应的往事查看或回复。'],
    ['saved', '收藏', 'saved',
      '先打开一段往事并点收藏，再到这里回看。收藏随原记录的授权范围展示。'],
    ['baby', '成长记', 'house-baby/nian',
      '在「成长记」相册里从孕期翻到出生、各月龄和成长里程碑。照片和视频在时间线上直接展示。'],
    ['elders', '长辈岁月', 'house-elders/father',
      '在「长辈岁月」里按年月翻有声相册，点一下听语音。相册里既有爸妈自己记的，也有家人帮忙记的。'],
    ['couple', '相伴记', 'house-couple-setup',
      '用陈远山邀请林慧，切换到林慧接受邀请，即可打开「相伴记」相册。默认仅两人可见，分享到家庭要双方确认。'],
    ['screen-photo', '投照片与回语音', 'house-screen//photos',
      '知夏翻出爸爸第一天上班的照片。用手机把照片送到客厅，切到大屏点「回一句」，再回手机打开原照片听爸爸的讲述。这里演示的是一家人收到相框后怎么用。'],
    ['screen-gift', '送爸妈一份相框礼物', 'house-screen//gift',
      '从手机相册挑一组照片，指定爸妈开机先看的那张，写下祝福或录一段自己的声音，再看爸妈打开相框的样子。'],
    ['screen-settings', '绑定与离线同步', 'house-screen//device',
      '在设备设置里体验配对和安静时段。相框离线时能看装好的照片，恢复联网后会收到家人新发来的照片。'],
    ['shared-memory', '共忆集', 'common-memories',
      '打开两位家人的共同故事，分别读各自补上的细节。故事集继续引用获授权的原资料。'],
    ['old-friends', '故人共忆', 'share-memory',
      '选择以陈远山本人身份体验，挑照片或影片，核对后生成分享卡。老朋友可以补上自己记得的那一面。'],
    ['reunion', '共忆相册', 'reunion-albums',
      '先在故人共忆生成分享卡，再回来查看相册和收录的内容。'],
    ['restoration', 'AI 影像体验', 'share-memory',
      '以本人身份挑选可修复的示例照片，打开分享预览，查看原片与修复或年轻模拟效果。'],
    ['storybook', '家庭纪事册', 'house-book',
      '打开「编辑样册」，选刚发的老照片，更新后在样页回听家人的原声。也可以演示开通会员和保存故事册。'],
    ['keepsake', '人工纪念书', 'books',
      '打开纪念书示例，查看选材、定稿、样书和印制等交付环节。'],
    ['gifts', '收到的心意', 'share-gifts',
      '展开演示服务进度，体验老朋友主动预约、完成拍摄后登记双方的服务礼。'],
    ['person', '人物档案', 'life/father',
      '查看陈远山已开放的视频、照片、传记、作品与足迹。'],
    ['digital', '互动数字人', 'chat/father',
      '点击示例问题，看回答引用哪段资料。资料不足时可以留问，也可以提交纠正。'],
    ['feedback', '数字人反馈', 'chat-messages',
      '打开一条反馈，查看问答或纠正的处理进度。'],
    ['vr', '故里 VR', 'space',
      '移动视角、切换年代，再点一个老物件回看相关经历。'],
    ['film', '人生故事片样片', 'archive-item/father-life-film',
      '播放示例影片，查看与人物和往事的关联。专业服务交付以确认后的成片为准。'],
    ['membership', '家庭会员与容量', 'membership',
      '对照免费和会员权益，查看家庭总容量、故事册额度和模拟开通入口。'],
    ['services', '传家定制', 'house-addons',
      '查看 AI 人生故事片、数字人创建、VR 房间建模和人工纪念书。打开服务详情可看交付内容和报价。'],
    ['digital-create', '数字人创建', 'house-service/digital',
      '查看数字人创建的交付内容和收费方式。进入已授权的示例数字人，体验提问和引用来源。'],
    ['vr-model', 'VR 房间建模', 'house-service/vr',
      '查看房间建模的交付内容和收费方式。进入已授权的故里示例，漫游房间并打开物件故事。'],
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
        { topic: 'stories', children: ['by-person', 'saved'] },
        { topic: 'assistant' },
        { topic: 'review' }
      ]
    },
    {
      id: 'together', title: '请家人补一句',
      groups: [
        { title: '家人共同回忆', children: ['old-photo', 'messages', 'shared-memory'] },
        { topic: 'old-friends', children: ['reunion', 'restoration', 'gifts'] }
      ]
    },
    {
      id: 'daily', title: '专版与大屏',
      groups: [
        { topic: 'baby', details: ['孕期与出生', '月龄相册', '成长里程碑'] },
        { topic: 'elders', details: ['按年月回看', '原声回听', '家人代记', '人生节点'] },
        { topic: 'couple', details: ['伴侣邀请确认', '私密双人相册', '双方确认后分享'] },
        { title: '爸妈的相框', children: ['screen-gift', 'screen-photo', 'screen-settings'] }
      ]
    },
    {
      id: 'legacy', title: '回看与传承',
      groups: [
        { title: '人物与故里', children: ['person', 'vr'] },
        { topic: 'digital', children: ['feedback'] },
        { title: '成册与影片', children: ['storybook', 'keepsake', 'film'] }
      ]
    },
    {
      id: 'services', title: '会员与服务',
      groups: [
        { title: '会员与收费', children: ['membership', 'billing'] },
        { topic: 'services', children: ['digital-create', 'vr-model', 'orders', 'picks'] }
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
