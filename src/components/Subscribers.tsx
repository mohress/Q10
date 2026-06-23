/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Subscriber, SubscriptionType, Receipt } from '../types';
import { 
  Plus, Search, Filter, X, Check, Save, Trash2, Edit3, Phone, MapPin, 
  UserPlus, Info, Banknote, HelpCircle, ChevronDown, Award, Sparkles 
} from 'lucide-react';

interface SubscribersProps {
  subscribers: Subscriber[];
  onAddSubscriber: (subscriber: Omit<Subscriber, 'id' | 'totalDue'>) => void;
  onUpdateSubscriber: (subscriber: Subscriber) => void;
  onDeleteSubscriber: (id: string) => void;
  onPaySubscriber: (id: string, method: 'نقدي' | 'دفع إلكتروني') => void;
  activeAccountantName: string;
}

export default function Subscribers({
  subscribers,
  onAddSubscriber,
  onUpdateSubscriber,
  onDeleteSubscriber,
  onPaySubscriber,
  activeAccountantName
}: SubscribersProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SubscriptionType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Modal display states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscriberForEdit, setSelectedSubscriberForEdit] = useState<Subscriber | null>(null);

  // Form input states
  const [newSubscriber, setNewSubscriber] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'عادي' as SubscriptionType,
    amps: 5,
    pricePerAmp: 10000,
    notes: '',
    breakerNo: '',
    boardNo: ''
  });

  // Sound generator helper for premium 1-click payments
  const playPaymentTingSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
      oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.24); // C6

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio context audio blocked by browse security rules.');
    }
  };

  // Preset configuration depending on premium tiers
  const handleTypeChange = (type: SubscriptionType, mode: 'add' | 'edit') => {
    let price = 10000;
    if (type === 'ذهبي') price = 18000;
    else if (type === 'تجاري') price = 22000;

    if (mode === 'add') {
      setNewSubscriber(prev => ({ ...prev, type, pricePerAmp: price }));
    } else if (selectedSubscriberForEdit) {
      setSelectedSubscriberForEdit(prev => prev ? { ...prev, type, pricePerAmp: price, totalDue: prev.amps * price } : null);
    }
  };

  // Submission handles
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubscriber.name.trim() || !newSubscriber.phone.trim()) return;
    onAddSubscriber(newSubscriber);
    setNewSubscriber({
      name: '',
      phone: '',
      address: '',
      type: 'عادي',
      amps: 5,
      pricePerAmp: 10000,
      notes: '',
      breakerNo: '',
      boardNo: ''
    });
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscriberForEdit || !selectedSubscriberForEdit.name.trim()) return;
    onUpdateSubscriber(selectedSubscriberForEdit);
    setShowEditModal(false);
    setSelectedSubscriberForEdit(null);
  };

  const handleQuickPay = (id: string) => {
    playPaymentTingSound();
    onPaySubscriber(id, 'نقدي');
  };

  // Filtering calculations
  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = 
      s.name.includes(searchQuery) || 
      s.phone.includes(searchQuery) || 
      s.address.includes(searchQuery) ||
      (s.breakerNo && s.breakerNo.includes(searchQuery)) ||
      (s.boardNo && s.boardNo.includes(searchQuery));
    const matchesType = selectedType === 'all' || s.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col select-none no-scrollbar">
      
      {/* Filters & Actions Sub-Header */}
      <div className="bg-white p-4 border-b border-gray-150 shadow-3xs flex flex-col gap-3">
        
        {/* Top actions: Search & Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم المشترك أو رقم هاتفه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white text-xs rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-hidden transition-all font-semibold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة مشترك</span>
          </button>
        </div>

        {/* Bottom actions: Type filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">الفئات:</span>
          
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              selectedType === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            الكل
          </button>
          
          {(['ذهبي', 'تجاري', 'عادي'] as SubscriptionType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                selectedType === type
                  ? 'bg-blue-600 text-white shadow-3xs' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              • {type}
            </button>
          ))}
          
          <div className="h-4 w-px bg-gray-200 mx-1 flex-shrink-0"></div>

          {/* Status filters */}
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer ${
              selectedStatus === 'all' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            مسدد ومطلوب
          </button>
          <button
            onClick={() => setSelectedStatus('paid')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer ${
              selectedStatus === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            مسدد فقط
          </button>
          <button
            onClick={() => setSelectedStatus('unpaid')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer ${
              selectedStatus === 'unpaid' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            مطلوب فقط
          </button>
        </div>
      </div>

      {/* Main Subscribers Container Scroll View */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 sm:pb-4 space-y-3 bg-gray-50 no-scrollbar">
        {filteredSubscribers.length > 0 ? (
          filteredSubscribers.map((sub) => (
            <div 
              key={sub.id}
              className={`bg-white rounded-2xl p-4 border shadow-3xs transition-all relative overflow-hidden flex flex-col justify-between ${
                sub.status === 'paid' 
                  ? 'border-emerald-100/70 hover:border-emerald-200 bg-emerald-50/10' 
                  : 'border-gray-150 hover:border-blue-200'
              }`}
            >
              {/* Corner badge to denote category colored with gradient backgrounds */}
              <div className="absolute top-0 left-0 h-1.5 w-16" style={{
                background: sub.type === 'ذهبي' ? '#fbbf24' : sub.type === 'تجاري' ? '#ec4899' : '#9ca3af'
              }}></div>

              {/* Header profile row */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-gray-900 tracking-tight">{sub.name}</h4>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold select-none ${
                      sub.type === 'ذهبي' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      sub.type === 'تجاري' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sub.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold mt-1">
                    <span className="flex items-center gap-0.5"><Phone className="w-3.5 h-3.5" />{sub.phone}</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" />{sub.address.split(' - ')[0]}</span>
                  </div>

                  {(sub.breakerNo || sub.boardNo) && (
                    <div className="flex items-center gap-2 mt-2 font-mono text-[9px] flex-wrap">
                      {sub.breakerNo && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 border border-slate-200/50">
                          جوزة: <span className="text-blue-600 font-extrabold">{sub.breakerNo}</span>
                        </span>
                      )}
                      {sub.boardNo && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 border border-slate-200/50">
                          بورد: <span className="text-indigo-600 font-extrabold">{sub.boardNo}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Amount information */}
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 font-bold">القدرة والأمبيرات</p>
                  <p className="text-sm font-black text-gray-950 font-mono">{sub.amps} <span className="text-[10px] font-sans">أمبير</span></p>
                </div>
              </div>

              {/* Sub-section details */}
              <div className="border-t border-gray-100/80 my-3 pt-3 flex items-center justify-between">
                
                {/* Due status details */}
                <div>
                  <p className="text-[9px] text-gray-400 font-bold">المستحق المالي</p>
                  <p className="text-xs font-mono font-black text-gray-800">
                    {sub.totalDue.toLocaleString()} <span className="text-[9px] font-sans">د.ع</span>
                  </p>
                  <p className="text-[8px] text-gray-400 mt-0.5">({sub.pricePerAmp.toLocaleString()} د.ع للأمبير)</p>
                </div>

                {/* Notes if exist */}
                {sub.notes && (
                  <p className="hidden xs:block text-[9px] text-gray-500 max-w-[150px] truncate text-left font-medium">
                    🔍 {sub.notes}
                  </p>
                )}

                {/* Payment State Display */}
                <div>
                  {sub.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-150 text-emerald-800 text-[10px] rounded-xl font-bold border border-emerald-300">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>مسدد</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-[10px] rounded-xl font-bold border border-red-200">
                      <Banknote className="w-3.5 h-3.5" />
                      <span>غير مسدد</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick actions panel */}
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-50">
                {sub.status === 'unpaid' ? (
                  <button
                    onClick={() => handleQuickPay(sub.id)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-3xs hover:shadow-2xs transition-all flex items-center justify-center gap-1 active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    تسديد بضغطة واحدة
                  </button>
                ) : (
                  <button
                    onClick={() => onPaySubscriber(sub.id, 'نقدي')} // Just show receipt again
                    className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center justify-center gap-1 border border-blue-100"
                  >
                    <Info className="w-3.5 h-3.5" />
                    عرض وصْلْ القبض
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setSelectedSubscriberForEdit(sub);
                    setShowEditModal(true);
                  }}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl transition-all cursor-pointer"
                  title="تعديل المشترك"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`هل أنت متأكد من حذف المشترك "${sub.name}" نهائياً من المنظومة؟`)) {
                      onDeleteSubscriber(sub.id);
                    }
                  }}
                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl hover:text-red-705 transition-all cursor-pointer border border-red-100"
                  title="حذف المشترك"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 p-6 bg-white rounded-3xl border border-gray-100 flex flex-col items-center">
            <Info className="w-10 h-10 text-gray-300 mb-2 stroke-[1.5]" />
            <h4 className="text-xs font-bold text-gray-800">لا يوجد مشتركين مطابقين لتصفيتك</h4>
            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">يرجى تغيير تصنيفات الفلتر لتظهر لك قائمة المشتركين أو أضف مشتركاً جديداً.</p>
          </div>
        )}
      </div>

      {/* --- ADD SUBSCRIBER MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                <span>تسجيل مشترك جديد بالمنظومة</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-full cursor-pointer text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              
              {/* Full Name */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">اسم المشترك الثلاثي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: علي محمد خلف"
                  value={newSubscriber.name}
                  onChange={(e) => setNewSubscriber(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Telephone */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">رقم الهاتف العراقي *</label>
                <input
                  type="tel"
                  required
                  placeholder="مثال: 07701234567"
                  value={newSubscriber.phone}
                  onChange={(e) => setNewSubscriber(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden text-right"
                />
              </div>

              {/* Local Area Address */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">العنوان بالتفصيل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الكرادة - زقاق 12 - مقابل المدرسة"
                  value={newSubscriber.address}
                  onChange={(e) => setNewSubscriber(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Breaker No & Board No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">رقم الجوزة</label>
                  <input
                    type="text"
                    placeholder="مثال: A-24"
                    value={newSubscriber.breakerNo}
                    onChange={(e) => setNewSubscriber(prev => ({ ...prev, breakerNo: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden text-right font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">رقم البورد</label>
                  <input
                    type="text"
                    placeholder="مثال: بورد الكرادة 1"
                    value={newSubscriber.boardNo}
                    onChange={(e) => setNewSubscriber(prev => ({ ...prev, boardNo: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden text-right font-semibold"
                  />
                </div>
              </div>

              {/* Tiers choosing */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">نوع وفئة الاشتراك المالي</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['ذهبي', 'تجاري', 'عادي'] as SubscriptionType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type, 'add')}
                      className={`py-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        newSubscriber.type === type 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amps & Price per amp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">عدد الأمبيرات</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newSubscriber.amps}
                    onChange={(e) => setNewSubscriber(prev => ({ ...prev, amps: parseInt(e.target.value) || 5 }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">سعر الأمبير (د.ع)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={newSubscriber.pricePerAmp}
                    onChange={(e) => setNewSubscriber(prev => ({ ...prev, pricePerAmp: parseInt(e.target.value) || 10000 }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Pricing breakdown summary */}
              <div className="p-3 bg-blue-50 border border-blue-105 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] text-blue-800 font-bold">
                  <span>إجمالي المبلغ المطلوب شهرياً:</span>
                  <span className="font-mono text-xs font-black">{(newSubscriber.amps * newSubscriber.pricePerAmp).toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">ملاحظات فنية أو للتوصيل</label>
                <textarea
                  placeholder="أية ملاحظات تفصيلية..."
                  value={newSubscriber.notes}
                  onChange={(e) => setNewSubscriber(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden h-14 resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  حفظ المشترك
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SUBSCRIBER MODAL --- */}
      {showEditModal && selectedSubscriberForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>تعديل تفاصيل المشترك</span>
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSubscriberForEdit(null);
                }} 
                className="p-1 hover:bg-white/20 rounded-full cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              
              {/* Name */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">اسم المشترك الثلاثي *</label>
                <input
                  type="text"
                  required
                  value={selectedSubscriberForEdit.name}
                  onChange={(e) => setSelectedSubscriberForEdit(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">رقم الهاتف العراقي *</label>
                <input
                  type="tel"
                  required
                  value={selectedSubscriberForEdit.phone}
                  onChange={(e) => setSelectedSubscriberForEdit(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden text-right"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">العنوان بالتفصيل *</label>
                <input
                  type="text"
                  required
                  value={selectedSubscriberForEdit.address}
                  onChange={(e) => setSelectedSubscriberForEdit(prev => prev ? { ...prev, address: e.target.value } : null)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Breaker No & Board No for Edit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">رقم الجوزة</label>
                  <input
                    type="text"
                    placeholder="مثال: A-24"
                    value={selectedSubscriberForEdit.breakerNo || ''}
                    onChange={(e) => setSelectedSubscriberForEdit(prev => prev ? { ...prev, breakerNo: e.target.value } : null)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden text-right font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">رقم البورد</label>
                  <input
                    type="text"
                    placeholder="مثال: بورد الكرادة 1"
                    value={selectedSubscriberForEdit.boardNo || ''}
                    onChange={(e) => setSelectedSubscriberForEdit(prev => prev ? { ...prev, boardNo: e.target.value } : null)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden text-right font-semibold"
                  />
                </div>
              </div>

              {/* Type Category */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">نوع الاشتراك الكهربائي</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['ذهبي', 'تجاري', 'عادي'] as SubscriptionType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type, 'edit')}
                      className={`py-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        selectedSubscriberForEdit.type === type 
                          ? 'bg-gray-900 text-white border-gray-905' 
                          : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amps & price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-bold mb-1">عدد الأمبيرات</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={selectedSubscriberForEdit.amps}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5;
                      setSelectedSubscriberForEdit(prev => prev ? { ...prev, amps: val, totalDue: val * prev.pricePerAmp } : null);
                    }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-bold mb-1">سعر الأمبير (د.ع)</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={selectedSubscriberForEdit.pricePerAmp}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10000;
                      setSelectedSubscriberForEdit(prev => prev ? { ...prev, pricePerAmp: val, totalDue: prev.amps * val } : null);
                    }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Pricing breakdown summary */}
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] text-amber-800 font-bold">
                  <span>إجمالي المبلغ بعد التحديث:</span>
                  <span className="font-mono text-xs font-black">{(selectedSubscriberForEdit.amps * selectedSubscriberForEdit.pricePerAmp).toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">ملاحظات فنية أو للتوصيل</label>
                <textarea
                  placeholder="أية ملاحظات تفصيلية..."
                  value={selectedSubscriberForEdit.notes || ''}
                  onChange={(e) => setSelectedSubscriberForEdit(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-900 focus:bg-white focus:outline-hidden h-14 resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSubscriberForEdit(null);
                  }}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
