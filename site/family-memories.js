/** 家人补充的照片与对应影片关联，由影片本人处理。 */
'use strict';
{
  const P=window.App,{escape:e,button:b,link:l}=P;
  const FILM_PHOTO_TYPES=['image/jpeg','image/png','image/webp'];
  const FILM_PHOTO_MAX_BYTES=10*1024*1024;
  const FILM_PHOTO_NOTE_LIMIT=120;

  /** 只显示当前账号提交的进度和本人要处理的照片，不暴露其他家人的待核对资料。 */
  function filmPhotoTasks(filmId) {
    const {actor,materialSubmissions}=P.state;
    return materialSubmissions.filter(item=>item.draft.relatedFilmId===filmId&&(
      item.subject===actor&&item.status==='pending'||item.author===actor&&['pending','returned'].includes(item.status)
    ));
  }

  /** 已归档照片仍受原影片和照片各自的查看权限约束，提交快照不对其他家人展示。 */
  function filmPhotos(filmId) {
    P.PersonArchive.assets(P.state.actor,'photo');
    return P.state.archiveAssets.filter(item=>item.relatedFilmId&&(!filmId||item.relatedFilmId===filmId)&&item.inArchive!==false&&P.PersonArchive.getItem(item.relatedFilmId)&&P.FamilyContext.readable(item));
  }

  function filmPhotoCards(items) {
    return items.map(item=>`<figure class="film-photo-card"><img src="${e(item.poster)}" alt="家人补充的老照片" loading="lazy"><figcaption>${e(P.PEOPLE[item.author].name)}补充${item.description?`<p>${e(item.description)}</p>`:''}${l('查看照片','archive-item/'+item.id,'text-link')}</figcaption></figure>`).join('');
  }

  /** 影片主人只看到核对入口，家人只填一张照片和可选说明。 */
  function filmContribution(film) {
    if(film?.kind!=='film'||!P.PersonArchive.getItem(film.id))return '';
    const actor=P.state.actor,tasks=filmPhotoTasks(film.id),photos=filmPhotos(film.id);
    const received=photos.length?`<h3>家人补的照片</h3>${filmPhotoCards(photos)}`:'';
    if(actor===film.subject){
      const pending=tasks.map(item=>b(`核对${e(P.PEOPLE[item.author]?.name || '家人')}补的照片`, 'material-inspect', 'btn secondary full', `data-id="${e(item.id)}"`));
      return pending.length||photos.length?`<section class="film-photo-section section" aria-label="家人补的照片">
        ${pending.length ? `<div class="stack">${pending.join('')}</div>` : ''}${received}
      </section>`:'';
    }
    if(!P.MaterialLibrary.filmForContribution(film.id))return '';
    const waiting = tasks.some(item => item.status === 'pending');
    const status = waiting ? '已提交的照片正在等本人核对。' : tasks.length ? '有一张照片需要更正。' : '如果你也记得影片里的事，可以补一张有关的照片。';
    const progress = tasks.length ? b('查看照片提交进度', 'film-photo-progress', 'text-link full', `data-stage="${waiting ? 'pending' : 'drafts'}"`) : '';
    return `<section class="film-photo-section section" aria-label="补充影片照片">${received}${b('补一张老照片','film-photo-add','btn secondary full',`data-film-id="${e(film.id)}"`)}<p class="caption">${status}</p>${progress}</section>`;
  }

  function openFilmPhoto(filmId,returned) {
    const film=P.MaterialLibrary.filmForContribution(filmId);
    if(!film)return P.toast('这部影片目前无法补充照片，请联系顾问。');
    const original=returned?.draft.file;
    P.modal('补一张老照片',`<p>这张照片会关联《${e(film.title)}》，交给${e(P.PEOPLE[film.subject].name)}核对。确认后仅你和本人可见。</p>${returned?.feedback?`<p class="note section">${e(returned.feedback)}</p>`:''}
      <form id="film-photo-form" data-feature-form data-actor="${e(P.state.actor)}" data-film-id="${e(film.id)}" data-submission-id="${e(returned?.id||'')}" class="section">
        <div class="form-field"><label for="film-photo-file">${original?'换一张照片（可选）':'选择一张照片'}</label><input id="film-photo-file" name="photo" type="file" accept="${FILM_PHOTO_TYPES.join(',')}" aria-describedby="film-photo-help" ${original?'':'required'}><p class="caption" id="film-photo-help">${original?'可保留原照片。':''}支持 JPG、PNG、WebP，最多 10 MB。请使用示例照片。</p></div>
        <div class="form-field"><label for="film-photo-description">写一句说明（可选）</label><input id="film-photo-description" name="description" maxlength="${FILM_PHOTO_NOTE_LIMIT}" placeholder="例如：这是老店门口的合照" value="${e(returned?.draft.description||'')}"></div>
        <p class="feature-error" data-film-photo-error role="alert"></p><p data-film-photo-status role="status" class="caption"></p><button class="btn full" type="submit">提交本人核对</button>
      </form>`);
  }

  /** 文件类型和实际图片解码都须通过；原文件只保存在当前演示内存中。 */
  async function readFilmPhoto(file) {
    if(!FILM_PHOTO_TYPES.includes(file.type)||!file.size||file.size>FILM_PHOTO_MAX_BYTES){
      throw new Error('请选择 10 MB 以内的 JPG、PNG 或 WebP 照片。');
    }
    const data=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result));
      reader.onerror=()=>reject(new Error('照片读取失败，请重新选择。'));
      reader.readAsDataURL(file);
    });
    const image=new Image();
    const loaded=new Promise((resolve,reject)=>{
      image.onload=resolve;
      image.onerror=()=>reject(new Error('无法打开这张照片，请重新选择。'));
    });
    image.src=data;
    await loaded;
    return {name:file.name,type:file.type,size:file.size,data};
  }

  /** 读取途中关闭、换人、重置或撤回授权时，旧表单不能写入当前账号。 */
  async function submitFilmPhoto(form) {
    const s=P.state,{actor,filmId,submissionId}=form.dataset;
    const active=()=>form.featureState===s&&P.state===s&&s.actor===actor&&form.isConnected&&form.closest('dialog')?.open;
    if(!active()||form.dataset.busy)return;
    const errorNode=form.querySelector('[data-film-photo-error]');
    const statusNode=form.querySelector('[data-film-photo-status]');
    const submitButton=form.querySelector('button[type="submit"]');
    const {photo,description}=form.elements;
    const selected=photo.files?.[0];
    const note=description.value.trim().slice(0,FILM_PHOTO_NOTE_LIMIT);
    const returned=s.materialSubmissions.find(item=>item.id===submissionId&&item.author===actor&&item.status==='returned'&&item.draft.relatedFilmId===filmId);
    if(!selected&&!returned?.draft.file){errorNode.textContent='请先选择一张照片。';return;}
    form.dataset.busy='true';
    photo.disabled=description.disabled=submitButton.disabled=true;
    errorNode.textContent='';statusNode.textContent='正在检查照片…';
    try {
      const file=selected?await readFilmPhoto(selected):returned.draft.file;
      if(!active())return;
      const error=P.MaterialLibrary.queueFilmPhoto(filmId,file,note,submissionId);
      if(error){errorNode.textContent=error;return;}
      P.closeModal();P.render();P.toast('照片已交给本人核对，通过后才会显示。');
    } catch(error) {
      if(active())errorNode.textContent=error.message||'照片读取失败，请重新选择。';
    } finally {
      if(active()){
        delete form.dataset.busy;
        photo.disabled=description.disabled=submitButton.disabled=false;
        statusNode.textContent='';
      }
    }
  }
  /** 影片照片操作沿用现有权限与提交状态。 */
  function handleAction(action,element) {
    if(action==='film-photo-add'){openFilmPhoto(element.dataset.filmId);return true;}
    if(action==='film-photo-progress'){P.MaterialLibrary.open(element.dataset.stage);return true;}
    return false;
  }
  /** 影片照片表单交由专用验证与上传流程处理。 */
  function submit(form) {
    if(form.id==='film-photo-form'){void submitFilmPhoto(form);return true;}
    return false;
  }
  P.FamilyMemories={handleAction,submit,filmContribution,openFilmPhoto};
}
