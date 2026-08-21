import React, { useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Transaction } from '../types';
import html2canvas from 'html2canvas';
import { Printer, Download, X, MessageSquare } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { sound } from '../utils/audio';
import './ReceiptPreview.css';

interface ReceiptPreviewProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ transaction, onClose }) => {
  const settings = useLiveQuery(() => db.settings.get());
  const barbers = useLiveQuery(() => db.barbers.toArray());
  const services = useLiveQuery(() => db.services.toArray());

  const currency = settings?.currency || 'Rp';

  const receiptData = useMemo(() => {
    if (!transaction || !barbers || !services) return null;

    const barberName = barbers.find(b => b.id === transaction.barberId)?.name || 'Unknown';
    const selectedServices = transaction.serviceIds
      .map(sid => services.find(s => s.id === sid))
      .filter(Boolean);

    return {
      barberName,
      selectedServices
    };
  }, [transaction, barbers, services]);

  if (!transaction || !receiptData) return null;

  const { barberName, selectedServices } = receiptData;

  const formatMoney = (val: number) => {
    return `${currency} ${val.toLocaleString('id-ID')}`;
  };

  // Browser Print handler (uses print CSS media queries)
  const handlePrint = () => {
    sound.playPrint();
    window.print();
  };

  // Helper to capture 100% full un-truncated canvas of printable receipt
  const captureFullReceiptCanvas = async () => {
    const el = document.getElementById('printable-receipt');
    if (!el) return null;

    const container = el.parentElement;
    const oldMaxHeight = container ? container.style.maxHeight : '';
    const oldOverflow = container ? container.style.overflow : '';

    if (container) {
      container.style.maxHeight = 'none';
      container.style.overflow = 'visible';
    }

    const canvas = await html2canvas(el, {
      scale: 3,
      backgroundColor: '#FFFFFF',
      useCORS: true,
      logging: false,
      scrollY: -window.scrollY
    });

    if (container) {
      container.style.maxHeight = oldMaxHeight;
      container.style.overflow = oldOverflow;
    }

    return canvas;
  };

  // PDF Generator using html2canvas -> jsPDF for 100% 1:1 perfect receipt matching
  const handleDownloadPDF = async () => {
    try {
      sound.playBeep(900);
      const canvas = await captureFullReceiptCanvas();
      if (!canvas) return;

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 80; // 80mm roll format
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`struk-${transaction.id}.pdf`);
      sound.playSuccess();
      toast.success('Struk PDF (Utuh 100%) berhasil diunduh!');
    } catch (e) {
      console.error(e);
      sound.playError();
      toast.error('Gagal mengunduh PDF struk');
    }
  };

  // Download High-Res PNG Image of Receipt
  const handleDownloadImagePNG = async () => {
    try {
      sound.playBeep(900);
      const canvas = await captureFullReceiptCanvas();
      if (!canvas) return;

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `struk-${transaction.id}.png`;
      link.click();
      sound.playSuccess();
      toast.success('Gambar Struk PNG (Utuh 100%) berhasil diunduh!');
    } catch (e) {
      console.error(e);
      sound.playError();
      toast.error('Gagal mengunduh gambar struk');
    }
  };

  // WhatsApp Share Handler with Direct Customer Number Targeting & Image Share
  const handleSendWhatsApp = async () => {
    try {
      sound.playBeep(900);
      let rawPhone = transaction.customerPhone;
      if (!rawPhone || rawPhone.trim().length < 4) {
        rawPhone = window.prompt('Masukkan nomor WhatsApp pelanggan (contoh: 081234567890):', '') || '';
      }

      if (!rawPhone || rawPhone.trim().length < 4) {
        sound.playError();
        toast.error('Nomor WhatsApp pelanggan tidak diisi');
        return;
      }

      let targetPhone = rawPhone.trim().replace(/[^0-9]/g, '');
      if (targetPhone.startsWith('0')) targetPhone = '62' + targetPhone.substring(1);

      const canvas = await captureFullReceiptCanvas();
      if (!canvas) return;
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const shopName = settings?.name || 'Classic Barber Go';
        const serviceNames = selectedServices.map(s => `• ${s?.name} (${formatMoney(s?.price || 0)})`).join('\n');
        let text = `✂ *${shopName.toUpperCase()}* ✂\n`;
        text += `*BarberFlow Premium Grooming*\n`;
        text += `----------------------------------------\n`;
        text += `*No. TRX*: ${transaction.id}\n`;
        text += `*Tanggal*: ${transaction.date} ${transaction.time}\n`;
        text += `*Pelanggan*: ${transaction.customerName}\n`;
        text += `*Barber*: ${barberName}\n`;
        text += `----------------------------------------\n`;
        text += `*Detail Layanan*:\n${serviceNames}\n`;
        text += `----------------------------------------\n`;
        text += `*TOTAL AKHIR*: *${formatMoney(transaction.total)}*\n`;
        text += `*Metode Bayar*: ${transaction.paymentMethod}\n`;
        if (transaction.paymentMethod === 'Cash' && transaction.cashReceived !== undefined) {
          text += `*Uang Tunai*: ${formatMoney(transaction.cashReceived)}\n`;
          text += `*Kembalian*: ${formatMoney(transaction.changeReturned || 0)}\n`;
        }
        text += `----------------------------------------\n`;
        text += `_Terima kasih atas kunjungan Anda!_\n`;
        text += `_Classic Barber Go — Premium Grooming Experience_`;

        // 1. Mobile Native Web Share API (Attaches PNG File Directly into WhatsApp App)
        const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Struk ${transaction.id}`,
              text: text
            });
            toast.success('Gambar Struk berhasil dikirim ke WhatsApp!');
            return;
          } catch (e) {
            // User closed native share dialog, fallback to direct web link
          }
        }

        // 2. Desktop Web Browser Fallback (Open direct chat target + Copy Image Blob)
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success(`Membuka WA ${targetPhone}! Gambar struk otomatis di-copy, tekan Ctrl+V di chat.`);
        } catch (e) {
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `struk-${transaction.id}.png`;
          link.click();
          toast.success(`Membuka WA ${targetPhone}! Gambar struk diunduh untuk dilampirkan.`);
        }

        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`, '_blank');
      }, 'image/png');
    } catch (e) {
      console.error(e);
      toast.error('Gagal memproses gambar struk');
    }
  };

  return (
    <div className="receipt-overlay no-print">
      <div className="receipt-modal-box glass-panel">
        <div className="receipt-modal-header">
          <h3>Pratinjau Struk Thermal</h3>
          <button className="receipt-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="receipt-scroll-container">
          {/* Printable Receipt Area */}
          <div className="printable-receipt-card" id="printable-receipt">
            <div className="receipt-header">
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo" className="receipt-logo" />
              ) : (
                <div className="receipt-fallback-logo">✂</div>
              )}
              <h2 className="receipt-shop-name">{settings?.name || 'CLASSIC BARBER GO'}</h2>
              <p className="receipt-shop-info">{settings?.address || 'Jl. Mr. Koesbiyono Tjondrowibowo, Semarang'}</p>
              <p className="receipt-shop-info">{settings?.phone ? `Telp: ${settings.phone}` : 'Telp: 0812-3456-7890'}</p>
            </div>

            <div className="receipt-divider">=== STRUK PEMBAYARAN ===</div>

            <div className="receipt-meta-info">
              <div className="receipt-meta-row">
                <span>No. TRX:</span>
                <span className="font-mono">{transaction.id}</span>
              </div>
              <div className="receipt-meta-row">
                <span>Waktu:</span>
                <span>{transaction.date} {transaction.time}</span>
              </div>
              <div className="receipt-meta-row">
                <span>Pelanggan:</span>
                <span>{transaction.customerName}</span>
              </div>
              <div className="receipt-meta-row">
                <span>Barber:</span>
                <span>{barberName}</span>
              </div>
            </div>

            <div className="receipt-divider">--------------------------------</div>

            <div className="receipt-items-list">
              {selectedServices.map((s, idx) => s && (
                <div className="receipt-item-row" key={idx}>
                  <div className="receipt-item-desc">
                    <span className="item-name">{s.name}</span>
                    <span className="item-dur">({s.duration} mnt)</span>
                  </div>
                  <span className="item-price">{formatMoney(s.price)}</span>
                </div>
              ))}
            </div>

            <div className="receipt-divider">--------------------------------</div>

            <div className="receipt-summary-list">
              <div className="receipt-summary-row">
                <span>Subtotal:</span>
                <span>{formatMoney(transaction.subtotal)}</span>
              </div>
              
              {transaction.discountNominal > 0 && (
                <div className="receipt-summary-row discount-row">
                  <span>Diskon ({transaction.discountPercent}%):</span>
                  <span>-{formatMoney(transaction.discountNominal)}</span>
                </div>
              )}

              <div className="receipt-summary-row">
                <span>Pajak ({transaction.taxPercent}%):</span>
                <span>{formatMoney(transaction.taxNominal)}</span>
              </div>
              
              <div className="receipt-divider dotted">--------------------------------</div>

              <div className="receipt-summary-row total-row" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                <span>TOTAL AKHIR:</span>
                <span>{formatMoney(transaction.total)}</span>
              </div>
              
              <div className="receipt-summary-row payment-method-row" style={{ marginTop: '0.4rem' }}>
                <span>Metode Pembayaran:</span>
                <span className="badge-payment-method" style={{ background: '#000', color: '#FFF', padding: '2px 8px', borderRadius: '4px' }}>{transaction.paymentMethod}</span>
              </div>

              {transaction.paymentMethod === 'Cash' && transaction.cashReceived !== undefined && (
                <>
                  <div className="receipt-summary-row">
                    <span>Uang Tunai:</span>
                    <span>{formatMoney(transaction.cashReceived)}</span>
                  </div>
                  <div className="receipt-summary-row">
                    <span>Kembalian:</span>
                    <span>{formatMoney(transaction.changeReturned || 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="receipt-divider">--------------------------------</div>

            <div className="receipt-footer" style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.78rem' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Terima Kasih Atas Kunjungan Anda!</p>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.72rem', color: '#555' }}>Classic Barber Go — Premium Grooming</p>

              {/* Barcode Mock Visual */}
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  width: '80%',
                  height: '35px',
                  background: 'repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px)',
                  margin: '0 auto'
                }}></div>
                <span style={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>*{transaction.id}*</span>
              </div>
            </div>
          </div>
        </div>

        <div className="receipt-modal-footer" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button 
            className="btn" 
            onClick={handleSendWhatsApp}
            style={{ backgroundColor: '#25D366', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
          >
            <MessageSquare size={16} />
            <span>Struk WA (File/Gambar)</span>
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadImagePNG}>
            <Download size={16} />
            <span>Gambar PNG</span>
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadPDF}>
            <Download size={16} />
            <span>Unduh PDF</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
};
