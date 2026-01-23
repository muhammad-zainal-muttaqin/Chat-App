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

    try {
      if (isOwn) {
        if (plaintextCache && plaintextCache.has(message._id)) {
          return plaintextCache.get(message._id)!;
        }

        if (message.ciphertextSelf && keyPair) {
          try {
            const decrypted = decrypt(message.ciphertextSelf, message.nonce, keyPair.publicKey);
            if (decrypted) return decrypted;
          } catch (e) {
            console.warn('Failed to decrypt self message:', e);
          }
        }

        return '[Encrypted message]';
      } else {
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

    const encryptedForRecipient = encrypt(editText.trim(), recipientPublicKey);
    if (!encryptedForRecipient) {
      console.error('Failed to encrypt edit for recipient');
      return;
    }

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
    <div class={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in duration-300 w-full px-1`}>
      <div
        class={`
          relative group max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] xl:max-w-[60%] flex flex-col
          ${isOwn ? 'items-end' : 'items-start'}
        `}
      >
        {/* Message bubble */}
        <div
          class={`
            px-4 lg:px-5 py-2.5 lg:py-3 rounded-[20px] shadow-premium relative flex items-center
            ${isOwn
              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-none'
              : 'bg-white dark:bg-dark-800 border border-dark-200/50 dark:border-white/5 text-dark-900 dark:text-dark-100 rounded-tl-none'
            }
            ${message.isDeleted ? 'italic opacity-60' : ''}
            transition-all duration-300 hover:shadow-lg
          `}
        >
          {message.isDeleted ? (
            <div class="flex items-center gap-2 text-sm w-full">
              <span class="i-carbon-trash-can opacity-70" />
              <span>This message was deleted</span>
            </div>
          ) : isEditing ? (
            <div class="min-w-[200px] flex flex-col gap-3 w-full">
              <input
                type="text"
                value={editText}
                onInput={(e) => setEditText((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 rounded-xl bg-black/10 dark:bg-white/10 text-inherit placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                placeholder="Edit message..."
                autoFocus
              />
              <div class="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-black/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-primary-600 shadow-sm transition-transform active:scale-95"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p class="text-[15px] lg:text-[16px] leading-[1.5] whitespace-pre-wrap break-words font-semibold w-full">
              {decryptedContent || '[Encrypted message]'}
            </p>
          )}

          {/* Context menu trigger (desktop) */}
          {isOwn && !message.isDeleted && !isEditing && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              class="absolute -left-10 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-300 hidden sm:block"
            >
              <span class="i-carbon-overflow-menu-vertical text-xl" />
            </button>
          )}
        </div>

        {/* Meta info & Status */}
        <div
          class={`
            flex items-center gap-2 mt-1 px-1
            ${isOwn ? 'text-primary-500/70' : 'text-dark-500/60 dark:text-dark-500/70'}
          `}
        >
          <span class="text-[11px] font-medium tracking-normal uppercase opacity-75">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span class="flex items-center gap-1 text-[10px] font-medium opacity-70">
              <span class="w-1 h-1 rounded-full bg-current" />
              Edited
            </span>
          )}
          {isOwn && !message.isDeleted && (
            <div class="flex items-center ml-1 flex-shrink-0">
              {message.readAt ? (
                <div class="flex items-center -space-x-0.5">
                  <span class="i-carbon-checkmark text-primary-500 text-xs opacity-90" />
                  <span class="i-carbon-checkmark text-primary-500 text-xs opacity-90" />
                </div>
              ) : message.deliveredAt ? (
                <div class="flex items-center -space-x-0.5 opacity-60">
                  <span class="i-carbon-checkmark text-xs" />
                  <span class="i-carbon-checkmark text-xs" />
                </div>
              ) : (
                <span class="i-carbon-checkmark opacity-50 text-xs" />
              )}
            </div>
          )}
        </div>

        {/* Menu (mobile & desktop) */}
        {showMenu && isOwn && !message.isDeleted && (
          <>
            <div
              class="fixed inset-0 z-40 bg-black/5 dark:bg-black/20 backdrop-blur-[2px]"
              onClick={() => setShowMenu(false)}
            />
            <div class="absolute right-0 bottom-full mb-2 z-50 min-w-[160px] animate-fade-in">
              <div class="glass-card shadow-2xl border border-white/20 dark:border-white/10 py-1.5 overflow-hidden">
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditText(decryptedContent || '');
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    class="w-full px-4 py-3 text-left text-sm hover:bg-dark-50 dark:hover:bg-white/10 text-dark-700 dark:text-dark-200 flex items-center gap-3 transition-colors"
                  >
                    <span class="i-carbon-edit text-lg text-primary-500" />
                    <span class="font-semibold">Edit Message</span>
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  class="w-full px-4 py-3 text-left text-sm hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-3 transition-colors"
                >
                  <span class="i-carbon-trash-can text-lg" />
                  <span class="font-semibold">Delete</span>
                </button>
              </div>
            </div>
          </>
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
