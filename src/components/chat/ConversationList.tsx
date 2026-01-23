import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface ConversationListProps {
  token: string;
  selectedId: Id<'conversations'> | null;
  onSelect: (id: Id<'conversations'>) => void;
}

export function ConversationList({ token, selectedId, onSelect }: ConversationListProps) {
  const conversations = useQuery(api.conversations.list, { token });

  if (conversations === undefined) {
    return (
      <div class="p-4 text-center text-dark-400">
        <span class="i-carbon-circle-dash animate-spin text-2xl" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div class="p-4 text-center text-dark-400 text-sm">
        No conversations yet.
        <br />
        Start a new chat!
      </div>
    );
  }

  return (
    <div class="divide-y divide-dark-100">
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelect(conv._id)}
          class={`
            w-full p-4 text-left hover:bg-dark-50 transition-colors
            ${selectedId === conv._id ? 'bg-primary-50' : ''}
          `}
        >
          <div class="flex items-center gap-3">
            {/* Avatar */}
            <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-primary-600 font-medium text-lg">
                {conv.otherUser?.displayName[0].toUpperCase() || '?'}
              </span>
            </div>

            {/* Content */}
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-medium text-dark-900 truncate">
                  {conv.otherUser?.displayName || 'Unknown'}
                </span>
                {conv.lastMessage && (
                  <span class="text-xs text-dark-400 flex-shrink-0">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>

              <div class="flex items-center justify-between mt-0.5">
                <span class="text-sm text-dark-500 truncate">
                  {conv.lastMessage?.isDeleted
                    ? 'Message deleted'
                    : 'Encrypted message'}
                </span>
                {conv.unreadCount > 0 && (
                  <span class="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
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
