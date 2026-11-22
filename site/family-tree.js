/** 按当前成员生成关系图；隔代关系单独标识，不补造尚未记录的父母。 */
'use strict';
{
  const P=window.App,{button:b,avatar:a,escape:e,icon:i}=P;
  const relations = ['父亲', '母亲', '儿子', '女儿', '兄弟姐妹', '妻子', '丈夫', '孙女', '孙子', '侄女', '其他家人'];
  const homeRelationGroups = {
    parents: { label: '父母', choices: ['父亲', '母亲'] },
    partner: { label: '配偶', choices: ['妻子', '丈夫'] },
    children: { label: '子女', choices: ['儿子', '女儿'] },
    others: { label: '其他家人', choices: ['兄弟姐妹', '侄女', '其他家人'] }
  };
  let homeEditor = null;

  function canAddMember() {
    return P.state.actor === 'father' && P.FamilyHome.member();
  }

  function inHomeTree() {
    return P.state.route === 'home' && P.state.homeFamilyDisplay !== 'map';
  }

  function canPreviewHomeEdit() {
    return P.Households.isExample() && P.FamilyHome.member() &&
      P.state.members.includes('father') && Object.hasOwn(P.state.accounts, 'father');
  }

  function homeEditing() {
    return homeEditor === P.state && inHomeTree() && canAddMember();
  }

  /** 编辑状态只属于当前家庭的管理人，切页或换身份时结束。 */
  function syncHomeEditor() {
    if (homeEditor && !homeEditing()) homeEditor = null;
  }

  function homeEditControl() {
    if (!canAddMember() && !canPreviewHomeEdit()) return '';
    const editing = homeEditing();
    const label = editing ? '完成' : '添加成员';
    const description = canAddMember() ? '' : ' title="切换到陈远山演示添加成员"';
    return b(i(editing ? 'check' : 'plus') + label, 'tree-edit-home',
      `heritage-text-button home-family-edit-toggle${editing ? ' is-done' : ''}`,
      `id="home-family-edit-toggle"${description}`);
  }

  function homeAddNode(groupId, position = '') {
    const { label } = homeRelationGroups[groupId];
    return b(`${i('plus')}<span>${label}</span>`, 'tree-add-relative', 'heritage-pedigree-add',
      `data-group="${groupId}" aria-haspopup="dialog" aria-label="添加${label}" ${position}`);
  }

  function toggleHomeEditor() {
    if (!inHomeTree() || (!canAddMember() && !canPreviewHomeEdit())) return;
    if (homeEditing()) {
      homeEditor = null;
      P.render();
      document.getElementById('home-family-edit-toggle')?.focus({ preventScroll: true });
      return;
    }
    homeEditor = P.state;
    if (canAddMember()) {
      P.render();
    } else {
      // 陈家示例复用模拟账号切换，自建家庭由管理人维护族谱。
      P.changeActor('father');
      P.toast('已切换到陈远山（演示）。');
    }
    const firstAdd = document.querySelector('#home-family-view .heritage-pedigree-add');
    firstAdd?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    firstAdd?.focus({ preventScroll: true });
  }

  function addMemberButton() {
    return canAddMember() ? b(i('plus') + '添加成员', 'tree-add-member', 'heritage-text-button') : '';
  }
  function addMember(groupId = '') {
    if (!canAddMember()) return;
    const group = homeRelationGroups[groupId];
    const options = group?.choices || relations;
    const nameField = '<label class="form-field"><span>姓名或称呼</span><input name="name" placeholder="例如 陈晨" maxlength="20" required></label>';
    const relationField = `<label class="form-field"><span>对方是${e(P.PEOPLE.father.name)}的</span><select name="relation" required${group ? ' autofocus' : ''}>
      <option value="">请选择亲属关系</option>${options.map(relation => `<option>${relation}</option>`).join('')}
    </select></label>`;
    P.modal(group ? '添加' + group.label : '添加家庭成员', `<form id="tree-member-form" class="heritage-editor" data-feature-form${group ? ` data-group="${groupId}"` : ''}>
      ${group ? relationField + nameField : nameField + relationField}
      <p class="heritage-caption">先记入家谱，之后可邀请本人认领。</p>
      <p class="heritage-form-error" role="alert"></p>
      <button type="submit" class="btn full">添加到家谱</button>
    </form>`);
  }
  /** 录入族谱人物时只写入关系与姓名，认领和查看授权仍由原有邀请流程处理。 */
  function submit(form) {
    if (form.id !== 'tree-member-form') return false;
    if (!form.isConnected || !form.closest('dialog')?.open || form.featureState !== P.state || !canAddMember()) return true;
    const groupId = form.dataset.group;
    if (groupId && (!homeEditing() || !Object.hasOwn(homeRelationGroups, groupId))) return true;
    const group = homeRelationGroups[groupId];
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const relation = String(data.get('relation') || '');
    if (!name || name.length > 20 || !(group?.choices || relations).includes(relation)) {
      form.querySelector('[role="alert"]').textContent = '请填写称呼并选择亲属关系。';
      return true;
    }
    const id = P.nextId('tree-member');
    P.PEOPLE[id] = { name, relation, short: Array.from(name)[0], born: '', color: 'sand' };
    P.state.members.push(id);
    P.closeModal();
    P.render();
    if (group) {
      const nextAdd = document.querySelector(`.heritage-pedigree-add[data-group="${groupId}"]`);
      nextAdd?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      nextAdd?.focus({ preventScroll: true });
    }
    P.toast('已添加到家谱。');
    return true;
  }
  function handleAction(action, element) {
    if (action === 'tree-add-member') {
      addMember();
      return true;
    }
    if (action === 'tree-edit-home') {
      toggleHomeEditor();
      return true;
    }
    if (action === 'tree-add-relative') {
      const groupId = element.dataset.group;
      if (homeEditing() && Object.hasOwn(homeRelationGroups, groupId)) addMember(groupId);
      return true;
    }
    if (action !== 'home-family-display') return false;
    const view = element.dataset.view;
    if (P.state.route === 'home' && ['tree', 'map'].includes(view) && P.FamilyHome.member()) {
      P.state.homeFamilyDisplay = view;
      P.render();
      document.getElementById('home-family-view-switch')?.focus({ preventScroll: true });
    }
    return true;
  }
  /** 点击节点查看与这位家人关联的往事。 */
  function node(id) {
    return b(`${a(id)}<strong>${e(P.PEOPLE[id].name)}</strong><small>${e(P.relation(id,'father'))}</small>`,'house-story-person','tree-person',`data-id="${e(id)}" data-tree-member="${e(id)}" aria-label="查看${e(P.PEOPLE[id].name)}的相关往事"`);
  }
  /** 以陈远山为关系参照分组，孙辈与旁系不会误挂在某位已知子女之下。 */
  function groups() {
    const result={ancestors:[],partner:[],children:[],grandchildren:[],others:[]};
    for(const id of P.state.members){
      if(id==='father' || !P.PEOPLE[id])continue;
      const relation=P.relation(id,'father');
      if(['父亲','母亲'].includes(relation))result.ancestors.push(id);
      else if(['妻子','丈夫'].includes(relation))result.partner.push(id);
      else if(['儿子','女儿'].includes(relation))result.children.push(id);
      else if(['孙子','孙女'].includes(relation))result.grandchildren.push(id);
      else result.others.push(id);
    }
    return result;
  }
  /** 每组分别解释关系证据，避免图形连线暗示未经记录的直接血缘。 */
  function branch(ids,title,note,kind='') {
    if(!ids.length)return '';
    return `<section class="lineage-branch ${kind}"><h3>${title}</h3><div class="lineage-members">${ids.map(node).join('')}</div><p>${note}</p></section>`;
  }
  /** 动态关系图与列表读取相同成员集合，缩放和回中动作沿用原型既有契约。 */
  function view() {
    const s=P.state,g=groups();
    const center=e(P.PEOPLE.father.name);
    const ancestors=branch(g.ancestors,'上一代',`已记录与${center}的父母关系。`);
    const children=branch(g.children,'子女',`已确认是${center}的子女。`);
    const grandchildren=branch(g.grandchildren,'孙辈 · 父母资料待补充',`已确认与${center}的隔代关系。`,'lineage-indirect');
    const others=branch(g.others,'其他已确认亲属',`下方称呼以${center}为参照。`,'lineage-indirect');
    return `${addMemberButton()}<div class="family-tree"><div class="family-tree-canvas" style="zoom:${s.treeZoom || 1}"><p class="lineage-caption">以${center}为参照 · ${s.members.length} 位成员</p>${ancestors}<section class="lineage-focus"><h3>本人及配偶</h3><div class="lineage-members">${s.members.includes('father')?node('father'):''}${g.partner.length?'<span class="couple-line" aria-label="已确认配偶关系"></span>':''}${g.partner.map(node).join('')}</div></section>${children}${grandchildren}${others}</div></div><div class="tree-controls">${b('−','tree-zoom','icon-button soft','data-value="-1" aria-label="缩小关系树"')}${b('回到中心','tree-center','text-link')}${b('+','tree-zoom','icon-button soft','data-value="1" aria-label="放大关系树"')}</div>`;
  }
  P.FamilyTree={view,relations,homeEditing,homeEditControl,homeAddNode,syncHomeEditor,handleAction,submit};
}
