/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DashboardStats, Subscriber, Expense } from '../types';
import { 
  Zap, Users, DollarSign, Wallet, Gauge, Award, ChevronLeft, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Printer, AlertTriangle, HelpCircle, Landmark,
  DownloadCloud, X, Smartphone, Share2
} from 'lucide-react';

interface DashboardProps {
  stats: DashboardStats;
  onNavigate: (tab: string) => void;
  subscribers: Subscriber[];
  expenses: Expense[];
}

export default function Dashboard({ stats, onNavigate, subscribers, expenses }: DashboardProps) {
  // Play Store carousel mockup state
  const [activeSlide, setActiveSlide] = useState(0);

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('pwa_install_dismissed') === 'true';
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if or already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      setShowHowToModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  const carouselSlides = [
    {
      title: 'الاشتراكات والتحصيل',
      desc: 'دير اشتراكاتك ومشتركيك وسجل تسديداتهم بضغطة واحدة وبدقة متناهية.',
      badge: 'التحكم بالزبائن',
      color: 'from-blue-600 to-indigo-700',
      actionTab: 'subscribers',
      statText: 'تصدير كشوفات بي دي إف'
    },
    {
      title: 'تنظيم المصروفات المالي',
      desc: 'سجل مصروفات الوقود (الكاز)، الصيانة اليومية ومستحقات العاملين بكل سهولة.',
      badge: 'إدارة الصرفيات',
      color: 'from-blue-700 to-violet-800',
      actionTab: 'expenses',
      statText: 'مراقبة مستوى الكاز'
    },
    {
      title: 'بوابة الدفع الإلكتروني',
      desc: 'وفّر لزبائنك إمكانية تسديد القوائم المالية من خلال محافظ زين كاش وآسيا سيل أو الكي كارد.',
      badge: 'الدفع الإلكتروني',
      color: 'from-blue-800 to-sky-700',
      actionTab: 'payment',
      statText: 'تسديد مباشر من البيت'
    },
    {
      title: 'إدارة ورقابة المحاسبين',
      desc: 'تابع نشاط كافة الجباة والمحاسبين الميدانيين لحظة بلحظة واعرف مبالغ التحصيل لكل منهم.',
      badge: 'الحوكمة والمراقبة',
      color: 'from-indigo-600 to-blue-900',
      actionTab: 'accountants',
      statText: 'تقارير الأداء المالي'
    }
  ];

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev === carouselSlides.length - 1 ? 0 : prev + 1));
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? carouselSlides.length - 1 : prev - 1));
  };

  // Calculations for custom SVG charts
  const totalSubscribers = subscribers.length;
  const paidCount = subscribers.filter(s => s.status === 'paid').length;
  const unpaidCount = totalSubscribers - paidCount;
  const paidPercentage = totalSubscribers > 0 ? Math.round((paidCount / totalSubscribers) * 100) : 0;

  // Expenses distribution for chart
  const fuelExpenses = expenses.filter(e => e.category === 'fuel').reduce((acc, curr) => acc + curr.amount, 0);
  const maintenanceExpenses = expenses.filter(e => e.category === 'maintenance').reduce((acc, curr) => acc + curr.amount, 0);
  const salaryExpenses = expenses.filter(e => e.category === 'salary').reduce((acc, curr) => acc + curr.amount, 0);
  const otherExpenses = expenses.filter(e => e.category === 'rent' || e.category === 'other').reduce((acc, curr) => acc + curr.amount, 0);
  const totalCategoryExpenses = fuelExpenses + maintenanceExpenses + salaryExpenses + otherExpenses;

  // Fuel bar chart heights
  const fuelHeight = Math.max(10, Math.min(stats.fuelLevel, 100));

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 sm:pb-8 select-none">
      
      {/* Top Gradient Hero Box (Matching mobile design from screenshots) */}
      <div className="bg-linear-to-b from-blue-700 via-blue-800 to-indigo-900 text-white px-5 pt-6 pb-20 rounded-b-[38px] shadow-lg relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">لوحة الإحصائيات الفنية</p>
              <h2 className="text-base font-black">مولدة الكرادة الكهربائية (500KVA)</h2>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] rounded-full font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            جاهز ومستقر
          </span>
        </div>

        {/* Big Financial Overview Widget inside Hero */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-blue-200 font-medium">صافي الأرباح المقدّرة لهذا الشهر</p>
          <h1 className="text-3xl font-black tracking-tight mt-1">
            {stats.netProfit.toLocaleString()} <span className="text-xs font-bold text-blue-200">د.ع</span>
          </h1>
          <p className="text-[10px] text-emerald-300 mt-1 font-semibold flex items-center justify-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            ارتفاع المداخيل بنسبة 12% عن الشهر الماضي
          </p>
        </div>
      </div>

      {/* Floating Fast Stats Grid (overlapping the hero background) */}
      <div className="px-4 -mt-14 grid grid-cols-2 gap-3 mb-6">
        
        {/* Total Collected */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold">المقبوضات</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-gray-400 font-bold">المبالغ المستلمة</p>
            <h3 className="text-sm font-black text-gray-950 mt-1">{stats.totalCollectedAmount.toLocaleString()} د.ع</h3>
          </div>
        </div>

        {/* Expenses total */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="p-1.5 bg-red-50 text-red-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md font-bold">المصروفات</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-gray-400 font-bold">إجمالي المصاريف</p>
            <h3 className="text-sm font-black text-gray-950 mt-1">{stats.totalExpenses.toLocaleString()} د.ع</h3>
          </div>
        </div>

        {/* Total Subscribers */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold">المشتركون</span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-gray-400 font-bold">العدد الكلي للزبائن</p>
            <h3 className="text-sm font-black text-gray-950 mt-1">{totalSubscribers} مشترك</h3>
          </div>
        </div>

        {/* Fuel Indicator Gauge */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
              <Gauge className="w-5 h-5" />
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
              stats.fuelLevel < 30 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {stats.fuelLevel < 30 ? 'كاز منخفض!' : 'كاز مستقر'}
            </span>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mb-1">
              <span>مخزون الكاز</span>
              <span className="text-gray-950 font-black">{stats.fuelLevel}%</span>
            </div>
            {/* Custom Simple Fuel Bar Gauge */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  stats.fuelLevel < 30 ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${fuelHeight}%` }}
              ></div>
            </div>
            <p className="text-[9px] text-gray-400 mt-1 font-semibold">{stats.fuelLitersRemaining.toLocaleString()} لتر متبقي</p>
          </div>
        </div>
      </div>

      {/* PWA Installer Action Box */}
      {!isInstalled && !isDismissed && (
        <div className="px-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 text-white p-4.5 rounded-[28px] shadow-xs relative overflow-hidden">
            {/* Ambient pattern */}
            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <DownloadCloud className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">تثبيت التطبيق على الشاشة الرئيسية كـ PWA</h4>
                  <p className="text-[10px] text-slate-300 mt-1 leading-relaxed max-w-[240px]">
                    احصل على التطبيق كأنه تطبيق هاتف أصلي مع دعم المحاذاة الشاملة والعمل السريع مئة بالمئة أوفلاين.
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDismiss} 
                className="p-1 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-xl shadow-xs active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>تثبيت التطبيق الآن</span>
              </button>
              
              <button
                onClick={() => setShowHowToModal(true)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold text-[10px] rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                طريقة التثبيت يدوياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA How to Install Modal */}
      {showHowToModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-gray-950">كيفية تثبيت نظام مولدتي</h3>
              </div>
              <button 
                onClick={() => setShowHowToModal(false)}
                className="p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-right">
              <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-2xl">
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">التحميل والتشغيل</span>
                <p className="text-xs font-bold text-blue-900 mt-1.5 leading-relaxed">
                  طريقة الإضافة الفورية لأيقونة التطبيق على شاشتك لتشغيله كصيغة PWA مريحة وسريعة.
                </p>
              </div>

              {/* iOS Safari */}
              <div className="space-y-1">
                <h4 className="text-xs font-black text-indigo-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                  على هواتف آيفون (iOS Safari):
                </h4>
                <ul className="text-[11px] text-gray-600 space-y-1 list-disc pr-4 mt-1 font-medium">
                  <li>اضغط على زر <strong className="text-slate-900">مشاركة (Share) <Share2 className="inline-block w-3.5 h-3.5 text-blue-500" /></strong> في الأسفل.</li>
                  <li>اختر <strong className="text-slate-900">إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</li>
                  <li>اضغط على <strong className="text-slate-900">إضافة (Add)</strong> في الزاوية العلوية.</li>
                </ul>
              </div>

              {/* Android Chrome */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  على هواتف أندرويد (Google Chrome):
                </h4>
                <ul className="text-[11px] text-gray-600 space-y-1 list-disc pr-4 mt-1 font-medium">
                  <li>اضغط على زر <strong className="text-slate-900">"تثبيت التطبيق الآن"</strong> أعلاه.</li>
                  <li>أو من خلال <strong className="text-slate-900">النقاط الثلاث (Menu)</strong> لـ Chrome في الأعلى.</li>
                  <li>اختر <strong className="text-slate-900">تثبيت التطبيق (Install App)</strong> أو إضافة لشاشة الهاتف.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowHowToModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                فهمت، شكراً لك
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replicating Google Play Listing Store Showcase Carousel */}
      <div className="px-4 mb-6">
        <h3 className="text-xs font-black text-gray-900 mb-2 mr-1">خصائص ومميزات نظام مولدتي الأوتوماتيكي</h3>
        
        <div className={`relative overflow-hidden rounded-3xl bg-linear-to-r ${carouselSlides[activeSlide].color} text-white p-5 shadow-sm`}>
          <span className="absolute top-4 left-4 text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase">
            {carouselSlides[activeSlide].badge}
          </span>
          
          <p className="text-[10px] text-blue-100 font-bold tracking-widest uppercase">الخصائص المتاحة</p>
          <h2 className="text-base font-black mt-1">{carouselSlides[activeSlide].title}</h2>
          <p className="text-xs text-blue-50 mt-1 leading-relaxed min-h-[48px]">{carouselSlides[activeSlide].desc}</p>
          
          {/* Action indicator */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => onNavigate(carouselSlides[activeSlide].actionTab)}
              className="px-3.5 py-1.5 bg-white text-blue-900 font-black text-[11px] rounded-xl shadow-xs transition-transform transform active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>افتح القسم الآن</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-blue-200/90 font-mono tracking-widest">{carouselSlides[activeSlide].statText}</span>
          </div>

          {/* Navigation Arrows for slide */}
          <div className="absolute right-4 top-4 flex gap-1 bg-black/10 rounded-full p-0.5">
            <button onClick={handlePrevSlide} className="p-0.5 hover:bg-white/20 rounded-full cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={handleNextSlide} className="p-0.5 hover:bg-white/20 rounded-full cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics & Custom SVG Charts Block */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        
        {/* Collection & Payment Rate Chart Card */}
        <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-gray-900">معدل التحصيل والوصولات</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">نسبة المشتركين المسددين لرسوم المولد لشهر حزيران</p>
          </div>

          <div className="my-4 flex items-center justify-center gap-6">
            
            {/* Custom SVG Ring Pie/Donut Chart */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="#f3f4f6"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="#2563eb"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - paidCount / totalSubscribers)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-gray-950 font-mono">{paidPercentage}%</span>
                <span className="text-[8px] text-gray-400 font-bold">مسددين</span>
              </div>
            </div>

            {/* Legend info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-semibold leading-none">مدفوعة</p>
                  <p className="text-xs font-bold font-mono text-gray-950">{paidCount} مشترك</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200"></span>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-semibold leading-none">مطلوبين</p>
                  <p className="text-xs font-bold font-mono text-gray-950">{unpaidCount} مشترك</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-blue-700 font-bold cursor-pointer hover:underline" onClick={() => onNavigate('subscribers')}>
            <span>عرض قائمة المطلوبين بالدفع</span>
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Expenses Distribution representation */}
        <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-gray-900">توزيع الصرفيات والنفقات</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">كيفية إنفاق الميزانية لتشغيل المولدات</p>
          </div>

          {/* Simple Custom Stacked Bar Visualizer */}
          <div className="my-3 space-y-2.5">
            
            {/* Category 1: Fuel */}
            <div>
              <div className="flex justify-between text-[10px] mb-1 font-semibold">
                <span className="text-gray-500 font-bold">شراء كاز (الوقود)</span>
                <span className="text-gray-800 font-mono font-bold">
                  {fuelExpenses.toLocaleString()} د.ع ({totalCategoryExpenses > 0 ? Math.round((fuelExpenses / totalCategoryExpenses) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalCategoryExpenses > 0 ? (fuelExpenses / totalCategoryExpenses) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Category 2: Salaries */}
            <div>
              <div className="flex justify-between text-[10px] mb-1 font-semibold">
                <span className="text-gray-500 font-bold">رواتب وأجور العمال</span>
                <span className="text-gray-800 font-mono font-bold">
                  {salaryExpenses.toLocaleString()} د.ع ({totalCategoryExpenses > 0 ? Math.round((salaryExpenses / totalCategoryExpenses) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${totalCategoryExpenses > 0 ? (salaryExpenses / totalCategoryExpenses) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Category 3: Maintenance */}
            <div>
              <div className="flex justify-between text-[10px] mb-1 font-semibold">
                <span className="text-gray-500 font-bold">الصيانة الوقائية والقطع</span>
                <span className="text-gray-800 font-mono font-bold">
                  {maintenanceExpenses.toLocaleString()} د.ع ({totalCategoryExpenses > 0 ? Math.round((maintenanceExpenses / totalCategoryExpenses) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${totalCategoryExpenses > 0 ? (maintenanceExpenses / totalCategoryExpenses) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-amber-700 font-bold cursor-pointer hover:underline" onClick={() => onNavigate('expenses')}>
            <span>تسجيل مصروفات تشغيل جديدة</span>
            <ChevronLeft className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Bottom Legal Company Footer matching screenshots credits */}
      <div className="px-5 text-center mt-4">
        <div className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold bg-white px-4 py-2 rounded-full border border-gray-100 shadow-3xs">
          <Landmark className="w-3.5 h-3.5 text-blue-500" />
          <span>برمجة وتطوير وكلاء شركة الحلول المتميزة المعتمدين © 2026</span>
        </div>
      </div>

    </div>
  );
}
