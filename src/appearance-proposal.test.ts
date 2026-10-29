import { describe, expect, it } from 'vitest';
import {
  applyAppearanceProposal,
  discardAppearanceProposal,
  failAppearanceProposal,
  initialAppearanceProposalState,
  resetAppearanceProposal,
  resolveAppearanceProposal,
  startAppearanceProposal,
} from './appearance-proposal';

describe('외형 제안 승인 상태', () => {
  it('새 요청이 시작되면 이전 요청 번호와 제안을 무효화한다', () => {
    const first = startAppearanceProposal(initialAppearanceProposalState);
    const ready = resolveAppearanceProposal(first, first.requestId, '첫 제안');
    const second = startAppearanceProposal(ready);

    expect(second).toEqual({ requestId: 2, status: 'loading', proposal: '', error: '' });
  });

  it('늦게 도착한 이전 응답은 현재 제안을 바꾸지 않는다', () => {
    const first = startAppearanceProposal(initialAppearanceProposalState);
    const second = startAppearanceProposal(first);

    expect(resolveAppearanceProposal(second, first.requestId, '오래된 제안')).toBe(second);
    expect(failAppearanceProposal(second, first.requestId, '오래된 오류')).toBe(second);
  });

  it('제안은 적용을 선택하기 전까지 별도 값으로만 유지된다', () => {
    const loading = startAppearanceProposal(initialAppearanceProposalState);
    const ready = resolveAppearanceProposal(loading, loading.requestId, '새 외형');

    expect(ready.proposal).toBe('새 외형');
    expect(ready).not.toHaveProperty('appearance');
    expect(applyAppearanceProposal(ready)).toBe('새 외형');
  });

  it('버리기와 캐릭터 변경은 제안을 비우고 진행 중 요청을 무효화한다', () => {
    const loading = startAppearanceProposal(initialAppearanceProposalState);
    const ready = resolveAppearanceProposal(loading, loading.requestId, '새 외형');

    expect(discardAppearanceProposal(ready)).toEqual({ requestId: 1, status: 'idle', proposal: '', error: '' });
    expect(resetAppearanceProposal(ready)).toEqual({ requestId: 2, status: 'idle', proposal: '', error: '' });
  });
});
