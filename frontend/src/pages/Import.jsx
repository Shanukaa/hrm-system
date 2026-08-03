import { useRef, useState } from "react";
import Topbar from "../components/Topbar.jsx";
import { importFile } from "../api/client.js";

export default function Import() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const pickFile = (f) => {
    setResult(null);
    setError("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await importFile(file, (evt) => {
        setProgress(Math.round((evt.loaded * 100) / (evt.total || 1)));
      });
      setResult(res);
    } catch (err) {
      setError(err?.response?.data?.error || "Import failed. Check the file format and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Topbar title="Import Data" subtitle="Bulk-load employees from a CSV or Excel file into the Google Sheet" />

      <div className="p-8 max-w-3xl space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg py-14 text-center cursor-pointer transition-colors ${
            dragOver ? "border-accent bg-accentSoft/50" : "border-line bg-surface hover:border-accent/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
          <p className="font-display text-lg text-ink">
            {file ? file.name : "Drop a .csv or .xlsx file here"}
          </p>
          <p className="text-sm text-muted mt-1">or click to browse</p>
        </div>

        {file && (
          <div className="flex items-center justify-between bg-surface border border-line rounded-lg px-5 py-4">
            <div>
              <p className="text-sm font-medium text-ink">{file.name}</p>
              <p className="text-xs text-muted mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="text-sm font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {uploading ? `Uploading… ${progress}%` : "Import"}
            </button>
          </div>
        )}

        {error && (
          <div className="border border-alert/40 bg-alertSoft text-alert text-sm rounded-md px-4 py-3">{error}</div>
        )}

        {result && (
          <div className="border border-accent/30 bg-accentSoft/60 rounded-lg px-5 py-4 space-y-2">
            <p className="text-sm font-medium text-ink">Import complete</p>
            <p className="text-sm text-ink/80">
              {result.created} new employee(s) added, {result.updated} existing employee(s) updated out of{" "}
              {result.totalRows} row(s) read.
            </p>
            {result.skipped?.length > 0 && (
              <div className="text-xs text-alert mt-2">
                {result.skipped.length} row(s) skipped (missing EMP NO or Employee Name):
                <ul className="list-disc list-inside mt-1">
                  {result.skipped.map((s) => (
                    <li key={s.row}>Row {s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-surface border border-line rounded-lg px-5 py-4">
          <p className="text-sm font-medium text-ink mb-2">File format</p>
          <p className="text-sm text-muted leading-relaxed">
            The first row should be column headers matching the payroll table (EMP NO, Employee Name,
            Basic Salary, Operational Allowance, Attendance Allowance, Target Allowance, Nopay Amount,
            OT Pay, Apit, Deductions, etc.). Calculated fields like Adjusted Basic, Gross Salary, EPF, ETF
            and Net Salary are re-computed automatically on import, so you don't need to include them.
            Rows are matched to existing employees by EMP NO — matching rows update the existing record,
            new EMP NOs are added as new rows.
          </p>
        </div>
      </div>
    </>
  );
}
