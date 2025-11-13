"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, MessageSquare, Trash2, Paperclip, X, LogOut, User, History, Menu, Plus } from 'lucide-react';
import { useAuth } from './AuthContext';

const API_BASE_URL = 'http://localhost:8000';

type Source = {
  pdf_name: string;
  page: number;
  score: number;
  snippet: string;
};

type Message = {
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  sources?: Source[];
};

type QueryHistory = {
  query: string;
  answer: string;
  timestamp: string;
  sources_count: number;
};

export default function Chatbot() {
  const { user, token, logout } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [querying, setQuerying] = useState<boolean>(false);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    if (!token) return;
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 4) {
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: '⚠️ Maximum 4 PDF files allowed' 
      }]);
      return;
    }
    
    const pdfFiles = selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length !== selectedFiles.length) {
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: '⚠️ Only PDF files are supported' 
      }]);
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
    setMessages(prev => [...prev, { 
      type: 'system', 
      content: `📤 Uploading ${files.length} file(s)...` 
    }]);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: `✅ Successfully indexed ${data.indexed_files} files (${data.indexed_chunks} chunks)` 
      }]);
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!inputMessage.trim() || querying) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setQuerying(true);

    try {
      const endpoint = token ? `${API_BASE_URL}/query/auth` : `${API_BASE_URL}/query`;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: userMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Query failed');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: data.answer,
        sources: data.sources 
      }]);

      if (data.saved_to_history) {
        fetchHistory();
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${error.message}` 
      }]);
    } finally {
      setQuerying(false);
    }
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
  };

  const startNewChat = () => {
    setMessages([]);
    setFiles([]);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-gray-950 border-r border-gray-800 flex flex-col overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={startNewChat}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-400 px-3 py-2 flex items-center gap-2">
            <History className="w-4 h-4" />
            CHAT HISTORY
          </div>
          
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-500 py-8 px-4">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No history yet</p>
            </div>
          ) : (
            history.slice().reverse().map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-800 hover:bg-gray-700 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <p className="text-sm text-white font-medium line-clamp-1 mb-1">{item.query}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {item.sources_count}
                  </span>
                  <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* User Info Section */}
        {user && (
          <div className="p-4 border-t border-gray-800">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
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
      <div className="flex-1 flex flex-col bg-gray-800">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-red-500" />
              <h1 className="text-xl font-bold text-white">RAG Chatbot</h1>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400 max-w-md px-4">
                <MessageSquare className="w-20 h-20 mx-auto mb-6 text-red-500 opacity-50" />
                <h2 className="text-2xl font-bold text-white mb-3">Welcome to RAG Chatbot</h2>
                <p className="text-gray-400 mb-4">Upload PDF documents and ask questions about their content</p>
                <div className="bg-gray-900 rounded-lg p-4 text-left space-y-2 text-sm">
                  <p className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">1.</span>
                    <span>Click the paperclip icon to upload PDFs (max 4)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">2.</span>
                    <span>Wait for documents to be indexed</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">3.</span>
                    <span>Ask questions about your documents</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.type === 'user' 
                      ? 'bg-red-600 text-white' 
                      : msg.type === 'error'
                      ? 'bg-red-900 text-red-200 border border-red-700'
                      : msg.type === 'system'
                      ? 'bg-gray-700 text-gray-200 border border-gray-600'
                      : 'bg-gray-700 text-gray-100 border border-gray-600'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-600">
                        <p className="text-xs font-semibold mb-3 text-gray-300">SOURCES</p>
                        <div className="space-y-2">
                          {msg.sources.map((source, sidx) => (
                            <div key={sidx} className="bg-gray-800 rounded-lg p-3 text-xs border border-gray-600">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-3 h-3 text-red-400" />
                                <span className="font-medium text-gray-200">
                                  {source.pdf_name} - Page {source.page}
                                </span>
                                <span className="ml-auto text-red-400 font-bold">
                                  {(source.score * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-gray-400 line-clamp-2">{source.snippet}</p>
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
                  <div className="bg-gray-700 border border-gray-600 rounded-2xl px-5 py-4">
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
          <div className="bg-gray-900 border-t border-gray-700 px-4 py-3">
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
              {files.map((file, idx) => (
                <div key={idx} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-200 max-w-[200px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-gray-900 border-t border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 flex items-center gap-2 p-2">
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
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
              >
                <Paperclip className="w-5 h-5" />
              </label>
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={files.length > 0 ? "Press Enter to upload files..." : "Ask anything about your documents..."}
                className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 focus:outline-none"
                disabled={querying || uploading}
              />
              
              <button
                onClick={files.length > 0 ? handleUpload : handleQuery}
                disabled={(querying || uploading) || (files.length === 0 && !inputMessage.trim())}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white p-3 rounded-xl transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : files.length > 0 ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              {user ? `Logged in as ${user.username} • Queries are saved to history` : 'Not logged in • Queries are not saved'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}