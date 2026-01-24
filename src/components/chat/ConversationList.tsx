import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { isUserOnline } from '../../lib/presence';

interface ConversationListProps {
  token: string;
  selectedId: Id<'conversations'> | null;
  onSelect: (id: Id<'conversations'>) => void;
  currentUserId: Id<'users'>;
}

export function ConversationList({ token, selectedId, onSelect, currentUserId }: ConversationListProps) {
  const conversations = useQuery(api.conversations.list, { token });

  if (conversations === undefined) {
    return (
      <div class="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} class="p-3 rounded-xl bg-dark-100 dark:bg-dark-800 animate-pulse flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-dark-200 dark:bg-dark-700" />
            <div class="flex-1 space-y-2">
              <div class="h-3 w-24 bg-dark-200 dark:bg-dark-700 rounded" />
              <div class="h-2 w-32 bg-dark-200 dark:bg-dark-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-12 h-12 rounded-xl bg-dark-100 dark:bg-dark-800 flex-center mb-3">
          <div class="i-carbon-chat-off w-5 h-5 text-dark-400" />
        </div>
        <p class="text-sm text-dark-500 dark:text-dark-400">No conversations yet</p>
      </div>
    );
  }

  return (
    <div class="space-y-1">
      {conversations.map((conv) => {
        const isActive = selectedId === conv._id;
        return (
          <button
            key={conv._id}
            onClick={() => onSelect(conv._id)}
            class={`
              w-full p-3 text-left transition-all duration-200 rounded-xl flex items-center gap-3
              ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-dark-100 dark:hover:bg-dark-800'
              }
            `}
          >
            {/* Avatar */}
            <div class="relative flex-shrink-0">
              <div class={`
                w-10 h-10 rounded-full flex-center font-semibold text-sm
                ${isActive
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-300'
                }
              `}>
                {(conv.otherUser?.displayName?.[0] || '?').toUpperCase()}
              </div>
              <div class={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${isUserOnline(conv.otherUser) ? 'bg-green-500' : 'bg-dark-400'} border-2 border-white dark:border-dark-900 rounded-full`} />
            </div>

            {/* Content */}
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class={`font-medium text-sm truncate ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-dark-900 dark:text-dark-100'}`}>
                  {conv.otherUser?.displayName || 'Unknown'}
                </span>
                {conv.lastMessage && (
                  <span class="text-[10px] text-dark-400 dark:text-dark-500 flex-shrink-0 ml-2">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-dark-500 dark:text-dark-400 truncate">
                  {conv.lastMessage?.isDeleted
                    ? 'Message deleted'
                    : conv.lastMessage?.senderId === currentUserId
                    ? 'You sent a message'
                    : 'New message'}
                </span>
                {conv.unreadCount > 0 && (
                  <span class="ml-2 min-w-[18px] h-[18px] px-1.5 bg-primary-500 text-white text-[10px] font-medium rounded-full flex-center flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 48 * 60 * 60 * 1000) {
    return 'Yesterday';
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
