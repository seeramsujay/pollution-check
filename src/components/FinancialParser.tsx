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
    <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2 font-bold">
            <span className="p-1.5 rounded-lg bg-secondary-container/10 text-secondary-fixed-dim">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </span>
            Financial Statement Auditor
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
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
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant bg-surface-container/20 hover:border-primary-fixed-dim'
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
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-border-subtle text-primary-fixed-dim text-lg shadow-inner">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div>
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              Drag & drop CSV or <span className="text-primary underline hover:text-primary-fixed-dim">browse</span>
            </p>
            <p className="font-label-sm text-[10px] text-on-surface-variant mt-1">
              Must include headers: <code className="text-primary bg-surface-container-highest px-1 py-0.5 rounded">date</code>, <code className="text-primary bg-surface-container-highest px-1 py-0.5 rounded">description</code>, <code className="text-primary bg-surface-container-highest px-1 py-0.5 rounded">amount</code>
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-error-container/10 border border-error/20 rounded-xl text-error-fixed-dim text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">warning</span> {error}
        </div>
      )}

      {previewEvents.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Preview Ingestion ({previewEvents.length} items)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewEvents([])}
                className="px-3 py-1.5 rounded text-xs font-medium text-on-surface-variant hover:text-primary bg-transparent border border-transparent transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-1.5 rounded text-xs font-bold text-surface-base bg-primary hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                Commit to Ledger
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border border-border-subtle rounded-xl bg-surface-container/20 divide-y divide-border-subtle custom-scrollbar">
            {previewEvents.map((event) => (
              <div key={event.id} className="p-3 flex items-center justify-between text-xs hover:bg-surface-container/30 transition-colors font-mono-jet">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-on-surface truncate max-w-[200px]">
                    {event.description}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">
                    {new Date(event.timestamp).toLocaleDateString()} • {event.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-on-surface-variant">${event.rawQuantity.toFixed(2)}</span>
                  </div>
                  <div className="w-20">
                    <span className="font-bold text-error-flash">
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
