import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';
import { 
  Printer, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CalendarRange
} from 'lucide-react';
import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // jsPDF plugin for tables
import * as XLSX from 'xlsx';
import { CardSkeleton } from '../components/SkeletonLoader';
import './Reports.css';

// Declare jspdf-autotable globally or import it. jsPDF has autoTable.
// Wait, we can import autoTable directly or call it as a function: doc.autoTable(...) or autoTable(doc, ...)

type ReportType = 'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan';

export const Reports: React.FC = () => {
  // DB Queries
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());

  const currency = settings?.currency || 'Rp';

  // State
  const [reportType, setReportType] = useState<ReportType>('Harian');
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'));

  // Calculate Date Ranges
  const reportRange = useMemo(() => {
    let start = dayjs();
    let end = dayjs();

    if (reportType === 'Harian') {
      start = dayjs(selectedDate).startOf('day');
      end = dayjs(selectedDate).endOf('day');
    } else if (reportType === 'Mingguan') {
      // 7 days starting from selected date
      start = dayjs(selectedDate).startOf('day');
      end = dayjs(selectedDate).add(6, 'day').endOf('day');
    } else if (reportType === 'Bulanan') {
      start = dayjs(selectedMonth + '-01').startOf('month');
      end = start.endOf('month');
    } else if (reportType === 'Tahunan') {
      start = dayjs(selectedYear + '-01-01').startOf('year');
      end = start.endOf('year');
    }

    return { start, end };
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  // Compute reports statistics
  const reportData = useMemo(() => {
    if (!transactions || !expenses || !barbers || !services) return null;

    const { start, end } = reportRange;

    // Filter txs & expenses in range
    const rangeTxs = transactions.filter(t => {
      const tDate = dayjs(t.date);
      return (tDate.isAfter(start) || tDate.isSame(start, 'day')) && 
             (tDate.isBefore(end) || tDate.isSame(end, 'day'));
    });

    const rangeExpenses = expenses.filter(e => {
      const eDate = dayjs(e.date);
      return (eDate.isAfter(start) || eDate.isSame(start, 'day')) && 
             (eDate.isBefore(end) || eDate.isSame(end, 'day'));
    });

    // Ringkasan
    const totalRevenue = rangeTxs.reduce((sum, t) => sum + t.total, 0);
    const totalExpenses = rangeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const txCount = rangeTxs.length;
    const customerCount = rangeTxs.length;

    // Revenue per Barber
    const barberRevenue: { [id: number]: number } = {};
    const barberTxCount: { [id: number]: number } = {};
    barbers.forEach(b => {
      barberRevenue[b.id!] = 0;
      barberTxCount[b.id!] = 0;
    });
    rangeTxs.forEach(t => {
      barberRevenue[t.barberId] = (barberRevenue[t.barberId] || 0) + t.total;
      barberTxCount[t.barberId] = (barberTxCount[t.barberId] || 0) + 1;
    });
    const barberBreakdown = barbers.map(b => ({
      name: b.name,
      revenue: barberRevenue[b.id!] || 0,
      count: barberTxCount[b.id!] || 0
    })).sort((a, b) => b.revenue - a.revenue);

    // Productivity & Best Barber
    let topBarberName = 'Belum ada';
    let maxBarberRevenue = -1;
    barberBreakdown.forEach(b => {
      if (b.revenue > maxBarberRevenue && b.revenue > 0) {
        maxBarberRevenue = b.revenue;
        topBarberName = b.name;
      }
    });

    // Revenue per Service & count
    const serviceSalesCount: { [id: number]: number } = {};
    const serviceSalesRev: { [id: number]: number } = {};
    services.forEach(s => {
      serviceSalesCount[s.id!] = 0;
      serviceSalesRev[s.id!] = 0;
    });
    rangeTxs.forEach(t => {
      t.serviceIds.forEach(sid => {
        const s = services.find(srv => srv.id === sid);
        if (s) {
          serviceSalesCount[sid] = (serviceSalesCount[sid] || 0) + 1;
          // Calculate proportional revenue per service
          // In simple transactions, we can sum their prices
          serviceSalesRev[sid] = (serviceSalesRev[sid] || 0) + s.price;
        }
      });
    });
    const serviceBreakdown = services.map(s => ({
      name: s.name,
      category: s.category,
      count: serviceSalesCount[s.id!] || 0,
      revenue: serviceSalesRev[s.id!] || 0
    })).sort((a, b) => b.count - a.count);

    // Best Selling Service
    let topServiceName = 'Belum ada';
    let maxServiceCount = -1;
    serviceBreakdown.forEach(s => {
      if (s.count > maxServiceCount && s.count > 0) {
        maxServiceCount = s.count;
        topServiceName = s.name;
      }
    });

    // Payment method share
    const paymentMethods: { [method: string]: number } = { Cash: 0, QRIS: 0 };
    rangeTxs.forEach(t => {
      if (paymentMethods[t.paymentMethod] !== undefined) {
        paymentMethods[t.paymentMethod] += t.total;
      }
    });

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      txCount,
      customerCount,
      barberBreakdown,
      topBarberName,
      serviceBreakdown,
      topServiceName,
      paymentMethods
    };
  }, [transactions, expenses, barbers, services, reportRange]);

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Get printable period text
  const getPeriodText = () => {
    const { start, end } = reportRange;
    if (reportType === 'Harian') {
      return start.format('D MMMM YYYY');
    } else if (reportType === 'Mingguan') {
      return `${start.format('D MMM YYYY')} s/d ${end.format('D MMM YYYY')}`;
    } else if (reportType === 'Bulanan') {
      return start.format('MMMM YYYY');
    } else if (reportType === 'Tahunan') {
      return start.format('YYYY');
    }
    return '';
  };

  // Print Report (utilizes browser printing with special report page styles)
  const handlePrintReport = () => {
    window.print();
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const periodStr = getPeriodText();
    const shopName = settings?.name || 'BarberFlow';

    // Document Title
    doc.setFontSize(18);
    doc.text(`LAPORAN KEUANGAN - ${shopName}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Tipe Laporan: Laporan ${reportType}`, 14, 27);
    doc.text(`Periode: ${periodStr}`, 14, 33);
    doc.text(`Dicetak Pada: ${dayjs().format('D MMMM YYYY HH:mm')}`, 14, 39);

    // Summary Table
    const summaryData = [
      ['Total Pendapatan', formatMoney(reportData.totalRevenue)],
      ['Total Pengeluaran', formatMoney(reportData.totalExpenses)],
      ['Laba Bersih', formatMoney(reportData.netProfit)],
      ['Jumlah Transaksi', `${reportData.txCount} Transaksi`],
      ['Total Pelanggan', `${reportData.customerCount} Orang`],
      ['Barber Terproduktif', reportData.topBarberName],
      ['Layanan Terlaris', reportData.topServiceName]
    ];
    
    doc.setFontSize(13);
    doc.text('1. Ringkasan Keuangan', 14, 50);
    autoTable(doc, {
      startY: 53,
      head: [['Indikator', 'Nilai / Keterangan']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55] }
    });

    // Barber Table
    doc.text('2. Kinerja Pendapatan Per Barber', 14, (doc as any).lastAutoTable.finalY + 12);
    const barberRows = reportData.barberBreakdown.map(b => [
      b.name,
      `${b.count} trx`,
      formatMoney(b.revenue)
    ]);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Nama Barber', 'Jumlah Melayani', 'Total Pendapatan']],
      body: barberRows,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55] }
    });

    // Service Table
    doc.text('3. Detail Penjualan Layanan', 14, (doc as any).lastAutoTable.finalY + 12);
    const serviceRows = reportData.serviceBreakdown.map(s => [
      s.name,
      s.category,
      `${s.count} kali`,
      formatMoney(s.revenue)
    ]);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Nama Layanan', 'Kategori', 'Jumlah Terjual', 'Provisional Revenue']],
      body: serviceRows,
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55] }
    });

    doc.save(`Laporan_${reportType}_${periodStr.replace(/\s+/g, '_')}.pdf`);
  };

  // Export to Excel (Multiple Sheets)
  const handleExportExcel = () => {
    if (!reportData) return;
    const periodStr = getPeriodText();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan
    const summaryRows = [
      { 'Indikator Laporan': 'Nama Toko', Nilai: settings?.name || 'BarberFlow' },
      { 'Indikator Laporan': 'Tipe Laporan', Nilai: reportType },
      { 'Indikator Laporan': 'Periode', Nilai: periodStr },
      { 'Indikator Laporan': 'Total Pendapatan', Nilai: reportData.totalRevenue },
      { 'Indikator Laporan': 'Total Pengeluaran', Nilai: reportData.totalExpenses },
      { 'Indikator Laporan': 'Laba Bersih', Nilai: reportData.netProfit },
      { 'Indikator Laporan': 'Jumlah Transaksi', Nilai: reportData.txCount },
      { 'Indikator Laporan': 'Total Pelanggan', Nilai: reportData.customerCount },
      { 'Indikator Laporan': 'Barber Terproduktif', Nilai: reportData.topBarberName },
      { 'Indikator Laporan': 'Layanan Terlaris', Nilai: reportData.topServiceName }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

    // Sheet 2: Barber
    const barberRows = reportData.barberBreakdown.map(b => ({
      'Nama Barber': b.name,
      'Jumlah Transaksi': b.count,
      'Total Pendapatan': b.revenue
    }));
    const wsBarber = XLSX.utils.json_to_sheet(barberRows);
    XLSX.utils.book_append_sheet(wb, wsBarber, 'Kinerja Barber');

    // Sheet 3: Layanan
    const serviceRows = reportData.serviceBreakdown.map(s => ({
      'Nama Layanan': s.name,
      Kategori: s.category,
      'Jumlah Terjual': s.count,
      'Perkiraan Pendapatan': s.revenue
    }));
    const wsService = XLSX.utils.json_to_sheet(serviceRows);
    XLSX.utils.book_append_sheet(wb, wsService, 'Penjualan Layanan');

    // Sheet 4: Pembayaran
    const payRows = Object.entries(reportData.paymentMethods).map(([method, total]) => ({
      'Metode Pembayaran': method,
      'Total Nominal': total
    }));
    const wsPay = XLSX.utils.json_to_sheet(payRows);
    XLSX.utils.book_append_sheet(wb, wsPay, 'Metode Pembayaran');

    XLSX.writeFile(wb, `Laporan_${reportType}_${periodStr.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="reports-page-container">
      {/* Date selector toolbar */}
      <div className="glass-card page-actions-card no-print">
        <div className="search-filter-wrapper report-selectors">
          <div className="select-wrapper">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="form-input select-input"
            >
              <option value="Harian">Laporan Harian</option>
              <option value="Mingguan">Laporan Mingguan (7 Hari)</option>
              <option value="Bulanan">Laporan Bulanan</option>
              <option value="Tahunan">Laporan Tahunan</option>
            </select>
          </div>

          <div className="report-period-picker">
            {reportType === 'Harian' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
              />
            )}
            {reportType === 'Mingguan' && (
              <div className="week-picker-helper">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                />
                <span className="week-range-hint">s/d {dayjs(selectedDate).add(6, 'day').format('DD/MM/YYYY')}</span>
              </div>
            )}
            {reportType === 'Bulanan' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-input"
              />
            )}
            {reportType === 'Tahunan' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="form-input select-input"
              >
                {['2024', '2025', '2026', '2027', '2028'].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="export-buttons-group">
          <button className="btn btn-secondary btn-icon" onClick={handlePrintReport} title="Print Laporan">
            <Printer size={16} />
          </button>
          <button className="btn btn-secondary" onClick={handleExportExcel} title="Export ke Excel">
            <FileSpreadsheet size={16} />
            <span>Excel</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportPDF} title="Download PDF">
            <Download size={16} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Main report presentation */}
      {!reportData ? (
        <div className="metrics-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="printable-report-area">
          {/* Header visible ONLY during printing */}
          <div className="print-report-header">
            <h2>{settings?.name || 'BarberFlow'}</h2>
            <p>{settings?.address}</p>
            <hr />
            <h3>LAPORAN KEUANGAN ({reportType.toUpperCase()})</h3>
            <p>Periode: {getPeriodText()}</p>
          </div>

          <div className="report-title-section no-print">
            <CalendarRange className="gold-text" size={24} />
            <h2>Laporan Keuangan {reportType} ({getPeriodText()})</h2>
          </div>

          {/* Cards metrics */}
          <div className="metrics-grid">
            <div className="glass-card metric-item-card">
              <div className="metric-icon-box gold-glow">
                <TrendingUp className="metric-icon gold-text" size={22} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Total Pendapatan</span>
                <span className="metric-value">{formatMoney(reportData.totalRevenue)}</span>
              </div>
            </div>

            <div className="glass-card metric-item-card">
              <div className="metric-icon-box danger-glow">
                <TrendingDown className="metric-icon danger-text" size={22} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Total Pengeluaran</span>
                <span className="metric-value danger-text">{formatMoney(reportData.totalExpenses)}</span>
              </div>
            </div>

            <div className="glass-card metric-item-card">
              <div className="metric-icon-box success-glow">
                <DollarSign className="metric-icon success-text" size={22} />
              </div>
              <div className="metric-details">
                <span className="metric-label">Laba Bersih</span>
                <span className="metric-value success-text">{formatMoney(reportData.netProfit)}</span>
              </div>
            </div>
          </div>

          <div className="metrics-grid col-4">
            <div className="glass-card metric-item-card smaller-padding">
              <div className="metric-details">
                <span className="metric-label">Jumlah Transaksi</span>
                <span className="metric-value font-1-1">{reportData.txCount} transaksi</span>
              </div>
            </div>

            <div className="glass-card metric-item-card smaller-padding">
              <div className="metric-details">
                <span className="metric-label">Total Pelanggan</span>
                <span className="metric-value font-1-1">{reportData.customerCount} orang</span>
              </div>
            </div>

            <div className="glass-card metric-item-card smaller-padding">
              <div className="metric-details">
                <span className="metric-label">Barber Terproduktif</span>
                <span className="metric-value font-1-1 truncate">{reportData.topBarberName}</span>
              </div>
            </div>

            <div className="glass-card metric-item-card smaller-padding">
              <div className="metric-details">
                <span className="metric-label">Layanan Terlaris</span>
                <span className="metric-value font-1-1 truncate">{reportData.topServiceName}</span>
              </div>
            </div>
          </div>

          {/* Breakdown grids */}
          <div className="report-details-grid">
            {/* Barber Breakdown */}
            <div className="glass-card report-detail-card">
              <h3 className="chart-title">Pendapatan Per Barber</h3>
              <div className="table-container header-transparent border-none">
                <table className="custom-table smaller-row">
                  <thead>
                    <tr>
                      <th>Nama Barber</th>
                      <th>Jumlah Melayani</th>
                      <th style={{ textAlign: 'right' }}>Total Omset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.barberBreakdown.map((b, idx) => (
                      <tr key={idx}>
                        <td>{b.name}</td>
                        <td>{b.count} trx</td>
                        <td style={{ textAlign: 'right' }} className="font-bold gold-text">
                          {formatMoney(b.revenue)}
                        </td>
                      </tr>
                    ))}
                    {reportData.barberBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }} className="text-muted">
                          Belum ada transaksi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="glass-card report-detail-card">
              <h3 className="chart-title">Metode Pembayaran</h3>
              <div className="table-container header-transparent border-none">
                <table className="custom-table smaller-row">
                  <thead>
                    <tr>
                      <th>Metode</th>
                      <th style={{ textAlign: 'right' }}>Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.paymentMethods).map(([method, total]) => (
                      <tr key={method}>
                        <td>{method}</td>
                        <td style={{ textAlign: 'right' }} className="font-bold">
                          {formatMoney(total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Service Breakdown (Col span 2) */}
            <div className="glass-card report-detail-card col-span-2">
              <h3 className="chart-title">Detail Penjualan Layanan</h3>
              <div className="table-container header-transparent border-none">
                <table className="custom-table smaller-row">
                  <thead>
                    <tr>
                      <th>Nama Layanan</th>
                      <th>Kategori</th>
                      <th>Jumlah Terjual</th>
                      <th style={{ textAlign: 'right' }}>Estimasi Omset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.serviceBreakdown.map((s, idx) => (
                      <tr key={idx}>
                        <td className="font-bold">{s.name}</td>
                        <td>{s.category}</td>
                        <td>{s.count} kali</td>
                        <td style={{ textAlign: 'right' }} className="gold-text">
                          {formatMoney(s.revenue)}
                        </td>
                      </tr>
                    ))}
                    {reportData.serviceBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center' }} className="text-muted">
                          Belum ada data penjualan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
