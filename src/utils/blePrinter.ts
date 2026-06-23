/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Receipt } from '../types';

// Let's declare the Bluetooth types for TypeScript safety
type BluetoothEvent = Event & { target: any };

export interface BLEPrinterState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  paperWidth: '58mm' | '80mm';
  printerType: 'esc_pos' | 'cat_printer';
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
    error: null,
    statusMessage: null,
    progress: 0,
  };

  constructor() {
    // Attempt automatic disconnection listener if device is cached
    // In browser environment, auto-reconnect can be configured
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

  // Generate a comprehensive, 100% compliant list of potential custom service UUIDs
  // All elements are structured as standard 128-bit lowercase strings to prevent browser-specific TypeError rejections
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
    const nav = navigator as any;
    if (!nav.bluetooth) {
      this.updateState({ error: 'مستعرض الويب الحالي لا يدعم الاتصال بتقنية بلوتوث Web Bluetooth. يرجى استخدام Google Chrome أو متصفح يدعم BLE.' });
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

      // Request Bluetooth thermal printer device
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: comprehensiveServices
      });

      this.device = device;
      this.updateState({ 
        deviceName: device.name || 'طابعة حرارية BLE',
        statusMessage: `تم تحديد الطابعة "${device.name || 'مجهولة'}". جاري وبدء الاتصال بقنوات GATT...`,
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
        statusMessage: 'تم إنشاء الاتصال بنجاح. جاري البحث المتقدم عن قنوات الكتابة المتوافقة...',
        progress: 60
      });

      // Classify characteristic
      const writeChar = await this.discoverWriteCharacteristic(server, device);
      this.writeCharacteristic = writeChar;
      
      this.updateState({ 
        isConnected: true, 
        isConnecting: false, 
        error: null,
        statusMessage: 'تم الاقتران وتفعيل قناة الطباعة الحرارية بنجاح تام! ⚡',
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
      if (err.name === 'SecurityError' || errorMsg.includes('permissions policy') || errorMsg.includes('disallowed')) {
        errorMsg = '❌ تم حظر بروتوكول البلوتوث (Web Bluetooth) بواسطة سياسة الحماية داخل نافذة المعاينة (iframe). يُرجى الضغط على زر "فتح في علامة تبويب جديدة" (Open in New Tab) بأعلى اليمين لتشغيل البرنامج في صفحة مستقلة ومنحه حق الوصول للطابعة الحرارية بنجاح.';
      }

      this.handleDisconnection();
      this.updateState({ 
        error: errorMsg
      });
      return false;
    }
  }

  /**
   * Verify if GATT is physically connected and characteristic is ready; if not, attempt auto-reconnect or full connect
   */
  public async ensureConnected(): Promise<boolean> {
    if (this.device && this.device.gatt && this.device.gatt.connected && this.writeCharacteristic) {
      this.updateState({ isConnected: true, error: null });
      return true;
    }

    if (this.device) {
      try {
        console.log('BLE Printer: Disconnection detected. Attempting silent GATT reconnection...');
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
        console.warn('BLE Printer auto-reconnection failed. Forcing full pair/connection:', reconnectErr);
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

    // 1. Primary method: Retrieve all matching services provided by the browser in one call.
    try {
      console.log('Querying all allowed primary services on connected device...');
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
          console.warn(`Failed to discover characteristics for service ${s.uuid}:`, innerError);
        }
      }
    } catch (getServicesError) {
      console.warn('Batch discovery of services threw an error, falling back to individual queries:', getServicesError);
    }

    // 2. Fallback method: If batch discovery yielded no results or candidates, query individual services.
    if (candidates.length === 0) {
      console.log('Falling back to querying individual popular service UUIDs...');
      
      const customService = this.getCustomServiceUuid();
      const priorityServicesList = [
        ...(customService ? [customService] : []),
        ...this.getComprehensivePrinterServices(),
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '0000fff0-0000-1000-8000-00805f9b34fb',
        '0000ffd0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ae30-0000-1000-8000-00805f9b34fb',
        '000018f0-0000-1000-8000-00805f9b34fb',
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ];

      // Remove duplicates from priority list
      const priorityServices = Array.from(new Set(priorityServicesList));

      for (const serviceUUID of priorityServices) {
        try {
          const service = await server.getPrimaryService(serviceUUID);
          if (service) {
            if (!discoveredServicesList.includes(service.uuid)) {
              discoveredServicesList.push(service.uuid);
            }
            const characteristics = await service.getCharacteristics();
            const sScore = this.getServiceScore(service.uuid);

            for (const char of characteristics) {
              const props = char.properties;
              discoveredCharList.push({
                serviceUuid: service.uuid,
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
                  serviceUuid: service.uuid,
                  charUuid: char.uuid,
                  serviceScore: sScore,
                  charScore: cScore,
                  totalScore: sScore + cScore
                });
              }
            }
          }
        } catch (e) {
          // not found, continue
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.totalScore - a.totalScore);
      const bestCandidate = candidates[0];
      console.log(`[Priority-Scoring Selected] Selected char: ${bestCandidate.charUuid} under service ${bestCandidate.serviceUuid} (Score: ${bestCandidate.totalScore})`);
      return bestCandidate.char;
    }

    const uniqueServices = Array.from(new Set(discoveredServicesList));
    const servicesSummary = uniqueServices.length > 0 
      ? uniqueServices.map(uuid => `• ${uuid.substring(4, 8).toUpperCase()} (${uuid})`).join('\n') 
      : '• لم يتم اكتشاف خدمات مسموحة أو خدمات متوافقة.';

    const charSummary = discoveredCharList.length > 0
      ? discoveredCharList.map(c => `• القناة: ${c.charUuid.substring(4, 8).toUpperCase()}, الخدمة: ${c.serviceUuid.substring(4, 8).toUpperCase()} [الكتابة: ${c.properties.write ? 'متاحة' : 'غير متاحة'}]`).join('\n')
      : '• لم يتم العثور على أي قنوات.';

    throw new Error(
      `❌ لم يتم العثور على القناة المخصصة للكتابة والطباعة في هذا الجهاز.\n\n` +
      `• اسم الجهاز المتصل: ${device.name || 'طابعة حرارية'}\n` +
      `• الخدمات المكتشفة بنجاح:\n${servicesSummary}\n\n` +
      `• قنوات الاتصال المكتشفة:\n${charSummary}`
    );
  }

  /**
   * Gracefully disconnect from active printer
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
   * Raw printer helper to send chunked byte buffers sequentially with a brief rest to avoid printer RX buffer buffer overflow crashes.
   */
  private async sendBuffer(data: Uint8Array): Promise<void> {
    if (!this.writeCharacteristic) {
      throw new Error('الطابعة غير متصلة حالياً. الرجاء الاتصال بالطابعة أولاً.');
    }

    // Optimized chunk size to 120 bytes to match typical BLE MTUs (prevents GATT stack delays)
    const maxChunkSize = 120;
    let offset = 0;

    const props = this.writeCharacteristic.properties;
    const canWriteWithoutResponse = props.writeWithoutResponse;
    const canWriteWithResponse = props.write;

    while (offset < data.length) {
      const chunk = data.slice(offset, offset + maxChunkSize);
      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        // Construct standard write execution
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

        // Construct 1200ms timeout promise. Budget receipt printers often accept serial data but neglect to return Bluetooth GATT ACK packets.
        // If a standard write hangs, we do not lock up the user interface. We assume it printed on the chip's internal buffer and move on.
        let timeoutId: any;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('GATT_TIMEOUT')), 1200);
        });

        try {
          await Promise.race([attemptWrite(), timeoutPromise]);
          success = true;
        } catch (err: any) {
          const errMsg = err.message || '';
          
          if (errMsg === 'GATT_TIMEOUT') {
            console.warn('GATT write ACK timed out (possible budget printer without Bluetooth confirmations). Assuming success to prevent system freeze...');
            success = true; // Assume sent successfully on ACK-less devices
          } else if (errMsg.includes('in progress') || errMsg.includes('busy') || err.name === 'NetworkError') {
            retries--;
            console.warn(`GATT busy/in-progress error. Cooling down and retrying... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 80)); // Let the GATT queue clear
          } else {
            // Unrecognized failure: attempt fallback to general writeValue directly
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
                console.warn('GATT fallback write ACK timed out. Continuing print loop...');
                success = true;
              } else if (innerMsg.includes('in progress') || innerMsg.includes('busy')) {
                retries--;
                await new Promise(resolve => setTimeout(resolve, 80));
              } else {
                console.error('All write attempts and fallbacks failed:', innerErr);
                throw new Error('فشلت كتابة البيانات لمخزن البلوتوث. تأكد من أن الاتصال لا يزال نشطاً.');
              }
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (!success) {
        throw new Error('فشل إرسال البيانات المقطعة للطابعة بسبب انشغال ناقل حركة البلوتوث (GATT Busy).');
      }

      offset += maxChunkSize;
      
      // Minor microtask pause (2ms) instead of heavy 15ms delay inside a single command buffer
      if (offset < data.length) {
        await new Promise(resolve => setTimeout(resolve, 2));
      }
    }
  }

  /**
   * Standard ESC/POS commands initialization
   */
  private getInitCommands(): Uint8Array {
    return new Uint8Array([
      0x1B, 0x40, // ESC @ (Initialize printer)
    ]);
  }

  /**
   * Feed and cutting commands
   */
  private getFeedAndCutCommands(linesToFeed = 5): Uint8Array {
    const list = [];
    // Emit standard LF (Line Feed) characters
    for (let i = 0; i < linesToFeed; i++) {
      list.push(0x0A); // LF
    }
    // Standard ESC/POS partial paper cut command (GS V 1) which is widely supported
    list.push(0x1D, 0x56, 0x01);
    return new Uint8Array(list);
  }

  /**
   * Helper: Convert specific Canvas region (rectangle) to black-and-white Bitmap and build the ESC/POS Raster command GS v 0
   */
  private convertCanvasRectToEscPosRaster(
    canvas: HTMLCanvasElement,
    startY: number,
    renderHeight: number
  ): Uint8Array {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2D context');

    const width = canvas.width;    // Must be a multiple of 8! (384 for 58mm, 576 for 80mm)
    const imgData = ctx.getImageData(0, startY, width, renderHeight);
    const pixels = imgData.data;

    const widthBytes = width / 8;
    const rasterDataSize = widthBytes * renderHeight;

    const rasterBytes = new Uint8Array(rasterDataSize);

    for (let y = 0; y < renderHeight; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x) * 4;
        const r = pixels[pixelIdx];
        const g = pixels[pixelIdx+1];
        const b = pixels[pixelIdx+2];
        const a = pixels[pixelIdx+3];

        let isBlack = false;
        if (a < 50) {
          // Transparent standard pixel is white
          isBlack = false;
        } else {
          // Standard grayscale luminance formula
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          isBlack = luminance < 140; // Any pixel darker than threshold 140 is printed (Black)
        }

        if (isBlack) {
          const byteIdx = y * widthBytes + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          rasterBytes[byteIdx] |= (1 << bitIdx);
        }
      }
    }

    // Builder GS v 0 m xL xH yL yH [Raster Bytes]
    const header = new Uint8Array([
      0x1D, 0x76, 0x30, 0x00, // GS v 0 0 (Raster image command, normal scaling mode)
      widthBytes % 256, Math.floor(widthBytes / 256), // xL xH (Width in bytes)
      renderHeight % 256, Math.floor(renderHeight / 256) // yL yH (Height in dots/pixels)
    ]);

    const result = new Uint8Array(header.length + rasterBytes.length);
    result.set(header, 0);
    result.set(rasterBytes, header.length);

    return result;
  }

  /**
   * Generate clean ticket layout on canvas, returning a compiled Uint8Array with raster command package.
   */
  private renderReceiptToEscPosDevice(receipt: Receipt): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    
    // Width setup
    const is80 = this.state.paperWidth === '80mm';
    const width = is80 ? 576 : 384; 
    const margin = is80 ? 35 : 15;
    const printableWidth = width - (margin * 2);

    // Retrieve customized store parameters identical to ReceiptModal.tsx
    const receiptTitle = localStorage.getItem('receipt_title') || 'نظام مولدتي للخدمات الأهلية';
    const receiptFirm = localStorage.getItem('receipt_firm') || 'شركة الحلول المتميزة المحدودة';
    const receiptPhone = localStorage.getItem('receipt_phone') || '07701234567';
    const receiptFooter = localStorage.getItem('receipt_footer') || 'شكراً لالتزامكم بالتسديد الشهري.';

    // Allocate a tall offscreen layout buffer (will be cropped dynamically at the end to prevent paper waste)
    const canvasHeight = 1100;
    canvas.width = width;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D failed');

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, canvasHeight);

    // Render Text Configurations
    ctx.fillStyle = '#000000'; // Print paint
    ctx.textBaseline = 'top';

    let currentY = 15;

    // 1. Draw centered icon badge
    ctx.beginPath();
    ctx.arc(width / 2, currentY + 20, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw simple tiny lightning bolt inside circular badge
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', width / 2, currentY + 11);
    currentY += 45;

    // 2. Custom header title (Centered)
    ctx.font = `bold ${is80 ? '24px' : '18px'} "Segoe UI", "Cairo", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(receiptTitle, width / 2, currentY);
    currentY += is80 ? 30 : 25;

    // Company/Firm
    ctx.font = `bold ${is80 ? '14px' : '11px'} "Segoe UI", "Cairo", Arial, sans-serif`;
    ctx.fillText(receiptFirm, width / 2, currentY);
    currentY += 18;

    // Phone Support
    if (receiptPhone) {
      ctx.font = '10px monospace';
      ctx.fillText(`الدعم: ${receiptPhone}`, width / 2, currentY);
      currentY += 15;
    }

    // Divider Line
    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 12;

    // State Banner
    ctx.font = `bold ${is80 ? '16px' : '13px'} "Segoe UI", "Cairo", Arial, sans-serif`;
    ctx.fillText('⚡ وصل استلام مالي (مُسدّد بـالكامل) ⚡', width / 2, currentY);
    currentY += is80 ? 25 : 22;

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 15;

    // Key-Values layout rendering
    const drawItemRow = (key: string, val: string, isSecBold = false) => {
      ctx.textAlign = 'right';
      ctx.font = `${isSecBold ? 'bold' : ''} ${is80 ? '14px' : '11.5px'} "Segoe UI", "Cairo", Arial, sans-serif`;
      ctx.fillText(`${key}:`, width - margin, currentY);

      ctx.textAlign = 'left';
      ctx.font = `bold ${is80 ? '14px' : '11.5px'} "Segoe UI", "Cairo", Arial, sans-serif`;
      ctx.fillText(val, margin, currentY);
      
      currentY += is80 ? 24 : 20;
    };

    drawItemRow('رقم الوصل', receipt.invoiceNo, true);
    drawItemRow('تاريخ ووقت السداد', receipt.paymentDate);
    drawItemRow('اسم المستلم منه', receipt.subscriberName, true);
    drawItemRow('الهاتف المسجل', receipt.subscriberPhone);
    drawItemRow('الفئة والاشتراك', receipt.subscriptionType);
    drawItemRow('الأمبيرات المشغل بها', `${receipt.amps} أمبير`);
    drawItemRow('تسعيرة الأمبير المنظّم', `${receipt.pricePerAmp.toLocaleString()} د.ع`);
    drawItemRow('بوابة التحصيل المالي', receipt.paymentMethod);
    drawItemRow('الجابي المستلم', receipt.accountantName);

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 15;

    // Highlight Paid Amount
    ctx.textAlign = 'center';
    ctx.font = `bold ${is80 ? '13px' : '11px'} "Segoe UI", "Cairo", Arial, sans-serif`;
    ctx.fillText('إجمالي المبلغ المقبوض والمسجل بنجاح:', width / 2, currentY);
    currentY += 18;

    ctx.font = `bold ${is80 ? '22px' : '17px'} monospace, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(`${receipt.totalAmount.toLocaleString()} دينار عراقي`, width / 2, currentY);
    currentY += is80 ? 32 : 28;

    this.drawDashedLine(ctx, margin, width - margin, currentY);
    currentY += 12;

    // Footer greeting message
    ctx.textAlign = 'center';
    ctx.font = `bold ${is80 ? '11px' : '9.5px'} "Segoe UI", "Cairo", Arial, sans-serif`;
    ctx.fillText(receiptFooter, width / 2, currentY);
    currentY += 18;

    // Simulated ticket Barcode design with lines
    const barcodeCode = `*${receipt.invoiceNo}*`;
    ctx.font = '10px monospace';
    ctx.fillText(barcodeCode, width / 2, currentY + 22);

    // Draw raw barcode lines
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

    // System watermarks
    ctx.font = '8px "Segoe UI", "Cairo", Arial, sans-serif';
    ctx.fillText('نظام إدارة المولدات - شركة الحلول المتميزة EX', width / 2, currentY);

    // Dynamic cropping: Create a secondary canvas with the exact height used
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
   * Execute actual BLE print operation for a receipt
   */
  public async printReceipt(receipt: Receipt): Promise<boolean> {
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
        statusMessage: 'جاري رسم وتنسيق بيانات الفاتورة ذكياً...', 
        progress: 25 
      });
      
      // 1. Generate the receipt image canvas in memory
      const canvas = this.renderReceiptToEscPosDevice(receipt);
      
      if (this.state.printerType === 'cat_printer') {
        // --- PRINT VIA CAT PRINTER PROTOCOL ---
        this.updateState({ 
          statusMessage: 'جاري بدء الاتصال والتحضير لطابعة Cat...', 
          progress: 35 
        });
        
        // 1. Initialize commands
        await this.sendBuffer(makeCatPrinterPacket(0x1a, 0x00, new Uint8Array([])));
        await this.sendBuffer(makeCatPrinterPacket(0x10, 0x00, new Uint8Array([])));
        await this.sendBuffer(makeCatPrinterPacket(0xaf, 0x03, new Uint8Array([]))); // High energy (dark contrast)

        // 2. Loop over every row of the canvas
        const totalRows = canvas.height;
        for (let y = 0; y < totalRows; y++) {
          if (y % 10 === 0) {
            const rowProgress = 35 + Math.floor((y / totalRows) * 45);
            this.updateState({
              statusMessage: `جاري نقل أسطر الفاتورة (${y} / ${totalRows})...`,
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

        // 3. Feed blank lines to push the paper out of the printer past the tear bar
        const feedLines = 100;
        const blankRow = new Uint8Array(48); // 384 pixels / 8 bits = 48 bytes of 0x00 (white)
        for (let i = 0; i < feedLines; i++) {
          const rowPacket = makeCatPrinterPacket(0xa2, 0x00, blankRow);
          await this.sendBuffer(rowPacket);
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }

        // 4. Power off timer configuration or clean finish
        await this.sendBuffer(makeCatPrinterPacket(0x1a, 0x00, new Uint8Array([])));

      } else {
        // --- STANDARD ESC/POS FLOW ---
        this.updateState({ 
          statusMessage: 'جاري تمكين وتصفير قناة الطباعة (ESC/POS)...', 
          progress: 35 
        });
        
        // 2. Stream initialization command
        await this.sendBuffer(this.getInitCommands());
        await new Promise(resolve => setTimeout(resolve, 50));

        // 3. Stream in horizontal stripe segments of 40 pixels
        const sliceHeight = 40;
        const totalHeight = canvas.height;
        const totalSlices = Math.ceil(totalHeight / sliceHeight);
        let sliceIdx = 0;

        for (let startY = 0; startY < totalHeight; startY += sliceHeight) {
          sliceIdx++;
          const sliceProgress = 35 + Math.floor((sliceIdx / totalSlices) * 45);
          this.updateState({
            statusMessage: `جاري طباعة الجزء (${sliceIdx} من ${totalSlices}) للطابعة الحرارية...`,
            progress: sliceProgress
          });
          
          const renderHeight = Math.min(sliceHeight, totalHeight - startY);
          const stripePayload = this.convertCanvasRectToEscPosRaster(canvas, startY, renderHeight);
          await this.sendBuffer(stripePayload);
          // Slightly longer rest between stripe transfers to allow physical paper to feed
          await new Promise(resolve => setTimeout(resolve, 80));
        }

        this.updateState({ 
          statusMessage: 'جاري تغذية الورق وإجراء القص التلقائي...', 
          progress: 90 
        });

        // 4. Feed and cut
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
      this.handleDisconnection(); // Force clean reset of connection handles
      this.updateState({ 
        error: err.message || 'فشلت عملية نقل البيانات إلى الطابعة. يرجى التحقق من اقتران البلوتوث.',
        statusMessage: null,
        progress: 0
      });
      return false;
    }
  }

  /**
   * Print a beautiful diagnostic test page to confirm connectivity
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
      const height = is85_or_80 ? 400 : 350;
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      let currentY = 20;

      // Centered Checkmark Badge
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('✅', width / 2, currentY);
      currentY += 35;

      ctx.font = 'bold 15px "Segoe UI", "Cairo", Arial, sans-serif';
      ctx.fillText('اختبار اتصال الطابعة الحرارية', width / 2, currentY);
      currentY += 25;

      ctx.font = '10px monospace';
      ctx.fillText(`الطابعة الحالية: ${this.state.deviceName}`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10px monospace';
      ctx.fillText(`نوع المنظومة: ${this.state.printerType === 'cat_printer' ? 'Cat Printer' : 'ESC/POS'}`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10px monospace';
      ctx.fillText(`عرض الورقة المعتمد: ${this.state.paperWidth}`, width / 2, currentY);
      currentY += 15;

      ctx.font = '10.5px "Segoe UI", "Cairo", Arial, sans-serif';
      ctx.fillText(`تاريخ الاختبار: ${new Date().toLocaleString('ar-IQ')}`, width / 2, currentY);
      currentY += 25;

      this.drawDashedLine(ctx, 20, width - 20, currentY);
      currentY += 15;

      ctx.font = 'bold 11px "Segoe UI", "Cairo", Arial, sans-serif';
      ctx.fillText('جاهز للطباعة الميدانية السريعة فورا!', width / 2, currentY);
      currentY += 16;
      ctx.font = '9px "Segoe UI", "Cairo", Arial, sans-serif';
      ctx.fillText('نظام إدارة المولدات الذكي PWA - شركة الحلول المتميزة المحدودة', width / 2, currentY);
      currentY += 25;

      // Draw Grid / Grayscale checker
      const size = 15;
      const startX = width / 2 - (size * 8) / 2;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#000000' : '#444444';
        ctx.fillRect(startX + i * size, currentY, size, size);
      }
      
      if (this.state.printerType === 'cat_printer') {
        // --- PRINT VIA CAT PRINTER PROTOCOL ---
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
        const blankRow = new Uint8Array(48); // All zeros (white)
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
          statusMessage: 'جاري تهيئة قناة الطباعة (ESC/POS)...', 
          progress: 35 
        });

        // Initialize printer
        await this.sendBuffer(this.getInitCommands());
        await new Promise(resolve => setTimeout(resolve, 50));
 
        // Print in slices of 40px to prevent buffer overflow
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

        // Feed and cut
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
      this.handleDisconnection(); // Force clean reset of connection handles
      this.updateState({ 
        error: err.message || 'فشلت طباعة صفحة الاختبار.',
        statusMessage: null,
        progress: 0
      });
      return false;
    }
  }

  /**
   * Internal Service Scorer to avoid binding to standard metadata services like GAP/GATT
   */
  private getServiceScore(uuid: string): number {
    const clean = uuid.toLowerCase();
    
    // Check custom service
    const customService = this.getCustomServiceUuid();
    if (customService && clean === customService.toLowerCase()) {
      return 10000; // Sky-high prioritization
    }

    // Known printer services
    const printerServices = [
      'ffe0', 'fff0', 'ffd0', 'ff00', 'fee7', 'ae30', 'af30', 'e000', '34b0',
      '6e400001', '49535343', 'e7fe1800', '38eb4a84', '243a2f0e'
    ];
    for (const prefix of printerServices) {
      if (clean.includes(prefix)) {
        return 100;
      }
    }

    // Standard low-priority SIG metadata services
    const metadataServices = [
      '1800', // GAP Generic Access (Highly commonly exposes false write properties)
      '1801', // GATT Generic Attribute
      '180a', // DIS Device Information
      '180f', // BAS Battery Service
      '180d', // Heart Rate
      '1812', // HID Human Interface Device
    ];
    for (const prefix of metadataServices) {
      if (clean.includes(prefix)) {
        return -500; // Penalize standard services severely
      }
    }

    return 5; // Neutral default for unrecognized vendor-specific UUIDs
  }

  /**
   * Internal Characteristic Scorer to identify genuine print buffers
   */
  private getCharacteristicScore(charUuid: string, props: any): number {
    const clean = charUuid.toLowerCase();

    // The characteristic MUST allow some form of write
    const canWrite = props.write || props.writeWithoutResponse || props.authenticatedSignedWrites;
    if (!canWrite) {
      return 0;
    }

    let score = 10;

    // Check custom characteristic
    const customChar = this.getCustomCharacteristicUuid();
    if (customChar && clean === customChar.toLowerCase()) {
      return 10000; // Sky-high prioritization
    }

    // High priority known write characteristics
    const printerWriteChars = [
      'ffe1', 'fff1', 'fff2', 'ffd1', 'ffd2', 'ff02', 'ae01', 'af01',
      '6e400002', // Nordic UART Serial write (frequently used in premium BLE models)
      '49535343-fe7d-4ae5-8fa9-9fafd205e455' // ISSC UART Transparent Write
    ];

    for (const target of printerWriteChars) {
      if (clean.includes(target)) {
        score += 200;
        break;
      }
    }

    // Prefer writeWithoutResponse for raw high-speed unidirectional serial transfers
    if (props.writeWithoutResponse) {
      score += 50;
    }

    return score;
  }

  private convertRowToCatPrinterBytes(canvas: HTMLCanvasElement, y: number): Uint8Array {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2D context');

    const width = 384; // Cat Printer is strictly 384 pixels wide
    const imgData = ctx.getImageData(0, y, width, 1);
    const pixels = imgData.data;

    const widthBytes = 48; // 384 / 8
    const rowBytes = new Uint8Array(widthBytes);

    for (let x = 0; x < width; x++) {
      const pixelIdx = x * 4;
      const r = pixels[pixelIdx];
      const g = pixels[pixelIdx+1];
      const b = pixels[pixelIdx+2];
      const a = pixels[pixelIdx+3];

      let isBlack = false;
      if (a < 50) {
        isBlack = false;
      } else {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        isBlack = luminance < 140; // grey threshold
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
  packet[offset] = 0xff; // footer

  return packet;
}

// Check context
function isMobileApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

export const blePrinter = new BLEPrinterController();
