/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Expense, ExpenseCategory, DashboardStats } from '../types';
import { 
  Plus, Search, Filter, X, Check, Trash2, Fuel, HelpCircle, 
  Calendar, Wrench, Landmark, CircleDollarSign, ArrowDownRight, Info 
} from 'lucide-react';

interface ExpensesProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'registeredBy'>) => void;
  onDeleteExpense: (id: string) => void;
  stats: DashboardStats;
  onRefillFuel: (liters: number) => void;
}

export default function Expenses({
  expenses,
  onAddExpense,
  onDeleteExpense,
  stats,
  onRefillFuel
}: ExpensesProps) {
  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');

  // Modal displaying controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);

  // Form states
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: 'maintenance' as ExpenseCategory,
    amount: 50000,
    date: new Date().toISOString().split('T')[0],
    quantity: 0,
    notes: ''
  });

  const [refillLiters, setRefillLiters] = useState(500);

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title.trim() || newExpense.amount <= 0) return;
    onAddExpense(newExpense);
    setNewExpense({
      title: '',
      category: 'maintenance',
      amount: 50000,
      date: new Date().toISOString().split('T')[0],
      quantity: 0,
      notes: ''
    });
    setShowAddModal(false);
  };

  const handleSaveRefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (refillLiters <= 0) return;
    
    // Create an automatic expense log for fuel
    const calculatedAmount = refillLiters * 750; // Average cost 750 IQD per liter
    onRefillFuel(refillLiters);
    onAddExpense({
      title: `تجهيز ديزل للمولد - ${refillLiters} لتر (إلكتروني)`,
      category: 'fuel',
      amount: calculatedAmount,
      date: new Date().toISOString().split('T')[0],
      quantity: refillLiters,
      notes: 'تمت تعبئة خزان المولد تلقائيا لرفع مخزون التشغيل'
    });
    
    setShowRefillModal(false);
  };

  // Category Translation dictionaries
  const getCategoryTranslation = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'fuel': return 'وقود ديزل (كاز)';
      case 'maintenance': return 'صيانة وتبديل قطع';
      case 'salary': return 'أجور ورواتب عمال';
      case 'rent': return 'إيجار وأرضيات بلدية';
      case 'other': return 'نفقات ومصاريف أخرى';
    }
  };

  const getCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'fuel': return <Fuel className="w-5 h-5 text-amber-600" />;
      case 'maintenance': return <Wrench className="w-5 h-5 text-red-600" />;
      case 'salary': return <CircleDollarSign className="w-5 h-5 text-green-600" />;
      case 'rent': return <Landmark className="w-5 h-5 text-indigo-600" />;
      case 'other': return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryBadgeClass = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'fuel': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'maintenance': return 'bg-red-50 text-red-800 border-red-200';
      case 'salary': return 'bg-green-50 text-green-800 border-green-200';
      case 'rent': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'other': return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.includes(searchQuery) || (e.notes && e.notes.includes(searchQuery));
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col select-none no-scrollbar">
      
      {/* Top Section: Fuel Gauge Tank Controller */}
      <div className="bg-white p-4 border-b border-gray-150 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-3xs">
        
        {/* Fuel Tank Visual Card */}
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="relative w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 flex flex-col justify-end">
            {/* Dynamic visual liquid background waving */}
            <div 
              className={`absolute inset-x-0 bottom-0 bg-linear-to-t transition-all duration-1000 ${
                stats.fuelLevel < 35 
                  ? 'from-red-500 to-red-400' 
                  : 'from-amber-500 to-yellow-400'
              }`}
              style={{ height: `${stats.fuelLevel}%` }}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-white/20 animate-pulse"></div>
            </div>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono z-10 text-right">
              <span className={`text-sm font-black ${stats.fuelLevel < 35 ? 'text-red-700' : 'text-amber-800'}`}>{stats.fuelLevel}%</span>
              <span className="text-[7.5px] font-sans font-bold text-gray-500 bg-white/80 px-1 rounded-sm mt-0.5">مخزون الكاز</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-gray-900">مستوى وقود الديزل (الكاز)</h4>
              <Fuel className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">المتبقي التقريبي: <span className="font-mono text-gray-700 font-bold">{stats.fuelLitersRemaining.toLocaleString()} لتر</span> في خزان التوليد الرئيسي.</p>
          </div>
        </div>

        {/* Refill Fuel Shortcut button */}
        <button
          onClick={() => setShowRefillModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-3xs transition-all active:scale-95"
        >
          <Fuel className="w-4 h-4" />
          <span>تزويد المولد بالوقود الرئيسي</span>
        </button>
      </div>

      {/* Expense Filter Sub-header */}
      <div className="bg-white px-4 py-3 border-b border-gray-150 flex flex-col gap-2.5">
        <div className="relative">
          <Search className="absolute right-3 top-2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن مصروف بالاسم أو كود القيد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-gray-50 hover:bg-gray-100focus:bg-white text-xs rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-hidden transition-all font-semibold"
          />
        </div>

        {/* Categorized Filter Selectors buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] text-gray-400 font-black flex-shrink-0">فلترة:</span>
          
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
              selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل
          </button>
          
          {(['fuel', 'maintenance', 'salary', 'rent', 'other'] as ExpenseCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {getCategoryTranslation(cat).split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Expenses Cards List View */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 sm:pb-4 space-y-3 bg-gray-50 no-scrollbar">
        
        {/* Floating summary statistics of expenses logs */}
        <div className="p-3 bg-red-50 border border-red-105 rounded-2xl flex items-center justify-between text-xs text-red-900 font-semibold mb-1">
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-5 h-5 text-red-650" />
            <span>إجمالي النفقات والمصروفات المسجلة:</span>
          </div>
          <span className="font-mono text-sm font-black">{stats.totalExpenses.toLocaleString()} د.ع</span>
        </div>

        {filteredExpenses.length > 0 ? (
          filteredExpenses.map((exp) => (
            <div 
              key={exp.id}
              className="bg-white rounded-2xl p-4 border border-gray-150 hover:border-gray-300 shadow-3xs transition-all relative flex flex-col justify-between"
            >
              {/* Header category row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {getCategoryIcon(exp.category)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">{exp.title}</h4>
                    <span className={`text-[8.5px] px-1.5 py-0.5 rounded-md border font-bold mt-1 inline-block ${getCategoryBadgeClass(exp.category)}`}>
                      {getCategoryTranslation(exp.category)}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-left">
                  <p className="text-[10px] text-gray-450 font-bold">المبلغ المسجل</p>
                  <p className="text-sm font-black text-red-650 font-mono">{exp.amount.toLocaleString()} <span className="text-[10px] font-sans">د.ع</span></p>
                </div>
              </div>

              {/* Sub-details */}
              <div className="border-t border-gray-55 my-3 pt-2.5 flex items-center justify-between text-[10px] text-gray-400 font-semibold">
                <span className="flex items-center gap-0.5"><Calendar className="w-3.5 h-3.5" />{exp.date}</span>
                {exp.quantity && exp.quantity > 0 ? (
                  <span className="font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-sm">الكمية: {exp.quantity.toLocaleString()} لتر</span>
                ) : null}
                <span>المسجل: <span className="text-gray-600 font-bold">{exp.registeredBy.split(' ')[0]}</span></span>
              </div>

              {/* Notes */}
              {exp.notes && (
                <p className="text-[9.5px] text-gray-500 bg-gray-50 p-2 rounded-xl mt-1 border border-gray-100 font-medium leading-relaxed">
                  📝 {exp.notes}
                </p>
              )}

              {/* Delete record */}
              <button
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف القيد المالي "${exp.title}"؟ سيتأثر صافي الأرباح.`)) {
                    onDeleteExpense(exp.id);
                  }
                }}
                className="absolute top-4 left-4 p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                title="حذف القيد المالي"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12 p-6 bg-white rounded-3xl border border-gray-100 flex flex-col items-center">
            <Info className="w-10 h-10 text-gray-300 mb-2 stroke-[1.5]" />
            <h4 className="text-xs font-bold text-gray-800">لا يوجد قيود منصرمة مطابقة</h4>
            <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">لم يتم العثور على أية مصروفات تطابق التصفية الحالية.</p>
          </div>
        )}

        {/* Action Button float */}
        <div className="pt-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-3xs active:scale-98 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            تسجيل قيد صيانة أو أجور جديد
          </button>
        </div>
      </div>

      {/* --- ADD EXPENSE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>قيد نفقات ومصروفات جديدة</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-full cursor-pointer text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              
              {/* Title */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">اسم وبند المصروف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تبديل قايش المحرك المولد"
                  value={newExpense.title}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">تصنيف وباب الصرف *</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden"
                >
                  <option value="maintenance">صيانة وقائية وقطع غيار</option>
                  <option value="salary">أجور ومكافئات المشغلين والعمال</option>
                  <option value="rent">إيجارات للبلدية أو مالك الأرض</option>
                  <option value="fuel">شراء وقود (كاز)</option>
                  <option value="other">مصاريف ومشتريات طارئة أخرى</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">المبلغ المصروف بالدينار (د.ع) *</label>
                <input
                  type="number"
                  required
                  min="500"
                  step="500"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden font-mono"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">تاريخ وقوع الصرف *</label>
                <input
                  type="date"
                  required
                  value={newExpense.date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden font-mono"
                />
              </div>

              {/* If fuel category: quantity */}
              {newExpense.category === 'fuel' && (
                <div>
                  <label className="block text-gray-500 font-bold mb-1">الكمية المسحوبة (لتر)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="مثال: 450 لتر"
                    value={newExpense.quantity || ''}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">بيانات وتفاصيل إضافية مكملة</label>
                <textarea
                  placeholder="من مجهز معتمد مع تسليم وصل..."
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-hidden h-14 resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  حفظ قيد النفقات
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

      {/* --- REFILL FUEL DIALOG --- */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            <div className="bg-amber-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-1.5">
                <Fuel className="w-5 h-5 fill-white" />
                <span>تفريغ ديزل وتجهيز خزانات المولد</span>
              </h3>
              <button onClick={() => setShowRefillModal(false)} className="p-1 hover:bg-white/20 rounded-full cursor-pointer text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRefill} className="p-5 space-y-3.5 text-xs">
              
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-900 border border-amber-100 rounded-2xl mb-1">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p>مخزون الكاز الحالي بقيمة {stats.fuelLevel}%. تعبئة الوقود ستقوم بزيادة النسبة وتسجيل تكلفة مالية فورية للميزانية.</p>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-gray-500 font-bold mb-1">كمية الوقود المجهّز (باللتر) *</label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[250, 500, 750, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRefillLiters(val)}
                      className={`py-1.5 rounded-lg border text-xs font-bold font-mono transition-colors cursor-pointer ${
                        refillLiters === val 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-3xs' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {val} ل
                    </button>
                  ))}
                </div>
                
                <input
                  type="number"
                  required
                  min="50"
                  max="10000"
                  value={refillLiters}
                  onChange={(e) => setRefillLiters(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-500 focus:bg-white focus:outline-hidden font-mono"
                  placeholder="كمية مخصصة باللتر..."
                />
              </div>

              {/* Bill Estimation of refueling */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-105">
                <div className="flex justify-between items-center text-[10px] text-amber-900 font-bold">
                  <span>الكلفة الإجمالية التقديرية (بمعدل 750 د.ع/لتر):</span>
                  <span className="font-mono text-xs font-black">{(refillLiters * 750).toLocaleString()} د.ع</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer text-center"
                >
                  تأكيد التجهيز والتعبئة
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefillModal(false)}
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
