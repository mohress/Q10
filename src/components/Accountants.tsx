/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Accountant } from '../types';
import { 
  Users, UserPlus, Shield, Check, X, Phone, UserCheck, Trash2, 
  ToggleLeft, ToggleRight, Sparkles, Award, ReceiptCent, HelpCircle 
} from 'lucide-react';

interface AccountantsProps {
  accountants: Accountant[];
  activeAccountantId: string;
  onSelectActiveAccountant: (id: string) => void;
  onAddAccountant: (accountant: Omit<Accountant, 'id' | 'totalCollected'>) => void;
  onToggleAccountantStatus: (id: string) => void;
}

export default function Accountants({
  accountants,
  activeAccountantId,
  onSelectActiveAccountant,
  onAddAccountant,
  onToggleAccountantStatus
}: AccountantsProps) {
  // Modal opening controls
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newAccountant, setNewAccountant] = useState({
    name: '',
    role: 'accountant' as 'admin' | 'accountant',
    username: '',
    phone: '',
    isActive: true
  });

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountant.name.trim() || !newAccountant.username.trim() || !newAccountant.phone.trim()) return;
    onAddAccountant(newAccountant);
    setNewAccountant({
      name: '',
      role: 'accountant',
      username: '',
      phone: '',
      isActive: true
    });
    setShowAddModal(false);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col select-none no-scrollbar">
      
      {/* Mini info panel */}
      <div className="bg-white p-4 border-b border-gray-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-3xs">
        <div>
          <h3 className="text-xs font-black text-gray-900 flex items-center gap-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span>نظام وكلاء الجباية والمحاسبين الميدانيين</span>
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">تحديد من هو المحاسب النشط لتسجيل الوصولات باسمه وجمع محاسبته.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs transition-all active:scale-95"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>إضافة محاسب جديد</span>
        </button>
      </div>

      {/* Main Accountants List */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 sm:pb-4 space-y-3 bg-gray-50 no-scrollbar">
        {accountants.map((acc) => {
          const isActiveSession = acc.id === activeAccountantId;
          return (
            <div 
              key={acc.id}
              className={`bg-white rounded-2xl p-4 border shadow-3xs transition-all relative flex flex-col justify-between ${
                isActiveSession 
                  ? 'border-blue-200 bg-blue-50/10 shadow-xs' 
                  : 'border-gray-150'
              }`}
            >
              {/* Profile layout and meta data */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold ${
                    isActiveSession 
                      ? 'bg-blue-600 text-white border-blue-500' 
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {acc.name.charAt(0)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-black text-gray-950">{acc.name}</h4>
                      {acc.role === 'admin' ? (
                        <span className="text-[8.5px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md font-bold">المشرف العام</span>
                      ) : (
                        <span className="text-[8.5px] px-1.5 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-md font-mono">@{acc.username}</span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5 font-semibold">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{acc.phone}</span>
                    </p>
                  </div>
                </div>

                {/* Collections status */}
                <div className="text-left select-none">
                  <p className="text-[10px] text-gray-450 font-bold">التحصيل الكلي</p>
                  <p className="text-xs font-black font-mono text-emerald-600">{acc.totalCollected.toLocaleString()} د.ع</p>
                </div>
              </div>

              {/* Status and Active Switch row */}
              <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between">
                
                {/* Active switch */}
                <div>
                  {isActiveSession ? (
                    <div className="inline-flex items-center gap-1 text-[10px] text-blue-700 font-bold bg-blue-100/50 px-2.5 py-1 rounded-full border border-blue-200">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>المستلم النشط الآن</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (acc.isActive) {
                          onSelectActiveAccountant(acc.id);
                        } else {
                          alert("عذرا! هذا المحاسب موقوف ومجمد، لا يمكن تفعيله كجابي نشط.");
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black cursor-pointer transition-all active:scale-95 border border-gray-200"
                    >
                      تفعيل ومحاسب حالي
                    </button>
                  )}
                </div>

                {/* Suspended/Active Toggle switcher */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-bold">حالة الحساب:</span>
                  <button
                    onClick={() => {
                      if (acc.role === 'admin') {
                        alert("عذراً، لا يمكن تجميد حساب مالك النظام الأساسي.");
                        return;
                      }
                      onToggleAccountantStatus(acc.id);
                    }}
                    className="cursor-pointer transition-transform transform active:scale-90"
                    title={acc.isActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
                  >
                    {acc.isActive ? (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-bold flex items-center gap-0.5 border border-emerald-250">
                        • نشط
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-600 bg-red-50 px-2.5 py-1 rounded-md font-bold flex items-center gap-0.5 border border-red-250">
                        • موقوف
                      </span>
                    )}
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* --- ADD ACCOUNTANT MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <UserPlus className="w-5 h-5" />
                <span>تسجيل محاسب/جابي جديد</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-full cursor-pointer text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-3.5 text-xs">
              
              {/* Name */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">اسم المحاسب الثلاثي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مروان طارق علي"
                  value={newAccountant.name}
                  onChange={(e) => setNewAccountant(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">اسم المستخدم (المعرف لقيد الوصولات) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: marwan_act"
                  value={newAccountant.username}
                  onChange={(e) => setNewAccountant(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden text-left font-mono"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">رقم الهاتف العراقي *</label>
                <input
                  type="tel"
                  required
                  placeholder="مثال: 07701234567"
                  value={newAccountant.phone}
                  onChange={(e) => setNewAccountant(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden text-right"
                />
              </div>

              {/* Role choosing */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">الصلاحيات الفنية</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccountant(prev => ({ ...prev, role: 'accountant' }))}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      newAccountant.role === 'accountant'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-3xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    جابي / محاسب ميداني
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccountant(prev => ({ ...prev, role: 'admin' }))}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      newAccountant.role === 'admin'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-3xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    جابي مشرف (مدير)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-605 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  حفظ المحاسب
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

    </div>
  );
}
