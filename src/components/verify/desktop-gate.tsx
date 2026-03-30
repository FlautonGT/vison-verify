"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function DesktopGate({
  brandName,
  logoUrl,
  logoMonogram,
}: {
  brandName: string;
  logoUrl?: string;
  logoMonogram: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;

    async function generate() {
      try {
        const url = window.location.href;
        const next = await QRCode.toDataURL(url, {
          width: 240,
          margin: 1,
          color: {
            dark: "#111827",
            light: "#FFFFFF",
          },
        });
        if (active) {
          setQrDataUrl(next);
        }
      } catch {
        if (active) {
          setQrDataUrl("");
        }
      }
    }

    void generate();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="desktop-gate-shell">
      <section className="desktop-gate-card">
        <div className="desktop-gate-brand">
          {logoUrl ? (
            <img alt={brandName} className="brand-logo-image" src={logoUrl} />
          ) : (
            <div className="brand-logo-fallback">{logoMonogram}</div>
          )}
          <div>
            <strong>{brandName}</strong>
            <span>Verifikasi hanya dapat dilanjutkan dari perangkat mobile</span>
          </div>
        </div>

        <div className="desktop-gate-copy">
          <h1>Lanjutkan dari HP Anda</h1>
          <p>Scan QR code ini menggunakan ponsel agar kamera KTP dan selfie liveness dapat berjalan dengan benar.</p>
        </div>

        <div className="desktop-gate-qr">
          {qrDataUrl ? <img alt="QR code verification link" className="desktop-gate-qr__image" src={qrDataUrl} /> : null}
        </div>

        <p className="desktop-gate-caption">Jika QR tidak terbaca, buka link verifikasi yang sama langsung dari browser HP Anda.</p>
      </section>
    </main>
  );
}
