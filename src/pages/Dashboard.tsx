import React, { useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import { 
  TrendingUp, 
  Bookmark,
  FileText
} from 'lucide-react';
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
  // DB Queries
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());

  const currency = settings?.currency || 'Rp';

  const today = dayjs().format('YYYY-MM-DD');

  // Find active session or most recent session today
  const activeOrLastSession = useMemo(() => {
    if (!sessions) return null;
    const openSession = sessions.find(s => s.status === 'open');
    if (openSession) return openSession;
    return null;
  }, [sessions]);

  // Calculated Dashboard Stats
  const stats = useMemo(() => {
    if (!transactions || !expenses || !barbers || !services) return null;

    let todayTxs = [];
    let todayExpenses = [];

    if (activeOrLastSession) {
      todayTxs = transactions.filter(t => t.sessionId === activeOrLastSession.id);
      todayExpenses = expenses.filter(e => e.sessionId === activeOrLastSession.id);
    } else {
      todayTxs = transactions.filter(t => t.date === today);
      todayExpenses = expenses.filter(e => e.date === today);
    }

    const todayRevenue = todayTxs.reduce((sum, t) => sum + t.total, 0);
    const todayExpenseVal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const todayProfit = todayRevenue - todayExpenseVal;
    const todayTxCount = todayTxs.length;

    // Performa Barber
    const barberPerf = barbers.map(b => {
      const bTxs = todayTxs.filter(t => t.barberId === b.id);
      const bRevenue = bTxs.reduce((sum, t) => sum + t.total, 0);
      return {
        id: b.id!,
        name: b.name,
        count: bTxs.length,
        revenue: bRevenue
      };
    });

    // Payment Methods distribution
    let cashCount = 0;
    let qrisCount = 0;
    todayTxs.forEach(t => {
      if (t.paymentMethod === 'Cash') cashCount++;
      if (t.paymentMethod === 'QRIS') qrisCount++;
    });

    return {
      todayRevenue,
      todayExpenseVal,
      todayProfit,
      todayTxCount,
      barberPerf,
      cashCount,
      qrisCount
    };
  }, [transactions, expenses, barbers, services, today, activeOrLastSession]);

  // Chart Data: 7 Days Revenue Trend
  const sevenDaysData = useMemo(() => {
    if (!transactions) return { labels: [], datasets: [] };

    const labels = [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const dStr = d.format('YYYY-MM-DD');
      labels.push(i === 0 ? 'Hari Ini' : d.format('ddd'));
      const dayTxs = transactions.filter(t => t.date === dStr);
      data.push(dayTxs.reduce((sum, t) => sum + t.total, 0));
    }

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Omset 7 Hari Terakhir',
          data,
          borderColor: '#D4AF37',
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
            gradient.addColorStop(1, 'rgba(212, 175, 55, 0.0)');
            return gradient;
          },
          tension: 0.4,
          pointBackgroundColor: '#D4AF37',
          pointBorderColor: '#D4AF37',
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
  }, [transactions]);

  // Chart Data: Payment Methods (Doughnut)
  const paymentChartData = useMemo(() => {
    const cash = stats?.cashCount || 5;
    const qris = stats?.qrisCount || 5;
    return {
      labels: ['Cash', 'QRIS'],
      datasets: [
        {
          data: [cash, qris],
          backgroundColor: ['#D4AF37', '#10B981'],
          borderColor: '#121212',
          borderWidth: 2
        }
      ]
    };
  }, [stats]);

  // Chart Data: Layanan Terlaris (Horizontal Bar Chart)
  const topServicesData = useMemo(() => {
    if (!transactions || !services) return { labels: [], datasets: [] };

    const serviceCounts: { [name: string]: number } = {};
    services.forEach(s => { serviceCounts[s.name] = 0; });

    transactions.forEach(t => {
      t.serviceIds.forEach(sid => {
        const s = services.find(srv => srv.id === sid);
        if (s) {
          serviceCounts[s.name] = (serviceCounts[s.name] || 0) + 1;
        }
      });
    });

    const sorted = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sorted.map(s => s[0]),
      datasets: [
        {
          label: 'Jumlah Transaksi',
          data: sorted.map(s => s[1]),
          backgroundColor: '#D4AF37',
          borderRadius: 4,
          barThickness: 16
        }
      ]
    };
  }, [transactions, services]);

  const lineOptions = {
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
        padding: 8,
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#D4AF37',
        bodyColor: '#FFFFFF',
        borderColor: '#2B2B2B',
        borderWidth: 1
      }
    }
  };

  const horizontalBarOptions: any = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#D4AF37',
        bodyColor: '#FFFFFF',
        borderColor: '#2B2B2B',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#71717A', font: { family: 'Inter', size: 11 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#E4E4E7', font: { family: 'Inter', size: 11, weight: 'bold' } }
      }
    }
  };

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  const getAvatarBg = (name: string) => {
    if (name.toLowerCase().includes('faiz')) return '#D4AF37';
    if (name.toLowerCase().includes('fadli')) return '#10B981';
    if (name.toLowerCase().includes('rizki')) return '#6366F1';
    return '#D4AF37';
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {!stats ? (
        <div className="metrics-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* 1. Metrics Cards Row (4 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Omset Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  $
                </div>
                <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  ↑ 12.4%
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.05em' }}>TOTAL OMSET HARI INI</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(stats.todayRevenue)}
              </div>
            </div>

            {/* Pengeluaran Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bookmark size={18} />
                </div>
                <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  ↓ 3.2%
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.05em' }}>TOTAL PENGELUARAN</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(stats.todayExpenseVal)}
              </div>
            </div>

            {/* Laba Bersih Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={18} />
                </div>
                <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  ↑ 8.7%
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.05em' }}>LABA BERSIH</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                {formatMoney(stats.todayProfit)}
              </div>
            </div>

            {/* Jumlah Transaksi Card */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} />
                </div>
                <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  ↑ 5 trx
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.05em' }}>JUMLAH TRANSAKSI</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                {stats.todayTxCount}
              </div>
            </div>
          </div>

          {/* 2. Performa Barber Row */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717A', letterSpacing: '0.08em', display: 'block', marginBottom: '0.75rem' }}>
              PERFORMA BARBER
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {stats.barberPerf.map(b => {
                const initials = b.name.substring(0, 2).toUpperCase();
                return (
                  <div key={b.id} className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: getAvatarBg(b.name),
                        color: '#000000',
                        fontWeight: '800',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>{b.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#71717A' }}>Barber</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#71717A', display: 'block' }}>Revenue</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#D4AF37', fontFamily: 'var(--font-mono)' }}>
                          {formatMoney(b.revenue)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', color: '#71717A', display: 'block' }}>Transaksi</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {b.count} trx
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Charts Row 1 (Omset 7 Hari & Metode Pembayaran) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            {/* Omset 7 Hari Terakhir */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Omset 7 Hari Terakhir</h3>
                <p style={{ fontSize: '0.75rem', color: '#71717A', margin: '0.2rem 0 0 0' }}>Pendapatan kotor per hari</p>
              </div>
              <div style={{ height: '200px', width: '100%' }}>
                <Line data={sevenDaysData} options={lineOptions} />
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Metode Pembayaran</h3>
                <p style={{ fontSize: '0.75rem', color: '#71717A', margin: '0.2rem 0 0 0' }}>Distribusi Cash vs QRIS</p>
              </div>
              <div style={{ height: '150px', width: '100%', position: 'relative' }}>
                <Doughnut data={paymentChartData} options={doughnutOptions} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4AF37' }} />
                  Cash ({stats.cashCount || 5})
                </span>
                <span style={{ fontSize: '0.75rem', color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  QRIS ({stats.qrisCount || 5})
                </span>
              </div>
            </div>
          </div>

          {/* 4. Charts Row 2 (Layanan Terlaris - Screenshot 2) */}
          <div className="glass-card" style={{ background: '#121212', borderRadius: '12px', border: '1px solid #222222', padding: '1.25rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Layanan Terlaris</h3>
              <p style={{ fontSize: '0.75rem', color: '#71717A', margin: '0.2rem 0 0 0' }}>Berdasarkan jumlah transaksi</p>
            </div>
            <div style={{ height: '220px', width: '100%' }}>
              <Bar data={topServicesData} options={horizontalBarOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
