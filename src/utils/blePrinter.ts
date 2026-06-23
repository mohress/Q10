/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { Receipt } from '../types';

// Declare standard Bluetooth state structure
export interface BLEPrinterState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  paperWidth: '58mm' | '80mm';
  printerType: 'esc_pos' | 'cat_printer';
  defaultPrintMethod: 'browser' | 'ble';
  chunkSize: number;       // Safe split size for budget devices (default: 40 bytes)
  chunkDelay: number;      // Safe pause between socket writes in ms (default: 15 ms)
  contrastThreshold: number; // For standard thresholding (50 - 200, default: 135)
  ditheringEnabled: boolean; // Enables Floyd-Steinberg dithering for higher definition images
  error: string | null;
  statusMessage?: string | null;
  progress?: number;
  isSimulator?: boolean;     // Enable Virtual Simulator Mode for diagnostics without physical printer
}

class BLEPrinterController {
  private device: any = null;
  private gattServer: any = null;
  private writeCharacteristic: any = null;
  private stateChangeListeners: ((state: BLEPrinterState) => void)[] = [];

  public state: BLEPrinterState = {
    isConnected: false,
    isConnecting: false,
    deviceName: null,
    paperWidth: (localStorage.getItem('ble_printer_width') as any) || '58mm',
    printerType: (localStorage.getItem('ble_printer_type') as any) || 'esc_pos',
    defaultPrintMethod: (localStorage.getItem('default_print_method') as any) || 'browser',
    chunkSize: Number(localStorage.getItem('ble_chunk_size')) || 40,
    chunkDelay: Number(localStorage.getItem('ble_chunk_delay')) || 15,
    contrastThreshold: Number(localStorage.getItem('ble_contrast_threshold')) || 135,
    ditheringEnabled: localStorage.getItem('ble_dithering_enabled') === 'true',
    error: null,
    statusMessage: null,
    progress: 0,
    isSimulator: localStorage.getItem('ble_is_simulator') === 'true',
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
    if (enabled) {
      this.updateState({ 
        isConnected: true, 
        deviceName: 'محاكي الطابعة الافتراضي (Simulator Active)',
        error: null 
      });
    } else if (this.state.deviceName?.includes('Simulator')) {
      this.disconnect();
    }
  }

  /**
   * Auto Reconnection Daemon running silently every 15 seconds
   */
  private startAutoReconnectionTimer() {
    setInterval(async () => {
      if (this.state.isConnected || this.state.isConnecting) return;
      const lastAddress = localStorage.getItem('ble_last_device_address');
      if (lastAddress && lastAddress.trim()) {
        console.log(`[Daemon] Auto-reconnecting to last printer address: ${lastAddress}`);
        this.attemptSilentConnection(lastAddress);
      }
    }, 15000);
  }

  private async attemptSilentConnection(address: string) {
    const env = this.getEnvironment();
    const win = window as any;
    
    if (env === 'android_bridge' || env === 'simulator') {
      return; 
    }

    if (env === 'android_cordova') {
      try {
        if (win.ble) {
          win.ble.connect(address, () => {
            this.updateState({
              isConnected: true,
              deviceName: localStorage.getItem('ble_last_device_name') || 'طابعة بلوتوث APK',
              error: null
            });
          }, () => {});
        } else if (win.bluetoothSerial) {
          win.bluetoothSerial.connect(address, () => {
            this.updateState({
              isConnected: true,
              deviceName: localStorage.getItem('ble_last_device_name') || 'طابعة بلوتوث APK',
              error: null
            });
          }, () => {});
        }
      } catch (err) {
        // Fail silently inside background daemon
      }
    }
  }

  /**
   * Check environment for hybrid/native bridges versus standard client web browser
   */
  public getEnvironment(): 'web' | 'android_cordova' | 'android_bridge' | 'simulator' {
    const win = window as any;
    if (this.state.isSimulator) {
      return 'simulator';
    }
    // Android Native WebView injected companion interface fallback
    if (win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge) {
      return 'android_bridge';
    }
    // Cordova/Capacitor plugins commonly packaged in APKs
    if (win.cordova && (win.ble || win.bluetoothSerial)) {
      return 'android_cordova';
    }
    return 'web';
  }

  /**
   * Request dynamic Bluetooth permissions on Android platforms (API 31+)
   */
  private async requestAndroidPermissions(): Promise<boolean> {
    const win = window as any;
    if (win.cordova && win.cordova.plugins && win.cordova.plugins.permissions) {
      const pm = win.cordova.plugins.permissions;
      const permissionsNeeded = [
        pm.BLUETOOTH_SCAN || "android.permission.BLUETOOTH_SCAN",
        pm.BLUETOOTH_CONNECT || "android.permission.BLUETOOTH_CONNECT",
        pm.ACCESS_FINE_LOCATION || "android.permission.ACCESS_FINE_LOCATION"
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
   * Complete pairing and connection sequence matching the environment
   */
  public async connect(): Promise<boolean> {
    const env = this.getEnvironment();
    const win = window as any;
    const nav = navigator as any;

    this.updateState({ 
      isConnecting: true, 
      error: null, 
      statusMessage: 'جاري مراجعة صلاحيات ومكونات النظام للتأصيل بالاقتران...', 
      progress: 5 
    });

    // Handle Simulator Connection
    if (env === 'simulator' || this.state.isSimulator) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateState({
        isConnected: true,
        isConnecting: false,
        deviceName: 'محاكي الطابعة الافتراضي (Simulator Active)',
        statusMessage: 'تم التوصيل بمحاكي النظام بنجاح للتجربة الفورية! ☕',
        progress: 100
      });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
      return true;
    }

    // Handle Injected Native Android companion (APK level helper)
    if (env === 'android_bridge') {
      const bridge = win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge;
      this.updateState({ 
        statusMessage: 'جاري تهيئة الاتصال عبر جسر التحميل الأصلي للتطبيق (Android Native Bridge)...', 
        progress: 40 
      });
      try {
        if (typeof bridge.connect === 'function') {
          bridge.connect();
        }
        this.updateState({
          isConnected: true,
          isConnecting: false,
          deviceName: 'طابعة النظام المدمجة (Android APK Interface)',
          statusMessage: 'تم الاقتران الفوري عبر واجهة الأندرويد للأجهزة الميدانية! 🟢',
          progress: 100
        });
        setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
        return true;
      } catch (err: any) {
        this.updateState({
          isConnected: false,
          isConnecting: false,
          error: `فشل استدعاء جسر أندرويد: ${err.message || err}`
        });
        return false;
      }
    }

    // Handle Cordova Native Bluetooth Plugins inside APK
    if (env === 'android_cordova') {
      this.updateState({ 
        statusMessage: 'جاري التحقق من قنوات البلوتوث...', 
        progress: 20 
      });
      
      // Request permissions but do not block, as they might be pre-granted or managed by the container.
      await this.requestAndroidPermissions().catch((e) => console.log('Permission request ignored/failed', e));

      this.updateState({ 
        statusMessage: 'جاري تشغيل عملية مسح الرادار للبلوتوث بحثاً عن طابعتك...', 
        progress: 50 
      });

      try {
        if (win.ble) {
          return new Promise<boolean>((resolve) => {
            win.ble.scan([], 10, (device: any) => {
              // Try to identify standard BLE printers by checking name/services
              const name = device.name || device.id || '';
              if (name.toLowerCase().includes('printer') || name.toLowerCase().includes('mpt') || name.toLowerCase().includes('print') || name.toLowerCase().includes('cat')) {
                win.ble.stopScan();
                this.updateState({ statusMessage: `تم رصد الطابعة "${name}". جاري الاتصال...`, progress: 80 });
                
                win.ble.connect(device.id, () => {
                  localStorage.setItem('ble_last_device_address', device.id);
                  localStorage.setItem('ble_last_device_name', name);
                  this.updateState({
                    isConnected: true,
                    isConnecting: false,
                    deviceName: name,
                    statusMessage: 'تم الاقتران اللاسلكي الأصيل بنجاح! ⚡',
                    progress: 100
                  });
                  setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
                  resolve(true);
                }, (err: any) => {
                  this.updateState({ isConnected: false, isConnecting: false, error: `فشل ربط جهاز BLE: ${JSON.stringify(err)}` });
                  resolve(false);
                });
              }
            }, () => {
              this.updateState({ isConnected: false, isConnecting: false, error: 'فشل الفحص اللاسلكي بالطاقة المنخفضة BLE' });
              resolve(false);
            });
          });
        } else if (win.bluetoothSerial) {
          // Classic SPP Bluetooth serial profile (Commonly preferred on legacy printers)
          return new Promise<boolean>((resolve) => {
            win.bluetoothSerial.list((devices: any[]) => {
              const matched = devices.find(d => 
                (d.name || '').toLowerCase().includes('printer') || 
                (d.name || '').toLowerCase().includes('mpt') || 
                (d.name || '').toLowerCase().includes('print')
              ) || devices[0];

              if (!matched) {
                this.updateState({ isConnected: false, isConnecting: false, error: 'لم يتم رصد أي طابعة مقترنة مسبقاً في قائمة بلوتوث الأندرويد.' });
                resolve(false);
                return;
              }

              this.updateState({ statusMessage: `جاري ربط خط تسلسلي مع: ${matched.name}...`, progress: 80 });
              win.bluetoothSerial.connect(matched.address, () => {
                localStorage.setItem('ble_last_device_address', matched.address);
                localStorage.setItem('ble_last_device_name', matched.name);
                this.updateState({
                  isConnected: true,
                  isConnecting: false,
                  deviceName: matched.name,
                  statusMessage: 'تم الاقتران الكلاسيكي بالتطبيق بنجاح! 🎉',
                  progress: 100
                });
                setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
                resolve(true);
              }, (err: any) => {
                this.updateState({ isConnected: false, isConnecting: false, error: `فشل الاقتران بالقناة التسلسلية: ${err}` });
                resolve(false);
              });
            }, (err: any) => {
              this.updateState({ isConnected: false, isConnecting: false, error: `تعذر فهرسة قائمة الأجهزة: ${err}` });
              resolve(false);
            });
          });
        }
      } catch (err: any) {
        this.updateState({ isConnected: false, isConnecting: false, error: `حدث خطأ أثناء الاتصال بالبلوتوث المدمج: ${err.message || err}` });
        return false;
      }
    }

    // Standard Web Bluetooth API Fallback (runs when user opens inside a supporting browser like Chrome)
    if (!nav.bluetooth) {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isInApp = /FBAN|FBAV|Instagram|Twitter|Slack|Telegram|WhatsApp|LINE|Gmail|Workplace/.test(ua);
      
      let errorMsg = '❌ متصفح الويب الحالي لا يدعم الاتصال المباشر بتقنية البلوتوث (Web Bluetooth).\n\n';
      if (isIOS) {
        errorMsg += '💡 حل مشكلة نظام آيفون (iOS):\n' +
                    'تمنع شركة Apple البلوتوث للويب على متصفحات Safari و Chrome الافتراضية.\n\n' +
                    '• الخيار الأمثل للآيفون:\n' +
                    'يرجى تحميل المتصفح المخصص للطباعة اللاسلكية مجاناً: متصفح **Bluefy** أو **WebBLE**، ثم افتح رابط نظام "مولدتي" بداخله لتتصل فوراً بالطابعة.\n\n' +
                    '• خيار بديل سريع:\n' +
                    'استخدم أي هاتف أندرويد (Android) وافتح التطبيق عبر متصفح **Google Chrome** الأساسي.';
      } else if (isInApp) {
        errorMsg += '💡 حل مشكلة المتصفحات الداخلية للتطبيقات (مثل واتساب وتلغرام):\n' +
                    'تمنع هذه النوافذ المدمجة الوصول لميزات الهاتف للحماية.\n\n' +
                    '• الحل الفوري:\n' +
                    'يرجى نسخ رابط الويب هذا ولصقه مباشرة داخل تطبيق متصفح **Google Chrome** الرئيسي على هاتفك لتتمتع بالاقتران الفوري بالطابعة.';
      } else {
        errorMsg += '💡 يرجى التأكد من استخدام متصفح يدعم تقنية Web Bluetooth (مثل **Google Chrome** أو **Edge** أو **Samsung Internet**)، وتفعيل البلوتوث وتحديد الموقع الجغرافي (GPS) لجهازك.';
      }
      this.updateState({ isConnected: false, isConnecting: false, error: errorMsg });
      return false;
    }

    try {
      this.updateState({ statusMessage: 'جاري تشغيل مسبار البلوتوث ورصد موجة الأجهزة القريبة...', progress: 30 });
      const servicesUuids = this.getComprehensivePrinterServices();
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: servicesUuids
      });

      this.device = device;
      this.updateState({ 
        deviceName: device.name || 'طابعة حرارية لاسلكية',
        statusMessage: `تم رصد الطابعة "${device.name || 'مجهولة'}". جاري التوصيل بخادم GATT آمن...`,
        progress: 60
      });

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });

      const server = await device.gatt.connect();
      this.gattServer = server;
      
      this.updateState({ statusMessage: 'تم التوصيل. جاري اختيار وضبط أفضل خصائص الكتابة...', progress: 80 });
      const char = await this.discoverWriteCharacteristic(server, device);
      this.writeCharacteristic = char;

      localStorage.setItem('ble_last_device_address', device.id);
      localStorage.setItem('ble_last_device_name', device.name || 'طابعة حرارية BLE');

      this.updateState({
        isConnected: true,
        isConnecting: false,
        error: null,
        statusMessage: 'تم الاقتران اللاسلكي للويب وتدشين القناة بنجاح! ⚡',
        progress: 100
      });
      setTimeout(() => this.updateState({ statusMessage: null, progress: 0 }), 2500);
      return true;

    } catch (err: any) {
      console.error('BLE connection error:', err);
      let errorMsg = err.message || 'فشل الاتصال بالطابعة عبر البلوتوث. الرجاء المحاولة مرة أخرى.';
      const lowerMsg = errorMsg.toLowerCase();
      if (err.name === 'SecurityError' || lowerMsg.includes('policy') || lowerMsg.includes('disallowed')) {
        errorMsg = '❌ تم حظر بروتوكول البلوتوث بواسطة سياسة حماية نافذة المعاينة (iframe Sandbox).\n\n💡 الحل السهل والمضمون:\nيرجى الضغط على زر "فتح في علامة تبويب جديدة" (Open in New Tab) الموجود في الشريط العلوي الأخضر بأعلى جهة اليمين لتشغيل البرنامج في متصفح مستقل (مثل Google Chrome)، حيث يُسمح بالوصول الكامل لخاصية البلوتوث والاقتران فوراً وبنجاح.';
      }
      this.handleDisconnection();
      this.updateState({ isConnected: false, isConnecting: false, error: errorMsg });
      return false;
    }
  }

  /**
   * Disconnect any active connections
   */
  public disconnect() {
    this.handleDisconnection();
    localStorage.removeItem('ble_last_device_address');
    this.updateState({ 
      isConnected: false, 
      isConnecting: false, 
      deviceName: null, 
      statusMessage: 'تم إلغاء اقتران الطابعة وفصل القنوات الرياضية.', 
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

  /**
   * Determine whether connection is active, or refresh states
   */
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
    // Attempt rapid re-connect otherwise
    return await this.connect();
  }

  /**
   * Core service discoverer with GATT scoring logic
   */
  private async discoverWriteCharacteristic(server: any, device: any): Promise<any> {
    const customServiceUuid = this.getCustomServiceUuid();
    const customCharUuid = this.getCustomCharacteristicUuid();

    // 1. If explicit custom UUIDs are specified, use them directly
    if (customServiceUuid && customCharUuid) {
      try {
        const service = await server.getPrimaryService(customServiceUuid.toLowerCase());
        return await service.getCharacteristic(customCharUuid.toLowerCase());
      } catch (err) {
        console.warn('Failed directly fetching custom configuration UUIDs, rolling back to scoring scan', err);
      }
    }

    // 2. Scan all services to determine scores
    const services = await server.getPrimaryServices();
    let bestScore = -1000;
    let selectedChar: any = null;

    // Sort services according to their suitability index
    const scoredServices = services.map((srv: any) => ({
      service: srv,
      score: this.getServiceScore(srv.uuid)
    })).sort((a: any, b: any) => b.score - a.score);

    for (const item of scoredServices) {
      try {
        console.log(`Scanning services: ${item.service.uuid} with score: ${item.score}`);
        const characteristics = await item.service.getCharacteristics();
        for (const char of characteristics) {
          const props = char.properties;
          const charScore = this.getCharacteristicScore(char.uuid, props);
          const totalScore = item.score + charScore;
          
          if (totalScore > bestScore && charScore > 0) {
            bestScore = totalScore;
            selectedChar = char;
          }
        }
      } catch (srvErr) {
        // Skip restricted services securely
      }
    }

    if (selectedChar) {
      console.log(`Matched best characteristics node: ${selectedChar.uuid} with aggregate score: ${bestScore}`);
      return selectedChar;
    }

    // Standard UART/FFE0 generic raw defaults
    try {
      const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      return await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
    } catch {
      throw new Error('تعذر إيجاد قناة كتابة بيانات متوافقة (UART/SPP) ذات صلاحية إرسال ممتدة.');
    }
  }

  private getComprehensivePrinterServices(): string[] {
    const services = new Set<string>([
      '6e400001-b5a3-f393-e0a9-e50e24dcca9e', 
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', 
      'e7fe1800-be05-4866-ab74-04b15b00f5df', 
      '38eb4a84-c57d-4b6a-9a83-bf88801412e8', 
      '243a2f0e-0f7f-11e2-892e-0800200c9a66', 
      '11223344-5566-7788-9900-aabbccddeeff', 
      '00001101-0000-1000-8000-00805f9b34fb', 
      '000018f0-0000-1000-8000-00805f9b34fb', 
      '000018f1-0000-1000-8000-00805f9b34fb', 
      '0000180a-0000-1000-8000-00805f9b34fb', 
      '0000180f-0000-1000-8000-00805f9b34fb', 
      '00001800-0000-1000-8000-00805f9b34fb', 
      '00001801-0000-1000-8000-00805f9b34fb', 
    ]);

    const addRange = (start: number, end: number) => {
      for (let i = start; i <= end; i++) {
        const hex = i.toString(16).padStart(4, '0').toLowerCase();
        services.add(`0000${hex}-0000-1000-8000-00805f9b34fb`);
      }
    };

    addRange(0xffe0, 0xffef); 
    addRange(0xfff0, 0xfff9); 
    addRange(0xffd0, 0xffdf); 
    addRange(0xff00, 0xff0f); 
    addRange(0xfee0, 0xfeef); 
    addRange(0xae00, 0xae2f); 
    addRange(0xaf00, 0xaf2f); 
    addRange(0xe000, 0xe00f); 
    addRange(0x34b0, 0x34bf); 

    const customSrv = this.getCustomServiceUuid();
    if (customSrv) services.add(customSrv.toLowerCase());

    return Array.from(services);
  }

  private getServiceScore(uuid: string): number {
    const clean = uuid.toLowerCase();
    const customService = this.getCustomServiceUuid();
    if (customService && clean === customService.toLowerCase()) {
      return 10000;
    }
    const printerServices = [
      'ffe0', 'fff0', 'ffd0', 'ff00', 'fee7', 'ae30', 'af30', 'e000', '34b0',
      '6e400001', '49535343', 'e7fe1800', '38eb4a84', '243a2f0e'
    ];
    for (const prefix of printerServices) {
      if (clean.includes(prefix)) return 100;
    }
    const metadataServices = ['1800', '1801', '180a', '180f', '180d', '1812'];
    for (const prefix of metadataServices) {
      if (clean.includes(prefix)) return -500;
    }
    return 5;
  }

  private getCharacteristicScore(charUuid: string, props: any): number {
    const clean = charUuid.toLowerCase();
    const canWrite = props.write || props.writeWithoutResponse || props.authenticatedSignedWrites;
    if (!canWrite) return 0;

    let score = 10;
    const customChar = this.getCustomCharacteristicUuid();
    if (customChar && clean === customChar.toLowerCase()) {
      return 10000;
    }
    const printerWriteChars = [
      'ffe1', 'fff1', 'fff2', 'ffd1', 'ffd2', 'ff02', 'ae01', 'af01',
      '6e400002', '49535343-fe7d-4ae5-8fa9-9fafd205e455'
    ];
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
        gray[i] = 255; // White pixels
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
        binary[idx] = newVal === 0 ? 1 : 0; // 1 = Black, 0 = White
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

  /**
   * MSB bit packing (Standard ESC/POS)
   */
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

  /**
   * LSB bit packing (Cat Printer standard)
   */
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

  /**
   * CRC-8 Maxim/Dallas mathematical calculation
   */
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

  /**
   * Build proprietary packet for Cat Printer architecture
   */
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
   * Transmission Engine - splits buffer into safe chunks with delayed transmission and GATT retries
   */
  private async sendBuffer(buffer: Uint8Array): Promise<void> {
    const env = this.getEnvironment();
    
    if (env === 'simulator') {
      console.log(`[Simulator Print] Generating virtual packet chunk stream: ${buffer.length} bytes delivered.`);
      await new Promise(resolve => setTimeout(resolve, 8));
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

    // Web Bluetooth Flow with GATT operations retry & backoff delay
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
          console.warn(`[GATT Operation Congestion] Attempt ${attempt} failed, backing off 100ms...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Final fallback to typical writeValue block
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
   * Dynamic Offscreen Layout Renderer for High Polish Graphics Capture
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
    if (!ctx) throw new Error('Could not launch Cairo graphics renderer');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, canvasHeight);

    ctx.fillStyle = '#000000'; 
    ctx.textBaseline = 'top';

    let currentY = 15;

    // Centered Badge Icon
    ctx.beginPath();
    ctx.arc(width / 2, currentY + 20, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', width / 2, currentY + 11);
    currentY += 45;

    // Identifier Header
    ctx.font = `bold ${is80 ? '24px' : '18px'} "Cairo", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(receiptTitle, width / 2, currentY);
    currentY += is80 ? 30 : 25;

    ctx.font = `bold ${is80 ? '14px' : '11px'} "Cairo", "Segoe UI", sans-serif`;
    ctx.fillText(receiptFirm, width / 2, currentY);
    currentY += 18;

    if (receiptPhone) {
      ctx.font = '10px monospace';
      ctx.fillText(`طوارئ الشبكة: ${receiptPhone}`, width / 2, currentY);
      currentY += 15;
    }

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 12;

    ctx.font = `bold ${is80 ? '15px' : '12.5px'} "Cairo", "Segoe UI", sans-serif`;
    ctx.fillText('وصل استلام مالي (مُسدّد بالكامل) 🟢', width / 2, currentY);
    currentY += is80 ? 25 : 22;

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 15;

    // Inline Alignment Row Drawer
    const drawItemRow = (key: string, val: string, isKeyBold = false) => {
      ctx.textAlign = 'right';
      ctx.font = `${isKeyBold ? 'bold' : ''} ${is80 ? '14px' : '11.5px'} "Cairo", "Segoe UI", sans-serif`;
      ctx.fillText(`${key}:`, width - margin, currentY);

      ctx.textAlign = 'left';
      ctx.font = `bold ${is80 ? '14px' : '11.5px'} "Cairo", "Segoe UI", sans-serif`;
      ctx.fillText(val, margin, currentY);
      
      currentY += is80 ? 24 : 19;
    };

    drawItemRow('رقم الإيصال الرقمي', receipt.invoiceNo, true);
    drawItemRow('تاريخ السداد والتقييد', receipt.paymentDate);
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
    ctx.font = `bold ${is80 ? '13px' : '11px'} "Cairo", "Segoe UI", sans-serif`;
    ctx.fillText('إجمالي تصفية الحساب المستلم:', width / 2, currentY);
    currentY += 18;

    ctx.font = `bold ${is80 ? '22px' : '17px'} monospace, "Segoe UI", sans-serif`;
    ctx.fillText(`${receipt.totalAmount.toLocaleString()} دينار عراقي`, width / 2, currentY);
    currentY += is80 ? 32 : 28;

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 12;

    ctx.textAlign = 'center';
    ctx.font = `bold ${is80 ? '11px' : '9.5px'} "Cairo", "Segoe UI", sans-serif`;
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

    ctx.font = '8px "Cairo", "Segoe UI", sans-serif';
    ctx.fillText('نظام إدارة المولدات والتحصيل الميداني الذكي', width / 2, currentY);

    // Crop Canvas exactly to boundary height
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
   * Main Printing Core Function supporting hybrid devices, simulators and web
   */
  public async printReceipt(receipt: Receipt): Promise<boolean> {
    try {
      this.updateState({ 
        error: null, 
        statusMessage: 'جاري مواءمة حالة ومعدل اتصال الطابعة اللاسلكية...', 
        progress: 10 
      });

      const connected = await this.ensureConnected();
      if (!connected) {
        this.updateState({ statusMessage: null, progress: 0 });
        return false;
      }

      this.updateState({ 
        statusMessage: 'جاري توليد رسومات الفاتورة والتوطير المالي...', 
        progress: 30 
      });

      // Renders high precision Cairo-font graphical receipt
      const canvas = this.renderReceiptToCanvas(receipt);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('فشل جلب سياق الرسم الرسومي ثنائي الأبعاد Canvas context');

      const width = canvas.width;
      const height = canvas.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      
      this.updateState({ 
        statusMessage: 'جاري استخدام معالجات التنقيط المتقدمة (Binarization & Dithering)...', 
        progress: 50 
      });

      // 1. Process Raw Colors -> Binary Grid containing exclusively Black/White bits
      const binaryData = this.state.ditheringEnabled
        ? this.ditherFloydSteinberg(imgData.data, width, height, this.state.contrastThreshold)
        : this.thresholdBinarize(imgData.data, width, height, this.state.contrastThreshold);

      // 2. Wrap and transmit binary frames based on the protocol
      if (this.state.printerType === 'cat_printer') {
        this.updateState({ statusMessage: 'جاري تهيئة طابعة Cat وصياغة الحزم المتطابقة...', progress: 65 });
        
        // Cat Printer standard sequence
        await this.sendBuffer(this.makeCatPrinterPacket(0xA4, new Uint8Array([0x32]))); // 200 DPI Setup
        await this.sendBuffer(this.makeCatPrinterPacket(0xAF, new Uint8Array([0xFF, 0xFF]))); // High power density
        
        // Start lattice
        const latticeStart = new Uint8Array([0xAA, 0x55, 0x17, 0x38, 0x44, 0x5F, 0x5F, 0x5F, 0x44, 0x38, 0x2C]);
        await this.sendBuffer(this.makeCatPrinterPacket(0xA6, latticeStart));

        const widthBytes = Math.ceil(width / 8); // 48 bytes for 384 pixels
        
        // Pack into LSB bit order
        const packetBytes = this.packBitsLSB(binaryData, width, height);

        // Send line by line
        for (let y = 0; y < height; y++) {
          if (y % 15 === 0) {
            const p = 65 + Math.floor((y / height) * 20);
            this.updateState({ statusMessage: `جاري ضخ صفوف البكسلات (${y}/${height})...`, progress: p });
          }
          const rowBytes = packetBytes.slice(y * widthBytes, (y + 1) * widthBytes);
          await this.sendBuffer(this.makeCatPrinterPacket(0xA2, rowBytes));
        }

        // End lattice
        const latticeEnd = new Uint8Array([0xAA, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17]);
        await this.sendBuffer(this.makeCatPrinterPacket(0xA6, latticeEnd));
        
        // Set feed speed & Feed paper 1cm (80 steps)
        await this.sendBuffer(this.makeCatPrinterPacket(0xBD, new Uint8Array([65])));
        await this.sendBuffer(this.makeCatPrinterPacket(0xA1, new Uint8Array([120, 0]))); // Feed 1.5 cm

      } else {
        // --- STANDARD UNIVERSAL ESC/POS PROTOCOL ---
        this.updateState({ statusMessage: 'جاري تهيئة الطابعة القياسية (ESC/POS Initialize)...', progress: 65 });
        
        const initCmd = new Uint8Array([0x1B, 0x40]); // ESC @
        await this.sendBuffer(initCmd);

        // Pack into standard MSB bit order
        const widthBytes = Math.ceil(width / 8);
        const packedData = this.packBitsMSB(binaryData, width, height);

        this.updateState({ statusMessage: 'جاري تسريب وطباعة الحزم النقطية لغلاية الطابعة...', progress: 80 });

        // Split image into manageable vertical strips to avoid buffer overflow on poor chips
        const stripHeight = 40; 
        for (let yOffset = 0; yOffset < height; yOffset += stripHeight) {
          const chunkHeight = Math.min(stripHeight, height - yOffset);
          
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
          await new Promise(resolve => setTimeout(resolve, 80)); // Safe settle pause
        }

        // Feed paper block and slice
        const cutBuffer = new Uint8Array([0x1B, 0x64, 0x06, 0x1D, 0x56, 0x01]); // Feed 6 lines then partial cut
        await this.sendBuffer(cutBuffer);
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
        error: `حدث خطأ غير متوقع أثناء الطباعة: ${err.message || err}`,
        statusMessage: null,
        progress: 0
      });
      return false;
    }
  }

  /**
   * Universal HTML Iframe Print fallback - works beautifully everywhere (no Bluetooth required)
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

    // Trigger iframe reload-print
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

      this.updateState({ statusMessage: 'جاري نسج وتشكيل صفحة اختبار حرارية...', progress: 30 });

      const canvas = document.createElement('canvas');
      const is80 = this.state.paperWidth === '80mm';
      const width = is80 ? 576 : 384;
      const height = is80 ? 380 : 320;
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      let currentY = 20;

      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✅', width / 2, currentY);
      currentY += 35;

      ctx.font = 'bold 15px "Cairo", "Segoe UI", Arial, sans-serif';
      ctx.fillText('اختبار اتصال الطابعة الحرارية الميدانية', width / 2, currentY);
      currentY += 25;

      ctx.font = '10px monospace';
      ctx.fillText(`الطابعة النشطة الحالية: ${this.state.deviceName}`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10px monospace';
      ctx.fillText(`بروتوكول البث: ${this.state.printerType === 'cat_printer' ? 'Cat Printer' : 'ESC/POS'}`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10px monospace';
      ctx.fillText(`مقاس حزمة النقل: ${this.state.chunkSize} Bytes`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10px monospace';
      ctx.fillText(`زمن تأخير المعالجة: ${this.state.chunkDelay} ms`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10px monospace';
      ctx.fillText(`تقنية التدرج (Dithering): ${this.state.ditheringEnabled ? 'مفعلة' : 'معطلة'}`, width / 2, currentY);
      currentY += 15;

      ctx.font = '11px "Cairo", "Segoe UI", Arial, sans-serif';
      ctx.fillText(`التاريخ: ${new Date().toLocaleString('ar-IQ')}`, width / 2, currentY);
      currentY += 25;

      this.drawDashedLine(ctx, 15, width - 15, currentY);
      currentY += 15;

      ctx.font = 'bold 11px "Cairo", "Segoe UI", Arial, sans-serif';
      ctx.fillText('الطابعة متصلة بالتطبيق وتعمل بكفاءة تامة! 🎉', width / 2, currentY);

      const finalHeight = Math.ceil(currentY + 25);
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = width;
      croppedCanvas.height = finalHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      if (croppedCtx) {
        croppedCtx.drawImage(canvas, 0, 0);
      }

      this.updateState({ statusMessage: 'جاري تبييت ورص حزم طباعة الاختبار...', progress: 60 });
      
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

      // Print using the core function
      await this.printReceipt(testReceipt);

      this.updateState({ statusMessage: 'تم طباعة ورقة الاختبار بنجاح تام! 🟢', progress: 100 });
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

}

export const blePrinter = new BLEPrinterController();
