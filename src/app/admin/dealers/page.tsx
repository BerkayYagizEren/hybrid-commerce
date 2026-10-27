"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listDealersAction,
  upsertDealerFinancialAction,
  updateDealerBalanceAction,
} from "@/features/b2b/actions/b2b.actions";
import type { DealerFinancialInfo } from "@/features/b2b/services/b2b.service";

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<DealerFinancialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedDealer, setSelectedDealer] = useState<DealerFinancialInfo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    creditLimit: 0,
    discountRate: 0,
  });

  const [balanceAdjustment, setBalanceAdjustment] = useState({
    amount: 0,
    operation: "ADD" as "ADD" | "SUBTRACT" | "SET",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listDealersAction();
      if (res.success && res.data) {
        setDealers(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (dealer: DealerFinancialInfo) => {
    setSelectedDealer(dealer);
    setEditFormData({
      creditLimit: dealer.creditLimit,
      discountRate: dealer.discountRate,
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const openBalanceModal = (dealer: DealerFinancialInfo) => {
    setSelectedDealer(dealer);
    setBalanceAdjustment({
      amount: 0,
      operation: "ADD",
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBalanceModalOpen(true);
  };

  const handleUpdateFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await upsertDealerFinancialAction(selectedDealer.userId, {
        creditLimit: Number(editFormData.creditLimit),
        discountRate: Number(editFormData.discountRate),
      });
      if (res.success) {
        setIsEditModalOpen(false);
        setSuccessMsg("Bayi finansal limitleri başarıyla güncellendi.");
        await loadData();
      } else {
        setErrorMsg(res.error || "Güncelleme başarısız");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await updateDealerBalanceAction(
        selectedDealer.userId,
        Number(balanceAdjustment.amount),
        balanceAdjustment.operation
      );
      if (res.success) {
        setIsBalanceModalOpen(false);
        setSuccessMsg("Bayi bakiyesi başarıyla güncellendi.");
        await loadData();
      } else {
        setErrorMsg(res.error || "Bakiye güncelleme başarısız");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = dealers.filter(
    (d) =>
      d.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.userName && d.userName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Başlık ve Gezinme */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600 transition-colors">
                Admin Panel
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">B2B Bayi Finans Yönetimi</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">B2B Bayi Cari & Finans Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Bayi kredi limitleri, cari borç bakiyeleri ve özel iskonto oranlarını yönetin.
            </p>
          </div>
        </div>

        {/* Mesajlar */}
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700">✕</button>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Özet Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Kayıtlı Bayi Sayısı</span>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{dealers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Toplam Kredi Limiti</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">
              {dealers.reduce((acc, d) => acc + d.creditLimit, 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Toplam Kullanılan Bakiye</span>
            <p className="text-3xl font-extrabold text-orange-600 mt-2">
              {dealers.reduce((acc, d) => acc + d.currentBalance, 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
            </p>
          </div>
        </div>

        {/* Filtreleme ve Arama */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Bayi adı veya e-posta ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Bayi Listesi Tablosu */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Bayi / Kullanıcı</th>
                  <th className="py-3 px-6">Kredi Limiti</th>
                  <th className="py-3 px-6">Kullanılan Bakiye</th>
                  <th className="py-3 px-6">Kalan Limit</th>
                  <th className="py-3 px-6">Özel İskonto</th>
                  <th className="py-3 px-6">Limit Kullanım Durumu</th>
                  <th className="py-3 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Henüz B2B cari kaydı tanımlanmış bayi bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  filtered.map((dealer) => {
                    const usagePercent =
                      dealer.creditLimit > 0
                        ? Math.min(100, Math.round((dealer.currentBalance / dealer.creditLimit) * 100))
                        : 0;

                    return (
                      <tr key={dealer.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">{dealer.userName || "Bayi"}</div>
                          <div className="text-xs text-gray-500">{dealer.userEmail}</div>
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900">
                          {dealer.creditLimit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </td>
                        <td className="py-4 px-6 font-semibold text-orange-600">
                          {dealer.currentBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </td>
                        <td className="py-4 px-6 font-semibold text-emerald-600">
                          {dealer.availableCredit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            %{dealer.discountRate} İskonto
                          </span>
                        </td>
                        <td className="py-4 px-6 w-48">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>%{usagePercent}</span>
                            <span className={usagePercent >= 90 ? "text-red-600 font-bold" : "text-gray-500"}>
                              {usagePercent >= 90 ? "Kritik" : "Normal"}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                usagePercent >= 90
                                  ? "bg-red-500"
                                  : usagePercent >= 70
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => openBalanceModal(dealer)}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Bakiye İşlemi
                          </button>
                          <button
                            onClick={() => openEditModal(dealer)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Limit & İskonto
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Limit & Discount Modal */}
      {isEditModalOpen && selectedDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Limit ve İskonto Güncelle: {selectedDealer.userName || selectedDealer.userEmail}
            </h3>
            <form onSubmit={handleUpdateFinancial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Kredi Limiti (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editFormData.creditLimit}
                  onChange={(e) => setEditFormData({ ...editFormData, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Bayi İskonto Oranı (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={editFormData.discountRate}
                  onChange={(e) => setEditFormData({ ...editFormData, discountRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {isBalanceModalOpen && selectedDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Cari Bakiye Ayarla: {selectedDealer.userName || selectedDealer.userEmail}
            </h3>
            <p className="text-xs text-gray-500">
              Mevcut Kullanılan Borç Bakiyesi:{" "}
              <strong className="text-gray-900">
                {selectedDealer.currentBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
              </strong>
            </p>
            <form onSubmit={handleAdjustBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  İşlem Türü
                </label>
                <select
                  value={balanceAdjustment.operation}
                  onChange={(e) =>
                    setBalanceAdjustment({
                      ...balanceAdjustment,
                      operation: e.target.value as "ADD" | "SUBTRACT" | "SET",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ADD">Borç Ekle (+)</option>
                  <option value="SUBTRACT">Tahsilat / Ödeme Düş (-)</option>
                  <option value="SET">Doğrudan Tutara Ayarla (=)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Tutar (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={balanceAdjustment.amount}
                  onChange={(e) =>
                    setBalanceAdjustment({ ...balanceAdjustment, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {submitting ? "İşleniyor..." : "Uygula"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
