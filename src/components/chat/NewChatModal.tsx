import { useState } from 'preact/hooks';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface NewChatModalProps {
  token: string;
  deviceId: string;
  onClose: () => void;
  onConversationCreated: (conversationId: Id<'conversations'>) => void;
}

export function NewChatModal({ token, deviceId, onClose, onConversationCreated }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const searchResults = useQuery(
    api.users.search,
    searchQuery.length >= 2 ? { query: searchQuery, token, deviceId } : 'skip'
  );

  const getOrCreateConversation = useMutation(api.conversations.getOrCreate);

  const handleSelectUser = async (userId: Id<'users'>) => {
    setIsCreating(true);
    try {
      const result = await getOrCreateConversation({ token, deviceId, otherUserId: userId });
      onConversationCreated(result._id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    setIsCreating(false);
  };

  return (
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/30 dark:bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div class="relative w-full max-w-md max-h-[80vh] flex flex-col bg-white dark:bg-dark-900 rounded-2xl overflow-hidden shadow-lg border border-dark-200 dark:border-dark-800">
        {/* Header */}
        <div class="px-6 py-4 border-b border-dark-200 dark:border-dark-800 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-dark-900 dark:text-white">New Chat</h2>
          <button
            onClick={onClose}
            class="p-2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
          >
            <div class="i-carbon-close w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div class="p-4 border-b border-dark-100 dark:border-dark-800">
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 i-carbon-search w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm placeholder-dark-400"
              placeholder="Search by name or email..."
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div class="flex-1 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div class="py-12 text-center">
              <div class="w-12 h-12 rounded-xl bg-dark-100 dark:bg-dark-800 flex-center mx-auto mb-3">
                <div class="i-carbon-search w-5 h-5 text-dark-400" />
              </div>
              <p class="text-sm text-dark-500 dark:text-dark-400">Search for users</p>
              <p class="text-xs text-dark-400 dark:text-dark-500 mt-1">Type at least 2 characters</p>
            </div>
          ) : searchResults === undefined ? (
            <div class="py-12 flex-center">
              <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div class="py-12 text-center">
              <div class="w-12 h-12 rounded-xl bg-dark-100 dark:bg-dark-800 flex-center mx-auto mb-3">
                <div class="i-carbon-user w-5 h-5 text-dark-400" />
              </div>
              <p class="text-sm text-dark-500 dark:text-dark-400">No users found</p>
            </div>
          ) : (
            <div class="p-2">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user._id)}
                  disabled={isCreating}
                  class="w-full p-3 text-left rounded-xl hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors disabled:opacity-50 flex items-center gap-3"
                >
                  <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-center text-primary-600 dark:text-primary-400 font-semibold flex-shrink-0">
                    {user.displayName[0].toUpperCase()}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-dark-900 dark:text-white truncate text-sm">
                      {user.displayName}
                    </p>
                    <p class="text-xs text-dark-500 dark:text-dark-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
