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

  // WhatsApp Share Handler with Web Share API File Attachment
  const handleSendWhatsApp = async () => {
    const el = document.getElementById('printable-receipt');
    if (!el) return;

    try {
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#FFFFFF' });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `struk-${transaction.id}.png`, { type: 'image/png' });
        
        let rawPhone = transaction.customerPhone || window.prompt('Masukkan nomor WhatsApp pelanggan (contoh: 081234567890):', '');
        let targetPhone = '';
        if (rawPhone && rawPhone.trim().length >= 4) {
          targetPhone = rawPhone.trim().replace(/[^0-9]/g, '');
          if (targetPhone.startsWith('0')) targetPhone = '62' + targetPhone.substring(1);
        }

        // Try Web Share API (Mobile / Native WhatsApp App File Share)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Struk ${transaction.id}`,
              text: `Struk Belanja ${settings?.name || 'Classic Barber Go'}`
            });
            toast.success('Struk berhasil dikirim!');
            return;
          } catch (e) {
            // User cancelled share or fallback
          }
        }

        // Fallback: Copy Image Blob to Clipboard & Download PNG file
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success('Gambar Struk disalin ke Clipboard! Tekan Ctrl+V di WA.');
        } catch (e) {
          // Download link fallback
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `struk-${transaction.id}.png`;
          link.click();
          toast.success('Gambar Struk PNG diunduh! Silakan lampirkan di WA.');
        }

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
        text += `----------------------------------------\n`;
        text += `_Lampirkan gambar struk yang sudah di-copy/download._\n`;
        text += `_Terima kasih atas kunjungan Anda!_`;

        const encodedText = encodeURIComponent(text);
        if (targetPhone) {
          window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`, '_blank');
        } else {
          window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
        }
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
