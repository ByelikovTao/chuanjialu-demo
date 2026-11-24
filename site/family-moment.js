/** 家庭随手记。镜头和麦克风只在当前记录页面使用，保存后照片和声音随同一条往事查看。 */
'use strict';
{
  const P = window.App, { icon: i, button: b, escape: e } = P;
  const maxPhotoBytes = 8 * 1024 ** 2;
  const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  let draft;

  function isCurrent(item = draft) {
    return Boolean(item && draft === item && item.state === P.state &&
      item.actor === P.state.actor && item.hash === location.hash && P.state.route === 'house-moment');
  }

  function view(selectedMembers) {
    const form = isCurrent() ? draft.form : null;
    const data = form ? new FormData(form) : null;
    const members = data ? P.Households.memberIds(data.getAll('relatedMembers')) : selectedMembers;
    const title = `<label class="form-field"><span>标题</span>
      <input name="title" maxlength="48" value="${e(data?.get('title') || '')}" placeholder="留空时自动生成"></label>`;
    const note = '存到 ' + P.Households.current().name + ' 的往事，日期自动带入。';
    return `<div class="page house-page moment-page moment-standard">
      <p class="page-subtitle">${e(note)}</p>
      <form id="moment-form" class="house-form">
        <div class="moment-tools" data-moment-tools></div>
        <label class="text-link moment-album">从相册选<input type="file" name="photo" accept="${photoTypes.join(',')}" aria-label="从相册选照片"></label>
        <div class="moment-media" data-moment-media></div>
        <p class="caption" data-moment-status role="status"></p>
        <details class="moment-options" ${form?.querySelector('.moment-options')?.open === false ? '' : 'open'}>
          <summary>标题或关联家人（选填）</summary>
          ${title}
          ${P.Households.memberFields(members)}
        </details>
        ${P.Households.audienceFields('moment-scope', data?.get('scope') || 'private', data?.getAll('viewers') || [])}
        <button class="btn full" type="submit">保存到往事</button>
      </form>
    </div>`;
  }

  function updateSave(item) {
    const { form, phase } = item;
    const ready = item.photo || item.voice;
    form.querySelector('[type="submit"]').disabled = Boolean(phase) || !ready;
  }

  function update(item, status = '') {
    if (!isCurrent(item) || !item.form.isConnected) return;
    item.status = status;
    const { form, phase } = item;
    const canStop = phase === 'recording';
    const busy = Boolean(phase);
    form.querySelector('[data-moment-tools]').innerHTML =
      b(i('photo') + ' 拍一张', 'moment-camera', 'btn outline', busy ? 'disabled' : '') +
      b(i('mic') + (canStop ? ' 说完了' : ' 说一句'), 'moment-voice', canStop ? 'btn' : 'btn outline', busy && !canStop ? 'disabled' : '');
    const video = phase === 'camera' || phase === 'capturing';
    const media = form.querySelector('[data-moment-media]');
    media.innerHTML = video ? `<video autoplay muted playsinline aria-label="相机取景"></video>
      <div class="moment-capture-actions">${b('拍下这张', 'moment-shot', 'btn', phase === 'capturing' ? 'disabled' : '')}
      ${b('取消拍照', 'moment-cancel', 'text-link')}</div>` :
      (item.photoUrl ? `<figure><img src="${e(item.photoUrl)}" alt="待保存的家庭照片">
        <figcaption>${b('移除照片', 'moment-remove-photo', 'text-link')}</figcaption></figure>` : '') +
      (item.voiceUrl ? `<div class="moment-preview-voice"><audio src="${e(item.voiceUrl)}" controls preload="metadata" aria-label="试听这段录音"></audio>
        ${b('移除录音', 'moment-remove-voice', 'text-link', busy ? 'disabled' : '')}</div>` : '');
    if (video) media.querySelector('video').srcObject = item.camera;
    if (phase === 'recording' || phase === 'microphone' || phase === 'camera-request') {
      media.insertAdjacentHTML('beforeend', b(phase === 'camera-request' ? '取消拍照' : '取消录音', 'moment-cancel', 'text-link'));
    }
    form.querySelector('[data-moment-status]').textContent = status;
    form.elements.photo.disabled = busy;
    updateSave(item);
  }

  function stopCamera(item) {
    item.camera?.getTracks().forEach(track => track.stop());
    item.camera = null;
    item.cameraRequest = null;
  }

  function close() {
    if (!draft) return;
    const item = draft;
    draft = null;
    stopCamera(item);
    item.microphone.cancel();
    for (const url of [item.photoUrl, item.voiceUrl]) if (url) URL.revokeObjectURL(url);
  }

  function mount() {
    const form = document.getElementById('moment-form');
    if (!form || !isCurrent()) close();
    if (!form) return;
    if (!draft) {
      const item = { state: P.state, actor: P.state.actor, hash: location.hash, form, phase: '', status: '' };
      draft = item;
      item.microphone = window.FamilyVoice.create({
        onStart: () => {
          if (!isCurrent(item)) return;
          item.phase = 'recording';
          update(item, '正在录音 · 00:00，最多 1 分钟');
        },
        onTime: seconds => {
          if (!isCurrent(item) || item.phase !== 'recording') return;
          item.status = '正在录音 · ' + P.duration(seconds) + '，最多 1 分钟';
          item.form.querySelector('[data-moment-status]').textContent = item.status;
        },
        onAudio: voice => {
          if (!isCurrent(item)) return;
          if (item.voiceUrl) URL.revokeObjectURL(item.voiceUrl);
          item.voice = voice;
          item.voiceUrl = URL.createObjectURL(voice);
          item.phase = '';
          update(item, '录好了，可以先试听。');
        },
        onError: () => {
          if (!isCurrent(item)) return;
          item.phase = '';
          update(item, '麦克风暂时不可用。请允许使用麦克风后再试。');
        }
      });
    }
    draft.form = form;
    update(draft, draft.status);
  }

  function setPhoto(item, photo) {
    if (photo && (!photo.size || photo.size > maxPhotoBytes || !photoTypes.includes(photo.type))) {
      update(item, '请选择 8 MB 内的 JPG、PNG 或 WebP 照片。');
      return;
    }
    if (item.photoUrl) URL.revokeObjectURL(item.photoUrl);
    item.photo = photo;
    item.photoUrl = photo ? URL.createObjectURL(photo) : '';
    update(item);
  }

  async function openCamera(item) {
    const request = {};
    item.cameraRequest = request;
    item.phase = 'camera-request';
    update(item, '请允许使用相机。');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      if (!isCurrent(item) || item.cameraRequest !== request) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      item.camera = stream;
      item.phase = 'camera';
      update(item);
    } catch {
      if (!isCurrent(item) || item.cameraRequest !== request) return;
      stopCamera(item);
      item.phase = '';
      update(item, '相机暂时不可用，可以从相册选照片。');
    }
  }

  function takePhoto(item) {
    const video = item.form.querySelector('video');
    if (!video?.videoWidth || video.readyState < 2) return P.toast('相机正在准备，请稍候。');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const request = item.cameraRequest;
    item.phase = 'capturing';
    update(item, '正在保存这张照片…');
    canvas.toBlob(photo => {
      if (!isCurrent(item) || item.cameraRequest !== request) return;
      stopCamera(item);
      item.phase = '';
      if (photo) setPhoto(item, photo);
      else update(item, '照片暂未保存，可以再拍一次。');
    }, 'image/jpeg', 0.88);
  }

  function handleAction(action) {
    if (!action.startsWith('moment-')) return false;
    if (!isCurrent()) return true;
    const item = draft;
    if (action === 'moment-cancel') {
      stopCamera(item);
      item.microphone.cancel();
      item.phase = '';
      update(item);
    } else if (action === 'moment-camera' && !item.phase) {
      void openCamera(item);
    } else if (action === 'moment-shot' && item.phase === 'camera') {
      takePhoto(item);
    } else if (action === 'moment-voice' && item.phase === 'recording') {
      item.phase = 'finishing';
      update(item, '正在准备试听…');
      item.microphone.stop();
    } else if (action === 'moment-voice' && !item.phase) {
      item.phase = 'microphone';
      update(item, '请允许使用麦克风。');
      void item.microphone.start();
    } else if (action === 'moment-remove-photo' && !item.phase) {
      setPhoto(item, null);
    } else if (action === 'moment-remove-voice' && !item.phase) {
      URL.revokeObjectURL(item.voiceUrl);
      item.voiceUrl = '';
      item.voice = null;
      update(item);
    }
    return true;
  }

  function submit(form) {
    if (form.id !== 'moment-form') return false;
    if (!isCurrent() || draft.form !== form || draft.phase) return true;
    const item = draft;
    const textTitle = form.elements.title.value.trim();
    if (!item.photo && !item.voice) {
      P.toast('先拍一张照片，或录一句话。');
      return true;
    }
    const bytes = item.photo?.size || 0;
    if (!P.Households.canUpload(bytes + (item.voice?.size || 0))) {
      P.toast('当前家庭空间不足，已保留照片和录音。');
      return true;
    }
    const data = new FormData(form);
    const audience = P.Households.recordAudience(data);
    if (!audience) return true;
    const title = textTitle || '今天' + (item.photo ? '的一张照片' : '的一段语音');
    const houseVoice = item.voice ? { url: item.voiceUrl, bytes: item.voice.size } : undefined;
    const photoUrl = item.photoUrl || '';
    // 保存时把媒体地址交给原往事，离开编辑页只清理未保存的临时资源。
    item.photoUrl = item.voiceUrl = '';
    close();
    P.Households.saveStory({ title, text: [], photoUrl, bytes, houseVoice,
      eventDate: P.FamilyEditions.today(), moment: true, replaceComposer: true,
      relatedMembers: data.getAll('relatedMembers'), ...audience });
    return true;
  }

  function playback(story) {
    if (!story.houseVoice) return '';
    const label = story.houseVoice.sample ? '合成示例语音' : '记录时的原声';
    return `<div class="moment-story-voice section"><p class="caption">${label}</p>
      <audio controls preload="metadata" src="${e(story.houseVoice.url)}" aria-label="${label}"></audio></div>`;
  }

  document.addEventListener('change', event => {
    const input = event.target;
    if (!isCurrent() || input.form !== draft.form || input.name !== 'photo') return;
    const file = input.files[0];
    if (file && !draft.phase) setPhoto(draft, file);
    input.value = '';
  });
  document.addEventListener('input', event => {
    if (isCurrent() && event.target.form === draft.form && ['title', 'lifeMilestone'].includes(event.target.name)) updateSave(draft);
  });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
  P.FamilyMoment = { view, mount, handleAction, submit, playback };
}
