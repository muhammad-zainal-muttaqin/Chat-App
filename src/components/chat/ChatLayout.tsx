import { useState, useEffect } from 'preact/hooks';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { ConversationList } from './ConversationList';
import { ChatScreen } from './ChatScreen';
import { NewChatModal } from './NewChatModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

import { isUserOnline } from '../../lib/presence';

interface User {
  _id: Id<'users'>;
  email: string;
  displayName: string;
  publicKey: string;
  lastSeenAt?: number | null;
  isOnline?: boolean | null;
}

interface ChatLayoutProps {
  user: User;
}

export function ChatLayout({ user }: ChatLayoutProps) {
  const { logout, token, keyPair } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'> | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const updatePublicKey = useMutation(api.users.updatePublicKey);

  // Sync public key if local key differs from server key (e.g. after clearing storage)
  useEffect(() => {
    if (user && keyPair && user.publicKey !== keyPair.publicKey && token) {
      console.log('Syncing public key to server...', { server: user.publicKey, local: keyPair.publicKey });
      updatePublicKey({ token, publicKey: keyPair.publicKey })
        .then(() => console.log('Public key synced successfully'))
        .catch(err => console.error('Failed to sync public key:', err));
    }
  }, [user?.publicKey, keyPair?.publicKey, token, updatePublicKey]);

  const handleSelectConversation = (conversationId: Id<'conversations'>) => {
    setSelectedConversationId(conversationId);
    setIsMobileMenuOpen(false);
  };

  const handleNewConversation = (conversationId: Id<'conversations'>) => {
    setSelectedConversationId(conversationId);
    setShowNewChat(false);
  };

  return (
    <div class="h-screen w-full flex overflow-hidden bg-dark-100 dark:bg-dark-950">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          class="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        class={`
          fixed lg:relative inset-y-0 left-0 z-50 w-72 lg:w-80
          bg-white dark:bg-dark-900
          flex flex-col transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header - 64px to match chat header */}
        <div class="h-16 px-4 flex items-center justify-between border-b border-dark-200 dark:border-dark-800">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-primary-500 flex-center">
              <div class="i-carbon-chat text-white w-5 h-5" />
            </div>
            <span class="font-semibold text-dark-900 dark:text-white">Priva Chat</span>
            <span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">v1.1</span>
          </div>
          <button
            onClick={toggleTheme}
            class="p-2 rounded-lg text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
          >
            <div class={`w-5 h-5 ${isDark ? 'i-carbon-sun' : 'i-carbon-moon'}`} />
          </button>
        </div>

        {/* User Info */}
        <div class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-center text-primary-600 dark:text-primary-400 font-semibold">
              {user.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-dark-900 dark:text-white truncate text-sm">
                {user.displayName || 'User'}
              </p>
              <p class="text-xs text-dark-500 dark:text-dark-400 flex items-center gap-1.5">
                <span class={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-dark-400'}`} />
                {user.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div class="p-4">
          <button
            onClick={() => setShowNewChat(true)}
            class="w-full btn-primary py-3"
          >
            <div class="i-carbon-add w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div class="flex-1 overflow-y-auto px-2">
          {token && (
            <ConversationList
              token={token}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              currentUserId={user._id}
            />
          )}
        </div>

        {/* Logout */}
        <div class="p-4">
          <button
            onClick={logout}
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-dark-600 dark:text-dark-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
          >
            <div class="i-carbon-logout w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Divider between sidebar and main */}
      <div class="hidden lg:block w-px bg-dark-200 dark:bg-dark-800" />

      {/* Main Content */}
      <main class="flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-dark-900">
        {selectedConversationId && token ? (
          <ChatScreen
            conversationId={selectedConversationId}
            token={token}
            currentUserId={user._id}
            currentUserPublicKey={keyPair?.publicKey || user.publicKey}
            onBack={() => setSelectedConversationId(null)}
            onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        ) : (
          <div class="h-full flex flex-col items-center justify-center p-8 text-center">
            <div class="w-16 h-16 rounded-2xl bg-dark-100 dark:bg-dark-800 flex-center mb-6">
              <div class="i-carbon-chat w-8 h-8 text-dark-400 dark:text-dark-500" />
            </div>
            <h2 class="text-xl font-semibold text-dark-900 dark:text-white mb-2">
              Welcome back, {user.displayName.split(' ')[0]}
            </h2>
            <p class="text-dark-500 dark:text-dark-400 max-w-sm mb-8 text-sm">
              Select a conversation or start a new chat
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              class="btn-primary"
            >
              <div class="i-carbon-add w-5 h-5" />
              Start Chatting
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              class="mt-4 lg:hidden btn-secondary"
            >
              View Chats
            </button>
          </div>
        )}
      </main>

      {/* New Chat Modal */}
      {showNewChat && token && (
        <NewChatModal
          token={token}
          onClose={() => setShowNewChat(false)}
          onConversationCreated={handleNewConversation}
        />
      )}
    </div>
  );
}
