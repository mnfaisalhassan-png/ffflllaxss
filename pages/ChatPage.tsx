import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '../types';
import { storageService } from '../services/storage';
import { Button } from '../components/ui/Button';
import { Send, MessageSquare, RefreshCw, AlertTriangle, Terminal, Database } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

interface ChatPageProps {
  currentUser: User;
}

export const ChatPage: React.FC<ChatPageProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [dbError, setDbError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const data = await storageService.getMessages(50);
      setMessages(data);
      setDbError(false);
    } catch (error: any) {
      console.error("Failed to fetch messages", error);
      if (error.code === '42P01' || (error.message && error.message.includes('relation "messages" does not exist'))) {
        setDbError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for messages every 3 seconds, but only if no DB error
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
        if (!dbError) fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [dbError]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      await storageService.sendMessage(currentUser.id, currentUser.fullName, newMessage.trim());
      setNewMessage('');
      await fetchMessages(); // Immediate refresh
    } catch (error: any) {
      console.error("Failed to send message", error);
      if (error.code === '42P01' || (error.message && error.message.includes('relation "messages" does not exist'))) {
        setDbError(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Format timestamp logic
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (dbError) {
      return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto p-4 items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-md border border-red-200 max-w-2xl w-full text-center">
                <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Database className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat System Unavailable</h2>
                <p className="text-gray-600 mb-6">
                    The messaging system has not been initialized in the database. 
                    Please run the following command in your Supabase SQL Editor.
                </p>
                
                <div className="bg-gray-800 rounded-md p-4 w-full relative group text-left mb-6">
                    <div className="absolute top-2 right-2 text-xs text-gray-400 flex items-center">
                        <Terminal className="w-3 h-3 mr-1" /> SQL
                    </div>
                    <code className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
{`CREATE TABLE IF NOT EXISTS messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  user_name text not null,
  content text not null,
  created_at timestamptz default now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Messages" ON messages FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                </div>
                
                <Button onClick={() => fetchMessages()}>
                    I've ran the SQL, Retry Connection
                </Button>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-t-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <MessageSquare className="h-5 w-5 text-primary-600" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900">Community Chat</h1>
                <p className="text-xs text-green-600 flex items-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    Live Discussion
                </p>
            </div>
        </div>
        <button 
            onClick={() => fetchMessages()} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            title="Refresh"
        >
            <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-gray-50 border-x border-gray-200 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-400">Loading messages...</p>
            </div>
        ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center p-8 opacity-60">
                <MessageSquare className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium">No messages yet.</p>
                <p className="text-sm text-gray-400">Be the first to say hello!</p>
            </div>
        ) : (
            <>
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.userId === currentUser.id;
                    const showDate = index === 0 || 
                        new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
                        
                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-4">
                                    <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full">
                                        {formatDate(msg.createdAt)}
                                    </span>
                                </div>
                            )}
                            <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                {!isCurrentUser && (
                                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 mr-2 flex-shrink-0 mt-1">
                                        {msg.userName.charAt(0)}
                                    </div>
                                )}
                                <div className={`max-w-[75%] sm:max-w-[60%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                    <div className={`
                                        px-4 py-2 rounded-2xl shadow-sm text-sm relative
                                        ${isCurrentUser 
                                            ? 'bg-primary-600 text-white rounded-br-none' 
                                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                                        }
                                    `}>
                                        {!isCurrentUser && (
                                            <p className="text-xs font-bold text-primary-600 mb-1 opacity-80">
                                                {msg.userName}
                                            </p>
                                        )}
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 px-1">
                                        {formatTime(msg.createdAt)}
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border border-gray-200 rounded-b-xl p-4 shadow-sm">
        <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 block w-full rounded-lg border-gray-300 bg-gray-50 border focus:border-primary-500 focus:bg-white focus:ring-0 px-4 py-3 text-sm transition-colors"
                disabled={isSending}
            />
            <Button 
                type="submit" 
                disabled={!newMessage.trim() || isSending}
                className={`rounded-lg px-4 ${!newMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Send className="h-5 w-5" />
            </Button>
        </form>
      </div>
    </div>
  );
};