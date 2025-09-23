import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Bot, User, Loader2, X } from 'lucide-react';

const Chatbot = ({ isVisible, onClose }) => {
  const [messages, setMessages] = useState([{ from: 'bot', text: "Hello! How can I help you with our company policies today?" }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat', { body: { query: input } });
      if (error) throw error;
      setMessages(prev => [...prev, { from: 'bot', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { from: 'bot', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
      <header className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h3 className="font-bold text-lg">Company Assistant</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20} /></button>
      </header>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.from === 'user' ? 'justify-end' : ''}`}>
              {msg.from === 'bot' && <Bot className="w-6 h-6 text-orange-500 flex-shrink-0" />}
              <div className={`px-4 py-2 rounded-lg max-w-xs ${msg.from === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}><p className="text-sm break-words">{msg.text}</p></div>
              {msg.from === 'user' && <User className="w-6 h-6 text-gray-500 flex-shrink-0" />}
            </div>
          ))}
          {isLoading && (<div className="flex items-start gap-3"><Bot className="w-6 h-6 text-orange-500" /><div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700"><Loader2 className="w-5 h-5 animate-spin" /></div></div>)}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <footer className="p-4 border-t dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button type="submit" disabled={isLoading} className="p-2 bg-orange-500 text-white rounded-lg disabled:bg-orange-300"><Send size={20} /></button>
        </form>
      </footer>
    </div>
  );
};
export default Chatbot;