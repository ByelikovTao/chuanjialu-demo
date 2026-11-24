/** 演示数据与共用视图工具；所有变更只保留在当前页面内存中。 */
'use strict';
{
  /** 示例家庭的邀请展示名称。 */
  const HOME_NAME='灯火传家';
  const ICONS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M4 3h13a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Z"/><path d="M3 17h16M8 7h7M8 11h5"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9A9 9 0 1 1 21 11.5Z"/><path d="M7 11h.01M12 11h.01M17 11h.01"/>',
    family: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2ZM16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
    person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    switch: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="m9 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    mic: '<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',
    spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    source: '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>',
    photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    screen: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15"/>',
    settings: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2"/><circle cx="12" cy="12" r="5"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    volume: '<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    send: '<path d="m22 2-7 20-4-9-9-4ZM11 13 22 2"/>',
    tree: '<path d="M12 3v7M4 15v-5h16v5M12 10v5"/><rect x="8" y="1" width="8" height="4" rx="1"/><rect x="1" y="16" width="6" height="6" rx="1"/><rect x="9" y="16" width="6" height="6" rx="1"/><rect x="17" y="16" width="6" height="6" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    house: '<path d="m2.75 10.25 8.1-7a1.75 1.75 0 0 1 2.3 0l8.1 7M5 9v9.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M9.5 20.5v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5"/>',
    notebook: '<rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8.25 3.5v17M11.5 9H16m-4.5 4h3.5"/>',
    sparkles: '<path d="M10 4.75c.9 4.3 2.7 6.1 7 7-4.3.9-6.1 2.7-7 7-.9-4.3-2.7-6.1-7-7 4.3-.9 6.1-2.7 7-7ZM19 3v5m-2.5-2.5h5"/>',
    shoppingBag: '<path d="M6 7.5h12a2 2 0 0 1 2 1.8l.9 9.6a1.75 1.75 0 0 1-1.75 1.9H4.85a1.75 1.75 0 0 1-1.75-1.9l.9-9.6A2 2 0 0 1 6 7.5Z"/><path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5"/>',
    user: '<circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 20.5v-.75a7.5 6.5 0 0 1 15 0v.75"/>'
  };
  const PEOPLE = {
    father: {name:'陈远山', relation:'爸爸', born:'1963', short:'远山', photo:'father'},
    xia: {name:'陈知夏', relation:'女儿', born:'1992', short:'知夏', photo:'daughter'},
    nian: {name:'陈念念', relation:'孙女', born:'2016', birthDate:'2016-05-20', expecting:false, short:'念念', color:'rose'},
    mother: {name:'林慧', relation:'妈妈', born:'1965', short:'林', color:'rose'},
    grandpa: {name:'陈明德', relation:'爷爷', born:'1938', short:'陈', color:'sand'},
    grandma: {name:'张玉兰', relation:'母亲', short:'张', color:'rose'}
  };
  /** 固定的演示人物种子仅用于重置；运行时仍由 PEOPLE 同一个对象提供人物事实。 */
  const PERSON_SEEDS=structuredClone(PEOPLE);
  /** 虚构人生样例覆盖青年至当下；新经历只用文字，不补造历史照片或荣誉。 */
  const STORIES = [
    {"id":"school-days","title":"那年，我也有过发亮的梦想","year":"1979","date":"1979年","recorded":"2026年10月29日","category":"青春求学","image":"room","author":"father","scope":"family","text":["第一次在全班面前读自己的作文，手心都是汗。老师说，远山，你写得有自己的想法。","那本练习册已经找不到了，可老师那句话，我一直记到今天。那时候家里条件普通，我也不知道将来会走多远，只想着把眼前的书读好。","现在回头看，我很想对十六岁的自己说一句：别着急，你后来走过的路，比当时想象的还远。"],"quote":"那个不太敢开口的少年，也有了自己的天地。","source":"陈远山示例口述 · 虚构演示","duration":"02:30"},
    {"id":"wedding-day","title":"日子从两个人的一张饭桌开始","year":"1989","date":"1989年","recorded":"2026年10月29日","category":"相伴成家","image":"room","author":"father","scope":"family","text":["结婚时没有多大的排场。林慧和我把新买的碗放进柜子，又为窗帘的颜色商量了半天。","第一晚我们坐在小饭桌前，菜很简单，却觉得以后什么都能一起慢慢来。那时我就想，往后要让她少操一点心。","这些年我们也有争执，有忙得顾不上说话的时候。如今再坐在一张桌前，还是她最知道我的口味。"],"quote":"后来住过更大的房子，最难忘的还是最初那张饭桌。","source":"陈远山示例口述 · 虚构演示","duration":"02:30"},
    {"id":"daughter-born","title":"第一次抱起女儿，我忽然懂了父亲","year":"1992","date":"1992年","recorded":"2026年10月29日","category":"初为人父","image":"room","author":"father","scope":"family","text":["知夏出生那天，我在走廊来回走了好多趟。护士把她交到我手里时，我僵着胳膊，连呼吸都放轻了。","那么小的一个人，握住了我的一根手指。我忽然明白父亲为什么总把家里的事放在前头。","后来工作再忙，我也尽量赶回去看她一眼。现在她有自己的生活了，我依然记得那只握住我的小手。"],"quote":"那一刻，我不只是自己，也成了一个人的依靠。","source":"陈远山示例口述 · 虚构演示","duration":"02:30"},
    {"id":"old-partner","title":"老伙伴说，跟着你做事，心里踏实","year":"2008","date":"2008年","recorded":"2026年10月29日","category":"守信立业","image":"room","author":"father","scope":"family","text":["那一年交付赶得紧，几位一起打拼的老伙伴陪我熬了不少夜。最后一批货发走，我们就在办公室吃了一顿迟来的晚饭。","有人端着茶说，远山，跟着你做事，心里踏实。我没有说什么，心里却热了很久。","做生意这些年，数字记不全了。可谁在困难的时候搭过手，答应别人的事有没有做到，我一直放在心上。"],"quote":"比起做成多少生意，我更珍惜别人说我这个人靠得住。","source":"陈远山示例口述 · 虚构演示","duration":"02:30"},
    {"id":"journey-together","title":"终于有空，陪她慢慢看一回山水","year":"2018","date":"2018年","recorded":"2026年10月29日","category":"山河同行","image":"room","author":"father","scope":"family","text":["那次出门，我们没有排满行程。走累了就在湖边坐下，林慧给我拍照，我总不知道手该往哪里放。","年轻时总说，等忙完这一阵就去。后来才发现，总有下一阵要忙。那天我们约好，往后每年都给自己留一点时间。","回家后我把其中一张照片洗出来，放在书房。看到它就想起那天的风，也提醒自己，日子可以过得慢一些。"],"quote":"这一路为家奔忙，也该陪身边的人好好看看世界。","source":"陈远山示例口述 · 虚构演示","duration":"02:30"},
    {"id":"new-hobby","title":"六十岁，我又做了一回学生","year":"2023","date":"2023年","recorded":"2026年10月29日","category":"自在新篇","image":"room","author":"father","scope":"family","text":["第一次去书画班，我挑了靠后的位置。老师从握笔教起，我写得歪歪扭扭，却很久没有这样专心过了。","现在每周有两天下午留给自己。和同学聊聊字、喝喝茶，回家再把练过的纸摊开，看看哪一笔比上周稳一点。","过去习惯把时间安排给工作和家人。如今才发现，认真做一件自己喜欢的小事，也让人心里很充实。"],"quote":"现在学喜欢的事，不为赶上谁，只为自己高兴。","source":"陈远山示例口述 · 虚构演示","duration":"02:30"},

    {id:'first-order', title:'第一笔订单来的那天', year:'1998', date:'1998年秋', recorded:'2026年10月12日', category:'事业初成', image:'family', author:'father', scope:'family', text:['那时候，办公室只有一张桌子和一部电话。第一笔订单来的时候，我反复看了好几遍，才敢告诉你妈妈。','晚上回到家，我们没有去饭店。你妈妈煮了一碗面，我们坐在饭桌旁，把接下来要做的事写在纸上。','今天再回头看，我记住的不是订单上的数字，而是有人愿意相信我，还有家人始终陪着我。'], quote:'我记住的不是订单上的数字，而是有人愿意相信我。', source:'创业经历访谈 · 片段 03', duration:'03:26'},
    {id:'old-home', title:'那张一直没换的书桌', year:'1986', date:'1986年夏', recorded:'2026年10月14日', category:'离家起步', image:'room', author:'father', scope:'family', text:['老家的窗边一直放着一张书桌。桌面不大，靠窗的一角晒得发白。','后来离开家工作，我写给家里的第一封信，也是在这张桌子上起的稿。每次回去，总会在那里坐一会儿。'], quote:'很多故事，就从这扇窗边开始。', source:'老宅口述记录 · 片段 02', duration:'01:28'},
    {id:'spring', title:'今年春节，全家又坐在一起', year:'2026', date:'2026年春节', recorded:'2026年2月20日', category:'天伦时光', image:'family', author:'xia', scope:'family', text:['爸爸说，团圆并不需要安排很多事。一家人围着桌子吃饭，就已经很好。','我这次才知道，那道每年都会做的菜，最早是奶奶教给妈妈的。下次，我也想学会。'], quote:'一家人围着桌子吃饭，就已经很好。', source:'陈知夏的家庭记录', duration:'02:15'},
    {id:'private', title:'留给自己的几句话', year:'2026', date:'2026年10月', recorded:'2026年10月18日', category:'个人记录', image:'room', author:'father', scope:'private', text:['有些话，我想先留给自己。等准备好了，再慢慢讲给家人听。'], quote:'有些话，想先留给自己。', source:'本人文字记录', duration:'01:00'}
  ];
  /** 账号只维护身份与建档状态，年度权益由人物服务统一维护。 */
  function newAccount() {
    return {videoDelivered:false,hasDigital:false,setupIncluded:false};
  }
  /** 虚构待办用于红点演示；每次刷新或重置重新创建，处理不改写种子数据。 */
  function demoTasks() {
    return {
      questions:[
        {id:'demo-question-xia',from:'xia',owner:'father',text:'【演示】爸，你第一次拿到创业订单时，最想把好消息告诉谁？',storyId:'first-order',contentContext:{kind:'story',storyId:'first-order'},status:'pending',answer:'',replyRead:false,created:'演示数据'},
        {id:'demo-question-nian',from:'nian',owner:'father',text:'【演示】爷爷，小时候老家窗边的书桌，是谁经常在用？',storyId:'old-home',contentContext:{kind:'story',storyId:'old-home'},status:'pending',answer:'',replyRead:false,created:'演示数据'}
      ],
      answerFeedback:[
        {id:'demo-feedback-year',from:'xia',owner:'father',question:'【演示】第一笔订单是什么时候接到的？',original:'我记得是1997年接到的。',suggestion:'档案里记的是1998年，请爸爸核对一下具体年份。',reason:'fact',ref:{kind:'story',storyId:'first-order'},status:'pending',approved:'',note:'',resultRead:false},
        {id:'demo-feedback-style',from:'nian',owner:'father',question:'【演示】爷爷，你想对家人说些什么？',original:'请大家持续优化沟通效率，提升家庭协同水平。',suggestion:'这句话有点像工作报告，爷爷平常会说得更亲切一些，请爷爷改成自己的表达。',reason:'style',ref:{kind:'story',storyId:'old-home'},status:'pending',approved:'',note:'',resultRead:false}
      ]
    };
  }
  /** 创建隔离初始状态；家庭首页内容由独立模块按需创建。 */
  function initialState(example=true) {
    if(!example){
      const today=new Date().toISOString().slice(0,10);
      return {
        familyWorkspace:true,actor:'father',route:'home',idSequence:0,billingSeedDate:today,billingToday:today,
        members:['father'],accounts:{father:newAccount()},familyFocus:{},familyInvitations:{},
        familyAccess:{father:{archive:[],digital:[],space:[]}},familyRequests:[],
        stories:[],invitations:[],pending:[],accessRequests:[],fontLarge:false,
        familyHome:{family:{mottoOwner:'father',motto:null,suggestions:[]},profiles:{},drafts:{},review:null},
        archiveAssets:[],archiveProfiles:{},archivePerson:'father',lifeTab:'overview',videoFilter:'all',
        archivePlayback:{},biographyMode:'read',archiveChapterId:'',archiveItemId:'',year:'1986',hotspot:'desk',
        familyTab:'列表',chatTarget:'father',chatMessages:[],chatDrafts:{},questionDrafts:{},questions:[],
        materialDrafts:{},materialSubmissions:[],answerFeedback:[],feedbackDrafts:{},
        feedbackReviewDrafts:{},
        personServices:{},billingOrders:[],usageReceipts:[],billingPeople:{}
      };
    }
    const members=['father','mother','xia','grandpa','nian','grandma'];
    const tasks=demoTasks();
    const stories=structuredClone(STORIES).map(story=>({...story,subject:'father',confirmedBy:'father',aiAllowed:true,viewers:story.scope==='family'?[...members]:[]}));
    stories.push({
      id:'nian-birth-day',title:'念念出生了',category:'宝宝成长',babyMilestone:true,growthSample:true,fromFamily:true,
      author:'xia',subject:'xia',confirmedBy:'xia',relatedMembers:['nian'],
      scope:'family',viewers:[...members],date:'2016年5月20日',eventDate:'2016-05-20',year:'2016',recorded:'2016年5月20日',
      text:['家里多了一个小小的人。那天我们第一次听见她的声音。'],
      source:'陈家的成长记录 · 虚构示例'
    },{
      id:'nian-first-month',title:'念念满月了',category:'宝宝成长',babyMilestone:true,growthSample:true,fromFamily:true,
      author:'xia',subject:'xia',confirmedBy:'xia',relatedMembers:['nian'],
      scope:'family',viewers:[...members],date:'2016年6月20日',eventDate:'2016-06-20',year:'2016',recorded:'2016年6月20日',
      text:['那天念念握着妈妈的手指睡着了，一家人围着她看了好一会儿。'],
      source:'陈家的成长记录 · 虚构示例'
    },{
      id:'nian-first-new-year',title:'念念第一次自己拜年',category:'宝宝成长',babyMilestone:true,growthSample:true,fromFamily:true,
      author:'xia',subject:'xia',confirmedBy:'xia',relatedMembers:['nian','xia','father','mother'],
      scope:'family',viewers:[...members],date:'2020年春节',eventDate:'2020-01-25',year:'2020',recorded:'2026年11月10日',
      recordedAt:Date.parse('2026-11-10T09:00:00+08:00'),
      houseImage:'assets/family-home/reference/new-year-diary.webp',houseBytes:0,
      photoPrint:'assets/family-home/reference/new-year-greeting.webp',
      text:['出门前，她还问我，两只手要怎么放。'],
      replies:[{author:'father',text:'她出门前，在镜子前练了三遍。'}],
      source:'陈知夏的家庭记录 · 虚构示例'
    },{
      id:'father-tea-day',title:'午后泡了一壶茶',category:'家里日常',fromFamily:true,
      author:'father',subject:'father',confirmedBy:'father',relatedMembers:['father'],
      scope:'family',viewers:[...members],date:'2026年11月9日',eventDate:'2026-11-09',year:'2026',recorded:'2026年11月9日',
      recordedAt:Date.parse('2026-11-09T15:00:00+08:00'),houseImage:'assets/family-home/reference/afternoon-tea.webp',
      houseVoice:{url:'assets/family-home/elder-tea-demo.wav',bytes:0,sample:true},
      text:['下午和家里人坐了一会儿。茶泡开了，话也慢慢说开了。'],
      source:'陈远山的随手记 · 示例影像与合成语音'
    },{
      id:'father-first-work-photo',title:'爸爸第一天上班',category:'人生节点',lifeMilestone:true,lifeSample:true,fromFamily:true,
      author:'xia',subject:'xia',confirmedBy:'xia',relatedMembers:['father'],scope:'family',viewers:[...members],
      date:'1987 年',year:'1987',recorded:'2026年11月8日',recordedAt:Date.parse('2026-11-08T09:00:00+08:00'),
      houseImage:'assets/family-home/reference/first-day-at-work.webp',houseBytes:0,
      text:['整理照片时看到爸爸年轻时的样子，想听听他第一天上班的事。'],
      source:'陈知夏代记 · 合成的年代示意照片'
    },{
      id:'family-making-dumplings',title:'一家人包饺子',category:'家里日常',fromFamily:true,
      author:'xia',subject:'xia',confirmedBy:'xia',relatedMembers:['father','mother','grandpa','nian'],scope:'family',viewers:[...members],
      date:'2026年春节',year:'2026',recorded:'2026年2月17日',recordedAt:Date.parse('2026-02-17T18:00:00+08:00'),
      houseImage:'assets/family-home/reference/making-dumplings.webp',houseBytes:0,
      text:['一家人围在桌前，有人擀皮，有人拌馅，念念学着把饺子边捏紧。'],
      source:'陈家的家庭记录 · 虚构示例'
    });
    // 陈家的相框示例沿用陈远山署名的全家可见照片，打开后可以直接选来投送。
    stories.push(...[{
      id: 'chen-frame-reunion', title: '2026 年 · 除夕的全家福', category: '团圆时刻',
      year: '2026', date: '2026年除夕', relatedMembers: ['father', 'mother', 'xia', 'nian'],
      houseImage: 'assets/family-home/reference/family-reunion.webp',
      text: ['合影前，念念挨个喊大家坐好，拍完就跑来问我能不能再拍一张。']
    }, {
      id: 'chen-frame-old-lane', title: '2025 年 · 回老街看枣树', category: '故乡记忆',
      year: '2025', date: '2025年秋', relatedMembers: ['father', 'grandpa'],
      houseImage: 'assets/family-home/reference/old-lane.webp',
      text: ['拐进老街，一眼就认出了门口那棵枣树。我小时候常和父亲在树下乘凉。']
    }, {
      id: 'chen-frame-journey', title: '2018 年 · 和林慧一起去旅行', category: '山河同行',
      year: '2018', date: '2018年', relatedMembers: ['father', 'mother'],
      houseImage: 'assets/zhumen/couple-first-trip-demo.webp',
      text: ['有一段路我们走得很慢，看到好风景就停下来，顺便请路人帮忙拍了张合影。']
    }].map(story => ({
      ...story, author: 'father', subject: 'father', confirmedBy: 'father',
      scope: 'family', viewers: [...members], fromFamily: true, houseBytes: 0,
      recorded: '2026年10月29日', source: '陈远山的家庭记录 · 虚构示例'
    })));
    return {billingSeedDate:new Date().toISOString().slice(0,10),billingToday:new Date().toISOString().slice(0,10),personServices:{},familyHome:null,billingOrders:[],usageReceipts:[],billingPeople:{},familyFocus:{xia:'father',nian:'father'},familyInvitations:{xia:['father','mother'],nian:['father']},familyAccess:{father:{archive:['xia','nian'],digital:['xia','nian'],space:['xia','nian']},mother:{archive:['xia'],digital:[],space:[]}},familyRequests:[],actor:'father',route:'home',lifeTab:'overview',videoFilter:'all',archivePerson:'father',archiveAssets:null,archiveProfiles:null,archiveItemId:'',archiveChapterId:'',biographyMode:'read',archiveReturn:null,archivePlayback:{},familyTab:'列表',year:'1986',hotspot:'desk',chatTarget:'father',chatContext:null,chatMessages:[],chatDrafts:{},questionDrafts:{},storyId:'first-order',stories,members,invitations:[],pending:[],questions:tasks.questions,accessRequests:[],idSequence:0,materialDrafts:{},materialSubmissions:[],answerFeedback:tasks.answerFeedback,feedbackDrafts:{},feedbackReviewDrafts:{},feedbackReviewId:null,accounts:{father:{...newAccount(),videoDelivered:true,hasDigital:true,setupIncluded:true},xia:newAccount(),nian:newAccount()},fontLarge:false,modal:null,notice:''};
  }
  /** 两个还原入口同时清除动态人物与业务状态，保留头像等消费者持有的对象引用。 */
  function resetDemoState() {
    Object.keys(PEOPLE).forEach(id=>delete PEOPLE[id]);Object.assign(PEOPLE,structuredClone(PERSON_SEEDS));
    return initialState();
  }
  /** 输出统一线性图标，图标的可访问名称由外层按钮提供。 */
  function icon(name, cls='') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.book}</svg>`; }
  /** 转义示例表单输入，避免用户文字改变原型页面结构。 */
  function escape(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  /** 生成动作按钮，动作统一由事件代理执行。 */
  function button(label, action, cls='btn', extra='') { return `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`; }
  /** 生成站内导航按钮，保持静态文件也可进行页面切换。 */
  function link(label, route, cls='text-link', extra='') { return `<button type="button" class="${cls}" data-nav="${route}" ${extra}>${label}</button>`; }
  /** 有入口时返回实际页面，直接打开详情时使用指定地址。 */
  function returnLink(label, route, cls='text-link', extra='') {
    return button(label, 'back', cls, `data-return-route="${escape(route)}" ${extra}`);
  }
  /** 优先显示该账号上传的头像，其次沿用示例肖像和姓名缩写。 */
  function avatar(id, size='', { originalPortrait = false } = {}) {
    const p=PEOPLE[id];
    if (!p) return `<span class="avatar ${size}">家</span>`;
    const portrait = !App.state.familyWorkspace && {
      grandpa: 'assets/family-home/reference/grandpa.webp',
      grandma: 'assets/family-home/reference/grandma.webp',
      father: 'assets/family-home/reference/father.webp',
      mother: 'assets/family-home/reference/mother.webp',
      xia: 'assets/family-home/reference/xia.webp',
      nian: 'assets/zhumen/portrait-nian.webp'
    }[id];
    const uploaded = App.Households?.profileAvatar(id);
    const exampleSource = originalPortrait && portrait && ['grandpa', 'father', 'mother', 'xia'].includes(id)
      ? 'assets/zhumen/portrait-' + id + '.webp'
      : portrait;
    const source = uploaded || exampleSource;
    const label = uploaded ? p.name : p.name + '，设计稿中的示例人物';
    return source ? `<span class="avatar ${size} ${id}"><img src="${escape(source)}" alt="${escape(label)}"></span>` : `<span class="avatar ${size} ${p.color || ''}">${escape(p.short)}</span>`;
  }
  /** 内容标记同时使用文字，避免仅靠颜色传达意义。 */
  function badge(label, cls='') { return `<span class="badge ${cls}">${label}</span>`; }
  /** 获取当前账号对应的会员权益。 */
  function account() { return App.state.accounts[App.state.actor]; }
  /** 仅向当前访问者提供获授权的故事。 */
  function visibleStories() {
    return App.state.stories.filter(story=>App.FamilyContext.readable(story)).concat(App.Couples?.sharedFromOtherFamilies()||[]);
  }
  /** 内存递增编号避免连续提交落在同一毫秒时覆盖记录或问题。 */
  function nextId(prefix) {App.state.idSequence++;return `${prefix}-${App.state.idSequence}`;}
  /** 按秒转换为录制时间显示。 */
  function duration(seconds) { return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`; }
  window.App={state:initialState(),initialState,resetDemoState,newAccount,nextId,PEOPLE,HOME_NAME,icon,escape,button,link,returnLink,avatar,badge,account,visibleStories,duration,views:{}};
}
