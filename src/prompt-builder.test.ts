import { describe, expect, it } from 'vitest';
import {
  buildHiggsfieldExecutionPrompt,
  buildHiggsfieldPrompt,
  createHiggsfieldPromptSourceKey,
} from './prompt-builder';

describe('힉스필드 프롬프트 조립', () => {
  it('캐릭터·세계관·장면 정보를 출력 순서에 맞게 포함한다', () => {
    const prompt = buildHiggsfieldPrompt(
      { id: 's1', title: '첫 출근', action: '카운터 뒤에서 손님을 기다린다', dialogue: '오늘부터 알바생입니다', camera: '중간 클로즈업', mood: '따뜻한 코미디', negativePrompt: '얼굴 변형 금지' },
      { characters: [{ name: '밤톨', appearance: '크림색 골든리트리버', personality: '착하고 엉뚱함', voice: '해맑게 말함', imageDataUrl: 'image' }], world: { name: '멍멍시', tone: '따뜻한 도시 코미디', setting: '현재 한국', rules: ['강아지가 일한다'] }, relationships: [], episodeTitle: '편의점 첫 출근' },
    );
    expect(prompt).toContain('밤톨');
    expect(prompt).toContain('크림색 골든리트리버');
    expect(prompt).toContain('멍멍시');
    expect(prompt).toContain('카운터 뒤에서 손님을 기다린다');
    expect(prompt).toContain('Reference image');
  });

  it('빈 설정은 빈 라벨로 출력하지 않는다', () => {
    const prompt = buildHiggsfieldPrompt(
      { id: 's1', title: '짧은 장면', action: '걷는다', dialogue: '', camera: '', mood: '', negativePrompt: '' },
      { characters: [{ name: '루나', appearance: '', personality: '', voice: '', imageDataUrl: '' }], world: undefined, relationships: [], episodeTitle: '산책' },
    );
    expect(prompt).not.toContain('undefined');
    expect(prompt).not.toContain('대사: \n');
  });

  it('검수된 이야기 의도와 장면의 감정 변화를 프롬프트에 포함한다', () => {
    const prompt = buildHiggsfieldPrompt(
      { id: 's1', title: '선택', action: '밤톨이 간식을 내려놓는다', dialogue: '', camera: '클로즈업', mood: '진지한 코미디', negativePrompt: '', purpose: '주인공이 욕망보다 책임을 선택한다', emotionBefore: '갈등', emotionAfter: '안도' },
      { characters: [{ name: '밤톨', appearance: '골든리트리버', personality: '성실함', voice: '짧게 말함' }], world: undefined, relationships: [], episodeTitle: '첫 근무', story: { logline: '간식을 좋아하는 밤톨이 첫 근무를 지키려 유혹과 싸운다', theme: '책임', outerGoal: '근무를 성공한다', obstacle: '간식의 유혹' } },
    );
    expect(prompt).toContain('Story logline: 간식을 좋아하는 밤톨이 첫 근무를 지키려 유혹과 싸운다');
    expect(prompt).toContain('Scene purpose: 주인공이 욕망보다 책임을 선택한다');
    expect(prompt).toContain('Emotional change: 갈등 → 안도');
  });

  it('캐릭터 유형·습관·호불호·관계를 연출 순서대로 포함하고 기술 설정은 제외한다', () => {
    const prompt = buildHiggsfieldPrompt(
      { id: 's1', title: '들킨 순간', timeRange: '12–18초', action: '밤톨이 계산대 아래 간식을 숨긴다', dialogue: '이건 검사용입니다', camera: '빠른 줌인', mood: '들킬 듯한 긴장 코미디', negativePrompt: '캐릭터 교체 금지', characterIds: ['c1', 'c2'] },
      {
        characters: [
          { id: 'c1', name: '밤톨', type: 'animal', appearance: '크림색 골든리트리버', personality: '착하고 엉뚱함', voice: '해맑고 짧게 말함', habits: '긴장하면 꼬리를 흔듦', likes: '간식', dislikes: '혼나는 것' },
          { id: 'c2', name: '사장', type: 'human', appearance: '무표정한 중년', personality: '엄격하지만 다정함', voice: '낮고 단호함', habits: '', likes: '', dislikes: '' },
        ],
        world: { name: '멍멍시', tone: '생활 코미디', setting: '심야 편의점', rules: ['동물도 직업을 가진다'] },
        relationships: [{ id: 'r1', fromCharacterId: 'c1', toCharacterId: 'c2', kind: '알바생과 사장', description: '서로를 아직 완전히 믿지 못한다' }],
        episodeTitle: '편의점 첫 출근',
      },
    );
    expect(prompt).toContain('Type: animal');
    expect(prompt).toContain('Habits: 긴장하면 꼬리를 흔듦');
    expect(prompt).toContain('Likes: 간식');
    expect(prompt).toContain('Dislikes: 혼나는 것');
    expect(prompt).toContain('Relationship: 밤톨 → 사장 / 알바생과 사장 / 서로를 아직 완전히 믿지 못한다');
    expect(prompt).not.toContain('Time range:');
    expect(prompt).not.toContain('Format:');
    expect(prompt).not.toContain('Voice:');
    expect(prompt.indexOf('Action:')).toBeLessThan(prompt.indexOf('Setting:'));
    expect(prompt.indexOf('Setting:')).toBeLessThan(prompt.indexOf('Camera:'));
    expect(prompt.indexOf('Camera:')).toBeLessThan(prompt.indexOf('Mood:'));
    expect(prompt.indexOf('Mood:')).toBeLessThan(prompt.indexOf('Negative prompt:'));
  });
});

describe('바로 사용하는 힉스필드 실행 프롬프트', () => {
  const scene = {
    id: 's1', title: '첫 업무',
    action: '직원이 자료를 옮겨 달라고 하자 줄리아가 서류 더미를 급히 들고 뛰다가 종이를 흩뜨린다.',
    dialogue: '직원: “자료를 옮겨 주세요.” / 줄리아: “네!”',
    camera: '첫 1초 강한 클로즈업 뒤 빠른 줌아웃',
    mood: '현실적인 직장 코미디',
    negativePrompt: '외형 변경, 다리 왜곡 금지',
    emotionBefore: '의욕',
    emotionAfter: '당황하지만 수습하려는 집중',
  };
  const context = {
    characters: [{ id: 'c1', name: '줄리아', type: 'animal' as const, appearance: '검은색 시바견', personality: '성실함', voice: '해맑게 말함', imageDataUrl: 'data:image/png;base64,AAAA' }],
    world: { name: '일상 도시', tone: '현실적인 코미디', setting: '한국의 작은 사무실', rules: ['사람과 강아지는 서로의 말을 자연스럽게 알아듣고 대화한다'] },
    relationships: [],
    episodeTitle: '첫 출근',
  };

  it('상대적인 장면 흐름과 직전 장면 연결을 포함하고 기술·음성 설정과 연기 메모는 제외한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt(
      { ...scene, dialogue: '줄리아: “어버버… 네!”', continuityIn: '서류를 든 채 카운터 왼쪽에 서 있다', continuityOut: '바닥의 종이를 바라보며 두 앞발을 뻗은 자세' },
      {
        ...context,
        characters: [{ ...context.characters[0], voice: '해맑고 짧은 목소리, 당황하면 어버버' }],
        previousScene: { title: '지시', action: '줄리아가 서류를 든다', dialogue: '직원: “옮겨 주세요.”', continuityOut: '서류를 든 채 카운터 왼쪽에 서 있다' },
      },
    );

    expect(prompt).toContain('시작에는');
    expect(prompt).toContain('핵심 행동에서는');
    expect(prompt).toContain('마무리에는');
    expect(prompt).not.toContain('9:16');
    expect(prompt).not.toMatch(/\d+\s*[~～-]\s*\d+초/u);
    expect(prompt).not.toMatch(/\d+\s*초/u);
    expect(prompt).not.toContain('@audio');
    expect(prompt).not.toContain('해맑고 짧은 목소리');
    expect(prompt).toContain('이전 클립의 마지막 프레임');
    expect(prompt).toContain('입을 두어 번 달싹이고');
    expect(prompt).not.toContain('어버버');
  });

  it('앞 장면의 마지막 상태를 현재 장면의 오래된 시작 메모보다 우선한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt(
      { ...scene, continuityIn: '오른쪽에 앉아 있다' },
      { ...context, previousScene: { title: '앞 장면', action: '이동한다', dialogue: '', continuityOut: '왼쪽에 서 있다' } },
    );
    expect(prompt).toContain('왼쪽에 서 있다');
    expect(prompt).not.toContain('오른쪽에 앉아 있다');
  });

  it('설정표 대신 주체·행동·대사·카메라가 이어지는 한국어 연출문을 만든다', () => {
    const prompt = buildHiggsfieldExecutionPrompt(scene, context);

    expect(prompt).toContain('검은색 시바견');
    expect(prompt).toContain('두 발');
    expect(prompt).toContain('사람과 자연스럽게 대화');
    expect(prompt).toContain('“자료를 옮겨 주세요.”');
    expect(prompt).not.toContain('9:16');
    expect(prompt).not.toMatch(/\d+\s*[~～-]\s*\d+초/u);
    expect(prompt).not.toMatch(/\d+\s*초/u);
    expect(prompt).toContain('의욕');
    expect(prompt).toContain('당황하지만 수습하려는 집중');
    expect(prompt).toContain('조명');
    const sentenceCount = prompt.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    expect(sentenceCount).toBeGreaterThanOrEqual(4);
    expect(sentenceCount).toBeLessThanOrEqual(8);
    expect(prompt).not.toContain('CHARACTERS\n');
    expect(prompt).not.toContain('Character:');
  });

  it('고정된 AI 회사·부서·직무를 실행 프롬프트에 포함한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt(scene, {
      ...context,
      world: {
        ...context.world,
        workplace: {
          companyName: '미정', industry: 'AI 영상·콘텐츠 제작 회사', department: 'AI 콘텐츠 기획팀',
          role: '신입사원', duties: '영상 아이디어 기획, 프롬프트 초안, 결과물 검수, 회의·촬영 보조',
        },
      },
    });

    expect(prompt).toContain('AI 영상·콘텐츠 제작 회사');
    expect(prompt).toContain('AI 콘텐츠 기획팀');
    expect(prompt).toContain('신입사원');
    expect(prompt).toContain('승인 없이 다른 회사·부서·직무로 변경하지 않는다');
  });

  it('사람 같은 행동을 기본으로 하되 장면에 맞는 자연스러운 동물 행동은 허용한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt(scene, {
      ...context,
      characters: [{ ...context.characters[0], gender: 'female', behaviorStyle: 'humanlike' }],
    });

    expect(prompt).not.toContain('젊고 밝은 여성 사람 목소리');
    expect(prompt).not.toContain('남성 목소리와 굵은 저음을 금지');
    expect(prompt).toContain('두 발 행동을 기본');
    expect(prompt).toContain('앞발은 강아지 발 외형을 유지한 채 사람의 손처럼 사용');
    expect(prompt).toContain('냄새 맡기·혀 내밀기·헥헥거리기·짧은 네 발 동작은 장면과 감정에 자연스러우면 허용');
    expect(prompt).not.toContain('네 발 보행·짖기·헥헥거리기·바닥 냄새 맡기·혀 내밀기 금지');
  });

  it('소품을 사용하는 장면은 팔의 연속 경로·접촉점·가림 순서를 자동으로 고정한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt({
      ...scene,
      action: '줄리아가 면접 부스 책상 앞 의자에 앉아 노트북 키보드를 두 앞발로 누른다.',
      camera: '정면 미디엄 숏',
    }, context);

    expect(prompt).toContain('소품 위치');
    expect(prompt).toContain('어깨→팔꿈치→손목');
    expect(prompt).toContain('접촉점');
    expect(prompt).toContain('앞뒤 가림 순서');
    expect(prompt).toContain('신체가 소품을 관통');
    expect(prompt).toContain('30도 사선 구도');
  });

  it('화면 문구와 로고는 직접 생성하지 않고 완성된 @screen 이미지로 고정한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt({
      ...scene,
      action: '줄리아가 노트북의 면접 입장 버튼을 누르자 화면에 ‘10초 자기소개’가 뜬다.',
    }, context);

    expect(prompt).toContain('@screen');
    expect(prompt).toContain('정적인 2D 화면 텍스처');
    expect(prompt).toContain('번역·재작성·변형하지 않는다');
    expect(prompt).toContain('중국어·영어·임의 문자');
    expect(prompt).toContain('자동 자막');
    expect(prompt).not.toContain('‘10초 자기소개’');
    expect(prompt).toContain('시작에는');
    expect(prompt).toContain('노트북을 사용하는 캐릭터의 행동과 표정');
    expect(prompt).toContain('화면 전환에서는');
    expect(prompt).toContain('어깨너머로 노트북 화면에 빠르게 접근');
    expect(prompt).toContain('마무리에는');
    expect(prompt).toContain('@screen이 프레임 전체를 채우는 완성 화면 인서트');
    expect(prompt).not.toMatch(/\d+\s*[~～-]\s*\d+초/u);
  });

  it('노트북을 사용해도 화면 내용을 보여주지 않는 장면은 화면 인서트로 전환하지 않는다', () => {
    const prompt = buildHiggsfieldExecutionPrompt({
      ...scene,
      action: '줄리아가 노트북 키보드로 회의 내용을 입력한다.',
    }, context);

    expect(prompt).toContain('시작에는');
    expect(prompt).toContain('핵심 행동에서는');
    expect(prompt).not.toContain('화면 전환에서는');
    expect(prompt).not.toContain('완성 화면 인서트');
  });

  it('승인된 장면 참고 이미지만 영상의 시각 기준으로 사용한다', () => {
    const prompt = buildHiggsfieldExecutionPrompt({
      ...scene,
      referenceAssets: [
        { id: 'a1', keyword: '면접 부스', category: 'environment', reason: '공간 기준', imagePrompt: '현실적인 온라인 면접 부스', priority: 'required', status: 'approved' },
        { id: 'a2', keyword: '노트북', category: 'prop', reason: '핵심 소품', imagePrompt: '은색 노트북', priority: 'required', status: 'proposed' },
      ],
    }, context);

    expect(prompt).toContain('승인된 참고 이미지만');
    expect(prompt).toContain('면접 부스');
    expect(prompt).not.toContain('은색 노트북');
  });

  it('프롬프트 입력이 달라지면 출처 키가 바뀌지만 사진 원문 값은 키에 넣지 않는다', () => {
    const original = createHiggsfieldPromptSourceKey(scene, context);
    const changedAction = createHiggsfieldPromptSourceKey({ ...scene, action: '줄리아가 천천히 자료를 정리한다.' }, context);
    const changedImageBytes = createHiggsfieldPromptSourceKey(scene, {
      ...context,
      characters: [{ ...context.characters[0], imageDataUrl: 'data:image/png;base64,BBBB' }],
    });

    expect(changedAction).not.toBe(original);
    expect(changedImageBytes).toBe(original);
    expect(original).toMatch(/^hf-v2-/);
  });
});
