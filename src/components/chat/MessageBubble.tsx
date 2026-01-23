import { useState, useMemo } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useEncryption } from '../../hooks/useEncryption';

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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderPublicKey: string;
  recipientPublicKey: string;
  token: string;
  plaintextCache?: Map<string, string>;
}

export function MessageBubble({ message, isOwn, senderPublicKey, recipientPublicKey, token, plaintextCache }: MessageBubbleProps) {
  const { decrypt, encrypt, keyPair } = useEncryption();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const editMutation = useMutation(api.messages.edit);
  const deleteMutation = useMutation(api.messages.remove);
  // const { encrypt } = useEncryption();

  // Decrypt message
  const decryptedContent = useMemo(() => {
    if (message.isDeleted || !message.ciphertext) {
      return null;
    }

    if (!keyPair) {
      return '[Encryption keys not loaded]';
    }

    if (!senderPublicKey) {
      return '[Sender key not available]';
    }

    // For messages from others, decrypt with sender's public key and our private key
    // Note: We cannot decrypt our own sent messages because they were encrypted
    // with the recipient's public key. The plaintext should be stored temporarily
    // when sending (handled in MessageInput component).
    try {
      if (isOwn) {
        // Check if we have plaintext cached for this message
        if (plaintextCache && plaintextCache.has(message._id)) {
          return plaintextCache.get(message._id)!;
        }

        // Try to decrypt self-encrypted copy if available
        if (message.ciphertextSelf && keyPair) {
          try {
            // Decrypt: sender=me, recipient=me
            // public key = my public key, private key = my private key
            const decrypted = decrypt(message.ciphertextSelf, message.nonce, keyPair.publicKey);
            if (decrypted) return decrypted;
          } catch (e) {
            console.warn('Failed to decrypt self message:', e);
          }
        }

        return '[Encrypted message]';
      } else {
        // Decrypt message from sender using sender's public key and our private key
        const decrypted = decrypt(message.ciphertext, message.nonce, senderPublicKey);
        if (!decrypted) {
          console.error('Decryption returned null - check keys');
          return '[Unable to decrypt]';
        }
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error, { senderPublicKey, hasKeyPair: !!keyPair });
      return '[Unable to decrypt]';
    }
  }, [message.ciphertext, message.nonce, message.isDeleted, keyPair, senderPublicKey, isOwn, decrypt]);

  const handleEdit = async () => {
    if (!editText.trim() || !encrypt || !keyPair) return;

    // 1. Encrypt for Recipient
    const encryptedForRecipient = encrypt(editText.trim(), recipientPublicKey);
    if (!encryptedForRecipient) {
      console.error('Failed to encrypt edit for recipient');
      return;
    }

    // 2. Encrypt for Self (using SAME nonce)
    const encryptedForSelf = encrypt(editText.trim(), keyPair.publicKey, encryptedForRecipient.nonce);
    if (!encryptedForSelf) {
      console.error('Failed to encrypt edit for self');
      return;
    }

    try {
      await editMutation({
        token,
        messageId: message._id,
        ciphertext: encryptedForRecipient.ciphertext,
        ciphertextSelf: encryptedForSelf.ciphertext,
        nonce: encryptedForRecipient.nonce,
      });
      setIsEditing(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message? This cannot be undone.')) return;

    try {
      await deleteMutation({ token, messageId: message._id });
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const canEdit = isOwn && !message.isDeleted &&
    (Date.now() - message.createdAt) < 24 * 60 * 60 * 1000;

  return (
    <div class={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        class={`
          relative group max-w-[80%] sm:max-w-[70%]
          ${isOwn ? 'order-2' : ''}
        `}
      >
        {/* Message bubble */}
        <div
          class={`
            px-4 py-2 rounded-2xl
            ${isOwn
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-white border border-dark-200 text-dark-900 rounded-bl-md'
            }
            ${message.isDeleted ? 'italic opacity-60' : ''}
          `}
        >
          {message.isDeleted ? (
            <span class="text-sm">Message deleted</span>
          ) : isEditing ? (
            <div class="space-y-2">
              <input
                type="text"
                value={editText}
                onInput={(e) => setEditText((e.target as HTMLInputElement).value)}
                class="w-full px-2 py-1 rounded bg-white/20 text-inherit placeholder-white/50 focus:outline-none"
                placeholder="Edit message..."
                autoFocus
              />
              <div class="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  class="text-xs opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  class="text-xs font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p class="text-sm whitespace-pre-wrap break-words">
              {decryptedContent || '[Encrypted message]'}
            </p>
          )}
        </div>

        {/* Meta info */}
        <div
          class={`
            flex items-center gap-1 mt-1 text-xs text-dark-400
            ${isOwn ? 'justify-end' : 'justify-start'}
          `}
        >
          <span>{formatTime(message.createdAt)}</span>
          {message.editedAt && <span>· edited</span>}
          {isOwn && !message.isDeleted && (
            <span class="ml-1">
              {message.readAt ? (
                <span class="text-primary-500">✓✓</span>
              ) : message.deliveredAt ? (
                <span>✓✓</span>
              ) : (
                <span>✓</span>
              )}
            </span>
          )}
        </div>

        {/* Context menu (own messages only) */}
        {isOwn && !message.isDeleted && (
          <div class="absolute top-0 right-full mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                class="p-1 text-dark-400 hover:text-dark-600 hover:bg-dark-100 rounded"
              >
                <span class="i-carbon-overflow-menu-vertical" />
              </button>

              {showMenu && (
                <>
                  <div
                    class="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div class="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-dark-200 py-1 min-w-[120px]">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditText(decryptedContent || '');
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        class="w-full px-3 py-2 text-left text-sm hover:bg-dark-50 flex items-center gap-2"
                      >
                        <span class="i-carbon-edit" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      class="w-full px-3 py-2 text-left text-sm hover:bg-dark-50 text-red-600 flex items-center gap-2"
                    >
                      <span class="i-carbon-trash-can" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
