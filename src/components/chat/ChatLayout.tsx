import { useState, useEffect } from 'preact/hooks';
import { Id } from '../../../convex/_generated/dataModel';
import { ConversationList } from './ConversationList';
import { ChatScreen } from './ChatScreen';
import { NewChatModal } from './NewChatModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { clearKeyPair } from '../../lib/crypto';

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
  const { logout, token, deviceId, keyPair } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'> | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // SECURITY: Detect key mismatch and force re-login
  useEffect(() => {
    if (user && keyPair && user.publicKey !== keyPair.publicKey && token) {
      console.error('KEY MISMATCH DETECTED - forcing re-login for security', {
        serverKey: user.publicKey.substring(0, 20) + '...',
        localKey: keyPair.publicKey.substring(0, 20) + '...',
      });
      clearKeyPair();
      logout();
    }
  }, [user?.publicKey, keyPair?.publicKey, token, logout]);

  const handleSelectConversation = (conversationId: Id<'conversations'>) => {
    setSelectedConversationId(conversationId);
    setIsMobileMenuOpen(false);
  };

  const handleNewConversation = (conversationId: Id<'conversations'>) => {
    setSelectedConversationId(conversationId);
    setShowNewChat(false);
  };

  return (
    <div class="h-screen w-full flex overflow-hidden app-shell-bg">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          class="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        class={`
          fixed lg:relative inset-y-0 left-0 z-50 w-72 lg:w-80
          bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl
          border-r border-dark-200/60 dark:border-dark-800/60
          flex flex-col transition-transform duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div class="h-[60px] px-4 flex items-center justify-between border-b border-dark-100 dark:border-dark-800/60">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary-600 flex-center">
              <div class="i-carbon-chat text-white w-4 h-4" />
            </div>
            <span class="brand-title font-bold text-dark-900 dark:text-white text-[15px]">Priva Chat</span>
            <span class="text-[9px] font-medium bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-md">v1.1</span>
          </div>
          <button
            onClick={toggleTheme}
            class="w-8 h-8 rounded-lg text-dark-400 hover:text-dark-600 dark:text-dark-500 dark:hover:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors flex-center"
          >
            <div class={`w-4 h-4 ${isDark ? 'i-carbon-sun' : 'i-carbon-moon'}`} />
          </button>
        </div>

        {/* User Info */}
        <div class="px-4 py-3 border-b border-dark-100/60 dark:border-dark-800/40">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex-center text-primary-700 dark:text-primary-400 font-semibold text-sm">
              {user.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-dark-900 dark:text-white truncate text-sm leading-tight">
                {user.displayName || 'User'}
              </p>
              <p class="text-xs text-dark-500 dark:text-dark-400 flex items-center gap-1.5 mt-0.5">
                <span class={`w-1.5 h-1.5 rounded-full ${isUserOnline(user as any) ? 'bg-emerald-500' : 'bg-dark-300 dark:bg-dark-600'}`} />
                {isUserOnline(user as any) ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        {/* New Chat Button */}
        <div class="px-4 py-3">
          <button
            onClick={() => setShowNewChat(true)}
            class="w-full btn-primary py-2.5 text-[13px]"
          >
            <div class="i-carbon-add w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div class="flex-1 overflow-y-auto px-2">
          {token && deviceId && (
            <ConversationList
              token={token}
              deviceId={deviceId}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              currentUserId={user._id}
            />
          )}
        </div>

        {/* Logout */}
        <div class="px-4 py-3 border-t border-dark-100/60 dark:border-dark-800/40">
          <button
            onClick={logout}
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-dark-500 dark:text-dark-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-[13px]"
          >
            <div class="i-carbon-logout w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main class="flex-1 flex flex-col min-w-0 h-full bg-transparent">
        {selectedConversationId && token && deviceId ? (
          <ChatScreen
            conversationId={selectedConversationId}
            token={token}
            deviceId={deviceId}
            currentUserId={user._id}
            currentUserPublicKey={keyPair?.publicKey || user.publicKey}
            onBack={() => setSelectedConversationId(null)}
            onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        ) : (
          <div class="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div class="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/20 flex-center mb-5">
              <div class="i-carbon-chat w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 class="brand-title text-lg font-bold text-dark-900 dark:text-white mb-1.5">
              Welcome back, {user.displayName.split(' ')[0]}
            </h2>
            <p class="text-dark-400 dark:text-dark-500 max-w-xs mb-6 text-sm">
              Select a conversation or start a new chat
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              class="btn-primary"
            >
              <div class="i-carbon-add w-4 h-4" />
              Start Chatting
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              class="mt-3 lg:hidden btn-ghost text-xs"
            >
              View Chats
            </button>
          </div>
        )}
      </main>

      {/* New Chat Modal */}
      {showNewChat && token && deviceId && (
        <NewChatModal
          token={token}
          deviceId={deviceId}
          onClose={() => setShowNewChat(false)}
          onConversationCreated={handleNewConversation}
        />
      )}
    </div>
  );
}
