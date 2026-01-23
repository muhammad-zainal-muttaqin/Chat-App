import { useState } from 'preact/hooks';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface NewChatModalProps {
  token: string;
  onClose: () => void;
  onConversationCreated: (conversationId: Id<'conversations'>) => void;
}

export function NewChatModal({ token, onClose, onConversationCreated }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const searchResults = useQuery(
    api.users.search,
    searchQuery.length >= 2 ? { query: searchQuery, token } : 'skip'
  );

  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);

  const handleSelectUser = async (userId: Id<'users'>) => {
    setIsCreating(true);
    try {
      const result = await getOrCreateConversation({ token, otherUserId: userId });
      onConversationCreated(result._id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    setIsCreating(false);
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div class="p-4 border-b border-dark-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-dark-900">New Chat</h2>
          <button
            onClick={onClose}
            class="p-2 text-dark-400 hover:text-dark-600 hover:bg-dark-100 rounded-lg"
          >
            <span class="i-carbon-close text-xl" />
          </button>
        </div>

        {/* Search */}
        <div class="p-4 border-b border-dark-200">
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 i-carbon-search text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              class="input pl-10"
              placeholder="Search by email or name..."
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div class="flex-1 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div class="p-8 text-center text-dark-400 text-sm">
              Enter at least 2 characters to search
            </div>
          ) : searchResults === undefined ? (
            <div class="p-8 text-center text-dark-400">
              <span class="i-carbon-circle-dash animate-spin text-2xl" />
            </div>
          ) : searchResults.length === 0 ? (
            <div class="p-8 text-center text-dark-400 text-sm">
              No users found
            </div>
          ) : (
            <div class="divide-y divide-dark-100">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user._id)}
                  disabled={isCreating}
                  class="w-full p-4 text-left hover:bg-dark-50 transition-colors disabled:opacity-50"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span class="text-primary-600 font-medium">
                        {user.displayName[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div class="font-medium text-dark-900">{user.displayName}</div>
                      <div class="text-sm text-dark-500">{user.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div class="p-4 border-t border-dark-200 bg-dark-50">
          <div class="flex items-center gap-2 text-xs text-dark-500">
            <span class="i-carbon-locked" />
            <span>Messages will be end-to-end encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
