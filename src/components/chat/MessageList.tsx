import { useEffect, useRef } from 'preact/hooks';
import { Id } from '../../../convex/_generated/dataModel';
import { MessageBubble } from './MessageBubble';

interface Message {
  _id: Id<'messages'>;
  conversationId: Id<'conversations'>;
  senderId: Id<'users'>;
  ciphertext: string | null;
  ciphertextSelf?: string | null;
  nonce: string;
  isDeleted: boolean;
  editedAt: number | null;
  deliveredAt: number | null;
  readAt: number | null;
  createdAt: number;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: Id<'users'>;
  otherUserPublicKey: string;
  currentUserPublicKey: string;
  token: string;
  plaintextCache?: Map<string, string>;
}

export function MessageList({ messages, currentUserId, otherUserPublicKey, currentUserPublicKey, token, plaintextCache }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages.map(m => `${m._id}-${m.isDeleted}`).join(',')]);

  const sortedMessages = [...messages].reverse();

  return (
    <div ref={containerRef} class="h-full overflow-y-auto">
      <div class="max-w-3xl mx-auto px-4 py-6">
        {sortedMessages.length === 0 ? (
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-14 h-14 rounded-2xl bg-dark-100 dark:bg-dark-800 flex-center mb-4">
              <div class="i-carbon-locked w-6 h-6 text-dark-400" />
            </div>
            <p class="text-sm text-dark-500 dark:text-dark-400">No messages yet</p>
            <p class="text-xs text-dark-400 dark:text-dark-500 mt-1">Start the conversation</p>
          </div>
        ) : (
          <div class="space-y-3">
            {sortedMessages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const showDate = shouldShowDate(
                sortedMessages[index - 1]?.createdAt,
                message.createdAt
              );

              return (
                <div key={`${message._id}-${message.isDeleted}-${message.editedAt || ''}`}>
                  {showDate && (
                    <div class="flex justify-center my-6">
                      <span class="px-3 py-1 bg-dark-100 dark:bg-dark-800 rounded-full text-xs text-dark-500 dark:text-dark-400">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    senderPublicKey={isOwn ? currentUserPublicKey : otherUserPublicKey}
                    recipientPublicKey={isOwn ? otherUserPublicKey : currentUserPublicKey}
                    token={token}
                    plaintextCache={plaintextCache}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} class="h-2" />
          </div>
        )}
      </div>
    </div>
  );
}

function shouldShowDate(prevTimestamp: number | undefined, currentTimestamp: number): boolean {
  if (!prevTimestamp) return true;
  const prevDate = new Date(prevTimestamp).toDateString();
  const currentDate = new Date(currentTimestamp).toDateString();
  return prevDate !== currentDate;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return 'Today';
  }
  if (diff < 48 * 60 * 60 * 1000) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
