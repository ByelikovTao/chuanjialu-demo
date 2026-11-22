/** 免登录的照片收件页，录音和回复都绑定当前分享链接。 */
'use strict';
{
  const store = window.PhotoInvites;
  const content = document.getElementById('photo-content');
  const announcement = document.getElementById('photo-announcement');
  const samplePhoto = 'assets/zhumen/life-wedding-demo.webp';
  const sampleAudio = 'assets/photo-card/sample-reply.wav';
  let screen = {};
  let guest;
  let guestView = 'idle';
  let voice;
  let replyText = '';
  let requestId = '';
  let busy = false;
  let renderVersion = 0;
  let urls = [];
  const microphone = window.FamilyVoice.create({
    onStart: () => {
      guestView = 'recording';
      drawGuest();
    },
    onTime: seconds => {
      const clock = document.getElementById('photo-record-time');
      if (clock) clock.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    },
    onAudio: audio => {
      voice = { audio };
      requestId = store.token();
      guestView = 'preview';
      drawGuest();
    },
    onError: recordingUnavailable
  });

  function escape(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function blobUrl(blob) {
    const url = URL.createObjectURL(blob);
    urls.push(url);
    return url;
  }

  function mount(markup) {
    for (const url of urls.splice(0)) URL.revokeObjectURL(url);
    content.innerHTML = typeof markup === 'function' ? markup() : markup;
    content.setAttribute('aria-busy', 'false');
  }

  function say(message) {
    const status = document.getElementById('photo-page-status');
    if (status) {
      status.textContent = message;
      status.hidden = !message;
    }
    announcement.textContent = message;
  }

  function page(title, markup) {
    return `<section class="photo-page"><h1>${title}</h1>${markup}<p class="photo-card photo-caption" id="photo-page-status" hidden></p></section>`;
  }

  function button(label, action, extra = '') {
    return `<button type="button" class="photo-button ${extra}" data-photo-action="${action}">${label}</button>`;
  }

  function plain(label, action) {
    return `<button type="button" class="photo-link" data-photo-action="${action}">${label}</button>`;
  }

  function picture(photo) {
    const src = photo instanceof Blob ? blobUrl(photo) : [store.growthPhoto, store.elderPhoto].includes(photo) ? photo : samplePhoto;
    return `<figure class="photo-frame"><img src="${escape(src)}" alt="这次分享的家庭照片"></figure>`;
  }

  function question(text) {
    return `<div class="photo-question"><span class="photo-question-label">家人想问</span>${escape(text)}</div>`;
  }

  function audio(reply) {
    return `<audio controls preload="metadata" aria-label="家人的语音" src="${escape(reply.sample ? sampleAudio : blobUrl(reply.audio))}"></audio>`;
  }

  function endSharing() {
    cancelRecording();
    guest = null;
    voice = null;
    replyText = '';
    mount(page('这张照片暂时打不开', '<p class="photo-caption">链接可能已撤回，或在别的浏览器创建。你可以请家人再发一次。</p>'));
  }

  function drawGuest() {
    if (!guest) return;
    mount(() => {
      let controls;
      switch (guestView) {
        case 'asking':
          controls = '<p class="photo-caption" role="status">请允许使用麦克风，随后就可以说话。</p>' + plain('取消', 'cancel-record');
          break;
        case 'recording':
          controls = '<p class="photo-record-time" id="photo-record-time">0:00</p><p class="photo-caption">正在录音，慢慢说。最多 1 分钟。</p>' +
            button('说完了', 'stop', 'large') + plain('取消这段录音', 'cancel-record');
          break;
        case 'preview':
          controls = ' <div class="photo-card"><strong>刚才说的这段</strong>' + audio(voice) + '</div>' +
            button('发送给家人', 'send-voice', 'large') + plain('重说一次', 'record');
          break;
        case 'text':
          controls = `<form class="photo-form" id="photo-reply-text"><label><span>写一句想告诉家人的话</span><textarea name="text" maxlength="300" rows="3" required>${escape(replyText)}</textarea></label>
            <button type="submit" class="photo-button large">发送给家人</button></form>${plain('改用语音', 'record')}`;
          break;
        case 'sent':
          controls = '<div class="photo-card photo-success"><h2>已经发给家人了</h2><p>家人会在这张照片下面收到你的回复。</p></div>';
          break;
        default:
          controls = button('说两句', 'record', 'large') + plain('打字回复', 'type') +
            `<details class="photo-caption"><summary>演示辅助</summary>${plain('使用一段示例语音', 'sample-voice')}</details>`;
      }
      const audience = guestView === 'sent' ? '' : '<p class="photo-caption">回复留在这张照片下，发起人和获授权的家人可以回看。</p>';
      return page('家里的一张照片', picture(guest.photo) + question(guest.question) + audience + '<div class="photo-stack">' + controls + '</div>');
    });
  }

  function cancelRecording() {
    microphone.cancel();
  }

  function recordingUnavailable() {
    guestView = 'idle';
    drawGuest();
    const message = /MicroMessenger/i.test(navigator.userAgent)
      ? '如果微信里录不了音，点右上角「…」，用浏览器打开这张照片再录。也可以打字回复。'
      : '麦克风暂时不可用。请允许浏览器使用麦克风，也可以打字回复。';
    say(store.network ? message : '麦克风暂时不可用。可以打字回复，或用示例语音体验。');
  }

  function startRecording() {
    if (!guest || guestView === 'asking' || guestView === 'recording') return;
    guestView = 'asking';
    drawGuest();
    void microphone.start();
  }

  // 尽量上传单声道 WAV，让不同手机能播放同一段原声。解码失败时保留浏览器录下的原文件。
  async function portableAudio(blob) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !window.OfflineAudioContext) return blob;
    let context;
    try {
      context = new AudioContext();
      const decoded = await context.decodeAudioData(await blob.arrayBuffer());
      const rate = 16000;
      const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
      const source = offline.createBufferSource();
      source.buffer = decoded;
      source.connect(offline.destination);
      source.start();
      const samples = (await offline.startRendering()).getChannelData(0);
      const bytes = new DataView(new ArrayBuffer(44 + samples.length * 2));
      const write = (offset, value) => {
        for (let index = 0; index < value.length; index++) bytes.setUint8(offset + index, value.charCodeAt(index));
      };
      write(0, 'RIFF');
      bytes.setUint32(4, bytes.byteLength - 8, true);
      write(8, 'WAVEfmt ');
      bytes.setUint32(16, 16, true);
      bytes.setUint16(20, 1, true);
      bytes.setUint16(22, 1, true);
      bytes.setUint32(24, rate, true);
      bytes.setUint32(28, rate * 2, true);
      bytes.setUint16(32, 2, true);
      bytes.setUint16(34, 16, true);
      write(36, 'data');
      bytes.setUint32(40, bytes.byteLength - 44, true);
      for (let index = 0; index < samples.length; index++) {
        const sample = Math.max(-1, Math.min(1, samples[index]));
        bytes.setInt16(44 + index * 2, sample * (sample < 0 ? 32768 : 32767), true);
      }
      return new Blob([bytes.buffer], { type: 'audio/wav' });
    } catch {
      return blob;
    } finally {
      if (context) void context.close().catch(() => {});
    }
  }

  // 页面切换可能发生在数据库读取或麦克风授权期间，只让当前地址继续更新页面。
  async function openScreen() {
    const version = ++renderVersion;
    const [route, key = '', extra] = location.hash.slice(1).split('/');
    if (route !== 'reply') {
      location.replace(new URL('index.html#house-record/photo', location.href).href);
      return;
    }
    cancelRecording();
    guest = null;
    voice = null;
    guestView = 'idle';
    replyText = '';
    requestId = '';
    screen = { key };
    try {
      const card = extra === undefined ? await store.guest(key) : null;
      if (version !== renderVersion) return;
      if (!card) return endSharing();
      guest = card;
      drawGuest();
    } catch {
      if (version === renderVersion) mount(page('暂时无法打开', '<p class="photo-caption">当前浏览器无法读取分享，请家人再发一次。</p>'));
    }
  }

  async function refresh() {
    if (!guest) return;
    const current = screen;
    try {
      const active = await store.guest(current.key, false);
      if (screen === current && !active) endSharing();
    } catch {
      if (screen === current) say('暂时没有刷新，可以稍后再试。');
    }
  }

  async function sendReply(reply) {
    if (!guest || busy) return;
    busy = true;
    const current = screen;
    requestId ||= store.token();
    try {
      const key = guest.token;
      if (store.network && reply.audio && reply.audio.type !== 'audio/wav') {
        say('正在发送语音…');
        reply.audio = await portableAudio(reply.audio);
        if (screen !== current || !guest) return;
      }
      const saved = await store.reply(key, { ...reply, id: requestId });
      if (screen !== current) return;
      if (!saved || !guest) return endSharing();
      voice = null;
      replyText = '';
      guestView = 'sent';
      drawGuest();
      announcement.textContent = '已经发给家人了';
    } catch {
      say('这次没发出去，内容还在，可以再试一次。');
    } finally {
      busy = false;
    }
  }

  content.addEventListener('click', event => {
    const control = event.target.closest('[data-photo-action]');
    if (!control || busy) return;
    switch (control.dataset.photoAction) {
      case 'record': startRecording(); break;
      case 'stop': microphone.stop(); break;
      case 'cancel-record': cancelRecording(); guestView = 'idle'; drawGuest(); break;
      case 'type': requestId = ''; guestView = 'text'; drawGuest(); break;
      case 'sample-voice': voice = { sample: true }; requestId = store.token(); guestView = 'preview'; drawGuest(); break;
      case 'send-voice': if (voice) void sendReply(voice); break;

    }
  });

  content.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'photo-reply-text') {
      const text = form.elements.text.value.trim();
      if (text) void sendReply({ text });
      else say('写一句话就可以发送。');
    }
  });

  content.addEventListener('input', event => {
    if (event.target.form?.id === 'photo-reply-text') replyText = event.target.value;
  });

  window.addEventListener('hashchange', () => { void openScreen(); });
  window.addEventListener('focus', () => { void refresh(); });
  window.addEventListener('pagehide', cancelRecording);
  window.addEventListener('pageshow', event => { if (event.persisted) void openScreen(); });
  store.subscribe(() => { void refresh(); });
  setInterval(() => { if (!document.hidden) void refresh(); }, 2000);
  void openScreen();
}
