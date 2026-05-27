import { useState, useMemo } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { decryptMessageAuto as decryptPayload, encryptPaddedMessage as encryptPayload } from '../../lib/crypto';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  _id: Id<'messages'>;
  conversationId: Id<'conversations'>;
  senderId: Id<'users'>;
  senderPublicKey?: string;
  ciphertext: string | null;
  ciphertextSelf?: string | null;
  nonce: string;
  nonceSelf?: string;
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
  deviceId: string;
  plaintextCache?: Map<string, string>;
}

export function MessageBubble({ message, isOwn, senderPublicKey, recipientPublicKey, token, deviceId, plaintextCache }: MessageBubbleProps) {
  const { keyPair } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const editMutation = useMutation(api.messages.edit);
  const deleteMutation = useMutation(api.messages.remove);
  const effectiveSenderPublicKey = message.senderPublicKey || senderPublicKey;

  const decryptedContent = useMemo(() => {
    if (message.isDeleted || !message.ciphertext) return null;
    if (!keyPair) return '[Encryption keys not loaded]';
    if (!effectiveSenderPublicKey) return '[Sender key not available]';

    try {
      if (isOwn) {
        if (plaintextCache && plaintextCache.has(message._id)) {
          return plaintextCache.get(message._id)!;
        }
        if (message.ciphertextSelf && keyPair) {
          try {
            const decrypted = decryptPayload(
              message.ciphertextSelf,
              message.nonceSelf || message.nonce, // Use separate nonce if available, fallback to shared
              effectiveSenderPublicKey,
              keyPair.privateKey
            );
            if (decrypted) return decrypted;
          } catch (e) {
            console.warn('Failed to decrypt self message:', e);
          }
        }
        return '[Encrypted message]';
      } else {
        const decrypted = decryptPayload(
          message.ciphertext,
          message.nonce,
          effectiveSenderPublicKey,
          keyPair.privateKey
        );
        if (!decrypted) return '[Unable to decrypt]';
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return '[Unable to decrypt]';
    }
  }, [message.ciphertext, message.ciphertextSelf, message.nonce, message.isDeleted, message._id, keyPair, effectiveSenderPublicKey, isOwn, plaintextCache]);

  const handleEdit = async () => {
    if (!editText.trim() || !keyPair) return;

    let encryptedForRecipient;
    let encryptedForSelf;
    try {
      encryptedForRecipient = encryptPayload(editText.trim(), recipientPublicKey, keyPair.privateKey);
      encryptedForSelf = encryptPayload(
        editText.trim(),
        keyPair.publicKey,
        keyPair.privateKey
      );
    } catch (error) {
      console.error('Failed to encrypt edited message:', error);
      return;
    }

    try {
      await editMutation({
        token,
        deviceId,
        messageId: message._id,
        ciphertext: encryptedForRecipient.ciphertext,
        ciphertextSelf: encryptedForSelf.ciphertext,
        nonce: encryptedForRecipient.nonce,
        nonceSelf: encryptedForSelf.nonce,
      });
      setIsEditing(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this message from your view?')) return;
    try {
      await deleteMutation({ token, deviceId, messageId: message._id });
      setShowMenu(false);
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
            relative group px-3.5 py-2.5 rounded-2xl
            ${isOwn
              ? 'bg-primary-600 text-white rounded-br-lg'
              : 'bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-100 rounded-bl-lg border border-dark-100 dark:border-dark-700/60'
            }
            ${message.isDeleted ? 'opacity-50' : ''}
          `}
        >
          {message.isDeleted ? (
            <p class="text-[13px] italic flex items-center gap-1.5 opacity-80">
              <div class="i-carbon-trash-can w-3.5 h-3.5" />
              Message deleted
            </p>
          ) : isEditing ? (
            <div class="min-w-[200px] space-y-2">
              <input
                type="text"
                value={editText}
                onInput={(e) => setEditText((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-1.5 rounded-lg bg-white/20 text-inherit placeholder-white/60 focus:outline-none text-[13px]"
                placeholder="Edit message..."
                autoFocus
              />
              <div class="flex gap-1.5 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  class="px-2.5 py-1 rounded-md text-xs hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  class="px-2.5 py-1 rounded-md text-xs bg-white text-primary-600 font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p class="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {decryptedContent || '[Encrypted message]'}
            </p>
          )}

          {/* Menu trigger */}
          {!message.isDeleted && !isEditing && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              class="absolute -left-7 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-dark-300 hover:text-dark-500 dark:text-dark-600 dark:hover:text-dark-400 transition-all hidden sm:block"
            >
              <div class="i-carbon-overflow-menu-vertical w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Meta */}
        <div class={`flex items-center gap-1.5 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span class="text-[10px] text-dark-400 dark:text-dark-500 tabular-nums">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span class="text-[10px] text-dark-400 dark:text-dark-500">· edited</span>
          )}
          {isOwn && !message.isDeleted && (
            <span class="text-[10px] text-dark-400 dark:text-dark-500">
              {message.readAt ? (
                <span class="text-primary-500">read</span>
              ) : message.deliveredAt ? (
                'delivered'
              ) : (
                'sent'
              )}
            </span>
          )}
        </div>

        {/* Context Menu */}
        {showMenu && !message.isDeleted && (
          <>
            <div class="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div class="absolute right-full mr-2 top-0 z-50 w-36 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-dark-200/60 dark:border-dark-700/60 py-1 animate-scale-in">
              {canEdit && (
                <button
                  onClick={() => {
                    setEditText(decryptedContent || '');
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  class="w-full px-3 py-2 text-left text-[13px] text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-700 flex items-center gap-2 transition-colors"
                >
                  <div class="i-carbon-edit w-3.5 h-3.5" />
                  Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                class="w-full px-3 py-2 text-left text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 transition-colors"
              >
                <div class="i-carbon-trash-can w-3.5 h-3.5" />
                Delete for Me
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
