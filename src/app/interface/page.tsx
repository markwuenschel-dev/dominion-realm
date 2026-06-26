import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import '@/styles/interface.css';
import { marcusSheet as sheet } from '@/data/marcus-sheet';
import { InterfaceClient } from '@/components/InterfaceClient';

export const metadata: Metadata = {
  title: { absolute: "The Interface — Marcus's Character Sheet" },
  description:
    "Marcus's stats, skills, and inventory, as his ocular implant renders the Realm into RPG logic.",
  openGraph: { title: 'The Interface' },
};

const pct = (s: { value: number; max: number }) => Math.round((s.value / s.max) * 100);

export default function InterfacePage() {
  return (
    <>
      <div className="grain" />
      <div className="vignette" />

      <div className="iface">
        <header className="iface-top">
          <Link className="iface-top__home" href="/">
            ← The Dominion <em>Realm</em>
          </Link>
          <nav className="iface-top__nav">
            <Link href="/codex/characters/marcus">Marcus in the Codex</Link>
            <Link href="/eyes">The Eyes</Link>
          </nav>
        </header>

        <main className="iface-wrap">
          {sheet.provisional && (
            <p className="iface-provisional">
              Provisional readout — placeholder mechanics, pending the manuscript&apos;s true
              numbers.
            </p>
          )}

          <section className="sheet">
            <div className="sheet-frame" />

            <div className="sheet-head">
              <div className="sheet-id">
                <span className="sheet-kicker">{sheet.archetype}</span>
                <h1 className="sheet-name">
                  {sheet.name}
                  {sheet.handle && <em> · {sheet.handle}</em>}
                </h1>
                <p className="sheet-title">{sheet.title}</p>
              </div>
              <div className="sheet-level">
                <span className="sheet-level__label">Level</span>
                <span className="sheet-level__num">{sheet.level}</span>
              </div>
            </div>

            <p className="sheet-readout">{sheet.readout}</p>

            <div className="sheet-tabs" role="tablist" aria-label="Character sheet sections">
              <button
                id="tab-stats"
                className="sheet-tab is-active"
                type="button"
                role="tab"
                aria-selected="true"
                aria-controls="panel-stats"
                data-tab="stats"
              >
                Stats
              </button>
              <button
                id="tab-skills"
                className="sheet-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-skills"
                tabIndex={-1}
                data-tab="skills"
              >
                Skills
              </button>
              <button
                id="tab-inventory"
                className="sheet-tab"
                type="button"
                role="tab"
                aria-selected="false"
                aria-controls="panel-inventory"
                tabIndex={-1}
                data-tab="inventory"
              >
                Inventory
              </button>
            </div>

            <div
              id="panel-stats"
              className="sheet-panel is-active"
              role="tabpanel"
              aria-labelledby="tab-stats"
              tabIndex={0}
              data-panel="stats"
            >
              <ul className="stat-list">
                {sheet.stats.map((s) => (
                  <li className="stat" key={s.label}>
                    <div className="stat-row">
                      <span className="stat-label">{s.label}</span>
                      <span className="stat-val">
                        {s.value}
                        <span>/{s.max}</span>
                      </span>
                    </div>
                    <div className="stat-bar">
                      <span
                        className="stat-bar__fill"
                        style={{ ['--pct']: `${pct(s)}%` } as CSSProperties}
                      />
                    </div>
                    {s.note && <p className="stat-note">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </div>

            <div
              id="panel-skills"
              className="sheet-panel"
              role="tabpanel"
              aria-labelledby="tab-skills"
              tabIndex={0}
              data-panel="skills"
            >
              <ul className="skill-list">
                {sheet.skills.map((sk) => (
                  <li className="skill" key={sk.name}>
                    <div className="skill-head">
                      <h3 className="skill-name">{sk.name}</h3>
                      <span className="skill-tier">{sk.tier}</span>
                    </div>
                    <p className="skill-desc">{sk.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div
              id="panel-inventory"
              className="sheet-panel"
              role="tabpanel"
              aria-labelledby="tab-inventory"
              tabIndex={0}
              data-panel="inventory"
            >
              <ul className="inv-grid">
                {sheet.inventory.map((it) => (
                  <li className="inv-item" key={it.name}>
                    <span className="inv-kind">{it.kind}</span>
                    <h3 className="inv-name">{it.name}</h3>
                    {it.note && <p className="inv-note">{it.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Link className="iface-back" href="/codex/characters/marcus">
            ← Read Marcus&apos;s full file
          </Link>
        </main>
      </div>

      <InterfaceClient />
    </>
  );
}
