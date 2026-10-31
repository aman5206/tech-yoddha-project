"use client";
import { useApp } from "../../lib/store";
import { Panel } from "../../lib/ui";

export default function SettingsPage() {
  const { settings, setSettings, models } = useApp();
  return (
    <>
      <h1>Settings</h1>
      <Panel title="Preferences (saved in this browser)">
        <div className="form">
          <label>Default model <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
            <option value="">Best by validation RMSE</option>{models.data?.available_models.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></label>
          <label>Prediction interval <select value={settings.step} onChange={(e) => setSettings({ ...settings, step: Number(e.target.value) })}>
            {[1, 5, 10, 20].map((s) => <option key={s} value={s}>{s} cycles</option>)}</select></label>
          <label><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => setSettings({ ...settings, reducedMotion: e.target.checked })} /> Reduce motion (stop engine rotation)</label>
          <label><input type="checkbox" checked={settings.compact} onChange={(e) => setSettings({ ...settings, compact: e.target.checked })} /> Compact density</label>
        </div>
      </Panel>
      <Panel title="Profile"><p>Demo operator, reliability engineer. Sign-in is not part of this prototype.</p></Panel>
    </>
  );
}
