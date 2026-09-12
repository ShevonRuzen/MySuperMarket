import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Phone, Mail, Clock } from 'lucide-react';
import axios from 'axios';

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [creditDays, setCreditDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSuppliers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/suppliers');
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      await axios.post(
        'http://localhost:3000/api/suppliers',
        {
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          phone: phone.trim(),
          email: email.trim() || undefined,
          creditDays: parseInt(creditDays, 10) || 30,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setName('');
      setContactName('');
      setPhone('');
      setEmail('');
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this supplier?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      await axios.delete(`http://localhost:3000/api/suppliers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSuppliers();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
          <Truck className="w-7 h-7 text-emerald-400" />
          <span>Supplier Directory & Credit Terms</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Manage product vendors, contact representatives, and purchase credit agreements
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Register Supplier Form */}
        <div className="col-span-4 bg-admin-surface border border-admin-border rounded-2xl p-5 shadow space-y-4">
          <div className="flex items-center space-x-2 font-bold text-white text-sm">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Register New Supplier</span>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Company / Supplier Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ceylon Cold Stores PLC"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Nimal Fernando"
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Phone Number *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0112345678"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@supplier.lk"
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Credit Terms (Days)</label>
              <input
                type="number"
                value={creditDays}
                onChange={(e) => setCreditDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-admin-border rounded-xl text-sm font-mono text-white outline-none focus:border-emerald-500"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
            >
              {loading ? 'Registering...' : 'Register Supplier'}
            </button>
          </form>
        </div>

        {/* Suppliers Table */}
        <div className="col-span-8 bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 uppercase border-b border-admin-border">
              <tr>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Credit Days</th>
                <th className="py-3 px-4 text-center">POs Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-sm">{s.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{s.contactName || 'No contact named'}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 space-y-0.5">
                    <div className="flex items-center space-x-1 text-sky-400">
                      <Phone className="w-3 h-3" />
                      <span>{s.phone}</span>
                    </div>
                    {s.email && (
                      <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
                        <Mail className="w-3 h-3" />
                        <span>{s.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] inline-flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{s.creditDays} Days</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">
                    {s._count?.purchases || 0}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Deactivate Supplier"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
