import { useState } from 'preact/hooks';
import { useCarbonStore, type CarbonEvent } from '../store/carbonStore';
import { parseFinancialCSV } from '../utils/csvParser';


export function FinancialParser() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewEvents, setPreviewEvents] = useState<CarbonEvent[]>([]);
  const addEvent = useCarbonStore((state) => state.addEvent);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setError(null);
    setPreviewEvents([]);
    
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported.');
      return;
    }

    try {
      const text = await file.text();
      const events = parseFinancialCSV(text);
      if (events.length === 0) {
        setError('No valid transaction rows found in the CSV.');
      } else {
        setPreviewEvents(events);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file.');
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      await processFile(target.files[0]);
    }
  };

  const handleImport = () => {
    previewEvents.forEach((evt) => {
      addEvent(evt);
    });
    setPreviewEvents([]);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              💳
            </span>
            Financial Statement Auditor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Perform spend-based carbon auditing from local bank statement CSV files.
          </p>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-indigo-400 bg-indigo-950/10'
            : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
        }`}
      >
        <input
          type="file"
          id="csv-upload-input"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor="csv-upload-input"
          className="cursor-pointer flex flex-col items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-400 text-lg shadow-inner">
            📥
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">
              Drag & drop CSV or <span className="text-indigo-400 underline hover:text-indigo-300">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Must include headers: <code className="text-slate-400 bg-slate-900 px-1 py-0.5 rounded">date</code>, <code className="text-slate-400 bg-slate-900 px-1 py-0.5 rounded">description</code>, <code className="text-slate-400 bg-slate-900 px-1 py-0.5 rounded">amount</code>
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {previewEvents.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Preview Ingestion ({previewEvents.length} items)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewEvents([])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent transition-all"
              >
                Clear
              </button>
              <button
                onClick={handleImport}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-900 bg-emerald-400 hover:bg-emerald-350 shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
              >
                Commit to Ledger
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border border-slate-800/80 rounded-xl bg-slate-950/40 divide-y divide-slate-900">
            {previewEvents.map((event) => (
              <div key={event.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/30 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-200 truncate max-w-[180px]">
                    {event.description}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {new Date(event.timestamp).toLocaleDateString()} • {event.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-slate-400">${event.rawQuantity.toFixed(2)}</span>
                  </div>
                  <div className="w-20">
                    <span className="font-semibold text-rose-400">
                      +{event.totalCo2e.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
