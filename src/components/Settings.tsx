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

  // Custom transmission and rendering states
  const [chunkSize, setChunkSizeState] = useState(blePrinter.state.chunkSize);
  const [chunkDelay, setChunkDelayState] = useState(blePrinter.state.chunkDelay);
  const [contrastThreshold, setContrastThresholdState] = useState(blePrinter.state.contrastThreshold);
  const [ditheringEnabled, setDitheringEnabledState] = useState(blePrinter.state.ditheringEnabled);

  const handleSaveCustomUuids = () => {
    blePrinter.setCustomServiceUuid(customServiceUuid);
    blePrinter.setCustomCharacteristicUuid(customCharUuid);
    triggerToast('💾 تم حفظ معرفات البلوتوث المخصصة!', 'success');
  };

  useEffect(() => {
    const unsubscribe = blePrinter.subscribe((state) => {
      setPrinterState(state);
      // Synchronize state values locally
      setChunkSizeState(state.chunkSize);
      setChunkDelayState(state.chunkDelay);
      setContrastThresholdState(state.contrastThreshold);
      setDitheringEnabledState(state.ditheringEnabled);
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

  const handleStartScan = async () => {
    await blePrinter.startScanning();
    triggerToast('🔍 جاري البحث عن الأجهزة القريبة والمقترنة...', 'info');
  };

  const handleStopScan = () => {
    blePrinter.stopScanning();
    triggerToast('🛑 تم إيقاف عملية البحث عن الأجهزة', 'info');
  };

  const handleConnectSpecific = async (device: any) => {
    const success = await blePrinter.connectToSpecificDevice(device);
    if (success) {
      triggerToast(`🔌 تم توصيل الطابعة: ${device.name} بنجاح!`, 'success');
    } else {
      triggerToast(blePrinter.state.error || 'فشلت عملية التوصيل بالطابعة المحددة', 'warning');
    }
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
              <h4 className="text-xs sm:text-sm font-black text-slate-800">إعدادات الطابعة الحرارية ونظام الوصولات الميداني</h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">تهيئة البرنامج للعمل مع طابعات الفواتير المحمولة واللاسلكية لطباعة الدفعات فورياً للمشتركين.</p>
            </div>
          </div>

          {/* Default Print Action Configuration */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
            <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
              <span>●</span> طريقة الطباعة الافتراضية عند إصدار الإيصالات:
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  blePrinter.setDefaultPrintMethod('browser');
                  triggerToast('🔌 تم تحديد طباعة الويب الذكية كخيار افتراضي لمعالجة الفواتير.', 'success');
                }}
                className={`p-3 text-right rounded-xl border flex flex-col justify-between transition-all cursor-pointer active:scale-98 ${
                  printerState.defaultPrintMethod === 'browser'
                    ? 'bg-blue-50/70 border-blue-400 text-blue-900 shadow-3xs ring-2 ring-blue-500/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="font-extrabold text-[11.5px] flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex items-center justify-center border ${printerState.defaultPrintMethod === 'browser' ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-400'}`}>
                      {printerState.defaultPrintMethod === 'browser' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                    </span>
                    طباعة الويب عبر المتصفح (توافق 100%)
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-semibold">
                    الخيار الأكثر ثباتاً وسرعة. يعمل بضغطة واحدة من أي هاتف (iPhone، Android) أو حاسوب دون أي اقتران معقد. يدعم كافة أنواع الطابعات وتغيير مقاسات الورق (58mm / 80mm).
                  </p>
                </div>
                <span className="text-[9px] font-bold text-blue-600/80 mt-2 block bg-blue-100/50 px-2 py-0.5 rounded-lg w-fit">موصى به لمتصفحات المحمول 📱</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  blePrinter.setDefaultPrintMethod('ble');
                  triggerToast('⚡ تم تفعيل نقل البيانات الحراري المباشر (Web BLE Printer) كخيار افتراضي.', 'success');
                }}
                className={`p-3 text-right rounded-xl border flex flex-col justify-between transition-all cursor-pointer active:scale-98 ${
                  printerState.defaultPrintMethod === 'ble'
                    ? 'bg-indigo-50/70 border-indigo-400 text-indigo-900 shadow-3xs ring-2 ring-indigo-500/10'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="font-extrabold text-[11.5px] flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex items-center justify-center border ${printerState.defaultPrintMethod === 'ble' ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-slate-400'}`}>
                      {printerState.defaultPrintMethod === 'ble' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                    </span>
                    طباعة بلوتوث حرارية مباشرة (Web BLE API)
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-semibold">
                    اتصال لاسلكي مباشر لترجمة وتغذية الأسطر الرسومية للطابعة عبر البلوتوث. (يتطلب متصفح Chrome أو متصفح يدعم البلوتوث، ويعمل خارج نافذة المعاينة iFrame).
                  </p>
                </div>
                <span className="text-[9px] font-bold text-indigo-600/80 mt-2 block bg-indigo-100/50 px-2 py-0.5 rounded-lg w-fit">مناسب لطابعات الفواتير الصينية المحمولة ⚡</span>
              </button>
            </div>
          </div>

          {/* Connection status display */}
          <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
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
                    : printerState.isScanning
                    ? 'جاري البحث عن أجهزة البلوتوث...'
                    : 'الطابعة اللاسلكية غير متصلة حالياً'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {printerState.isConnected ? (
                <button
                  onClick={handleDisconnectPrinter}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] rounded-xl border border-rose-100 active:scale-95 transition-transform cursor-pointer shrink-0"
                >
                  قطع الاتصال
                </button>
              ) : (
                <>
                  {printerState.isScanning ? (
                    <button
                      type="button"
                      onClick={handleStopScan}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10.5px] rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-3xs shrink-0"
                    >
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                      <span>إيقاف البحث 🛑</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartScan}
                      disabled={printerState.isConnecting}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-[10.5px] rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-3xs shrink-0"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>{printerState.isConnecting ? 'انتظار...' : 'بحث واقتران يدوي'}</span>
                    </button>
                  )}
                  
                  {!printerState.isScanning && (
                    <button
                      type="button"
                      onClick={handleConnectPrinter}
                      disabled={printerState.isConnecting}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-800 font-bold text-[10.5px] rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer shrink-0"
                    >
                      اقتران الويب التلقائي
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Discovered devices selection list */}
          {(printerState.isScanning || (printerState.discoveredDevices && printerState.discoveredDevices.length > 0)) && (
            <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 text-right space-y-3 animate-fade-in">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-150">
                <span className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    {printerState.isScanning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  أجهزة البلوتوث المكتشفة والمقترنة ({printerState.discoveredDevices.length})
                </span>
                {printerState.isScanning && (
                  <span className="text-[10px] font-mono text-indigo-600 font-bold animate-pulse">جاري البحث...</span>
                )}
              </div>

              {printerState.discoveredDevices.length === 0 ? (
                <div className="py-4 text-center text-slate-400 font-semibold text-[11px]">
                  {printerState.isScanning ? 'جاري البحث ورصد الإشارات قريباً...' : 'لم يتم العثور على أجهزة بلوتوث بعد.'}
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {printerState.discoveredDevices.map((device: any) => (
                    <div 
                      key={device.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between transition-all hover:border-indigo-300 hover:bg-indigo-50/10"
                    >
                      <div className="flex items-center gap-2 text-right">
                        <Bluetooth className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-extrabold text-[11px] text-slate-800">{device.name}</p>
                          <p className="font-mono text-[9px] text-slate-400 mt-0.5">{device.id}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConnectSpecific(device)}
                        disabled={printerState.isConnecting}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-[10px] rounded-lg cursor-pointer transition-colors shrink-0"
                      >
                        توصيل واقتران
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Connection progress loader */}
          {printerState.isConnecting && printerState.statusMessage && (
            <div className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 text-xs space-y-2 animate-pulse text-right">
              <div className="flex justify-between items-center text-[11px] font-bold text-indigo-950">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0"></span>
                  {printerState.statusMessage}
                </span>
                <span className="font-mono text-indigo-700 font-extrabold">{printerState.progress || 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${printerState.progress || 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Connection detailed error banner */}
          {printerState.error && (
            <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/50 text-xs space-y-2.5 text-right animate-fade-in">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none shrink-0 mt-0.5">⚠️</span>
                <div className="space-y-1.5 text-rose-950 w-full">
                  <p className="font-extrabold text-[11.5px] text-rose-800">تفاصيل وتوجيهات معالجة الخطأ:</p>
                  <p className="font-semibold leading-relaxed whitespace-pre-line text-rose-900 bg-white/70 p-3 rounded-xl border border-rose-100">
                    {printerState.error}
                  </p>
                </div>
              </div>
              {(printerState.error.includes('iframe') || printerState.error.includes('SecurityError') || printerState.error.includes('disallowed')) && (
                <div className="pt-1.5 flex flex-wrap gap-2 justify-end">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-xl shadow-3xs hover:shadow-2xs active:scale-98 transition-all flex items-center gap-1"
                  >
                    <span>فتح التطبيق في علامة تبويب جديدة 🔗</span>
                  </a>
                </div>
              )}
            </div>
          )}

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

          {/* Dynamic transmission & rendering calibration settings */}
          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-4">
            <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
              <span className="text-indigo-600">⚡</span> معايرة الرأس الحراري ونقل الحزم (Transmission Calibration):
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Chunk Size Control */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">حجم حزمة النقل (Chunk Size)</span>
                  <span className="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-800 font-extrabold">{chunkSize} Byte</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  step="10"
                  value={chunkSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setChunkSizeState(val);
                    blePrinter.setTransmissionParams(val, chunkDelay);
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                  حجم الحزمة النبضية بالبايت في كل دفعة. يُنصَح بـ **40 Byte** للطابعات التجارية الرخيصة لتجنب سقوط الأسطر أو اختفاء الأجزاء.
                </p>
              </div>

              {/* Chunk Delay Control */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">تأخير دفع الحزم (Packet Delay)</span>
                  <span className="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-800 font-extrabold">{chunkDelay} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={chunkDelay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setChunkDelayState(val);
                    blePrinter.setTransmissionParams(chunkSize, val);
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                  مدة الانتظار بالملي ثانية بين الدفعات. يُنصَح بـ **15 ms** لمنع حدوث غلق لقنوات GATT البكسلية على الهواتف الضعيفة.
                </p>
              </div>

              {/* Contrast Threshold Control */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">درجة التباين والوضوح (Contrast Threshold)</span>
                  <span className="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-800 font-extrabold">{contrastThreshold}</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="200"
                  step="5"
                  value={contrastThreshold}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setContrastThresholdState(val);
                    blePrinter.setRenderParams(val, ditheringEnabled);
                  }}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                  قيمة عتبة تحويل البكسلات الحرة للون الأسود بالكامل. القيمة الأقل تجعل الفاتورة فاتحة والخط نحيفاً، بينما القيمة الأعلى تجعله داكناً وممتلئاً.
                </p>
              </div>

              {/* Dithering Mode Toggle */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">تقنية معالجة التدرج الرسومي (Dithering)</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${ditheringEnabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {ditheringEnabled ? 'مفعّلة (Floyd-Steinberg)' : 'خيار التباين القاسي'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDitheringEnabledState(true);
                      blePrinter.setRenderParams(contrastThreshold, true);
                      triggerToast('🎨 تم تفعيل ميزة التدرج الرسومي Floyd-Steinberg فائقة الدقة لفواتير رائعة.', 'info');
                    }}
                    className={`flex-1 py-1.5 text-center font-bold rounded-lg cursor-pointer transition-all ${
                      ditheringEnabled 
                        ? 'bg-indigo-600 text-white shadow-3xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    تدريج فائق الدقة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDitheringEnabledState(false);
                      blePrinter.setRenderParams(contrastThreshold, false);
                      triggerToast('⚡ تم اختيار نمط التباين القاسي، وهو الأسرع والأكثر ملائمة للنصوص البسيطة.', 'info');
                    }}
                    className={`flex-1 py-1.5 text-center font-bold rounded-lg cursor-pointer transition-all ${
                      !ditheringEnabled 
                        ? 'bg-indigo-600 text-white shadow-3xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    تباين حاد (افتراضي)
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                  تساعد خوارزمية **Floyd-Steinberg** في تشتيت اللون لإعطاء الصور والرموز الرقمية واللوغات تدرجات دقيقة جداً ومتقاطعة على الورق الحراري.
                </p>
              </div>
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
