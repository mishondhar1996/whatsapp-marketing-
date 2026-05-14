/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send, 
  Wand2, 
  Phone, 
  MessageCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contact, MessageVariation } from './types';
import { generateMessageVariations } from './services/geminiService';

// --- Components ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal = ({ isOpen, onClose, children, title }: ModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 bangla-text">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'composer'>('contacts');
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [baseMessage, setBaseMessage] = useState('');
  const [variations, setVariations] = useState<MessageVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Persistence (Mocking Firebase for now, but telling user about it)
  useEffect(() => {
    const saved = localStorage.getItem('amar-protishruti-contacts');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('amar-protishruti-contacts', JSON.stringify(contacts));
  }, [contacts]);

  // --- Actions ---

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    
    // Simple validation for BD numbers
    let phone = newContact.phone.trim();
    if (phone.startsWith('01')) phone = '+880' + phone.substring(1);
    if (!phone.startsWith('+880')) phone = '+880' + phone;

    const contact: Contact = {
      id: crypto.randomUUID(),
      name: newContact.name,
      phone: phone,
      addedAt: Date.now(),
    };

    setContacts(prev => [...prev, contact]);
    setNewContact({ name: '', phone: '' });
    setIsAddContactOpen(false);
  };

  const deleteContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleGenerateVariations = async () => {
    if (!baseMessage) return;
    setIsGenerating(true);
    const results = await generateMessageVariations(baseMessage);
    const newVariations: MessageVariation[] = results.map(text => ({
      id: crypto.randomUUID(),
      text,
      type: 'ai'
    }));
    setVariations(newVariations);
    setIsGenerating(false);
  };

  const getWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const sendSMS = (phone: string, text: string) => {
    window.open(`sms:${phone}?body=${encodeURIComponent(text)}`);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery)
    );
  }, [contacts, searchQuery]);

  const copyAppLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('App link copied to clipboard! Share this with your team.');
  };

  return (
    <div className="min-h-screen flex text-slate-800 bg-slate-50 font-sans">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-hidden shrink-0 hidden lg:flex"
          >
            <div className="p-6 flex flex-col h-full uppercase tracking-tight">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  P
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-none text-slate-900 bangla-text">আমার প্রতিশ্রুতি</h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-semibold">Business Pro</p>
                </div>
              </div>

              <nav className="space-y-1.5 flex-1">
                <button 
                  onClick={() => setActiveTab('contacts')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === 'contacts' 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border-r-4 border-emerald-500 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-r-4 border-transparent'
                  }`}
                >
                  <Users size={20} />
                  <span className="bangla-text text-sm">কন্টাক্ট লিস্ট</span>
                </button>
                <button 
                  onClick={() => setActiveTab('composer')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === 'composer' 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border-r-4 border-emerald-500 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-r-4 border-transparent'
                  }`}
                >
                  <Send size={20} />
                  <span className="bangla-text text-sm">মেসেজ পাঠান</span>
                </button>
              </nav>

              <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 bangla-text">প্রতিদিনের টিপস:</p>
                  <p className="text-[11px] font-medium leading-relaxed bangla-text text-slate-600">হোয়াটসঅ্যাপ কলিং বা ঘন ঘন মেসেজ পাঠালে আপনার নাম্বার ব্যান হতে পারে। তাই প্রতিবার মেসেজ একটু পরিবর্তন করে পাঠান।</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-500">
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 hidden sm:block">
              {activeTab === 'contacts' ? 'Contact Management' : 'Campaign Composer'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
              <span className="text-[10px] text-slate-500 mr-2 uppercase font-bold tracking-tight px-1">Share:</span>
              <code className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">AIS-HUB/CAMPAIGN_V1</code>
              <button 
                onClick={copyAppLink}
                className="ml-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ExternalLink size={14} />
              </button>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-100 border border-emerald-500">
              AM
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/30">
          <AnimatePresence mode="wait">
            {activeTab === 'contacts' ? (
              <motion.div 
                key="contacts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="max-w-5xl mx-auto"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-1 bangla-text">আপনার কন্টাক্ট সমূহ</h3>
                    <p className="text-sm text-slate-500 font-medium">মেসেজ পাঠানোর জন্য সকল মেম্বার বা কাস্টমার এর নাম্বার এখানে যোগ করুন।</p>
                  </div>
                  <button 
                    onClick={() => setIsAddContactOpen(true)}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg shadow-emerald-200 transition-all active:scale-95 text-sm"
                  >
                    <Plus size={18} />
                    <span className="bangla-text">নতুন নম্বর যোগ করুন</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 mb-6 flex items-center transition-all focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-50">
                  <div className="p-3 text-slate-400">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="নম্বর খুঁজুন..." 
                    className="flex-1 bg-transparent border-none outline-none px-2 text-sm bangla-text text-slate-700"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Contact Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">নাম</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">মোবাইল</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">তারিখ</th>
                          <th className="px-6 py-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredContacts.length > 0 ? (
                          filteredContacts.map(contact => (
                            <tr key={contact.id} className="hover:bg-slate-50/40 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                    {contact.name.substring(0, 1)}
                                  </div>
                                  <span className="font-semibold text-slate-700 bangla-text text-sm">{contact.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <code className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded-md text-emerald-700 font-semibold border border-slate-200">{contact.phone}</code>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                {new Date(contact.addedAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => deleteContact(contact.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={24} className="text-slate-300" />
                              </div>
                              <p className="bangla-text text-slate-400 font-medium px-1">কোনো কন্টাক্ট পাওয়া যায়নি!</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="composer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8"
              >
                {/* Message Input */}
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">১. বার্তা লিখুন (বাংলা)</label>
                    <textarea 
                      className="w-full h-48 p-4 rounded-xl bg-slate-50/50 border border-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none text-base leading-relaxed bangla-text text-slate-700"
                      placeholder="এখানে আপনার বিজ্ঞাপনের টেক্সটটি লিখুন..."
                      value={baseMessage}
                      onChange={(e) => setBaseMessage(e.target.value)}
                    />
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-amber-600 font-semibold text-[11px] bg-amber-50 px-2 py-1 rounded border border-amber-100">
                        <AlertCircle size={14} />
                        <span className="bangla-text">স্প্যাম বিরোধী ভেরিয়েশন সক্রিয়</span>
                      </div>
                      <button 
                        onClick={handleGenerateVariations}
                        disabled={!baseMessage || isGenerating}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        {isGenerating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                        ) : <Wand2 size={16} />}
                        <span>AI ভ্যারিয়েশন জেনারেট করুন</span>
                      </button>
                    </div>
                  </div>

                  {/* Variation Display */}
                  <AnimatePresence>
                    {variations.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 flex items-center gap-2">
                          <Wand2 size={12} className="text-purple-500" />
                          AI Suggested Variations
                        </h4>
                        {variations.map((v, i) => (
                          <div key={v.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 group transition-all hover:border-purple-300 hover:shadow-md cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(v.text);
                                }}
                                className="p-1.5 bg-slate-100 rounded-md text-slate-400 hover:text-emerald-600"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">VERSION {i + 1}</span>
                            </div>
                            <p className="bangla-text text-slate-600 leading-relaxed text-sm pr-8">{v.text}</p>
                          </div>
                        ))}
                        <button 
                          onClick={handleGenerateVariations}
                          className="w-full py-2 bg-purple-50 text-purple-700 text-[11px] font-bold rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors uppercase tracking-widest"
                        >
                          নতুন পরামর্শ তৈরি করুন
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sending Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-230px)] sticky top-6">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <h3 className="text-base font-bold text-slate-800 bangla-text">২. মেসেজ পাঠান</h3>
                    <p className="text-xs text-slate-400 mt-1">আপনার কন্টাক্ট লিস্ট থেকে যে কাউকে মেসেজ পাঠান।</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
                    {contacts.length > 0 ? (
                      contacts.map(contact => (
                        <div key={contact.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-50">
                              {contact.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 bangla-text text-sm leading-tight">{contact.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-1 tracking-tight">{contact.phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const msg = variations.length > 0 
                                  ? variations[Math.floor(Math.random() * variations.length)].text 
                                  : baseMessage;
                                if (!msg) return;
                                window.open(getWhatsAppLink(contact.phone, msg), '_blank');
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all text-xs font-bold shadow-md shadow-emerald-100 active:scale-95"
                            >
                              <MessageCircle size={14} />
                              <span>WhatsApp</span>
                            </button>
                            <button 
                              onClick={() => {
                                const msg = variations.length > 0 
                                  ? variations[Math.floor(Math.random() * variations.length)].text 
                                  : baseMessage;
                                if (!msg) return;
                                sendSMS(contact.phone, msg);
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg transition-all text-xs font-bold border border-slate-200 active:scale-95"
                            >
                              <Phone size={14} />
                              <span>SMS</span>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20">
                        <Users size={24} className="mx-auto mb-2 text-slate-200" />
                        <p className="text-[11px] text-slate-400 font-medium tracking-tight">কন্টাক্ট লিস্টে কোনো ডাটা নেই।</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">সার্ভার সচল আছে</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium italic pr-1">
                      * হোয়াটসঅ্যাপ পলিসি অনুযায়ী মেসেজে পরিবর্তন করা হচ্ছে।
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={isAddContactOpen} 
        onClose={() => setIsAddContactOpen(false)} 
        title="নতুন কন্টাক্ট যোগ করুন"
      >
        <form onSubmit={handleAddContact} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 bangla-text">নাম</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all bangla-text text-slate-700"
              placeholder="কাস্টমার এর নাম..."
              value={newContact.name}
              onChange={(e) => setNewContact({...newContact, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 bangla-text">মোবাইল নাম্বার</label>
            <div className="relative">
              <input 
                type="tel" 
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-slate-700"
                placeholder="017xxxxxxxx"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Phone size={18} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-tight font-bold italic">BD Number Format (01...)</p>
          </div>
          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            <CheckCircle2 size={18} />
            <span className="bangla-text">কন্টাক্ট সেভ করুন</span>
          </button>
        </form>
      </Modal>
    </div>
  );
}
