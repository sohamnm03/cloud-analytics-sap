import { useEffect, useState } from 'react';
// import fsLogo from '../../images/FSlogo.png';
import logo from '../../images/logo.png';

type DashboardHeaderProps = {
  activePage: string;
  onPageChange: (page: string) => void;
};

declare global {
  interface Window {
    closeFtrModal?: (event?: Event) => void;
    openFtrEdit?: () => void;
    toggleDark?: () => void;
    exportPDF?: () => void;
  }
}

export function LoadingScreen() {
  return (
    <div id="loadingScreen">
      <div className="load-logo">⬡ COF ANALYTICS</div>
      <div className="load-bar">
        <div className="load-fill" />
      </div>
      <div className="load-sub">Fetching &amp; Processing Fund Data...</div>
    </div>
  );
}

export function ExportOverlay() {
  return (
    <div id="exportOverlay">
      <div className="exp-spinner" />
      <div className="exp-text" id="expText">
        Preparing print view...
      </div>
    </div>
  );
}

export function FtrEditModal() {
  return (
    <div
      className="ftr-modal-overlay"
      id="ftrModalOverlay"
      onClick={(event) => window.closeFtrModal?.(event.nativeEvent)}
    >
      <div className="ftr-modal" id="ftrModal">
        <div className="ftr-modal-header">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(255,255,255,.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
              <path d="M14 2v6h6" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <div>
            <div className="ftr-modal-title">Open in FTR_EDIT</div>
            <div className="ftr-modal-subtitle">TREASURY · TRANSACTION EDITOR · SAP</div>
          </div>
        </div>
        <div className="ftr-modal-body">
          <div className="ftr-modal-txnno" id="ftrTxnNo">
            —
          </div>
          <div className="ftr-modal-desc" id="ftrTxnDesc">
            Loading...
          </div>
          <div className="ftr-modal-info" id="ftrTxnInfo" />
          <div className="ftr-modal-actions">
            <button className="ftr-modal-btn primary" onClick={() => window.openFtrEdit?.()}>
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open FTR_EDIT in SAP
            </button>
            <button className="ftr-modal-btn secondary" onClick={() => window.closeFtrModal?.()}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartTooltip() {
  return (
    <div id="chart-tooltip">
      <div className="tt-inner">
        <div className="tt-header">
          <div className="tt-title" id="ttTitle">
            —
          </div>
        </div>
        <div className="tt-body" id="ttBody" />
      </div>
    </div>
  );
}

export function DashboardHeader({ activePage, onPageChange }: DashboardHeaderProps) {
  const [timeLabel, setTimeLabel] = useState('');
  const [theme, setTheme] = useState(() => window.localStorage.getItem('cof-theme') || 'light');

  useEffect(() => {
    const updateTimeLabel = () => {
      setTimeLabel(
        new Date().toLocaleString([], {
          hour: '2-digit',
          minute: "2-digit",
          second: "2-digit",
          hour12: true,

        }),
      );
    };

    updateTimeLabel();
  const intervalId = window.setInterval(updateTimeLabel, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('cof-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    if (window.toggleDark) {
      window.toggleDark();
      setTheme(document.documentElement.getAttribute('data-theme') || 'light');
      return;
    }
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header>
      <div className="logo">
        <div className="logo-icon">
          <img
            src={logo}
            alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <div>
          <div className="logo">NEXUS CREDIT </div>
          <div className="logo-sub"> Loan Portfolio Analytics — Global Credit Co · SAP S/4HANA
            <span
              style={{
                background: "var(--blue-dark)",
                color: "#fff",
                fontSize: "0.55rem",
                padding: "2px 7px",
                borderRadius: "20px",
                letterSpacing: "0.08em",
                verticalAlign: "middle",
              }}
            >v6.0</span>          </div>
        </div>
      </div>
      <nav className="header-nav">
        <button data-page="overview" className={`nav-btn ${activePage === 'overview' ? 'active' : ''}`} onClick={() => onPageChange('overview')}>
          Overview
        </button>
        <button data-page="portfolio" className={`nav-btn ${activePage === 'portfolio' ? 'active' : ''}`} onClick={() => onPageChange('portfolio')}>
          Portfolio
        </button>
        <button data-page="borrower" className={`nav-btn ${activePage === 'borrower' ? 'active' : ''}`} onClick={() => onPageChange('borrower')}>
          Borrowers
        </button>
        <button data-page="maturity" className={`nav-btn ${activePage === 'maturity' ? 'active' : ''}`} onClick={() => onPageChange('maturity')}>
          Maturity
        </button>
        <button data-page="transactions" className={`nav-btn ${activePage === 'transactions' ? 'active' : ''}`} onClick={() => onPageChange('transactions')}>
          Transactions
        </button>
      </nav>
      <div className="header-right">
        <div className="live-badge">LIVE</div>
        <div className="time-pill" id="timePill">
          {timeLabel || '—'}
        </div>
        <button className="pdf-btn" id="pdfBtn" onClick={() => window.exportPDF?.() ?? window.print()}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
          Export PDF
        </button>
        <button className="dark-toggle" onClick={toggleTheme} title="Toggle dark mode">
          <svg viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
