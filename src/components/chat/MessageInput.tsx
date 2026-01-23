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
      <div class="px-6 py-4 border-t border-dark-200/50 dark:border-white/5 glass">
        <div class="flex items-center justify-center gap-2 text-dark-400 dark:text-dark-500 text-sm font-medium">
          <span class="i-carbon-warning text-lg" />
          <span>Messaging unavailable - Recipient key missing</span>
        </div>
      </div>
    );
  }

  return (
    <div class="border-t border-dark-200/50 dark:border-white/5 bg-white/50 dark:bg-dark-950/50 backdrop-blur-xl relative z-30">
      <div class="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-5">
        <form onSubmit={handleSubmit} class="flex items-end gap-3 lg:gap-4">
          <div class="flex-1 relative group">
            <textarea
              value={message}
              onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              class="w-full px-5 py-2.5 text-base rounded-2xl border border-dark-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 text-dark-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-300 placeholder-dark-400 dark:placeholder-dark-600 shadow-sm leading-relaxed min-h-[56px]"
              placeholder="Type a secure message..."
              rows={1}
              disabled={isSending}
              style={{
                minHeight: '56px',
                maxHeight: '140px',
              }}
            />
            <div class="absolute right-4 bottom-3.5 flex items-center gap-2">
              <button
                type="button"
                class="p-2 text-dark-400 hover:text-primary-500 transition-colors hidden sm:block opacity-70 hover:opacity-100"
              >
                <span class="i-carbon-face-satisfied text-xl" />
              </button>
              <button
                type="button"
                class="p-2 text-dark-400 hover:text-primary-500 transition-colors hidden sm:block opacity-70 hover:opacity-100"
              >
                <span class="i-carbon-attachment text-xl" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!message.trim() || isSending || !hasKeys}
            class={`
              w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg flex-shrink-0 flex-grow-0
              ${message.trim() && hasKeys
                ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white hover:shadow-primary-500/40 hover:scale-105 active:scale-95 hover:rotate-1'
                : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
              }
            `}
            title="Send message"
          >
            {isSending ? (
              <span class="i-carbon-circle-dash animate-spin text-xl" />
            ) : (
              <span class="i-carbon-send-filled text-xl translate-x-0.5" />
            )}
          </button>
        </form>

        {!hasKeys && (
          <div class="mt-3 flex items-center justify-center gap-2 text-[11px] text-accent-500 font-bold uppercase tracking-widest bg-accent-500/5 py-2 rounded-xl border border-accent-500/10">
            <span class="i-carbon-security text-sm" />
            Encryption keys not active. Reset session to fix.
          </div>
        )}
      </div>
    </div>
  );
}
