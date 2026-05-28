import type { ParsedTask } from '../types';

export function parseTaskList(content: string): ParsedTask[] | null {
  const tasks: ParsedTask[] = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^\d+\.\s+(.+)/);
    if (match) {
      tasks.push({ index: tasks.length, text: match[1].trim(), assignedProfileId: '' });
    }
  }
  return tasks.length >= 2 ? tasks : null;
}
