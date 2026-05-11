import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { BarcodeScanner, BarcodeFormat, LensFacing, Resolution } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

export interface ScannerResult {
  data: string;
  format: string;
}

export interface IScanner {
  start(videoElement: HTMLVideoElement, onScan: (result: ScannerResult) => void): Promise<void>;
  stop(): Promise<void>;
  pause(): void;
  resume(): void;
}

/**
 * Web Implementation using ZXing
 */
class WebScanner implements IScanner {
  private reader: BrowserQRCodeReader;
  private controls: IScannerControls | null = null;
  private isPaused = false;

  constructor() {
    this.reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 100, // Reduced from 150 for slightly faster web scanning
    });
  }

  async start(videoElement: HTMLVideoElement, onScan: (result: ScannerResult) => void): Promise<void> {
    const t0 = performance.now();
    try {
      this.controls = await this.reader.decodeFromVideoDevice(
        undefined, 
        videoElement,
        (result) => {
          if (this.isPaused) return;
          if (result) {
            console.log(`🔍 [ScannerPerf] QR Detected on Web: ${performance.now() - t0}ms since start`);
            onScan({
              data: result.getText(),
              format: result.getBarcodeFormat().toString(),
            });
          }
        }
      );
      console.log(`🔍 [ScannerPerf] Web Scanner Startup Time: ${performance.now() - t0}ms`);
    } catch (err) {
      console.error('[WebScanner] Start failed:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.controls) {
      this.controls.stop();
      this.controls = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }
}

/**
 * Native Implementation using Capacitor ML Kit
 */
class CapacitorScanner implements IScanner {
  private isPaused = false;
  private listener: Promise<any> | null = null;

  async start(_videoElement: HTMLVideoElement, onScan: (result: ScannerResult) => void): Promise<void> {
    const t0 = performance.now();
    try {
      console.log('[CapacitorScanner] Checking camera permission...');
      // Check/Request permissions
      let status = await BarcodeScanner.checkPermissions();
      
      if (status.camera !== 'granted') {
        const hasPrompted = localStorage.getItem('camera_permission_prompted');
        if (status.camera === 'denied' && hasPrompted) {
          throw new Error('Camera permission denied. Please enable it in Settings.');
        }

        console.log('[CapacitorScanner] Requesting camera permission...');
        localStorage.setItem('camera_permission_prompted', 'true');
        status = await BarcodeScanner.requestPermissions();
        
        if (status.camera !== 'granted') {
           localStorage.setItem('camera_permission_granted', 'false');
           throw new Error('Camera permission is required to scan QR codes.');
        }
      }
      
      localStorage.setItem('camera_permission_granted', 'true');
      console.log(`🔍 [ScannerPerf] Permissions checked in ${performance.now() - t0}ms`);

      const t1 = performance.now();
      // Start scanning
      await BarcodeScanner.addListener('barcodesScanned', (event) => {
        if (this.isPaused || !event.barcodes.length) return;
        const barcode = event.barcodes[0];
        console.log(`🔍 [ScannerPerf] Native ML Kit Detected QR in ${performance.now() - t1}ms`);
        onScan({
          data: barcode.displayValue,
          format: barcode.format,
        });
      });

      await BarcodeScanner.startScan({
        formats: [BarcodeFormat.QrCode],
        lensFacing: LensFacing.Back,
        resolution: 1, // 1280x720 for optimal performance vs detection speed
      });

      console.log(`🔍 [ScannerPerf] Native Scanner Startup Time: ${performance.now() - t0}ms`);
      document.documentElement.classList.add('barcode-scanner-active');
      document.body.classList.add('barcode-scanner-active');
    } catch (err) {
      console.error('[CapacitorScanner] Start failed:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    document.documentElement.classList.remove('barcode-scanner-active');
    document.body.classList.remove('barcode-scanner-active');
    try {
      await BarcodeScanner.stopScan();
      await BarcodeScanner.removeAllListeners();
      console.log('[CapacitorScanner] Scan stopped successfully.');
    } catch (err) {
      console.error('[CapacitorScanner] Stop failed:', err);
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }
}

/**
 * Factory to get the appropriate scanner for the current platform
 */
export const getScanner = (): IScanner => {
  const isNative = Capacitor.isNativePlatform();
  console.log(`🔍 [ScannerPlatformDebug] Detected platform isNative: ${isNative}`);
  
  if (isNative) {
    console.log(`🔍 [ScannerPlatformDebug] Selected scanner engine: Capacitor ML Kit`);
    return new CapacitorScanner();
  }
  
  console.log(`🔍 [ScannerPlatformDebug] Selected scanner engine: Browser Web Fallback`);
  return new WebScanner();
};
