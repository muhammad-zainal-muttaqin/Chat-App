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

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Reverse messages for display (newest at bottom)
  const sortedMessages = [...messages].reverse();

  return (
    <div
      ref={containerRef}
      class="h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
    >
      <div class="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        <div class="space-y-3">
          {sortedMessages.length === 0 ? (
            <div class="flex items-center justify-center h-full min-h-[400px] text-dark-400 dark:text-dark-500 text-sm">
              <div class="text-center p-8">
                <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span class="i-carbon-locked text-3xl text-primary-500 dark:text-primary-400 opacity-80" />
                </div>
                <p class="font-medium">No messages yet</p>
                <p class="text-xs mt-1 opacity-70">Send a message to start this encrypted chat</p>
              </div>
            </div>
          ) : (
            <>
              {sortedMessages.map((message, index) => {
                const isOwn = message.senderId === currentUserId;
                const showDate = shouldShowDate(
                  sortedMessages[index - 1]?.createdAt,
                  message.createdAt
                );

                return (
                  <div key={message._id} class="w-full">
                    {showDate && (
                      <div class="flex justify-center my-4 lg:my-6">
                        <span class="px-4 py-1.5 bg-dark-100 dark:bg-dark-800 rounded-full text-[11px] font-medium text-dark-500 dark:text-dark-400 shadow-sm border border-dark-200/50 dark:border-dark-700/50">
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
              <div ref={bottomRef} class="h-4 lg:h-6" />
            </>
          )}
        </div>
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
