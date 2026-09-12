import React, { useEffect, useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Smartphone, X, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

export const PhoneScannerModal: React.FC = () => {
  const { setKeyboardMode } = usePosStore();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const scannerUrl = `http://${window.location.hostname}:5555/index.html`;

  useEffect(() => {
    QRCode.toDataURL(scannerUrl, { width: 240, margin: 2 }, (err, url) => {
      if (!err && url) {
        setQrDataUrl(url);
      }
    });
  }, [scannerUrl]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-pos-surface border border-pos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-800 flex justify-between items-center border-b border-pos-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-sky-400">
            <Smartphone className="w-6 h-6" />
            <span>Mobile Wireless Barcode Scanner</span>
          </div>
          <button
            onClick={() => setKeyboardMode('BARCODE')}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <p className="text-sm text-slate-300">
            Scan this QR code with your phone camera to use your phone as a wireless barcode scanner:
          </p>

          <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Scanner QR Code" className="w-56 h-56 mx-auto" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-500 font-mono text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <div className="text-xs font-mono text-sky-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            Direct URL: {scannerUrl}
          </div>

          <div className="text-xs text-slate-400">
            • No app installation required<br />
            • Works on Android & iPhone<br />
            • Barcodes will automatically beep and appear in your cart
          </div>
        </div>
      </div>
    </div>
  );
};
