/** 相框提醒原型。手机端与大屏端共用会话状态，确认和延后以模拟联网状态同步。 */
'use strict';
{
  const P = window.App;
  const { escape: e, icon: i } = P;
  const minute = 60 * 1000;
  const snoozeMinutes = 10;
  const advanceMinutes = 15;
  const overdueMinutes = 15;
  const kinds = { event: '家庭安排', medicine: '吃药提醒' };
  const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayFormat = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' });

  function create(example) {
    const state = { items: [], nextId: 1, offset: 0 };
    if (example) {
      const now = Math.floor(Date.now() / minute) * minute;
      add(state, { at: now - 2 * minute, person: 'mother', kind: 'medicine', title: '吃药提醒', announced: true }, true);
      add(state, { at: now + 30 * minute, person: '', kind: 'event', title: '知夏来家里吃饭' }, true);
    }
    return state;
  }

  function add(state, fields, synced) {
    const { at } = fields;
    state.items.push({ ...fields, id: String(state.nextId++), dueAt: at, phoneAt: at, synced, confirmed: false, reported: false });
  }

  function nowAt(d) {
    return Date.now() + d.reminders.offset;
  }

  function formatAt(at, now) {
    const date = new Date(at);
    const today = new Date(now);
    const time = timeFormat.format(date);
    if (date.toDateString() === today.toDateString()) return time;
    const day = dayFormat.format(date);
    return `${date.getFullYear() === today.getFullYear() ? '' : date.getFullYear() + '年'}${day} ${time}`;
  }

  function inputValue(at) {
    const date = new Date(at);
    const digit = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${digit(date.getMonth() + 1)}-${digit(date.getDate())}T${digit(date.getHours())}:${digit(date.getMinutes())}`;
  }

  function recipients(d) {
    return P.Households.memberIds(d.residents);
  }

  function name(person) {
    return person ? P.PEOPLE[person]?.name || '家人' : '全家';
  }

  function upcoming(d, now) {
    if (!d.bound) return null;
    return d.reminders.items
      .filter(item => item.synced && !item.confirmed && item.dueAt > now)
      .sort((left, right) => left.dueAt - right.dueAt)[0];
  }

  function dueCount(d, now) {
    if (!d.bound) return 0;
    return d.reminders.items.filter(item => item.synced && !item.confirmed && item.dueAt <= now).length;
  }

  /** 同一次到点只播报一次，选择稍后提醒会开启下一次播报。 */
  function takeAnnouncements(d) {
    if (!d.bound) return [];
    const now = nowAt(d);
    const due = d.reminders.items.filter(item => item.synced && !item.confirmed && !item.announced && item.dueAt <= now);
    for (const item of due) item.announced = true;
    return due.map(item => `${name(item.person)}，${item.title}`);
  }

  function button(label, action, kind = 'secondary', attributes = '') {
    return `<button type="button" class="screen-button ${kind}" data-screen-action="${action}" ${attributes}>${label}</button>`;
  }

  function entry(d, locked) {
    const count = dueCount(d, nowAt(d));
    const badge = count ? `<small class="screen-count">${count}</small>` : '';
    return button(`${i('clock')}<span class="screen-reminder-label">提醒</span>${badge}`, 'browse-reminders',
      'plain screen-reminder-entry' + (count ? ' is-due' : ''),
      `aria-pressed="${d.browse?.type === 'reminders'}" ${locked ? 'disabled' : ''}`);
  }

  function deviceStatus(item, now) {
    if (item.confirmed) return '已确认';
    if (now >= item.dueAt) return '待确认';
    return item.dueAt !== item.at ? '已延后' : '待提醒';
  }

  function phoneStatus(d, item, now) {
    if (item.reported) return '已确认';
    if (!item.synced) return '待同步';
    if (!d.online) return '设备离线';
    if (now >= item.phoneAt + overdueMinutes * minute) return '到点未确认';
    if (now >= item.phoneAt) return '等待确认';
    return item.phoneAt !== item.at ? '已延后' : '待提醒';
  }

  function listRevision(d, now, device) {
    const items = device ? d.reminders.items.filter(item => item.synced) : d.reminders.items;
    const revisions = items.map(item => {
      const at = device ? item.dueAt : item.phoneAt;
      const status = device ? deviceStatus(item, now) : phoneStatus(d, item, now);
      return `${item.id}:${at}:${status}`;
    });
    return [d.bound, new Date(now).toDateString(), ...revisions].join('|');
  }

  function deviceItems(d, now) {
    if (!d.bound) return '<li class="screen-empty">绑定相框后，就能接收家人设置的提醒。</li>';
    const items = d.reminders.items.filter(item => item.synced)
      .sort((left, right) => Number(left.confirmed) - Number(right.confirmed) || left.dueAt - right.dueAt);
    if (!items.length) return '<li class="screen-empty">家人设置的提醒会出现在这里。</li>';
    return items.map(item => {
      const due = !item.confirmed && item.dueAt <= now;
      const attributes = `data-id="${e(item.id)}"`;
      const label = item.kind === 'medicine' ? '已吃' : '知道了';
      return `<li class="screen-agenda${due ? ' is-due' : ''}">
        <div class="screen-reminder-row-meta"><time>${e(formatAt(item.dueAt, now))}</time><span>${deviceStatus(item, now)}</span></div>
        <h3>${e(item.title)}</h3>
        <p>${e(name(item.person))}</p>
        ${due ? `<div class="screen-actions">
          ${button(label, 'ack-reminder', 'primary', attributes)}
          ${button('稍后 10 分钟', 'snooze-reminder', 'secondary', attributes)}
        </div>` : ''}
      </li>`;
    }).join('');
  }

  function screen(d, locked) {
    const now = nowAt(d);
    return `<section class="screen-reminder-board screen-browse" aria-label="提醒">
      <header class="screen-browse-header"><h3 tabindex="-1">提醒</h3>
        ${button(i('back') + '回到轮播', 'browse-back', 'secondary screen-browse-back', locked ? 'disabled' : '')}</header>
      <ul class="screen-reminder-list" data-reminder-device-list data-reminder-revision="${e(listRevision(d, now, true))}"
        aria-live="polite">${deviceItems(d, now)}</ul>
    </section>`;
  }

  function phoneItems(d, now) {
    const items = [...d.reminders.items].sort((left, right) => Number(left.reported) - Number(right.reported) || left.phoneAt - right.phoneAt);
    if (!items.length) return '<li class="screen-empty">还没有设置提醒。</li>';
    return items.map(item => `<li>
      <time>${e(formatAt(item.phoneAt, now))}</time>
      <div><strong>${e(item.title)}</strong><span>${e(name(item.person))} · ${phoneStatus(d, item, now)}</span></div>
    </li>`).join('');
  }

  function phone(d) {
    const now = nowAt(d);
    return `<div class="screen-phone-content">
      <div class="screen-actions screen-clock-actions">
        ${button('到下一条提醒', 'next-reminder', 'primary', upcoming(d, now) ? '' : 'disabled')}
        ${button('快进 15 分钟', 'advance-reminders', 'secondary', d.bound ? '' : 'disabled')}
      </div>
      <p class="screen-caption">演示时间 <time data-reminder-clock>${e(formatAt(now, Date.now()))}</time></p>
      <ul class="screen-reminders" data-reminder-phone-list data-reminder-revision="${e(listRevision(d, now, false))}"
        aria-live="polite">${phoneItems(d, now)}</ul>
      <form class="screen-reminder-form" data-screen-form="reminder">
        <strong>添加提醒</strong>
        <label class="screen-field"><span>日期和时间</span><input type="datetime-local" name="time" value="${inputValue(now + advanceMinutes * minute)}" required></label>
        <div class="screen-fields">
          <label class="screen-field"><span>类型</span><select name="kind"><option value="event">家庭安排</option><option value="medicine">吃药提醒</option></select></label>
          <label class="screen-field"><span>提醒谁</span><select name="person"><option value="">全家</option>
            ${recipients(d).map(person => `<option value="${e(person)}">${e(name(person))}</option>`).join('')}</select></label>
        </div>
        <label class="screen-field"><span>提醒内容（选填）</span><input name="title" maxlength="28" placeholder="例如：周末一起吃饭"></label>
        <button type="submit" class="screen-button primary full" ${d.bound ? '' : 'disabled'}>保存提醒</button>
      </form>
    </div>`;
  }

  /** 只更新时钟和已变化的提醒状态，保留手机端正在填写的表单。 */
  function refresh(d, root) {
    const now = nowAt(d);
    const clock = root.querySelector('[data-reminder-clock]');
    const formattedClock = formatAt(now, Date.now());
    if (clock && clock.textContent !== formattedClock) clock.textContent = formattedClock;

    const next = root.querySelector('[data-screen-action="next-reminder"]');
    if (next) next.disabled = !upcoming(d, now);

    const entryButton = root.querySelector('[data-screen-action="browse-reminders"]');
    if (entryButton) {
      const count = dueCount(d, now);
      entryButton.classList.toggle('is-due', Boolean(count));
      const badge = entryButton.querySelector('.screen-count');
      if (!count) {
        badge?.remove();
      } else if (badge) {
        if (badge.textContent !== String(count)) badge.textContent = String(count);
      } else {
        const marker = document.createElement('small');
        marker.className = 'screen-count';
        marker.textContent = String(count);
        entryButton.append(marker);
      }
    }

    const views = [
      ['[data-reminder-device-list]', deviceItems, true],
      ['[data-reminder-phone-list]', phoneItems, false]
    ];
    for (const [selector, render, onDevice] of views) {
      const list = root.querySelector(selector);
      if (!list) continue;
      const revision = listRevision(d, now, onDevice);
      // 到点时只替换列表，按键正获焦时留到下次检查再更新。
      if (list.dataset.reminderRevision !== revision && !list.contains(document.activeElement)) {
        list.innerHTML = render(d, now);
        list.dataset.reminderRevision = revision;
      }
    }
  }

  function action(d, key, id) {
    if (!d.bound) return '';
    const now = nowAt(d);
    if (key === 'next-reminder' || key === 'advance-reminders') {
      const at = key === 'next-reminder' ? upcoming(d, now)?.dueAt : now + advanceMinutes * minute;
      if (at === undefined) return '';
      d.reminders.offset += at - now;
      return '演示时间已推进到 ' + formatAt(at, now) + '。';
    }
    if (key !== 'ack-reminder' && key !== 'snooze-reminder') return '';
    const item = d.reminders.items.find(reminder => reminder.id === id);
    if (!item || !item.synced || item.confirmed || item.dueAt > now) return '';
    if (key === 'snooze-reminder') {
      item.dueAt = now + snoozeMinutes * minute;
      item.announced = false;
      if (d.online) item.phoneAt = item.dueAt;
      return '已延后至 ' + formatAt(item.dueAt, now) + '。';
    }
    item.confirmed = true;
    item.reported = d.online;
    return d.online ? '已确认，手机端可以查看。' : '相框已记下确认，联网后同步到手机。';
  }

  function submit(d, data) {
    if (!d.bound) return { error: '请先绑定相框。' };
    const read = field => String(data.get(field) || '').trim();
    const time = read('time');
    const kind = read('kind');
    const person = read('person');
    const at = Date.parse(time);
    if (!Number.isFinite(at) || inputValue(at) !== time || at <= nowAt(d)) {
      return { error: '请选择晚于演示时间的日期和时间。' };
    }
    if (!Object.hasOwn(kinds, kind)) return { error: '请选择提醒类型。' };
    if ((person || kind === 'medicine') && !recipients(d).includes(person)) {
      return { error: '请选择收到提醒的家人。' };
    }
    const title = read('title').slice(0, 28) || kinds[kind];
    add(d.reminders, { person, at, kind, title }, d.online);
    return { message: d.online ? '提醒已同步到爸妈的相框。' : '提醒待同步，联网后会送到相框。' };
  }

  function reconnect(d) {
    // 手机端先收取已送达提醒的本机回执，再展示断网期间新增的提醒。
    for (const item of d.reminders.items) {
      item.phoneAt = item.dueAt;
      item.reported = item.confirmed;
      item.synced = true;
    }
  }

  P.HouseScreenReminders = { create, entry, screen, phone, refresh, takeAnnouncements, action, submit, reconnect };
}
