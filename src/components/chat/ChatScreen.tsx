import { useEffect, useState } from 'preact/hooks';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { isUserOnline, formatLastSeen } from '../../lib/presence';

interface ChatScreenProps {
  conversationId: Id<'conversations'>;
  token: string;
  currentUserId: Id<'users'>;
  currentUserPublicKey: string;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export function ChatScreen({ conversationId, token, currentUserId, currentUserPublicKey, onBack, onToggleSidebar }: ChatScreenProps) {
  const conversation = useQuery(api.conversations.getById, { token, conversationId });
  const messagesData = useQuery(api.conversations.getMessages, { token, conversationId, limit: 50 });
  const markAllRead = useMutation(api.messages.markAllRead);
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const [sentMessagesPlaintext, setSentMessagesPlaintext] = useState<Map<string, string>>(new Map());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (messagesData?.messages.length) {
      markAllRead({ token, conversationId });
    }
  }, [conversationId, messagesData?.messages.length]);

  if (conversation === undefined || messagesData === undefined) {
    return (
      <div class="h-full flex-center bg-white dark:bg-dark-900">
        <div class="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div class="h-full flex-center flex-col gap-4 text-dark-500">
        <div class="i-carbon-warning w-10 h-10" />
        <span class="font-medium">Conversation not found</span>
        <button onClick={onBack} class="btn-secondary">Go Back</button>
      </div>
    );
  }

  return (
    <div class="flex-1 flex flex-col h-full min-h-0 bg-dark-100 dark:bg-dark-950">
      {/* Header */}
      <header class="h-16 px-4 border-b border-dark-200 dark:border-dark-800 flex items-center justify-between bg-white dark:bg-dark-900 flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            class="lg:hidden p-2 -ml-2 rounded-lg text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
          >
            <div class="i-carbon-menu w-5 h-5" />
          </button>

          <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-center text-primary-600 dark:text-primary-400 font-semibold flex-shrink-0">
            {(conversation.otherUser?.displayName?.[0] || '?').toUpperCase()}
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-dark-900 dark:text-white truncate text-sm">
              {conversation.otherUser?.displayName || 'Unknown'}
            </h2>
            <p class="text-xs text-dark-500 dark:text-dark-400 flex items-center gap-1.5">
              <span class={`w-1.5 h-1.5 rounded-full ${conversation.otherUser?.isOnline ? 'bg-green-500' : 'bg-dark-400'}`} />
              {conversation.otherUser?.isOnline ? 'Online' : formatLastSeen(conversation.otherUser?.lastSeenAt)}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <div class="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-xs font-medium">
            <div class="i-carbon-locked w-4 h-4" />
            Encrypted
          </div>

          <div class="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              class="p-2 rounded-lg text-dark-500 hover:text-dark-700 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
            >
              <div class="i-carbon-overflow-menu-vertical w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div class="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div class="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-200 dark:border-dark-700 py-1 z-50">
                  <button
                    onClick={async () => {
                      if (confirm('Delete this conversation?')) {
                        try {
                          await deleteConversation({ token, conversationId });
                          if (onBack) onBack();
                        } catch (err) {
                          console.error('Failed to delete', err);
                        }
                      }
                      setShowMenu(false);
                    }}
                    class="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                  >
                    <div class="i-carbon-trash-can w-4 h-4" />
                    Delete Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div class="flex-1 min-h-0 overflow-hidden bg-dark-100 dark:bg-dark-950">
        <MessageList
          messages={messagesData.messages}
          currentUserId={currentUserId}
          otherUserPublicKey={conversation.otherUser?.publicKey || ''}
          currentUserPublicKey={currentUserPublicKey}
          token={token}
          plaintextCache={sentMessagesPlaintext}
        />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        recipientPublicKey={conversation.otherUser?.publicKey || ''}
        token={token}
        onMessageSent={(messageId, plaintext) => {
          setSentMessagesPlaintext(prev => {
            const newMap = new Map(prev);
            newMap.set(messageId, plaintext);
            return newMap;
          });
        }}
      />
    </div>
  );
}
