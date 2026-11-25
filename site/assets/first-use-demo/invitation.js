(function () {
  'use strict';

  const RELATIONS = {
    父亲: 'parents',
    母亲: 'parents',
    妻子: 'peers',
    丈夫: 'peers',
    兄弟姐妹: 'peers',
    儿子: 'children',
    女儿: 'children',
    孙女: 'other',
    孙子: 'other',
    侄女: 'other',
    其他家人: 'other'
  };
  const GENERATIONS = ['parents', 'peers', 'children', 'other'];
  const ERROR_ID = 'family-invite-error';
  const MOBILE_NUMBER = /^1[3-9]\d{9}$/u;
  const NAME_LIMIT = 24;
  let actions;

  function makeNode(name, relationship, owner = false) {
    const node = document.createElement('li');
    node.className = 'invitation-tree-node';
    node.classList.toggle('invitation-tree-owner', owner);
    const label = document.createElement('strong');
    label.textContent = name;
    const relation = document.createElement('span');
    relation.className = 'note';
    relation.textContent = relationship;
    node.append(label, relation);
    return node;
  }

  function treeContent(ownerName, members) {
    const tree = document.createElement('div');
    tree.className = 'invitation-tree';
    const rows = new Map(GENERATIONS.map((generation) => {
      const row = document.createElement('ul');
      row.className = 'invitation-tree-row';
      row.dataset.generation = generation;
      return [generation, row];
    }));
    rows.get('peers').append(makeNode(ownerName || '我', '创建者', true));
    for (const member of members) {
      // 只确定已知的相对位置，隔代或旁系归入其他家人，不推断缺失节点。
      const generation = RELATIONS[member.relation] || 'other';
      rows.get(generation).append(makeNode(member.name, member.relation));
    }
    for (const row of rows.values()) {
      if (row.childElementCount) {
        tree.append(row);
      }
    }
    return tree;
  }

  function showMessage(form, message = '', field = null) {
    const error = form.querySelector('#' + ERROR_ID);
    error.textContent = message;
    error.hidden = !message;
    form.querySelector('[aria-invalid="true"]')?.removeAttribute('aria-invalid');
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus({ preventScroll: true });
    }
  }

  function normalizedPhone(value) {
    return value.trim().replace(/^\+86\s*/u, '').replace(/[\s-]+/gu, '');
  }

  async function saveInvitation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const snapshot = actions.getSnapshot();
    const ownerField = form.elements.creatorName;
    const nameField = form.elements.memberName;
    const phoneField = form.elements.phone;
    const relationField = form.elements.relation;
    const ownerName = snapshot.profileName?.trim() || ownerField.value.trim();
    const name = nameField.value.trim();
    const phone = normalizedPhone(phoneField.value);
    const relation = relationField.value;

    if (!ownerName || ownerName.length > NAME_LIMIT) {
      showMessage(form, '请填写你的姓名。', ownerField);
      return;
    }
    if (!name || name.length > NAME_LIMIT) {
      showMessage(form, '请填写家人的姓名。', nameField);
      return;
    }
    if (!MOBILE_NUMBER.test(phone)) {
      showMessage(form, '请输入 11 位中国大陆手机号。', phoneField);
      return;
    }
    if (!Object.hasOwn(RELATIONS, relation)) {
      showMessage(form, '请选择这位家人和你的关系。', relationField);
      return;
    }

    let duplicate = false;
    const addInvitation = (current) => {
      const invitations = current.invitations || [];
      // 在写入事务中复核手机号，避免不同演示页同时生成同一份邀请。
      duplicate = invitations.some((invitation) => invitation.phone === phone);
      if (duplicate) {
        return current;
      }
      return {
        ...current,
        profileName: current.profileName || ownerName,
        invitations: [...invitations, {
          id: 'family-invite-' + (invitations.length + 1),
          name,
          phone,
          relation,
          status: 'pending'
        }]
      };
    };
    if (!(await actions.persist(addInvitation, ERROR_ID, form.querySelector('#family-invite-submit')))) {
      return;
    }
    if (duplicate) {
      showMessage(form, '这个手机号已有一份邀请。', phoneField);
      return;
    }
    actions.onChanged();
    render();
  }

  function renderForm(page, snapshot) {
    const hasInvitations = Boolean(snapshot.invitations?.length);
    page.innerHTML = `
      <header class="page-heading">
        <h1 id="family-invite-title" tabindex="-1">${hasInvitations ? '邀请家人' : '邀请第一位家人'}</h1>
        <p class="intro">邀请家人一起记录。对方确认后，会按你选的关系出现在家谱里。</p>
      </header>
      <form class="form-page" id="family-invite-form" novalidate>
        <div class="field" id="invite-creator-field" hidden>
          <label for="invite-creator-name">你的姓名</label>
          <input id="invite-creator-name" name="creatorName" autocomplete="name" maxlength="${NAME_LIMIT}" required disabled>
          <p class="note">家人看到邀请时，会看到这个名字。</p>
        </div>
        <div class="field">
          <label for="invite-family-member-name">家人姓名</label>
          <input id="invite-family-member-name" name="memberName" autocomplete="section-invitee name" maxlength="${NAME_LIMIT}" required>
        </div>
        <div class="field">
          <label for="invite-family-member-phone">手机号</label>
          <input id="invite-family-member-phone" name="phone" type="tel" inputmode="tel" autocomplete="section-invitee tel-national"
            maxlength="20" placeholder="中国大陆手机号" required>
        </div>
        <div class="field">
          <label for="invite-family-member-relation">对方是我的</label>
          <select id="invite-family-member-relation" name="relation" required>
            <option value="">选择亲属关系</option>
            ${Object.keys(RELATIONS).map((relation) => `<option>${relation}</option>`).join('')}
          </select>
        </div>
        <section class="invitation-preview" aria-labelledby="invite-family-preview-title">
          <h2 id="invite-family-preview-title">家谱位置预览</h2>
          <p class="note" id="invite-family-preview-hint">选择关系后，可以看到家人在家谱里的位置。</p>
          <div id="invite-family-preview"></div>
        </section>
        <p id="${ERROR_ID}" class="notice" role="alert" hidden></p>
        <button id="family-invite-submit" class="button primary" type="submit">生成演示邀请</button>
      </form>`;
    const form = page.querySelector('#family-invite-form');
    if (!snapshot.profileName?.trim()) {
      page.querySelector('#invite-creator-field').hidden = false;
      form.elements.creatorName.disabled = false;
    }
    const preview = page.querySelector('#invite-family-preview');
    const hint = page.querySelector('#invite-family-preview-hint');
    const updatePreview = () => {
      const creator = snapshot.profileName || form.elements.creatorName.value.trim();
      const relation = form.elements.relation.value;
      const member = {
        name: form.elements.memberName.value.trim() || '家人',
        relation
      };
      hint.hidden = Boolean(relation);
      preview.replaceChildren(treeContent(creator, relation ? [member] : []));
    };
    form.addEventListener('input', (event) => {
      showMessage(form);
      if (event.target !== form.elements.phone) {
        updatePreview();
      }
    });
    form.addEventListener('submit', saveInvitation);
    updatePreview();
  }

  function maskedPhone(phone) {
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  async function acceptInvitation(invitation, button) {
    const markAccepted = (current) => ({
      ...current,
      invitations: current.invitations.map((item) => {
        if (item.id === invitation.id && item.status === 'pending') {
          return { ...item, status: 'accepted' };
        }
        return item;
      })
    });
    if (await actions.persist(markAccepted, ERROR_ID, button)) {
      actions.onChanged();
      render();
    }
  }

  function renderStatus(page, snapshot, invitation) {
    const waiting = invitation.status === 'pending';
    page.innerHTML = `
      <header class="page-heading">
        <h1 id="family-invite-title" tabindex="-1">${waiting ? '邀请已生成' : '家人已加入'}</h1>
        <p class="intro">${waiting ? '这份邀请已保存，可以模拟家人确认加入。' : '你邀请的家人已加入，关系已经显示在家谱中。'}</p>
      </header>
      <section class="invitation-preview" aria-label="邀请信息">
        <div class="invitation-summary">
          <h2 id="family-invite-recipient"></h2>
          <span class="invitation-state">${waiting ? '待加入' : '已加入'}</span>
        </div>
        <p class="note" id="family-invite-details"></p>
        <div id="invite-family-preview"></div>
      </section>
      <p id="${ERROR_ID}" class="notice" role="alert" hidden></p>
      <button id="${waiting ? 'simulate-family-accept' : 'continue-family-invite'}" class="button primary" type="button">${waiting ? '模拟接受邀请' : '继续邀请家人'}</button>`;
    page.querySelector('#family-invite-recipient').textContent = invitation.name;
    page.querySelector('#family-invite-details').textContent = invitation.relation + ' · ' + maskedPhone(invitation.phone);
    page.querySelector('#invite-family-preview').append(treeContent(snapshot.profileName, [invitation]));
    const button = page.querySelector('button');
    button.addEventListener('click', () => {
      if (waiting) {
        void acceptInvitation(invitation, button);
      } else {
        renderForm(page, actions.getSnapshot());
        focusTitle(page);
      }
    });
  }

  function focusTitle(page) {
    if (!page.hidden) {
      page.closest('main').scrollTop = 0;
      page.querySelector('#family-invite-title').focus({ preventScroll: true });
    }
  }

  function render() {
    const page = document.getElementById('family-invite-page');
    const snapshot = actions.getSnapshot();
    if (!snapshot) {
      page.replaceChildren();
      return;
    }
    const invitations = snapshot.invitations || [];
    const invitation = invitations.find((item) => item.status === 'pending') || invitations.at(-1);
    if (invitation) {
      renderStatus(page, snapshot, invitation);
    } else {
      renderForm(page, snapshot);
    }
    focusTitle(page);
  }

  window.firstUseInvitations = {
    bind(options) {
      actions = options;
    },
    render
  };
}());
