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
  deviceId: string;
  currentUserId: Id<'users'>;
  currentUserPublicKey: string;
  onBack?: () => void;
  onToggleSidebar?: () => void;
}

export function ChatScreen({ conversationId, token, deviceId, currentUserId, currentUserPublicKey, onBack, onToggleSidebar }: ChatScreenProps) {
  const conversation = useQuery(api.conversations.getById, { token, deviceId, conversationId });
  const messagesData = useQuery(api.conversations.getMessages, { token, deviceId, conversationId, limit: 50 });
  const markAllRead = useMutation(api.messages.markAllRead);
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const [sentMessagesPlaintext, setSentMessagesPlaintext] = useState<Map<string, string>>(new Map());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (messagesData?.messages.length) {
      markAllRead({ token, deviceId, conversationId });
    }
  }, [conversationId, messagesData?.messages.length, deviceId]);

  if (conversation === undefined || messagesData === undefined) {
    return (
      <div class="h-full flex-center">
        <div class="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div class="h-full flex-center flex-col gap-3 text-dark-400">
        <div class="i-carbon-warning w-8 h-8" />
        <span class="text-sm font-medium">Conversation not found</span>
        <button onClick={onBack} class="btn-secondary text-xs">Go Back</button>
      </div>
    );
  }

  const online = isUserOnline(conversation.otherUser);

  return (
    <div class="flex-1 flex flex-col h-full min-h-0 bg-transparent">
      {/* Header */}
      <header class="h-[60px] px-4 border-b border-dark-100 dark:border-dark-800/60 flex items-center justify-between bg-white/60 dark:bg-dark-900/60 backdrop-blur-xl flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            class="lg:hidden p-1.5 -ml-1 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
          >
            <div class="i-carbon-menu w-5 h-5" />
          </button>

          <div class="relative">
            <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-center text-primary-700 dark:text-primary-400 font-semibold text-sm flex-shrink-0">
              {(conversation.otherUser?.displayName?.[0] || '?').toUpperCase()}
            </div>
            {online && (
              <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-dark-900 rounded-full" />
            )}
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="font-semibold text-dark-900 dark:text-white truncate text-[14px] leading-tight">
              {conversation.otherUser?.displayName || 'Unknown'}
            </h2>
            <p class="text-[11px] text-dark-400 dark:text-dark-500 mt-0.5">
              {formatLastSeen(conversation.otherUser?.lastSeenAt)}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <div class="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-[10px] font-medium">
            <div class="i-carbon-locked w-3 h-3" />
            E2EE
          </div>

          <div class="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              class="w-8 h-8 rounded-lg text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors flex-center"
            >
              <div class="i-carbon-overflow-menu-vertical w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div class="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div class="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-200/60 dark:border-dark-700/60 py-1 z-50 animate-scale-in">
                  <button
                    onClick={async () => {
                      if (confirm('Hide this conversation from your list?')) {
                        try {
                          await deleteConversation({ token, deviceId, conversationId });
                          if (onBack) onBack();
                        } catch (err) {
                          console.error('Failed to delete', err);
                        }
                      }
                      setShowMenu(false);
                    }}
                    class="w-full px-3.5 py-2 text-left text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 transition-colors"
                  >
                    <div class="i-carbon-trash-can w-4 h-4" />
                    Hide Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div class="flex-1 min-h-0 overflow-hidden chat-bg">
        <MessageList
          messages={messagesData.messages}
          currentUserId={currentUserId}
          otherUserPublicKey={conversation.otherUser?.publicKey || ''}
          currentUserPublicKey={currentUserPublicKey}
          token={token}
          deviceId={deviceId}
          plaintextCache={sentMessagesPlaintext}
        />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        recipientPublicKey={conversation.otherUser?.publicKey || ''}
        token={token}
        deviceId={deviceId}
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
