import { useState } from 'preact/hooks';
import { Id } from '../../../convex/_generated/dataModel';
import { ConversationList } from './ConversationList';
import { ChatScreen } from './ChatScreen';
import { NewChatModal } from './NewChatModal';
import { useAuth } from '../../contexts/AuthContext';

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
    <div class="h-screen flex bg-dark-50">
      {/* Sidebar */}
      <div
        class={`
          fixed inset-y-0 left-0 z-30 w-80 bg-white border-r border-dark-200
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div class="h-full flex flex-col">
          {/* Header */}
          <div class="p-4 border-b border-dark-200">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span class="text-primary-600 font-medium">
                    {user.displayName[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <div class="font-medium text-dark-900">{user.displayName}</div>
                  <div class="text-xs text-dark-500">{user.email}</div>
                </div>
              </div>
              <button
                onClick={logout}
                class="p-2 text-dark-400 hover:text-dark-600 hover:bg-dark-100 rounded-lg"
                title="Logout"
              >
                <span class="i-carbon-logout text-xl" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div class="p-4">
            <button
              onClick={() => setShowNewChat(true)}
              class="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span class="i-carbon-add text-lg" />
              New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div class="flex-1 overflow-y-auto">
            {token && (
              <ConversationList
                token={token}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          class="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div class="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div class="lg:hidden p-4 border-b border-dark-200 bg-white">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            class="p-2 text-dark-600 hover:bg-dark-100 rounded-lg"
          >
            <span class="i-carbon-menu text-xl" />
          </button>
        </div>

        {/* Chat Screen or Empty State */}
        {selectedConversationId && token ? (
          <ChatScreen
            conversationId={selectedConversationId}
            token={token}
            currentUserId={user._id}
            currentUserPublicKey={user.publicKey}
          />
        ) : (
          <div class="flex-1 flex items-center justify-center text-dark-400">
            <div class="text-center">
              <span class="i-carbon-chat text-6xl mb-4 block opacity-50" />
              <p>Select a conversation or start a new chat</p>
            </div>
          </div>
        )}
      </div>

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
