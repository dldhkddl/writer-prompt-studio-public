import type { Project } from './types';

export const sampleProject: Project = {
  characters: [{ id: '밤톨', name: '밤톨', type: 'animal', gender: 'female', behaviorStyle: 'humanlike', appearance: '크림색 털의 골든리트리버, 큰 귀, 오른쪽 눈 아래 작은 점', personality: '착하지만 눈치가 조금 없고 무엇이든 열심히 한다', voice: '해맑고 짧은 문장, 당황하면 말끝을 흐린다', habits: '긴장하면 꼬리를 빠르게 흔든다', likes: '간식, 칭찬, 새로운 일', dislikes: '혼나는 것, 빈 간식 봉지', imageDataUrl: '' }],
  worlds: [{ id: '멍멍시', name: '멍멍시', tone: '현실적인 도시 속 엉뚱하고 따뜻한 코미디', setting: '현재 한국의 작은 동네', rules: ['강아지 캐릭터는 사람처럼 두 발로 걷고 물건을 사용하며 일할 수 있다', '사람과 강아지는 서로의 말을 자연스럽게 알아듣고 대화한다', '모든 직업에는 수습 기간이 있다'], workplace: { companyName: '미정', industry: 'AI 영상·콘텐츠 제작 회사', department: 'AI 콘텐츠 기획팀', role: '신입사원', duties: '영상 아이디어 기획, 프롬프트 초안, 결과물 검수, 회의·촬영 보조' } }],
  relationships: [],
  episodes: [{ id: '편의점-첫-출근', title: '편의점 첫 출근부터 간식 털린 밤톨', idea: '밤톨이 편의점 알바를 시작했는데 손님들이 전부 간식만 사달라고 한다.', logline: '간식을 너무 좋아하는 초보 알바생 밤톨이 첫 근무를 지키기 위해 손님들의 유혹과 자신의 식욕을 이겨내야 한다.', theme: '잘하는 것보다 끝까지 책임지는 마음', outerGoal: '편의점 첫 근무를 무사히 마친다', innerNeed: '실수해도 숨기지 않고 책임지는 법을 배운다', flaw: '간식 앞에서 판단력이 흐려진다', obstacle: '간식만 요구하는 손님들과 사라지는 재고', stakes: '첫날부터 해고되고 동네에 소문난다', twist: '재고가 사라진 이유는 밤톨이 아니라 손님들의 공동 시식이었다', ending: '밤톨이 솔직하게 실수를 인정하고 사장은 밤톨을 시식 담당으로 남긴다', nextHook: '다음 날에는 더 까다로운 고양이 손님이 찾아온다', worldId: '멍멍시', characterIds: ['밤톨'], status: 'draft', updatedAt: new Date().toISOString(), beats: [
    { id: '비트-hook', kind: 'hook', label: '훅', timeRange: '8초', purpose: '첫 1~2초 안에 시선을 붙잡는다', content: '밤톨이 입가에 과자 부스러기를 묻힌 채 “저 정말 안 먹었습니다”라고 말한다.' },
    { id: '비트-setup', kind: 'setup', label: '상황 설정', timeRange: '8초', purpose: '주인공과 현재 상황을 빠르게 이해시킨다', content: '첫 출근한 밤톨이 편의점 앞치마를 입고 자신 있게 카운터에 선다.' },
    { id: '비트-escalation', kind: 'escalation', label: '갈등 상승', timeRange: '8초', purpose: '목표 달성을 방해하는 문제를 키운다', content: '손님들이 간식을 계속 올려놓고 재고 숫자가 빠르게 줄어든다.' },
    { id: '비트-twist', kind: 'twist', label: '전환', timeRange: '8초', purpose: '예상과 다른 정보나 선택을 제시한다', content: '사장이 빈 봉지를 발견하고 밤톨을 의심하지만 손님들이 갑자기 손을 든다.' },
    { id: '비트-climax', kind: 'climax', label: '클라이맥스', timeRange: '8초', purpose: '주인공이 가장 중요한 선택이나 행동을 한다', content: '밤톨이 자신도 한 개 먹었다고 솔직히 인정하고 월급에서 빼달라고 한다.' },
    { id: '비트-punchline', kind: 'punchline', label: '펀치라인', timeRange: '8초', purpose: '웃음이나 감정의 보상을 준다', content: '사장이 밤톨에게 시식 담당 명찰을 달아주자 밤톨이 두 눈을 빛낸다.' },
    { id: '비트-next', kind: 'next', label: '다음 편 연결', timeRange: '8초', purpose: '다음 이야기를 궁금하게 만든다', content: '문이 열리고 선글라스를 쓴 고양이 손님이 들어온다.' },
  ], scenes: [
    { id: '장면-1', title: '첫 출근', action: '밤톨이 편의점 카운터 뒤에서 앞치마를 입고 긴장한 채 손님을 기다린다.', dialogue: '밤톨: 오늘부터 저도 어엿한 알바생입니다!', camera: '세로형 9:16, 중간 클로즈업, 천천히 줌인', mood: '따뜻하고 현실적인 코미디', negativePrompt: '얼굴 변형, 품종 변경, 다리 왜곡, 과도한 애니메이션풍 금지' },
    { id: '장면-2', title: '수상한 손님', action: '작은 강아지 손님이 카운터에 간식 봉지를 잔뜩 올려두고 밤톨을 빤히 바라본다.', dialogue: '손님: 이거… 알바생 할인 되나요?', camera: '손님 시점에서 밤톨로 빠르게 팬, 리액션 클로즈업', mood: '귀엽고 템포 빠른 반전', negativePrompt: '새 캐릭터 임의 생성, 얼굴 변형, 손발 오류 금지' },
    { id: '장면-3', title: '뜻밖의 결말', action: '밤톨이 계산 대신 간식을 하나 몰래 먹다가 사장에게 들키고, 손님들은 박수를 친다.', dialogue: '사장: 밤톨 씨, 계산은 안 하고 시식만 하셨죠? / 밤톨: 검수였습니다!', camera: '와이드 샷에서 코믹한 빠른 줌인, 마지막에 정지 프레임', mood: '엉뚱하고 사랑스러운 결말', negativePrompt: '입 모양 왜곡, 자막 깨짐, 과도한 흔들림 금지' },
  ] }],
  trends: [{ id: '트렌드-1', title: '현실 공감형 직업극', sourceUrl: 'https://newsroom.tiktok.com/tiktok-next-2026-our-trend-forecast-for-marketers-for-the-year-ahead?lang=en-AU', checkedAt: '2026-08-28', platform: 'TikTok 공식 보고서', note: '과장된 판타지보다 현실적인 상황, 인간적인 유머, 댓글 참여를 우선한다.' }],
};
