import { describe, expect, it } from 'vitest';
import { normalizePrompt, parsePromptTargets } from './prompt';

describe('common prompt validation', () => {
  it('keeps prompt text while rejecting empty input', () => {
    expect(normalizePrompt('  compare this  ')).toBe('  compare this  ');
    expect(() => normalizePrompt('   ')).toThrow('プロンプトを入力');
  });

  it('requires targets and removes duplicate view ids', () => {
    expect(parsePromptTargets([2, 1, 2])).toEqual([2, 1]);
    expect(() => parsePromptTargets([])).toThrow('送信対象を1つ以上');
  });
});
