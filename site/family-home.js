/** 家庭共用家训，档案本人分别维护姓氏来源和家庭溯源。 */
'use strict';
{
  const P=window.App;
  /** 姓氏文化是带出处的公共背景，不构成本家庭的血缘或迁徙证明。 */
  const SURNAME_CULTURE = {
    陈: {
      text: '陈姓的一支源自西周初年的陈国。周武王封妫满于陈地，国都宛丘在今河南周口淮阳一带。妫满史称陈胡公，他的部分后代以国名为姓，世代沿用陈姓。',
      source: '河南省政协《“陈”姓的始源在这里》',
      url: 'https://hnzx.gov.cn/2023/04-19/4319231.html',
      facts: [
        { label: '姓字与读音', value: '陈／陳', detail: 'Chén' },
        { label: '得姓源流', value: '陈国', detail: '陈胡公' },
        { label: '陈国都城', value: '宛丘', detail: '今河南周口淮阳' }
      ],
      reading: {
        title: '堂号、字辈与祠堂',
        text: '堂号是宗族或支系沿用的称号，字辈是谱里用来标记世代的用字。广州陈家祠又称陈氏书院，由清末广东各地的陈氏宗族集资兴建。',
        source: '广东民间工艺博物馆《陈家祠百年历史》',
        url: 'https://www.gzcjc.com.cn/MYwebsite/rc/my_tyxq.htm?leixing=a98536&subpath=14&token=a30173ec89b04139b9849617a889cbdd'
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
            text: [
              '父亲陈明德，1938年出生，是我认识这个家的起点。祖籍、支系和更早的迁徙，还想和家人一起翻翻旧资料，慢慢补齐。',
              '',
              '1962年 · 爷爷进了木工铺｜陈明德在木工铺学做木活，成家后也常给家里添些自己做的小家具。',
              '1989年 · 成家后的第一顿饭｜那天，陈远山和林慧在小饭桌前，吃了成家后的第一顿饭。',
              '1998年秋 · 第一笔订单来的那天｜林慧煮了面，两个人在饭桌边写下接下来的打算。',
              '2018年 · 念念第一次回老家｜家人抱着念念走过小时候常走的那条巷子，一路认着门口的老树。',
              '2026年春节 · 又在爷爷奶奶家过年｜一家人又围坐在一起。知夏记下这顿饭，也问起那道年年做的家常菜。'
            ].join('\n'),
            source: '陈远山口述与家庭记录 · 虚构家庭示例',
            trace: {
              earliest: '1938年 · 陈明德出生',
              migration: '陈远山于1986年夏离家工作，写给家里的第一封信在老宅的书桌上起稿。'
            },
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
  /** 家庭共享内容只面向家庭成员；个人段落另行检查该人物档案的访问授权。 */
  function member() {return P.state.members.includes(P.state.actor);}
  /** 本人维护自己的家族来源，家训由家庭指定的档案本人确认。 */
  function editable(kind,person) {return member()&&(kind==='motto'?P.state.actor===ensure().family.mottoOwner:P.state.actor===person);}
  /** 亲属关系不代替人物档案授权；私有草稿永不通过阅读接口返回。 */
  function readable(person) {return member()&&P.FamilyContext.allowed(person,'archive');}
  /** 发布内容按确认者校验；切换人物时家训始终来自同一家庭对象。 */
  function document(kind,person) {
    if(kind==='motto'){const family=ensure().family;return member()&&family.motto?.confirmedBy===family.mottoOwner?family.motto:null;}
    if (!readable(person)) return null;
    const item = profile(person)[kind === 'surname' ? 'surnameOrigin' : kind];
    return item?.confirmedBy === person ? item : null;
  }
  /** 首页和编辑器沿用原有取值顺序，详情页可以同时读取家庭记载和公开资料。 */
  function surnameDetails(person) {
    if (!readable(person)) return null;
    const name = profile(person).surname;
    const edited = document('surname', person);
    const culture = Object.hasOwn(SURNAME_CULTURE, name) ? SURNAME_CULTURE[name] : null;
    return { name, ...(edited || culture), record: edited, culture };
  }
  /** 图片仅来自当前事件关联且获授权的照片，不拿装饰图冒充史料佐证。 */
  function photo(story,person) {return P.PersonArchive.assets(person,'photo').find(item=>item.relatedStoryId===story.id)||null;}
  /** 首页按已记录的亲属关系展示，孙辈放在完整族谱中查看。 */
  function relatives(person) {
    const groups={parents:[],couple:[],children:[],others:[]};
    for(const id of P.state.members.filter(id=>P.PEOPLE[id])){
      const relation=P.relation(id,person);
      if(['父亲','母亲','爸爸','妈妈'].includes(relation))groups.parents.push(id);
      else if(id===person||['妻子','丈夫'].includes(relation))groups.couple.push(id);
      else if(['儿子','女儿'].includes(relation))groups.children.push(id);
      else if(!['孙子','孙女','外孙','外孙女'].includes(relation))groups.others.push(id);
    }
    return groups;
  }
  /** 仅原型工具使用：清空新首页资料，保留既有故事、授权和记录草稿。 */
  function empty() {
    const home=ensure();home.family.motto=null;home.family.suggestions=[];home.drafts={};home.review=null;
    Object.values(home.profiles).forEach(value=>{value.origin=null;value.surnameOrigin=null;value.surname='';});
  }
  P.FamilyHome={ensure,profile,member,editable,readable,document,surnameDetails,photo,relatives,empty};
}
