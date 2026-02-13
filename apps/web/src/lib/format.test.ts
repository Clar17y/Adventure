import { describe, expect, it } from 'vitest';
import { titleCaseFromSnake } from './format';

describe('titleCaseFromSnake', () => {
  it('converts snake_case to Title Case', () => {
    expect(titleCaseFromSnake('hello_world')).toBe('Hello World');
  });

  it('handles single word', () => {
    expect(titleCaseFromSnake('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(titleCaseFromSnake('')).toBe('');
  });

  it('handles multiple underscores', () => {
    expect(titleCaseFromSnake('one_two_three')).toBe('One Two Three');
  });

  it('handles strings with numbers', () => {
    expect(titleCaseFromSnake('level_10_boss')).toBe('Level 10 Boss');
  });

  it('handles already capitalized input', () => {
    expect(titleCaseFromSnake('HELLO_WORLD')).toBe('HELLO WORLD');
  });
});
