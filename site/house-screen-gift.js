/** 子女在自己的手机端挑首批照片、留祝福，再把准备好的礼物交给爸妈。 */
'use strict';
{
  const P = window.App;
  const e = P.escape;

  function button(label, action, kind = 'secondary', disabled = false) {
    return `<button type="button" class="screen-button ${kind}" data-gift-action="gift-${action}"${disabled ? ' disabled' : ''}>${label}</button>`;
  }

  function create({ stories, importPhotos, deliver, openDevice, refresh, readGift }) {
    const selected = new Set();
    let coverId = '';
    let note = '';
    let audio = null;
    let previewUrl = '';
    let phase = '';
    let status = '';
    let recordingStatus = '';
    let importing = false;
    let disposed = false;
    let savedCount = 0;

    // 草稿的试听地址只归子女端所有。确认预装后，屏端从同一份录音单独建立播放地址。
    function clearAudio() {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      audio = null;
    }

    // 只回填当前送礼人已确认的内容。进入编辑后使用独立草稿，翻页或轮播不会覆盖输入。
    function restoreGift(gift) {
      selected.clear();
      for (const id of gift?.ids || []) selected.add(id);
      coverId = gift?.coverId || '';
      note = gift?.note || '';
      const savedAudio = gift?.audio || null;
      if (audio !== savedAudio) {
        clearAudio();
        audio = savedAudio;
        if (audio) previewUrl = URL.createObjectURL(audio);
      }
      savedCount = selected.has(coverId) ? selected.size : 0;
      recordingStatus = '';
    }

    if (readGift) restoreGift(readGift());

    const microphone = window.FamilyVoice.create({
      onStart() {
        if (disposed) return;
        phase = 'recording';
        recordingStatus = '正在录音，最多可以说 60 秒。';
        refresh();
      },
      onTime(seconds) {
        if (disposed || phase !== 'recording') return;
        const label = document.querySelector('#house-screen-demo [data-gift-timer]');
        if (label) label.textContent = `已录 ${seconds} 秒`;
      },
      onAudio(blob) {
        if (disposed) return;
        clearAudio();
        audio = blob;
        previewUrl = URL.createObjectURL(blob);
        phase = '';
        recordingStatus = '祝福录好了，可以先听一遍。';
        refresh();
      },
      onError() {
        if (disposed) return;
        phase = '';
        recordingStatus = '这次没有录到声音。可以再试一次，也可以写下祝福。';
        refresh();
      }
    });

    function render(managementRoute) {
      const photos = stories();
      const available = new Set(photos.map(photo => photo.id));
      if (savedCount && readGift) restoreGift(readGift());
      // 同一条往事的授权可能在别处被收窄，草稿里随即撤下该照片并重新选择封面。
      for (const id of selected) if (!available.has(id)) selected.delete(id);
      if (savedCount) savedCount = selected.has(coverId) ? selected.size : 0;
      if (!selected.has(coverId)) coverId = selected.values().next().value || '';
      if (savedCount) {
        return `<div class="screen-phone-content screen-gift-saved">
          <h3>给爸妈的相框准备好了</h3><p>首批 ${savedCount} 张照片已装入相框。</p>
          ${button('看爸妈打开相框的样子', 'open', 'primary full')}
          ${button('调整这份礼物', 'edit', 'plain')}
          ${P.link('去相框管理', managementRoute, 'screen-button plain')}
        </div>`;
      }
      const selectedPhotos = photos.filter(photo => selected.has(photo.id));
      return `<div class="screen-phone-content screen-gift-panel">
        <h3>装进相框的第一批照片</h3>
        <label class="screen-field screen-gift-import"><span>从手机相册多选照片</span>
          <input type="file" name="gift-files" accept="image/jpeg,image/png,image/webp" multiple${importing ? ' disabled' : ''}>
          <small>JPG、PNG 或 WebP，每张最多 8 MB。</small></label>
        ${photos.length ? `<div class="screen-gift-photos" role="group" aria-label="挑要装进相框的照片">${photos.map(photo =>
          `<label class="screen-gift-photo"><input type="checkbox" name="gift-photo" value="${e(photo.id)}"${selected.has(photo.id) ? ' checked' : ''}>
            <img src="${e(photo.houseImage)}" alt=""><span>${e(photo.title)}</span></label>`).join('')}</div>` : ''}
        ${selectedPhotos.length ? `<label class="screen-field"><span>爸妈开机先看哪张</span><select name="gift-cover">${selectedPhotos.map(photo =>
          `<option value="${e(photo.id)}"${photo.id === coverId ? ' selected' : ''}>${e(photo.title)}</option>`).join('')}</select></label>` : ''}
        <label class="screen-field"><span>给爸妈写句话（选填）</span>
          <input name="gift-note" maxlength="80" value="${e(note)}" placeholder="爸，生日快乐！看看我给你翻出来的老照片。"></label>
        <div class="screen-gift-greeting">
          ${previewUrl ? `<audio controls preload="metadata" aria-label="试听给爸妈的祝福" src="${e(previewUrl)}"></audio>` : ''}
          <div class="screen-actions">${phase ? `${phase === 'recording' ? button('说完了', 'stop') : ''}${button('取消录音', 'cancel', 'plain')}` :
            `${button(previewUrl ? '重新录祝福' : '录一句祝福', 'record')}${previewUrl ? button('移除录音', 'remove', 'plain') : ''}`}</div>
          ${recordingStatus ? `<p class="screen-caption" role="status">${e(recordingStatus)}</p>` : ''}
          ${phase === 'recording' ? '<span class="screen-caption" data-gift-timer></span>' : ''}
        </div>
        ${importing || status ? `<p class="screen-caption" role="status">${e(importing ? '正在读取选中的照片…' : status)}</p>` : ''}
        <p class="screen-caption">确认后，选中的照片也会存为全家可见的往事。</p>
        ${button(selected.size ? `把这 ${selected.size} 张装进相框` : '把选好的照片装进相框', 'save', 'primary full', !selected.size || importing || Boolean(phase))}
      </div>`;
    }

    function suspend() {
      if (!phase) return;
      microphone.cancel();
      phase = '';
      recordingStatus = '已取消这次录音。';
    }

    function click(action) {
      if (disposed) return;
      switch (action) {
        case 'gift-record':
          if (phase) return;
          phase = 'requesting';
          recordingStatus = '请允许使用麦克风。';
          refresh();
          microphone.start();
          return;
        case 'gift-stop':
          if (phase !== 'recording') return;
          phase = 'stopping';
          recordingStatus = '正在保存这段祝福。';
          microphone.stop();
          break;
        case 'gift-cancel':
          suspend();
          break;
        case 'gift-remove':
          clearAudio();
          recordingStatus = '';
          break;
        case 'gift-save': {
          if (savedCount || !selected.size || importing || phase) return;
          const ids = [...selected];
          if (deliver({ ids, coverId, note: note.trim(), audio })) {
            savedCount = ids.length;
            status = '';
          } else {
            status = '照片还没有装好，请查看相框上的提示。';
          }
          break;
        }
        case 'gift-edit':
          savedCount = 0;
          break;
        case 'gift-open':
          openDevice();
          return;
        default:
          return;
      }
      refresh();
    }

    async function change(target) {
      if (disposed) return;
      if (target.name === 'gift-files') {
        const files = Array.from(target.files || []);
        if (!files.length || importing) return;
        importing = true;
        status = '';
        refresh();
        try {
          const { photos, rejected } = await importPhotos(files);
          if (disposed) return;
          for (const photo of photos) selected.add(photo.id);
          const skipped = Array.isArray(rejected) ? rejected.length : rejected;
          status = skipped ? `已选 ${photos.length} 张，另有 ${skipped} 张未能读取。可改选 JPG 或 PNG 照片。` : `已选入 ${photos.length} 张照片。`;
        } catch {
          if (disposed) return;
          status = '照片未能读取，请重新选择。';
        } finally {
          importing = false;
        }
      } else if (target.name === 'gift-photo') {
        if (target.checked) selected.add(target.value);
        else selected.delete(target.value);
        status = '';
      } else if (target.name === 'gift-cover' && selected.has(target.value)) {
        coverId = target.value;
      } else {
        return;
      }
      refresh();
    }

    function input(target) {
      if (!disposed && target.name === 'gift-note') note = target.value.slice(0, 80);
    }

    function dispose() {
      disposed = true;
      microphone.cancel();
      clearAudio();
    }

    return { render, click, change, input, suspend, dispose };
  }

  P.HouseScreenGift = { create };
}
