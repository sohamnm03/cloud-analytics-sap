import { useEffect, useMemo, useState } from "react";

type Props = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

const Header = ({ theme, onToggleTheme }: Props) => {
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timeLabel = useMemo(
    () =>
      clock.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [clock]
  );

  return (
    <header className="app-header">
      <div className="logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M2 10h20v2H2zm0 4h20v2H2zM12 2L2 7h20L12 2zm0 16l-8 4h16l-8-4z" />
          </svg>
        </div>

        <div className="logo-text">
          <div className="logo-title">COF Nexus</div>
          <div className="logo-sub">
            ECB Loan Management · SAP S/4HANA
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="live-badge">SAP Connected</div>
        <div className="time-pill">{timeLabel}</div>

        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </div>
    </header>
  );
};

export default Header;