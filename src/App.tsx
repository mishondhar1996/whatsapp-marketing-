/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Plus, 
  Upload,
  FileText,
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
import * as XLSX from 'xlsx';
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
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [bulkInput, setBulkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [baseMessage, setBaseMessage] = useState('');
  const [variations, setVariations] = useState<MessageVariation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Normalization Helper ---
  const normalizePhoneNumber = (phone: string): string | null => {
    let digits = phone.replace(/\D/g, '');
    
    if (digits.length === 11 && digits.startsWith('01')) {
      return '+88' + digits;
    }
    
    if (digits.length === 10 && digits.startsWith('1')) {
      return '+880' + digits;
    }

    if (digits.length === 13 && digits.startsWith('8801')) {
      return '+' + digits;
    }

    if (digits.length >= 10 && digits.length <= 15) {
      return '+' + digits;
    }

    return null; 
  };

  const handleBulkUpload = (e: React.FormEvent) => {
    e.preventDefault();
    processTextLines(bulkInput);
    setBulkInput('');
    setIsBulkUploadOpen(false);
  };

  const processTextLines = (text: string) => {
    const lines = text.split('\n');
    const newContacts: Contact[] = [];

    lines.forEach(line => {
      const parts = line.split(/[,|\t;]/);
      let name = parts[0]?.trim();
      let phone = parts[1]?.trim();

      if (!phone && name && /^\d+$/.test(name.replace(/\D/g, ''))) {
        phone = name;
        name = '';
      }

      const normalized = phone ? normalizePhoneNumber(phone) : (name ? normalizePhoneNumber(name) : null);
      
      if (normalized) {
        newContacts.push({
          id: crypto.randomUUID(),
          name: (name && name !== phone) ? name : `Customer ${normalized.slice(-4)}`,
          phone: normalized,
          addedAt: Date.now(),
        });
      }
    });

    if (newContacts.length > 0) {
      setContacts(prev => [...prev, ...newContacts]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.vcf')) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const vcfContacts: Contact[] = [];
        const entries = text.split('BEGIN:VCARD');
        
        entries.forEach(entry => {
          const nameMatch = entry.match(/FN:(.*)/i);
          const phoneMatch = entry.match(/TEL(?:.*):(.*)/i);
          
          if (phoneMatch) {
            const name = nameMatch?.[1]?.trim() || '';
            const phone = phoneMatch[1]?.trim() || '';
            const normalized = normalizePhoneNumber(phone);
            
            if (normalized) {
              vcfContacts.push({
                id: crypto.randomUUID(),
                name: name || `Contact ${normalized.slice(-4)}`,
                phone: normalized,
                addedAt: Date.now(),
              });
            }
          }
        });
        
        if (vcfContacts.length > 0) {
          setContacts(prev => [...prev, ...vcfContacts]);
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const excelContacts: Contact[] = [];
        json.forEach((row) => {
          if (!row || row.length === 0) return;
          
          let name = String(row[0] || '').trim();
          let phone = String(row[1] || row[0] || '').trim();
          
          let normalized = normalizePhoneNumber(phone);
          if (!normalized && row[0]) {
             normalized = normalizePhoneNumber(String(row[0]));
             if (normalized) name = '';
          }

          if (normalized) {
            excelContacts.push({
              id: crypto.randomUUID(),
              name: (name && name !== phone) ? name : `Customer ${normalized.slice(-4)}`,
              phone: normalized,
              addedAt: Date.now(),
            });
          }
        });

        if (excelContacts.length > 0) {
          setContacts(prev => [...prev, ...excelContacts]);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    setIsBulkUploadOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('lucky-gold-contacts-v1');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('lucky-gold-contacts-v1', JSON.stringify(contacts));
  }, [contacts]);

  // --- Actions ---

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    
    const normalized = normalizePhoneNumber(newContact.phone);
    if (!normalized) {
      alert('Invalid phone number format');
      return;
    }

    const contact: Contact = {
      id: crypto.randomUUID(),
      name: newContact.name,
      phone: normalized,
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

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery)
    );
  }, [contacts, searchQuery]);

  const copyAppLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('App link copied to clipboard!');
  };

  return (
    <div className="min-h-screen flex text-slate-800 bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-hidden shrink-0 hidden lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
          >
            <div className="p-8 flex flex-col h-full">
              {/* Branding */}
              <div className="flex items-center gap-4 mb-12 group cursor-pointer">
                <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-amber-200 group-hover:scale-105 transition-transform duration-300">
                  LG
                </div>
                <div>
                  <h1 className="font-black text-xl leading-none text-slate-900 bangla-text tracking-tight">লাকী গোল্ড</h1>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1.5 font-bold">লাকী প্লাজা, আগ্রাবাদ</p>
                </div>
              </div>

              <nav className="space-y-2 flex-1">
                <button 
                  onClick={() => setActiveTab('contacts')}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${
                    activeTab === 'contacts' 
                    ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200 translate-x-2' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Users size={20} className={activeTab === 'contacts' ? 'text-white' : 'text-slate-400'} />
                  <span className="bangla-text text-[15px]">কন্টাক্ট লিস্ট</span>
                </button>
                <button 
                  onClick={() => setActiveTab('composer')}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 ${
                    activeTab === 'composer' 
                    ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200 translate-x-2' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Send size={20} className={activeTab === 'composer' ? 'text-white' : 'text-slate-400'} />
                  <span className="bangla-text text-[15px]">মেসেজ পাঠান</span>
                </button>
              </nav>

              <div className="mt-auto">
                <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-slate-200">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 bangla-text">প্রো টিপস:</p>
                  <p className="text-[12px] font-medium leading-relaxed bangla-text text-slate-300">
                    এন্টি-স্প্যাম পলিসি মানতে প্রতিবার মেসেজের শেষে একটি নতুন ইমোজি বা ছোট একটি বাক্য যোগ করুন।
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-500 active:scale-90"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 rounded-full bg-amber-400"></div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 hidden sm:block">
                {activeTab === 'contacts' ? 'Database Management' : 'Exclusive Campaign Builder'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-3"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Server:</span>
              <code className="text-[10px] font-mono text-emerald-700 ml-2 font-bold">LuckyGold-V1</code>
            </div>
            <button 
              onClick={copyAppLink}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-50 transition-all active:scale-90 group"
            >
              <ExternalLink size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </header>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'contacts' ? (
              <motion.div 
                key="contacts"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="h-full flex flex-col p-8 lg:p-12 max-w-[1700px] mx-auto overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(240,253,244,0.5),transparent)]"
              >
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 shrink-0">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 mb-2">
                      <Users size={12} className="text-amber-600" />
                      <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">CRM Directory</span>
                    </div>
                    <h3 className="text-4xl font-black text-slate-900 bangla-text tracking-tight">কাস্টমার ডাটাবেস</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-xl">আপনার সকল বিশ্বস্ত কাস্টমারদের তালিকা এখানে ডিজিটাল আকারে সংরক্ষণ করুন এবং অফার পাঠান।</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsBulkUploadOpen(true)}
                      className="flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-2xl font-bold font-sans shadow-sm transition-all active:scale-95 text-xs uppercase tracking-[0.2em] border-b-4 active:border-b-0 active:translate-y-1"
                    >
                      <Upload size={18} />
                      <span className="bangla-text">বাল্ক আপলোড</span>
                    </button>
                    <button 
                      onClick={() => setIsAddContactOpen(true)}
                      className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold font-sans shadow-xl shadow-emerald-200 transition-all active:scale-95 text-xs uppercase tracking-[0.2em] border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                    >
                      <Plus size={18} />
                      <span className="bangla-text">নতুন কন্টাক্ট</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col bg-white rounded-3xl shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-wrap items-center gap-6 shrink-0">
                    <div className="flex-1 relative min-w-[300px]">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="নাম বা মোবাইল নাম্বার দিয়ে খুঁজুন..." 
                        className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl text-sm border border-slate-200 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-300 transition-all bangla-text shadow-inner"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-8 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total</span>
                        <span className="text-xl font-black text-slate-900 leading-none">{contacts.length}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-100"></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Today</span>
                        <span className="text-xl font-black text-emerald-600 leading-none">
                          {contacts.filter(c => new Date(c.addedAt).toDateString() === new Date().toDateString()).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar p-2">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <th className="px-8 py-4">Profile</th>
                          <th className="px-8 py-4">Customer Name</th>
                          <th className="px-8 py-4">Mobile Number</th>
                          <th className="px-8 py-4">Date Added</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContacts.length > 0 ? (
                          filteredContacts.map(contact => (
                            <tr key={contact.id} className="bg-white hover:bg-slate-50 transition-all duration-300 group rounded-2xl">
                              <td className="px-8 py-5 first:rounded-l-2xl">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 font-black text-lg border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-sm">
                                  {contact.name.substring(0, 1).toUpperCase()}
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <span className="font-bold text-slate-900 bangla-text text-base block mb-0.5">{contact.name}</span>
                                <span className="text-[10px] uppercase font-black text-slate-300 tracking-wider">Regular Customer</span>
                              </td>
                              <td className="px-8 py-5">
                                <code className="text-xs font-mono bg-emerald-50 px-3 py-1.5 rounded-lg text-emerald-700 font-black border border-emerald-100 group-hover:shadow-lg group-hover:shadow-emerald-50 transition-all">
                                  {contact.phone}
                                </code>
                              </td>
                              <td className="px-8 py-5">
                                <span className="text-xs text-slate-400 font-bold">
                                  {new Date(contact.addedAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-8 py-5 last:rounded-r-2xl text-right">
                                <button 
                                  onClick={() => deleteContact(contact.id)}
                                  className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-40 text-center">
                              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-dashed border-slate-100">
                                <Users size={40} className="text-slate-200" />
                              </div>
                              <h4 className="text-xl font-bold text-slate-400 bangla-text">আপনার লিস্টে কোনো কন্টাক্ট নেই!</h4>
                              <button 
                                onClick={() => setIsAddContactOpen(true)}
                                className="mt-4 text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline"
                              >
                                Add your first customer &rarr;
                              </button>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-white"
              >
                {/* Column 1: Contact List (Middle Sidebar) */}
                <div className="md:col-span-3 border-r border-slate-100 flex flex-col h-full overflow-hidden">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} className="text-emerald-500" />
                        ১. কন্টাক্ট নির্বাচন
                      </h3>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg">
                        {filteredContacts.length}
                      </span>
                    </div>
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="দ্রুত খুঁজুন..." 
                        className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-emerald-50 transition-all bangla-text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {filteredContacts.map(contact => (
                      <div 
                        key={contact.id} 
                        className="p-4 rounded-2xl hover:bg-slate-50 transition-all group flex items-center justify-between border border-transparent hover:border-slate-100 cursor-pointer active:scale-98"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[11px] font-black text-slate-400 border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                            {contact.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 leading-tight mb-0.5 bangla-text truncate">{contact.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold font-mono">{contact.phone}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Message Composer (Middle) */}
                <div className="md:col-span-6 flex flex-col h-full bg-slate-50/30 overflow-y-auto custom-scrollbar p-8">
                  <div className="max-w-xl mx-auto w-full space-y-8">
                    <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden relative">
                      <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                            <MessageSquare size={16} />
                          </div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">২. মেসেজ কম্পোজার</h4>
                        </div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Length: {baseMessage.length}</span>
                      </div>
                      
                      <div className="p-8">
                        <textarea 
                          className="w-full h-56 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 outline-none focus:ring-8 focus:ring-emerald-50/50 focus:bg-white focus:border-emerald-200 transition-all resize-none text-[16px] leading-relaxed bangla-text text-slate-700 placeholder:text-slate-300 shadow-inner"
                          placeholder="আপনার প্রমোশনাল মেসেজটি এখানে লিখুন..."
                          value={baseMessage}
                          onChange={(e) => setBaseMessage(e.target.value)}
                        />
                        
                        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                           <div className="px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                              <Wand2 size={14} className="text-amber-500" />
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bangla-text">AI প্রোটেকশন একটিভ</span>
                           </div>
                           
                          <button 
                            onClick={handleGenerateVariations}
                            disabled={!baseMessage || isGenerating}
                            className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl text-xs font-black shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                          >
                            {isGenerating ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                            ) : <Wand2 size={16} className="text-emerald-400" />}
                            <span>AI ভ্যারিয়েশন জেনারেট</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {variations.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-slate-100"></div>
                            <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">AI Suggestions</h4>
                            <div className="h-px flex-1 bg-slate-100"></div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4 pb-20">
                            {variations.map((v, i) => (
                              <div key={v.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 group relative transition-all hover:border-emerald-200 hover:shadow-emerald-50">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(v.text);
                                      alert('Copied!');
                                    }}
                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"
                                  >
                                    <Copy size={14} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Variation 0{i + 1}</span>
                                </div>
                                <p className="bangla-text text-slate-600 leading-relaxed text-sm">{v.text}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Column 3: Control Center (Right) */}
                <div className="md:col-span-3 flex flex-col h-full bg-white border-l border-slate-100">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/20">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                          <Send size={16} />
                       </div>
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">৩. কুইক সেন্ট</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold bangla-text leading-tight">সেরা ভ্যারিয়েশনটি কাস্টমারকে এক ক্লিকে পাঠিয়ে দিন।</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/10">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <div 
                          key={contact.id} 
                          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-4 hover:shadow-lg hover:border-emerald-200 transition-all group active:scale-95 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                              {contact.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-slate-900 bangla-text text-sm leading-tight truncate">{contact.name}</h5>
                              <p className="text-[10px] font-mono text-slate-300 mt-1 font-black">{contact.phone}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const msg = variations.length > 0 
                                ? variations[Math.floor(Math.random() * variations.length)].text 
                                : baseMessage;
                              if (!msg) {
                                alert('Please write a message first!');
                                return;
                              }
                              window.open(getWhatsAppLink(contact.phone, msg), '_blank');
                            }}
                            className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-100"
                          >
                            <MessageCircle size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 px-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 border-dashed">
                          <Users size={24} className="text-slate-200" />
                        </div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest leading-loose text-center">No contacts<br/>available</p>
                      </div>
                    )}
                  </div>

                  {/* Dashboard Stats */}
                  <div className="p-8 border-t border-slate-50">
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health</span>
                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black">ACTIVE</div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <p className="text-[10px] text-slate-400 font-bold bangla-text leading-tight">লাকী গোল্ড প্লাজা আগ্রাবাদ সার্ভার কানেক্টেড।</p>
                      </div>
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

      <Modal 
        isOpen={isBulkUploadOpen} 
        onClose={() => setIsBulkUploadOpen(false)} 
        title="নাম্বার লিস্ট আপলোড করুন"
      >
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-2">
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2">Instructions</h4>
            <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              VCF (Contacts), Excel (XLSX/XLS), CSV অথবা সরাসরি টেক্সট ইনপুট এর মাধ্যমে কন্টাক্ট যোগ করুন।
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-slate-500 hover:text-emerald-700"
            >
              <Upload size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Excel / VCF</span>
            </button>
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 opacity-50">
              <FileText size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Google Contacts</span>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".vcf,.xlsx,.xls,.csv"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Or paste manually</span>
            </div>
          </div>

          <form onSubmit={handleBulkUpload} className="space-y-4">
            <textarea 
              className="w-full h-40 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-xs text-slate-700 resize-none"
              placeholder="Name, Phone (প্রতি লাইনে একটি করে নাম্বার)..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
            ></textarea>
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              <span className="bangla-text">লিস্ট ইনপোর্ট করুন</span>
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
