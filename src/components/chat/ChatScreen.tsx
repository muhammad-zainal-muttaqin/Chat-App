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
}

export function ChatScreen({ conversationId, token, currentUserId, currentUserPublicKey }: ChatScreenProps) {
  const conversation = useQuery(api.conversations.getById, { token, conversationId });
  const messagesData = useQuery(api.conversations.getMessages, { token, conversationId, limit: 50 });
  const markAllRead = useMutation(api.messages.markAllRead);
  const [sentMessagesPlaintext, setSentMessagesPlaintext] = useState<Map<string, string>>(new Map());

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (messagesData?.messages.length) {
      markAllRead({ token, conversationId });
    }
  }, [conversationId, messagesData?.messages.length]);

  if (conversation === undefined || messagesData === undefined) {
    return (
      <div class="flex-1 flex items-center justify-center">
        <span class="i-carbon-circle-dash animate-spin text-3xl text-dark-400" />
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div class="flex-1 flex items-center justify-center text-dark-400">
        Conversation not found
      </div>
    );
  }

  return (
    <div class="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div class="p-4 border-b border-dark-200 bg-white flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <span class="text-primary-600 font-medium">
            {conversation.otherUser?.displayName[0].toUpperCase() || '?'}
          </span>
        </div>
        <div class="flex-1">
          <div class="font-medium text-dark-900">
            {conversation.otherUser?.displayName || 'Unknown'}
          </div>
          <div class="text-xs text-dark-500 flex items-center gap-1">
            <span class="i-carbon-locked" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messagesData.messages}
        currentUserId={currentUserId}
        otherUserPublicKey={conversation.otherUser?.publicKey || ''}
        currentUserPublicKey={currentUserPublicKey}
        token={token}
        plaintextCache={sentMessagesPlaintext}
      />

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
