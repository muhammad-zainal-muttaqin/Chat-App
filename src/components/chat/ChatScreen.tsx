import { useEffect, useState } from 'preact/hooks';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

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

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (messagesData?.messages.length) {
      markAllRead({ token, conversationId });
    }
  }, [conversationId, messagesData?.messages.length]);

  if (conversation === undefined || messagesData === undefined) {
    return (
      <div class="h-full flex-center bg-white/50 dark:bg-dark-950/50 backdrop-blur-sm">
        <div class="relative w-16 h-16">
          <div class="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div class="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          <span class="absolute inset-0 flex-center i-carbon-locked text-primary-500 text-xl" />
        </div>
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div class="h-full flex-center flex-col gap-4 text-dark-400">
        <span class="i-carbon-error text-5xl" />
        <span class="font-medium text-lg">Conversation not found</span>
        <button onClick={onBack} class="btn-secondary">Go Back</button>
      </div>
    );
  }

  return (
    <div class="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-dark-950 overflow-hidden">
      {/* Header */}
      <header class="flex-shrink-0 h-[72px] lg:h-[80px] px-4 lg:px-8 border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl z-20 relative">
        <div class="flex items-center gap-3 lg:gap-4 min-w-0 flex-1 h-full">
          {onBack ? (
            <button
              onClick={onBack}
              class="lg:hidden p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all active:scale-90 flex-shrink-0"
            >
              <span class="i-carbon-arrow-left text-2xl" />
            </button>
          ) : null}
          <button
            onClick={onToggleSidebar || (() => { })}
            class="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-all duration-300 active:scale-90 flex-shrink-0 lg:hidden"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <span class="i-carbon-menu text-2xl block" />
          </button>

          <div class="relative flex-shrink-0 group cursor-pointer">
            <div class="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300 overflow-hidden ring-2 ring-white dark:ring-dark-900">
              <span class="text-white font-bold text-lg lg:text-xl uppercase leading-none flex items-center justify-center h-full w-full">
                {(conversation.otherUser?.displayName?.[0] || '?').toUpperCase()}
              </span>
            </div>
            <div class="absolute 0 bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-dark-950 rounded-full shadow-sm" />
          </div>

          <div class="flex flex-col justify-center min-w-0 flex-1 h-full py-2">
            <h2 class="font-bold text-gray-900 dark:text-white truncate text-base lg:text-lg leading-tight mb-0.5">
              {conversation.otherUser?.displayName || 'Unknown'}
            </h2>
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider whitespace-nowrap">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active Now
              </div>
              <span class="text-gray-300 dark:text-gray-700 mx-1">•</span>
              <div class="flex items-center gap-1 text-[10px] text-primary-500 dark:text-primary-400 font-bold uppercase tracking-wider whitespace-nowrap opacity-80">
                <span class="i-carbon-locked text-xs" />
                E2E Encrypted
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 lg:gap-2 flex-shrink-0 h-full relative">
          <button class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-white/10 transition-all hidden sm:flex active:scale-95">
            <span class="i-carbon-phone text-xl" />
          </button>
          <button class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-white/10 transition-all hidden sm:flex active:scale-95">
            <span class="i-carbon-video text-xl" />
          </button>

          <div class="relative group">
            <button class="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-white/10 transition-all active:scale-95">
              <span class="i-carbon-overflow-menu-vertical text-xl" />
            </button>

            <div class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden hidden group-focus-within:block animate-fade-in opacity-0 group-focus-within:opacity-100 z-50">
              <button
                onClick={async () => {
                  if (confirm('Delete entire conversation? This cannot be undone.')) {
                    try {
                      await deleteConversation({ token, conversationId });
                      if (onBack) onBack(); // Go back to list on mobile/tablet
                    } catch (err) {
                      console.error('Failed to delete', err);
                      alert('Failed to delete conversation');
                    }
                  }
                }}
                class="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <span class="i-carbon-trash-can text-lg" />
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div class="flex-1 min-h-0 overflow-hidden relative bg-white dark:bg-dark-950">
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
      <div class="flex-shrink-0 relative z-30">
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
    </div>
  );
}
