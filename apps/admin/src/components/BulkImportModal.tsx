import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface BulkImportModalProps {
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  branchId,
  onClose,
  onSuccess,
}) => {
  const [csvContent, setCsvContent] = useState(
    `name,barcode,costPrice,sellingPrice,stock,reorderLevel\nMaliban Lemon Puff 200g,4791003000789,140,170,40,10\nMunchi Chocolate Cream 100g,4791004000890,95,120,60,15\nSunlight Soap 120g,4791005000999,110,135,100,20\nKotmale Vanilla Milk 180ml,4791006000111,85,100,50,15`
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Parse CSV
      const lines = csvContent.trim().split('\n');
      if (lines.length <= 1) {
        setError('CSV must contain a header row and at least one product row');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        return row;
      });

      const token = localStorage.getItem('admin_token');
      const res = await axios.post(
        'http://localhost:3000/api/products/bulk-import',
        {
          branchId,
          rows,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setResult(res.data);
      if (res.data.imported > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-900 flex justify-between items-center border-b border-admin-border">
          <div className="flex items-center space-x-2 font-bold text-lg text-white">
            <Upload className="w-5 h-5 text-sky-400" />
            <span>Bulk Product Import (CSV)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-400">
            Paste your CSV text below with columns: <code className="text-sky-400 font-mono">name,barcode,costPrice,sellingPrice,stock,reorderLevel</code>
          </div>

          <textarea
            rows={8}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-admin-border rounded-xl text-xs font-mono text-slate-200 outline-none focus:border-sky-500"
          />

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl text-center">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Successfully Imported {result.imported} products</span>
              </div>
              {result.failed > 0 && (
                <div className="space-y-1 text-rose-400">
                  <div className="flex items-center space-x-1 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Failed rows: {result.failed}</span>
                  </div>
                  {result.errors.map((e: string, i: number) => (
                    <div key={i} className="text-[11px] text-slate-400 pl-5">
                      • {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-admin-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
            >
              <FileText className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Run Bulk Import'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
