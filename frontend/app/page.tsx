"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, MessageSquare, Trash2, Paperclip, X } from 'lucide-react';

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

export default function RAGChatbot() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [querying, setQuerying] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    // useKeyPress on input: Enter sends unless shift is held
    if ((e as any).key === 'Enter' && !(e as any).shiftKey) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <MessageSquare className="w-10 h-10 text-red-600" />
            RAG Chatbot
          </h1>
          <p className="text-gray-600">Upload PDFs and ask questions about their content</p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[700px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              Chat
            </h2>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30 text-red-600" />
                  <p className="text-lg mb-2 text-gray-700">Welcome! Start a conversation</p>
                  <p className="text-sm">Attach PDFs using the paperclip icon below, then ask questions</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.type === 'user' 
                      ? 'bg-red-600 text-white' 
                      : msg.type === 'error'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : msg.type === 'system'
                      ? 'bg-gray-200 text-gray-800 border border-gray-300'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium mb-2 text-gray-600">Sources:</p>
                        <div className="space-y-2">
                          {msg.sources.map((source, sidx) => (
                            <div key={sidx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-200">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-3 h-3 text-red-600" />
                                <span className="font-medium text-gray-700">
                                  {source.pdf_name} - Page {source.page}
                                </span>
                                <span className="ml-auto text-red-600 font-semibold">
                                  {(source.score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-gray-600 line-clamp-2">{source.snippet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {querying && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* File Attachments Preview */}
          {files.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-red-50">
              <div className="flex flex-wrap gap-2">
                {files.map((file, idx) => (
                  <div key={idx} className="bg-red-100 border border-red-300 rounded-lg px-3 py-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-gray-900 max-w-[200px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
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
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center border border-gray-300"
              >
                <Paperclip className="w-5 h-5" />
              </label>
              
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={files.length > 0 ? "Press Enter to upload files..." : "Ask a question about your documents..."}
                className="flex-1 bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={querying || uploading}
              />
              
              <button
                onClick={files.length > 0 ? handleUpload : handleQuery}
                disabled={(querying || uploading) || (files.length === 0 && !inputMessage.trim())}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 rounded-xl transition-colors flex items-center gap-2 font-medium"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading
                  </>
                ) : files.length > 0 ? (
                  <>
                    <FileText className="w-5 h-5" />
                    Upload
                  </>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}