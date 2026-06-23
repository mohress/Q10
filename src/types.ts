/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionType = 'ذهبي' | 'تجاري' | 'عادي';

export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: SubscriptionType;
  amps: number;
  pricePerAmp: number; // in Iraqi Dinar (IQD)
  totalDue: number; // amps * pricePerAmp
  status: 'paid' | 'unpaid';
  lastPaymentDate?: string;
  notes?: string;
  accountantId?: string;
  invoiceNo?: string;
  breakerNo?: string; // رقم الجوزة
  boardNo?: string; // البورد
}

export type ExpenseCategory = 'fuel' | 'maintenance' | 'salary' | 'rent' | 'other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number; // in IQD
  date: string;
  quantity?: number; // e.g. liters of fuel
  notes?: string;
  registeredBy: string; // Accountant or Admin name
}

export interface Accountant {
  id: string;
  name: string;
  role: 'admin' | 'accountant';
  username: string;
  phone: string;
  totalCollected: number;
  isActive: boolean;
}

export interface Receipt {
  id: string;
  invoiceNo: string;
  subscriberId: string;
  subscriberName: string;
  subscriberPhone: string;
  subscriptionType: SubscriptionType;
  amps: number;
  pricePerAmp: number;
  totalAmount: number;
  paymentDate: string;
  accountantName: string;
  paymentMethod: 'نقدي' | 'دفع إلكتروني';
}

export interface DashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  paidSubscribers: number;
  unpaidSubscribers: number;
  totalDueAmount: number;
  totalCollectedAmount: number;
  totalExpenses: number;
  netProfit: number;
  fuelLevel: number; // percentage 0 - 100
  fuelLitersRemaining: number;
}
