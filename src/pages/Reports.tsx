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
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  BarElement,
  ArcElement,
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

  // ── HIGH-QUALITY BAR CHART (Canvas 2D - HD Executive Style) ──────────────────────────────
  const drawBarChart = (labels: string[], data: number[], colors: string[]): string => {
    const W = 800, H = 360;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d')!;

    // Dark Luxury Card Container Background
    const bgGrad = c.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#121216');
    bgGrad.addColorStop(1, '#181820');
    c.fillStyle = bgGrad;
    c.beginPath();
    c.roundRect(0, 0, W, H, 16);
    c.fill();

    // Gold Border Outline
    c.strokeStyle = '#D4AF37';
    c.lineWidth = 1.5;
    c.stroke();

    const pL = 100, pR = 40, pT = 50, pB = 70;
    const cW = W - pL - pR, cH = H - pT - pB;
    const maxVal = Math.max(...data, 1);
    const n = data.length;
    const grpW = cW / n;
    const bW = Math.min(grpW * 0.48, 110);

    // Grid lines & Y-axis labels
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = pT + (cH / steps) * i;
      const val = Math.round((maxVal / steps) * (steps - i));
      
      c.strokeStyle = i === steps ? '#333344' : 'rgba(255, 255, 255, 0.07)';
      c.setLineDash(i === steps ? [] : [4, 4]);
      c.lineWidth = 1;
      c.beginPath(); 
      c.moveTo(pL, y); 
      c.lineTo(pL + cW, y); 
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = '#A1A1AA';
      c.font = '500 13px "Plus Jakarta Sans", sans-serif';
      c.textAlign = 'right';
      const lbl = val >= 1000000 ? (val/1000000).toFixed(1)+' Jt' : val >= 1000 ? (val/1000).toFixed(0)+' Rb' : String(val);
      c.fillText(lbl, pL - 12, y + 5);
    }

    // Render Bars with Gradient & Drop Shadows
    data.forEach((val, i) => {
      const bH = (val / maxVal) * cH;
      const x = pL + i * grpW + (grpW - bW) / 2;
      const y = pT + cH - bH;
      const color = colors[i] || '#D4AF37';

      // Bar linear gradient
      const grad = c.createLinearGradient(x, y, x, y + bH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '33');

      c.save();
      c.shadowColor = color + '66';
      c.shadowBlur = 12;
      c.fillStyle = grad;
      c.beginPath();
      c.roundRect(x, y, bW, bH, [10, 10, 0, 0]);
      c.fill();
      c.restore();

      // Top value pill badge
      const vText = val >= 1000000 ? `Rp ${(val/1000000).toFixed(1)}Jt` : val >= 1000 ? `Rp ${(val/1000).toFixed(0)}Rb` : `Rp ${val}`;
      c.fillStyle = 'rgba(212, 175, 55, 0.15)';
      c.strokeStyle = '#D4AF37';
      c.lineWidth = 1;
      const pillW = 90, pillH = 24, pillX = x + bW / 2 - pillW / 2, pillY = y - 32;
      c.beginPath();
      c.roundRect(pillX, pillY, pillW, pillH, 12);
      c.fill();
      c.stroke();

      c.fillStyle = '#FFFFFF';
      c.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      c.textAlign = 'center';
      c.fillText(vText, x + bW / 2, pillY + 16);

      // Name Label below X-axis
      c.fillStyle = '#F4F4F5';
      c.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      c.fillText(labels[i] || '', x + bW / 2, pT + cH + 30);

      // Color Dot
      c.fillStyle = color;
      c.beginPath();
      c.arc(x + bW / 2, pT + cH + 45, 6, 0, Math.PI * 2);
      c.fill();
    });

    return canvas.toDataURL('image/png');
  };

  // ── HIGH-QUALITY DONUT PIE CHART (Canvas 2D - HD Executive Style) ─────────────────────────────
  const drawPieChart = (labels: string[], data: number[], colors: string[]): string => {
    const W = 700, H = 340;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d')!;

    // Dark Card Background
    const bgGrad = c.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#121216');
    bgGrad.addColorStop(1, '#181820');
    c.fillStyle = bgGrad;
    c.beginPath();
    c.roundRect(0, 0, W, H, 16);
    c.fill();

    c.strokeStyle = '#D4AF37';
    c.lineWidth = 1.5;
    c.stroke();

    const total = data.reduce((s, v) => s + v, 0);
    if (total === 0) return canvas.toDataURL('image/png');

    const cx = 175, cy = H / 2, r = 115;
    let angle = -Math.PI / 2;

    // Render Slices
    data.forEach((val, i) => {
      const slice = (val / total) * Math.PI * 2;
      const color = colors[i] || '#D4AF37';

      c.save();
      c.shadowColor = 'rgba(0, 0, 0, 0.4)';
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, r, angle, angle + slice);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      c.restore();

      // Border divider
      c.strokeStyle = '#121216';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, r, angle, angle + slice);
      c.closePath();
      c.stroke();

      angle += slice;
    });

    // Donut Inner Hole
    c.fillStyle = '#121216';
    c.beginPath();
    c.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = '#D4AF37';
    c.lineWidth = 1;
    c.stroke();

    c.fillStyle = '#D4AF37';
    c.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    c.textAlign = 'center';
    c.fillText('Kontribusi', cx, cy - 8);
    c.fillStyle = '#FFFFFF';
    c.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    c.fillText('Barber', cx, cy + 12);

    // Legend List (Right side)
    const legX = cx + r + 35;
    labels.forEach((lbl, i) => {
      const lY = 45 + i * 55;
      const val = data[i] || 0;
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
      const color = colors[i] || '#D4AF37';

      // Legend Color Card
      c.fillStyle = 'rgba(255, 255, 255, 0.04)';
      c.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(legX, lY, 310, 44, 8);
      c.fill();
      c.stroke();

      // Color Badge Square
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(legX + 12, lY + 12, 20, 20, 4);
      c.fill();

      // Barber Name
      c.fillStyle = '#FFFFFF';
      c.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      c.textAlign = 'left';
      c.fillText(lbl.split(' (')[0], legX + 42, lY + 20);

      // Revenue Subtitle
      const revText = val >= 1000000 ? `Rp ${(val/1000000).toFixed(2)} Jt` : `Rp ${val.toLocaleString('id-ID')}`;
      c.fillStyle = '#A1A1AA';
      c.font = '500 12px "Plus Jakarta Sans", sans-serif';
      c.fillText(revText, legX + 42, lY + 35);

      // Percentage Pill (Right aligned)
      c.fillStyle = color + '22';
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.beginPath();
      c.roundRect(legX + 235, lY + 10, 60, 24, 12);
      c.fill();
      c.stroke();

      c.fillStyle = '#FFFFFF';
      c.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      c.textAlign = 'center';
      c.fillText(`${pct}%`, legX + 265, lY + 26);
    });

    return canvas.toDataURL('image/png');
  };

  // ── SECTION HEADER HELPER ───────────────────────────────────────────
  const drawSectionHeader = (doc: jsPDF, num: string, title: string, y: number, accentColor: [number, number, number]) => {
    // Left Accent vertical bar
    doc.setFillColor(...accentColor);
    doc.roundedRect(14, y - 4, 3.5, 10, 1, 1, 'F');

    // Section number badge
    doc.setFillColor(...accentColor);
    doc.roundedRect(20, y - 4, 9, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(num, 24.5, y + 3, { align: 'center' });

    // Section Title
    doc.setTextColor(15, 15, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 32, y + 3);

    // Gradient-like double underline bar
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.6);
    doc.line(14, y + 7.5, 196, y + 7.5);
  };

  // ── MAIN PDF GENERATOR ──────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!reportData) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const periodStr = getPeriodText();
      const shopName = (settings?.name || 'CLASSIC BARBER GO').toUpperCase();
      const address = settings?.address || 'Jl. Mr. Koesbiyono, Semarang';
      const phone = settings?.phone || '0812-3456-7890';
      const printTime = dayjs().format('DD MMMM YYYY, HH:mm');

      // ── PAGE 1 HEADER ──────────────────────────────────────────────
      // Full dark banner
      doc.setFillColor(10, 10, 18);
      doc.rect(0, 0, 210, 48, 'F');

      // Gold left stripe
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 0, 4, 48, 'F');

      // Gold bottom line
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 48, 210, 1.2, 'F');

      // Scissor + Shop Name
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(shopName, 12, 17);

      // Tag line
      doc.setTextColor(190, 185, 175);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('LAPORAN KEUANGAN & OPERASIONAL — BARBERFLOW POS SYSTEM', 12, 24);
      doc.text(`${address}   |   Telp: ${phone}`, 12, 30);

      // Right meta box
      doc.setFillColor(28, 26, 16);
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.roundedRect(128, 6, 76, 37, 3, 3, 'FD');

      doc.setTextColor(140, 135, 120);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('PERIODE LAPORAN', 132, 13);

      doc.setTextColor(212, 175, 55);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(periodStr, 132, 20);

      doc.setTextColor(160, 155, 140);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tipe  : Laporan ${reportType}`, 132, 27);
      doc.text(`Cetak : ${printTime}`, 132, 33);

      // ── KPI CARDS (Dark Luxury Style) ─────────────────────────────
      const cY = 53, cW = 44, cH = 26, cGap = 4;
      const cardDefs = [
        { lbl: 'TOTAL OMSET', val: formatMoney(reportData.totalRevenue),   clr: [212, 175, 55]  as [number,number,number] },
        { lbl: 'PENGELUARAN', val: formatMoney(reportData.totalExpenses),  clr: [220, 60, 60]   as [number,number,number] },
        { lbl: 'LABA BERSIH', val: formatMoney(reportData.netProfit),      clr: [16, 185, 129]  as [number,number,number] },
        { lbl: 'TRANSAKSI',   val: `${reportData.txCount} Trx`,            clr: [99, 102, 241]  as [number,number,number] },
      ];

      cardDefs.forEach((cd, i) => {
        const x = 14 + i * (cW + cGap);
        // Dark Card Background
        doc.setFillColor(14, 14, 22);
        doc.setDrawColor(...cd.clr);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, cY, cW, cH, 3, 3, 'FD');
        // Colored top accent stripe
        doc.setFillColor(...cd.clr);
        doc.roundedRect(x, cY, cW, 7, 3, 3, 'F');
        doc.rect(x, cY + 4, cW, 3, 'F');
        // Label (white on accent stripe)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5.8);
        doc.setFont('helvetica', 'bold');
        doc.text(cd.lbl, x + cW/2, cY + 5.2, { align: 'center' });
        // Value (light on dark)
        doc.setTextColor(245, 240, 220);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(cd.val, x + cW/2, cY + 18.5, { align: 'center', maxWidth: cW - 4 });
      });

      let y = 83;

      // ── SECTION 1: RINGKASAN KEUANGAN ─────────────────────────────
      drawSectionHeader(doc, '1', 'Ringkasan Eksekutif Keuangan & Operasional', y, [212, 175, 55]);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Indikator Keuangan', 'Nilai / Nominal', 'Analisis & Keterangan']],
        body: [
          ['Total Pemasukan (Omset Kotor)', formatMoney(reportData.totalRevenue), 'Pendapatan dari seluruh transaksi layanan & produk'],
          ['Total Pengeluaran Operasional', formatMoney(reportData.totalExpenses), 'Pembelian pomade, operasional & biaya lainnya'],
          ['Laba / (Rugi) Bersih',          formatMoney(reportData.netProfit),     `${reportData.netProfit >= 0 ? '✓ Keuntungan' : '✗ Kerugian'} periode ini`],
          ['Total Transaksi Terlayani',      `${reportData.txCount} Transaksi`,      'Jumlah nota pelanggan yang diselesaikan'],
        ],
        theme: 'grid',
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [18, 18, 28], textColor: [212, 175, 55], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5 },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [252, 251, 245] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62 }, 1: { fontStyle: 'bold', cellWidth: 44, textColor: [30, 80, 30] } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── CHART 1: BAR CHART ─────────────────────────────────────────
      if (reportData.barberBreakdown.length > 0) {
        if (y > 185) { doc.addPage(); y = 20; }
        drawSectionHeader(doc, '2', 'Grafik Performa Omset per Barber', y, [212, 175, 55]);
        y += 9;
        const barColors = ['#D4AF37', '#10B981', '#6366F1', '#F59E0B', '#EF4444'];
        const b64 = drawBarChart(
          reportData.barberBreakdown.map(b => b.name),
          reportData.barberBreakdown.map(b => b.revenue),
          barColors.slice(0, reportData.barberBreakdown.length)
        );
        doc.addImage(b64, 'PNG', 14, y, 182, 82);
        y += 88;
      }

      // ── CHART 2: PIE CHART ─────────────────────────────────────────
      if (reportData.barberBreakdown.length > 0 && reportData.totalRevenue > 0) {
        if (y > 180) { doc.addPage(); y = 20; }
        drawSectionHeader(doc, '3', 'Grafik Kontribusi Omset Barber (%)', y, [16, 185, 129]);
        y += 9;
        const pieColors = ['#D4AF37', '#10B981', '#6366F1', '#F59E0B', '#EF4444'];
        const p64 = drawPieChart(
          reportData.barberBreakdown.map(b => b.name),
          reportData.barberBreakdown.map(b => b.revenue),
          pieColors.slice(0, reportData.barberBreakdown.length)
        );
        doc.addImage(p64, 'PNG', 14, y, 182, 88);
        y += 94;
      }

      // ── SECTION 4: TABEL PERFORMA BARBER ──────────────────────────
      if (y > 215) { doc.addPage(); y = 20; }
      drawSectionHeader(doc, '4', 'Tabel Performa Kinerja Barber', y, [212, 175, 55]);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Nama Barber', 'Jumlah Pemotongan', 'Total Omset', 'Kontribusi (%)']],
        body: reportData.barberBreakdown.length > 0
          ? reportData.barberBreakdown.map((b, i) => [`#${i+1}`, b.name, `${b.count} Sesi`, formatMoney(b.revenue), `${b.share}%`])
          : [['-', 'Belum ada data barber', '-', '-', '-']],
        theme: 'grid',
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5 },
        bodyStyles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [254, 252, 240] },
        columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 14 }, 1: { fontStyle: 'bold' } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── SECTION 5: LAYANAN TERLARIS ────────────────────────────────
      if (y > 215) { doc.addPage(); y = 20; }
      drawSectionHeader(doc, '5', 'Layanan & Produk Pomade Terlaris', y, [99, 102, 241]);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['#', 'Nama Layanan / Produk', 'Kategori', 'Qty Terjual', 'Total Revenue']],
        body: reportData.serviceBreakdown.slice(0, 8).length > 0
          ? reportData.serviceBreakdown.slice(0, 8).map((s, i) => [`#${i+1}`, s.name, s.category, `${s.count}×`, formatMoney(s.revenue)])
          : [['-', 'Belum ada data transaksi', '-', '-', '-']],
        theme: 'grid',
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [18, 18, 28], textColor: [200, 200, 255], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5 },
        bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [30, 30, 50] },
        alternateRowStyles: { fillColor: [246, 246, 255] },
        columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 14 } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── SECTION 6: DETAIL PEMASUKAN ────────────────────────────────
      if (y > 215) { doc.addPage(); y = 20; }
      drawSectionHeader(doc, '6', 'Detail Pemasukan Transaksi', y, [16, 185, 129]);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['No. TRX', 'Tanggal', 'Pelanggan', 'Barber', 'Total', 'Metode']],
        body: reportData.rangeTxs.slice(0, 12).length > 0
          ? reportData.rangeTxs.slice(0, 12).map(t => {
              const bn = barbers?.find(b => b.id === t.barberId)?.name || '-';
              return [t.id, `${t.date}\n${t.time}`, t.customerName, bn, formatMoney(t.total), t.paymentMethod];
            })
          : [['-', '-', 'Tidak ada transaksi', '-', '-', '-']],
        theme: 'striped',
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [10, 60, 40], textColor: [100, 255, 180], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.8, textColor: [20, 50, 35] },
        alternateRowStyles: { fillColor: [240, 255, 248] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── SECTION 7: DETAIL PENGELUARAN ──────────────────────────────
      if (y > 215) { doc.addPage(); y = 20; }
      drawSectionHeader(doc, '7', 'Detail Pengeluaran Toko', y, [220, 60, 60]);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Tanggal & Jam', 'Kategori / Keperluan', 'Nominal', 'Penanggung Jawab', 'Catatan']],
        body: reportData.rangeExpenses.slice(0, 12).length > 0
          ? reportData.rangeExpenses.slice(0, 12).map(e => [`${e.date}\n${e.time}`, e.category, formatMoney(e.amount), e.handler, e.notes || '-'])
          : [['-', 'Tidak ada pengeluaran', '-', '-', '-']],
        theme: 'striped',
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [60, 10, 10], textColor: [255, 160, 160], fontStyle: 'bold', fontSize: 8.5, cellPadding: 3.5 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.8, textColor: [60, 20, 20] },
        alternateRowStyles: { fillColor: [255, 247, 247] },
      });
      y = (doc as any).lastAutoTable.finalY + 14;

      // ── SIGNATURE & FOOTER ─────────────────────────────────────────
      if (y > 240) { doc.addPage(); y = 25; }

      // Double divider line (gold + thin)
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.8);
      doc.line(14, y, 196, y);
      doc.setLineWidth(0.2);
      doc.line(14, y + 1.5, 196, y + 1.5);
      y += 9;

      // Left: system generated note
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 135, 120);
      doc.text('Dokumen ini dibuat otomatis oleh sistem POS BarberFlow.', 14, y);
      doc.text(`Dicetak pada: ${printTime}`, 14, y + 5);

      // Right: signature block
      doc.setTextColor(20, 20, 25);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Semarang, ' + dayjs().format('DD MMMM YYYY'), 148, y);
      doc.text('Manajer / Owner Toko', 148, y + 5);

      // Signature box
      doc.setDrawColor(180, 170, 140);
      doc.setLineWidth(0.3);
      doc.roundedRect(148, y + 8, 46, 18, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 25);
      doc.text('( ______________________ )', 148, y + 25);

      // ── PAGE NUMBERS ───────────────────────────────────────────────
      const totalPg = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPg; p++) {
        doc.setPage(p);
        // Dark footer bar
        doc.setFillColor(8, 8, 16);
        doc.rect(0, 285, 210, 12, 'F');
        // Gold top accent line on footer
        doc.setFillColor(212, 175, 55);
        doc.rect(0, 285, 210, 1, 'F');
        // Dimmer accent
        doc.setFillColor(100, 85, 30);
        doc.rect(0, 286.2, 210, 0.4, 'F');
        // Footer texts
        doc.setTextColor(170, 165, 145);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`${shopName}  ·  BarberFlow POS System  ·  ${address}`, 14, 292);
        // Page number (gold)
        doc.setTextColor(212, 175, 55);
        doc.setFont('helvetica', 'bold');
        doc.text(`${p} / ${totalPg}`, 196, 292, { align: 'right' });
      }

      doc.save(`Laporan_${reportType}_${shopName.replace(/\s+/g, '_')}_${dayjs().format('DDMMYYYY')}.pdf`);
      toast.success('PDF Laporan berhasil dibuat!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Gagal membuat PDF. Silakan coba lagi.');
    }
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
