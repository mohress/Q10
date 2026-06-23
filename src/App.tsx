/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Subscriber, Expense, Accountant, Receipt, DashboardStats, SubscriptionType } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  INITIAL_ACCOUNTANTS, INITIAL_SUBSCRIBERS, INITIAL_EXPENSES, INITIAL_RECEIPTS 
} from './utils/dummyData';

import Dashboard from './components/Dashboard';
import Subscribers from './components/Subscribers';
import Expenses from './components/Expenses';
import Accountants from './components/Accountants';
import Settings from './components/Settings';
import ReceiptModal from './components/ReceiptModal';

import { 
  LayoutDashboard, Users, CreditCard, ReceiptCent, HelpCircle, 
  Settings as SettingsIcon, FileText, Landmark, Fuel 
} from 'lucide-react';

export default function App() {
  // System persistence states
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [activeAccountantId, setActiveAccountantId] = useState('acc_1');

  // Simulator configurations
  const [isOffline, setIsOffline] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeReceiptForModal, setActiveReceiptForModal] = useState<Receipt | null>(null);

  // Sync state notification
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warning' | 'info'>('success');

  // Load from local storage initially
  useEffect(() => {
    const savedSubs = localStorage.getItem('my_generator_subscribers');
    const savedExps = localStorage.getItem('my_generator_expenses');
    const savedAccs = localStorage.getItem('my_generator_accountants');
    const savedRecs = localStorage.getItem('my_generator_receipts');
    const savedActAcc = localStorage.getItem('my_generator_active_acc');

    if (savedSubs) setSubscribers(JSON.parse(savedSubs));
    else setSubscribers(INITIAL_SUBSCRIBERS);

    if (savedExps) setExpenses(JSON.parse(savedExps));
    else setExpenses(INITIAL_EXPENSES);

    if (savedAccs) setAccountants(JSON.parse(savedAccs));
    else setAccountants(INITIAL_ACCOUNTANTS);

    if (savedRecs) setReceipts(JSON.parse(savedRecs));
    else setReceipts(INITIAL_RECEIPTS);

    if (savedActAcc) setActiveAccountantId(savedActAcc);
  }, []);

  // Save changes to local storage when state changes
  useEffect(() => {
    if (subscribers.length > 0) {
      localStorage.setItem('my_generator_subscribers', JSON.stringify(subscribers));
    }
  }, [subscribers]);

  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem('my_generator_expenses', JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    if (accountants.length > 0) {
      localStorage.setItem('my_generator_accountants', JSON.stringify(accountants));
    }
  }, [accountants]);

  useEffect(() => {
    if (receipts.length > 0) {
      localStorage.setItem('my_generator_receipts', JSON.stringify(receipts));
    }
  }, [receipts]);

  const triggerToast = (msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // 1-click Quick pay handler
  const handlePaySubscriber = (subId: string, method: 'نقدي' | 'دفع إلكتروني') => {
    const sub = subscribers.find(s => s.id === subId);
    if (!sub) return;

    if (sub.status === 'paid' && method === 'نقدي') {
      // Just fetch existing receipt to view again
      const existingReceipt = receipts.find(r => r.subscriberId === subId);
      if (existingReceipt) {
        setActiveReceiptForModal(existingReceipt);
      }
      return;
    }

    const currentAccountant = accountants.find(a => a.id === activeAccountantId) || accountants[0];
    const invoiceNo = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Update Subscriber status
    setSubscribers(prev => prev.map(s => {
      if (s.id === subId) {
        return {
          ...s,
          status: 'paid',
          lastPaymentDate: formattedDate,
          accountantId: activeAccountantId,
          invoiceNo
        };
      }
      return s;
    }));

    // Update Accountant total collections
    setAccountants(prev => prev.map(a => {
      if (a.id === activeAccountantId) {
        return {
          ...a,
          totalCollected: a.totalCollected + sub.totalDue
        };
      }
      return a;
    }));

    // Generate Receipt Log
    const newReceipt: Receipt = {
      id: `rec_${Date.now()}`,
      invoiceNo,
      subscriberId: subId,
      subscriberName: sub.name,
      subscriberPhone: sub.phone,
      subscriptionType: sub.type,
      amps: sub.amps,
      pricePerAmp: sub.pricePerAmp,
      totalAmount: sub.totalDue,
      paymentDate: formattedDate,
      accountantName: currentAccountant.name,
      paymentMethod: method
    };

    setReceipts(prev => [newReceipt, ...prev]);
    setActiveReceiptForModal(newReceipt);
    triggerToast(`تم استلام وتسديد ${sub.totalDue.toLocaleString()} د.ع بنجاح بطلب من ${sub.name}`, 'success');
  };

  // Add Subscriber
  const handleAddSubscriber = (newSub: Omit<Subscriber, 'id' | 'totalDue'>) => {
    const subId = `sub_${Date.now()}`;
    const entry: Subscriber = {
      ...newSub,
      id: subId,
      totalDue: newSub.amps * newSub.pricePerAmp,
      status: 'unpaid'
    };
    setSubscribers(prev => [entry, ...prev]);
    triggerToast(`تم تسجيل المشترك الجديد "${newSub.name}" بالمنظومة بنجاح`, 'success');
  };

  // Edit/Update Subscriber
  const handleUpdateSubscriber = (editedSub: Subscriber) => {
    setSubscribers(prev => prev.map(s => s.id === editedSub.id ? editedSub : s));
    triggerToast(`تم تعديل بيانات وإعدادات المشترك "${editedSub.name}"`, 'info');
  };

  // Delete Subscriber
  const handleDeleteSubscriber = (subId: string) => {
    const name = subscribers.find(s => s.id === subId)?.name || '';
    setSubscribers(prev => prev.filter(s => s.id !== subId));
    triggerToast(`تم إزالة وإلغاء اشتراك المشترك "${name}" نهائيا من الخادم`, 'warning');
  };

  // Log new Expense
  const handleAddExpense = (newExp: Omit<Expense, 'id' | 'registeredBy'>) => {
    const expId = `exp_${Date.now()}`;
    const loggerName = accountants.find(a => a.id === activeAccountantId)?.name || 'المالك المشرف';
    const entry: Expense = {
      ...newExp,
      id: expId,
      registeredBy: loggerName
    };
    setExpenses(prev => [entry, ...prev]);
    triggerToast(`تم تسجيل القيد الصرفي بقيمة ${newExp.amount.toLocaleString()} د.ع تحت باب (${newExp.title})`, 'info');
  };

  // Delete Expense
  const handleDeleteExpense = (expId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expId));
    triggerToast('تم إلغاء وشطب القيد المالي المحدد بنجاح', 'warning');
  };

  // Refill Fuel Gauge level adjustments
  const handleRefillFuel = (liters: number) => {
    // Each 10 litters triggers an average 1% fuel increase in typical mobile simulation
    setSubscribers(prev => prev); // keep state trigger
  };

  // Set Accountant status toggle
  const handleToggleAccountantStatus = (accId: string) => {
    setAccountants(prev => prev.map(a => {
      if (a.id === accId) {
        return {
          ...a,
          isActive: !a.isActive
        };
      }
      return a;
    }));
    triggerToast('تحديث حالة وصلاحية العمل للمحاسب المحدّد بدقة', 'info');
  };

  // Add Accountant
  const handleAddAccountant = (newAcc: Omit<Accountant, 'id' | 'totalCollected'>) => {
    const accId = `acc_${Date.now()}`;
    const entry: Accountant = {
      ...newAcc,
      id: accId,
      totalCollected: 0
    };
    setAccountants(prev => [...prev, entry]);
    triggerToast(`تم إضافة الحساب الجابي الميداني "${newAcc.name}" بنجاح`, 'success');
  };

  // Select accountant
  const handleSelectActiveAccountant = (id: string) => {
    setActiveAccountantId(id);
    localStorage.setItem('my_generator_active_acc', id);
    const name = accountants.find(a => a.id === id)?.name || '';
    triggerToast(`مرحباً بك! تم التبديل وتسجيل الدخول كـ "${name}"`, 'success');
  };

  // Global calculations for calculations
  const totalCollections = receipts.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netCalculatedProfit = totalCollections - totalExpenses;

  // Fuel computations based on consumption expenses logs
  const fuelRefillsLiters = expenses.filter(e => e.category === 'fuel').reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalFuelGeneratedCapacity = 2000; // max reservoir
  const consumedEstimateForSimulation = (subscribers.length * 5.4 * 6) + 120; // Simulated liters consumed since launch
  const computedFuelLitersRemaining = Math.max(150, Math.min(2000, 1500 + fuelRefillsLiters - consumedEstimateForSimulation));
  const fuelPercentRemaining = Math.round((computedFuelLitersRemaining / totalFuelGeneratedCapacity) * 100);

  const calculatedStats: DashboardStats = {
    totalSubscribers: subscribers.length,
    activeSubscribers: subscribers.length,
    paidSubscribers: subscribers.filter(s => s.status === 'paid').length,
    unpaidSubscribers: subscribers.filter(s => s.status === 'unpaid').length,
    totalDueAmount: subscribers.reduce((acc, curr) => acc + curr.totalDue, 0),
    totalCollectedAmount: totalCollections,
    totalExpenses: totalExpenses,
    netProfit: netCalculatedProfit,
    fuelLevel: fuelPercentRemaining,
    fuelLitersRemaining: Math.round(computedFuelLitersRemaining)
  };

  const activeAccountant = accountants.find(a => a.id === activeAccountantId) || accountants[0] || { name: 'المسؤول' };

  // Render proper View tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            stats={calculatedStats} 
            onNavigate={setActiveTab} 
            subscribers={subscribers} 
            expenses={expenses} 
          />
        );
      case 'subscribers':
        return (
          <Subscribers 
            subscribers={subscribers}
            onAddSubscriber={handleAddSubscriber}
            onUpdateSubscriber={handleUpdateSubscriber}
            onDeleteSubscriber={handleDeleteSubscriber}
            onPaySubscriber={handlePaySubscriber}
            activeAccountantName={activeAccountant.name}
          />
        );
      case 'expenses':
        return (
          <Expenses 
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            stats={calculatedStats}
            onRefillFuel={handleRefillFuel}
          />
        );
      case 'accountants':
        return (
          <Accountants 
            accountants={accountants}
            activeAccountantId={activeAccountantId}
            onSelectActiveAccountant={handleSelectActiveAccountant}
            onAddAccountant={handleAddAccountant}
            onToggleAccountantStatus={handleToggleAccountantStatus}
          />
        );
      case 'settings':
        return (
          <Settings 
            subscribers={subscribers}
            setSubscribers={setSubscribers}
            expenses={expenses}
            setExpenses={setExpenses}
            accountants={accountants}
            setAccountants={setAccountants}
            receipts={receipts}
            setReceipts={setReceipts}
            triggerToast={triggerToast}
          />
        );
      default:
        return <div className="p-4 text-center">عذرا، القسم غير متوفر حالياً.</div>;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F1F5F9] overflow-hidden text-slate-800 font-sans" dir="rtl">
      
      {/* 1. RIGHT SIDEBAR - Persistent for tablet/desktop */}
      <aside className="hidden md:flex w-72 bg-white border-l border-slate-200 flex-col shrink-0 h-full">
        {/* Brand Block */}
        <div className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-200 shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-800 tracking-tight block">نظام مولدتي</span>
              <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">إدارة المولد الذكي الميداني</span>
            </div>
          </div>
          
          {/* Active Accountant Quick Selector Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="text-[10px] font-bold text-slate-400 block mb-1">المحاسب النشط الحالي:</label>
            <select
              value={activeAccountantId}
              onChange={(e) => handleSelectActiveAccountant(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs rounded-lg p-1.5 focus:ring-1 focus:ring-blue-500 font-bold text-slate-700 outline-none"
            >
              {accountants.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.isActive ? '🟢' : '🔴'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-6 space-y-1 overflow-y-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all text-right ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:bg-[#EFF6FF] hover:text-blue-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>لوحة التحكم الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all text-right ${
              activeTab === 'subscribers'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:bg-[#EFF6FF] hover:text-blue-600'
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span>إدارة المشتركين</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all text-right ${
              activeTab === 'expenses'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:bg-[#EFF6FF] hover:text-blue-600'
            }`}
          >
            <Fuel className="w-5 h-5 shrink-0" />
            <span>قيد المصروفات والمحروقات</span>
          </button>

          <button
            onClick={() => setActiveTab('accountants')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all text-right ${
              activeTab === 'accountants'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:bg-[#EFF6FF] hover:text-blue-600'
            }`}
          >
            <ReceiptCent className="w-5 h-5 shrink-0" />
            <span>صلاحيات وجباية المحاسبين</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all text-right relative ${
              activeTab === 'settings'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/30'
                : 'text-slate-500 hover:bg-[#EFF6FF] hover:text-blue-600'
            }`}
          >
            <SettingsIcon className="w-5 h-5 shrink-0" />
            <span>إعدادات النظام والمنظومة</span>
            <span className="absolute left-3 top-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
        </nav>

        {/* Footer Area - Active accountant status details */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 font-extrabold rounded-full flex items-center justify-center text-sm shrink-0">
              {activeAccountant.name.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{activeAccountant.name}</p>
              <p className="text-xs text-slate-500 font-semibold">{activeAccountantId === 'acc_1' ? 'المالك المشرف المشغل' : 'جابي ميداني مخول'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN LAYOUT CONTAINER - Left/Center area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        
        {/* 3. SCROLLABLE TAB CONTENT AREA */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#F8FAFC]">
          {renderTabContent()}
        </div>

        {/* 4. APPLESQUE TOAST NOTIFICATION POPUP */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9, x: '-50%' }}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
              exit={{ opacity: 0, y: -20, scale: 0.9, x: '-50%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="fixed top-8 left-1/2 z-50 cursor-pointer flex justify-center no-print w-full max-w-xs px-4"
              onClick={() => setShowToast(false)}
            >
              <div className={`px-5 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs font-black w-full border text-center transition-all ${
                toastType === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' :
                toastType === 'warning' ? 'bg-red-600 text-white border-red-500 shadow-red-500/20' :
                'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
              }`}>
                <span>{toastMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. RESPONSIVE BOTTOM TABS (Visible only on phone/tablets) */}
        <div className="md:hidden fixed bottom-4 inset-x-4 max-w-lg mx-auto bg-white/75 backdrop-blur-xl border border-slate-200/50 h-16 py-1 px-2 grid grid-cols-5 items-center select-none no-print z-40 rounded-[24px] shadow-[0_15px_45px_rgba(0,0,0,0.1)]">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 ${
              activeTab === 'dashboard' ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-bold">الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveTab('subscribers')}
            className={`flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 ${
              activeTab === 'subscribers' ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5 text-slate-400" />
            <span className="text-[10px] font-bold">المشتركين</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 ${
              activeTab === 'expenses' ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Fuel className="w-5 h-5 mb-0.5 text-slate-400" />
            <span className="text-[10px] font-bold">المصروفات</span>
          </button>

          <button
            onClick={() => setActiveTab('accountants')}
            className={`flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 active:scale-95 ${
              activeTab === 'accountants' ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ReceiptCent className="w-5 h-5 mb-0.5 text-slate-400" />
            <span className="text-[10px] font-bold">المحاسبين</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center cursor-pointer transition-transform duration-250 active:scale-95 relative ${
              activeTab === 'settings' ? 'text-blue-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <SettingsIcon className="w-5 h-5 mb-0.5 text-slate-400" />
              <span className="absolute top-[-3px] right-[-3px] w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <span className="text-[10px] font-bold">الإعدادات</span>
          </button>
        </div>

      </main>

      {/* 6. THERMAL PRINTER RECEIPT MODAL DRAFT (Global overlay) */}
      {activeReceiptForModal && (
        <ReceiptModal 
          receipt={activeReceiptForModal}
          onClose={() => setActiveReceiptForModal(null)}
        />
      )}

    </div>
  );
}
