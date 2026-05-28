import { describe, it, expect } from 'vitest';
import { parseTaskList } from './parseTaskList';

describe('parseTaskList', () => {
  it('returns null for plain text with no numbered items', () => {
    expect(parseTaskList('Just a regular response.')).toBeNull();
  });

  it('returns null when fewer than 2 numbered items', () => {
    expect(parseTaskList('1. Do the thing')).toBeNull();
  });

  it('parses a numbered list into tasks', () => {
    const result = parseTaskList('1. Research pricing\n2. Write copy\n3. Schedule posts');
    expect(result).toHaveLength(3);
    expect(result![0]).toMatchObject({ index: 0, text: 'Research pricing', assignedProfileId: '' });
    expect(result![2]).toMatchObject({ index: 2, text: 'Schedule posts', assignedProfileId: '' });
  });

  it('handles leading prose before the list', () => {
    const result = parseTaskList('Here are the tasks:\n1. Task one\n2. Task two');
    expect(result).toHaveLength(2);
  });

  it('trims whitespace from task text', () => {
    const result = parseTaskList('1.   Lots of spaces   \n2. Normal');
    expect(result![0].text).toBe('Lots of spaces');
  });
});
