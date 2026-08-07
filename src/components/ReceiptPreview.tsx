import React, { useMemo } from 'react';
import { db, useLiveQuery } from '../database/db';
import type { Transaction } from '../types';
import html2canvas from 'html2canvas';
import { Printer, Download, X, MessageSquare } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import './ReceiptPreview.css';

interface ReceiptPreviewProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ transaction, onClose }) => {
  const settings = useLiveQuery(() => db.settings.where('key').equals('app_settings').first());
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
    window.print();
  };

  // PDF Generator using jsPDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150] // POS Roll 80mm format
    });

    const shopName = settings?.name || 'BarberFlow';
    const address = settings?.address || '';
    const phone = settings?.phone || '';
    const footer = settings?.receiptFooter || '';

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    
    let y = 10;
    doc.text(shopName, 40, y, { align: 'center' });
    doc.setFontSize(8);
    
    if (address) {
      y += 5;
      const addrLines = doc.splitTextToSize(address, 70);
      addrLines.forEach((line: string) => {
        doc.text(line, 40, y, { align: 'center' });
        y += 4;
      });
    }
    
    if (phone) {
      doc.text(`Telp: ${phone}`, 40, y, { align: 'center' });
      y += 5;
    }

    doc.text('--------------------------------', 40, y, { align: 'center' });
    y += 5;

    doc.text(`No. TRX : ${transaction.id}`, 5, y);
    y += 4;
    doc.text(`Tanggal : ${transaction.date} ${transaction.time}`, 5, y);
    y += 4;
    doc.text(`Pelang. : ${transaction.customerName}`, 5, y);
    y += 4;
    doc.text(`Barber  : ${barberName}`, 5, y);
    y += 5;
    doc.text('--------------------------------', 40, y, { align: 'center' });
    y += 5;

    selectedServices.forEach((s: any) => {
      if (s) {
        doc.text(s.name.substring(0, 18), 5, y);
        doc.text(s.price.toLocaleString('id-ID'), 75, y, { align: 'right' });
        y += 4;
      }
    });

    doc.text('--------------------------------', 40, y, { align: 'center' });
    y += 5;

    doc.setFont('courier', 'bold');
    doc.text('TOTAL:', 5, y);
    doc.text(`${currency} ${transaction.total.toLocaleString('id-ID')}`, 75, y, { align: 'right' });
    doc.setFont('courier', 'normal');
    y += 5;

    doc.text(`Bayar   : ${transaction.paymentMethod}`, 5, y);
    y += 4;

    if (transaction.paymentMethod === 'Cash' && transaction.cashReceived !== undefined) {
      doc.text(`Tunai   : ${transaction.cashReceived.toLocaleString('id-ID')}`, 5, y);
      y += 4;
      doc.text(`Kembali : ${(transaction.changeReturned || 0).toLocaleString('id-ID')}`, 5, y);
      y += 4;
    }

    y += 2;
    doc.text('--------------------------------', 40, y, { align: 'center' });
    y += 6;

    if (footer) {
      const footerLines = doc.splitTextToSize(footer, 70);
      footerLines.forEach((line: string) => {
        doc.text(line, 40, y, { align: 'center' });
        y += 4;
      });
    }

    doc.save(`receipt-${transaction.id}.pdf`);
  };

  // Download High-Res PNG Image of Receipt
  const handleDownloadImagePNG = async () => {
    const el = document.getElementById('printable-receipt');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#FFFFFF' });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `struk-${transaction.id}.png`;
      link.click();
      toast.success('Gambar Struk (PNG) berhasil diunduh!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengunduh gambar struk');
    }
  };

  // WhatsApp Share Handler
  const handleSendWhatsApp = async () => {
    // Automatically trigger PNG download so cashier can attach image
    await handleDownloadImagePNG();

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
    text += `_Gambar Struk (PNG) sudah otomatis diunduh untuk dilampirkan._\n`;
    text += `_Terima kasih atas kunjungan Anda!_\n`;
    text += `_Classic Barber Go — Premium Grooming Experience_`;

    const encodedText = encodeURIComponent(text);
    
    let rawPhone = transaction.customerPhone || window.prompt('Masukkan nomor WhatsApp pelanggan (contoh: 081234567890):', '');
    
    if (rawPhone && rawPhone.trim().length >= 4) {
      let phone = rawPhone.trim().replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
  };

  return (
    <div className="receipt-overlay no-print">
      <div className="receipt-modal-box glass-panel">
        <div className="receipt-modal-header">
          <h3>Pratinjau Struk</h3>
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
              <h2 className="receipt-shop-name">{settings?.name || 'BarberFlow'}</h2>
              <p className="receipt-shop-info">{settings?.address}</p>
              <p className="receipt-shop-info">{settings?.phone ? `Telp: ${settings.phone}` : ''}</p>
            </div>

            <div className="receipt-divider"></div>

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

            <div className="receipt-divider"></div>

            <div className="receipt-items-list">
              {selectedServices.map((s, idx) => s && (
                <div className="receipt-item-row" key={idx}>
                  <div className="receipt-item-desc">
                    <span className="item-name">{s.name}</span>
                    <span className="item-dur">{s.duration}m</span>
                  </div>
                  <span className="item-price">{formatMoney(s.price)}</span>
                </div>
              ))}
            </div>

            <div className="receipt-divider"></div>

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
              
              <div className="receipt-divider dotted"></div>

              <div className="receipt-summary-row total-row">
                <span>TOTAL:</span>
                <span>{formatMoney(transaction.total)}</span>
              </div>
              
              <div className="receipt-summary-row payment-method-row">
                <span>Metode Pembayaran:</span>
                <span className="badge-payment-method">{transaction.paymentMethod}</span>
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

            <div className="receipt-divider"></div>

            <div className="receipt-footer">
              {settings?.receiptFooter.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
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
            <span>Struk WA</span>
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
