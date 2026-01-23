import { useState } from 'preact/hooks';
import { Id } from '../../../convex/_generated/dataModel';
import { ConversationList } from './ConversationList';
import { ChatScreen } from './ChatScreen';
import { NewChatModal } from './NewChatModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface User {
  _id: Id<'users'>;
  email: string;
  displayName: string;
  publicKey: string;
}

interface ChatLayoutProps {
  user: User;
}

export function ChatLayout({ user }: ChatLayoutProps) {
  const { logout, token } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [selectedConversationId, setSelectedConversationId] = useState<Id<'conversations'> | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectConversation = (conversationId: Id<'conversations'>) => {
    setSelectedConversationId(conversationId);
    setIsMobileMenuOpen(false);
  };

  const handleNewConversation = (conversationId: Id<'conversations'>) => {
    setSelectedConversationId(conversationId);
    setShowNewChat(false);
  };

  return (
    <div class="h-screen w-full flex overflow-hidden bg-slate-50 dark:bg-dark-950 transition-colors duration-300">

      {/* Background Decor */}
      <div class="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div class="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Mobile Menu Backdrop */}
      <div
        class={`fixed inset-0 z-40 bg-black/40 backdrop-blur-md lg:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside
        class={`
          fixed lg:relative inset-y-0 left-0 z-50 w-[280px] lg:w-[340px] 
          bg-white/70 dark:bg-dark-900/70 backdrop-blur-xl border-r border-white/20 dark:border-white/5
          flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          lg:shadow-none lg:z-auto
        `}
      >
        <div class="h-full flex flex-col p-6">

          {/* App Logo/Title */}
          <div class="flex items-center gap-3 mb-8 px-2">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex-center shadow-lg shadow-primary-500/30">
              <span class="i-carbon-chat text-white text-2xl" />
            </div>
            <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-dark-900 to-dark-600 dark:from-white dark:to-dark-300">
              Nexus
            </h1>
          </div>

          {/* User Profile */}
          <div class="p-4 mb-8 rounded-3xl glass-card flex items-center justify-between group overflow-visible relative">
            <div class="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

            <div class="flex items-center gap-3 min-w-0 flex-1 relative z-10">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/20 flex-center text-primary-600 dark:text-primary-400 flex-shrink-0 shadow-inner overflow-hidden">
                <span class="font-bold text-xl uppercase flex items-center justify-center w-full h-full">
                  {user.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div class="flex flex-col justify-center min-w-0 flex-1">
                <span class="font-bold text-dark-900 dark:text-white truncate text-sm leading-tight">
                  {user.displayName || 'User'}
                </span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  <span class="text-[11px] text-dark-500 dark:text-dark-400 font-medium uppercase tracking-wider whitespace-nowrap">
                    Online
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              class="relative z-10 p-2.5 rounded-xl text-dark-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-white/10 transition-all duration-300 active:scale-90 flex-shrink-0 self-center"
              title="Toggle Theme"
            >
              <div class={`text-xl flex items-center justify-center ${isDark ? 'i-carbon-sun' : 'i-carbon-moon'}`} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => setShowNewChat(true)}
            class="w-full btn-primary mb-8 py-4 shadow-xl shadow-primary-500/20 group"
          >
            <span class="i-carbon-add-alt text-xl group-hover:rotate-90 transition-transform duration-300" />
            <span class="font-bold tracking-tight">New Conversation</span>
          </button>

          <div class="px-2 mb-4 flex items-center justify-between">
            <h3 class="text-[11px] font-bold text-dark-400 dark:text-dark-500 uppercase tracking-[0.2em]">
              Recent Chats
            </h3>
            <span class="w-1.5 h-1.5 rounded-full bg-primary-500/50 flex-shrink-0 self-center" />
          </div>

          {/* Conversation List */}
          <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 space-y-1.5 custom-scrollbar">
            {token && (
              <ConversationList
                token={token}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            )}
          </div>

          {/* Logout Section */}
          <div class="mt-6 pt-6 border-t border-dark-200/50 dark:border-white/5 mx-2">
            <button
              onClick={logout}
              class="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-dark-500 dark:text-dark-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 group"
            >
              <span class="i-carbon-logout text-xl group-hover:-translate-x-1 transition-transform duration-300" />
              <span class="font-bold text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main class="flex-1 flex flex-col min-w-0 relative h-full">

        {/* Chat Area */}
        <div class="flex-1 h-full">
          {selectedConversationId && token ? (
            <ChatScreen
              conversationId={selectedConversationId}
              token={token}
              currentUserId={user._id}
              currentUserPublicKey={user.publicKey}
              onBack={() => setIsMobileMenuOpen(true)}
              onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          ) : (
            <div class="h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full" />

              <div class="w-24 h-24 bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-900/10 rounded-[2.5rem] flex-center mb-8 relative group">
                <div class="absolute inset-0 bg-primary-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span class="i-carbon-chat text-5xl text-primary-500 relative z-10" />
              </div>

              <h2 class="text-3xl font-bold text-dark-900 dark:text-white mb-3">
                Hello, {user.displayName.split(' ')[0]}!
              </h2>
              <p class="text-dark-500 dark:text-dark-400 max-w-sm mb-10 leading-relaxed">
                Connect and share securely with end-to-end encryption. Select a chat to start messaging.
              </p>

              <button
                onClick={() => setShowNewChat(true)}
                class="btn-primary px-8 py-4 shadow-2xl shadow-primary-500/20"
              >
                <span class="i-carbon-flash text-lg" />
                Start a New Chat
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                class="mt-6 lg:hidden btn-secondary"
              >
                View Conversations
              </button>
            </div>
          )}
        </div>
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
