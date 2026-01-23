import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

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
      <div class="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} class="p-4 rounded-2xl bg-white/5 dark:bg-white/5 animate-pulse flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-dark-200/50 dark:bg-white/10" />
            <div class="flex-1 space-y-2">
              <div class="h-3 w-1/2 bg-dark-200/50 dark:bg-white/10 rounded" />
              <div class="h-2 w-3/4 bg-dark-200/50 dark:bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div class="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div class="w-16 h-16 rounded-2xl bg-dark-100 dark:bg-white/5 flex-center mb-4 text-dark-300 dark:text-dark-600">
          <span class="i-carbon-chat-off text-3xl" />
        </div>
        <p class="text-sm font-semibold text-dark-500 dark:text-dark-400">No active chats</p>
        <p class="text-xs text-dark-400 dark:text-dark-500 mt-1">Start a conversation to see it here.</p>
      </div>
    );
  }

  return (
    <div class="space-y-1.5">
      {conversations.map((conv) => {
        const isActive = selectedId === conv._id;
        return (
          <button
            key={conv._id}
            onClick={() => onSelect(conv._id)}
            class={`
              w-full p-3 pl-4 text-left transition-all duration-300 group relative overflow-visible border border-transparent
              ${isActive
                ? 'bg-primary-500/10 dark:bg-primary-500/15 border-primary-500/20 shadow-md shadow-primary-500/5 rounded-2xl'
                : 'hover:bg-dark-100 dark:hover:bg-white/5 rounded-2xl'
              }
            `}
          >
            {isActive && (
              <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-gradient-to-b from-primary-400 to-primary-600 rounded-r-full shadow-[0_0_12px_rgba(var(--primary-500),0.6)]" />
            )}

            <div class="flex items-center gap-4 relative z-10">
              {/* Avatar */}
              <div class="relative flex-shrink-0">
                <div class={`
                  w-12 h-12 rounded-2xl flex-center text-lg font-bold transition-all duration-500 group-hover:scale-105 shadow-md overflow-hidden
                  ${isActive
                    ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-primary-500/30'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 text-gray-600 dark:text-gray-300'
                  }
                `}>
                  <span class="flex items-center justify-center w-full h-full">
                    {(conv.otherUser?.displayName?.[0] || '?').toUpperCase()}
                  </span>
                </div>
                <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-dark-900 rounded-full shadow-sm z-10" />
              </div>

              {/* Content */}
              <div class="flex-1 min-w-0 flex flex-col justify-center space-y-0.5">
                <div class="flex items-center justify-between">
                  <span class={`font-bold truncate text-[15px] ${isActive ? 'text-primary-700 dark:text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                    {conv.otherUser?.displayName || 'Unknown'}
                  </span>
                  {conv.lastMessage && (
                    <span class={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${isActive ? 'text-primary-600/80 dark:text-primary-400/80' : 'text-gray-400 dark:text-gray-500'}`}>
                      {formatTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class={`text-sm truncate font-medium ${isActive ? 'text-primary-600/90 dark:text-primary-300/90' : 'text-gray-500 dark:text-gray-400'}`}>
                    {conv.lastMessage?.isDeleted
                      ? 'Message deleted'
                      : conv.lastMessage?.senderId === currentUserId
                      ? 'You sent a message'
                      : `${conv.otherUser?.displayName || 'Someone'} sent a message`}
                  </span>

                  {conv.unreadCount > 0 && (
                    <div class="bg-primary-500 text-white min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-lg shadow-lg shadow-primary-500/30 flex-shrink-0">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
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

  // Today
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Yesterday
  if (diff < 48 * 60 * 60 * 1000) {
    return 'Yesterday';
  }

  // This week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
