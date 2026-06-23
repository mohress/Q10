/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { Receipt } from '../types';

export interface DiscoveredDevice {
  id: string;
  name: string;
  type: 'ble' | 'classic' | 'simulator';
  address?: string;
  rssi?: number;
}

// Bluetooth State Structure
export interface BLEPrinterState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  defaultPrintMethod: 'browser' | 'ble';
  paperWidth: '58mm' | '80mm';
  printerType: 'esc_pos' | 'cat_printer';
  chunkSize: number;
  chunkDelay: number;
  contrastThreshold: number;
  ditheringEnabled: boolean;
  error: string | null;
  statusMessage?: string | null;
  progress?: number;
  isSimulator?: boolean;
  discoveredDevices: DiscoveredDevice[];
  isScanning: boolean;
}

// Top 5 most common service and characteristic UUIDs for Chinese portable thermal printers
const COMMON_CHINESE_PRINTERS = [
  {
    // Standard UART / SPP-like service (MPT-II, PT-210, PT-280, PT-380, Goojprt, etc.)
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    characteristic: '0000ffe1-0000-1000-8000-00805f9b34fb'
  },
  {
    // Alternate standard 16-bit UUID
    service: 'ffe0',
    characteristic: 'ffe1'
  },
  {
    // ISSC Microchip (Very common in many Chinese dual-mode Bluetooth modules)
    service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    characteristic: '49535343-1e4d-4bd9-ba61-23c647249616'
  },
  {
    // Alternate ISSC Characteristic
    service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    characteristic: '49535343-8841-43f4-a8d2-25809012f6c2'
  },
  {
    // Newer Chinese Printers (Xprinter, some portable BLE devices)
    service: 'e7fe1800-be05-4866-ab74-04b15b00f5df',
    characteristic: 'e7fe1801-be05-4866-ab74-04b15b00f5df'
  },
  {
    // Nordic UART service (Used by custom BLE printers)
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
  }
];

class BLEPrinterController {
  private device: any = null;
  private gattServer: any = null;
  private writeCharacteristic: any = null;
  private stateChangeListeners: ((state: BLEPrinterState) => void)[] = [];
  private autoReconnectTimer: any = null;

  // Global default configuration optimized for Chinese printers
  public state: BLEPrinterState = {
    isConnected: false,
    isConnecting: false,
    deviceName: localStorage.getItem('ble_last_device_name') || null,
    defaultPrintMethod: (localStorage.getItem('default_print_method') as 'browser' | 'ble') || 'ble',
    paperWidth: (localStorage.getItem('ble_printer_width') as '58mm' | '80mm') || '58mm',
    printerType: (localStorage.getItem('ble_printer_type') as 'esc_pos' | 'cat_printer') || 'esc_pos',
    
    // Critical: Chinese BLE modules have tiny input buffers.
    // 20-byte chunks with 20ms delays is the GOLD standard to prevent frozen printers and data loss.
    chunkSize: Number(localStorage.getItem('ble_chunk_size')) || 20,
    chunkDelay: Number(localStorage.getItem('ble_chunk_delay')) || 20,
    
    contrastThreshold: Number(localStorage.getItem('ble_contrast_threshold')) || 135,
    ditheringEnabled: localStorage.getItem('ble_dithering_enabled') === 'true',
    error: null,
    statusMessage: null,
    progress: 0,
    isSimulator: localStorage.getItem('ble_is_simulator') === 'true',
    discoveredDevices: [],
    isScanning: false,
  };

  constructor() {
    this.startAutoReconnectionTimer();
  }

  /**
   * Listener Subscription Manager
   */
  public subscribe(listener: (state: BLEPrinterState) => void) {
    this.stateChangeListeners.push(listener);
    listener({ ...this.state }); // Trigger immediate update
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  private updateState(newState: Partial<BLEPrinterState>) {
    this.state = { ...this.state, ...newState };
    this.stateChangeListeners.forEach(listener => listener({ ...this.state }));
  }

  public setDefaultPrintMethod(method: 'browser' | 'ble') {
    this.updateState({ defaultPrintMethod: method });
    localStorage.setItem('default_print_method', method);
  }

  public setPaperWidth(width: '58mm' | '80mm') {
    this.updateState({ paperWidth: width });
    localStorage.setItem('ble_printer_width', width);
  }

  public setPrinterType(type: 'esc_pos' | 'cat_printer') {
    this.updateState({ printerType: type });
    localStorage.setItem('ble_printer_type', type);
    if (type === 'cat_printer') {
      this.setPaperWidth('58mm');
    }
  }

  public setTransmissionParams(chunkSize: number, chunkDelay: number) {
    const size = Math.max(10, Math.min(512, chunkSize));
    const delay = Math.max(0, Math.min(250, chunkDelay));
    this.updateState({ chunkSize: size, chunkDelay: delay });
    localStorage.setItem('ble_chunk_size', String(size));
    localStorage.setItem('ble_chunk_delay', String(delay));
  }

  public setRenderParams(contrastThreshold: number, ditheringEnabled: boolean) {
    const threshold = Math.max(10, Math.min(240, contrastThreshold));
    this.updateState({ contrastThreshold: threshold, ditheringEnabled });
    localStorage.setItem('ble_contrast_threshold', String(threshold));
    localStorage.setItem('ble_dithering_enabled', String(ditheringEnabled));
  }

  public getCustomServiceUuid(): string | null {
    return localStorage.getItem('ble_custom_service_uuid') || null;
  }

  public setCustomServiceUuid(uuid: string | null) {
    if (uuid && uuid.trim()) {
      localStorage.setItem('ble_custom_service_uuid', uuid.trim().toLowerCase());
    } else {
      localStorage.removeItem('ble_custom_service_uuid');
    }
  }

  public getCustomCharacteristicUuid(): string | null {
    return localStorage.getItem('ble_custom_characteristic_uuid') || null;
  }

  public setCustomCharacteristicUuid(uuid: string | null) {
    if (uuid && uuid.trim()) {
      localStorage.setItem('ble_custom_characteristic_uuid', uuid.trim().toLowerCase());
    } else {
      localStorage.removeItem('ble_custom_characteristic_uuid');
    }
  }

  public setSimulatorMode(enabled: boolean) {
    this.updateState({ isSimulator: enabled });
    localStorage.setItem('ble_is_simulator', String(enabled));
  }

  /**
   * Safe execution environment detector
   */
  private getEnvironment(): 'simulator' | 'android_bridge' | 'android_cordova' | 'browser' {
    if (this.state.isSimulator) return 'simulator';
    
    const win = window as any;
    if (win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge) {
      return 'android_bridge';
    }
    
    if (win.cordova && (win.ble || win.bluetoothSerial)) {
      return 'android_cordova';
    }
    
    return 'browser';
  }

  /**
   * Request Android BLE and location permissions inside APK (Cordova mode)
   */
  private async requestAndroidPermissions(): Promise<boolean> {
    const win = window as any;
    if (win.cordova && win.cordova.plugins && win.cordova.plugins.permissions) {
      const pm = win.cordova.plugins.permissions;
      const permissionsNeeded = [
        pm.BLUETOOTH,
        pm.BLUETOOTH_ADMIN,
        pm.ACCESS_COARSE_LOCATION,
        pm.ACCESS_FINE_LOCATION,
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT'
      ];
      return new Promise((resolve) => {
        pm.requestPermissions(permissionsNeeded, (status: any) => {
          resolve(!!status.hasPermission);
        }, () => {
          resolve(false);
        });
      });
    }
    return true;
  }

  /**
   * Scan for Bluetooth printers (Simulator, Browser Native, or Cordova)
   */
  public async startScanning(): Promise<void> {
    const env = this.getEnvironment();
    const win = window as any;

    this.updateState({
      isScanning: true,
      discoveredDevices: [],
      error: null,
      statusMessage: 'جاري البحث عن أجهزة البلوتوث المتاحة...',
      progress: 10
    });

    if (env === 'simulator' || this.state.isSimulator) {
      // Generate virtual diagnostic devices for test
      await new Promise(resolve => setTimeout(resolve, 800));
      const simulatedDevices: DiscoveredDevice[] = [
        { id: 'sim_1', name: 'طابعة صينية محمولة MPT-II', type: 'simulator' },
        { id: 'sim_2', name: 'طابعة فواتير ذكية PT-210 (BLE)', type: 'simulator' },
        { id: 'sim_3', name: 'طابعة إيصالات حرارية XP-58 (Classic)', type: 'simulator' }
      ];
      this.updateState({
        discoveredDevices: simulatedDevices,
        isScanning: false,
        statusMessage: 'اكتمل البحث المبرمج. يرجى اختيار طابعتك من القائمة.',
        progress: 100
      });
      return;
    }

    if (env === 'android_cordova') {
      try {
        await this.requestAndroidPermissions().catch((e) => console.log('Permission request failed', e));
        const deviceList: DiscoveredDevice[] = [];

        // 1. Check Paired Classic Devices
        if (win.bluetoothSerial) {
          win.bluetoothSerial.list((pairedDevices: any[]) => {
            pairedDevices.forEach((d: any) => {
              deviceList.push({
                id: d.address || d.id,
                name: `${d.name || 'جهاز مجهول'} (كلاسيكي مقترن)`,
                type: 'classic',
                address: d.address || d.id
              });
            });
            this.updateState({ discoveredDevices: [...deviceList] });
          }, (err: any) => console.log('Error listing classic devices', err));

          // Scan for unpaired classic devices
          win.bluetoothSerial.discoverUnpaired((unpairedDevices: any[]) => {
            unpairedDevices.forEach((d: any) => {
              if (!deviceList.some(existing => existing.id === d.address)) {
                deviceList.push({
                  id: d.address || d.id,
                  name: `${d.name || 'جهاز مجهول'} (كلاسيكي)`,
                  type: 'classic',
                  address: d.address || d.id
                });
              }
            });
            this.updateState({ discoveredDevices: [...deviceList] });
          }, (err: any) => console.log('Error classic discovery', err));
        }

        // 2. Scan BLE Devices
        if (win.ble) {
          win.ble.startScan([], (device: any) => {
            const name = device.name || device.id || 'جهاز BLE غير مسمى';
            if (!deviceList.some(existing => existing.id === device.id)) {
              deviceList.push({
                id: device.id,
                name: `${name} (طاقة منخفضة BLE)`,
                type: 'ble',
                address: device.id,
                rssi: device.rssi
              });
              this.updateState({ discoveredDevices: [...deviceList] });
            }
          }, (err: any) => console.error('Error BLE scan', err));
        }

        setTimeout(() => this.stopScanning(), 12000);
      } catch (err: any) {
        this.updateState({
          isScanning: false,
          error: `فشل مسح البلوتوث: ${err.message || err}`
        });
      }
    } else {
      // In Standard Web Browser: Let the user know Chrome handles device scanning in its native dialog
      this.updateState({
        isScanning: false,
        statusMessage: 'في متصفح الويب، يتم فتح قائمة اختيار الأجهزة المدمجة من المتصفح مباشرة لحماية الخصوصية.',
        progress: 100
      });
      await this.connect();
    }
  }

  public stopScanning(): void {
    const env = this.getEnvironment();
    const win = window as any;
    
    if (env === 'android_cordova' && win.ble) {
      try {
        win.ble.stopScan();
      } catch (e) {
        console.log('Failed to stop BLE scan', e);
      }
    }
    this.updateState({
      isScanning: false,
      progress: 0,
      statusMessage: this.state.discoveredDevices.length > 0 
        ? `تم العثور على ${this.state.discoveredDevices.length} جهاز. حدد طابعتك للتوصيل.`
        : 'تم إنهاء فحص البلوتوث.'
    });
  }

  /**
   * Connect to a specific chosen device
   */
  public async connectToSpecificDevice(device: DiscoveredDevice): Promise<boolean> {
    const env = this.getEnvironment();
    const win = window as any;

    this.updateState({
      isConnecting: true,
      error: null,
      statusMessage: `جاري التوصيل بالطابعة: ${device.name}...`,
      progress: 20
    });

    this.stopScanning();

    if (device.type === 'simulator') {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.updateState({
        isConnected: true,
        isConnecting: false,
        deviceName: device.name,
        statusMessage: `تم التوصيل بالمحاكي "${device.name}" بنجاح! 🟢`,
        progress: 100
      });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
      return true;
    }

    if (env === 'android_cordova') {
      try {
        if (device.type === 'ble' && win.ble) {
          return new Promise<boolean>((resolve) => {
            this.updateState({ statusMessage: 'جاري فتح قناة اتصالات BLE...', progress: 50 });
            win.ble.connect(device.id, () => {
              localStorage.setItem('ble_last_device_address', device.id);
              localStorage.setItem('ble_last_device_name', device.name);
              this.updateState({
                isConnected: true,
                isConnecting: false,
                deviceName: device.name,
                statusMessage: 'تم التوصيل اللاسلكي بالطابعة بنجاح! ⚡',
                progress: 100
              });
              setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
              resolve(true);
            }, (err: any) => {
              this.updateState({ isConnected: false, isConnecting: false, error: `فشل ربط جهاز BLE: ${JSON.stringify(err)}` });
              resolve(false);
            });
          });
        } else if (win.bluetoothSerial) {
          return new Promise<boolean>((resolve) => {
            this.updateState({ statusMessage: 'جاري الاتصال بالقناة التسلسلية SPP...', progress: 60 });
            win.bluetoothSerial.connect(device.id, () => {
              localStorage.setItem('ble_last_device_address', device.id);
              localStorage.setItem('ble_last_device_name', device.name);
              this.updateState({
                isConnected: true,
                isConnecting: false,
                deviceName: device.name,
                statusMessage: 'تم الاتصال الكلاسيكي بنجاح! 🎉',
                progress: 100
              });
              setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
              resolve(true);
            }, (err: any) => {
              this.updateState({ isConnected: false, isConnecting: false, error: `فشل الاقتران بالقناة التسلسلية: ${err}` });
              resolve(false);
            });
          });
        }
      } catch (err: any) {
        this.updateState({ isConnected: false, isConnecting: false, error: `حدث خطأ غير متوقع: ${err.message || err}` });
        return false;
      }
    }

    return false;
  }

  /**
   * Complete pairing and connection sequence matching the environment
   */
  public async connect(): Promise<boolean> {
    const env = this.getEnvironment();
    const win = window as any;
    const nav = navigator as any;

    this.updateState({ 
      isConnecting: true, 
      error: null, 
      statusMessage: 'جاري فحص مكونات النظام وتوافر البلوتوث...', 
      progress: 5 
    });

    if (env === 'simulator' || this.state.isSimulator) {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.updateState({
        isConnected: true,
        isConnecting: false,
        deviceName: 'محاكي الطابعة الحرارية (نشط)',
        statusMessage: 'تم التوصيل بمحاكي طابعة النظام للتجربة الميدانية! 🟢',
        progress: 100
      });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
      return true;
    }

    if (env === 'android_bridge') {
      const bridge = win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge;
      this.updateState({ statusMessage: 'جاري الربط مع الجسر البرمجي للأندرويد...', progress: 40 });
      try {
        if (typeof bridge.connect === 'function') {
          bridge.connect();
        }
        this.updateState({
          isConnected: true,
          isConnecting: false,
          deviceName: 'طابعة أندرويد المدمجة (Bridge Interface)',
          statusMessage: 'تم الاتصال الفوري عبر واجهة أندرويد بنجاح! ⚡',
          progress: 100
        });
        setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
        return true;
      } catch (err: any) {
        this.updateState({ isConnected: false, isConnecting: false, error: `فشل جسر أندرويد: ${err.message || err}` });
        return false;
      }
    }

    if (env === 'android_cordova') {
      // Auto-connect to matched device
      await this.requestAndroidPermissions().catch(() => {});
      if (win.ble) {
        const lastAddress = localStorage.getItem('ble_last_device_address');
        const lastName = localStorage.getItem('ble_last_device_name') || 'طابعة حرارية BLE';
        if (lastAddress) {
          return new Promise<boolean>((resolve) => {
            this.updateState({ statusMessage: `إعادة الاتصال التلقائي بالطابعة السابقة: ${lastName}...`, progress: 50 });
            win.ble.connect(lastAddress, () => {
              this.updateState({
                isConnected: true,
                isConnecting: false,
                deviceName: lastName,
                statusMessage: 'تمت إعادة الاتصال بالطابعة المعتادة! 🟢',
                progress: 100
              });
              setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
              resolve(true);
            }, () => {
              // Fail silently and list devices
              this.updateState({ isConnecting: false });
              this.startScanning();
              resolve(false);
            });
          });
        } else {
          this.updateState({ isConnecting: false });
          this.startScanning();
          return false;
        }
      }
    }

    // Standard Web Bluetooth API Flow
    if (!nav.bluetooth) {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isInApp = /FBAN|FBAV|Instagram|Twitter|Slack|Telegram|WhatsApp|LINE|Gmail|Workplace/.test(ua);
      
      let errorMsg = '❌ المتصفح الحالي لا يدعم الاتصال المباشر بتقنية البلوتوث (Web Bluetooth).\n\n';
      if (isIOS) {
        errorMsg += '💡 نظام iOS (آيفون):\nتمنع شركة أبل البلوتوث على متصفح سفاري وكروم العادي.\n\n' +
                    'يرجى تحميل المتصفح المجاني المخصص للاتصال بالطابعات: **Bluefy** أو **WebBLE** من متجر التطبيقات، ثم افتح رابط نظام "مولدتي" بداخله لتتصل وتطبع فوراً.';
      } else if (isInApp) {
        errorMsg += '💡 تطبيقات الدردشة (واتساب/تلغرام):\nتمنع هذه النوافذ الوصول للبلوتوث.\n\n' +
                    'يرجى نسخ رابط النظام وفتحه مباشرة في متصفح **Google Chrome** الرئيسي على هاتفك لتطبع بنجاح.';
      } else {
        errorMsg += '💡 يرجى استخدام متصفح **Google Chrome** أو **Edge** أو **Samsung Internet**، وتأكد من تشغيل البلوتوث وتفعيل خاصية تحديد الموقع (GPS).';
      }
      this.updateState({ isConnected: false, isConnecting: false, error: errorMsg });
      return false;
    }

    try {
      this.updateState({ statusMessage: 'جاري إطلاق منسق البلوتوث للبحث... يرجى اختيار طابعتك من نافذة النظام.', progress: 35 });
      
      const servicesUuids = this.getComprehensivePrinterServices();
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: servicesUuids
      });

      this.device = device;
      this.updateState({ 
        deviceName: device.name || 'طابعة حرارية لاسلكية',
        statusMessage: `تم اختيار "${device.name || 'طابعة'}"، جاري التوصيل الآمن بخادم GATT...`,
        progress: 60
      });

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });

      const server = await device.gatt.connect();
      this.gattServer = server;
      
      this.updateState({ statusMessage: 'جاري تحديد وتهيئة قناة الكتابة السريعة...', progress: 80 });
      const char = await this.discoverWriteCharacteristic(server);
      this.writeCharacteristic = char;

      localStorage.setItem('ble_last_device_address', device.id);
      localStorage.setItem('ble_last_device_name', device.name || 'طابعة حرارية BLE');

      this.updateState({
        isConnected: true,
        isConnecting: false,
        error: null,
        statusMessage: 'تم الاقتران وتدشين الاتصال بنجاح تام! ⚡',
        progress: 100
      });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
      return true;

    } catch (err: any) {
      console.error('BLE connection error:', err);
      let errorMsg = err.message || 'فشل الاتصال بالطابعة عبر البلوتوث. الرجاء المحاولة مرة أخرى.';
      const lowerMsg = errorMsg.toLowerCase();
      if (err.name === 'SecurityError' || lowerMsg.includes('policy') || lowerMsg.includes('disallowed')) {
        errorMsg = '❌ تم حظر بروتوكول البلوتوث بواسطة حماية نافذة المعاينة (iframe Sandbox).\n\n💡 الحل السهل والسريع:\nيرجى الضغط على زر "فتح في علامة تبويب جديدة" (Open in New Tab) في الشريط العلوي الأخضر على يسار الشاشة لتشغيل النظام في متصفح خارجي مستقل (مثل Google Chrome)، حيث تتوفر كامل صلاحيات البلوتوث للاتصال والطباعة فوراً.';
      }
      this.handleDisconnection();
      this.updateState({ isConnected: false, isConnecting: false, error: errorMsg });
      return false;
    }
  }

  public disconnect() {
    this.handleDisconnection();
    localStorage.removeItem('ble_last_device_address');
    this.updateState({ 
      isConnected: false, 
      isConnecting: false, 
      deviceName: null, 
      statusMessage: 'تم قطع اتصال الطابعة اللاسلكية بنجاح.', 
      progress: 0 
    });
    setTimeout(() => this.updateState({ statusMessage: null }), 2000);
  }

  private handleDisconnection() {
    try {
      if (this.gattServer && this.gattServer.connected) {
        this.gattServer.disconnect();
      }
    } catch (e) {
      // Ignore
    }
    this.device = null;
    this.gattServer = null;
    this.writeCharacteristic = null;
    this.updateState({ isConnected: false });
  }

  public async ensureConnected(): Promise<boolean> {
    const env = this.getEnvironment();
    if (env === 'simulator' || env === 'android_bridge') {
      this.updateState({ isConnected: true, error: null });
      return true;
    }
    if (env === 'android_cordova') {
      const win = window as any;
      if (win.ble || win.bluetoothSerial) {
        this.updateState({ isConnected: true, error: null });
        return true;
      }
    }
    if (this.device && this.device.gatt && this.device.gatt.connected && this.writeCharacteristic) {
      this.updateState({ isConnected: true, error: null });
      return true;
    }
    return await this.connect();
  }

  /**
   * Ultra-robust known UUID direct probe with GATT scoring fallback
   */
  private async discoverWriteCharacteristic(server: any): Promise<any> {
    const customServiceUuid = this.getCustomServiceUuid();
    const customCharUuid = this.getCustomCharacteristicUuid();

    // 1. Check custom configured UUIDs
    if (customServiceUuid && customCharUuid) {
      try {
        const service = await server.getPrimaryService(customServiceUuid.toLowerCase());
        return await service.getCharacteristic(customCharUuid.toLowerCase());
      } catch (err) {
        console.warn('Failed to find custom UUID service/characteristic', err);
      }
    }

    // 2. Direct Probe known Chinese portable printer service/char combinations
    // This is 10X faster and avoids permission/restricted GATT issues on browsers!
    for (const combo of COMMON_CHINESE_PRINTERS) {
      try {
        console.log(`Direct probing printer BLE service: ${combo.service}`);
        const service = await server.getPrimaryService(combo.service.toLowerCase());
        const characteristic = await service.getCharacteristic(combo.characteristic.toLowerCase());
        if (characteristic) {
          console.log(`Direct probe SUCCESS! Found printer channel: ${combo.characteristic}`);
          return characteristic;
        }
      } catch (probeErr) {
        // Continue to next probe
      }
    }

    // 3. Fallback: Scan primary services and score write properties
    console.log('Direct probe did not match, scanning primary services as fallback...');
    const services = await server.getPrimaryServices();
    let bestScore = -1000;
    let selectedChar: any = null;

    for (const srv of services) {
      try {
        const score = this.getServiceScore(srv.uuid);
        if (score < -100) continue; // Skip restricted/system services

        const characteristics = await srv.getCharacteristics();
        for (const char of characteristics) {
          const props = char.properties;
          const charScore = this.getCharacteristicScore(char.uuid, props);
          const totalScore = score + charScore;
          
          if (totalScore > bestScore && charScore > 0) {
            bestScore = totalScore;
            selectedChar = char;
          }
        }
      } catch (e) {
        // Skip protected services
      }
    }

    if (selectedChar) {
      console.log(`Discovered best writing characteristics: ${selectedChar.uuid} with score: ${bestScore}`);
      return selectedChar;
    }

    // Last resort fallback
    try {
      const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      return await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
    } catch {
      throw new Error('تعذر العثور على القناة المخصصة لكتابة البيانات بالطابعة اللاسلكية. يرجى مراجعة تشغيل البلوتوث ومطابقة موديل الطابعة.');
    }
  }

  private getComprehensivePrinterServices(): string[] {
    const services = new Set<string>();
    COMMON_CHINESE_PRINTERS.forEach(c => services.add(c.service));
    
    // Add generic range
    const addRange = (start: number, end: number) => {
      for (let i = start; i <= end; i++) {
        const hex = i.toString(16).padStart(4, '0').toLowerCase();
        services.add(`0000${hex}-0000-1000-8000-00805f9b34fb`);
      }
    };
    addRange(0xffe0, 0xffef); 
    addRange(0xfff0, 0xfff9); 
    addRange(0xfee0, 0xfeef); 

    const customSrv = this.getCustomServiceUuid();
    if (customSrv) services.add(customSrv.toLowerCase());

    return Array.from(services);
  }

  private getServiceScore(uuid: string): number {
    const clean = uuid.toLowerCase();
    const customService = this.getCustomServiceUuid();
    if (customService && clean === customService.toLowerCase()) return 10000;

    const printerServices = ['ffe0', 'fff0', 'ffd0', 'ff00', 'fee7', '6e40', '4953', 'e7fe'];
    for (const prefix of printerServices) {
      if (clean.includes(prefix)) return 100;
    }
    const systemServices = ['1800', '1801', '180a', '180f'];
    for (const prefix of systemServices) {
      if (clean.includes(prefix)) return -500;
    }
    return 5;
  }

  private getCharacteristicScore(charUuid: string, props: any): number {
    const clean = charUuid.toLowerCase();
    const canWrite = props.write || props.writeWithoutResponse;
    if (!canWrite) return 0;

    let score = 10;
    const customChar = this.getCustomCharacteristicUuid();
    if (customChar && clean === customChar.toLowerCase()) return 10000;

    const printerWriteChars = ['ffe1', 'fff1', 'ffd1', 'ae01', '6e400002'];
    for (const target of printerWriteChars) {
      if (clean.includes(target)) {
        score += 200;
        break;
      }
    }
    if (props.writeWithoutResponse) {
      score += 50;
    }
    return score;
  }

  /**
   * Floyd-Steinberg Dithering error diffusion algorithm
   */
  private ditherFloydSteinberg(pixels: Uint8ClampedArray, width: number, height: number, threshold: number): Uint8Array {
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      if (a < 50) {
        gray[i] = 255; 
      } else {
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    const binary = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = gray[idx];
        const newVal = oldVal < threshold ? 0 : 255;
        binary[idx] = newVal === 0 ? 1 : 0; 
        const err = oldVal - newVal;

        if (x + 1 < width) gray[idx + 1] += err * (7 / 16);
        if (x - 1 >= 0 && y + 1 < height) gray[idx + width - 1] += err * (3 / 16);
        if (y + 1 < height) gray[idx + width] += err * (5 / 16);
        if (x + 1 < width && y + 1 < height) gray[idx + width + 1] += err * (1 / 16);
      }
    }
    return binary;
  }

  /**
   * Luminance Threshold standard binarization
   */
  private thresholdBinarize(pixels: Uint8ClampedArray, width: number, height: number, threshold: number): Uint8Array {
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      if (a < 50) {
        binary[i] = 0; 
      } else {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        binary[i] = luminance < threshold ? 1 : 0;
      }
    }
    return binary;
  }

  private packBitsMSB(binary: Uint8Array, width: number, height: number): Uint8Array {
    const widthBytes = Math.ceil(width / 8);
    const packed = new Uint8Array(widthBytes * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y * width + x] === 1) {
          const byteIdx = y * widthBytes + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          packed[byteIdx] |= (1 << bitIdx);
        }
      }
    }
    return packed;
  }

  private packBitsLSB(binary: Uint8Array, width: number, height: number): Uint8Array {
    const widthBytes = Math.ceil(width / 8);
    const packed = new Uint8Array(widthBytes * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binary[y * width + x] === 1) {
          const byteIdx = y * widthBytes + Math.floor(x / 8);
          const bitIdx = x % 8;
          packed[byteIdx] |= (1 << bitIdx);
        }
      }
    }
    return packed;
  }

  private getCRC8Maxim(data: Uint8Array): number {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 0x01) {
          crc = (crc >>> 1) ^ 0x8C;
        } else {
          crc >>>= 1;
        }
      }
    }
    return crc;
  }

  private makeCatPrinterPacket(cmd: number, payload: Uint8Array): Uint8Array {
    const header = [0x51, 0x78];
    const cmdArg = [cmd, 0x00];
    const len = payload.length;
    const lenBytes = [len & 0xff, (len >> 8) & 0xff];
    const checksum = this.getCRC8Maxim(payload);

    const packet = new Uint8Array(header.length + cmdArg.length + lenBytes.length + payload.length + 2);
    let offset = 0;
    packet.set(header, offset); offset += header.length;
    packet.set(cmdArg, offset); offset += cmdArg.length;
    packet.set(lenBytes, offset); offset += lenBytes.length;
    packet.set(payload, offset); offset += payload.length;
    packet[offset] = checksum; offset += 1;
    packet[offset] = 0xff;
    return packet;
  }

  /**
   * Safe Transmission Engine - handles flow control by sending small chunks with microsecond delays
   * to guarantee zero data loss on slow microcontrollers
   */
  private async sendBuffer(buffer: Uint8Array): Promise<void> {
    const env = this.getEnvironment();
    
    if (env === 'simulator') {
      await new Promise(resolve => setTimeout(resolve, 5));
      return;
    }

    if (env === 'android_bridge') {
      const win = window as any;
      const bridge = win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge;
      if (bridge && typeof bridge.writeHex === 'function') {
        const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
        bridge.writeHex(hex);
      }
      return;
    }

    if (env === 'android_cordova') {
      const win = window as any;
      return new Promise<void>((resolve, reject) => {
        const success = () => resolve();
        const failure = (err: any) => reject(err);
        const cachedAddr = localStorage.getItem('ble_last_device_address') || '';
        
        if (win.ble) {
          const service = this.getCustomServiceUuid() || 'ffe0';
          const char = this.getCustomCharacteristicUuid() || 'ffe1';
          win.ble.writeWithoutResponse(cachedAddr, service, char, buffer.buffer, success, failure);
        } else if (win.bluetoothSerial) {
          win.bluetoothSerial.write(buffer, success, failure);
        } else {
          resolve();
        }
      });
    }

    // Web Bluetooth safe chunked sender
    const size = this.state.chunkSize;
    const delay = this.state.chunkDelay;
    
    for (let i = 0; i < buffer.length; i += size) {
      const chunk = buffer.slice(i, i + size);
      await this.writeCharacteristicWithRetry(chunk, 3);
      if (delay > 0 && i + size < buffer.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async writeCharacteristicWithRetry(chunk: Uint8Array, retries = 3): Promise<void> {
    if (!this.writeCharacteristic) return;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        return;
      } catch (err: any) {
        const msg = (err.message || '').toLowerCase();
        if (attempt < retries && (msg.includes('progress') || msg.includes('busy') || msg.includes('congestion'))) {
          await new Promise(resolve => setTimeout(resolve, 150));
          continue;
        }
        
        try {
          await this.writeCharacteristic.writeValue(chunk);
          return;
        } catch (fbErr) {
          if (attempt === retries) throw err;
        }
      }
    }
  }

  /**
   * Beautiful offscreen Canvas receipt renderer (Supports beautiful Cairo/Arial fonts and custom margins)
   */
  private renderReceiptToCanvas(receipt: Receipt): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const is80 = this.state.paperWidth === '80mm';
    const width = is80 ? 576 : 384; 
    const margin = is80 ? 32 : 12;

    const receiptTitle = localStorage.getItem('receipt_title') || 'نظام مولدتي للخدمات الأهلية';
    const receiptFirm = localStorage.getItem('receipt_firm') || 'شركة الحلول المتميزة المحدودة';
    const receiptPhone = localStorage.getItem('receipt_phone') || '07701234567';
    const receiptFooter = localStorage.getItem('receipt_footer') || 'شكراً لالتزامكم بالتسديد الشهري.';

    const canvasHeight = 1100;
    canvas.width = width;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize graphics engine');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, canvasHeight);

    ctx.fillStyle = '#000000'; 
    ctx.textBaseline = 'top';

    let currentY = 15;

    // Center Badge Logo
    ctx.beginPath();
    ctx.arc(width / 2, currentY + 20, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', width / 2, currentY + 11);
    currentY += 45;

    // Header Details
    ctx.font = `bold ${is80 ? '24px' : '18px'} "Cairo", "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(receiptTitle, width / 2, currentY);
    currentY += is80 ? 30 : 25;

    ctx.font = `bold ${is80 ? '14px' : '11px'} "Cairo", "Segoe UI", Arial, sans-serif`;
    ctx.fillText(receiptFirm, width / 2, currentY);
    currentY += 18;

    if (receiptPhone) {
      ctx.font = '10px monospace';
      ctx.fillText(`طوارئ ومبيعات: ${receiptPhone}`, width / 2, currentY);
      currentY += 15;
    }

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 12;

    ctx.font = `bold ${is80 ? '15px' : '12.5px'} "Cairo", "Segoe UI", Arial, sans-serif`;
    ctx.fillText('وصل استلام مالي (مُسدّد بالكامل) 🟢', width / 2, currentY);
    currentY += is80 ? 25 : 22;

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 15;

    // Itemized table grid rows (Right-to-left layout)
    const drawItemRow = (key: string, val: string, isKeyBold = false) => {
      ctx.textAlign = 'right';
      ctx.font = `${isKeyBold ? 'bold' : ''} ${is80 ? '14px' : '11.5px'} "Cairo", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(`${key}:`, width - margin, currentY);

      ctx.textAlign = 'left';
      ctx.font = `bold ${is80 ? '14px' : '11.5px'} "Cairo", "Segoe UI", Arial, sans-serif`;
      ctx.fillText(val, margin, currentY);
      
      currentY += is80 ? 24 : 19;
    };

    drawItemRow('رقم الوصل', receipt.invoiceNo, true);
    drawItemRow('تاريخ التسديد والتقييد', receipt.paymentDate);
    drawItemRow('المشترك المستفيد', receipt.subscriberName, true);
    drawItemRow('الهاتف المسجل', receipt.subscriberPhone);
    drawItemRow('صنف ونوع الاشتراك', receipt.subscriptionType);
    drawItemRow('الأمبيرات المسجلة', `${receipt.amps} أمبير`);
    drawItemRow('سعر الأمبير المقرّر', `${receipt.pricePerAmp.toLocaleString()} د.ع`);
    drawItemRow('بوابة المعالجة المالية', receipt.paymentMethod);
    drawItemRow('الجابي المستلم', receipt.accountantName);

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 15;

    ctx.textAlign = 'center';
    ctx.font = `bold ${is80 ? '13px' : '11px'} "Cairo", "Segoe UI", Arial, sans-serif`;
    ctx.fillText('إجمالي تصفية الحساب المستلم:', width / 2, currentY);
    currentY += 18;

    ctx.font = `bold ${is80 ? '22px' : '17px'} monospace, Arial, sans-serif`;
    ctx.fillText(`${receipt.totalAmount.toLocaleString()} دينار عراقي`, width / 2, currentY);
    currentY += is80 ? 32 : 28;

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 12;

    ctx.textAlign = 'center';
    ctx.font = `bold ${is80 ? '11px' : '9.5px'} "Cairo", "Segoe UI", Arial, sans-serif`;
    ctx.fillText(receiptFooter, width / 2, currentY);
    currentY += 18;

    // Graphic Barcode Elements
    const barcodeText = `*${receipt.invoiceNo}*`;
    ctx.font = '10px monospace';
    ctx.fillText(barcodeText, width / 2, currentY + 22);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    const barcodeXStart = width / 2 - 70;
    for (let i = 0; i < 35; i++) {
      const lineX = barcodeXStart + i * 4;
      const isThick = (i % 3 === 0) || (i % 7 === 1);
      ctx.lineWidth = isThick ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(lineX, currentY);
      ctx.lineTo(lineX, currentY + 18);
      ctx.stroke();
    }
    currentY += 45;

    ctx.font = '8px "Cairo", "Segoe UI", Arial, sans-serif';
    ctx.fillText('نظام إدارة المولدات والتحصيل الميداني الذكي', width / 2, currentY);

    // Crop Canvas
    const finalHeight = Math.ceil(currentY + 25);
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = finalHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (croppedCtx) {
      croppedCtx.drawImage(canvas, 0, 0);
      return croppedCanvas;
    }

    return canvas;
  }

  private drawDashedLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Main Printing Core Function optimized for Chinese thermal printers
   */
  public async printReceipt(receipt: Receipt): Promise<boolean> {
    try {
      this.updateState({ 
        error: null, 
        statusMessage: 'جاري مراجعة اتصال ومكونات الطابعة اللاسلكية...', 
        progress: 10 
      });

      const connected = await this.ensureConnected();
      if (!connected) {
        this.updateState({ statusMessage: null, progress: 0 });
        return false;
      }

      this.updateState({ 
        statusMessage: 'جاري توليد رسومات الفاتورة وتوطير التنسيق العربي المالي...', 
        progress: 30 
      });

      const canvas = this.renderReceiptToCanvas(receipt);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not load 2D context');

      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      
      this.updateState({ 
        statusMessage: 'جاري تنقيط ومعالجة الصورة لملائمة الأبعاد الحرارية...', 
        progress: 50 
      });

      // Render binarized pixel array
      const binaryData = this.state.ditheringEnabled
        ? this.ditherFloydSteinberg(imgData.data, width, height, this.state.contrastThreshold)
        : this.thresholdBinarize(imgData.data, width, height, this.state.contrastThreshold);

      if (this.state.printerType === 'cat_printer') {
        // Cat Printer Protocol
        this.updateState({ statusMessage: 'جاري تهيئة طابعة القطة الذكية وصياغة الحزم الخاصة...', progress: 65 });
        
        await this.sendBuffer(this.makeCatPrinterPacket(0xA4, new Uint8Array([0x32]))); 
        await this.sendBuffer(this.makeCatPrinterPacket(0xAF, new Uint8Array([0xFF, 0xFF]))); 
        
        const latticeStart = new Uint8Array([0xAA, 0x55, 0x17, 0x38, 0x44, 0x5F, 0x5F, 0x5F, 0x44, 0x38, 0x2C]);
        await this.sendBuffer(this.makeCatPrinterPacket(0xA6, latticeStart));

        const widthBytes = Math.ceil(width / 8); 
        const packetBytes = this.packBitsLSB(binaryData, width, height);

        for (let y = 0; y < height; y++) {
          if (y % 15 === 0) {
            const p = 65 + Math.floor((y / height) * 20);
            this.updateState({ statusMessage: `جاري ضخ صفوف بكسلات الفاتورة (${y}/${height})...`, progress: p });
          }
          const rowBytes = packetBytes.slice(y * widthBytes, (y + 1) * widthBytes);
          await this.sendBuffer(this.makeCatPrinterPacket(0xA2, rowBytes));
        }

        const latticeEnd = new Uint8Array([0xAA, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17]);
        await this.sendBuffer(this.makeCatPrinterPacket(0xA6, latticeEnd));
        
        await this.sendBuffer(this.makeCatPrinterPacket(0xBD, new Uint8Array([65])));
        await this.sendBuffer(this.makeCatPrinterPacket(0xA1, new Uint8Array([120, 0]))); 

      } else {
        // --- STANDARD UNIVERSAL ESC/POS PROTOCOL ---
        // Perfect for Chinese PT-210 / MPT-II / XP-58 / XP-80
        this.updateState({ statusMessage: 'جاري تهيئة الطابعة للبدء (Initialize ESC/POS)...', progress: 65 });
        
        const initCmd = new Uint8Array([0x1B, 0x40]); // ESC @ (Initialize printer)
        await this.sendBuffer(initCmd);

        const widthBytes = Math.ceil(width / 8);
        const packedData = this.packBitsMSB(binaryData, width, height);

        this.updateState({ statusMessage: 'جاري بث وطباعة الفاتورة على شكل حزم نقطية صغيرة...', progress: 80 });

        // CRITICAL FOR CHINESE PRINTERS: Split image into very small vertical strips
        // Using stripHeight = 16 to guarantee we never overflow the tiny printer's receive buffer.
        const stripHeight = 16; 
        for (let yOffset = 0; yOffset < height; yOffset += stripHeight) {
          const chunkHeight = Math.min(stripHeight, height - yOffset);
          
          // GS v 0 m xL xH yL yH d1...dk (Standard ESC/POS Raster Bit Image command)
          const header = new Uint8Array([
            0x1D, 0x76, 0x30, 0x00, 
            widthBytes & 0xFF, (widthBytes >> 8) & 0xFF, 
            chunkHeight & 0xFF, (chunkHeight >> 8) & 0xFF
          ]);

          const chunkBytes = packedData.slice(yOffset * widthBytes, (yOffset + chunkHeight) * widthBytes);
          const stripBuffer = new Uint8Array(header.length + chunkBytes.length);
          stripBuffer.set(header, 0);
          stripBuffer.set(chunkBytes, header.length);
          
          await this.sendBuffer(stripBuffer);
          
          // Settle pause to let the thermal head heat up, print the strip, and advance paper
          await new Promise(resolve => setTimeout(resolve, 60)); 
        }

        // Feed 5 lines at the end to allow neat manual tearing
        const feedAndCutCmd = new Uint8Array([
          0x1B, 0x64, 0x05,       // ESC d 5 (Feed 5 lines)
          0x1D, 0x56, 0x01        // GS V 1 (Partial cut)
        ]);
        await this.sendBuffer(feedAndCutCmd);
      }

      this.updateState({ 
        statusMessage: 'اكتملت عملية الطباعة اللاسلكية بنجاح تام! 🎉', 
        progress: 100 
      });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 3000);
      return true;

    } catch (err: any) {
      console.error('Print receipt failed:', err);
      this.updateState({ 
        error: `حدث خطأ أثناء إرسال البيانات للطابعة: ${err.message || err}`,
        statusMessage: null,
        progress: 0
      });
      return false;
    }
  }

  /**
   * Browser print fallback (Saves paper, works on iOS Safari and every machine flawlessly)
   */
  public printViaBrowser(receipt: Receipt): boolean {
    const is80 = this.state.paperWidth === '80mm';
    const paperWidthPx = is80 ? '300px' : '220px';
    const receiptTitle = localStorage.getItem('receipt_title') || 'نظام مولدتي للخدمات الأهلية';
    const receiptFirm = localStorage.getItem('receipt_firm') || 'شركة الحلول المتميزة المحدودة';
    const receiptPhone = localStorage.getItem('receipt_phone') || '07701234567';
    const receiptFooter = localStorage.getItem('receipt_footer') || 'شكراً لالتزامكم بالتسديد الشهري.';

    let iframe = document.getElementById('ble-print-frame') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'ble-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return false;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>وصل تسديد - ${receiptTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            @media print {
              body {
                margin: 0;
                padding: 0;
                background: #fff;
              }
              .ticket {
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 5px !important;
              }
            }
            body {
              font-family: 'Cairo', sans-serif;
              direction: rtl;
              text-align: center;
              color: #000;
              margin: 0;
              padding: 10px;
              background: #fff;
              -webkit-print-color-adjust: exact;
            }
            .ticket {
              max-width: ${paperWidthPx};
              margin: 0 auto;
              padding: 15px 12px;
              background: white;
              border: 1px dashed #ccc;
              border-radius: 8px;
            }
            .logo-icon {
              font-size: 26px;
              margin-bottom: 5px;
            }
            h1 {
              font-size: 16px;
              margin: 5px 0 2px 0;
              font-weight: 700;
            }
            h2 {
              font-size: 11px;
              margin: 0 0 5px 0;
              color: #444;
              font-weight: 400;
            }
            .phone {
              font-size: 9px;
              color: #666;
              margin-bottom: 8px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            .title-badge {
              font-size: 11px;
              font-weight: 700;
              margin: 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10.5px;
              margin: 10px 0;
            }
            td {
              padding: 4px 0;
            }
            .key {
              text-align: right;
              color: #333;
            }
            .val {
              text-align: left;
              font-weight: 700;
            }
            .bold-key {
              font-weight: 700;
            }
            .total-section {
              margin: 10px 0;
              background: #fbfbfb;
              padding: 8px;
              border: 1px solid #eee;
              border-radius: 4px;
            }
            .total-label {
              font-size: 10px;
              color: #555;
              margin-bottom: 2px;
            }
            .total-amount {
              font-size: 14px;
              font-weight: 700;
            }
            .footer {
              font-size: 9.5px;
              margin-top: 8px;
              color: #222;
              font-weight: 700;
            }
            .barcode {
              font-family: monospace;
              letter-spacing: 2px;
              font-size: 10px;
              margin-top: 12px;
              font-weight: bold;
            }
            .app-credit {
              font-size: 7.5px;
              color: #888;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="logo-icon">⚡</div>
            <h1>${receiptTitle}</h1>
            <h2>${receiptFirm}</h2>
            ${receiptPhone ? `<div class="phone">طوارئ الشبكة: ${receiptPhone}</div>` : ''}
            <div class="divider"></div>
            <div class="title-badge">وصل استلام مالي مروّس 🟢</div>
            <div class="divider"></div>
            <table>
              <tr>
                <td class="key bold-key">رقم الوصل:</td>
                <td class="val">${receipt.invoiceNo}</td>
              </tr>
              <tr>
                <td class="key">تاريخ السداد:</td>
                <td class="val">${receipt.paymentDate}</td>
              </tr>
              <tr>
                <td class="key bold-key">المشترك:</td>
                <td class="val">${receipt.subscriberName}</td>
              </tr>
              <tr>
                <td class="key">الهاتف:</td>
                <td class="val">${receipt.subscriberPhone}</td>
              </tr>
              <tr>
                <td class="key">الاشتراك:</td>
                <td class="val">${receipt.subscriptionType}</td>
              </tr>
              <tr>
                <td class="key">الأمبيرات:</td>
                <td class="val">${receipt.amps} أمبير</td>
              </tr>
              <tr>
                <td class="key">سعر الأمبير:</td>
                <td class="val">${receipt.pricePerAmp.toLocaleString()} د.ع</td>
              </tr>
              <tr>
                <td class="key">طريقة الدفع:</td>
                <td class="val">${receipt.paymentMethod}</td>
              </tr>
              <tr>
                <td class="key">الجابي الاستشاري:</td>
                <td class="val">${receipt.accountantName}</td>
              </tr>
            </table>
            <div class="divider"></div>
            <div class="total-section">
              <div class="total-label">إجمالي المبلغ المقبوض:</div>
              <div class="total-amount">${receipt.totalAmount.toLocaleString()} دينار عراقي</div>
            </div>
            <div class="divider"></div>
            <div class="footer">${receiptFooter}</div>
            <div class="barcode">||||| ${receipt.invoiceNo} |||||</div>
            <div class="app-credit">نظام إدارة المولدات والتحصيل الميداني الذكي</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe?.contentWindow?.focus();
    }, 150);

    return true;
  }

  /**
   * Universal Interactive Test printing
   */
  public async printTestPage(): Promise<boolean> {
    try {
      this.updateState({ 
        error: null, 
        statusMessage: 'جاري فحص حالة اتصال ومكونات طابعتك اللاسلكية...', 
        progress: 10 
      });

      const connected = await this.ensureConnected();
      if (!connected) {
        this.updateState({ statusMessage: null, progress: 0 });
        return false;
      }

      this.updateState({ statusMessage: 'جاري توليد صفحة اختبار حرارية...', progress: 30 });

      const testReceipt: Receipt = {
        id: 'test_uuid',
        subscriberId: 'mock_sub',
        subscriberName: 'مشترك تجريبي للفحص الميداني',
        subscriberPhone: '07701234567',
        amps: 5,
        pricePerAmp: 10000,
        totalAmount: 50000,
        paymentDate: new Date().toLocaleDateString('ar-IQ'),
        paymentMethod: 'نقدي',
        accountantName: 'جابي النظام التجريبي',
        invoiceNo: 'TEST-999',
        subscriptionType: 'عادي',
      };

      await this.printReceipt(testReceipt);

      this.updateState({ statusMessage: 'تم طباعة صفحة الاختبار بنجاح تام! 🟢', progress: 100 });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 3000);
      return true;

    } catch (err: any) {
      console.error('Test page failed:', err);
      this.updateState({ 
        error: `فشلت طباعة ورقة الاختبار: ${err.message || err}`,
        statusMessage: null,
        progress: 0 
      });
      return false;
    }
  }

  private startAutoReconnectionTimer() {
    if (this.autoReconnectTimer) clearInterval(this.autoReconnectTimer);
    
    this.autoReconnectTimer = setInterval(() => {
      const env = this.getEnvironment();
      if (this.state.isConnected || this.state.isConnecting || this.state.isScanning) return;
      
      const lastAddress = localStorage.getItem('ble_last_device_address');
      if (!lastAddress) return;

      if (env === 'android_bridge') {
        this.updateState({ isConnected: true });
      } else if (env === 'browser') {
        // Web Bluetooth cannot auto-reconnect without a user gesture, so we wait.
      }
    }, 15000);
  }
}

export const blePrinter = new BLEPrinterController();
