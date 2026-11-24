/** 纸质书、家庭影片和相框共用服务订单，家人与演示顾问按各自步骤操作。 */
'use strict';
{
  const P = window.App;
  const {escape: e, button: b, link: l, icon: i} = P;
  const frameName = P.Households.addonOffer('frame').title;
  const PHASES = {
    requested: ['待顾问回复', 0, '顾问会核对需求，在这笔服务里回复方案和报价。'],
    proposed: ['待确认方案', 1, '请核对制作范围、报价和交付安排。'],
    consent: ['待确认拍摄安排', 2, '拍摄对象本人确认采访安排和资料使用范围。'],
    filming: ['拍摄与制作中', 2, '制作方按确认的方案整理素材，完成后提交样片。'],
    sample: ['待确认样片', 2, '请看样片，确认方向或把需要修改的地方告诉制作方。'],
    finalizing: ['成片制作中', 2, '样片方向已确认，制作方将提交成片。'],
    acceptance: ['待验收', 3, '请核对成片，确认验收后可在人物档案中回看。'],
    completed: ['已完成', 4, '成片已交付，拍摄对象本人可随时回看。'],
    closed: ['咨询已结束', -1, '']
  };
  const DEMO_ACTIONS = {
    requested: ['模拟顾问回复', 'proposed'],
    preparing: ['模拟发货', 'shipped'],
    filming: ['模拟提交样片', 'sample'],
    finalizing: ['模拟交付成片', 'acceptance']
  };
  const FRAME_PHASES = {
    requested: ['待顾问回复', 0, '顾问会核对预装和配送需求，在本单回复方案和报价。'],
    proposed: ['待确认方案', 1, '请核对相框规格、报价、照片预装和配送安排。'],
    payment: ['待模拟付款', 1, '方案已确认，可模拟付款后进入备货。'],
    preparing: ['备货中', 2, '门店按已确认的方案备货，发货后可在这里确认收件。'],
    shipped: ['待确认收件', 3, '相框已模拟发出，请在收到相框并核对配件后确认收件。'],
    completed: ['已完成', 4, '相框已确认收件，可回看本单方案与配送安排。']
  };
  const OPTIONS = {
    book: {subject: '给谁做', prompt: '想收录哪些故事或照片', example: '例如：小时候的老屋、历年的全家福', icon: 'book'},
    film: {subject: '拍谁', prompt: '想记录什么', example: '例如：请爸爸讲讲老屋和团圆饭', icon: 'play'},
    frame: {
      subject: '由谁确认', prompt: '需要怎样准备相框', icon: 'screen',
      example: '例如：预装全家福，寄给爸妈',
      requirementTitle: `${frameName}需求`, approveLabel: '确认方案'
    }
  };

  function supports(key) {
    return Object.hasOwn(OPTIONS, key);
  }

  function canView(order) {
    const actor = P.state.actor;
    return Boolean(order?.customization && P.Households.memberIds([actor]).length &&
      (order.person === actor || order.customization.requester === actor));
  }

  function route(order) {
    return 'service-order/' + e(order.id);
  }

  function byId(id) {
    return P.Households.current()?.orders.find(order => order.id === id && canView(order));
  }

  function current() {
    return P.state.route === 'service-order' ? byId(P.state.customizationOrderId) : null;
  }

  function latest(key, person, allowOther = false) {
    return P.Households.current()?.orders.findLast(order => order.key === key && canView(order) &&
      (order.person === person || (allowOther && order.customization.requester === P.state.actor)));
  }

  /** 付款后全家都能从首页管理相框，订单详情仍按经办人与对象授权。 */
  function hasPurchasedFrame() {
    return P.Households.current()?.orders.some(order => order.key === 'frame' &&
      ['preparing', 'shipped', 'completed'].includes(order.customization?.phase)) ?? false;
  }

  function permitsBook(orderId, person) {
    const order = byId(orderId);
    return order?.key === 'book' && order.person === person && order.customization.phase === 'book';
  }

  function linkedBook(order) {
    return P.state.keepsakeBooks.find(book => book.serviceOrderId === order.id);
  }

  /** 经办人确认方案与付款，拍摄对象或收件人处理本人确认事项。 */
  function pendingActor(order) {
    const {phase, requester} = order.customization;
    if (['proposed', 'payment'].includes(phase)) return requester;
    if (['consent', 'sample', 'acceptance', 'shipped'].includes(phase)) return order.person;
    return '';
  }

  function needsAction(order) {
    if (order.customization.phase !== 'book') return pendingActor(order) === P.state.actor;
    const book = linkedBook(order);
    if (!book) return order.person === P.state.actor;
    const books = P.KeepsakeBooks;
    return books.pendingActor(book) === P.state.actor && (book.phase === 'draft' || books.ready(book));
  }

  /** 成片认领到对应订单，并继续服从人物档案的查看权限。 */
  function deliveredFilmRoute(order) {
    const {phase, assetId} = order.customization;
    return order.key === 'film' && phase === 'completed' && order.person === P.state.actor && P.PersonArchive.getItem(assetId)
      ? 'archive-item/' + e(assetId) : '';
  }

  function participants() {
    return P.Households.memberIds(Object.keys(P.state.accounts));
  }

  function progress(order) {
    const {phase, closedReason} = order.customization;
    if (phase === 'closed') return [PHASES.closed[0], -1, closedReason];
    if (order.key === 'frame') return FRAME_PHASES[phase];
    if (phase !== 'book') return PHASES[phase];
    const book = linkedBook(order);
    const name = P.PEOPLE[order.person]?.name || '本人';
    if (!book || book.phase === 'draft') return ['待本人选材', 2, '请由' + name + '选择可以入书的本人资料。'];
    if (book.phase === 'delivered') return ['已完成', 4, '纪念书已确认收件，可回看书稿与交付清单。'];
    if (book.phase === 'cancelled') return ['制作已取消', -1, '本次纪念书制作已结束，可回看制作单。'];
    if (book.phase === 'shipped') return ['待确认收件', 3, '纪念书已寄出，请在制作单中确认收件。'];
    return [P.KeepsakeBooks.orderStatus(book), 2, '选材、校样、样书和寄送进度可在纪念书制作单中查看。'];
  }

  function listTitle(order) {
    const title = order.key === 'frame' ? frameName : order.title;
    return title + ' · ' + (P.PEOPLE[order.person]?.name || '家人');
  }

  function finished(order) {
    const position = progress(order)[1];
    return position === -1 || position === 4;
  }

  function formField(label, input, className = '') {
    return '<label class="form-field ' + className + '"><span>' + e(label) + '</span>' + input + '</label>';
  }

  function open({key, item, priceHtml, person, allowOther, returnLabel, startAtForm = false}) {
    const existing = latest(key, person, allowOther);
    const dialog = document.getElementById('addon-modal');
    const category = key === 'frame' ? '实物商品' : '单项定制';
    const modalOptions = {eyebrow: category + ' · ' + P.Households.current().name, closeLabel: returnLabel, familySheet: true};
    if (existing && (!allowOther || !finished(existing))) {
      P.modal(item.title, '<div class="customization-intake"><p>' + e(progress(existing)[0]) + '</p>' +
        l('查看定制进度', route(existing), 'btn full') + '</div>', 'sheet', dialog, modalOptions);
      dialog.querySelector('.customization-intake button').focus({preventScroll: true});
      return;
    }

    const fields = OPTIONS[key];
    const available = participants();
    // 从具体人物的介绍直达需求时，等待该人物加入，避免表单默认选中另一个家人。
    const people = allowOther && (!startAtForm || available.includes(person))
      ? available : available.filter(id => id === person);
    if (!people.length) {
      P.modal(item.title, '<div class="customization-intake"><p>请先邀请这位家人加入，再由本人确认制作资料。</p>' +
        l('查看成员与邀请', 'family', 'btn full') + '</div>', 'sheet', dialog, modalOptions);
      return;
    }
    const options = people.map(id =>
      '<option value="' + e(id) + '"' + (person === id ? ' selected' : '') + '>' +
      e(P.PEOPLE[id].name + (id === P.state.actor ? '（本人）' : '')) + '</option>').join('');
    const requestLabel = fields.requirementTitle || '制作需求';
    const previous = existing ? l('查看上一次定制', route(existing), 'text-link full') : '';
    // 介绍页已展示报价，咨询直接填写。其他入口的两步共用表单，回看报价时保留输入。
    const brief = startAtForm ? '' : '<div data-customization-brief><p class="family-sheet-summary">' + e(item.summary) + '</p>' +
      '<p class="family-sheet-note">无需会员，收到报价后再决定。</p>' +
      '<div class="family-sheet-footer">' + priceHtml +
      b('填写' + e(requestLabel), 'customization-intake-next', 'btn') + '</div>' + previous + '</div>';
    const back = startAtForm ? b('返回介绍', 'close-modal', 'btn secondary') : b('上一步', 'customization-intake-back', 'btn secondary');
    const form = '<form id="customization-request" class="customization-intake" data-feature-form' + (startAtForm ? '' : ' hidden') + '>' +
      formField(fields.subject, '<select name="person" required>' + options + '</select>', 'customization-person') +
      formField(fields.prompt, '<textarea name="requirement" rows="2" maxlength="400" required placeholder="' + e(fields.example) + '"></textarea>') +
      '<div class="family-sheet-footer">' + back +
      '<button type="submit" class="btn">提交' + e(requestLabel) + '</button></div></form>';
    P.modal(item.title, brief + form + (startAtForm ? previous : ''), 'sheet', dialog, modalOptions);
    const editor = document.getElementById('customization-request');
    editor.requestContext = {key, item, people, family: P.Households.current(), actor: P.state.actor};
    const first = startAtForm ? editor.querySelector('select') : dialog.querySelector('[data-action="customization-intake-next"]');
    first.focus({preventScroll: true});
  }

  function showIntakeStep(element, editing) {
    const dialog = element.closest('#addon-modal[open]');
    const form = dialog?.querySelector('#customization-request');
    const context = form?.requestContext;
    if (!context || context.actor !== P.state.actor || context.family !== P.Households.current() || form.featureState !== P.state) return;
    const brief = dialog.querySelector('[data-customization-brief]');
    if (!brief) return;
    brief.hidden = editing;
    form.hidden = !editing;
    dialog.scrollTop = 0;
    const target = editing ? form.querySelector('select') : brief.querySelector('[data-action="customization-intake-next"]');
    target.focus({preventScroll: true});
  }

  /** 只复用当前参与人可见的咨询，代家人提交不改变其档案授权。 */
  function submitRequest(form) {
    const context = form.requestContext;
    const {actor} = P.state;
    if (!context || !form.isConnected || form.hidden || !form.closest('#addon-modal[open]') || form.featureState !== P.state ||
      context.family !== P.Households.current() || context.actor !== actor) return;
    const data = new FormData(form);
    const person = String(data.get('person') || '');
    const requirement = String(data.get('requirement') || '').trim();
    const members = participants();
    if (!context.people.includes(person) || !members.includes(person) || !members.includes(actor) ||
      !requirement || requirement.length > 400) {
      P.toast('请选择家庭成员并填写' + (OPTIONS[context.key].requirementTitle || '制作需求') + '。');
      return;
    }

    let order = latest(context.key, person);
    if (!order || finished(order)) {
      const customization = {requester: actor, requirement, phase: 'requested', proposalVersion: 0, sampleVersion: 0};
      // 本人补全旧相框咨询时沿用原单编号，避免同一咨询在列表里出现两次。
      const prior = context.key === 'frame' && person === actor && context.family.orders.find(old =>
        old.key === 'frame' && old.person === person && !old.customization && old.status === '咨询意向已登记');
      if (prior) {
        order = prior;
        order.customization = customization;
        delete order.status;
      } else {
        order = {
          id: P.nextId('addon'), key: context.key, person, title: context.item.title, price: context.item.price, customization
        };
        context.family.orders.push(order);
      }
    }
    P.navigate(route(order));
  }

  function proposal(order) {
    if (order.key === 'frame') {
      return {
        scope: '一台 10.1 英寸相框，核对是否需要照片预装及配送到家。',
        price: order.price,
        schedule: '确认设备、预装及配送方案并完成模拟付款后备货。发货后由申请人核对相框和配件并确认收件。'
      };
    }
    if (order.key === 'film') {
      return {
        scope: '一次人物采访，整理确认可用的照片和影像，制作样片供本人核对，再交付成片。',
        price: order.price,
        schedule: '本人确认拍摄安排后开始，示例制作周期两周。'
      };
    }
    const {editing, sample, printing} = P.KeepsakeBooks.FEES;
    return {
      scope: '本人选材，编辑排版，核对校样和一册实物样书后印制三册。',
      price: '编辑排版 ¥' + editing + '、样书 ¥' + sample + '、印制与寄送 ¥' + printing,
      schedule: '选材和报价确认后进入编辑，寄送安排在样书确认后核对。'
    };
  }

  function action(order, label, name, className = 'btn full') {
    return b(label, 'customization-' + name, className, 'data-id="' + e(order.id) + '"');
  }

  function staffPanel() {
    const host = document.getElementById('book-demo-controls');
    const order = current();
    const step = order && DEMO_ACTIONS[order.customization.phase];
    host.hidden = !step;
    host.innerHTML = step ? '<strong>' + (order.key === 'frame' ? `${frameName}履约演示` : '定制顾问演示') + '</strong><p>在本次演示中推进这笔服务。</p>' +
      action(order, step[0], 'advance', 'btn secondary full') +
      (order.customization.phase === 'requested'
        ? action(order, '模拟暂无法承接', 'decline', 'text-link full') : '') : '';
  }

  function filmPreview(label) {
    const seed = P.ARCHIVE_DATA.assets.find(item => item.kind === 'film');
    return seed ? '<figure class="customization-video"><video controls playsinline preload="metadata" src="' +
      e(seed.src) + '" poster="' + e(seed.poster) + '" aria-label="' + e(label) +
      '"></video><figcaption>' + e(label) + ' · 演示视频</figcaption></figure>' : '';
  }

  function productionAction(order) {
    const book = linkedBook(order);
    if (book && P.KeepsakeBooks.readable(book)) {
      const page = book.phase === 'draft' ? 'book-edit' : 'book-order';
      return l('查看纪念书制作单', page + '/' + e(book.id), 'btn full');
    }
    if (book || P.state.actor !== order.person) return '';
    return P.KeepsakeBooks.canStart(order.person, order.id)
      ? action(order, '开始选材', 'start-book')
      : l('去添加我可选用的资料', 'house-record/photo', 'btn full');
  }

  function customerActions(order) {
    const phase = order.customization.phase;
    const requester = order.customization.requester === P.state.actor;
    const participant = order.person === P.state.actor;
    const end = mayCancel(order) ? action(order, '结束咨询', 'cancel', 'text-link full') : '';
    if (phase === 'requested') return requester ? action(order, '补充需求', 'change', 'btn secondary full') + end : '';
    if (phase === 'proposed') return requester ?
      action(order, order.key === 'book' && participant ? '确认方案，开始选材' : (OPTIONS[order.key].approveLabel || '确认制作方案'), 'approve') +
      action(order, '要求调整方案', 'change', 'btn secondary full') + end : '';
    if (order.key === 'frame') {
      if (phase === 'payment') return requester ? action(order, '模拟支付相框款', 'pay-frame') + end : '';
      return phase === 'shipped' && participant ? action(order, '确认收件', 'accept') : '';
    }
    if (phase === 'book') return productionAction(order) + end;
    if (phase === 'consent') return (participant ? action(order, '确认拍摄安排与资料使用', 'consent') : '') + end;
    if (phase === 'sample' && participant) return action(order, '确认样片', 'approve-sample') +
      action(order, '提出样片修改', 'change', 'btn secondary full');
    if (phase === 'acceptance' && participant) return action(order, '确认验收', 'accept') +
      action(order, '提出成片修改', 'change', 'btn secondary full');
    const film = deliveredFilmRoute(order);
    return film ? l('观看影片', film, 'btn full') : '';
  }

  function steps(position, isFrame) {
    if (position < 0) return '';
    const names = isFrame ? ['提交需求', '确认方案', '备货配送', '收件验收'] : ['提交需求', '确认方案', '制作', '交付验收'];
    return '<ol class="customization-steps" aria-label="' + (isFrame ? `${frameName}服务流程` : '定制流程') + '">' +
      names.map((name, index) => '<li' + (index === position ? ' aria-current="step"' :
        index < position ? ' class="is-complete"' : '') + '>' + name + '</li>').join('') + '</ol>';
  }

  function view() {
    const order = current();
    const back = l('返回订单与进度', 'service-orders', 'paper-link paper-outline full');
    if (!order) return '<div class="page service-orders-page"><div class="paper-card service-order-card">' +
      '<h2>暂无可查看的定制进度</h2><p>可从订单列表查看本人参与的定制。</p></div>' + back + '</div>';

    const {requirement, quote, proposalVersion, sampleVersion, note, phase} = order.customization;
    const isFrame = order.key === 'frame';
    const [status, position, next] = progress(order);
    const expected = pendingActor(order);
    const instruction = expected && expected !== P.state.actor
      ? '当前由' + (P.PEOPLE[expected]?.name || '本人') + '确认。'
      : next;
    let preview = '';
    if (order.person === P.state.actor && phase === 'sample') preview = filmPreview('样片 V' + sampleVersion);
    if (order.person === P.state.actor && phase === 'acceptance') preview = filmPreview('成片待验收');
    const controls = customerActions(order);
    const fields = OPTIONS[order.key];
    const requirementTitle = e(fields.requirementTitle || '制作需求');
    const details = '<section class="paper-card service-order-card customization-details" aria-label="' + requirementTitle + '和顾问方案">' +
      '<h2>' + requirementTitle + '</h2><p class="customization-message">' + e(requirement) + '</p>' +
      (note ? '<h3>最近的调整意见</h3><p class="customization-message">' + e(note) + '</p>' : '') +
      (quote ? '<h3>顾问方案 · V' + proposalVersion + '</h3><dl>' +
        '<dt>' + (isFrame ? '服务范围' : '制作范围') + '</dt><dd>' + e(quote.scope) + '</dd><dt>演示报价</dt><dd>' + e(quote.price) +
        '</dd><dt>交付安排</dt><dd>' + e(quote.schedule) + '</dd></dl>' : '') + '</section>';
    const currentStep = (preview ? '<section class="paper-card service-order-card">' + preview + '</section>' : '') +
      (controls ? '<div class="house-actions customization-actions">' + controls + '</div>' : '');
    return '<div class="page house-page service-orders-page customization-page">' +
      '<article class="paper-card service-order-card">' +
      '<h2 class="service-order-title">' + i(fields.icon) + '<span>' + e(listTitle(order)) + '</span></h2>' +
      '<p class="customization-current"><span class="service-order-status' + (position >= 0 && position < 4 ? ' is-pending' : '') +
      '" role="status">' + e(status) + '</span>' +
      '<span>' + e(instruction) + '</span></p>' + steps(position, isFrame) + '</article>' +
      (position >= 2 ? currentStep + details : details + currentStep) +
      back + '</div>';
  }

  function openChange(order) {
    const phase = order.customization.phase;
    const titles = {
      requested: '补充' + (OPTIONS[order.key].requirementTitle || '制作需求'),
      proposed: order.key === 'frame' ? '调整相框方案' : '调整制作方案',
      sample: '提出样片修改', acceptance: '提出成片修改'
    };
    const label = phase === 'requested' ? '希望补充什么' : '希望调整什么';
    P.modal(titles[phase], '<form id="customization-change" class="customization-intake" data-feature-form>' +
      formField(label, '<textarea name="reason" rows="2" maxlength="400" required></textarea>') +
      '<button type="submit" class="btn full">' + (phase === 'requested' ? '提交补充需求' : '提交调整意见') +
      '</button></form>', 'sheet', undefined, {familySheet: true});
    const form = document.getElementById('customization-change');
    form.changeContext = {order, phase, actor: P.state.actor};
  }

  function confirmCancel(order) {
    P.modal('结束这次咨询？', '<div class="customization-intake"><p>本笔咨询将标记为已结束，仍可在「订单与进度」中查看。</p>' +
      '<div class="family-sheet-footer">' + action(order, '确认结束咨询', 'confirm-cancel') +
      b('继续咨询', 'close-modal', 'btn secondary full') + '</div></div>', 'sheet', undefined, {familySheet: true});
  }

  function mayChange(order) {
    const {phase, requester} = order.customization;
    return ['requested', 'proposed'].includes(phase) ? requester === P.state.actor :
      ['sample', 'acceptance'].includes(phase) && order.person === P.state.actor;
  }

  /** 进入制作或备货前可结束咨询，已建书稿的取消与售后由纪念书制作单承接。 */
  function mayCancel(order) {
    const {phase, requester} = order.customization;
    return requester === P.state.actor && (['requested', 'proposed', 'consent', 'payment'].includes(phase) ||
      (phase === 'book' && !linkedBook(order)));
  }

  /** 客户确认与顾问演示均校验本单、当前账号和阶段，过期操作无法跳过确认。 */
  function handleAction(name, element) {
    if (!name.startsWith('customization-')) return false;
    if (name === 'customization-intake-next' || name === 'customization-intake-back') {
      showIntakeStep(element, name === 'customization-intake-next');
      return true;
    }
    const order = current();
    if (!order || order.id !== element.dataset.id) return true;
    const data = order.customization;
    const {phase} = data;
    const requester = data.requester === P.state.actor;
    const participant = order.person === P.state.actor;
    if (name === 'customization-advance' || name === 'customization-decline') {
      const next = DEMO_ACTIONS[phase];
      if (!next || !element.closest('#book-demo-controls') || document.querySelector('.phone .modal[open]')) return true;
      if (name === 'customization-decline') {
        if (phase !== 'requested') return true;
        data.closedReason = '顾问暂时无法排期，已结束这次咨询。';
        data.phase = 'closed';
      } else {
        if (phase === 'requested') {
          data.quote = proposal(order);
          data.proposalVersion++;
        }
        if (phase === 'filming') data.sampleVersion++;
        data.phase = next[1];
      }
    } else if (name === 'customization-approve' && requester && phase === 'proposed') {
      const nextPhase = {book: 'book', film: 'consent', frame: 'payment'};
      data.phase = nextPhase[order.key];
      if (order.key === 'book' && participant && P.KeepsakeBooks.canStart(order.person, order.id)) {
        P.KeepsakeBooks.start(order.person, order.id);
        return true;
      }
    } else if (name === 'customization-start-book' && participant && phase === 'book') {
      P.KeepsakeBooks.start(order.person, order.id);
      return true;
    } else if (name === 'customization-consent' && participant && phase === 'consent') {
      data.phase = 'filming';
    } else if (name === 'customization-approve-sample' && participant && phase === 'sample') {
      data.phase = 'finalizing';
    } else if (name === 'customization-pay-frame' && order.key === 'frame' && requester && phase === 'payment' && data.quote) {
      data.phase = 'preparing';
    } else if (name === 'customization-accept' && order.key === 'frame' && participant && phase === 'shipped') {
      data.phase = 'completed';
    } else if (name === 'customization-accept' && participant && phase === 'acceptance') {
      const asset = P.Households.createDemoFilm(order.person);
      if (!asset) {
        P.toast('当前样片不可用，请稍后再试。');
        return true;
      }
      data.assetId = asset.id;
      data.phase = 'completed';
    } else if (name === 'customization-change' && mayChange(order)) {
      openChange(order);
      return true;
    } else if (name === 'customization-cancel' && mayCancel(order)) {
      confirmCancel(order);
      return true;
    } else if (name === 'customization-confirm-cancel' && mayCancel(order) && element.closest('#modal[open]')) {
      data.closedReason = '发起人已结束这次咨询。';
      data.phase = 'closed';
      P.closeModal();
    } else {
      return true;
    }
    P.render();
    return true;
  }

  function submit(form) {
    if (form.id === 'customization-request') {
      submitRequest(form);
      return true;
    }
    if (form.id !== 'customization-change') return false;
    const order = current();
    const context = form.changeContext;
    if (!order || !form.isConnected || !form.closest('#modal[open]') || form.featureState !== P.state || context?.order !== order ||
      context.actor !== P.state.actor || context.phase !== order.customization.phase || !mayChange(order)) return true;
    const reason = String(new FormData(form).get('reason') || '').trim();
    if (!reason || reason.length > 400) {
      P.toast('请填写具体的调整意见。');
      return true;
    }
    const data = order.customization;
    data.note = reason;
    if (data.phase === 'proposed') {
      delete data.quote;
      data.phase = 'requested';
    } else if (data.phase !== 'requested') {
      data.phase = 'filming';
    }
    P.closeModal();
    P.render();
    return true;
  }

  P.Customization = {supports, canView, route, latest, hasPurchasedFrame, permitsBook, progress, needsAction, deliveredFilmRoute,
    listTitle, open, staffPanel, handleAction, submit};
  P.views['service-order'] = view;
}
