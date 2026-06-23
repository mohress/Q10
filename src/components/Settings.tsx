/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Subscriber, Expense, Accountant, Receipt, SubscriptionType } from '../types';
import { INITIAL_SUBSCRIBERS, INITIAL_EXPENSES, INITIAL_ACCOUNTANTS, INITIAL_RECEIPTS } from '../utils/dummyData';
import { 
  Settings as SettingsIcon, Landmark, Save, RefreshCw, Trash2, Sliders, 
  FileText, Zap, ChevronDown, Sparkles, Phone, Download, Upload, Eye, Check,
  Bluetooth, WifiOff, Printer, Radio
} from 'lucide-react';
import { blePrinter } from '../utils/blePrinter';

interface SettingsProps {
  subscribers: Subscriber[];
  setSubscribers: React.Dispatch<React.SetStateAction<Subscriber[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  accountants: Accountant[];
  setAccountants: React.Dispatch<React.SetStateAction<Accountant[]>>;
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  triggerToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export default function Settings({
  subscribers,
  setSubscribers,
  expenses,
  setExpenses,
  accountants,
  setAccountants,
  receipts,
  setReceipts,
  triggerToast
}: SettingsProps) {
  // Pricing states
  const [prices, setPrices] = useState<Record<SubscriptionType, number>>({
    ذهبي: 15000,
    تجاري: 12000,
    عادي: 10000
  });

  // Generator specs states
  const [genSpecs, setGenSpecs] = useState({
    name: 'مولد الميدان الأهلي الكبير',
    brand: 'كاتربيلر موتورز أورجينال (Caterpillar)',
    powerKVA: '350',
    fuelCapacity: '2000'
  });

  // Receipt customize states
  const [receiptMeta, setReceiptMeta] = useState({
    title: 'نظام مولدتي للخدمات الأهلية',
    firm: 'شركة الحلول المتميزة المحدودة',
    phone: '07701234567',
    footer: 'شكراً لالتزامكم بالتسديد الشهري.'
  });

  // Backup states
  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [showBackupArea, setShowBackupArea] = useState(false);

  // Printer settings states
  const [printerState, setPrinterState] = useState(blePrinter.state);
  const [customServiceUuid, setCustomServiceUuidState] = useState(blePrinter.getCustomServiceUuid() || '');
  const [customCharUuid, setCustomCharUuidState] = useState(blePrinter.getCustomCharacteristicUuid() || '');

  const handleSaveCustomUuids = () => {
    blePrinter.setCustomServiceUuid(customServiceUuid);
    blePrinter.setCustomCharacteristicUuid(customCharUuid);
    triggerToast('💾 تم حفظ معرفات البلوتوث المخصصة!', 'success');
  };

  useEffect(() => {
    const unsubscribe = blePrinter.subscribe((state) => {
      setPrinterState(state);
    });
    return unsubscribe;
  }, []);

  const handleConnectPrinter = async () => {
    const success = await blePrinter.connect();
    if (success) {
      triggerToast('🔌 تم اقتران وتوصيل الطابعة الحرارية بنجاح!', 'success');
    } else {
      triggerToast(blePrinter.state.error || 'فشلت عملية الاقتران بالطابعة المحددة', 'warning');
    }
  };

  const handleDisconnectPrinter = () => {
    blePrinter.disconnect();
    triggerToast('🔌 تم فصل الطابعة الحرارية الميدانية بأمان', 'info');
  };

  const handlePrintTest = async () => {
    const success = await blePrinter.printTestPage();
    if (success) {
      triggerToast('📬 تم إرسال قالب الاختبار بنجاح للطابعة الموصولة', 'success');
    } else {
      triggerToast('❌ فشل الاختبار، تأكد من شحن الطابعة وتوصيلها', 'warning');
    }
  };

  // Load custom configurations on mount
  useEffect(() => {
    // 1. Load prices
    const savedPrices = localStorage.getItem('price_config');
    if (savedPrices) {
      setPrices(JSON.parse(savedPrices));
    } else {
      // populate defaults to localStorage
      localStorage.setItem('price_config', JSON.stringify(prices));
    }

    // 2. Load specs
    const savedSpecs = localStorage.getItem('gen_specs');
    if (savedSpecs) {
      setGenSpecs(JSON.parse(savedSpecs));
    } else {
      localStorage.setItem('gen_specs', JSON.stringify(genSpecs));
    }

    // 3. Load receipt layout
    const rTitle = localStorage.getItem('receipt_title') || receiptMeta.title;
    const rFirm = localStorage.getItem('receipt_firm') || receiptMeta.firm;
    const rPhone = localStorage.getItem('receipt_phone') || receiptMeta.phone;
    const rFooter = localStorage.getItem('receipt_footer') || receiptMeta.footer;

    setReceiptMeta({
      title: rTitle,
      firm: rFirm,
      phone: rPhone,
      footer: rFooter
    });
  }, []);

  // Save changes wrapper
  const handleSavePrices = () => {
    localStorage.setItem('price_config', JSON.stringify(prices));
    triggerToast('تم حفظ التسعيرات الافتراضية الجديدة بنجاح', 'success');
  };

  const applyPricesToUnpaid = () => {
    // Modify all unpaid subscribers. Paid subscribers remain intact since their receipts are already written.
    setSubscribers(prev => prev.map(s => {
      if (s.status === 'unpaid') {
        const defaultPrice = prices[s.type] || s.pricePerAmp;
        return {
          ...s,
          pricePerAmp: defaultPrice,
          totalDue: s.amps * defaultPrice
        };
      }
      return s;
    }));
    triggerToast('تم تحديث فواتير جميع المشتركين (غير المسددين) طبقاً للتسعيرة المعدّلة!', 'success');
  };

  const handleSaveGenSpecs = () => {
    localStorage.setItem('gen_specs', JSON.stringify(genSpecs));
    triggerToast('تم تحديث البيانات الفنية للمولد في الخادم بنجاح', 'success');
  };

  const handleSaveReceiptMeta = () => {
    localStorage.setItem('receipt_title', receiptMeta.title);
    localStorage.setItem('receipt_firm', receiptMeta.firm);
    localStorage.setItem('receipt_phone', receiptMeta.phone);
    localStorage.setItem('receipt_footer', receiptMeta.footer);
    triggerToast('تم تحديث الترويسة المخصصة للوصولات المطبوعة بنجاح', 'success');
  };

  // Highly requested Monthly Reset - Resets everyone to unpaid, clears receipts list
  const triggerNewMonthlyCycle = () => {
    const confirmReset = window.confirm(
      "تحذير هام جداً: هل أنت متأكد من تصفير الحسابات لبدء شهر جديد؟\n\nهذا الإجراء سيقوم بـ:\n1. تعيين حالة جميع المشتركين الحالية إلى (غير مسدد).\n2. مسح تاريخ الوصولات لهذا الشهر لإفراغ سجل الجباية.\n3. تصفير إجمالي المبالغ التي جمعها المحاسبون الجباة.\n\nلا يمكن التراجع عن هذا الإجراء."
    );

    if (confirmReset) {
      // 1. Reset subscribers
      setSubscribers(prev => prev.map(s => ({
        ...s,
        status: 'unpaid',
        lastPaymentDate: undefined,
        invoiceNo: undefined,
        accountantId: undefined
      })));

      // 2. Clear receipts
      setReceipts([]);

      // 3. Reset total collected by accountants
      setAccountants(prev => prev.map(a => ({
        ...a,
        totalCollected: 0
      })));

      // Remove from localStorage as well
      localStorage.removeItem('my_generator_receipts');
      
      triggerToast('🟢 تم تصفير المنظومة بالكامل بنجاح! جاهزون للبدء بدورة الجباية للشهر الجديد.', 'success');
    }
  };

  // Full System Reset of local storage to original dummy data
  const handleSystemRestoreDefaults = () => {
    const confirmRestore = window.confirm(
      "هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة الافتراضية؟ سيتم شطب كافة المشتركين والمحاسبين الحاليين وإرجاع عيّنات المشتركين التجريبية."
    );

    if (confirmRestore) {
      localStorage.removeItem('my_generator_subscribers');
      localStorage.removeItem('my_generator_expenses');
      localStorage.removeItem('my_generator_accountants');
      localStorage.removeItem('my_generator_receipts');
      localStorage.removeItem('my_generator_active_acc');
      localStorage.removeItem('price_config');
      localStorage.removeItem('gen_specs');
      localStorage.removeItem('receipt_title');
      localStorage.removeItem('receipt_firm');
      localStorage.removeItem('receipt_phone');
      localStorage.removeItem('receipt_footer');

      setSubscribers(INITIAL_SUBSCRIBERS);
      setExpenses(INITIAL_EXPENSES);
      setAccountants(INITIAL_ACCOUNTANTS);
      setReceipts(INITIAL_RECEIPTS);
      
      // Reset local states to defaults
      setPrices({ ذهبي: 15000, تجاري: 12000, عادي: 10000 });
      setGenSpecs({
        name: 'مولد الميدان الأهلي الكبير',
        brand: 'كاتربيلر موتورز أورجينال (Caterpillar)',
        powerKVA: '350',
        fuelCapacity: '2000'
      });
      setReceiptMeta({
        title: 'نظام مولدتي للخدمات الأهلية',
        firm: 'شركة الحلول المتميزة المحدودة',
        phone: '07701234567',
        footer: 'شكراً لالتزامكم بالتسديد الشهري.'
      });

      triggerToast('🔄 تم مسح الكاش وإعادة تعيين منظومة محاكاة البيانات الافتراضية بنجاح.', 'success');
    }
  };

  // JSON Export
  const exportFullBackup = () => {
    const fullBackup = {
      subscribers,
      expenses,
      accountants,
      receipts,
      prices,
      genSpecs,
      receiptMeta
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    setBackupText(jsonStr);
    setShowBackupArea(true);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonStr);
    triggerToast('📋 تم نسخ كود النسخة الاحتياطية تلقائياً إلى الحافظة!', 'success');
  };

  // JSON Import
  const importFullBackup = () => {
    if (!importText.trim()) {
      triggerToast('يرجى لصق كود النسخة الاحتياطية أولاً في الحقل المخصص.', 'warning');
      return;
    }

    try {
      const parsed = JSON.parse(importText);
      
      if (parsed.subscribers) setSubscribers(parsed.subscribers);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.accountants) setAccountants(parsed.accountants);
      if (parsed.receipts) setReceipts(parsed.receipts);
      
      if (parsed.prices) {
        setPrices(parsed.prices);
        localStorage.setItem('price_config', JSON.stringify(parsed.prices));
      }
      if (parsed.genSpecs) {
        setGenSpecs(parsed.genSpecs);
        localStorage.setItem('gen_specs', JSON.stringify(parsed.genSpecs));
      }
      if (parsed.receiptMeta) {
        setReceiptMeta(parsed.receiptMeta);
        localStorage.setItem('receipt_title', parsed.receiptMeta.title);
        localStorage.setItem('receipt_firm', parsed.receiptMeta.firm);
        localStorage.setItem('receipt_phone', parsed.receiptMeta.phone);
        localStorage.setItem('receipt_footer', parsed.receiptMeta.footer);
      }

      triggerToast('🟢 تم استيراد واسترجاع المنظومة بكافة مشتركيها وبياناتها المالية بنجاح تام!', 'success');
      setImportText('');
    } catch (e) {
      triggerToast('❌ فشل الاستيراد: الكود الملصق غير صالح أو تالف! يرجى التأكد من الكود المنسوخ.', 'warning');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 select-none bg-slate-50 no-scrollbar pb-24">
      
      {/* 1. Header Banner */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-800 text-white p-6 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
        <div className="absolute top-2 left-2 opacity-10">
          <SettingsIcon className="w-40 h-40" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex py-1 px-3 rounded-full bg-white/20 text-[10px] font-bold gap-1 items-center mb-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>لوحة التحكم المتقدمة للإعدادات العامة</span>
          </div>
          <h3 className="text-base sm:text-lg font-black leading-tight">إعدادات وقواعد عمل المنظومة الرقمية</h3>
          <p className="text-[11px] text-blue-100 font-semibold mt-1">
            تتيح لك هذه اللوحة برمجة تسعيرات المولد، وتخصيص بيانات الوصول للمحاسبين وطباعة الإيصالات.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION A: Price Configurations */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800">برمجة تسعيرة الأمبير الافتراضية للخطوط</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">تحديث سعر الأمبير الافتراضي المستخدم عند احتساب الفواتير حسب نوع الاشتراك.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">الاشتراك الذهبي د.ع / أمبير</label>
              <input
                type="number"
                value={prices.ذهبي}
                onChange={(e) => setPrices({ ...prices, ذهبي: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">الاشتراك التجاري د.ع / أمبير</label>
              <input
                type="number"
                value={prices.تجاري}
                onChange={(e) => setPrices({ ...prices, تجاري: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">الخط العادي د.ع / أمبير</label>
              <input
                type="number"
                value={prices.عادي}
                onChange={(e) => setPrices({ ...prices, عادي: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSavePrices}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التسعيرات الافتراضية</span>
            </button>
            <button
              onClick={applyPricesToUnpaid}
              className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تطبيق على غير المسددين</span>
            </button>
          </div>
        </div>

        {/* SECTION B: Generator details */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800">بيانات ومعلومات المولد الفنية والتشغيلية</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">تحديث سعة المولد والمواصفات للربط بأجهزة قياس استهلاك المازوت التقديري.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">اسم المولد / الحي السكني</label>
              <input
                type="text"
                value={genSpecs.name}
                onChange={(e) => setGenSpecs({ ...genSpecs, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">ماركة المحرك والمولد</label>
              <input
                type="text"
                value={genSpecs.brand}
                onChange={(e) => setGenSpecs({ ...genSpecs, brand: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">الحجم والقدرة القصوى (KVA)</label>
              <input
                type="number"
                value={genSpecs.powerKVA}
                onChange={(e) => setGenSpecs({ ...genSpecs, powerKVA: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">سعة خزان الديزل الكلية (لتر)</label>
              <input
                type="number"
                value={genSpecs.fuelCapacity}
                onChange={(e) => setGenSpecs({ ...genSpecs, fuelCapacity: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveGenSpecs}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>تحديث بيانات المولد الفنية</span>
            </button>
          </div>
        </div>

        {/* SECTION C: Receipt Printing customizer */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800">بيانات وترويسة الوصولات والفواتير المطبوعة</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">تطبيع المعلومات التي تظهر على الفاتورة الحرارية الخاصة بالمشتركين عند الطباعة والمشاركة.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">مسمى ترويسة الوصل الرئيسي</label>
              <input
                type="text"
                value={receiptMeta.title}
                onChange={(e) => setReceiptMeta({ ...receiptMeta, title: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">الشركة المشغلة / الإدارة الرسمية</label>
              <input
                type="text"
                value={receiptMeta.firm}
                onChange={(e) => setReceiptMeta({ ...receiptMeta, firm: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">هاتف الاتصال للاستفسارات بالوصل</label>
              <div className="relative">
                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={receiptMeta.phone}
                  onChange={(e) => setReceiptMeta({ ...receiptMeta, phone: e.target.value })}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">رسالة التذييل أسفل الوصل المطبوع</label>
              <input
                type="text"
                value={receiptMeta.footer}
                onChange={(e) => setReceiptMeta({ ...receiptMeta, footer: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right font-semibold text-slate-600"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveReceiptMeta}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>تحديث وحفظ ترويسة الوصولات</span>
            </button>
          </div>
        </div>

        {/* SECTION C2: Portable Thermal BLE Printer Configuration */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bluetooth className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800">إعدادات الطابعة الحرارية المحمولة (BLE Bluetooth)</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">ربط النظام بطابعة فواتير حرارية ميدانية لاسلكية لطباعة الدفعات فورياً للمشتركين.</p>
            </div>
          </div>

          {/* Connection status display */}
          <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-right">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${printerState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}>
                <div className={`w-1.5 h-1.5 rounded-full bg-white`}></div>
              </div>
              <div>
                <p className="font-bold text-slate-800">حالة الاتصال بالطابعة</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {printerState.isConnected 
                    ? `متصل بالبلوتوث: ${printerState.deviceName}` 
                    : printerState.isConnecting 
                    ? 'جاري الاقتران وتهيئة الخدمات...' 
                    : 'الطابعة اللاسلكية غير متصلة حالياً'}
                </p>
              </div>
            </div>

            {printerState.isConnected ? (
              <button
                onClick={handleDisconnectPrinter}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-100 active:scale-95 transition-transform cursor-pointer shrink-0"
              >
                قطع الاتصال
              </button>
            ) : (
              <button
                onClick={handleConnectPrinter}
                disabled={printerState.isConnecting}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-[10.5px] rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-3xs shrink-0"
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>{printerState.isConnecting ? 'انتظار...' : 'اقتران لاسلكي'}</span>
              </button>
            )}
          </div>

          {/* Printer configuration details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">نوع بروتوكول الطباعة</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => blePrinter.setPrinterType('esc_pos')}
                  className={`py-1.5 px-1 text-center font-bold text-[9.5px] rounded-lg transition-all cursor-pointer ${
                    printerState.printerType === 'esc_pos'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-150'
                  }`}
                >
                  عمومي ESC/POS
                </button>
                <button
                  type="button"
                  onClick={() => blePrinter.setPrinterType('cat_printer')}
                  className={`py-1.5 px-1 text-center font-bold text-[9.5px] rounded-lg transition-all cursor-pointer ${
                    printerState.printerType === 'cat_printer'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-150'
                  }`}
                >
                  طابعة القطة (Cat)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">قياس عرض ورق الطابعة</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-xl font-semibold">
                <button
                  type="button"
                  disabled={printerState.printerType === 'cat_printer'}
                  onClick={() => blePrinter.setPaperWidth('58mm')}
                  className={`py-1.5 px-3 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${
                    printerState.paperWidth === '58mm'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-150 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  58 ملم (المحمولة)
                </button>
                <button
                  type="button"
                  disabled={printerState.printerType === 'cat_printer'}
                  onClick={() => blePrinter.setPaperWidth('80mm')}
                  className={`py-1.5 px-3 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${
                    printerState.paperWidth === '80mm'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-150 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  80 ملم (المكتبية)
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handlePrintTest}
                disabled={!printerState.isConnected}
                className="w-full py-2.5 px-3.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-105 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed border border-slate-200 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة صفحة اختبار حرارية</span>
              </button>
            </div>
          </div>

          {/* Advanced custom BLE configurations */}
          <div className="pt-3.5 border-t border-slate-100 space-y-2.5">
            <h5 className="text-[11px] font-black text-slate-705 text-slate-700">تخصيص منافذ وقنوات البلوتوث للطابعات النادرة أو المخصصة (اختياري):</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">معرّف الخدمة المخصصة (Custom Service UUID)</label>
                <input
                  type="text"
                  placeholder="مثال: 0000ffe0-0000-1000-8000-00805f9b34fb"
                  value={customServiceUuid}
                  onChange={(e) => setCustomServiceUuidState(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-left font-mono placeholder:text-slate-350 text-[10.5px]"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">معرّف خصيصة الكتابة المخصصة (Custom Characteristic UUID)</label>
                <input
                  type="text"
                  placeholder="مثال: 0000ffe1-0000-1000-8000-00805f9b34fb"
                  value={customCharUuid}
                  onChange={(e) => setCustomCharUuidState(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-left font-mono placeholder:text-slate-350 text-[10.5px]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {(customServiceUuid || customCharUuid) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomServiceUuidState('');
                    setCustomCharUuidState('');
                    blePrinter.setCustomServiceUuid(null);
                    blePrinter.setCustomCharacteristicUuid(null);
                    triggerToast('🧹 تم تصفير المعرّفات بنجاح، ستعتمد الطابعة الآن على الذكاء التلقائي', 'info');
                  }}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer"
                >
                  إعادة المعايرة للتلقائي
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveCustomUuids}
                className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10.5px] font-bold transition-all cursor-pointer border border-indigo-100"
              >
                تحديث وحفظ معرّفات البلوتوث المخصّصة
              </button>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl flex gap-2 items-start text-[10px] text-blue-900 leading-relaxed font-semibold text-right">
            <Radio className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-blue-950">ملاحظات التحضير والتشغيل عبر البلوتوث:</p>
              <ul className="list-disc pr-3.5 mt-0.5 space-y-0.5 text-blue-900">
                <li>شغّل طابعتك الحرارية وتأكد من أن مؤشر البلوتوث يعمل ويومض لتسهيل الاقتران.</li>
                <li>يدعم النظام ترميز الصور والوصولات التخطيطية الكاملة (Raster Graphics) سواء لبروتوكول ESC/POS القياسي أو طابعات القطة (Cat Printer / PeriPage / iPrint) مما يضمن طباعة ممتازة.</li>
                <li>إذا كانت طابعتك من نوع Cat Printer، فعّلها أعلاه ليقوم النظام بإرسال الأوامر المشفرة المخصصة للـ Cat Printer تلقائياً لضمان البدء السليم بالطباعة بنجاح!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION D: Month Reset and Backup tools */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RefreshCw className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-800">صيانة البيانات وتهيئة الدورة الشهرية الجديدة</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">لوحة تحكم إخلاء المنظومة وحذف قوائم القبض للشهر المنقضي وتهيئتها.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* New Month Reset Button */}
            <button
              onClick={triggerNewMonthlyCycle}
              className="py-3 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
            >
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
              <span>بدء دورة سداد جديدة (تصفير الشهر)</span>
              <span className="text-[8px] text-rose-100 font-normal">تصفير الوصولات وإرجاع المشتركين لغير مسدد</span>
            </button>

            {/* Restore defaults button */}
            <button
              onClick={handleSystemRestoreDefaults}
              className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Trash2 className="w-5 h-5 text-slate-500" />
              <span>إعادة تهيئة المنظومة لبيانات التجربة</span>
              <span className="text-[8px] text-slate-400 font-normal">استعادة نماذج المشتركين الافتراضية التجريبية</span>
            </button>
          </div>

          {/* Backup Panel Toggles */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="block text-[10px] font-bold text-slate-400">النسخ الاحتياطي والمزامنة اليدوية الميدانية</label>
            <div className="flex gap-2">
              <button
                onClick={exportFullBackup}
                className="flex-1 py-2 px-3 bg-slate-850 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span>تصدير نسخة احتياطية</span>
              </button>
              <button
                onClick={() => { setShowBackupArea(!showBackupArea); }}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>أدوات الكود</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* BACKUP / RESTORE EXPANSION TEXTAREAS */}
      {showBackupArea && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-4 animate-fade-in text-xs col-span-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Export box */}
            <div className="space-y-1">
              <span className="font-bold text-slate-700">كود النسخة الاحتياطية المصدرة (JSON):</span>
              <p className="text-[9px] text-slate-400">تم نسخ هذا النص إلى الحافظة تلقائياً. احفظه في ملف نصي خارجي للرجوع إليه لاحقاً.</p>
              <textarea
                value={backupText}
                readOnly
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full h-36 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px] outline-none text-left"
              />
            </div>

            {/* Import box */}
            <div className="space-y-1">
              <span className="font-bold text-slate-700">استيراد نسخة احتياطية محفوظة:</span>
              <p className="text-[9px] text-slate-400">ألصق كود النسخة الاحتياطية المصدرة مسبقاً داخل الحقل أدناه لاستعادتها فوراً.</p>
              <textarea
                placeholder='ألصق كود الـ JSON هنا للنسخة الاحتياطية...'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-36 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px] text-left"
              />
              <button
                onClick={importFullBackup}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <Upload className="w-4 h-4" />
                <span>تأكيد جلب واستعادة البيانات</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Credits section */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 text-center space-y-1">
        <span className="text-[9px] font-bold text-slate-400 block">نظام مولدتي لإدارة الطاقة الذكية • لإصدارات التابلت والجوال والويب</span>
        <span className="text-[10px] font-black text-blue-600/70 block">شركة الحلول المتميزة المحدودة للخدمات البرمجية © 2026</span>
      </div>

    </div>
  );
}
