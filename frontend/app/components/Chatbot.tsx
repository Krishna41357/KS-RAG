"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, MessageSquare, Trash2, Paperclip, X, LogOut, User, History, Menu, Plus, Moon, Sun } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type Source = {
  title: string;
  content: string;
  url?: string;
  score?: number;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp?: string;
};

type Chat = {
  id: string;
  title: string;
  message_count: number;
  last_message?: string;
  created_at: string;
  updated_at: string;
};

// Mock auth context for demo
const useAuth = () => ({
  user: { username: 'Demo User', email: 'demo@example.com' },
  token: 'demo-token',
  logout: () => console.log('Logout clicked')
});

export default function Chatbot() {
  const { user, token, logout } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [querying, setQuerying] = useState<boolean>(false);
  const [chats, setChats] = useState<Chat[]>([
    { id: '1', title: 'Machine Learning Basics', message_count: 12, created_at: '2024-01-15', updated_at: '2024-01-15' },
    { id: '2', title: 'Python Documentation', message_count: 8, created_at: '2024-01-14', updated_at: '2024-01-14' },
    { id: '3', title: 'Research Papers Analysis', message_count: 25, created_at: '2024-01-13', updated_at: '2024-01-13' }
  ]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [systemMessage, setSystemMessage] = useState<string>('');
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth < 768 && sidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const menuButton = document.getElementById('menu-button');
        if (sidebar && !sidebar.contains(e.target as Node) && !menuButton?.contains(e.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  const showSystemMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSystemMessage(msg);
    setTimeout(() => setSystemMessage(''), 5000);
  };

  const createNewChat = async () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([]);
    showSystemMessage('New chat created!', 'success');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const loadChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    setMessages([]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
    showSystemMessage('Chat deleted', 'success');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 4) {
      showSystemMessage('Maximum 4 PDF files allowed', 'error');
      return;
    }
    
    const pdfFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length !== selectedFiles.length) {
      showSystemMessage('Only PDF files are supported', 'error');
      return;
    }
    
    setFiles(pdfFiles);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    showSystemMessage(`Uploading ${files.length} file(s)...`, 'info');
    
    setTimeout(() => {
      showSystemMessage(`Successfully indexed ${files.length} files`, 'success');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
    }, 2000);
  };

  const handleQuery = async () => {
    if (!inputMessage.trim() || querying) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuerying(true);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'This is a demo response. In production, this would query your RAG backend and return relevant information from your documents.',
          sources: [
            { title: 'Document 1.pdf', content: 'Sample content from your uploaded document...', score: 0.92 },
            { title: 'Document 2.pdf', content: 'Another relevant excerpt from your knowledge base...', score: 0.87 }
          ]
        }
      ]);
      setQuerying(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (files.length > 0) {
        handleUpload();
      } else {
        handleQuery();
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const bgPrimary = darkMode ? 'bg-gray-900' : 'bg-white';
  const bgSecondary = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const bgTertiary = darkMode ? 'bg-gray-800' : 'bg-gray-100';
  const bgQuaternary = darkMode ? 'bg-gray-700' : 'bg-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const textTertiary = darkMode ? 'text-gray-300' : 'text-gray-700';
  const border = darkMode ? 'border-gray-800' : 'border-gray-200';
  const borderLight = darkMode ? 'border-gray-700' : 'border-gray-300';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200';

  return (
    <div className={`flex h-screen ${bgPrimary}`}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div 
        id="sidebar"
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-30 w-72 transition-transform duration-300 ${bgSecondary} border-r ${border} flex flex-col h-full`}
      >
        {/* Sidebar Header */}
        <div className={`p-4 border-b ${border}`}>
          <button
            onClick={createNewChat}
            disabled={!token}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:text-gray-300 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className={`text-xs font-semibold ${textSecondary} px-3 py-2 flex items-center gap-2`}>
            <History className="w-4 h-4" />
            YOUR CHATS
          </div>
          
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-6 h-6 animate-spin ${textSecondary}`} />
            </div>
          ) : chats.length === 0 ? (
            <div className={`text-center ${textSecondary} py-8 px-4`}>
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No chats yet</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`${
                  currentChatId === chat.id 
                    ? 'bg-red-900 border-red-700' 
                    : `${bgTertiary} ${hoverBg}`
                } rounded-lg p-3 cursor-pointer transition-colors border ${borderLight} group relative`}
              >
                <p className={`text-sm ${textPrimary} font-medium line-clamp-1 mb-1 pr-8`}>{chat.title}</p>
                <div className={`flex items-center justify-between text-xs ${textSecondary}`}>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {chat.message_count} messages
                  </span>
                  <span>{new Date(chat.updated_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Info Section */}
        {user && (
          <div className={`p-4 border-t ${border}`}>
            <div className={`${bgTertiary} rounded-lg p-3`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${textPrimary} truncate`}>{user.username}</p>
                  <p className={`text-xs ${textSecondary} truncate`}>{user.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${bgTertiary} min-w-0`}>
        {/* Top Bar */}
        <div className={`${bgPrimary} border-b ${border} p-3 md:p-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              id="menu-button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`${textSecondary} ${hoverBg} p-2 rounded-lg transition-colors flex-shrink-0`}
            >
              <Menu className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-red-500 flex-shrink-0" />
              <h1 className={`text-base md:text-xl font-bold ${textPrimary} truncate`}>
                {currentChatId && chats.find(c => c.id === currentChatId)?.title || 'RAG Chatbot'}
              </h1>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className={`${textSecondary} hover:${textPrimary} transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0`}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* System Message Toast */}
        {systemMessage && (
          <div className={`${bgPrimary} border-b ${border} px-4 py-2`}>
            <div className="max-w-4xl mx-auto">
              <p className={`text-xs md:text-sm ${textTertiary}`}>{systemMessage}</p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className={`text-center ${textSecondary} max-w-md`}>
                <MessageSquare className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 text-red-500 opacity-50" />
                <h2 className={`text-xl md:text-2xl font-bold ${textPrimary} mb-2 md:mb-3`}>Welcome to RAG Chatbot</h2>
                <p className={`${textSecondary} mb-3 md:mb-4 text-sm md:text-base`}>Upload PDF documents and ask questions about their content</p>
                <div className={`${bgPrimary} rounded-lg p-3 md:p-4 text-left space-y-2 text-xs md:text-sm`}>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">1.</span>
                    <span>Click the paperclip icon to upload PDFs (max 4)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">2.</span>
                    <span>Wait for documents to be indexed</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500 font-bold flex-shrink-0">3.</span>
                    <span>Ask questions about your documents</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-4 md:px-5 py-3 md:py-4 ${
                    msg.role === 'user' 
                      ? 'bg-red-600 text-white' 
                      : `${bgQuaternary} ${textPrimary} border ${borderLight}`
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.content}</p>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className={`mt-3 md:mt-4 pt-3 md:pt-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <p className={`text-xs font-semibold mb-2 md:mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>SOURCES</p>
                        <div className="space-y-2">
                          {msg.sources.map((source, sidx) => (
                            <div key={sidx} className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-lg p-2 md:p-3 text-xs border`}>
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-3 h-3 text-red-400 flex-shrink-0" />
                                <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'} truncate flex-1`}>
                                  {source.title}
                                </span>
                                {source.score && (
                                  <span className="text-red-400 font-bold flex-shrink-0">
                                    {(source.score * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>{source.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {querying && (
                <div className="flex justify-start">
                  <div className={`${bgQuaternary} border ${borderLight} rounded-2xl px-5 py-4`}>
                    <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* File Attachments Preview */}
        {files.length > 0 && (
          <div className={`${bgPrimary} border-t ${border} px-3 md:px-4 py-2 md:py-3`}>
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
              {files.map((file, idx) => (
                <div key={idx} className={`${bgTertiary} border ${borderLight} rounded-lg px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-2`}>
                  <FileText className="w-3 h-3 md:w-4 md:h-4 text-red-400 flex-shrink-0" />
                  <span className={`text-xs md:text-sm ${textPrimary} max-w-[120px] md:max-w-[200px] truncate`}>{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`${bgPrimary} border-t ${border} p-3 md:p-4`}>
          <div className="max-w-4xl mx-auto">
            <div className={`${bgTertiary} rounded-xl md:rounded-2xl border ${borderLight} flex items-center gap-1 md:gap-2 p-1.5 md:p-2`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-attach"
              />
              <label
                htmlFor="file-attach"
                className={`${bgQuaternary} ${hoverBg} ${textTertiary} p-2 md:p-3 rounded-lg md:rounded-xl transition-colors cursor-pointer flex items-center justify-center flex-shrink-0`}
              >
                <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
              </label>
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={files.length > 0 ? "Press Enter to upload..." : "Ask anything..."}
                className={`flex-1 bg-transparent ${textPrimary} placeholder-${darkMode ? 'gray-500' : 'gray-400'} px-2 md:px-4 py-2 md:py-3 focus:outline-none text-sm md:text-base min-w-0`}
                disabled={querying || uploading}
              />
              
              <button
                onClick={files.length > 0 ? handleUpload : handleQuery}
                disabled={(querying || uploading) || (files.length === 0 && !inputMessage.trim())}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:text-gray-300 text-white p-2 md:p-3 rounded-lg md:rounded-xl transition-colors flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : files.length > 0 ? (
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>
            <p className={`text-xs ${textSecondary} text-center mt-2`}>
              {user 
                ? `Logged in as ${user.username} • Chat history is saved` 
                : 'Not logged in • Messages are not saved'}
            </p>
          </div>
        </div>
      </div>

      {/* Dark/Light Mode Toggle - Bottom Right */}
      <button
        onClick={toggleDarkMode}
        className={`fixed bottom-6 right-6 ${bgTertiary} ${hoverBg} ${textPrimary} p-3 md:p-4 rounded-full shadow-lg border ${borderLight} transition-all hover:scale-110 z-50`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <Sun className="w-5 h-5 md:w-6 md:h-6" />
        ) : (
          <Moon className="w-5 h-5 md:w-6 md:h-6" />
        )}
      </button>
    </div>
  );
}