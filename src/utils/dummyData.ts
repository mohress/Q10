/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Subscriber, Expense, Accountant, Receipt } from '../types';

export const INITIAL_ACCOUNTANTS: Accountant[] = [
  {
    id: 'acc_1',
    name: 'مروان طارق (المالك)',
    role: 'admin',
    username: 'marwan_owner',
    phone: '07701234567',
    totalCollected: 2450000,
    isActive: true,
  },
  {
    id: 'acc_2',
    name: 'حيدر جبار (محاسب الكرادة)',
    role: 'accountant',
    username: 'hayder_act',
    phone: '07812345678',
    totalCollected: 1650000,
    isActive: true,
  },
  {
    id: 'acc_3',
    name: 'ليث عبد الرحمن (محاسب زيونة)',
    role: 'accountant',
    username: 'laith_act',
    phone: '07901234567',
    totalCollected: 890000,
    isActive: true,
  }
];

export const INITIAL_SUBSCRIBERS: Subscriber[] = [
  {
    id: 'sub_1',
    name: 'أحمد جاسم الشمري',
    phone: '07715487965',
    address: 'الكرادة - محلة 903 - زقاق 12',
    type: 'ذهبي',
    amps: 10,
    pricePerAmp: 18000,
    totalDue: 180000,
    status: 'paid',
    lastPaymentDate: '2026-06-15',
    notes: 'خط ذهبي سريع الاستجابة - يسدد ببداية الشهر دائماً',
    accountantId: 'acc_2',
    invoiceNo: 'INV-2026-001',
    breakerNo: 'A-12',
    boardNo: 'بورد رئيسي 1'
  },
  {
    id: 'sub_2',
    name: 'علي حسين الدليمي',
    phone: '07802354678',
    address: 'الكرادة - قرب ساحة التحريات',
    type: 'عادي',
    amps: 6,
    pricePerAmp: 12000,
    totalDue: 72000,
    status: 'unpaid',
    notes: 'تقليل السلك الى 6 أمبير هذا الشهر بطلب منه',
    breakerNo: 'B-04',
    boardNo: 'بورد رئيسي 1'
  },
  {
    id: 'sub_3',
    name: 'أسواق النور التجارية',
    phone: '07721548483',
    address: 'الكرادة - الشارع العام - مجاور صيدلية دجلة',
    type: 'تجاري',
    amps: 25,
    pricePerAmp: 22000,
    totalDue: 550000,
    status: 'paid',
    lastPaymentDate: '2026-06-18',
    notes: 'خط تجاري ثلاثي الأطوار لإضاءة الثلاجات المستمرة',
    accountantId: 'acc_1',
    invoiceNo: 'INV-2026-002',
    breakerNo: 'C-25',
    boardNo: 'بورد تجاري 3'
  },
  {
    id: 'sub_4',
    name: 'أم محمد الفتلاوي',
    phone: '07504561234',
    address: 'الكرادة - محلة 905 - مقابل جامع الأورفلي',
    type: 'عادي',
    amps: 5,
    pricePerAmp: 10000,
    totalDue: 50000,
    status: 'unpaid',
    notes: 'تم تبليغها بالدفع قبل يوم 25 من الشهر',
    breakerNo: 'A-02',
    boardNo: 'بورد فرعي 5'
  },
  {
    id: 'sub_5',
    name: 'مصطفى كمال الراوي',
    phone: '07812233445',
    address: 'زيونة - الشارع الخدمي - عمارة الرافدين',
    type: 'ذهبي',
    amps: 15,
    pricePerAmp: 18000,
    totalDue: 270000,
    status: 'paid',
    lastPaymentDate: '2026-06-20',
    notes: 'شقة سكنية طابق ثالث - الدفع إلكتروني زين كاش',
    accountantId: 'acc_3',
    invoiceNo: 'INV-2026-003'
  },
  {
    id: 'sub_6',
    name: 'مكتبة ومطبعة بابل',
    phone: '07709876543',
    address: 'زيونة - قرب ملعب الشعب',
    type: 'تجاري',
    amps: 12,
    pricePerAmp: 22000,
    totalDue: 264000,
    status: 'unpaid',
    notes: 'محل تجاري - يفضل الدفع بعد العصر',
  },
  {
    id: 'sub_7',
    name: 'رعد سالم الخفاجي',
    phone: '07703344556',
    address: 'الكرادة - فرع محطة وقود أبو أقلام',
    type: 'عادي',
    amps: 8,
    pricePerAmp: 12000,
    totalDue: 96000,
    status: 'paid',
    lastPaymentDate: '2026-06-12',
    notes: 'مسدد بالكامل',
    accountantId: 'acc_2',
    invoiceNo: 'INV-2026-004'
  },
  {
    id: 'sub_8',
    name: 'ياسر سعدون البياتي',
    phone: '07834455667',
    address: 'زيونة - فرع أسواق المايا',
    type: 'عادي',
    amps: 4,
    pricePerAmp: 10000,
    totalDue: 40000,
    status: 'unpaid',
    notes: 'رقم هاتف بديل: 0771221144',
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    title: 'تجهيز وقود الديزل (كاز) - 1000 لتر',
    category: 'fuel',
    amount: 750000,
    date: '2026-06-10',
    quantity: 1000,
    notes: 'سعر اللتر 750 دينار عراقي - من مجهز معتمد مع النقل',
    registeredBy: 'مروان طارق (المالك)'
  },
  {
    id: 'exp_2',
    title: 'تبديل فلاتر ودهن المحرك الرئيسي (دويتس 500)',
    category: 'maintenance',
    amount: 180000,
    date: '2026-06-14',
    notes: 'دهن محرك ألماني أصلي عدد 2 جالون + فلتر كاز وفلتر دهن دبل',
    registeredBy: 'مروان طارق (المالك)'
  },
  {
    id: 'exp_3',
    title: 'راتب المشغل الفني (أبو جواد)',
    category: 'salary',
    amount: 450000,
    date: '2026-06-01',
    notes: 'راتب النصف الأول من شهر حزيران',
    registeredBy: 'مروان طارق (المالك)'
  },
  {
    id: 'exp_4',
    title: 'تأجير أرض نصب المولدة (محول الكرادة الثاني)',
    category: 'rent',
    amount: 300000,
    date: '2026-06-05',
    notes: 'الإيجار الشهري المتفق عليه لبلدية الكرادة',
    registeredBy: 'حيدر جبار (محاسب الكرادة)'
  },
  {
    id: 'exp_5',
    title: 'شراء كابلات توصيل نحاسية 25 ملم - 50 متر',
    category: 'maintenance',
    amount: 250000,
    date: '2026-06-16',
    notes: 'لتغذية فرع زقاق 23 بعد انقطاع الكيبل القديم',
    registeredBy: 'ليث عبد الرحمن (محاسب زيونة)'
  }
];

export const INITIAL_RECEIPTS: Receipt[] = [
  {
    id: 'rec_1',
    invoiceNo: 'INV-2026-001',
    subscriberId: 'sub_1',
    subscriberName: 'أحمد جاسم الشمري',
    subscriberPhone: '07715487965',
    subscriptionType: 'ذهبي',
    amps: 10,
    pricePerAmp: 18000,
    totalAmount: 180000,
    paymentDate: '2026-06-15 10:30',
    accountantName: 'حيدر جبار (محاسب الكرادة)',
    paymentMethod: 'نقدي'
  },
  {
    id: 'rec_2',
    invoiceNo: 'INV-2026-002',
    subscriberId: 'sub_3',
    subscriberName: 'أسواق النور التجارية',
    subscriberPhone: '07721548483',
    subscriptionType: 'تجاري',
    amps: 25,
    pricePerAmp: 22000,
    totalAmount: 550000,
    paymentDate: '2026-06-18 14:15',
    accountantName: 'مروان طارق (المالك)',
    paymentMethod: 'نقدي'
  },
  {
    id: 'rec_3',
    invoiceNo: 'INV-2026-003',
    subscriberId: 'sub_5',
    subscriberName: 'مصطفى كمال الراوي',
    subscriberPhone: '07812233445',
    subscriptionType: 'ذهبي',
    amps: 15,
    pricePerAmp: 18000,
    totalAmount: 270000,
    paymentDate: '2026-06-20 21:05',
    accountantName: 'ليث عبد الرحمن (محاسب زيونة)',
    paymentMethod: 'دفع إلكتروني'
  },
  {
    id: 'rec_4',
    invoiceNo: 'INV-2026-004',
    subscriberId: 'sub_7',
    subscriberName: 'رعد سالم الخفاجي',
    subscriberPhone: '07703344556',
    subscriptionType: 'عادي',
    amps: 8,
    pricePerAmp: 12000,
    totalAmount: 96000,
    paymentDate: '2026-06-12 11:40',
    accountantName: 'حيدر جبار (محاسب الكرادة)',
    paymentMethod: 'نقدي'
  }
];
