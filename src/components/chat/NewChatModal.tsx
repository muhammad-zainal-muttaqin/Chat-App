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
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        class="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Modal */}
      <div class="relative w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-dark-900 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/20 dark:border-white/5 animate-fade-in">
        {/* Header */}
        <div class="px-8 py-6 border-b border-dark-100/50 dark:border-white/5 flex items-center justify-between glass">
          <div class="flex flex-col">
            <h2 class="text-2xl font-black text-dark-900 dark:text-white tracking-tight">New Conversation</h2>
            <p class="text-xs text-dark-400 font-bold uppercase tracking-widest mt-1">Start a secure session</p>
          </div>
          <button
            onClick={onClose}
            class="p-3 text-dark-400 hover:text-dark-900 dark:hover:text-white hover:bg-dark-100 dark:hover:bg-white/10 rounded-2xl transition-all duration-300"
          >
            <span class="i-carbon-close text-2xl" />
          </button>
        </div>

        {/* Search */}
        <div class="p-6 bg-dark-50/50 dark:bg-black/20">
          <div class="relative group">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 i-carbon-search text-dark-400 group-focus-within:text-primary-500 transition-all text-xl" />
            <input
              type="text"
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              class="w-full pl-12 pr-5 py-4 rounded-3xl border border-dark-200/50 dark:border-white/10 bg-white dark:bg-white/5 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-300 placeholder-dark-400 dark:placeholder-dark-600 shadow-premium"
              placeholder="Search by name or email..."
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div class="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6">
          {searchQuery.length < 2 ? (
            <div class="py-12 text-center text-dark-400 dark:text-dark-600 flex flex-col items-center">
              <div class="w-20 h-20 rounded-3xl bg-dark-50 dark:bg-white/5 flex-center mb-4">
                <span class="i-carbon-search text-4xl opacity-50" />
              </div>
              <p class="text-sm font-bold uppercase tracking-widest">Global Search</p>
              <p class="text-xs mt-2 px-10 leading-relaxed font-medium">Type at least 2 characters to find people in the network</p>
            </div>
          ) : searchResults === undefined ? (
            <div class="py-12 flex-center flex-col gap-4">
              <div class="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
              <span class="text-xs font-bold uppercase tracking-widest text-dark-400">Searching...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div class="py-12 text-center text-dark-400 dark:text-dark-600 flex flex-col items-center">
              <div class="w-20 h-20 rounded-3xl bg-dark-50 dark:bg-white/5 flex-center mb-4">
                <span class="i-carbon-user-avatar text-4xl opacity-50" />
              </div>
              <p class="text-sm font-bold uppercase tracking-widest">No users found</p>
              <p class="text-xs mt-2 font-medium">Try searching for a different name or email</p>
            </div>
          ) : (
            <div class="space-y-2 pt-2">
              {searchResults.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user._id)}
                  disabled={isCreating}
                  class="w-full p-4 text-left glass-card dark:bg-white/5 border-transparent hover:border-primary-500/30 hover:bg-primary-500/5 transition-all duration-300 disabled:opacity-50 group flex items-center gap-4"
                >
                  <div class="relative">
                    <div class="w-13 h-13 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
                      <span class="font-black text-xl">
                        {user.displayName[0].toUpperCase()}
                      </span>
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-dark-900 rounded-full shadow-sm" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="font-black text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                      {user.displayName}
                    </div>
                    <div class="text-xs font-bold text-dark-400 dark:text-dark-500 mt-0.5 truncate uppercase tracking-tight">
                      {user.email}
                    </div>
                  </div>

                  <div class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex-center text-primary-500 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                    <span class="i-carbon-chat text-xl" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div class="p-6 border-t border-dark-100/50 dark:border-white/5 bg-dark-50/30 dark:bg-black/40">
          <div class="flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-[0.15em]">
            <span class="i-carbon-security text-base" />
            Security active: End-to-end encrypted session
          </div>
        </div>
      </div>
    </div>
  );
}
