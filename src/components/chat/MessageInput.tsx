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

    // Encrypt message for recipient first (generates new nonce)
    const encryptedForRecipient = encrypt(text, recipientPublicKey);
    if (!encryptedForRecipient) {
      console.error('Failed to encrypt message for recipient');
      return;
    }

    // Encrypt message for self using SAME nonce
    const encryptedForSelf = encrypt(text, keyPair.publicKey, encryptedForRecipient.nonce);
    if (!encryptedForSelf) {
      console.error('Failed to encrypt message for self');
      return;
    }

    setIsSending(true);
    setMessage(''); // Clear immediately for better UX

    try {
      const result = await sendMessage({
        token,
        conversationId,
        ciphertext: encryptedForRecipient.ciphertext,
        ciphertextSelf: encryptedForSelf.ciphertext,
        nonce: encryptedForRecipient.nonce,
      });

      // Store plaintext for display (since we can't decrypt our own messages)
      if (onMessageSent && result.messageId) {
        onMessageSent(result.messageId, text);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(text); // Restore message on error
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
      <div class="p-4 border-t border-dark-200 bg-dark-50">
        <div class="text-center text-dark-400 text-sm">
          Cannot send messages - recipient key not found
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} class="p-4 border-t border-dark-200 bg-white">
      <div class="flex items-end gap-2">
        <div class="flex-1 relative">
          <textarea
            value={message}
            onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
            onKeyDown={handleKeyDown}
            class="w-full px-4 py-3 rounded-2xl border border-dark-200 bg-dark-50 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Type a message..."
            rows={1}
            disabled={isSending}
            style={{
              minHeight: '48px',
              maxHeight: '120px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isSending || !hasKeys}
          class={`
            p-3 rounded-full transition-colors
            ${message.trim() && hasKeys
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-dark-100 text-dark-400'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isSending ? (
            <span class="i-carbon-circle-dash animate-spin text-xl" />
          ) : (
            <span class="i-carbon-send-alt text-xl" />
          )}
        </button>
      </div>

      {!hasKeys && (
        <p class="mt-2 text-xs text-red-500 text-center">
          Encryption keys not loaded. Please refresh the page.
        </p>
      )}
    </form>
  );
}
