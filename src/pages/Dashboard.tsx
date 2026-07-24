import React, { useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Receipt, 
  UserCheck, 
  Award, 
  CalendarRange,
  Unlock,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { CardSkeleton } from '../components/SkeletonLoader';
import './Dashboard.css';

// Register ChartJS
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

export const Dashboard: React.FC = () => {
  const today = dayjs().format('YYYY-MM-DD');
  const thisMonth = dayjs().format('YYYY-MM');

  // Reactively fetch data
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());
  const sessions = useLiveQuery(() => db.sessions.toArray());

  const currency = settings?.currency || 'Rp';

  // Format currency helper
  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Find active or last session
  const activeOrLastSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const active = sessions.find(s => s.status === 'open');
    if (active) return active;
    // return most recent closed session
    return [...sessions].sort((a, b) => b.openTime - a.openTime)[0];
  }, [sessions]);

  // Compute stats
  const stats = useMemo(() => {
    if (!transactions || !expenses || !barbers || !services) {
      return null;
    }

    let todayTxs = [];
    let todayExpenses = [];

    if (activeOrLastSession) {
      todayTxs = transactions.filter(t => {
        const tTime = t.createdAt;
        const afterOpen = tTime >= activeOrLastSession.openTime;
        const beforeClose = !activeOrLastSession.closeTime || tTime <= activeOrLastSession.closeTime;
        return afterOpen && beforeClose;
      });

      todayExpenses = expenses.filter(e => {
        const eTime = new Date(`${e.date}T${e.time}:00`).getTime();
        const afterOpen = eTime >= activeOrLastSession.openTime;
        const beforeClose = !activeOrLastSession.closeTime || eTime <= activeOrLastSession.closeTime;
        return afterOpen && beforeClose;
      });
    } else {
      todayTxs = transactions.filter(t => t.date === today);
      todayExpenses = expenses.filter(e => e.date === today);
    }

    const monthTxs = transactions.filter(t => t.date.startsWith(thisMonth));

    const todayRevenue = todayTxs.reduce((sum, t) => sum + t.total, 0);
    const todayExpenseVal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const todayProfit = todayRevenue - todayExpenseVal;
    
    const todayCustomers = todayTxs.length;
    const todayTxCount = todayTxs.length;

    const monthRevenue = monthTxs.reduce((sum, t) => sum + t.total, 0);

    // Barber teraktif
    const barberCounts: { [id: number]: number } = {};
    todayTxs.forEach(t => {
      barberCounts[t.barberId] = (barberCounts[t.barberId] || 0) + 1;
    });
    let topBarberId = -1;
    let maxBarberTxs = 0;
    Object.entries(barberCounts).forEach(([id, count]) => {
      if (count > maxBarberTxs) {
        maxBarberTxs = count;
        topBarberId = Number(id);
      }
    });
    const topBarberName = barbers.find(b => b.id === topBarberId)?.name || 'Belum ada';

    // Layanan terlaris
    const serviceCounts: { [id: number]: number } = {};
    todayTxs.forEach(t => {
      t.serviceIds.forEach(sid => {
        serviceCounts[sid] = (serviceCounts[sid] || 0) + 1;
      });
    });
    let topServiceId = -1;
    let maxServiceCount = 0;
    Object.entries(serviceCounts).forEach(([id, count]) => {
      if (count > maxServiceCount) {
        maxServiceCount = count;
        topServiceId = Number(id);
      }
    });
    const topServiceName = services.find(s => s.id === topServiceId)?.name || 'Belum ada';

    return {
      todayRevenue,
      todayExpenseVal,
      todayProfit,
      todayCustomers,
      todayTxCount,
      monthRevenue,
      topBarberName,
      topServiceName
    };
  }, [transactions, expenses, barbers, services, today, thisMonth, activeOrLastSession]);

  // Chart Data: 7 Days Revenue
  const sevenDaysData = useMemo(() => {
    if (!transactions) return { labels: [], datasets: [] };

    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const dStr = d.format('YYYY-MM-DD');
      labels.push(d.format('DD MMM'));
      const dayTxs = transactions.filter(t => t.date === dStr);
      data.push(dayTxs.reduce((sum, t) => sum + t.total, 0));
    }

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Pendapatan Harian',
          data,
          borderColor: '#D4AF37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          tension: 0.3
        }
      ]
    };
  }, [transactions]);

  // Chart Data: Monthly Revenue (Last 6 Months)
  const monthlyData = useMemo(() => {
    if (!transactions) return { labels: [], datasets: [] };

    const labels = [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const m = dayjs().subtract(i, 'month');
      const mStr = m.format('YYYY-MM');
      labels.push(m.format('MMMM'));
      const monthTxs = transactions.filter(t => t.date.startsWith(mStr));
      data.push(monthTxs.reduce((sum, t) => sum + t.total, 0));
    }

    return {
      labels,
      datasets: [
        {
          label: 'Pendapatan Bulanan',
          data,
          backgroundColor: '#D4AF37',
          borderRadius: 6
        }
      ]
    };
  }, [transactions]);

  // Chart Data: Services Sold Share
  const servicesShareData = useMemo(() => {
    if (!transactions || !services) return { labels: [], datasets: [] };

    const serviceMap: { [name: string]: number } = {};
    transactions.forEach(t => {
      t.serviceIds.forEach(sid => {
        const s = services.find(srv => srv.id === sid);
        if (s) {
          serviceMap[s.name] = (serviceMap[s.name] || 0) + 1;
        }
      });
    });

    const labels = Object.keys(serviceMap);
    const data = Object.values(serviceMap);
    const colors = services.map(s => s.labelColor || '#D4AF37');

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.length > 0 ? colors : ['#D4AF37', '#8A2BE2', '#00CED1', '#FF69B4', '#FF4500'],
          borderColor: '#1A1A1A',
          borderWidth: 2
        }
      ]
    };
  }, [transactions, services]);

  // Chart Data: Payment Method Share
  const paymentShareData = useMemo(() => {
    if (!transactions) return { labels: [], datasets: [] };

    const payMap: { [method: string]: number } = {
      Cash: 0,
      QRIS: 0
    };

    transactions.forEach(t => {
      if (payMap[t.paymentMethod] !== undefined) {
        payMap[t.paymentMethod]++;
      }
    });

    return {
      labels: Object.keys(payMap),
      datasets: [
        {
          data: Object.values(payMap),
          backgroundColor: ['#D4AF37', '#10B981'],
          borderColor: '#1A1A1A',
          borderWidth: 2
        }
      ]
    };
  }, [transactions]);

  // Chart Options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${formatMoney(context.raw as number)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#A3A3A3' } },
      y: { grid: { color: '#2B2B2B' }, ticks: { color: '#A3A3A3' } }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${formatMoney(context.raw as number)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#A3A3A3' } },
      y: { grid: { color: '#2B2B2B' }, ticks: { color: '#A3A3A3' } }
    }
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#A3A3A3',
          font: { size: 11 },
          boxWidth: 10
        }
      }
    }
  };

  if (!stats) {
    return (
      <div className="dashboard-container">
        <div className="metrics-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="dashboard-container"
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.05 }}
    >
      {/* Session status banner */}
      {activeOrLastSession && (
        <motion.div 
          className={`session-status-banner glass-panel ${activeOrLastSession.status === 'open' ? 'open-banner' : 'closed-banner'}`}
          variants={cardVariants}
        >
          <div className="banner-icon-box">
            {activeOrLastSession.status === 'open' ? (
              <Unlock size={18} className="success-text" />
            ) : (
              <Lock size={18} className="text-secondary" />
            )}
          </div>
          <div className="banner-details">
            <span className="banner-title">
              {activeOrLastSession.status === 'open' 
                ? 'Sesi Shift Aktif Terbuka' 
                : 'Sesi Shift Terakhir Ditutup'}
            </span>
            <span className="banner-sub">
              Kasir: <b>{activeOrLastSession.openedBy}</b> | {' '}
              Waktu: {dayjs(activeOrLastSession.openTime).format('DD MMM, HH:mm')} 
              {activeOrLastSession.closeTime ? ` s/d ${dayjs(activeOrLastSession.closeTime).format('HH:mm')}` : ' (Sekarang)'}
            </span>
          </div>
          <div className="banner-info-badge">
            Data Harian Berdasarkan Jam Open & Close Shift
          </div>
        </motion.div>
      )}

      {/* Metrics Row 1 */}
      <div className="metrics-grid">
        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box gold-glow">
            <TrendingUp className="metric-icon gold-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Pendapatan Hari Ini</span>
            <span className="metric-value">{formatMoney(stats.todayRevenue)}</span>
          </div>
        </motion.div>

        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box danger-glow">
            <TrendingDown className="metric-icon danger-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Pengeluaran Hari Ini</span>
            <span className="metric-value danger-text">{formatMoney(stats.todayExpenseVal)}</span>
          </div>
        </motion.div>

        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box success-glow">
            <DollarSign className="metric-icon success-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Laba Hari Ini</span>
            <span className="metric-value success-text">{formatMoney(stats.todayProfit)}</span>
          </div>
        </motion.div>

        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box info-glow">
            <Users className="metric-icon info-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Pelanggan Hari Ini</span>
            <span className="metric-value">{stats.todayCustomers} orang</span>
          </div>
        </motion.div>
      </div>

      {/* Metrics Row 2 */}
      <div className="metrics-grid">
        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box info-glow">
            <Receipt className="metric-icon info-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Transaksi Hari Ini</span>
            <span className="metric-value">{stats.todayTxCount} trx</span>
          </div>
        </motion.div>

        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box gold-glow">
            <UserCheck className="metric-icon gold-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Barber Teraktif</span>
            <span className="metric-value truncate">{stats.topBarberName}</span>
          </div>
        </motion.div>

        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box gold-glow">
            <Award className="metric-icon gold-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Layanan Terlaris</span>
            <span className="metric-value truncate">{stats.topServiceName}</span>
          </div>
        </motion.div>

        <motion.div className="glass-card metric-item-card" variants={cardVariants}>
          <div className="metric-icon-box gold-glow">
            <CalendarRange className="metric-icon gold-text" size={22} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Pendapatan Bulan Ini</span>
            <span className="metric-value">{formatMoney(stats.monthRevenue)}</span>
          </div>
        </motion.div>
      </div>

      {/* Graphs Grid */}
      <div className="charts-grid">
        <motion.div className="glass-card chart-card-large" variants={cardVariants}>
          <h3 className="chart-title">Pendapatan 7 Hari Terakhir</h3>
          <div className="chart-wrapper">
            <Line data={sevenDaysData} options={lineChartOptions} />
          </div>
        </motion.div>

        <motion.div className="glass-card chart-card-large" variants={cardVariants}>
          <h3 className="chart-title">Pendapatan Bulanan</h3>
          <div className="chart-wrapper">
            <Bar data={monthlyData} options={barChartOptions} />
          </div>
        </motion.div>

        <motion.div className="glass-card chart-card-small" variants={cardVariants}>
          <h3 className="chart-title">Proporsi Layanan</h3>
          <div className="chart-wrapper">
            <Doughnut data={servicesShareData} options={doughnutChartOptions} />
          </div>
        </motion.div>

        <motion.div className="glass-card chart-card-small" variants={cardVariants}>
          <h3 className="chart-title">Metode Pembayaran</h3>
          <div className="chart-wrapper">
            <Doughnut data={paymentShareData} options={doughnutChartOptions} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
