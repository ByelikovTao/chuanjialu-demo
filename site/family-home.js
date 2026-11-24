/** 家庭共用家训，档案本人分别维护姓氏来源和家庭溯源。 */
'use strict';
{
  const P=window.App;
  const EXAMPLE_MEMBERS = new Set(P.state.members);
  const EXAMPLE_PEDIGREE_MEMBERS = new Set(['father', 'grandpa', 'mother', 'xia']);
  const PARENT_RELATIONS = new Set(['父亲', '母亲', '爸爸', '妈妈', '父母']);
  const CHILD_RELATIONS = new Set(['儿子', '女儿', '子女']);
  const EXAMPLE_SURNAME_ACCOUNT = {
    text: '爷爷说，他小时候住在老街东头。那时家门口有棵枣树，过年回来，远远就能认出来。',
    source: '陈远山口述'
  };
  /** 姓氏文化是带出处的公共背景，不构成本家庭的血缘或迁徙证明。 */
  const SURNAME_CULTURE = {
    陈: {
      text: '陈姓的一支源自西周初年的陈国。周武王封妫满于陈地，国都宛丘在今河南周口淮阳一带。妫满史称陈胡公，他的部分后代以国名为姓，世代沿用陈姓。',
      source: '河南省政协《“陈”姓的始源在这里》',
      url: 'https://hnzx.gov.cn/2023/04-19/4319231.html',
      spelling: { traditional: '陳', pinyin: 'Chén' },
      intro: '陈姓的一支源自西周初年的陈国。',
      facts: [
        { label: '得姓人物', value: '陈胡公（妫满）' },
        { label: '陈国都城', value: '宛丘 · 今河南淮阳' }
      ],
      // 九百姓陈姓页的统计年份未标明，作为原型参考数据展示。
      population: {
        total: '6390 万',
        rank: 5,
        regions: ['广东', '福建', '浙江', '江苏', '四川']
      },
      origins: [{
        title: '源自陈国的一支',
        text: '周武王封妫满于陈地，妫满史称陈胡公。这一支的部分后裔以国名为姓。'
      }],
      traditions: {
        regions: [{ name: '颍川', context: '颍川陈氏在此形成声望。' }],
        hallNames: [{ name: '颍川堂', context: '台山陈颍川堂是一例。' }],
        ancestralHalls: [{ name: '广州陈家祠', context: '又称陈氏书院，建于清末。' }]
      }
    },
    王: {
      text: '王姓有多支源流。有记载将其中一支追溯到周灵王的太子晋，也有田安后人由田改姓王的记载。',
      source: '河南省台办《中华王姓　根在河洛》',
      url: 'https://ytsc.rootinhenan.gov.cn/sitesources/ytsc/page_pc/hnly/xsgq/article6b3036e8b72b4231a57adf505f4a7ea5.html',
      spelling: { pinyin: 'Wáng' },
      intro: '王姓有多支源流，下列是其中两条记载。',
      // 王姓与陈姓使用同一九百姓展示口径。
      population: {
        total: '1.02 亿',
        rank: 1,
        regions: ['山东', '河南', '河北', '四川', '安徽']
      },
      origins: [
        { title: '姬姓一支', tags: ['东周', '太子晋'], text: '有记载将这一支追溯至周灵王的太子晋，其部分后裔沿用王氏。' },
        { title: '田氏改姓一支', tags: ['田安'], text: '另有记载称，曾被封为济北王的田安，其后人有一支由田改姓王。' }
      ],
      traditions: {
        regions: [
          { name: '太原', context: '太原王氏' },
          { name: '琅琊', context: '琅琊王氏' }
        ],
        hallNames: [{ name: '三槐堂', context: '三槐堂王氏 · 河南开封' }]
      }
    }
  };
  /** 所有示例均为虚构；正式内容和未发布草稿分别保存，刷新由原型统一重置。 */
  function seed() {
    return {
      family:{name:'陈家',mottoOwner:'father',motto:{text:'诚实做人，认真做事。\n家人有难，彼此照应。',source:'从我这一代立下，留给家人一起践行。',kind:'new',date:'2026-10-29',confirmedBy:'father',revision:1},suggestions:[]},
      profiles:{
        father: {
          surname: '陈',
          origin: {
            title: '陈家家史',
            text: [
              '父亲陈明德生于1938年。1962年，他进木工铺学手艺，成了家也常给家里添些自己做的小家具。我提起我们家，最先想到的就是父亲和那张老书桌。',
              '1986年夏天，我离开老家去工作。写给家里的第一封信，就是在老宅的书桌上起的稿。1989年，我和林慧成了家，两个人在小饭桌前吃了成家后的第一顿饭。再后来，1998年秋天，第一笔订单送到手上，林慧煮了面，我们就在饭桌边写下接下来的打算。',
              '念念第一次回老家，是2018年。我们抱着她走过小时候常走的巷子，一路认着门口的老树。到了2026年春节，一家人又围坐在一起。知夏记下了那顿饭，还问起那道年年做的家常菜。更早的祖籍和迁居，还有待我们一起翻翻旧资料。'
            ].join('\n\n'),
            source: '陈远山口述与家庭记录 · 虚构家庭示例',
            confirmedBy: 'father',
            revision: 1
          }
        },
        mother:{surname:'林',origin:null}
      },drafts:{},review:null
    };
  }
  /** 重置时按需重建，不借用前一次演示或另一个人物的内容。 */
  function ensure() {return P.state.familyHome ||= seed();}
  /** 人物的家族来源在本人整理并确认后展示。 */
  function profile(person) {return ensure().profiles[person] ||= {surname:'',origin:null};}
  /** 未另取篇名时，阅读和编辑沿用当前家庭的册名。 */
  function originTitle(doc) { return doc?.title || P.FamilyJournal.familyName() + '家史'; }
  /** 家庭共享内容只面向家庭成员；个人段落另行检查该人物档案的访问授权。 */
  function member() {return P.state.members.includes(P.state.actor);}
  /** 家训由当前家庭指定的人维护，浏览谁的档案不会改变编辑权。 */
  function editable(kind, person) {
    const owner = kind === 'motto' ? ensure().family.mottoOwner : person;
    return member() && P.state.actor === owner;
  }
  /** 亲属关系不代替人物档案授权；私有草稿永不通过阅读接口返回。 */
  function readable(person) {return member()&&P.FamilyContext.allowed(person,'archive');}
  /** 家训确认时记录实际提交人，家庭成员读取同一份确认稿。 */
  function document(kind,person) {
    if (kind === 'motto') {
      const motto = ensure().family.motto;
      return member() && motto?.confirmedBy ? motto : null;
    }
    if (!readable(person)) return null;
    const item = profile(person)[kind === 'surname' ? 'surnameOrigin' : kind];
    return item?.confirmedBy === person ? item : null;
  }
  /** 新落款独立于确认人。旧家训未设置落款时继续显示原署名。 */
  function mottoByline(motto) {
    if (!motto) return '';
    if (typeof motto.byline === 'string') return motto.byline;
    const name = P.PEOPLE[motto.confirmedBy]?.name || '家人';
    return `${name} ${motto.kind === 'new' ? '手书' : '整理确认'}`;
  }
  /** 首页和编辑器沿用原有取值顺序，详情页可以同时读取家庭记载和公开资料。 */
  function surnameDetails(person) {
    if (!readable(person)) return null;
    const name = profile(person).surname;
    const edited = document('surname', person);
    const culture = Object.hasOwn(SURNAME_CULTURE, name) ? SURNAME_CULTURE[name] : null;
    // 首页示例口述在本人发布后改用已确认的记载。
    const oralAccount = P.Households.isExample() && person === 'father' && name === '陈' && !edited
      ? EXAMPLE_SURNAME_ACCOUNT : null;
    return { name, ...(edited || culture), record: edited, culture, oralAccount };
  }
  /** 图片仅来自当前事件关联且获授权的照片，不拿装饰图冒充史料佐证。 */
  function photo(story,person) {return P.PersonArchive.assets(person,'photo').find(item=>item.relatedStoryId===story.id)||null;}
  /** 以当前人物的直接称谓分组，隔代关系留待家谱核对中间一代。 */
  function relatives(person, members = P.state.members) {
    const groups={parents:[],couple:[],children:[],others:[]};
    for(const id of members.filter(id=>P.PEOPLE[id])){
      const relation=P.relation(id,person);
      if(PARENT_RELATIONS.has(relation))groups.parents.push(id);
      else if(id===person||['妻子','丈夫'].includes(relation))groups.couple.push(id);
      else if(CHILD_RELATIONS.has(relation))groups.children.push(id);
      else groups.others.push(id);
    }
    return groups;
  }
  /** 只有祖辈到当前人物父母的亲子关系已知，才把该成员连入主家谱。 */
  function pedigree(owner) {
    const example = P.Households.isExample();
    const person = example ? P.state.actor : owner;
    const members = example ? P.state.members.filter(id =>
      id === person || EXAMPLE_PEDIGREE_MEMBERS.has(id) || !EXAMPLE_MEMBERS.has(id)) : P.state.members;
    const groups = relatives(person, members);
    const grandparents = groups.others.map(id => ({
      id,
      parentIndexes: groups.parents.flatMap((parent, index) =>
        PARENT_RELATIONS.has(P.relation(id, parent)) ? [index] : [])
    })).filter(entry => entry.parentIndexes.length > 0);
    const connected = new Set(grandparents.map(entry => entry.id));
    return { person, groups: { ...groups, grandparents, others: groups.others.filter(id => !connected.has(id)) } };
  }
  /** 仅原型工具使用：清空新首页资料，保留既有故事、授权和记录草稿。 */
  function empty() {
    const home=ensure();home.family.motto=null;home.family.suggestions=[];home.drafts={};home.review=null;
    Object.values(home.profiles).forEach(value=>{value.origin=null;value.surnameOrigin=null;value.surname='';});
  }
  P.FamilyHome={ensure,profile,originTitle,member,editable,readable,document,mottoByline,surnameDetails,photo,relatives,pedigree,empty};
}
