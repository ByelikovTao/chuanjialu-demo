/** 家庭记录共用日期校验和语音播放控件。 */
'use strict';
{
  const P = window.App, { escape: e, icon: i, button: b } = P;
  const pad = value => String(value).padStart(2, '0');

  function today() {
    const now = new Date();
    return [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
  }

  function dateParts(value = '') {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/\s+/g, '').replace(/[年月]/g, '-').replace(/日$/, '');
    const parts = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(normalized);
    if (!parts) return null;
    const [, year, month, day] = parts.map(Number);
    const iso = [parts[1], pad(month), pad(day)].join('-');
    const date = new Date(iso + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? { year, month, day, iso } : null;
  }

  function validDate(value, allowFuture = false) {
    const date = dateParts(value);
    return Boolean(date && date.iso === value && value >= '1900-01-01' && (allowFuture || value <= today()));
  }

  function displayDate(date) {
    return `${date.year} 年 ${date.month} 月 ${date.day} 日`;
  }

  /** 年月、年份和年代保留原有精度，旧照片不会因为缺少日期被排到某一天。 */
  function calendarTime(value) {
    const date = dateParts(value);
    const text = String(value ?? '').replace(/\s+/g, '');
    const period = /^([1-9]\d{3})(?:年(?:(\d{1,2})月|(代))?|[-/](\d{1,2}))?$/.exec(text);
    if (!date && !period) return null;
    const year = date?.year ?? Number(period[1]);
    const monthPart = period?.[2] || period?.[4];
    const month = date?.month ?? Number(monthPart || 0);
    const decade = Boolean(period?.[3]);
    if ((monthPart && (month < 1 || month > 12)) || (decade && year % 10 !== 0)) return null;
    const key = month ? `${year}-${pad(month)}` : decade ? `${year}-decade` : String(year);
    const label = month ? `${year} 年 ${month} 月` : decade ? `${year} 年代` : `${year} 年`;
    const order = year * 10000 + month * 100 + (date?.day || 0) - Number(decade);
    return { date, key, label, order };
  }

  function voicePlayer(src, label) {
    return `<div class="album-voice">${b(i('play') + `<span>${e(label)}</span>`, 'edition-voice', 'album-voice-button',
      `aria-pressed="false" data-voice-label="${e(label)}"`)}<audio src="${e(src)}" preload="none"></audio></div>`;
  }

  function handleAction(action, element) {
    if (action === 'edition-voice') {
      const audio = element.nextElementSibling;
      if (!audio?.matches('audio')) return true;
      if (audio.paused) void audio.play().catch(() => {
        if (audio.isConnected) P.toast('暂时无法播放这段语音，可以再试一次。');
      });
      else audio.pause();
      return true;
    }
    return false;
  }

  function syncVoice(audio, playing) {
    const control = audio.closest('.album-voice')?.querySelector('.album-voice-button');
    if (!control) return;
    control.setAttribute('aria-pressed', String(playing));
    control.querySelector('.icon').outerHTML = i(playing ? 'pause' : 'play');
    control.querySelector('span').textContent = playing ? '暂停播放' : control.dataset.voiceLabel;
  }


  document.addEventListener('play', event => syncVoice(event.target, true), true);
  for (const event of ['pause', 'ended']) document.addEventListener(event, value => syncVoice(value.target, false), true);

  P.FamilyEditions = { today, validDate, calendarTime, voicePlayer, handleAction };
}
