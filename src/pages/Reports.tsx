import React, { useState, useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import { 
  Printer, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Equal
} from 'lucide-react';
import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { CardSkeleton } from '../components/SkeletonLoader';
import './Reports.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  const [reportType, setReportType] = useState<ReportType>('Bulanan');
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
      id: b.id!,
      name: b.name,
      revenue: barberRevenue[b.id!] || 0,
      count: barberTxCount[b.id!] || 0,
      share: totalRevenue > 0 ? Math.round(((barberRevenue[b.id!] || 0) / totalRevenue) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // Service Breakdown
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

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      txCount,
      barberBreakdown,
      serviceBreakdown,
      rangeTxs,
      rangeExpenses
    };
  }, [transactions, expenses, barbers, services, reportRange]);

  // Chart Data: 6 Months Revenue Trend
  const monthlyChartData = useMemo(() => {
    if (!transactions) return { labels: [], datasets: [] };

    const labels = [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      const mStr = m.format('YYYY-MM');
      labels.push(m.format('MMM'));
      const monthTxs = transactions.filter(t => t.date.startsWith(mStr));
      data.push(monthTxs.reduce((sum, t) => sum + t.total, 0));
    }

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Omset Bulanan',
          data,
          borderColor: '#D4AF37',
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
            gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
            return gradient;
          },
          tension: 0.4,
          pointBackgroundColor: '#D4AF37',
          pointBorderColor: '#D4AF37',
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [transactions]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#D4AF37',
        bodyColor: '#FFFFFF',
        borderColor: '#2B2B2B',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Omset: ${currency} ${context.parsed.y.toLocaleString('id-ID')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#71717A', font: { family: 'Inter', size: 11 } }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    }
  };

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  const getPeriodText = () => {
    if (reportType === 'Harian') return dayjs(selectedDate).format('D MMMM YYYY');
    if (reportType === 'Mingguan') return `${dayjs(selectedDate).format('D MMM')} - ${dayjs(selectedDate).add(6, 'day').format('D MMM YYYY')}`;
    if (reportType === 'Bulanan') return dayjs(selectedMonth + '-01').format('MMMM YYYY');
    if (reportType === 'Tahunan') return `Tahun ${selectedYear}`;
    return '';
  };

  // Avatar background helper
  const getAvatarBg = (name: string) => {
    if (name.toLowerCase().includes('faiz')) return '#D4AF37';
    if (name.toLowerCase().includes('fadli')) return '#10B981';
    if (name.toLowerCase().includes('rizki')) return '#6366F1';
    return '#D4AF37';
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Executive Luxury PDF Generator
  const handleExportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const periodStr = getPeriodText();
    const shopName = settings?.name || 'CLASSIC BARBER GO';
    const address = settings?.address || 'Jl. Mr. Koesbiyono Tjondrowibowo, Semarang';
    const phone = settings?.phone || '0812-3456-7890';

    // 1. Top Header Dark Banner
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 36, 'F');

    // Header Gold Line
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 36, 210, 2, 'F');

    // Logo Scissor Icon / Title
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('✂ ' + shopName.toUpperCase(), 14, 16);

    doc.setTextColor(220, 220, 220);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('BARBERFLOW POS — FINANCIAL & OPERATIONAL REPORT', 14, 23);
    doc.text(`${address} | Telp: ${phone}`, 14, 29);

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`PERIODE: ${periodStr.toUpperCase()}`, 145, 16, { align: 'left' });
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipe: Laporan ${reportType}`, 145, 22);
    doc.text(`Cetak: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 145, 28);

    // 2. KPI Summary Highlight Boxes (4 Metric Cards)
    const cardY = 44;
    const cardW = 43;
    const cardH = 18;
    const gap = 5;

    // Card 1: Total Revenue
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(212, 175, 55);
    doc.rect(14, cardY, cardW, cardH, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL OMSET (GROSS)', 18, cardY + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text(formatMoney(reportData.totalRevenue), 18, cardY + 13);

    // Card 2: Expenses
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(239, 68, 68);
    doc.rect(14 + cardW + gap, cardY, cardW, cardH, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL PENGELUARAN', 18 + cardW + gap, cardY + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(formatMoney(reportData.totalExpenses), 18 + cardW + gap, cardY + 13);

    // Card 3: Net Profit
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(16, 185, 129);
    doc.rect(14 + (cardW + gap) * 2, cardY, cardW, cardH, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('LABA BERSIH (NET)', 18 + (cardW + gap) * 2, cardY + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(formatMoney(reportData.netProfit), 18 + (cardW + gap) * 2, cardY + 13);

    // Card 4: Transactions
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(59, 130, 246);
    doc.rect(14 + (cardW + gap) * 3, cardY, cardW, cardH, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL TRANSAKSI', 18 + (cardW + gap) * 3, cardY + 5);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`${reportData.txCount} Transaksi`, 18 + (cardW + gap) * 3, cardY + 13);

    let currentY = 70;

    // 3. Section 1: Executive Financial Summary Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text('1. Ringkasan Eksekutif Keuangan & Operasional', 14, currentY);

    const summaryData = [
      ['Total Pemasukan (Omset)', formatMoney(reportData.totalRevenue), 'Pendapatan Kotor Seluruh Transaksi'],
      ['Total Pengeluaran Operasional', formatMoney(reportData.totalExpenses), 'Biaya Operasional, Pomade & Perlengkapan'],
      ['Laba / (Rugi) Bersih', formatMoney(reportData.netProfit), 'Omset Dikurangi Total Pengeluaran'],
      ['Volume Transaksi Selesai', `${reportData.txCount} Transaksi`, 'Total Nota Pelanggan Terlayani']
    ];

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Metrik Utama', 'Nominal / Nilai', 'Keterangan Analisis']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [15, 15, 15], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { fontStyle: 'bold', cellWidth: 45 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 9;

    // 4. Section 2: Barber Performance Report Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text('2. Laporan Performa Kinerja Barber', 14, currentY);

    const barberRows = reportData.barberBreakdown.map((b, idx) => [
      `#${idx + 1}`,
      b.name,
      `${b.count} Transaksi`,
      formatMoney(b.revenue),
      `${b.share}%`
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Peringkat', 'Nama Barber', 'Jumlah Pemotongan', 'Total Omset', 'Kontribusi (%)']],
      body: barberRows.length > 0 ? barberRows : [['-', 'Belum ada data barber', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 9;

    // 5. Section 3: Popular Services & Pomade Sales
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text('3. Laporan Layanan & Produk Pomade Terlaris', 14, currentY);

    const serviceRows = reportData.serviceBreakdown.slice(0, 8).map((s, idx) => [
      `#${idx + 1}`,
      s.name,
      s.category,
      `${s.count} Qty`,
      formatMoney(s.revenue)
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Rank', 'Nama Layanan / Produk', 'Kategori', 'Qty Terjual', 'Total Revenue']],
      body: serviceRows.length > 0 ? serviceRows : [['-', 'Belum ada transaksi', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 } }
    });

    currentY = (doc as any).lastAutoTable.finalY + 9;

    // 6. Section 4: Income Transactions List
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text('4. Rincian Pemasukan Transaksi (Terbaru)', 14, currentY);

    const txRows = reportData.rangeTxs.slice(0, 10).map(t => {
      const bName = barbers?.find(b => b.id === t.barberId)?.name || '-';
      return [
        t.id,
        `${t.date} ${t.time}`,
        t.customerName,
        bName,
        formatMoney(t.total),
        t.paymentMethod
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['No. TRX', 'Waktu', 'Pelanggan', 'Barber', 'Total', 'Metode Bayar']],
      body: txRows.length > 0 ? txRows : [['-', '-', 'Tidak ada transaksi pada periode ini', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 8.5 },
      bodyStyles: { fontSize: 8 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 9;

    // 7. Section 5: Store Expenses List
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(18, 18, 18);
    doc.text('5. Rincian Pengeluaran Toko', 14, currentY);

    const expenseRows = reportData.rangeExpenses.slice(0, 10).map(e => [
      `${e.date} ${e.time}`,
      e.category,
      formatMoney(e.amount),
      e.handler,
      e.notes || '-'
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Waktu', 'Kategori / Keperluan', 'Nominal', 'Penanggung Jawab', 'Catatan']],
      body: expenseRows.length > 0 ? expenseRows : [['-', 'Tidak ada pengeluaran pada periode ini', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontSize: 8.5 },
      bodyStyles: { fontSize: 8 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 14;
    if (currentY > 240) {
      doc.addPage();
      currentY = 25;
    }

    // 8. Bottom Approval Box & Signature Section
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, 196, currentY);

    currentY += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Laporan dibuat secara otomatis oleh sistem POS BarberFlow pada ${dayjs().format('D MMMM YYYY HH:mm')}`, 14, currentY);

    doc.setTextColor(18, 18, 18);
    doc.text('Disetujui oleh,', 145, currentY);
    doc.text('Manajer / Owner Classic Barber Go', 145, currentY + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.text('( _______________________ )', 145, currentY + 22);

    // Page numbering
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Classic Barber Go POS — Halaman ${i} dari ${totalPages}`, 105, 290, { align: 'center' });
    }

    doc.save(`Laporan_Eksekutif_${reportType}_${periodStr.replace(/\s+/g, '_')}.pdf`);
  };

  // Comprehensive Multi-Sheet Excel Generator
  const handleExportExcel = () => {
    if (!reportData) return;
    const periodStr = getPeriodText();
    const wb = XLSX.utils.book_new();

    // 1. Ringkasan Sheet
    const summaryRows = [
      { 'METRIK KEUANGAN': 'Nama Toko', NILAI: settings?.name || 'Classic Barber Go' },
      { 'METRIK KEUANGAN': 'Tipe Laporan', NILAI: reportType },
      { 'METRIK KEUANGAN': 'Periode Laporan', NILAI: periodStr },
      { 'METRIK KEUANGAN': 'Total Pemasukan (Omset)', NILAI: reportData.totalRevenue },
      { 'METRIK KEUANGAN': 'Total Pengeluaran Toko', NILAI: reportData.totalExpenses },
      { 'METRIK KEUANGAN': 'Laba Bersih', NILAI: reportData.netProfit },
      { 'METRIK KEUANGAN': 'Total Transaksi Selesai', NILAI: reportData.txCount }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

    // 2. Detail Pemasukan Sheet
    const incomeRows = reportData.rangeTxs.map(t => {
      const bName = barbers?.find(b => b.id === t.barberId)?.name || '-';
      return {
        'No TRX': t.id,
        'Tanggal': t.date,
        'Jam': t.time,
        'Nama Pelanggan': t.customerName,
        'Barber': bName,
        'Subtotal (Rp)': t.subtotal,
        'Total Akhir (Rp)': t.total,
        'Metode Pembayaran': t.paymentMethod,
        'Catatan': t.notes || ''
      };
    });
    const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Detail Pemasukan');

    // 3. Detail Pengeluaran Sheet
    const expenseRows = reportData.rangeExpenses.map(e => ({
      'Tanggal': e.date,
      'Jam': e.time,
      'Kategori / Keperluan': e.category,
      'Nominal (Rp)': e.amount,
      'Penanggung Jawab': e.handler,
      'Catatan': e.notes || ''
    }));
    const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Detail Pengeluaran');

    // 4. Performa Barber Sheet
    const barberRows = reportData.barberBreakdown.map(b => ({
      'Nama Barber': b.name,
      'Jumlah Transaksi': b.count,
      'Total Omset (Rp)': b.revenue,
      'Kontribusi Omset (%)': `${b.share}%`
    }));
    const wsBarber = XLSX.utils.json_to_sheet(barberRows);
    XLSX.utils.book_append_sheet(wb, wsBarber, 'Performa Barber');

    // 5. Layanan & Produk Terlaris Sheet
    const serviceRows = reportData.serviceBreakdown.map(s => ({
      'Nama Layanan / Produk': s.name,
      'Kategori': s.category,
      'Jumlah Terjual (Qty)': s.count,
      'Total Omset (Rp)': s.revenue
    }));
    const wsServices = XLSX.utils.json_to_sheet(serviceRows);
    XLSX.utils.book_append_sheet(wb, wsServices, 'Layanan Terlaris');

    XLSX.writeFile(wb, `Laporan_BarberFlow_${reportType}_${periodStr.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="reports-page-container">
      {/* Top Header & Export Toolbar */}
      <div className="reports-header-row no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Laporan Keuangan</h1>
          <p style={{ color: '#71717A', fontSize: '0.85rem', marginTop: '0.2rem' }}>Ringkasan semua transaksi</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div className="select-wrapper" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="form-input select-input"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <option value="Harian">Laporan Harian</option>
              <option value="Mingguan">Laporan Mingguan</option>
              <option value="Bulanan">Laporan Bulanan</option>
              <option value="Tahunan">Laporan Tahunan</option>
            </select>

            {reportType === 'Harian' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              />
            )}
            {reportType === 'Mingguan' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              />
            )}
            {reportType === 'Bulanan' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              />
            )}
            {reportType === 'Tahunan' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="form-input select-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
              >
                {['2024', '2025', '2026', '2027', '2028'].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            )}
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="btn" 
              onClick={handleExportPDF} 
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={15} />
              <span>PDF</span>
            </button>
            <button 
              className="btn" 
              onClick={handleExportExcel} 
              style={{ border: '1px solid #10B981', color: '#10B981', backgroundColor: 'transparent', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FileSpreadsheet size={15} />
              <span>Excel</span>
            </button>
            <button 
              className="btn" 
              onClick={handlePrintReport} 
              style={{ backgroundColor: '#242424', color: '#FFFFFF', border: '1px solid #333', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {!reportData ? (
        <div className="metrics-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="printable-report-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Print Header */}
          <div className="print-report-header">
            <h2>{settings?.name || 'BarberFlow'}</h2>
            <p>{settings?.address}</p>
            <hr />
            <h3>LAPORAN KEUANGAN ({reportType.toUpperCase()})</h3>
            <p>Periode: {getPeriodText()}</p>
          </div>

          {/* Metrics Row (3 Cards matching Figma) */}
          <div className="metrics-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Total Omset Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={14} />
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA', letterSpacing: '0.05em' }}>TOTAL OMSET</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D4AF37', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(reportData.totalRevenue)}
              </div>
            </div>

            {/* Total Pengeluaran Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={14} />
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA', letterSpacing: '0.05em' }}>TOTAL PENGELUARAN</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#EF4444', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(reportData.totalExpenses)}
              </div>
            </div>

            {/* Laba Bersih Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Equal size={14} />
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA', letterSpacing: '0.05em' }}>LABA BERSIH</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(reportData.netProfit)}
              </div>
            </div>
          </div>

          {/* Chart Card: Omset Bulanan */}
          <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Omset Bulanan</h3>
              <p style={{ fontSize: '0.78rem', color: '#71717A', margin: '0.2rem 0 0 0' }}>Tren pendapatan 6 bulan terakhir</p>
            </div>
            <div style={{ height: '220px', width: '100%' }}>
              <Line data={monthlyChartData} options={lineChartOptions} />
            </div>
          </div>

          {/* Barber Performance Table */}
          <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Performa Barber</h3>
            </div>

            <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>BARBER</th>
                    <th>JUMLAH TRANSAKSI</th>
                    <th>TOTAL REVENUE</th>
                    <th style={{ width: '220px' }}>SHARE</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.barberBreakdown.map((b) => {
                    const initials = b.name.substring(0, 2).toUpperCase();
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: getAvatarBg(b.name),
                              color: '#000',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {initials}
                            </span>
                            <span style={{ fontWeight: 600 }}>{b.name}</span>
                          </div>
                        </td>
                        <td>{b.count} trx</td>
                        <td className="font-bold gold-text" style={{ color: '#D4AF37' }}>
                          {formatMoney(b.revenue)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ flex: 1, height: '6px', borderRadius: '4px', backgroundColor: '#222222', overflow: 'hidden' }}>
                              <div style={{
                                width: `${b.share}%`,
                                height: '100%',
                                backgroundColor: getAvatarBg(b.name),
                                borderRadius: '4px',
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#A1A1AA', minWidth: '30px', textAlign: 'right' }}>
                              {b.share}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {reportData.barberBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#71717A' }}>
                        Belum ada data transaksi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
