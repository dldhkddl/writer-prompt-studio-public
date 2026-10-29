export type CharacterType = 'animal' | 'human' | 'creature' | 'mascot' | 'other';
export type CharacterGender = 'female' | 'male' | 'neutral' | 'unspecified';
export type CharacterBehaviorStyle = 'humanlike' | 'animal' | 'mixed';

export type Character = {
  id: string;
  name: string;
  type: CharacterType;
  gender?: CharacterGender;
  behaviorStyle?: CharacterBehaviorStyle;
  imageDataUrl?: string;
  appearance: string;
  personality: string;
  voice: string;
  habits: string;
  likes: string;
  dislikes: string;
};

export type Workplace = { companyName: string; industry: string; department: string; role: string; duties: string };
export type World = { id: string; name: string; tone: string; setting: string; rules: string[]; workplace?: Workplace };
export type Relationship = { id: string; fromCharacterId: string; toCharacterId: string; kind: string; description: string };
export type BeatKind = 'hook' | 'setup' | 'escalation' | 'twist' | 'climax' | 'punchline' | 'next';
export type ComedyMode = 'relatable' | 'meme';
export type SeriesFunStructure = { setup: string; escalation: string; reversal: string; visualGag: string; payoff: string; funReason: string };
export type SeriesProposalBeat = { kind: BeatKind; content: string; continuityOut: string };
export type SeriesProposal = {
  id: string; title: string; category: string; comedyMode: ComedyMode; idea: string;
  logline: string; theme: string; outerGoal: string; innerNeed: string; flaw: string; obstacle: string;
  stakes: string; twist: string; ending: string; nextHook: string; whyNow: string;
  stateChanges: string[]; openThreads: string[]; resolvedThreads: string[];
  characterIds: string[]; worldId?: string; trendIds: string[]; fun: SeriesFunStructure; beats: SeriesProposalBeat[];
};
export type SeriesPlan = {
  premise: string; protagonistId: string; worldId?: string; status: 'planning' | 'running'; comedyModes: ComedyMode[];
  pendingProposals: SeriesProposal[]; sourceEpisodeId?: string; createdAt: string; updatedAt: string;
};
export type SeriesEpisodeMeta = {
  sequence: number; category: string; comedyMode: ComedyMode; whyNow: string; stateChanges: string[];
  openThreads: string[]; resolvedThreads: string[]; sourceProposalId: string;
};
export type StoryBeat = { id: string; kind: BeatKind; label: string; timeRange: string; purpose: string; content: string; continuityOut?: string };
export type ReferenceAssetCategory = 'environment' | 'wardrobe' | 'prop' | 'screen';
export type ReferenceAssetPriority = 'required' | 'optional';
export type ReferenceAssetStatus = 'proposed' | 'approved';
export type ReferenceAssetSuggestion = { keyword: string; category: ReferenceAssetCategory; reason: string; imagePrompt: string; priority: ReferenceAssetPriority };
export type SceneReferenceAsset = ReferenceAssetSuggestion & { id: string; status: ReferenceAssetStatus };
export type Scene = { id: string; title: string; action: string; dialogue: string; camera: string; mood: string; negativePrompt: string; purpose?: string; emotionBefore?: string; emotionAfter?: string; beatKind?: BeatKind; timeRange?: string; characterIds?: string[]; continuityIn?: string; continuityOut?: string; referenceAssets?: SceneReferenceAsset[]; higgsfieldPrompt?: string; higgsfieldPromptSourceKey?: string };
export type Episode = { id: string; title: string; idea: string; worldId?: string; characterIds: string[]; scenes: Scene[]; status: 'draft' | 'ready'; updatedAt: string; logline?: string; theme?: string; outerGoal?: string; innerNeed?: string; flaw?: string; obstacle?: string; stakes?: string; twist?: string; ending?: string; nextHook?: string; fullScript?: string; beats?: StoryBeat[]; seriesMeta?: SeriesEpisodeMeta };
export type TrendNote = { id: string; title: string; sourceUrl: string; checkedAt: string; platform: string; note: string };
export type Project = { characters: Character[]; worlds: World[]; relationships: Relationship[]; episodes: Episode[]; trends: TrendNote[]; seriesPlan?: SeriesPlan };
