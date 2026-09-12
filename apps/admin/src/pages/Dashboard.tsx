import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Store,
  DollarSign,
  AlertTriangle,
  Receipt,
  LogOut,
  Package,
  Layers,
  Users,
} from 'lucide-react';
import axios from 'axios';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [branchesRes, productsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/branches'),
          axios.get('http://localhost:3000/api/products'),
        ]);

        setBranches(branchesRes.data || []);
        setProducts(productsRes.data || []);

        if (branchesRes.data?.length > 0) {
          const salesRes = await axios.get(
            `http://localhost:3000/api/sales/recent?branchId=${branchesRes.data[0].id}&limit=10`
          );
          setRecentSales(salesRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-admin-bg flex flex-col">
      {/* Admin Navbar */}
      <header className="h-16 bg-admin-surface border-b border-admin-border px-6 flex items-center justify-between shadow">
        <div className="flex items-center space-x-3">
          <Store className="w-6 h-6 text-blue-400" />
          <span className="text-xl font-black tracking-tight text-white">
            MySuperMarket <span className="text-blue-400 text-xs font-mono uppercase font-bold tracking-widest">{user.role} PORTAL</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-100">{user.name}</div>
            <div className="text-[11px] font-mono text-slate-400">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-5 bg-admin-surface border border-admin-border rounded-2xl shadow space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
              <span>TODAY'S REVENUE</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white">LKR 284,450.00</div>
            <div className="text-xs text-emerald-400 flex items-center font-semibold">
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> +12.4% vs Yesterday
            </div>
          </div>

          <div className="p-5 bg-admin-surface border border-admin-border rounded-2xl shadow space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
              <span>ACTIVE BRANCHES</span>
              <Store className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white">{branches.length || 1} Stores</div>
            <div className="text-xs text-slate-400">Colombo, Kandy, Galle</div>
          </div>

          <div className="p-5 bg-admin-surface border border-admin-border rounded-2xl shadow space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
              <span>TOTAL MASTER SKUS</span>
              <Package className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white">{products.length} Products</div>
            <div className="text-xs text-slate-400">Catalog active</div>
          </div>

          <div className="p-5 bg-admin-surface border border-admin-border rounded-2xl shadow space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
              <span>LOW STOCK ALERTS</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">2 Items</div>
            <div className="text-xs text-slate-400">Needs reorder</div>
          </div>
        </div>

        {/* Master Catalog Preview & Recent Transactions */}
        <div className="grid grid-cols-12 gap-6">
          {/* Recent POS Transactions */}
          <div className="col-span-8 bg-admin-surface border border-admin-border rounded-2xl p-5 shadow space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 font-bold text-white">
                <Receipt className="w-5 h-5 text-blue-400" />
                <span>Live POS Sales Stream</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">Auto-refreshing</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/60 text-slate-400 uppercase border-b border-admin-border">
                  <tr>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Cashier</th>
                    <th className="py-2.5 px-3">Total (LKR)</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No transactions registered yet today.
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-blue-400">{s.invoiceNo}</td>
                        <td className="py-2.5 px-3">{s.cashier?.name || 'Counter Cashier'}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{Number(s.total).toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {s.payments[0]?.method || 'CASH'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-emerald-400 font-bold">● PAID</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Master Catalog Sample */}
          <div className="col-span-4 bg-admin-surface border border-admin-border rounded-2xl p-5 shadow space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 font-bold text-white">
                <Layers className="w-5 h-5 text-sky-400" />
                <span>Supermarket Catalog</span>
              </div>
              <span className="text-xs text-sky-400 font-mono">{products.length} SKUs</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{prod.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Barcode: {prod.barcodes[0]?.barcode}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-extrabold text-emerald-400">
                      LKR {Number(prod.branchProducts[0]?.sellingPrice || prod.costPrice).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Stock: {prod.stocks[0]?.quantity || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
