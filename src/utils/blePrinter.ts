/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Receipt } from '../types';

// Let's declare the Bluetooth types for TypeScript safety
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
  };

  constructor() {
    // Attempt automatic disconnection listener setup if cached
  }

  public subscribe(listener: (state: BLEPrinterState) => void) {
    this.stateChangeListeners.push(listener);
    listener({ ...this.state }); // Trigger initial state
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

  /**
   * Generates a broad compatibility list of potential custom service UUIDs
   */
  private getComprehensivePrinterServices(): string[] {
    const services = new Set<string>([
      // General transparent UART and printer standard channels
      '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Serial RX/TX Service
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC SPP UART Transparent
      'e7fe1800-be05-4866-ab74-04b15b00f5df', // Alternative Serial UART / custom modules
      '38eb4a84-c57d-4b6a-9a83-bf88801412e8', // Zebra Link-OS BLE Printer Service
      '243a2f0e-0f7f-11e2-892e-0800200c9a66', // Star Micronics BLE Service
      '11223344-5566-7788-9900-aabbccddeeff', // Alternative Star Micronics UART Service
      
      // Standard services some thermal printers publish (e.g. Epson, Star, Honeywell)
      '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP/BT) simulated UUID
      '000018f0-0000-1000-8000-00805f9b34fb', // Standard HTTP/GATT Printer Service
      '000018f1-0000-1000-8000-00805f9b34fb', // Alternative standard Printer Service
      '0000180a-0000-1000-8000-00805f9b34fb', // Device Information (Standard device query)
      '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service (Common on portable printers)
      '00001800-0000-1000-8000-00805f9b34fb', // Generic Access Service
      '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute Service
    ]);

    // Helper to generate full 128-bit UUIDs for standard 16-bit customized ranges
    const add16BitRange = (start: number, end: number) => {
      for (let i = start; i <= end; i++) {
        const hex = i.toString(16).padStart(4, '0').toLowerCase();
        services.add(`0000${hex}-0000-1000-8000-00805f9b34fb`);
      }
    };

    // Add ranges commonly utilized by Chinese and custom portable receipt/label printers:
    add16BitRange(0xffe0, 0xffef); // FFE0 to FFEF (Primary custom transparent serial, covers FFE0, FFE1, FFE2)
    add16BitRange(0xfff0, 0xfff9); // FFF0 to FFF9 (Cheap receipt printers e.g. PT-210, MPT-II, Xprinter)
    add16BitRange(0xffd0, 0xffdf); // FFD0 to FFDF (Generic hardware receipt models)
    add16BitRange(0xff00, 0xff0f); // FF00 to FF0F (Common custom data transfer, Phomemo Label/POS)
    add16BitRange(0xfee0, 0xfeef); // FEE0 to FEEF (WeChat and alternative custom BLE profiles)
    add16BitRange(0xae00, 0xae2f); // AE00 to AE2F (Jiante, Aiyin, Aimotech label styles)
    add16BitRange(0xaf00, 0xaf2f); // AF00 to AF2F (Phomemo labels and alternatives)
    add16BitRange(0xe000, 0xe00f); // E000 to E00F (Rongta / Gprinter brand styles)
    add16BitRange(0x34b0, 0x34bf); // 34B0 to 34BF (Citizen and alternative legacy styles)
    add16BitRange(0xf000, 0xf00f); // F000 to F00F (Generic BLE chips)
    add16BitRange(0xee00, 0xee0f); // EE00 to EE0F (Dual modules / cheap transceivers)

    const customService = this.getCustomServiceUuid();
    if (customService) {
      services.add(customService);
    }

    return Array.from(services);
  }

  /**
   * Scan and connect to the portable BLE printer
   */
  public async connect(): Promise<boolean> {
    // Check if running inside a native Android Webview Wrapper with an injected companion interface
    const win = window as any;
    const bridge = win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge;
    
    if (bridge) {
      this.updateState({ 
        isConnecting: true, 
        error: null, 
        statusMessage: 'جاري الاقتران مع الطابعة عبر جسر الأندرويد الأصلي (Native Bridge)...' 
      });
      try {
        if (typeof bridge.connect === 'function') {
          bridge.connect();
        }
        
        this.updateState({
          isConnected: true,
          isConnecting: false,
          deviceName: 'طابعة الأندرويد المدمجة (APK Bridge)',
          statusMessage: 'تم الاقتران بنجاح عبر نظام الأندرويد للتطبيق! ⚡',
          progress: 100
        });
        
        setTimeout(() => {
          this.updateState({ statusMessage: null, progress: 0 });
        }, 2500);
        return true;
      } catch (err: any) {
        this.updateState({
          isConnected: false,
          isConnecting: false,
          error: `فشلت محاولة الاقتران كخطأ في جسر النظام: ${err.message || err}`
        });
        return false;
      }
    }

    const nav = navigator as any;
    if (!nav.bluetooth) {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      const isInApp = /FBAN|FBAV|Instagram|Twitter|Slack|Telegram|WhatsApp|LINE|Gmail|Workplace/.test(ua);
      
      let errorMsg = '❌ متصفح الويب الحالي لا يدعم الاتصال بتقنية البلوتوث (Web Bluetooth).\n\n';
      
      if (isIOS) {
        errorMsg += '💡 حل مشكلة نظام تشغيل آيفون (iOS / iPadOS):\n' +
                    'شركة آبل (Apple) تمنع تشغيل البلوتوث نهائياً على كافة المتصفحات الافتراضية للآيفون (سواء Safari أو Chrome).\n\n' +
                    '• الخيار الأمثل للآيفون:\n' +
                    'يرجى تحميل المتصفح المخصص للطباعة اللاسلكية من متجر آب ستور مجاناً: متصفح **Bluefy** أو **WebBLE**، ثم افتح رابط التطبيق هذا بداخله وستتمكن من الاقتران بالطابعة فوراً.\n\n' +
                    '• خيار بديل سريع:\n' +
                    'استخدم أي هاتف أندرويد (Android) أو جهاز كمبيوتر محمول (Laptop) لديه بلوتوث وافتح التطبيق عبر متصفح **Google Chrome** الرسمي.\n\n' +
                    '• خيار بديل بدون بلوتوث:\n' +
                    'يمكنك دائماً تغيير خيار الطباعة الافتراضي من الأسفل إلى "طباعة عبر المتصفح" لإنشاء الفاتورة وتصديرها بصيغة PDF أو طباعتها مباشرة.';
      } else if (isInApp) {
        errorMsg += '💡 حل مشكلة المتصفح الداخلي بالتطبيقات (WhatsApp / Telegram):\n' +
                    'لقد قمت بفتح الرابط من داخل متصفح مدمج في تطبيق آخر (مثل واتساب، تلغرام، أو فيسبوك). هذه التطبيقات المدمجة تمنع ميزات البلوتوث للحماية.\n\n' +
                    '• الحل الفوري والوحيد:\n' +
                    'يرجى نسخ رابط هذا التطبيق بالكامل ولصقه مباشرة داخل تطبيق متصفح **Google Chrome** الرئيسي على هاتفك، وستعمل خاصية الاقتران فوراً.';
      } else {
        errorMsg += '💡 المتطلبات اللازمة للطباعة عبر البلوتوث للويب:\n' +
                    '• يرجى التأكد من استخدام متصفح **Google Chrome** أو **Edge** أو **Samsung Internet** الرسمي.\n' +
                    '• تأكد من تشغيل البلوتوث في هاتفك وتفعيل الموقع الجغرافي (GPS) وإعطاء صلاحية الموقع والمشاركة لمتصفح كروم (حيث تشترط بعض أنظمة الأندرويد تفعيل الموقع لتفويض البحث عن أجهزة البلوتوث القريبة).';
      }

      this.updateState({ error: errorMsg });
      return false;
    }

    try {
      this.updateState({ 
        isConnecting: true, 
        error: null, 
        statusMessage: 'جاري تشغيل قارئ البلوتوث والبحث عن الطابعات المتوفرة...', 
        progress: 10 
      });

      const comprehensiveServices = this.getComprehensivePrinterServices();

      // Request Bluetooth device
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: comprehensiveServices
      });

      this.device = device;
      this.updateState({ 
        deviceName: device.name || 'طابعة حرارية BLE',
        statusMessage: `تم تحديد الطابعة "${device.name || 'مجهولة'}". جاري بدء اتصال GATT آمن...`,
        progress: 30
      });

      // Disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });

      // Connect to GATT server
      const server = await device.gatt.connect();
      this.gattServer = server;
      
      this.updateState({
        statusMessage: 'تم التوصيل بخادم البلوتوث. جاري تمشيط قنوات الكتابة المتوافقة...',
        progress: 60
      });

      // Clean characteristic
      const writeChar = await this.discoverWriteCharacteristic(server, device);
      this.writeCharacteristic = writeChar;
      
      this.updateState({ 
        isConnected: true, 
        isConnecting: false, 
        error: null,
        statusMessage: 'تم الاقتران وتأكيد حزم الاتصال بالطابعة بنجاح! ⚡',
        progress: 100
      });

      // Clear the custom success message after 2.5 seconds
      setTimeout(() => {
        this.updateState({ statusMessage: null, progress: 0 });
      }, 2500);

      return true;
    } catch (err: any) {
      console.error('BLE Printer connection failed:', err);
      let errorMsg = err.message || 'فشل الاتصال بالطابعة عبر البلوتوث. الرجاء المحاولة مرة أخرى.';
      
      // Specifically target iframe and permission policy restrictions
      const lowerMsg = errorMsg.toLowerCase();
      if (
        err.name === 'SecurityError' || 
        lowerMsg.includes('permissions policy') || 
        lowerMsg.includes('disallowed') || 
        lowerMsg.includes('permission') || 
        lowerMsg.includes('security')
      ) {
        errorMsg = '❌ تم حظر بروتوكول البلوتوث (Web Bluetooth) بواسطة سياسة حماية نافذة المعاينة (iframe Sandbox).\n\n💡 الحل السهل والمضمون:\nيرجى الضغط على زر "فتح في علامة تبويب جديدة" (Open in New Tab) الموجود في الشريط العلوي الأخضر بأعلى جهة اليمين لتشغيل البرنامج في متصفح مستقل (مثل Google Chrome)، حيث يُسمح بالوصول الكامل والآمن لخاصية البلوتوث والاقتران بالطابعة الحرارية الميدانية فوراً وبنجاح.';
      }

      this.handleDisconnection();
      this.updateState({ 
        error: errorMsg
      });
      return false;
    }
  }

  /**
   * Verified if GATT is physically connected and characteristic is ready; if not, attempt auto-reconnect or full connect
   */
  public async ensureConnected(): Promise<boolean> {
    const win = window as any;
    if (win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge) {
      this.updateState({ isConnected: true, error: null });
      return true;
    }

    if (this.device && this.device.gatt && this.device.gatt.connected && this.writeCharacteristic) {
      this.updateState({ isConnected: true, error: null });
      return true;
    }

    if (this.device) {
      try {
        console.log('BLE Printer: GATT disconnected. Re-engaging link...');
        this.updateState({ isConnecting: true, isConnected: false, error: null });
        
        const server = await this.device.gatt.connect();
        this.gattServer = server;

        const writeChar = await this.discoverWriteCharacteristic(server, this.device);
        if (writeChar) {
          this.writeCharacteristic = writeChar;
          this.updateState({ isConnected: true, isConnecting: false, error: null });
          return true;
        }
      } catch (reconnectErr: any) {
        console.warn('Silent recon failed, engaging user dialog:', reconnectErr);
        this.handleDisconnection();
      }
    }

    return await this.connect();
  }

  /**
   * Helper to discover the best compatible write characteristic on standard/popular services
   */
  private async discoverWriteCharacteristic(server: any, device: any): Promise<any> {
    const discoveredServicesList: string[] = [];
    const discoveredCharList: { serviceUuid: string; charUuid: string; properties: any }[] = [];

    interface Candidate {
      char: any;
      serviceUuid: string;
      charUuid: string;
      serviceScore: number;
      charScore: number;
      totalScore: number;
    }
    const candidates: Candidate[] = [];

    // Query active primary services
    try {
      console.log('Querying primary services on connected device...');
      const activeServices = await server.getPrimaryServices();
      
      for (const s of activeServices) {
        discoveredServicesList.push(s.uuid);
        try {
          const characteristics = await s.getCharacteristics();
          const sScore = this.getServiceScore(s.uuid);

          for (const char of characteristics) {
            const props = char.properties;
            discoveredCharList.push({
              serviceUuid: s.uuid,
              charUuid: char.uuid,
              properties: {
                write: props.write,
                writeWithoutResponse: props.writeWithoutResponse,
                notify: props.notify,
                read: props.read
              }
            });

            const cScore = this.getCharacteristicScore(char.uuid, props);
            if (cScore > 0) {
              candidates.push({
                char,
                serviceUuid: s.uuid,
                charUuid: char.uuid,
                serviceScore: sScore,
                charScore: cScore,
                totalScore: sScore + cScore
              });
            }
          }
        } catch (innerError) {
          console.warn(`Could not fetch characteristics for ${s.uuid}:`, innerError);
        }
      }
    } catch (getServicesError) {
      console.warn('Primary service batch discovery error, utilizing fallbacks:', getServicesError);
    }

    // Fallback: Individual UUID checks
    if (candidates.length === 0) {
      console.log('Executing individual fallback channel audits...');
      
      const customService = this.getCustomServiceUuid();
      const priorityServicesList = [
        ...(customService ? [customService] : []),
        ...this.getComprehensivePrinterServices(),
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '0000fff0-0000-1000-8000-00805f9b34fb',
        '0000ffd0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ];

      const priorityServices = Array.from(new Set(priorityServicesList));

      for (const serviceUUID of priorityServices) {
        try {
          const service = await server.getPrimaryService(serviceUUID);
          if (service) {
            discoveredServicesList.push(service.uuid);
            const characteristics = await service.getCharacteristics();
            const sScore = this.getServiceScore(serviceUUID);

            for (const char of characteristics) {
              const props = char.properties;
              discoveredCharList.push({
                serviceUuid: serviceUUID,
                charUuid: char.uuid,
                properties: {
                  write: props.write,
                  writeWithoutResponse: props.writeWithoutResponse,
                  notify: props.notify,
                  read: props.read
                }
              });

              const cScore = this.getCharacteristicScore(char.uuid, props);
              if (cScore > 0) {
                candidates.push({
                  char,
                  serviceUuid: serviceUUID,
                  charUuid: char.uuid,
                  serviceScore: sScore,
                  charScore: cScore,
                  totalScore: sScore + cScore
                });
              }
            }
          }
        } catch (sErr) {
          // Normal fallback flow
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.totalScore - a.totalScore);
      const bestCandidate = candidates[0];
      console.log(`[Selected Bluetooth Socket] Channel: ${bestCandidate.charUuid} on Service: ${bestCandidate.serviceUuid} (Rank: ${bestCandidate.totalScore})`);
      return bestCandidate.char;
    }

    const uniqueServices = Array.from(new Set(discoveredServicesList));
    const servicesSummary = uniqueServices.length > 0 
      ? uniqueServices.map(uuid => `• ${uuid.substring(4, 8).toUpperCase()} (${uuid})`).join('\n') 
      : '• لم نكتشف أي خدمات مرخصة أو مدعومة.';

    const charSummary = discoveredCharList.length > 0
      ? discoveredCharList.map(c => `• القناة: ${c.charUuid.substring(4, 8).toUpperCase()}, الخدمة: ${c.serviceUuid.substring(4, 8).toUpperCase()} [كتابة: ${c.properties.write ? 'متاحة' : 'غير متاحة'}]`).join('\n')
      : '• لم يتم اكتشاف قنوات للكتابة.';

    throw new Error(
      `❌ تعذر اكتشاف قناة الطباعة اللاسلكية المتوافقة في هذه الطابعة.\n\n` +
      `• الاسم المسجل: ${device.name || 'طابعة حرارية'}\n` +
      `• الخدمات النشطة:\n${servicesSummary}\n\n` +
      `• القنوات الفرعية المكتشفة:\n${charSummary}`
    );
  }

  /**
   * Disconnect from current printer
   */
  public disconnect() {
    if (this.gattServer && this.gattServer.connected) {
      this.gattServer.disconnect();
    }
    this.handleDisconnection();
  }

  private handleDisconnection() {
    this.device = null;
    this.gattServer = null;
    this.writeCharacteristic = null;
    this.updateState({
      isConnected: false,
      isConnecting: false,
      deviceName: null
    });
  }

  /**
   * Raw printer helper to send chunked byte buffers sequentially with customized delays.
   * This is critical to prevent cheap portable printers from choking, crashing, or cutting off lines.
   */
  private async sendBuffer(data: Uint8Array): Promise<void> {
    if (!this.writeCharacteristic) {
      throw new Error('الطابعة غير متصلة حالياً. الرجاء الاقتران بالطابعة أولاً.');
    }

    const maxChunkSize = this.state.chunkSize;
    const chunkDelayMs = this.state.chunkDelay;
    let offset = 0;

    const props = this.writeCharacteristic.properties;
    const canWriteWithoutResponse = props.writeWithoutResponse;
    const canWriteWithResponse = props.write;

    while (offset < data.length) {
      const chunk = data.slice(offset, offset + maxChunkSize);
      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        const attemptWrite = async () => {
          if (canWriteWithoutResponse && typeof this.writeCharacteristic.writeValueWithoutResponse === 'function') {
            await this.writeCharacteristic.writeValueWithoutResponse(chunk);
          } else if (canWriteWithResponse && typeof this.writeCharacteristic.writeValueWithResponse === 'function') {
            await this.writeCharacteristic.writeValueWithResponse(chunk);
          } else if (typeof this.writeCharacteristic.writeValueWithoutResponse === 'function') {
            await this.writeCharacteristic.writeValueWithoutResponse(chunk);
          } else if (typeof this.writeCharacteristic.writeValueWithResponse === 'function') {
            await this.writeCharacteristic.writeValueWithResponse(chunk);
          } else {
            await this.writeCharacteristic.writeValue(chunk);
          }
        };

        let timeoutId: any;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('GATT_TIMEOUT')), 1500);
        });

        try {
          await Promise.race([attemptWrite(), timeoutPromise]);
          success = true;
        } catch (err: any) {
          const errMsg = err.message || '';
          
          if (errMsg === 'GATT_TIMEOUT') {
            console.warn('GATT ACK timed out. Forcing flush to next segment...');
            success = true; 
          } else if (errMsg.includes('in progress') || errMsg.includes('busy') || err.name === 'NetworkError') {
            retries--;
            console.warn(`GATT pipeline congested. Refreshing, Retries left: ${retries}...`);
            await new Promise(resolve => setTimeout(resolve, 100)); 
          } else {
            try {
              const fallbackPromise = (async () => {
                if (typeof this.writeCharacteristic.writeValue === 'function') {
                  await this.writeCharacteristic.writeValue(chunk);
                } else if (typeof this.writeCharacteristic.writeValueWithoutResponse === 'function') {
                  await this.writeCharacteristic.writeValueWithoutResponse(chunk);
                } else {
                  await this.writeCharacteristic.writeValueWithResponse(chunk);
                }
              })();
              
              await Promise.race([fallbackPromise, timeoutPromise]);
              success = true;
            } catch (innerErr: any) {
              const innerMsg = innerErr.message || '';
              if (innerMsg === 'GATT_TIMEOUT') {
                success = true;
              } else if (innerMsg.includes('in progress') || innerMsg.includes('busy')) {
                retries--;
                await new Promise(resolve => setTimeout(resolve, 100));
              } else {
                console.error('All BLE transfer methods failed:', innerErr);
                throw new Error('فشل إرسال حزمة الدفعات للبلوتوث. الرجاء تقريب الطابعة وإعادة الاقتران.');
              }
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (!success) {
        throw new Error('حدث احتقان مستمر في منقذ معلومات طابعة البلوتوث (GATT Busy). يرجى زيادة فترة التأخير بين الحزم من الإعدادات.');
      }

      offset += maxChunkSize;
      
      if (offset < data.length && chunkDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, chunkDelayMs));
      }
    }
  }

  private getInitCommands(): Uint8Array {
    return new Uint8Array([0x1B, 0x40]); // ESC @ (Initialize)
  }

  private getFeedAndCutCommands(linesToFeed = 5): Uint8Array {
    const list = [];
    for (let i = 0; i < linesToFeed; i++) {
      list.push(0x0A);
    }
    list.push(0x1D, 0x56, 0x01); // Safe ESCPOS Partial cut
    return new Uint8Array(list);
  }

  /**
   * High performance bitmap parsing with Floyd-Steinberg dithering or adaptive thresholding
   */
  private convertCanvasRectToEscPosRaster(
    canvas: HTMLCanvasElement,
    startY: number,
    renderHeight: number
  ): Uint8Array {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2D context');

    const width = canvas.width;    
    const imgData = ctx.getImageData(0, startY, width, renderHeight);
    const pixels = imgData.data;

    const widthBytes = width / 8;
    const rasterDataSize = widthBytes * renderHeight;
    const rasterBytes = new Uint8Array(rasterDataSize);

    const threshold = this.state.contrastThreshold;
    const doDither = this.state.ditheringEnabled;

    if (doDither) {
      // 1. Floyd-Steinberg Dithering Error Diffusion
      const grey = new Float32Array(width * renderHeight);
      for (let i = 0; i < width * renderHeight; i++) {
        const pixelIdx = i * 4;
        const r = pixels[pixelIdx];
        const g = pixels[pixelIdx + 1];
        const b = pixels[pixelIdx + 2];
        const a = pixels[pixelIdx + 3];
        // Luminance with alpha blending
        if (a < 50) {
          grey[i] = 255; // White background
        } else {
          grey[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }
      }

      for (let y = 0; y < renderHeight; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const oldVal = grey[idx];
          const newVal = oldVal < threshold ? 0 : 255;
          
          if (newVal === 0) {
            const byteIdx = y * widthBytes + Math.floor(x / 8);
            const bitIdx = 7 - (x % 8);
            rasterBytes[byteIdx] |= (1 << bitIdx);
          }

          const err = oldVal - newVal;
          // Diffuse errors to neighbors
          if (x + 1 < width) {
            grey[idx + 1] += err * (7 / 16);
          }
          if (y + 1 < renderHeight) {
            if (x - 1 >= 0) {
              grey[idx + width - 1] += err * (3 / 16);
            }
            grey[idx + width] += err * (5 / 16);
            if (x + 1 < width) {
              grey[idx + width + 1] += err * (1 / 16);
            }
          }
        }
      }
    } else {
      // 2. Faster high-contrast thresholding (highly readable on budget receipts)
      for (let y = 0; y < renderHeight; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIdx = (y * width + x) * 4;
          const r = pixels[pixelIdx];
          const g = pixels[pixelIdx + 1];
          const b = pixels[pixelIdx + 2];
          const a = pixels[pixelIdx + 3];

          let isBlack = false;
          if (a >= 50) {
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            isBlack = luminance < threshold; 
          }

          if (isBlack) {
            const byteIdx = y * widthBytes + Math.floor(x / 8);
            const bitIdx = 7 - (x % 8);
            rasterBytes[byteIdx] |= (1 << bitIdx);
          }
        }
      }
    }

    // Command Header for ESC/POS Raster bit-image mode (GS v 0 m xL xH yL yH)
    const header = new Uint8Array([
      0x1D, 0x76, 0x30, 0x00, 
      widthBytes % 256, Math.floor(widthBytes / 256), 
      renderHeight % 256, Math.floor(renderHeight / 256) 
    ]);

    const result = new Uint8Array(header.length + rasterBytes.length);
    result.set(header, 0);
    result.set(rasterBytes, header.length);

    return result;
  }

  /**
   * Renders the receipt beautifully to an off-screen HTMLCanvasElement
   */
  private renderReceiptToEscPosDevice(receipt: Receipt): HTMLCanvasElement {
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
    if (!ctx) throw new Error('Could not launch Cairo canvas graphics renderer');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, canvasHeight);

    ctx.fillStyle = '#000000'; 
    ctx.textBaseline = 'top';

    let currentY = 15;

    // 1. Centered Badge
    ctx.beginPath();
    ctx.arc(width / 2, currentY + 20, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    
    ctx.font = 'bold 16px "Cairo", "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', width / 2, currentY + 11);
    currentY += 45;

    // 2. Company Identity
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

    // RTL Item Row aligned Helper
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

    // Aesthetic Barcode
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
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Execute BLE printing of receipt (supports ESC/POS and Cat Printer)
   */
  public async printReceipt(receipt: Receipt): Promise<boolean> {
    try {
      this.updateState({ 
        error: null, 
        statusMessage: 'جاري فحص حالة الاتصال بالطابعة الحرارية...', 
        progress: 10 
      });

      const win = window as any;
      const bridge = win.AndroidPrinter || win.Android || win.PrintInterface || win.PrinterBridge;
      if (bridge) {
        this.updateState({ 
          statusMessage: 'جاري إعداد وإرسال الفاتورة عبر جسر الأندرويد المدمج...', 
          progress: 50 
        });
        
        try {
          if (typeof bridge.printReceipt === 'function') {
            bridge.printReceipt(JSON.stringify(receipt));
          } else if (typeof bridge.print === 'function') {
            bridge.print(JSON.stringify(receipt));
          } else if (typeof bridge.printText === 'function') {
            const receiptTitle = localStorage.getItem('receipt_title') || 'نظام مولدتي للخدمات الأهلية';
            const receiptFooter = localStorage.getItem('receipt_footer') || 'شكراً لالتزامكم بالتسديد الشهري.';
            const text = `${receiptTitle}\n====================\nرقم الوصل: ${receipt.invoiceNo}\nالاسم: ${receipt.subscriberName}\nالمبلغ: ${receipt.totalAmount.toLocaleString()} د.ع\n====================\n${receiptFooter}`;
            bridge.printText(text);
          } else {
            bridge.print(receipt.invoiceNo, receipt.subscriberName, receipt.totalAmount);
          }
          
          this.updateState({ 
            statusMessage: 'تم بث وإرسال الفاتورة لخاصية الأندرويد بنجاح! 🎉', 
            progress: 100 
          });
          setTimeout(() => {
            this.updateState({ statusMessage: null, progress: 0 });
          }, 2000);
          return true;
        } catch (bridgeErr: any) {
          throw new Error(`تعذر الطباعة عبر جسر الأندرويد: ${bridgeErr.message || bridgeErr}`);
        }
      }
      
      const connected = await this.ensureConnected();
      if (!connected || !this.writeCharacteristic) {
        this.updateState({ statusMessage: null, progress: 0 });
        return false;
      }

      this.updateState({ 
        statusMessage: 'جاري رسم وتنسيق بيانات الفاتورة حرارياً...', 
        progress: 25 
      });
      
      const canvas = this.renderReceiptToEscPosDevice(receipt);
      
      if (this.state.printerType === 'cat_printer') {
        // --- CAT PRINTER PROTOCOL ---
        this.updateState({ 
          statusMessage: 'جاري بدء الاتصال والتحضير لطابعة Cat...', 
          progress: 35 
        });
        
        await this.sendBuffer(makeCatPrinterPacket(0x1a, 0x00, new Uint8Array([])));
        await this.sendBuffer(makeCatPrinterPacket(0x10, 0x00, new Uint8Array([])));
        await this.sendBuffer(makeCatPrinterPacket(0xaf, 0x03, new Uint8Array([]))); 

        const totalRows = canvas.height;
        for (let y = 0; y < totalRows; y++) {
          if (y % 10 === 0) {
            const rowProgress = 35 + Math.floor((y / totalRows) * 45);
            this.updateState({
              statusMessage: `جاري تغذية حزم الأسطر الرسومية (${y} / ${totalRows})...`,
              progress: rowProgress
            });
          }
          const rowBytes = this.convertRowToCatPrinterBytes(canvas, y);
          const rowPacket = makeCatPrinterPacket(0xa2, 0x00, rowBytes);
          await this.sendBuffer(rowPacket);
        }

        this.updateState({ 
          statusMessage: 'جاري دفع وتغذية ورق الفاتورة النهائي...', 
          progress: 85 
        });

        const feedLines = 100;
        const blankRow = new Uint8Array(48); 
        for (let i = 0; i < feedLines; i++) {
          const rowPacket = makeCatPrinterPacket(0xa2, 0x00, blankRow);
          await this.sendBuffer(rowPacket);
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }

        await this.sendBuffer(makeCatPrinterPacket(0x1a, 0x00, new Uint8Array([])));

      } else {
        // --- STANDARD ESC/POS FLOW ---
        this.updateState({ 
          statusMessage: 'جاري تمكين وتصفير قناة الطباعة (ESC/POS)...', 
          progress: 35 
        });
        
        await this.sendBuffer(this.getInitCommands());
        await new Promise(resolve => setTimeout(resolve, 50));

        // Let's divide into high performance stripes
        const sliceHeight = 40;
        const totalHeight = canvas.height;
        const totalSlices = Math.ceil(totalHeight / sliceHeight);
        let sliceIdx = 0;

        for (let startY = 0; startY < totalHeight; startY += sliceHeight) {
          sliceIdx++;
          const sliceProgress = 35 + Math.floor((sliceIdx / totalSlices) * 45);
          this.updateState({
            statusMessage: `جاري بث حزم البكسلات (${sliceIdx} / ${totalSlices}) للطابعة...`,
            progress: sliceProgress
          });
          
          const renderHeight = Math.min(sliceHeight, totalHeight - startY);
          const stripePayload = this.convertCanvasRectToEscPosRaster(canvas, startY, renderHeight);
          await this.sendBuffer(stripePayload);
          
          // Little breather after standard stripe
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.updateState({ 
          statusMessage: 'جاري تغذية الورق وإجراء القص التلقائي...', 
          progress: 90 
        });

        const endCommand = this.getFeedAndCutCommands(isMobileApp() ? 6 : 5);
        await this.sendBuffer(endCommand);
      }

      this.updateState({ 
        statusMessage: 'تمت الطباعة بنجاح تام! 🎉', 
        progress: 100 
      });
      
      setTimeout(() => {
        this.updateState({ statusMessage: null, progress: 0 });
      }, 3000);

      return true;
    } catch (err: any) {
      console.error('BLE Printing failure:', err);
      this.handleDisconnection(); 
      this.updateState({ 
        error: err.message || 'فشلت عملية نقل البيانات إلى الطابعة. يرجى التحقق من اقتران البلوتوث.',
        statusMessage: null,
        progress: 0
      });
      return false;
    }
  }

  /**
   * Triggers the beautiful native Web Browser Print Dialog
   * Highly optimized to serve as the ultimate standard Web App printing fallback
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
              border: 1px dashed #555;
              padding: 12px;
              box-sizing: border-box;
            }
            .header { font-size: 15px; font-weight: 700; margin-bottom: 2px; color: #000; }
            .sub-header { font-size: 10.5px; color: #444; margin-bottom: 4px; }
            .divider { border-top: 1px dashed #444; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; font-size: 11.5px; margin: 4px 0; }
            .row.bold { font-weight: 700; font-size: 12.5px; color: #000; }
            .amount-box {
              background: #fcfcfc;
              padding: 6px;
              border-radius: 4px;
              margin: 8px 0;
              font-weight: 700;
              font-size: 13.5px;
              border: 1px dashed #333;
              color: #000;
              text-align: center;
            }
            .footer { font-size: 10px; color: #333; margin-top: 12px; font-weight: 700; }
            .barcode { font-family: monospace; font-size: 11px; margin-top: 8px; border: 1px solid #000; padding: 4px; display: inline-block; letter-spacing: 2px; }
            .watermark { font-size: 8px; margin-top: 6px; color: #555; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">${receiptTitle}</div>
            <div class="sub-header">${receiptFirm}</div>
            ${receiptPhone ? `<div class="sub-header">الهاتف: ${receiptPhone}</div>` : ''}
            <div class="divider"></div>
            <div class="row bold"><span>وصل استلام مالي</span> <span style="color:#059669;">مُسدّد بـالكامل 👍</span></div>
            <div class="row"><span>رقم الوصل:</span> <span style="font-weight:700;">${receipt.invoiceNo}</span></div>
            <div class="row"><span>تاريخ ووقت السداد:</span> <span>${receipt.paymentDate}</span></div>
            <div class="divider"></div>
            <div class="row bold"><span>المشترك:</span> <span>${receipt.subscriberName}</span></div>
            <div class="row"><span>الهاتف:</span> <span>${receipt.subscriberPhone}</span></div>
            <div class="row"><span>نوع الاشتراك:</span> <span>${receipt.subscriptionType}</span></div>
            <div class="row"><span>الأمبيرات:</span> <span>${receipt.amps} أمبير</span></div>
            <div class="row"><span>سعر الأمبير المنظّم:</span> <span>${receipt.pricePerAmp.toLocaleString()} د.ع</span></div>
            <div class="row"><span>بوابة الدفع:</span> <span>${receipt.paymentMethod}</span></div>
            <div class="row"><span>الجابي المستلم:</span> <span>${receipt.accountantName}</span></div>
            <div class="divider"></div>
            <div class="amount-box">
              المبلغ المقبوض: ${receipt.totalAmount.toLocaleString()} د.ع
            </div>
            <div class="divider"></div>
            <p class="footer">${receiptFooter}</p>
            <div class="barcode">*${receipt.invoiceNo}*</div>
            <div class="watermark">نظام إدارة المولدات - شركة الحلول المتميزة EX</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 250);
            }
          </script>
        </body>
      </html>
    `);
    doc.close();
    return true;
  }

  /**
   * Print a beautifully structured graphic test invoice
   */
  public async printTestPage(): Promise<boolean> {
    try {
      this.updateState({ 
        error: null, 
        statusMessage: 'جاري فحص حالة الاتصال بالطابعة الحرارية...', 
        progress: 10 
      });

      const connected = await this.ensureConnected();
      if (!connected || !this.writeCharacteristic) {
        this.updateState({ statusMessage: null, progress: 0 });
        return false;
      }

      this.updateState({ 
        statusMessage: 'جاري توليد صفحة الفحص الرسومية...', 
        progress: 25 
      });

      const canvas = document.createElement('canvas');
      const is85_or_80 = this.state.paperWidth === '80mm';
      const width = is85_or_80 ? 576 : 384;
      const height = is85_or_80 ? 380 : 320;
      
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

      this.drawDashedLine(ctx, 20, width - 20, currentY);
      currentY += 15;

      ctx.font = 'bold 11.5px "Cairo", "Segoe UI", Arial, sans-serif';
      ctx.fillText('النظام الحراري جاهز لطباعة الوصولات بنجاح ⚡', width / 2, currentY);
      currentY += 18;

      const size = 15;
      const startX = width / 2 - (size * 8) / 2;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#000000' : '#444444';
        ctx.fillRect(startX + i * size, currentY, size, size);
      }
      
      if (this.state.printerType === 'cat_printer') {
        this.updateState({ 
          statusMessage: 'جاري بدء الاتصال والتحضير لطابعة Cat...', 
          progress: 35 
        });

        await this.sendBuffer(makeCatPrinterPacket(0x1a, 0x00, new Uint8Array([])));
        await this.sendBuffer(makeCatPrinterPacket(0x10, 0x00, new Uint8Array([])));
        await this.sendBuffer(makeCatPrinterPacket(0xaf, 0x03, new Uint8Array([])));

        const totalRows = canvas.height;
        for (let y = 0; y < totalRows; y++) {
          if (y % 10 === 0) {
            const rowProgress = 35 + Math.floor((y / totalRows) * 45);
            this.updateState({
              statusMessage: `جاري نقل صفوف الفحص (${y} / ${totalRows})...`,
              progress: rowProgress
            });
          }
          const rowBytes = this.convertRowToCatPrinterBytes(canvas, y);
          const rowPacket = makeCatPrinterPacket(0xa2, 0x00, rowBytes);
          await this.sendBuffer(rowPacket);
        }
 
        this.updateState({ 
          statusMessage: 'جاري دفع وتغذية ورق الفحص النهائي...', 
          progress: 85 
        });

        const feedLines = 80;
        const blankRow = new Uint8Array(48); 
        for (let i = 0; i < feedLines; i++) {
          const rowPacket = makeCatPrinterPacket(0xa2, 0x00, blankRow);
          await this.sendBuffer(rowPacket);
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
 
        await this.sendBuffer(makeCatPrinterPacket(0x1a, 0x00, new Uint8Array([])));
 
      } else {
        this.updateState({ 
          statusMessage: 'جاري تهيئة قناة الطباعة (ESC/POS)...', 
          progress: 35 
        });

        await this.sendBuffer(this.getInitCommands());
        await new Promise(resolve => setTimeout(resolve, 50));
 
        const sliceHeight = 40;
        const totalHeight = canvas.height;
        const totalSlices = Math.ceil(totalHeight / sliceHeight);
        let sliceIdx = 0;
 
        for (let startY = 0; startY < totalHeight; startY += sliceHeight) {
          sliceIdx++;
          const sliceProgress = 35 + Math.floor((sliceIdx / totalSlices) * 45);
          this.updateState({
            statusMessage: `جاري طباعة الجزء (${sliceIdx} من ${totalSlices}) لصفحة الفحص...`,
            progress: sliceProgress
          });

          const renderHeight = Math.min(sliceHeight, totalHeight - startY);
          const stripePayload = this.convertCanvasRectToEscPosRaster(canvas, startY, renderHeight);
          await this.sendBuffer(stripePayload);
          await new Promise(resolve => setTimeout(resolve, 80));
        }
 
        this.updateState({ 
          statusMessage: 'جاري إنهاء صفحة الفحص وقص الورق المتطابق...', 
          progress: 90 
        });

        const endCommand = this.getFeedAndCutCommands(4);
        await this.sendBuffer(endCommand);
      }
 
      this.updateState({ 
        statusMessage: 'تمت طباعة صفحة الاختبار بنجاح تام! 🎉', 
        progress: 100 
      });

      setTimeout(() => {
        this.updateState({ statusMessage: null, progress: 0 });
      }, 3000);

      return true;
    } catch (err: any) {
      console.error('Test print failed:', err);
      this.handleDisconnection(); 
      this.updateState({ 
        error: err.message || 'فشلت طباعة صفحة الاختبار.',
        statusMessage: null,
        progress: 0
      });
      return false;
    }
  }

  /**
   * SCORE SERVICE
   */
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
      if (clean.includes(prefix)) {
        return 100;
      }
    }

    const metadataServices = [
      '1800', '1801', '180a', '180f', '180d', '1812'
    ];
    for (const prefix of metadataServices) {
      if (clean.includes(prefix)) {
        return -500; 
      }
    }

    return 5; 
  }

  /**
   * SCORE CHARACTERISTIC
   */
  private getCharacteristicScore(charUuid: string, props: any): number {
    const clean = charUuid.toLowerCase();

    const canWrite = props.write || props.writeWithoutResponse || props.authenticatedSignedWrites;
    if (!canWrite) {
      return 0;
    }

    let score = 10;

    const customChar = this.getCustomCharacteristicUuid();
    if (customChar && clean === customChar.toLowerCase()) {
      return 10000; 
    }

    const printerWriteChars = [
      'ffe1', 'fff1', 'fff2', 'ffd1', 'ffd2', 'ff02', 'ae01', 'af01',
      '6e400002', 
      '49535343-fe7d-4ae5-8fa9-9fafd205e455' 
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

  private convertRowToCatPrinterBytes(canvas: HTMLCanvasElement, y: number): Uint8Array {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2D context');

    const width = 384; 
    const imgData = ctx.getImageData(0, y, width, 1);
    const pixels = imgData.data;

    const widthBytes = 48; 
    const rowBytes = new Uint8Array(widthBytes);

    const threshold = this.state.contrastThreshold;

    for (let x = 0; x < width; x++) {
      const pixelIdx = x * 4;
      const r = pixels[pixelIdx];
      const g = pixels[pixelIdx+1];
      const b = pixels[pixelIdx+2];
      const a = pixels[pixelIdx+3];

      let isBlack = false;
      if (a >= 50) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        isBlack = luminance < threshold; 
      }

      if (isBlack) {
        const byteIdx = Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        rowBytes[byteIdx] |= (1 << bitIdx);
      }
    }

    return rowBytes;
  }
}

function makeCatPrinterPacket(cmd: number, arg: number, payload: Uint8Array): Uint8Array {
  const header = [0x51, 0x78];
  const cmdArg = [cmd, arg];
  const len = payload.length;
  const lenBytes = [len & 0xff, (len >> 8) & 0xff];

  let checksum = 0;
  for (let i = 0; i < payload.length; i++) {
    checksum = (checksum + payload[i]) & 0xff;
  }

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

function isMobileApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

export const blePrinter = new BLEPrinterController();
