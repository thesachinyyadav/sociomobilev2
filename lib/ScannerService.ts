import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { BarcodeScanner, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
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
      delayBetweenScanAttempts: 150, // Optimize CPU
    });
  }

  async start(videoElement: HTMLVideoElement, onScan: (result: ScannerResult) => void): Promise<void> {
    try {
      this.controls = await this.reader.decodeFromVideoDevice(
        undefined, 
        videoElement,
        (result) => {
          if (this.isPaused) return;
          if (result) {
            onScan({
              data: result.getText(),
              format: result.getBarcodeFormat().toString(),
            });
          }
        }
      );
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
    try {
      // Check/Request permissions
      const status = await BarcodeScanner.checkPermissions();
      if (status.camera !== 'granted') {
        await BarcodeScanner.requestPermissions();
      }

      // Start scanning
      await BarcodeScanner.addListener('barcodesScanned', (event) => {
        if (this.isPaused || !event.barcodes.length) return;
        const barcode = event.barcodes[0];
        onScan({
          data: barcode.displayValue,
          format: barcode.format,
        });
      });

      await BarcodeScanner.startScan({
        formats: [BarcodeFormat.QrCode],
        lensFacing: LensFacing.Back,
      });

      // Capacitor ML Kit typically overlays the camera on the webview
      // We might need to hide elements or use a transparent background
      document.body.classList.add('barcode-scanner-active');
    } catch (err) {
      console.error('[CapacitorScanner] Start failed:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    document.body.classList.remove('barcode-scanner-active');
    await BarcodeScanner.stopScan();
    await BarcodeScanner.removeAllListeners();
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
  if (Capacitor.isNativePlatform()) {
    return new CapacitorScanner();
  }
  return new WebScanner();
};
