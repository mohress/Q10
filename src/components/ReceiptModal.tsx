/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Subscriber, Receipt } from '../types';
import { X, Printer, Check, Copy, Share2, Award, Zap, Bluetooth, RefreshCw, AlertCircle } from 'lucide-react';
import { blePrinter } from '../utils/blePrinter';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  onPrint?: () => void;
}

export default function ReceiptModal({ receipt, onClose, onPrint }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // BLE Printer states
  const [printerState, setPrinterState] = useState(blePrinter.state);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = blePrinter.subscribe((state) => {
      setPrinterState(state);
    });
    return unsubscribe;
  }, []);

  const handleBLEPrint = async () => {
    setIsPrinting(true);
    setPrintError(null);
    try {
      if (!printerState.isConnected) {
        const success = await blePrinter.connect();
        if (!success) {
          setPrintError(blePrinter.state.error || 'فشلت عملية الاقتران بالطابعة الحرارية.');
          setIsPrinting(false);
          return;
        }
      }

      // Print
      const printed = await blePrinter.printReceipt(receipt);
      if (!printed) {
        setPrintError(blePrinter.state.error || 'فشلت الطباعة، يرجى التحقق من اتصال البلوتوث وتوفر الورق في الطابعة.');
      }
    } catch (e: any) {
      setPrintError(e.message || 'حدث خطأ غير متوقع أثناء الطباعة.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Dynamic user configured values
  const receiptTitle = localStorage.getItem('receipt_title') || 'نظام مولدتي للخدمات الأهلية';
  const receiptFirm = localStorage.getItem('receipt_firm') || 'شركة الحلول المتميزة المحدودة';
  const receiptPhone = localStorage.getItem('receipt_phone') || '07701234567';
  const receiptFooter = localStorage.getItem('receipt_footer') || 'شكراً لالتزامكم بالتسديد الشهري.';

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      let iframe = document.getElementById('print-frame') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>وصل تسديد - ${receiptTitle}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
                body {
                  font-family: 'Cairo', sans-serif;
                  direction: rtl;
                  padding: 20px;
                  text-align: center;
                  color: #333;
                }
                .ticket {
                  max-width: 300px;
                  margin: 0 auto;
                  border: 1px dashed #666;
                  padding: 15px;
                }
                .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .sub-header { font-size: 11px; color: #666; margin-bottom: 8px; }
                .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; font-size: 13px; margin: 5px 0; }
                .row.bold { font-weight: bold; font-size: 15px; }
                .footer { font-size: 11px; color: #555; margin-top: 15px; font-weight: bold; }
                .barcode { font-family: monospace; font-size: 12px; margin-top: 10px; border: 1px solid #000; padding: 4px; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="ticket">
                <div class="header">${receiptTitle}</div>
                <div class="sub-header">${receiptFirm}</div>
                ${receiptPhone ? `<div class="sub-header">هاتف التنسيق: ${receiptPhone}</div>` : ''}
                <div class="divider"></div>
                <div class="row bold"><span>وصل استلام مالي</span> <span>مُسدد 🟢</span></div>
                <div class="row"><span>رقم الوصل:</span> <span>${receipt.invoiceNo}</span></div>
                <div class="row"><span>التاريخ:</span> <span>${receipt.paymentDate}</span></div>
                <div class="divider"></div>
                <div class="row"><span>اسم المشترك:</span> <span>${receipt.subscriberName}</span></div>
                <div class="row"><span>رقم الهاتف:</span> <span>${receipt.subscriberPhone}</span></div>
                <div class="row"><span>نوع الاشتراك:</span> <span>${receipt.subscriptionType}</span></div>
                <div class="row"><span>عدد الأمبيرات:</span> <span>${receipt.amps} أمبير</span></div>
                <div class="row"><span>سعر الأمبير:</span> <span>${receipt.pricePerAmp.toLocaleString()} د.ع</span></div>
                <div class="divider"></div>
                <div class="row bold"><span>المبلغ المدفوع:</span> <span>${receipt.totalAmount.toLocaleString()} د.ع</span></div>
                <div class="row"><span>طريقة الدفع:</span> <span>${receipt.paymentMethod}</span></div>
                <div class="row"><span>المستلم:</span> <span>${receipt.accountantName}</span></div>
                <div class="divider"></div>
                <p class="footer">${receiptFooter}</p>
                <div>
                  <div class="barcode">||||| |*| ${receipt.invoiceNo} |*||||||</div>
                </div>
                <div style="font-size: 9px; margin-top: 5px; color: #aaa;">نظام إدارة المولدات - شركة الحلول المتميزة EX</div>
              </div>
              <script>
                window.onload = function() {
                  window.focus();
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        doc.close();
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `رابط الوصل الإلكتروني لـ ${receipt.subscriberName}:\nرقم الوصل: ${receipt.invoiceNo}\nالمبلغ المفوع: ${receipt.totalAmount.toLocaleString()} د.ع\nتاريخ السداد: ${receipt.paymentDate}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm overflow-hidden bg-white rounded-2xl shadow-2xl transition-all border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header decoration */}
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 text-white p-4 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center mt-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-white shadow-md mb-2">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold">تم التسديد بنجاح!</h3>
            <p className="text-blue-100 text-xs mt-1">رقم الفاتورة: {receipt.invoiceNo}</p>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={receiptRef}>
          
          {/* Thermal-styled slip mock */}
          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 relative text-xs text-gray-700 font-sans leading-relaxed">
            
            {/* Top jagged bar design */}
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-transparent via-gray-200 to-transparent"></div>
            
            <div className="text-center space-y-1 mb-3">
              <div className="flex items-center justify-center gap-1 text-blue-600 font-bold text-sm">
                <Zap className="w-4 h-4 fill-blue-600 animate-pulse" />
                <span>{receiptTitle}</span>
              </div>
              <p className="text-gray-400 text-[10px]">{receiptFirm}</p>
              {receiptPhone && (
                <p className="text-gray-500 text-[9px] font-mono">هاتف الدعم: {receiptPhone}</p>
              )}
              <div className="border-b border-dashed border-gray-300 py-1"></div>
              <p className="font-semibold text-gray-800 text-sm mt-1">وصل استلام مالي (إلكتروني)</p>
            </div>

            {/* Basic details */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">اسم المودع/المشترك:</span>
                <span className="font-bold text-gray-900">{receipt.subscriberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رقم الهاتف:</span>
                <span className="font-mono text-gray-700">{receipt.subscriberPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">نوع الباقة الكهربائية:</span>
                <span className="font-semibold text-blue-700 px-1.5 py-0.5 bg-blue-50 rounded text-[10px]">{receipt.subscriptionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الأمبيرات المشترك بها:</span>
                <span className="font-mono font-bold text-gray-900">{receipt.amps} أمبير</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">السعر للأمبير الواحد:</span>
                <span className="font-mono text-gray-800">{receipt.pricePerAmp.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">طريقة التوصيل:</span>
                <span className="font-semibold text-gray-800">هوائي (سلك خارجي)</span>
              </div>
              
              <div className="border-t border-dashed border-gray-300 my-2 pt-2"></div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-800 font-bold">المبلغ المقبوض:</span>
                <span className="font-mono font-black text-emerald-600 text-[15px]">{receipt.totalAmount.toLocaleString()} دينار عراقي</span>
              </div>
              
              <div className="border-t border-dashed border-gray-300 my-2 pt-2"></div>

              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">تاريخ الدفع:</span>
                <span className="font-mono text-gray-700">{receipt.paymentDate}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">المحاسب المستلم:</span>
                <span className="text-gray-700">{receipt.accountantName}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">بوابة الدفع:</span>
                <span className="text-gray-700 font-semibold">{receipt.paymentMethod}</span>
              </div>
            </div>

            {/* Simulated barcode */}
            <div className="mt-4 text-center">
              <div className="inline-block p-1 bg-white border border-gray-200 rounded">
                <div className="h-7 w-48 bg-repeating-linear-to-r from-black to-black bg-[size:10px_100%] mx-auto opacity-80" 
                     style={{ backgroundImage: 'linear-gradient(90deg, #000 0%, #000 7%, transparent 7%, transparent 15%, #000 15%, #000 30%, transparent 30%, transparent 40%, #000 40%, #000 45%, transparent 45%, transparent 55%, #000 55%, #000 70%, transparent 70%, transparent 80%, #000 80%, #000 100%)' }}>
                </div>
                <p className="text-[9px] font-mono tracking-widest text-gray-500 mt-1">{receipt.invoiceNo}</p>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-400 mt-3 pt-2 border-t border-dashed border-gray-200">
              <p>{receiptFooter}</p>
              <p className="font-semibold text-blue-600/70 mt-0.5">نظام إدارة المولدات - شركة الحلول المتميزة EX</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 p-3 bg-blue-50 text-blue-800 rounded-xl text-xs">
            <Award className="w-5 h-5 flex-shrink-0 text-blue-600" />
            <p>يساعد هذا الوصل الرقمي على توفير 150 لتر كابون سنوي من الورق غير القابل لإعادة التدوير.</p>
          </div>

          {/* Real-time printing alerts */}
          {isIframe && (
            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-250 rounded-xl text-[11px] flex gap-2 text-right">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="font-extrabold text-amber-950">تنويه هام للطباعة الحرارية:</p>
                <p className="mt-0.5 text-amber-900 font-medium leading-relaxed">
                  أنت تتصفح التطبيق من داخل إطار معزول (iFrame). ولقيود المتصفحات الأمنية، يرجى بالضغط على الرابط في شريط المتصفح لفتح التطبيق في <strong>علامة تبويب كاملة ومستقلة</strong> لتتمكن من الاقتران والطباعة الحرارية بالبلوتوث بنجاح.
                </p>
                <p className="mt-1 font-bold text-indigo-700">
                  ⚡ حالياً، زر "طباعة النظام (عادية)" يعمل بشكل كامل وبدون قيود!
                </p>
              </div>
            </div>
          )}

          {printError && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-[11px] flex items-start gap-2 animate-fade-in text-right">
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">تنبيه أثناء طباعة تذكرة BLE:</p>
                <p className="text-rose-950 mt-0.5">{printError}</p>
              </div>
            </div>
          )}

          {isPrinting && (
            <div className="p-3 bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-xl text-[11.5px] flex flex-col gap-2.5 animate-pulse text-right">
              <div className="flex items-start gap-2.5">
                <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">{printerState.statusMessage || 'جاري رسم الفاتورة والإرسال للطابعة...'}</p>
                  <p className="text-indigo-950 text-[10px] mt-0.5 font-medium">يرجى ترك الجهاز قريباً من غطاء الطابعة الحرارية وتأكد من تشغيل الورق.</p>
                </div>
              </div>
              {typeof printerState.progress === 'number' && printerState.progress > 0 && (
                <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden mt-1">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${printerState.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Receipt actions (Not printable) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3 no-print">
          
          {/* Primary Bluetooth Print Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleBLEPrint}
              disabled={isPrinting}
              className={`py-3 px-3.5 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-97 transition-all ${
                printerState.isConnected 
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-3xs' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Bluetooth className={`w-4 h-4 ${isPrinting ? 'animate-spin' : ''}`} />
              <span>
                {isPrinting 
                  ? 'جاري إرسال البيانات...' 
                  : printerState.isConnected 
                  ? 'طباعة حرارية فورية ⚡' 
                  : 'اقتران وطباعة حرارية (BLE)'}
              </span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="py-3 px-3.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-97 transition-all"
            >
              <Printer className="w-4 h-4 text-gray-500" />
              <span>طباعة النظام (عادية)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center py-2.5 px-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 ml-1.5" />
                  تم نسخ الفاتورة
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ml-1.5 text-gray-500" />
                  نسخ نص الوصل
                </>
              )}
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center py-2.5 px-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer text-xs font-semibold"
            >
              <Share2 className="w-4 h-4 ml-1.5 text-gray-500" />
              مشاركة الوصل
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
