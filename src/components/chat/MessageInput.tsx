import { useState } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { encryptPaddedMessage as encryptPayload } from '../../lib/crypto';
import { useAuth } from '../../contexts/AuthContext';

interface MessageInputProps {
  conversationId: Id<'conversations'>;
  recipientPublicKey: string;
  token: string;
  deviceId: string;
  onMessageSent?: (messageId: string, plaintext: string) => void;
}

export function MessageInput({ conversationId, recipientPublicKey, token, deviceId, onMessageSent }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { keyPair } = useAuth();
  const sendMessage = useMutation(api.messages.send);
  const hasKeys = keyPair !== null;

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const text = message.trim();
    if (!text || !hasKeys || !recipientPublicKey || !keyPair) {
      return;
    }

    let encryptedForRecipient;
    let encryptedForSelf;
    try {
      encryptedForRecipient = encryptPayload(text, recipientPublicKey, keyPair.privateKey);
      // Generate separate nonce for self-encryption (defense in depth)
      encryptedForSelf = encryptPayload(
        text,
        keyPair.publicKey,
        keyPair.privateKey
      );
    } catch (error) {
      console.error('Failed to encrypt message payload:', error);
      return;
    }

    setIsSending(true);
    setMessage('');

    try {
      const result = await sendMessage({
        token,
        deviceId,
        conversationId,
        ciphertext: encryptedForRecipient.ciphertext,
        ciphertextSelf: encryptedForSelf.ciphertext,
        nonce: encryptedForRecipient.nonce,
        nonceSelf: encryptedForSelf.nonce,
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
      <div class="px-4 py-3 border-t border-dark-100 dark:border-dark-800/60">
        <div class="flex items-center justify-center gap-2 text-dark-400 text-xs max-w-3xl mx-auto px-4 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-800/50">
          <div class="i-carbon-warning w-4 h-4" />
          <span>Recipient key unavailable</span>
        </div>
      </div>
    );
  }

  const isButtonActive = message.trim() && hasKeys;

  return (
    <div class="px-4 py-3 flex-shrink-0 border-t border-dark-100 dark:border-dark-800/60 bg-white/40 dark:bg-dark-900/40 backdrop-blur-xl">
      <form onSubmit={handleSubmit} class="flex items-center gap-2.5 max-w-3xl mx-auto">
        <input
          type="text"
          value={message}
          onInput={(e) => setMessage((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          class="flex-1 px-4 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-[13px] placeholder-dark-400 dark:placeholder-dark-500 border border-dark-200/60 dark:border-dark-700/60 transition-all"
          placeholder="Type a message..."
          disabled={isSending}
        />

        <button
          type="submit"
          disabled={!isButtonActive || isSending}
          class={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            isButtonActive
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              : 'bg-dark-100 dark:bg-dark-800 text-dark-300 dark:text-dark-600 cursor-not-allowed'
          }`}
        >
          {isSending ? (
            <div class="i-carbon-circle-dash w-4 h-4 animate-spin" />
          ) : (
            <div class="i-carbon-send-filled w-4 h-4" />
          )}
        </button>
      </form>

      {!hasKeys && (
        <p class="mt-2 text-center text-[10px] text-amber-600 dark:text-amber-400">
          Encryption keys not loaded
        </p>
      )}
    </div>
  );
}
