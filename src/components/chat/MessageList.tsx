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
      class="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {sortedMessages.length === 0 ? (
        <div class="flex items-center justify-center h-full text-dark-400 text-sm">
          <div class="text-center">
            <span class="i-carbon-locked text-4xl mb-2 block opacity-50" />
            <p>Start your encrypted conversation</p>
          </div>
        </div>
      ) : (
        sortedMessages.map((message, index) => {
          const isOwn = message.senderId === currentUserId;
          const showDate = shouldShowDate(
            sortedMessages[index - 1]?.createdAt,
            message.createdAt
          );

          return (
            <div key={message._id}>
              {showDate && (
                <div class="flex justify-center my-4">
                  <span class="px-3 py-1 bg-dark-100 rounded-full text-xs text-dark-500">
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
        })
      )}
      <div ref={bottomRef} />
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
