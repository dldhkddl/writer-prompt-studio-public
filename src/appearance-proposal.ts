export type AppearanceProposalState = {
  requestId: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  proposal: string;
  error: string;
};

export const initialAppearanceProposalState: AppearanceProposalState = {
  requestId: 0,
  status: 'idle',
  proposal: '',
  error: '',
};

export function startAppearanceProposal(state: AppearanceProposalState): AppearanceProposalState {
  return { requestId: state.requestId + 1, status: 'loading', proposal: '', error: '' };
}

export function resolveAppearanceProposal(state: AppearanceProposalState, requestId: number, proposal: string): AppearanceProposalState {
  if (requestId !== state.requestId) return state;
  return { ...state, status: 'ready', proposal: proposal.trim(), error: '' };
}

export function failAppearanceProposal(state: AppearanceProposalState, requestId: number, error: string): AppearanceProposalState {
  if (requestId !== state.requestId) return state;
  return { ...state, status: 'error', proposal: '', error };
}

export function discardAppearanceProposal(state: AppearanceProposalState): AppearanceProposalState {
  return { requestId: state.requestId, status: 'idle', proposal: '', error: '' };
}

export function resetAppearanceProposal(state: AppearanceProposalState): AppearanceProposalState {
  return { requestId: state.requestId + 1, status: 'idle', proposal: '', error: '' };
}

export function applyAppearanceProposal(state: AppearanceProposalState): string | undefined {
  return state.status === 'ready' && state.proposal ? state.proposal : undefined;
}
