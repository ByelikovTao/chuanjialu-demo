/** 按当前成员生成关系图；隔代关系单独标识，不补造尚未记录的父母。 */
'use strict';
{
  const P=window.App,{button:b,escape:e,icon:i}=P;
  const relations = ['父亲', '母亲', '儿子', '女儿', '兄弟姐妹', '妻子', '丈夫', '孙女', '孙子', '侄女', '其他家人'];
  const homeRelationGroups = {
    parents: {label: '父母', position: '上方', choices: ['父亲', '母亲']},
    partner: {
      label: '配偶', position: '侧边', choices: ['妻子', '丈夫'],
      extra: {label: '其他家人', choices: ['兄弟姐妹', '孙子', '孙女', '侄女', '其他家人']}
    },
    children: {label: '子女', position: '下方', choices: ['儿子', '女儿']}
  };
  let pedigreeEditor = null;

  function canAddMember() {
    return P.state.actor === 'father' && P.FamilyHome.member();
  }

  function onPedigreeView() {
    const {route, homeFamilyDisplay, familyTab} = P.state;
    return (route === 'home' && homeFamilyDisplay !== 'map') || (route === 'family' && familyTab === '关系树');
  }

  function canPreviewHomeEdit() {
    return P.state.route === 'home' && P.Households.isExample() && P.FamilyHome.member() &&
      P.state.members.includes('father') && Object.hasOwn(P.state.accounts, 'father');
  }

  function homeEditing() {
    return pedigreeEditor?.state === P.state && pedigreeEditor.route === P.state.route && onPedigreeView() && canAddMember();
  }

  /** 编辑状态只属于当前家庭的管理人，切页或换身份时结束。 */
  function syncHomeEditor() {
    if (pedigreeEditor && !homeEditing()) pedigreeEditor = null;
  }

  function homeEditControl() {
    if (!canAddMember() && !canPreviewHomeEdit()) return '';
    const editing = homeEditing();
    const label = editing ? '完成' : '添加成员';
    const description = canAddMember() ? '' : ' title="切换到陈远山演示添加成员"';
    return b(editing ? i('check') + label : label + i('arrow'), 'tree-edit-home',
      `heritage-text-button home-family-edit-toggle${editing ? ' is-done' : ''}`,
      `id="home-family-edit-toggle" aria-controls="home-family-view"${description}`);
  }

  function homeAddNode(groupId, position = '') {
    const group = homeRelationGroups[groupId];
    const inHome = P.state.route === 'home';
    // 侧边同时接收配偶和其他家人，短标签与完整的读屏提示分别表达。
    const caption = group.extra ? '亲属' : group.label;
    const actionLabel = inHome
      ? `添加${group.extra ? '配偶或其他亲属' : group.label}`
      : `在${group.position}添加成员`;
    const label = inHome ? `<span class="heritage-pedigree-add-label" aria-hidden="true">${e(caption)}</span>` : '';
    return b(i('plus') + label, 'tree-choose-home-relation', 'heritage-pedigree-add',
      `data-group="${groupId}" aria-label="${e(actionLabel)}" aria-haspopup="dialog" ${position}`);
  }

  function relationChoices({label, choices}) {
    const buttons = choices.map(relation => b(e(relation), 'tree-set-home-relation', 'paper-link paper-outline',
      `data-relation="${e(relation)}"`)).join('');
    return `<fieldset class="tree-relation-group">
      <legend>${e(label)}</legend><div class="tree-relation-choices">${buttons}</div>
    </fieldset>`;
  }

  /** 侧边入口同时承接其他亲属，保存后仍按实际称谓归入家谱对应分组。 */
  function canChooseRelation(groupId, relation) {
    if (!Object.hasOwn(homeRelationGroups, groupId)) return false;
    const {choices, extra} = homeRelationGroups[groupId];
    return choices.includes(relation) || Boolean(extra?.choices.includes(relation));
  }

  function chooseHomeRelation(groupId, name = '') {
    if (!homeEditing() || !Object.hasOwn(homeRelationGroups, groupId)) return;
    const group = homeRelationGroups[groupId];
    P.modal('选择亲属身份', `<div id="tree-relation-picker" data-group="${groupId}" data-name="${e(name)}">
      ${relationChoices(group)}${group.extra ? relationChoices(group.extra) : ''}
    </div>`,
      'sheet', undefined, {eyebrow: '以' + P.PEOPLE.father.name + '为参照', closeLabel: '返回家谱', familySheet: true});
    document.querySelector('#tree-relation-picker button').focus({preventScroll: true});
  }

  function toggleHomeEditor() {
    if (!onPedigreeView() || (!canAddMember() && !canPreviewHomeEdit())) return;
    if (homeEditing()) {
      pedigreeEditor = null;
      P.render();
      document.getElementById('home-family-edit-toggle')?.focus({ preventScroll: true });
      return;
    }
    pedigreeEditor = {state: P.state, route: P.state.route};
    if (canAddMember()) {
      P.render();
    } else {
      // 陈家示例复用模拟账号切换，自建家庭由管理人维护族谱。
      P.changeActor('father');
      P.toast('已切换到陈远山（演示）。');
    }
    document.getElementById('home-family-edit-toggle')?.focus({preventScroll: true});
  }

  function addMember(relation, name, groupId) {
    if (!homeEditing()) return;
    const nameField = `<label class="form-field"><span>姓名或称呼</span>
      <input name="name" value="${e(name)}" placeholder="例如 陈晨" maxlength="20" required></label>`;
    const form = `<form id="tree-member-form" class="heritage-editor" data-feature-form data-tree-relation="${e(relation)}" data-group="${e(groupId)}">
      <p class="tree-selected-relation">亲属关系 <strong>${e(relation)}</strong></p>${nameField}
      <p class="heritage-caption">先记入家谱，之后可邀请本人认领。</p>
      <p class="heritage-form-error" role="alert"></p>
      <div class="family-sheet-footer">${b('上一步', 'tree-back-home-relation', 'btn secondary')}
        <button type="submit" class="btn full">添加到家谱</button></div>
    </form>`;
    P.modal('填写成员资料', form, 'sheet', undefined, {closeLabel: '返回家谱', familySheet: true});
    document.querySelector('#tree-member-form [name="name"]').focus({preventScroll: true});
  }
  /** 录入族谱人物时只写入关系与姓名，认领和查看授权仍由原有邀请流程处理。 */
  function submit(form) {
    if (form.id !== 'tree-member-form') return false;
    if (!form.isConnected || !form.closest('dialog')?.open || form.featureState !== P.state || !homeEditing()) return true;
    const {group, treeRelation: relation} = form.dataset;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    if (!name || name.length > 20 || !canChooseRelation(group, relation)) {
      form.querySelector('[role="alert"]').textContent = '请填写称呼并选择亲属关系。';
      return true;
    }
    const id = P.nextId('tree-member');
    P.PEOPLE[id] = { name, relation, short: Array.from(name)[0], born: '', color: 'sand' };
    P.state.members.push(id);
    P.closeModal();
    P.render();
    P.FamilyHomeViews.revealPedigreeMember(document.querySelector(`[data-pedigree-person="${id}"]`));
    document.getElementById('home-family-edit-toggle')?.focus({preventScroll: true});
    P.toast('已添加到家谱。');
    return true;
  }
  function handleAction(action, element) {
    if (action === 'tree-edit-home') {
      toggleHomeEditor();
      return true;
    }
    if (action === 'tree-choose-home-relation') {
      if (element.closest('#home-family-view')) chooseHomeRelation(element.dataset.group);
      return true;
    }
    if (action === 'tree-set-home-relation') {
      const picker = element.closest('#modal[open] #tree-relation-picker');
      const groupId = picker?.dataset.group;
      const relation = element.dataset.relation;
      if (homeEditing() && canChooseRelation(groupId, relation)) {
        addMember(relation, picker.dataset.name, groupId);
      }
      return true;
    }
    if (action === 'tree-back-home-relation') {
      const form = element.closest('#modal[open] #tree-member-form[data-tree-relation]');
      if (form?.featureState === P.state) chooseHomeRelation(form.dataset.group, form.elements.namedItem('name').value);
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
  P.FamilyTree={relations,homeEditing,homeEditControl,homeAddNode,syncHomeEditor,handleAction,submit};
}
