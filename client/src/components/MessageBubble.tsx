import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
        } ${message.streaming ? 'after:content-["▋"] after:animate-pulse after:ml-0.5' : ''}`}
      >
        {message.content}
      </div>
    </div>
  );
}
