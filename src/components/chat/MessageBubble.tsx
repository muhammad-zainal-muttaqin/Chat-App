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

  const decryptedContent = useMemo(() => {
    if (message.isDeleted || !message.ciphertext) return null;
    if (!keyPair) return '[Encryption keys not loaded]';
    if (!senderPublicKey) return '[Sender key not available]';

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
        if (!decrypted) return '[Unable to decrypt]';
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return '[Unable to decrypt]';
    }
  }, [message.ciphertext, message.ciphertextSelf, message.nonce, message.isDeleted, message._id, keyPair, senderPublicKey, isOwn, decrypt, plaintextCache]);

  const handleEdit = async () => {
    if (!editText.trim() || !encrypt || !keyPair) return;

    const encryptedForRecipient = encrypt(editText.trim(), recipientPublicKey);
    if (!encryptedForRecipient) return;

    const encryptedForSelf = encrypt(editText.trim(), keyPair.publicKey, encryptedForRecipient.nonce);
    if (!encryptedForSelf) return;

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
    if (!confirm('Delete this message?')) return;
    try {
      await deleteMutation({ token, messageId: message._id });
      setShowMenu(false);
      // Force UI update - Convex will auto-refresh via useQuery, but this ensures immediate feedback
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const canEdit = isOwn && !message.isDeleted && (Date.now() - message.createdAt) < 24 * 60 * 60 * 1000;

  return (
    <div class={`flex ${isOwn ? 'justify-end' : 'justify-start'} w-full`}>
      <div class={`max-w-[80%] sm:max-w-[70%] lg:max-w-[60%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div
          class={`
            relative group px-4 py-2.5 rounded-2xl
            ${isOwn
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-100 rounded-bl-md border border-dark-200 dark:border-dark-700'
            }
            ${message.isDeleted ? 'opacity-60' : ''}
          `}
        >
          {message.isDeleted ? (
            <p class="text-sm italic flex items-center gap-2">
              <div class="i-carbon-trash-can w-4 h-4 opacity-70" />
              Message deleted
            </p>
          ) : isEditing ? (
            <div class="min-w-[200px] space-y-2">
              <input
                type="text"
                value={editText}
                onInput={(e) => setEditText((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 rounded-lg bg-white/20 text-inherit placeholder-white/60 focus:outline-none text-sm"
                placeholder="Edit message..."
                autoFocus
              />
              <div class="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  class="px-3 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  class="px-3 py-1.5 rounded-lg text-xs bg-white text-primary-600 font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {decryptedContent || '[Encrypted message]'}
            </p>
          )}

          {/* Menu trigger */}
          {isOwn && !message.isDeleted && !isEditing && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              class="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-all hidden sm:block"
            >
              <div class="i-carbon-overflow-menu-vertical w-4 h-4" />
            </button>
          )}
        </div>

        {/* Meta */}
        <div class={`flex items-center gap-2 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span class="text-[10px] text-dark-400 dark:text-dark-500">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span class="text-[10px] text-dark-400 dark:text-dark-500">· Edited</span>
          )}
          {isOwn && !message.isDeleted && (
            <span class="text-[10px] text-dark-400 dark:text-dark-500">
              {message.readAt ? (
                <span class="text-primary-500">Read</span>
              ) : message.deliveredAt ? (
                'Delivered'
              ) : (
                'Sent'
              )}
            </span>
          )}
        </div>

        {/* Context Menu */}
        {showMenu && isOwn && !message.isDeleted && (
          <>
            <div class="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div class="absolute right-full mr-2 top-0 z-50 w-36 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-200 dark:border-dark-700 py-1">
              {canEdit && (
                <button
                  onClick={() => {
                    setEditText(decryptedContent || '');
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  class="w-full px-3 py-2 text-left text-sm text-dark-700 dark:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700 flex items-center gap-2 transition-colors"
                >
                  <div class="i-carbon-edit w-4 h-4" />
                  Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                class="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
              >
                <div class="i-carbon-trash-can w-4 h-4" />
                Delete
              </button>
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
