const STORY_FIELDS = ['logline', 'theme', 'outerGoal', 'innerNeed', 'flaw', 'obstacle', 'stakes', 'twist', 'ending', 'nextHook'];
const BEAT_KIND_ORDER = ['hook', 'setup', 'escalation', 'twist', 'climax', 'punchline', 'next'];
const BEAT_KINDS = new Set(BEAT_KIND_ORDER);
const MAX_TEXT_LENGTH = 6000;
const EPISODE_FIELDS = ['id', 'title', 'idea', 'characterIds', ...STORY_FIELDS];
const CHARACTER_FIELDS = ['id', 'name', 'type', 'gender', 'behaviorStyle', 'appearance', 'personality', 'voice', 'habits', 'likes', 'dislikes'];
const RELATIONSHIP_FIELDS = ['id', 'fromCharacterId', 'toCharacterId', 'kind', 'description'];
const WORLD_FIELDS = ['id', 'name', 'tone', 'setting'];
const WORKPLACE_FIELDS = ['companyName', 'industry', 'department', 'role', 'duties'];
const APPEARANCE_CHARACTER_FIELDS = ['id', 'name', 'type', 'personality', 'habits', 'likes', 'dislikes'];
const HIGGSFIELD_EPISODE_FIELDS = ['id', 'title', 'logline', 'theme', 'outerGoal', 'obstacle'];
const HIGGSFIELD_SCENE_FIELDS = ['id', 'title', 'purpose', 'emotionBefore', 'emotionAfter', 'action', 'dialogue', 'camera', 'mood', 'negativePrompt', 'characterIds', 'continuityIn', 'continuityOut'];
const HIGGSFIELD_CHARACTER_FIELDS = [...CHARACTER_FIELDS, 'hasReferenceImage'];
const REFERENCE_ASSET_SCENE_FIELDS = ['id', 'title', 'purpose', 'action', 'dialogue', 'camera', 'mood', 'continuityIn', 'continuityOut'];
const REFERENCE_ASSET_CATEGORIES = new Set(['environment', 'wardrobe', 'prop', 'screen']);
const REFERENCE_ASSET_PRIORITIES = new Set(['required', 'optional']);
const PHOTO_APPEARANCE_CHARACTER_FIELDS = ['id', 'type'];
const APPEARANCE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_APPEARANCE_IMAGE_BYTES = 2 * 1024 * 1024;
const COMEDY_MODES = new Set(['relatable', 'meme']);
const SERIES_CANDIDATE_TEXT_FIELDS = ['id', 'title', 'category', 'comedyMode', 'concept', 'conflict', 'reversal', 'visualGag', 'payoff', 'funReason'];
const SERIES_PROPOSAL_TEXT_FIELDS = ['id', 'title', 'category', 'comedyMode', 'idea', ...STORY_FIELDS, 'whyNow'];
const SERIES_FUN_FIELDS = ['setup', 'escalation', 'reversal', 'visualGag', 'payoff', 'funReason'];
const SERIES_SOURCE_SCENE_FIELDS = ['id', 'title', 'purpose', 'emotionBefore', 'emotionAfter', 'action', 'dialogue', 'continuityIn', 'continuityOut', 'characterIds'];
const STORY_HISTORY_FIELDS = ['id', 'title', 'idea', 'logline', 'twist', 'ending'];
const STORY_AVOID_FIELDS = ['fullScript', 'logline', 'twist', 'ending'];
const MAX_STORY_HISTORY = 12;
const STORY_VARIATION_ANGLES = [
  '이번 화는 주인공의 사소한 습관이 문제를 만들면서 시작한다.',
  '이번 화는 다른 캐릭터가 먼저 일을 벌이고 주인공이 수습에 끌려 들어가면서 시작한다.',
  '이번 화는 물건이나 장비가 예상과 다르게 작동하면서 시작한다.',
  '이번 화는 두 캐릭터가 같은 말을 서로 다르게 알아들으면서 시작한다.',
  '이번 화는 주인공이 스스로 정한 작은 목표를 지키려다 무리하면서 시작한다.',
  '이번 화는 평소와 다른 시간대나 평소 가지 않던 공간에서 시작한다.',
  '이번 화는 밖에서 들어온 요청이나 마감이 주인공을 밀어붙이면서 시작한다.',
  '이번 화는 지난 일의 뒷정리를 하다가 새 문제가 튀어나오면서 시작한다.',
];
const STORY_VARIATION_TEXTURES = [
  '웃음은 주인공이 지나치게 진지한 데서 나오게 한다.',
  '웃음은 말과 행동이 서로 어긋나는 데서 나오게 한다.',
  '웃음은 점점 커지는 물리적 난장에서 나오게 한다.',
  '웃음은 짧고 건조한 한마디에서 나오게 한다.',
  '웃음은 곁에 있는 인물의 무표정한 반응에서 나오게 한다.',
  '웃음은 너무 쉽게 풀려버려서 오는 허탈함에서 나오게 한다.',
];

export function pickStoryVariation(random = Math.random, previous) {
  const choose = (list, avoid) => {
    const pool = avoid && list.length > 1 ? list.filter((item) => item !== avoid) : list;
    const index = Math.floor(random() * pool.length);
    return pool[Math.min(Math.max(index, 0), pool.length - 1)];
  };
  return {
    angle: choose(STORY_VARIATION_ANGLES, previous?.angle),
    texture: choose(STORY_VARIATION_TEXTURES, previous?.texture),
  };
}

export function createStoryVariationPicker(random = Math.random) {
  let previous;
  return () => {
    previous = pickStoryVariation(random, previous);
    return previous;
  };
}

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value) => typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : undefined;
const stripVideoTechnicalSettings = (value) => cleanText(value)
  ?.replace(/(?:세로형\s*)?9\s*:\s*16/giu, '')
  .replace(/\d+\s*[~～–—-]\s*\d+\s*초(?:에는|동안)?/gu, '')
  .replace(/첫\s*\d+(?:\.\d+)?\s*초(?:\s*동안)?/gu, '시작에는')
  .replace(/\b\d+(?:\.\d+)?\s*초(?:\s*동안)?/gu, '')
  .replace(/\b(?:4K|8K|1080P|720P)\b|초고화질|고화질|해상도/giu, '')
  .replace(/\s{2,}/g, ' ')
  .replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, '')
  .trim();
const pickTextFields = (value, fields) => Object.fromEntries(fields.flatMap((field) => {
  if (field === 'characterIds') return Array.isArray(value[field]) ? [[field, value[field].slice(0, 20).flatMap((id) => cleanText(id) ? [cleanText(id)] : [])]] : [];
  const text = cleanText(value[field]);
  return text === undefined ? [] : [[field, text]];
}));

const assertArrayLimit = (value, max, label) => {
  if (value.length > max) throw new Error(`${label} 개수가 허용 범위를 넘었습니다.`);
};
const cleanStringArray = (value, max = 30) => Array.isArray(value) ? value.slice(0, max).flatMap((item) => cleanText(item) ? [cleanText(item)] : []) : [];
const cleanWorld = (value) => {
  const world = { ...pickTextFields(value, WORLD_FIELDS), rules: cleanStringArray(value.rules) };
  if (isObject(value.workplace)) world.workplace = pickTextFields(value.workplace, WORKPLACE_FIELDS);
  return world;
};

export function validateStoryRequest(value) {
  if (!isObject(value) || !isObject(value.episode) || !Array.isArray(value.characters) || !Array.isArray(value.relationships)) {
    throw new Error('요청 데이터 구조가 올바르지 않습니다.');
  }
  if (value.world !== undefined && value.world !== null && !isObject(value.world)) {
    throw new Error('요청 데이터의 세계관 구조가 올바르지 않습니다.');
  }
  assertArrayLimit(value.characters, 20, '캐릭터');
  assertArrayLimit(value.relationships, 100, '관계');
  const episode = pickTextFields(value.episode, EPISODE_FIELDS);
  episode.beats = Array.isArray(value.episode.beats) ? value.episode.beats.slice(0, 7).flatMap((beat) => {
    if (!isObject(beat) || !BEAT_KINDS.has(beat.kind)) return [];
    const content = cleanText(beat.content);
    const continuityOut = cleanText(beat.continuityOut);
    return content === undefined ? [] : [{ kind: beat.kind, content, ...(continuityOut ? { continuityOut } : {}) }];
  }) : [];
  const characters = value.characters.flatMap((character) => isObject(character) ? [pickTextFields(character, CHARACTER_FIELDS)] : []);
  const relationships = value.relationships.flatMap((relationship) => isObject(relationship) ? [pickTextFields(relationship, RELATIONSHIP_FIELDS)] : []);
  const cleaned = { episode, characters, relationships };
  if (isObject(value.world)) {
    cleaned.world = cleanWorld(value.world);
  }
  if (value.history !== undefined && !Array.isArray(value.history)) {
    throw new Error('요청 데이터의 이전 화 기록 구조가 올바르지 않습니다.');
  }
  const history = Array.isArray(value.history) ? value.history : [];
  assertArrayLimit(history, MAX_STORY_HISTORY, '이전 화 기록');
  const cleanedHistory = history.flatMap((item) => {
    if (!isObject(item)) return [];
    const entry = pickTextFields(item, STORY_HISTORY_FIELDS);
    return Object.keys(entry).length ? [entry] : [];
  });
  if (cleanedHistory.length) cleaned.history = cleanedHistory;
  if (value.avoid !== undefined && value.avoid !== null && !isObject(value.avoid)) {
    throw new Error('요청 데이터의 회피 목록 구조가 올바르지 않습니다.');
  }
  if (isObject(value.avoid)) {
    const avoid = pickTextFields(value.avoid, STORY_AVOID_FIELDS);
    const avoidBeats = cleanStringArray(value.avoid.beats, 7);
    if (avoidBeats.length) avoid.beats = avoidBeats;
    if (Object.keys(avoid).length) cleaned.avoid = avoid;
  }
  return cleaned;
}

export function sanitizeStoryDraft(value) {
  if (!isObject(value)) throw new Error('Codex 응답 형식이 올바르지 않습니다.');
  const result = {};
  for (const field of STORY_FIELDS) {
    const text = cleanText(value[field]);
    if (!text) throw new Error('Codex 응답의 필수 이야기 필드가 비어 있습니다.');
    result[field] = text;
  }
  const beats = Array.isArray(value.beats) ? value.beats.flatMap((beat) => {
    if (!isObject(beat) || !BEAT_KINDS.has(beat.kind)) return [];
    const content = cleanText(beat.content);
    const continuityOut = cleanText(beat.continuityOut);
    return content && continuityOut ? [{ kind: beat.kind, content, continuityOut }] : [];
  }) : [];
  if (beats.length !== 7 || new Set(beats.map((beat) => beat.kind)).size !== 7) throw new Error('Codex 응답에는 서로 다른 7개 비트가 필요합니다.');
  result.beats = beats;
  result.editorNotes = Array.isArray(value.editorNotes) ? value.editorNotes.flatMap((note) => {
    const text = cleanText(note);
    return text === undefined ? [] : [text];
  }) : [];
  return result;
}

export function buildStoryPrompt(requestValue, { variation } = {}) {
  const request = validateStoryRequest(requestValue);
  const chosen = variation ?? pickStoryVariation();
  const lines = [
    '프로젝트 루트의 AGENTS.md를 읽고 반드시 그 규칙을 따른다.',
    '숏폼 시나리오 작가로 초안을 다듬은 뒤 스토리 에디터로 구조를 검수한다.',
    '특정 계정이나 작가의 표현을 복제하지 말고, 제공된 캐릭터·세계관·관계 밖의 설정을 임의로 만들지 않는다.',
    'Instagram Reels 에피소드를 30초로 억지로 압축하지 않는다. 7개 이야기 비트는 각각 하나의 8초 장면이 되며, 순서대로 이어 붙였을 때 처음부터 끝까지 자연스럽게 읽히는 56초 전체 대본이 되어야 한다.',
    '모든 장면은 하나의 이어진 사건이어야 한다. 각 비트의 continuityOut에 이전 장면의 마지막 상태인 인물 위치·자세·시선·의상·소품·감정을 하나의 촬영 가능한 문장으로 쓰고, 그 상태가 다음 장면의 첫 상태와 정확히 이어지게 한다.',
    '각 비트의 content는 줄거리 요약이 아니라 카메라에 보이는 연속된 시각적 행동, 표정과 몸짓의 반응, 필요한 실제 대사를 시간 안에 촬영 가능한 순서로 쓴다.',
    '세계관이 허용하면 사람과 동물 캐릭터는 서로의 말을 이해하고 자연스럽게 대화하며, 동물 캐릭터도 두 발로 걷고 일하고 물건을 사용할 수 있다.',
    '캐릭터의 gender와 behaviorStyle은 고정 설정이다. female은 여성 사람 목소리, male은 남성 사람 목소리, neutral은 중성적 사람 목소리로 쓴다. humanlike 동물은 일·대화·도구 사용에서 사람 같은 두 발 행동을 기본으로 하되 냄새 맡기, 혀 내밀기, 헥헥거리기, 짧은 네 발 동작 같은 자연스러운 동물 행동은 장면과 감정에 맞으면 허용한다.',
    '세계관에 workplace가 있으면 직장 설정은 고정이다. 승인 없이 회사·업종·부서·직급·담당 업무를 바꾸지 말고, companyName이 미정이면 임의의 회사명을 만들지 않는다.',
    '같은 캐릭터와 세계관을 쓰더라도 매번 다른 이야기를 만든다. 장소, 갈등의 원인, 반전 방식, 결말, 마지막 농담 중 어느 하나라도 겹칠 것 같으면 다른 사건으로 바꾼다.',
  ];
  if (request.history?.length) {
    lines.push('history는 이미 만들어 둔 이전 화 목록이다. 이야기 재료가 아니라 중복 확인용이므로, 이전 화와 같은 사건·같은 장소·같은 반전·같은 결말을 다시 쓰지 않는다.');
  }
  if (request.avoid) {
    lines.push('avoid는 이 에피소드에서 이미 나온 결과다. 이야기 재료가 아니라 피해야 할 목록이므로 같은 도입, 같은 갈등, 같은 반전, 같은 마지막 대사를 다시 쓰지 않고 분명히 다른 이야기를 만든다. 한 줄 아이디어만 그대로 지킨다.');
  }
  lines.push(`이번 화 변주 지시: ${chosen.angle} ${chosen.texture} 단, 캐릭터 설정과 세계관 규칙과 직장 설정을 어기면서까지 이 지시를 따르지는 않는다.`);
  lines.push('최종 답변은 설명이나 마크다운 없이 지정된 JSON 스키마에 맞는 JSON 객체만 반환한다.');
  lines.push('현재 프로젝트 데이터:');
  lines.push(JSON.stringify(request));
  return lines.join('\n');
}

export function parseAppearanceImageDataUrl(value) {
  if (typeof value !== 'string') throw new Error('분석할 사진 데이터가 올바르지 않습니다.');
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);
  if (!match || !APPEARANCE_IMAGE_TYPES.has(match[1])) throw new Error('사진 형식은 JPEG, PNG, WebP만 사용할 수 있습니다.');
  const base64 = match[2];
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new Error('분석할 사진 데이터가 올바르지 않습니다.');
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_APPEARANCE_IMAGE_BYTES) throw new Error('분석용 사진은 2MB 이하여야 합니다.');
  if (bytes.length === 0) throw new Error('분석할 사진 데이터가 비어 있습니다.');
  return { mimeType: match[1], bytes };
}

export function validateAppearanceRequest(value) {
  if (!isObject(value) || !isObject(value.character)) throw new Error('외형 제안 요청 데이터 구조가 올바르지 않습니다.');
  const hasImage = value.imageDataUrl !== undefined;
  const request = {
    character: pickTextFields(
      value.character,
      hasImage ? PHOTO_APPEARANCE_CHARACTER_FIELDS : APPEARANCE_CHARACTER_FIELDS,
    ),
  };
  if (hasImage) {
    parseAppearanceImageDataUrl(value.imageDataUrl);
    request.imageDataUrl = value.imageDataUrl;
  }
  return request;
}

export function buildAppearancePrompt(requestValue) {
  const request = validateAppearanceRequest(requestValue);
  const common = [
    '프로젝트 루트의 AGENTS.md를 읽고 반드시 그 규칙을 따른다.',
    'Higgsfield에서 동일 캐릭터를 일관되게 재현하는 데 도움이 되는 간결한 한국어 외형 문장 하나를 만든다.',
    '최종 답변은 설명이나 마크다운 없이 지정된 JSON 스키마에 맞는 JSON 객체만 반환한다.',
  ];
  const task = request.imageDataUrl
    ? [
        '사진에 직접 보이는 털 또는 피부의 색과 질감, 얼굴형, 눈, 귀, 체형과 비율, 무늬, 보이는 액세서리만 관찰한다.',
        '정체성, 성격, 건강 상태, 민감한 인구통계 정보, 가려졌거나 보이지 않는 특징은 추측하지 않는다.',
      ]
    : [
        '사진이 제공되지 않았다. 아래 캐릭터 설정을 재료로 관찰 결과가 아닌 창작 외형을 제안한다.',
        '성격과 습관을 외모로 단정하지 말고, 숏폼에서 구별하기 쉬운 시각적 특징을 설계한다.',
      ];
  return [...common, ...task, '캐릭터 설정:', JSON.stringify(request.character)].join('\n');
}

export function sanitizeAppearanceSuggestion(value) {
  if (!isObject(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'appearance')) {
    throw new Error('Codex 외형 응답 형식이 올바르지 않습니다.');
  }
  const appearance = cleanText(value.appearance);
  if (!appearance) throw new Error('Codex 외형 응답이 비어 있습니다.');
  return { appearance };
}

export function validateReferenceAssetRequest(value) {
  if (!isObject(value) || !isObject(value.episode) || !isObject(value.scene) || !Array.isArray(value.characters)) {
    throw new Error('장면 필요 이미지 요청 데이터 구조가 올바르지 않습니다.');
  }
  if (value.world !== undefined && value.world !== null && !isObject(value.world)) {
    throw new Error('장면 필요 이미지 세계관 구조가 올바르지 않습니다.');
  }
  assertArrayLimit(value.characters, 20, '캐릭터');
  const characters = value.characters.flatMap((character) => {
    if (!isObject(character)) return [];
    const cleaned = pickTextFields(character, ['id', 'name', 'type', 'appearance', 'behaviorStyle']);
    if (typeof character.hasReferenceImage === 'boolean') cleaned.hasReferenceImage = character.hasReferenceImage;
    return [cleaned];
  });
  const cleaned = {
    episode: pickTextFields(value.episode, ['id', 'title']),
    scene: pickTextFields(value.scene, REFERENCE_ASSET_SCENE_FIELDS),
    characters,
  };
  if (isObject(value.world)) cleaned.world = cleanWorld(value.world);
  return cleaned;
}

export function buildReferenceAssetPrompt(requestValue) {
  const request = validateReferenceAssetRequest(requestValue);
  return [
    '프로젝트 루트의 AGENTS.md를 읽고 반드시 그 규칙을 따른다.',
    '힉스필드 프롬프트 감독으로서 이 장면의 외형과 공간을 안정적으로 유지하려면 별도 기준 이미지가 필요한 항목을 3개 이상 6개 이하로 제안한다.',
    '장면 문장 속 모든 명사를 뽑지 않는다. 배경 공간, 장면마다 달라지는 의상, 직접 조작하거나 이야기 결과에 영향을 주는 핵심 소품, 화면 내용처럼 영상 일관성에 실제로 도움이 되는 것만 고른다.',
    '캐릭터 기준 사진은 이미 있으므로 캐릭터 자체를 다시 제안하지 않는다. hasReferenceImage가 true인 캐릭터의 사진은 자동 재사용된다.',
    '장면에 없는 브랜드·소품·공간·사건을 새로 만들지 않는다. 화면 이미지는 상표·로고·깨진 글자를 피할 수 있도록 글자 없는 구조를 우선한다.',
    'keyword는 사용자가 한눈에 알아볼 짧은 한국어 이름, reason은 이 이미지가 필요한 구체적 이유, imagePrompt는 해당 항목 하나를 만들 수 있는 구체적인 한국어 이미지 생성 프롬프트로 쓴다.',
    'category는 environment, wardrobe, prop, screen 중 하나, priority는 required 또는 optional 중 하나만 사용한다.',
    '최종 답변은 설명이나 마크다운 없이 지정된 JSON 스키마에 맞는 JSON 객체만 반환한다.',
    '검수할 장면 데이터:',
    JSON.stringify(request),
  ].join('\n');
}

export function sanitizeReferenceAssetSuggestions(value) {
  if (!isObject(value) || !Array.isArray(value.assets) || value.assets.length < 3 || value.assets.length > 6) {
    throw new Error('Codex 장면 필요 이미지 응답에는 3~6개 항목이 필요합니다.');
  }
  const seen = new Set();
  const assets = value.assets.map((asset) => {
    if (!isObject(asset)) throw new Error('Codex 장면 필요 이미지 응답 형식이 올바르지 않습니다.');
    const keyword = cleanText(asset.keyword);
    const reason = cleanText(asset.reason);
    const imagePrompt = cleanText(asset.imagePrompt);
    if (!keyword || !reason || !imagePrompt) throw new Error('Codex 장면 필요 이미지 응답의 필수 문장이 비어 있습니다.');
    if (!REFERENCE_ASSET_CATEGORIES.has(asset.category)) throw new Error('Codex 장면 필요 이미지 분류가 올바르지 않습니다.');
    if (!REFERENCE_ASSET_PRIORITIES.has(asset.priority)) throw new Error('Codex 장면 필요 이미지 우선순위가 올바르지 않습니다.');
    const key = keyword.toLocaleLowerCase('ko-KR');
    if (seen.has(key)) throw new Error('Codex 장면 필요 이미지에 중복 항목이 있습니다.');
    seen.add(key);
    return { keyword, category: asset.category, reason, imagePrompt, priority: asset.priority };
  });
  return { assets };
}

export function validateHiggsfieldRequest(value) {
  if (!isObject(value) || !isObject(value.episode) || !isObject(value.scene) || !Array.isArray(value.characters) || !Array.isArray(value.relationships)) {
    throw new Error('힉스필드 프롬프트 요청 데이터 구조가 올바르지 않습니다.');
  }
  if (value.world !== undefined && value.world !== null && !isObject(value.world)) {
    throw new Error('힉스필드 세계관 구조가 올바르지 않습니다.');
  }
  if (value.previousScene !== undefined && value.previousScene !== null && !isObject(value.previousScene)) {
    throw new Error('힉스필드 이전 장면 구조가 올바르지 않습니다.');
  }
  assertArrayLimit(value.characters, 20, '캐릭터');
  assertArrayLimit(value.relationships, 100, '관계');
  const characters = value.characters.flatMap((character) => {
    if (!isObject(character)) return [];
    const cleaned = pickTextFields(character, HIGGSFIELD_CHARACTER_FIELDS.filter((field) => field !== 'hasReferenceImage'));
    if (typeof character.hasReferenceImage === 'boolean') cleaned.hasReferenceImage = character.hasReferenceImage;
    return [cleaned];
  });
  const cleaned = {
    episode: pickTextFields(value.episode, HIGGSFIELD_EPISODE_FIELDS),
    scene: pickTextFields(value.scene, HIGGSFIELD_SCENE_FIELDS),
    characters,
    relationships: value.relationships.flatMap((relationship) => isObject(relationship) ? [pickTextFields(relationship, RELATIONSHIP_FIELDS)] : []),
  };
  const camera = stripVideoTechnicalSettings(cleaned.scene.camera);
  if (camera) cleaned.scene.camera = camera;
  else delete cleaned.scene.camera;
  if (isObject(value.previousScene)) {
    cleaned.previousScene = pickTextFields(value.previousScene, HIGGSFIELD_SCENE_FIELDS);
    const previousCamera = stripVideoTechnicalSettings(cleaned.previousScene.camera);
    if (previousCamera) cleaned.previousScene.camera = previousCamera;
    else delete cleaned.previousScene.camera;
  }
  if (isObject(value.world)) {
    cleaned.world = cleanWorld(value.world);
  }
  return cleaned;
}

export function buildHiggsfieldPrompt(requestValue) {
  const request = validateHiggsfieldRequest(requestValue);
  const screenScene = hasHiggsfieldScreenFocus(request.scene);
  return [
    '프로젝트 루트의 AGENTS.md를 읽고 반드시 그 규칙을 따른다.',
    'Higgsfield 프롬프트 연출가로서 제공된 한 장면을 바로 붙여 넣어 사용할 수 있는 구체적인 한국어 영상 프롬프트로 다듬는다.',
    screenScene
      ? '결과는 4~8문장으로 작성한다. 화면이 중요한 이 장면은 시작에 노트북을 사용하는 캐릭터의 행동과 표정을 30도 측면 구도로 보여주고, 화면 전환에서는 카메라가 어깨너머로 노트북 화면에 빠르게 접근하며, 마무리에는 @screen이 프레임 전체를 채우는 완성 화면 인서트로 전환한다.'
      : '결과는 4~8문장으로 작성한다. 시작에는 이전 상태를 잇는 훅, 핵심 행동에서는 한 가지 원인과 결과, 마무리에는 다음 장면으로 이어질 반응과 마지막 자세를 시간 순서대로 구체화한다.',
    '화면비, 클립 길이, 초 단위 구간, 해상도, 화질, 영상 모델, 음성 설정은 힉스필드 화면에서 따로 선택하므로 결과 프롬프트에 쓰지 않는다.',
    '이전 장면 데이터가 있으면 이전 클립의 마지막 프레임을 현재 클립의 시작 참조 이미지로 사용한다고 명시하고, 인물 위치·자세·시선·의상·소품·감정 상태를 그대로 이어받는다. 현재 continuityIn에서 시작해 continuityOut으로 끝낸다.',
    '동물 캐릭터는 사람처럼 두 발로 걷고 물건을 사용하며 일할 수 있고, 사람과 자연스럽게 대화한다. 제공된 대사는 사람이 이해하고 반응하는 실제 대화로 연출한다.',
    'voice에 어버버, 버벅임, 말문 막힘, 머뭇거림 같은 연기 메모가 있으면 어버버를 실제로 발음하지 말고 입술·시선·호흡·몸짓으로 보이는 망설임으로 바꾼다. 실제 대사만 따옴표 안에 쓴다.',
    'voice는 어버버 같은 연기 메모를 행동으로 변환할 때만 참고하고, 음색·성별·속도 같은 음성 설정을 결과에 반복하지 않는다. behaviorStyle이 humanlike인 동물은 일·대화·도구 사용에서 사람 같은 두 발 행동을 기본으로 하고 앞발을 사람의 손처럼 사용한다. 냄새 맡기, 혀 내밀기, 헥헥거리기, 짧은 네 발 동작 같은 자연스러운 동물 행동은 허용하되 장면과 감정에 맞을 때만 쓰고 맥락 없이 반복하지 않는다.',
    '캐릭터가 소품과 접촉하면 소품 위치를 먼저 고정하고 양팔의 어깨→팔꿈치→손목 연속 경로, 실제 접촉점, 카메라 기준 앞뒤 가림 순서를 문장 안에 구체적으로 쓴다. 신체가 소품을 관통하거나 소품 뒤에서 갑자기 나오지 않게 한다. 노트북·키보드·모니터·책상·테이블·의자·카운터처럼 팔다리와 크게 겹치는 소품은 완전 정면 고정 구도 대신 약 30도 사선 구도를 우선한다.',
    '화면·노트북·모니터·스마트폰·태블릿·간판·로고·버튼 UI가 있으면 보이는 문구를 영상 모델이 직접 쓰게 하지 않는다. 완성 화면 이미지 @screen을 디스플레이 평면에 고정된 정적인 2D 화면 텍스처로 사용하고 내부 한국어 글자·로고·버튼·색상·배치를 번역·재작성·변형하지 않게 한다. @screen이 없으면 글자 없는 중립 화면으로 두고 후편집하며 중국어·영어·임의 문자·추가 로고·자동 자막 생성을 금지한다.',
    '세계관에 workplace가 있으면 직장 설정은 고정이다. 승인 없이 다른 회사·부서·직무를 추가하지 않고, companyName이 미정이면 임의의 회사명을 만들지 않는다.',
    '제공된 장면 밖의 새 사건, 인물, 핵심 소품, 반전 또는 결말을 만들지 않는다. 설정표나 영문 라벨을 반복하지 않는다.',
    '최종 답변은 설명이나 마크다운 없이 지정된 JSON 스키마에 맞는 JSON 객체만 반환한다.',
    '검수된 장면 데이터:',
    JSON.stringify(request),
  ].join('\n');
}

const HIGGSFIELD_OVERLAP_RISK = /노트북|키보드|모니터|책상|테이블|의자|카운터/u;
const buildHiggsfieldPhysicalBlockingRule = (scene) => {
  const action = cleanText(scene?.action);
  if (!action || !HIGGSFIELD_OVERLAP_RISK.test(action)) return '';
  return '물리 블로킹은 소품 위치를 먼저 고정하고 양팔의 어깨→팔꿈치→손목 연속 경로, 실제 접촉점, 카메라 기준 앞뒤 가림 순서를 유지하며 신체가 소품을 관통하거나 소품 뒤에서 갑자기 나오지 않게 하고, 약 30도 사선 구도로 관절과 접촉면을 모두 보여준다';
};

const appendToFinalSentence = (prompt, rule) => {
  if (!rule || (/어깨→팔꿈치→손목/u.test(prompt) && /접촉점/u.test(prompt) && /앞뒤 가림 순서/u.test(prompt))) return prompt;
  return `${prompt.replace(/[.!?]\s*$/u, '')}; ${rule}.`;
};

const HIGGSFIELD_SCREEN_CONTENT = /화면|노트북|모니터|스마트폰|휴대폰|태블릿|간판|로고|버튼|\bUI\b/u;
const HIGGSFIELD_SCREEN_FOCUS = /화면|디스플레이|로고|문구|자막|버튼|\bUI\b/u;
const getHiggsfieldScreenSource = (scene) => ['action', 'continuityIn', 'continuityOut', 'camera', 'negativePrompt'].map((field) => cleanText(scene?.[field])).filter(Boolean).join(' ');
const hasHiggsfieldScreenFocus = (scene) => HIGGSFIELD_SCREEN_FOCUS.test(getHiggsfieldScreenSource(scene));
const buildHiggsfieldScreenRule = (scene) => {
  const source = getHiggsfieldScreenSource(scene);
  if (!source || !HIGGSFIELD_SCREEN_CONTENT.test(source)) return '';
  if (!hasHiggsfieldScreenFocus(scene)) return '화면 그래픽은 영상 모델이 새로 쓰지 않는다, 완성 화면 이미지 @screen을 디스플레이 평면에 고정된 정적인 2D 화면 텍스처로 그대로 사용하고 내부의 한국어 글자·로고·버튼·색상·배치를 번역·재작성·변형하지 않는다, @screen이 없으면 글자 없는 중립 화면으로 두고 후편집하며 중국어·영어·임의 문자·추가 로고·자동 자막 생성을 금지한다';
  return '화면 장면에서는 시작에 노트북을 사용하는 캐릭터의 행동과 표정을 약 30도 측면 구도로 보여주고 화면 내부는 읽히지 않게 둔다, 화면 전환에서는 카메라가 캐릭터의 어깨너머로 노트북 화면에 빠르게 접근하며 짧은 모션 블러로 전환점을 숨긴다, 마무리에는 영상 모델이 화면을 다시 그리지 않고 @screen이 프레임 전체를 채우는 완성 화면 인서트로 즉시 전환한다, 완성 화면 이미지 @screen을 정적인 2D 화면 텍스처로 사용하고 내부의 한국어 글자·로고·버튼·색상·배치를 번역·재작성·변형하지 않는다, 모든 픽셀을 정지 상태로 유지한다, @screen이 없으면 글자 없는 중립 화면으로 두고 후편집하며 중국어·영어·임의 문자·추가 로고·자동 자막 생성을 금지한다';
};

const rewriteHiggsfieldOnScreenText = (prompt) => prompt.replace(
  /(화면(?:에|에는)?\s*)[‘“"'「『][^’”"'」』]+[’”"'」』]/gu,
  '$1@screen의 완성된 UI',
);

const appendScreenRule = (prompt, rule) => {
  const requiresTransition = /화면 전환에서는/u.test(rule);
  const hasSafety = /@screen/u.test(prompt) && /중국어·영어·임의 문자/u.test(prompt) && /자동 자막/u.test(prompt);
  const hasTransition = /화면 전환에서는/u.test(prompt) && /마무리에는/u.test(prompt) && /어깨너머/u.test(prompt);
  if (!rule || (hasSafety && (!requiresTransition || hasTransition))) return prompt;
  return `${prompt.replace(/[.!?]\s*$/u, '')}; ${rule}.`;
};

const ensurePreviousSceneContinuity = (prompt, previousScene) => {
  if (!isObject(previousScene)) return prompt;
  const rawState = cleanText(previousScene.continuityOut) || cleanText(previousScene.action) || '';
  const previousState = rawState.replace(/[.!?]+/gu, ' ').replace(/\s+/gu, ' ').trim();
  const hasFrameMarker = /이전\s*클립의\s*마지막\s*프레임/u.test(prompt);
  const hasPreviousState = !previousState || prompt.includes(rawState) || prompt.includes(previousState);
  if (hasFrameMarker && hasPreviousState) return prompt;
  const continuity = previousState
    ? `이전 클립의 마지막 프레임에서 ${previousState} 상태를 그대로 이어서`
    : '이전 클립의 마지막 프레임에서 바로 이어서';
  return `${continuity}, ${prompt}`;
};

export function sanitizeHiggsfieldPrompt(value, requestValue) {
  if (!isObject(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'prompt')) {
    throw new Error('Codex 힉스필드 프롬프트 응답 형식이 올바르지 않습니다.');
  }
  const prompt = cleanText(value.prompt);
  if (!prompt) throw new Error('Codex 힉스필드 프롬프트가 비어 있습니다.');
  if (!/[가-힣]/.test(prompt)) throw new Error('Codex 힉스필드 프롬프트는 한국어로 작성되어야 합니다.');
  if (/```|(^|\n)\s*(?:CHARACTERS|Character:|STORY INTENT|SCENE ACTION|CAMERA|MOOD|NEGATIVE)\b/im.test(prompt)) {
    throw new Error('Codex 힉스필드 프롬프트에 설정표나 마크다운을 포함할 수 없습니다.');
  }
  if (/어버버/u.test(prompt)) throw new Error('Codex 힉스필드 프롬프트에 실제 발화로 남은 연기 메모가 있습니다.');
  const sentenceCount = (prompt.replace(/[”’"')\]]/g, '').match(/[.!?](?=\s|$)/g) ?? []).length;
  if (sentenceCount < 4 || sentenceCount > 8) throw new Error('Codex 힉스필드 프롬프트는 4~8문장이어야 합니다.');
  const screenRule = buildHiggsfieldScreenRule(requestValue?.scene);
  const connectedPrompt = ensurePreviousSceneContinuity(prompt, requestValue?.previousScene);
  const screenSafePrompt = screenRule ? rewriteHiggsfieldOnScreenText(connectedPrompt) : connectedPrompt;
  const withPhysicalBlocking = appendToFinalSentence(screenSafePrompt, buildHiggsfieldPhysicalBlockingRule(requestValue?.scene));
  return { prompt: appendScreenRule(withPhysicalBlocking, screenRule) };
}

export function validateSeriesProposalRequest(value) {
  if (!isObject(value) || !isObject(value.series) || !Array.isArray(value.characters) || !Array.isArray(value.relationships) || !Array.isArray(value.history) || !Array.isArray(value.trends)) {
    throw new Error('연재 제안 요청 데이터 구조가 올바르지 않습니다.');
  }
  const premise = cleanText(value.series.premise);
  const protagonistId = cleanText(value.series.protagonistId);
  const comedyModes = cleanStringArray(value.series.comedyModes, 2);
  if (!premise || !protagonistId) throw new Error('첫 상황과 주인공을 입력해 주세요.');
  if (!comedyModes.length || comedyModes.some((mode) => !COMEDY_MODES.has(mode)) || new Set(comedyModes).size !== comedyModes.length) {
    throw new Error('재미 방식을 하나 이상 올바르게 선택해 주세요.');
  }
  assertArrayLimit(value.characters, 20, '캐릭터');
  assertArrayLimit(value.relationships, 100, '관계');
  assertArrayLimit(value.history, 30, '연재 기록');
  assertArrayLimit(value.trends, 50, '트렌드');
  const characters = value.characters.flatMap((character) => {
    if (!isObject(character)) return [];
    const cleaned = pickTextFields(character, CHARACTER_FIELDS);
    if (typeof character.hasReferenceImage === 'boolean') cleaned.hasReferenceImage = character.hasReferenceImage;
    return [cleaned];
  });
  const characterIds = new Set(characters.map((character) => character.id).filter(Boolean));
  if (!characterIds.has(protagonistId)) throw new Error('선택한 주인공을 캐릭터 목록에서 찾을 수 없습니다.');
  const series = { premise, protagonistId, comedyModes };
  const worldId = cleanText(value.series.worldId);
  if (worldId) series.worldId = worldId;
  const cleaned = {
    series,
    characters,
    relationships: value.relationships.flatMap((relationship) => isObject(relationship) ? [pickTextFields(relationship, RELATIONSHIP_FIELDS)] : []),
    history: value.history.flatMap((episode) => {
      if (!isObject(episode) || !isObject(episode.seriesMeta)) return [];
      const meta = pickTextFields(episode.seriesMeta, ['category', 'comedyMode', 'whyNow', 'sourceProposalId']);
      meta.sequence = Number.isInteger(episode.seriesMeta.sequence) ? episode.seriesMeta.sequence : 0;
      meta.stateChanges = cleanStringArray(episode.seriesMeta.stateChanges);
      meta.openThreads = cleanStringArray(episode.seriesMeta.openThreads);
      meta.resolvedThreads = cleanStringArray(episode.seriesMeta.resolvedThreads);
      return [{ ...pickTextFields(episode, ['id', 'title', 'idea', 'logline', 'ending', 'nextHook', 'characterIds']), seriesMeta: meta }];
    }),
    trends: value.trends.flatMap((trend) => {
      if (!isObject(trend)) throw new Error('연재 트렌드 출처 정보가 올바르지 않습니다.');
      const cleanedTrend = pickTextFields(trend, ['id', 'title', 'sourceUrl', 'checkedAt', 'platform', 'note']);
      let source;
      try { source = new URL(cleanedTrend.sourceUrl); } catch { throw new Error('연재 트렌드 출처 URL이 올바르지 않습니다.'); }
      if (!cleanedTrend.id || !cleanedTrend.title || !cleanedTrend.checkedAt || Number.isNaN(Date.parse(cleanedTrend.checkedAt)) || !['http:', 'https:'].includes(source.protocol)) {
        throw new Error('연재 트렌드는 확인 날짜가 있는 출처만 사용할 수 있습니다.');
      }
      return [cleanedTrend];
    }),
  };
  if (value.sourceEpisode !== undefined && !isObject(value.sourceEpisode)) throw new Error('다음 편 기준 시나리오 구조가 올바르지 않습니다.');
  if (isObject(value.sourceEpisode)) {
    const sourceEpisode = pickTextFields(value.sourceEpisode, [...EPISODE_FIELDS, 'fullScript']);
    sourceEpisode.beats = Array.isArray(value.sourceEpisode.beats) ? value.sourceEpisode.beats.slice(0, 7).flatMap((beat) => {
      if (!isObject(beat) || !BEAT_KINDS.has(beat.kind)) return [];
      const content = cleanText(beat.content);
      const continuityOut = cleanText(beat.continuityOut);
      return content ? [{ kind: beat.kind, content, ...(continuityOut ? { continuityOut } : {}) }] : [];
    }) : [];
    sourceEpisode.scenes = Array.isArray(value.sourceEpisode.scenes)
      ? value.sourceEpisode.scenes.slice(0, 20).flatMap((scene) => isObject(scene) ? [pickTextFields(scene, SERIES_SOURCE_SCENE_FIELDS)] : [])
      : [];
    cleaned.sourceEpisode = sourceEpisode;
  }
  if (isObject(value.world)) {
    const world = cleanWorld(value.world);
    if (worldId && world.id !== worldId) throw new Error('선택한 세계관 정보가 일치하지 않습니다.');
    cleaned.world = world;
  }
  return cleaned;
}

function cleanSeriesCandidate(value, request) {
  if (!isObject(value)) throw new Error('연재 후보 데이터가 올바르지 않습니다.');
  const cleaned = pickTextFields(value, SERIES_CANDIDATE_TEXT_FIELDS);
  if (!SERIES_CANDIDATE_TEXT_FIELDS.every((field) => cleaned[field])) throw new Error('연재 후보의 필수 재미 필드가 비어 있습니다.');
  if (!request.series.comedyModes.includes(cleaned.comedyMode)) throw new Error('선택하지 않은 재미 방식이 포함되었습니다.');
  cleaned.characterIds = cleanStringArray(value.characterIds, 20);
  cleaned.trendIds = cleanStringArray(value.trendIds, 20);
  const allowedCharacters = new Set(request.characters.map((character) => character.id));
  const allowedTrends = new Set(request.trends.map((trend) => trend.id));
  if (!cleaned.characterIds.length || cleaned.characterIds.some((id) => !allowedCharacters.has(id))) throw new Error('연재 후보에 존재하지 않는 캐릭터가 포함되었습니다.');
  if (cleaned.trendIds.some((id) => !allowedTrends.has(id))) throw new Error('연재 후보에 출처가 확인되지 않은 트렌드가 포함되었습니다.');
  return cleaned;
}

export function sanitizeSeriesCandidates(value, requestValue) {
  const request = validateSeriesProposalRequest(requestValue);
  if (!isObject(value) || !Array.isArray(value.candidates) || value.candidates.length !== 6) throw new Error('Sol 작가 후보군은 정확히 6개여야 합니다.');
  const candidates = value.candidates.map((candidate) => cleanSeriesCandidate(candidate, request));
  if (new Set(candidates.map((candidate) => candidate.id)).size !== 6 || new Set(candidates.map((candidate) => candidate.title)).size !== 6) throw new Error('연재 후보 ID와 제목은 서로 달라야 합니다.');
  for (const mode of request.series.comedyModes) {
    const requiredCount = request.series.comedyModes.length === 2 ? 3 : 6;
    if (candidates.filter((candidate) => candidate.comedyMode === mode).length < requiredCount) throw new Error('선택한 재미 방식의 후보 수가 부족합니다.');
  }
  return { candidates };
}

function cleanSeriesProposal(value, request) {
  if (!isObject(value)) throw new Error('최종 연재 제안 데이터가 올바르지 않습니다.');
  const cleaned = pickTextFields(value, SERIES_PROPOSAL_TEXT_FIELDS);
  if (!SERIES_PROPOSAL_TEXT_FIELDS.every((field) => cleaned[field])) throw new Error('최종 연재 제안의 이야기 필드가 비어 있습니다.');
  if (!request.series.comedyModes.includes(cleaned.comedyMode)) throw new Error('선택하지 않은 재미 방식이 포함되었습니다.');
  cleaned.stateChanges = cleanStringArray(value.stateChanges);
  cleaned.openThreads = cleanStringArray(value.openThreads);
  cleaned.resolvedThreads = cleanStringArray(value.resolvedThreads);
  cleaned.characterIds = cleanStringArray(value.characterIds, 20);
  cleaned.trendIds = cleanStringArray(value.trendIds, 20);
  const allowedCharacters = new Set(request.characters.map((character) => character.id));
  const allowedTrends = new Set(request.trends.map((trend) => trend.id));
  if (!cleaned.characterIds.includes(request.series.protagonistId) || cleaned.characterIds.some((id) => !allowedCharacters.has(id))) throw new Error('최종 연재 제안의 캐릭터 구성이 올바르지 않습니다.');
  if (cleaned.trendIds.some((id) => !allowedTrends.has(id))) throw new Error('최종 연재 제안에 출처가 확인되지 않은 트렌드가 포함되었습니다.');
  const worldId = cleanText(value.worldId);
  if (worldId) {
    if (worldId !== request.series.worldId) throw new Error('최종 연재 제안의 세계관이 선택 설정과 다릅니다.');
    cleaned.worldId = worldId;
  }
  if (!isObject(value.fun)) throw new Error('최종 연재 제안의 재미 구조가 비어 있습니다.');
  cleaned.fun = pickTextFields(value.fun, SERIES_FUN_FIELDS);
  if (!SERIES_FUN_FIELDS.every((field) => cleaned.fun[field])) throw new Error('최종 연재 제안의 재미 구조가 비어 있습니다.');
  if (!Array.isArray(value.beats) || value.beats.length !== 7) throw new Error('최종 연재 제안에는 7개 비트가 필요합니다.');
  cleaned.beats = value.beats.map((beat, index) => {
    if (!isObject(beat) || !BEAT_KINDS.has(beat.kind)) throw new Error('최종 연재 제안의 비트 종류가 올바르지 않습니다.');
    const content = cleanText(beat.content);
    const continuityOut = cleanText(beat.continuityOut);
    if (!content || !continuityOut) throw new Error('최종 연재 제안의 비트 행동과 마지막 상태가 비어 있습니다.');
    return { kind: BEAT_KIND_ORDER[index], content, continuityOut };
  });
  return cleaned;
}

export function sanitizeSeriesProposals(value, requestValue, candidateValue) {
  const request = validateSeriesProposalRequest(requestValue);
  if (!isObject(value) || !Array.isArray(value.proposals) || value.proposals.length !== 3) throw new Error('재미 편집자의 최종 제안은 정확히 3개여야 합니다.');
  const proposals = value.proposals.map((proposal) => cleanSeriesProposal(proposal, request));
  if (new Set(proposals.map((proposal) => proposal.id)).size !== 3 || new Set(proposals.map((proposal) => proposal.title)).size !== 3) throw new Error('최종 연재 제안 ID와 제목은 서로 달라야 합니다.');
  if (new Set(proposals.map((proposal) => proposal.category)).size !== 3) throw new Error('최종 연재 제안은 서로 다른 생활 영역을 사용해야 합니다.');
  for (const mode of request.series.comedyModes) if (!proposals.some((proposal) => proposal.comedyMode === mode)) throw new Error('최종 제안에 선택한 재미 방식이 모두 포함되어야 합니다.');
  if (candidateValue) {
    const candidates = sanitizeSeriesCandidates(candidateValue, request).candidates;
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    if (proposals.some((proposal) => !candidateById.has(proposal.id))) throw new Error('최종 제안은 작가 후보군의 ID를 유지해야 합니다.');
    if (proposals.some((proposal) => candidateById.get(proposal.id).comedyMode !== proposal.comedyMode)) throw new Error('최종 제안은 선택한 후보의 재미 방식을 유지해야 합니다.');
  }
  return { proposals };
}

const comedyModeLabels = (modes) => modes.map((mode) => mode === 'relatable' ? '현실 공감 코미디' : '밈·과장 코미디').join(', ');

export function buildSeriesCandidatePrompt(requestValue) {
  const request = validateSeriesProposalRequest(requestValue);
  const lines = [
    '프로젝트 루트의 AGENTS.md를 읽고 숏폼 시나리오 작가와 스토리 에디터 규칙을 따른다.',
    '연재의 다음 화가 될 서로 다른 요약 후보를 정확히 6개 만든다.',
    `선택된 재미 방식은 ${comedyModeLabels(request.series.comedyModes)}이다. 두 방식이면 각 3개씩 만든다.`,
    '일정만 나열하지 말고 캐릭터의 욕망·약점·관계가 문제를 만들게 한다. 첫 2초 훅, 두 단계 갈등 상승, 개연성 있는 반전, 화면으로 보이는 코믹 행동, 마지막 보상을 모두 설계한다.',
    '캐릭터의 gender와 behaviorStyle은 고정한다. female은 여성 사람 목소리로, humanlike 동물은 사람 같은 두 발 행동과 업무 동작을 기본으로 하되 장면과 감정에 맞는 냄새 맡기, 혀 내밀기, 헥헥거리기, 짧은 네 발 동작은 자연스럽게 사용할 수 있다.',
    '세계관에 workplace가 있으면 직장 설정은 고정이다. 승인 없이 회사·업종·부서·직급·담당 업무를 바꾸지 말고, companyName이 미정이면 임의의 회사명을 만들지 않는다.',
    '최근 화와 장소·갈등·결말·농담을 반복하지 않는다. 제공된 출처 있는 트렌드 외에는 최신이나 유행이라고 주장하지 않는다.',
    '특정 계정이나 작가의 표현을 복제하지 않는다. 최종 답변은 설명 없이 지정된 JSON 객체만 반환한다.',
  ];
  if (request.sourceEpisode) {
    lines.push(
      'sourceEpisode는 지금 시나리오 설계 화면에 열린 현재 시나리오다. 제목이나 한 줄 아이디어만 보지 말고 로그라인, 목표, 갈등, 결말, 다음 훅, 전체 대본, 7개 비트, 실제 장면 행동과 대사를 모두 읽은 뒤 그 결과에서 자연스럽게 이어지는 다음 편을 만든다.',
      '후보 1~2는 현재 사건에서 직접 이어지는 후속편, 후보 3~4는 캐릭터 관계나 일상을 넓히는 확장편, 후보 5~6은 설정을 깨지 않는 예상 밖 문제나 반전이 생기는 변화편으로 만든다. 세 갈래는 사건의 원인, 장소, 핵심 갈등과 결말이 서로 달라야 한다.',
    );
  }
  return [...lines, '연재 자료:', JSON.stringify(request)].join('\n');
}

export function buildSeriesEditorPrompt(requestValue, candidateValue) {
  const request = validateSeriesProposalRequest(requestValue);
  const candidates = sanitizeSeriesCandidates(candidateValue, request);
  const lines = [
    '프로젝트 루트의 AGENTS.md를 읽고 재미 편집자와 스토리 에디터 역할을 수행한다.',
    '후보 6개를 첫 2초 이해도, 캐릭터 고유성, 갈등 상승, 반전의 개연성과 새로움, 시각적 웃음, 마지막 보상, 최근 화 중복 여부로 비교한다.',
    '최종 3개만 선택해 완성된 에피소드로 확장한다. 서로 다른 생활 영역을 사용하고 선택된 재미 방식을 모두 남긴다.',
    '선택한 후보의 id와 comedyMode는 반드시 유지한다. 제목과 생활 영역 표현은 완성도를 위해 더 구체적으로 다듬을 수 있다.',
    '최종 편집에서도 캐릭터의 gender와 behaviorStyle을 바꾸지 않는다. female은 여성 사람 목소리, humanlike 동물은 강아지 외형과 사람의 직립 행동을 같이 유지한다.',
    '세계관에 workplace가 있으면 직장 설정은 고정이다. 승인 없이 회사·업종·부서·직급·담당 업무를 바꾸지 말고, companyName이 미정이면 임의의 회사명을 만들지 않는다.',
    '각 에피소드는 목표·장애물·선택·결과와 7개 비트를 가진다. 비트 배열 순서는 반드시 hook, setup, escalation, twist, climax, punchline, next이다. 각 비트는 하나의 8초 클립이며 continuityOut에 마지막 위치·자세·시선·의상·소품·감정을 쓴다.',
    '승인되지 않은 새 캐릭터·세계관·트렌드를 만들지 않는다. 최종 답변은 설명 없이 지정된 JSON 객체만 반환한다.',
  ];
  if (request.sourceEpisode) lines.push('현재 시나리오와의 인과관계를 다시 확인하고, 직접 후속편 후보 1~2에서 하나, 관계·일상 확장편 후보 3~4에서 하나, 예상 밖 변화편 후보 5~6에서 하나를 골라 세 갈래에서 하나씩 최종 3개를 이 순서로 반환한다.');
  return [...lines, '연재 자료:', JSON.stringify(request), '검수할 후보군:', JSON.stringify(candidates)].join('\n');
}

export const storyDraftSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ...Object.fromEntries(STORY_FIELDS.map((field) => [field, { type: 'string' }])),
    beats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'content', 'continuityOut'],
        properties: { kind: { type: 'string', enum: [...BEAT_KINDS] }, content: { type: 'string' }, continuityOut: { type: 'string' } },
      },
    },
    editorNotes: { type: 'array', items: { type: 'string' } },
  },
  required: [...STORY_FIELDS, 'beats', 'editorNotes'],
};

export const appearanceSuggestionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    appearance: { type: 'string', minLength: 1 },
  },
  required: ['appearance'],
};

export const referenceAssetSuggestionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assets: {
      type: 'array', minItems: 3, maxItems: 6,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          keyword: { type: 'string', minLength: 1 },
          category: { type: 'string', enum: [...REFERENCE_ASSET_CATEGORIES] },
          reason: { type: 'string', minLength: 1 },
          imagePrompt: { type: 'string', minLength: 1 },
          priority: { type: 'string', enum: [...REFERENCE_ASSET_PRIORITIES] },
        },
        required: ['keyword', 'category', 'reason', 'imagePrompt', 'priority'],
      },
    },
  },
  required: ['assets'],
};

export const higgsfieldPromptSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { prompt: { type: 'string', minLength: 1 } },
  required: ['prompt'],
};

const stringProperty = { type: 'string', minLength: 1 };
const stringArrayProperty = { type: 'array', items: { type: 'string' } };
const seriesCandidateProperties = {
  ...Object.fromEntries(SERIES_CANDIDATE_TEXT_FIELDS.map((field) => [field, field === 'comedyMode' ? { type: 'string', enum: [...COMEDY_MODES] } : stringProperty])),
  characterIds: stringArrayProperty,
  trendIds: stringArrayProperty,
};

export const seriesCandidateSchema = {
  type: 'object', additionalProperties: false, required: ['candidates'],
  properties: {
    candidates: {
      type: 'array', minItems: 6, maxItems: 6,
      items: { type: 'object', additionalProperties: false, properties: seriesCandidateProperties, required: [...SERIES_CANDIDATE_TEXT_FIELDS, 'characterIds', 'trendIds'] },
    },
  },
};

const seriesProposalProperties = {
  ...Object.fromEntries(SERIES_PROPOSAL_TEXT_FIELDS.map((field) => [field, field === 'comedyMode' ? { type: 'string', enum: [...COMEDY_MODES] } : stringProperty])),
  worldId: { type: 'string' },
  stateChanges: stringArrayProperty,
  openThreads: stringArrayProperty,
  resolvedThreads: stringArrayProperty,
  characterIds: stringArrayProperty,
  trendIds: stringArrayProperty,
  fun: { type: 'object', additionalProperties: false, properties: Object.fromEntries(SERIES_FUN_FIELDS.map((field) => [field, stringProperty])), required: SERIES_FUN_FIELDS },
  beats: {
    type: 'array', minItems: 7, maxItems: 7,
    items: {
      type: 'object', additionalProperties: false, required: ['kind', 'content', 'continuityOut'],
      properties: { kind: { type: 'string', enum: [...BEAT_KINDS] }, content: stringProperty, continuityOut: stringProperty },
    },
  },
};

export const seriesProposalSchema = {
  type: 'object', additionalProperties: false, required: ['proposals'],
  properties: {
    proposals: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false, properties: seriesProposalProperties,
        required: [...SERIES_PROPOSAL_TEXT_FIELDS, 'worldId', 'stateChanges', 'openThreads', 'resolvedThreads', 'characterIds', 'trendIds', 'fun', 'beats'],
      },
    },
  },
};
