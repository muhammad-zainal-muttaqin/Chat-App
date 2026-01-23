import { useState } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useEncryption } from '../../hooks/useEncryption';

interface MessageInputProps {
  conversationId: Id<'conversations'>;
  recipientPublicKey: string;
  token: string;
  onMessageSent?: (messageId: string, plaintext: string) => void;
}

export function MessageInput({ conversationId, recipientPublicKey, token, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { encrypt, hasKeys, keyPair } = useEncryption();
  const sendMessage = useMutation(api.messages.send);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const text = message.trim();
    if (!text || !hasKeys || !recipientPublicKey || !keyPair) return;

    const encryptedForRecipient = encrypt(text, recipientPublicKey);
    if (!encryptedForRecipient) {
      console.error('Failed to encrypt message for recipient');
      return;
    }

    const encryptedForSelf = encrypt(text, keyPair.publicKey, encryptedForRecipient.nonce);
    if (!encryptedForSelf) {
      console.error('Failed to encrypt message for self');
      return;
    }

    setIsSending(true);
    setMessage('');

    try {
      const result = await sendMessage({
        token,
        conversationId,
        ciphertext: encryptedForRecipient.ciphertext,
        ciphertextSelf: encryptedForSelf.ciphertext,
        nonce: encryptedForRecipient.nonce,
      });

      if (onMessageSent && result.messageId) {
        onMessageSent(result.messageId, text);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(text);
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!recipientPublicKey) {
    return (
      <div class="p-4 border-t border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
        <div class="flex items-center justify-center gap-2 text-dark-500 text-sm">
          <div class="i-carbon-warning w-5 h-5" />
          <span>Recipient key unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div class="p-4 border-t border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex-shrink-0">
      <form onSubmit={handleSubmit} class="flex items-center gap-3 max-w-3xl mx-auto">
        <div class="flex-1">
          <input
            type="text"
            value={message}
            onInput={(e) => setMessage((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            class="w-full px-4 py-3 rounded-full border border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all text-sm placeholder-dark-400"
            placeholder="Type a message..."
            disabled={isSending}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isSending || !hasKeys}
          class={`
            w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
            ${message.trim() && hasKeys
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30'
              : 'bg-dark-200 dark:bg-dark-700 text-dark-400 cursor-not-allowed'
            }
          `}
        >
          {isSending ? (
            <div class="i-carbon-circle-dash w-5 h-5 animate-spin" />
          ) : (
            <div class="i-carbon-send-filled w-5 h-5" />
          )}
        </button>
      </form>

      {!hasKeys && (
        <p class="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
          Encryption keys not loaded
        </p>
      )}
    </div>
  );
}
