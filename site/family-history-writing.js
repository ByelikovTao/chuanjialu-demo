/** 家史导入只提取正文；帮写和润色使用前端示例，供原型核对交互。 */
'use strict';
{
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_XML_BYTES = 1024 * 1024;
  const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const DOCX_ERROR = '无法读取这份 Word 文档，请另存为 .docx 或 UTF-8 文本后重试。';

  /** 从 ZIP 中央目录定位 Word 正文，限制文件和解包大小，避免处理附件和图片。 */
  function documentEntry(bytes) {
    const view = new DataView(bytes);
    const matches = (offset, signature) => offset >= 0 && offset + 4 <= bytes.byteLength &&
      view.getUint32(offset, true) === signature;
    const endStart = bytes.byteLength - 22;
    const searchStart = Math.max(0, endStart - 65535);
    let end = endStart;
    while (end >= searchStart &&
      (!matches(end, 0x06054b50) || end + 22 + view.getUint16(end + 20, true) !== bytes.byteLength)) end--;
    if (end < searchStart || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error(DOCX_ERROR);

    const count = view.getUint16(end + 10, true);
    const directoryStart = view.getUint32(end + 16, true);
    const directoryEnd = directoryStart + view.getUint32(end + 12, true);
    if (directoryEnd > end) throw new Error(DOCX_ERROR);
    const decoder = new TextDecoder();
    for (let index = 0, offset = directoryStart; index < count; index++) {
      if (offset + 46 > directoryEnd || !matches(offset, 0x02014b50)) break;
      const nameLength = view.getUint16(offset + 28, true);
      const next = offset + 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
      if (next > directoryEnd) break;
      const name = decoder.decode(new Uint8Array(bytes, offset + 46, nameLength));
      if (name === 'word/document.xml') {
        const method = view.getUint16(offset + 10, true);
        const packedSize = view.getUint32(offset + 20, true);
        const size = view.getUint32(offset + 24, true);
        const local = view.getUint32(offset + 42, true);
        if (!matches(local, 0x04034b50) || local + 30 > directoryStart ||
          (view.getUint16(offset + 8, true) & 1) || size > MAX_XML_BYTES) break;
        const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
        if (start + packedSize > directoryStart) break;
        return {method, size, data: new Uint8Array(bytes, start, packedSize)};
      }
      offset = next;
    }
    throw new Error(DOCX_ERROR);
  }

  async function unpack({method, size, data}) {
    if (method === 0 && data.byteLength === size) return data;
    if (method !== 8) throw new Error(DOCX_ERROR);
    const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const xml = new Uint8Array(size);
    let offset = 0;
    try {
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
        if (offset + chunk.value.byteLength > size) {
          await reader.cancel();
          throw new Error(DOCX_ERROR);
        }
        xml.set(chunk.value, offset);
        offset += chunk.value.byteLength;
      }
    } finally {
      reader.releaseLock();
    }
    if (offset !== size) throw new Error(DOCX_ERROR);
    return xml;
  }

  function wordText(xml) {
    if (/<!DOCTYPE/i.test(xml)) throw new Error(DOCX_ERROR);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const body = doc.getElementsByTagNameNS(WORD_NS, 'body')[0];
    if (!body || doc.getElementsByTagName('parsererror').length) throw new Error(DOCX_ERROR);
    const paragraphs = Array.from(body.getElementsByTagNameNS(WORD_NS, 'p'))
      .filter(paragraph => !paragraph.closest('drawing, pict'));
    return paragraphs.map(paragraph => {
      let line = '';
      for (const node of paragraph.getElementsByTagNameNS(WORD_NS, '*')) {
        if (node.closest('drawing, pict')) continue;
        if (node.localName === 't') line += node.textContent;
        if (node.localName === 'tab') line += '\t';
        if (node.localName === 'br' || node.localName === 'cr') line += '\n';
      }
      return line;
    }).join('\n\n');
  }

  async function readDocument(file, textLimit) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'docx'].includes(extension)) throw new Error('请选择 .docx 或 .txt 文件。');
    if (file.size > MAX_FILE_BYTES) throw new Error('文件请控制在 5 MB 以内。');
    let raw;
    try {
      const bytes = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', {fatal: true});
      raw = extension === 'docx' ? wordText(decoder.decode(await unpack(documentEntry(bytes)))) : decoder.decode(bytes);
      if (raw.includes('\u0000')) throw new Error();
    } catch {
      throw new Error(extension === 'docx' ? DOCX_ERROR : '无法读取文字，请将 .txt 文件另存为 UTF-8 后重试。');
    }
    const text = raw.replace(/\r\n?/g, '\n').trim();
    if (!text) throw new Error('这份文档没有可导入的正文。');
    if (text.length > textLimit) throw new Error('导入的正文最多 ' + textLimit + ' 字，请删减后再试。');
    return text;
  }

  /** 只整理用户写下的线索，不编造家人的姓名、时间、地点或经历。 */
  function draftFromNotes(notes) {
    const paragraphs = notes.trim().split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
    return '我们把这段往事写下来，留给家人慢慢读。\n\n' +
      paragraphs.map(line => /[。！？.!?」”]$/u.test(line) ? line : line + '。').join('\n\n');
  }

  function polish(original) {
    const changes = original.split('\n').map(line => {
      const text = line.trim()
        .replace(/(\p{Script=Han}) *, *(?=\p{Script=Han})/gu, '$1，')
        .replace(/ *[，。；！？：] */gu, match => match.trim())
        .replace(/([，。！？])\1+/gu, '$1')
        .replace(/([^。！？；….!?»”」）\s])$/u, '$1。');
      return {text, changed: text !== line};
    });
    return {text: changes.map(line => line.text).join('\n'), changes};
  }

  const MOTTO_PHRASES = new Map([
    ['诚实做人', '待人以诚'],
    ['对人要诚实', '待人以诚'],
    ['认真做事', '做事认真'],
    ['做事要认真', '做事认真'],
    ['彼此照应', '互相扶持'],
    ['要互相帮忙', '彼此帮扶'],
    ['对长辈要尊重', '敬重长辈'],
    ['对人要有礼貌', '待人有礼'],
    ['一家人要和和气气', '一家人和气相处']
  ]);
  const MOTTO_PUNCTUATION = {',': '，', ';': '；', '!': '！', '?': '？', '.': '。'};
  const MOTTO_DRAFT_FORMS = [
    { value: 'plain', label: '白话家训' },
    { value: 'seven', label: '七言家训', detail: '四句，每句七字' },
    { value: 'wulv', label: '五律', detail: '八句，每句五字' }
  ];
  // 诗体初稿按已识别的家训主题选用原创示例；五律用仄起首句不入韵的格式。
  const MOTTO_VERSES = [
    {
      keywords: /诚信|守信|诚实|守约|承诺|答应|以诚|不说谎/u,
      seven: ['待人须把诚心守', '出语当先想践行', '有约莫教空落纸', '相逢自有好声名'],
      wulv: ['立信须躬践', '存诚自久长', '持心无诡语', '处事有良方', '守约逢风雨', '修身历雪霜', '平生言可证', '万里有余光']
    },
    {
      keywords: /勤俭|节俭|节约|持家|勤劳|节用|珍惜粮食|不浪费/u,
      seven: ['一粥一饭念耕忙', '随时节用有余粮', '旧衣能补休轻弃', '留取勤劳作家常'],
      wulv: ['克俭常持久', '勤耕勿怠荒', '开仓知粒苦', '理线惜丝长', '细算灯前账', '常留岁末粮', '持家须有度', '日用守寻常']
    },
    {
      keywords: /敬亲|敬老|孝亲|孝顺|孝敬|尊重长辈|敬重长辈|照顾父母|陪伴父母/u,
      seven: ['父母辛劳记在心', '一声问候抵千金', '得闲多伴灯前坐', '莫使相思隔岁深'],
      wulv: ['敬老非徒礼', '晨昏问暖凉', '灯前听旧事', '案上置新汤', '远客勤传信', '归人久侍旁', '相陪须及早', '莫待满头霜']
    },
    {
      keywords: /和睦|和气|团结|商量|照应|互助|扶持|帮忙/u,
      seven: ['家中有事同商量', '莫把闲言添短长', '遇上难时相搭手', '一盏灯前话暖凉'],
      wulv: ['遇事从容议', '同心护一堂', '轻声消旧怨', '软语解新伤', '长幼同甘苦', '儿孙共举觞', '持家宜互让', '岁晚亦安康']
    },
    {
      keywords: /读书|求学|学习|勤学|好学|耕读|求知/u,
      seven: ['灯前展卷莫辞晚', '字里寻真辨短长', '读得明白须躬践', '书声绕屋伴晨光'],
      wulv: ['展卷穷今古', '临窗读旧章', '清晨寻奥义', '静夜辨微芒', '落笔须求实', '开言莫逞强', '虚心长问学', '自有一庭芳']
    }
  ];

  /** 白话整理原线索；诗体按主题匹配句式，未知主题交给用户补充。 */
  function draftMotto(clues, form, topic) {
    if (form === 'plain') {
      const notes = clues.split(/[；;\n]+/u).map(item => item.trim()).filter(Boolean).join('\n');
      return polish(polishMotto(notes).text).text;
    }
    if (form !== 'seven' && form !== 'wulv') return '';
    const match = value => MOTTO_VERSES.find(verse => verse.keywords.test(value));
    const verse = match(topic) ?? match(clues);
    return verse?.[form].map((line, index) => line + (index % 2 ? '。' : '，')).join('\n') ?? '';
  }

  /** 离线原型只替换完整的常用短句及其中文标点，保留未识别的内容和分行。 */
  function polishMotto(original) {
    const boundary = /([，。！？；、,;!?.\n])/u;
    const originalParts = original.split(boundary);
    const changes = originalParts.map((part, index) => {
      let text = MOTTO_PHRASES.get(part.trim()) ?? part;
      if (Object.hasOwn(MOTTO_PUNCTUATION, part) && /\p{Script=Han}\s*$/u.test(originalParts[index - 1]) &&
          /^\s*(?:\p{Script=Han}|$)/u.test(originalParts[index + 1])) {
        text = MOTTO_PUNCTUATION[part];
      }
      return {text, changed: text !== part};
    });
    return {text: changes.map(part => part.text).join(''), changes};
  }

  window.App.FamilyHistoryWriting = {
    readDocument, draftFromNotes, polish, polishMotto, draftMotto, mottoDraftForms: MOTTO_DRAFT_FORMS
  };
}
