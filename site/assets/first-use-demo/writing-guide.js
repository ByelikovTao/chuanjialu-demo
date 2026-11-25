(function () {
  'use strict';

  // 独立演示只加载完整产品的纯文字整理模块，共用初稿和润色规则。
  window.App ||= {};

  const GUIDES = {
    motto: {
      title: '家训是什么？',
      description: '家训是这个家想传给后人的做人做事准则。可以抄录家里已有的家训，也可以把长辈的教诲、家人共同认可的做法写下来。',
      hint: '你们家最看重什么？平时是怎么做的？',
      placeholder: '例如，家里看重守信。答应别人的事尽力做到，做不到就早点说明。'
    },
    history: {
      title: '家史记些什么？',
      description: '家史记下这个家怎么一路走到今天。可以从一次搬家、一段工作经历或一次团圆写起。',
      hint: '那是哪一年？谁在场？在哪里发生了什么？',
      placeholder: '写下你记得的线索，可以分行输入。'
    },
    profile: {
      title: '把你的经历留给家人',
      description: '人物志可以从几句话开始。小传写你想让家人记住的事，求学和从业可以日后逐段补充。',
      hint: '写下你记得的人、地点和经历。',
      placeholder: '例如，哪一年在哪里读书或工作，当时有哪些事情值得记下。'
    }
  };

  const MOTTO_DETAILS = `
    <dl class="writing-examples" aria-label="填写示例">
      <div><dt>为人</dt><dd>答应别人的事尽力做到，做不到就早点说明。</dd></div>
      <div><dt>持家</dt><dd>珍惜粮食，按需取用。家里的大事，坐下来一起商量。</dd></div>
    </dl>
    <div class="writing-meta">
      <div class="field">
        <label for="motto-topic">主题（选填）</label>
        <input id="motto-topic" type="text" maxlength="24" placeholder="如，持家">
      </div>
      <div class="field">
        <label for="motto-source">出处或长辈（选填）</label>
        <input id="motto-source" type="text" maxlength="80" placeholder="如，祖母口述">
      </div>
    </div>
  `;

  const WRITING_TOOLS = `
    <div class="field" id="writing-target-field" hidden>
      <label for="writing-target">整理哪一段？</label>
      <select id="writing-target"></select>
    </div>
    <div class="writing-buttons" role="group" aria-label="写作辅助">
      <button class="button" id="writing-draft" type="button">AI 生成初稿</button>
      <button class="button" id="writing-polish" type="button">AI 润色</button>
    </div>
    <div class="writing-panel field" id="writing-composer" hidden>
      <label for="writing-clues" id="writing-clue-label"></label>
      <textarea id="writing-clues" rows="3" maxlength="1000"></textarea>
      <p class="notice" id="writing-clue-error" role="alert" hidden></p>
      <div class="writing-buttons">
        <button class="button" id="writing-preview-draft" type="button">预览初稿</button>
        <button class="text-button" id="writing-cancel" type="button">取消</button>
      </div>
    </div>
    <section class="writing-panel" id="writing-review" aria-labelledby="writing-review-title" hidden>
      <h3 id="writing-review-title" tabindex="-1"></h3>
      <p class="note">演示稿依据你提供的文字整理，核对后可采用。</p>
      <dl class="writing-comparison">
        <div><dt>原文</dt><dd id="writing-original"></dd></div>
        <div><dt>建议稿</dt><dd id="writing-candidate"></dd></div>
      </dl>
      <p class="notice" id="writing-review-error" role="alert" hidden></p>
      <div class="writing-buttons">
        <button class="text-button" id="writing-keep" type="button">保留原文</button>
        <button class="button" id="writing-adopt" type="button">采用此稿</button>
      </div>
    </section>
  `;

  const element = (id) => document.getElementById(id);
  let fieldListeners;

  function setError(output, message = '') {
    output.textContent = message;
    output.hidden = !message;
  }

  function buildDraft(kind, clues, writing) {
    if (kind === 'history') {
      return writing.draftFromNotes(clues);
    }
    if (kind === 'motto') {
      // 把用户给出的做法整理成条目，避免为新家虚构祖训或出处。
      const notes = clues.split(/[；;\n]+/u).map((item) => item.trim()).filter(Boolean).join('\n');
      return writing.polish(writing.polishMotto(notes).text).text;
    }
    return writing.polish(clues).text;
  }

  function mountTools(tools, kind, guide, targets) {
    tools.innerHTML = WRITING_TOOLS;
    const select = element('writing-target');
    targets.forEach(({ label }, index) => select.add(new Option(label, String(index))));
    element('writing-target-field').hidden = targets.length < 2;

    const draftButton = element('writing-draft');
    const polishButton = element('writing-polish');
    const composer = element('writing-composer');
    const clues = element('writing-clues');
    const clueError = element('writing-clue-error');
    const review = element('writing-review');
    const reviewTitle = element('writing-review-title');
    const reviewError = element('writing-review-error');
    const adoptButton = element('writing-adopt');
    const currentInput = () => targets[select.selectedIndex].input;
    let preview;

    element('writing-clue-label').textContent = guide.hint;
    clues.placeholder = guide.placeholder;

    function updatePolishAction() {
      polishButton.disabled = !currentInput().value.trim();
    }

    function closePanels() {
      composer.hidden = true;
      review.hidden = true;
      preview = undefined;
      setError(clueError);
      setError(reviewError);
    }

    function showReview(mode, candidate) {
      const input = currentInput();
      preview = { mode, input, original: input.value, candidate };
      reviewTitle.textContent = mode === 'draft' ? '核对初稿' : '核对润色稿';
      element('writing-original').textContent = input.value || '还没有原文';
      element('writing-candidate').textContent = candidate;
      composer.hidden = true;
      review.hidden = false;
      adoptButton.disabled = input.maxLength >= 0 && candidate.length > input.maxLength;
      setError(reviewError, adoptButton.disabled ? '建议稿超过可填写的长度，可精简线索后再试。' : '');
      reviewTitle.focus();
    }

    select.addEventListener('change', () => {
      closePanels();
      clues.value = '';
      updatePolishAction();
    });
    draftButton.addEventListener('click', () => {
      closePanels();
      composer.hidden = false;
      clues.focus();
    });
    polishButton.addEventListener('click', () => {
      const writing = window.App.FamilyHistoryWriting;
      const original = currentInput().value;
      const result = kind === 'motto' ? writing.polishMotto(original) : writing.polish(original);
      showReview('polish', result.text);
    });
    clues.addEventListener('input', () => setError(clueError));
    element('writing-preview-draft').addEventListener('click', () => {
      const candidate = buildDraft(kind, clues.value.trim(), window.App.FamilyHistoryWriting);
      if (!clues.value.trim() || !candidate.trim()) {
        setError(clueError, '先写下一点家里的做法或经历，才能整理成初稿。');
        clues.focus();
        return;
      }
      showReview('draft', candidate);
    });
    element('writing-cancel').addEventListener('click', () => {
      closePanels();
      draftButton.focus();
    });
    element('writing-keep').addEventListener('click', () => {
      const trigger = preview.mode === 'draft' ? draftButton : polishButton;
      closePanels();
      trigger.focus();
    });
    adoptButton.addEventListener('click', () => {
      const { input, original, candidate } = preview;
      // 预览期间又手动修改过原文时，先重新核对，避免采用旧稿覆盖新内容。
      if (input.value !== original) {
        setError(reviewError, '原文已修改，请重新预览后再采用。');
        return;
      }
      input.value = candidate;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      closePanels();
      input.focus();
    });

    fieldListeners = new AbortController();
    for (const { input } of targets) {
      input.addEventListener('input', updatePolishAction, { signal: fieldListeners.signal });
    }
    updatePolishAction();
  }

  function prepare(kind, targets = []) {
    fieldListeners?.abort();
    const intro = element('writing-intro');
    const tools = element('writing-tools');
    const guide = GUIDES[kind];
    intro.replaceChildren();
    tools.replaceChildren();
    intro.hidden = !guide;
    tools.hidden = !guide || !targets.length;
    if (!guide) {
      return;
    }
    const heading = document.createElement('h2');
    heading.textContent = guide.title;
    const description = document.createElement('p');
    description.className = 'note';
    description.textContent = guide.description;
    intro.append(heading, description);
    if (kind === 'motto') {
      intro.insertAdjacentHTML('beforeend', MOTTO_DETAILS);
    }
    if (targets.length) {
      mountTools(tools, kind, guide, targets);
    }
  }

  function mottoDetails() {
    return {
      topic: element('motto-topic')?.value.trim() || '',
      source: element('motto-source')?.value.trim() || ''
    };
  }

  window.firstUseWriting = { prepare, mottoDetails };
}());
