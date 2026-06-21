import { useState } from 'preact/hooks';
import { useCarbonStore, type CarbonEvent } from '../store/carbonStore';
import { parseSemanticMonth } from '../data/parser';
import { TRANSPORT_EMISSION_FACTORS } from '../constants/carbonEmissions';

/**
 * TakeoutParser Component
 * Handles the ingestion of Google Takeout location semantic history logs.
 * Parses activity segments (driving, transit, flights) client-side.
 */
export function TakeoutParser() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewEvents, setPreviewEvents] = useState<CarbonEvent[]>([]);
  const addEvent = useCarbonStore((state) => state.addEvent);

  /**
   * Toggles drag states.
   * 
   * @param {DragEvent} e - Drag event.
   */
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /**
   * Formats the activity segment string for display.
   * 
   * @param {string} type - Segment type (e.g., IN_PASSENGER_VEHICLE).
   * @returns {string} Clean formatted text (e.g., PASSENGER VEHICLE).
   */
  const formatActivityType = (type: string) => {
    return type.replace(/^IN_/, '').replace(/_/g, ' ');
  };

  /**
   * Processes the JSON location history file and creates carbon events.
   * 
   * @param {File} file - Semantic history JSON file.
   */
  const processFile = async (file: File) => {
    setError(null);
    setPreviewEvents([]);

    if (!file.name.endsWith('.json')) {
      setError('Only JSON files are supported.');
      return;
    }

    try {
      const text = await file.text();
      if (!text.includes('timelineObjects')) {
        setError('Invalid file format. Please ensure this is the Google Takeout "Semantic Location History" JSON file, not raw "Records.json".');
        return;
      }

      const receipts = parseSemanticMonth(text);
      if (receipts.length === 0) {
        setError('No valid travel activity segments found in the location history file.');
        return;
      }

      const mappedEvents: CarbonEvent[] = receipts.map((receipt) => {
        const distanceKm = receipt.distanceMeters / 1000;
        const intensity = TRANSPORT_EMISSION_FACTORS[receipt.type] || TRANSPORT_EMISSION_FACTORS["UNKNOWN"];
        
        return {
          id: crypto.randomUUID(),
          timestamp: Date.parse(receipt.timestamp) || Date.now(),
          source: 'travel',
          category: 'Transport',
          description: `Travel: ${formatActivityType(receipt.type)}`,
          rawQuantity: distanceKm,
          rawUnit: 'km',
          co2eIntensity: intensity,
          totalCo2e: receipt.emissionsKg,
          metadata: {
            confidenceScore: 0.9,
            apiRoute: 'takeout-parser'
          }
        };
      });

      setPreviewEvents(mappedEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to parse Google Takeout file.');
    }
  };

  /**
   * Handles dropping location files on the drag area.
   */
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  /**
   * Handles selecting files through the file picker.
   */
  const handleChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      await processFile(target.files[0]);
    }
  };

  /**
   * Commits the parsed location trip events to the ledger.
   */
  const handleImport = () => {
    previewEvents.forEach((evt) => {
      addEvent(evt);
    });
    setPreviewEvents([]);
  };

  return (
    <section aria-label="Google Takeout location history auditor">
      <div className="bg-surface-elevated border border-border-subtle rounded-xl p-6 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2 font-bold">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary-fixed-dim" aria-hidden="true">
              <span className="material-symbols-outlined text-[20px]">explore</span>
            </span>
            Google Takeout Location Auditor
          </h2>
          <p id="takeout-format-hint" className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Audit your travel footprint by importing Google Takeout Semantic Location History JSON.
          </p>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            document.getElementById('takeout-upload-input')?.click();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label="Upload Google Takeout location semantic monthly history in JSON format"
        aria-describedby="takeout-format-hint takeout-file-hint"
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant bg-surface-container/20 hover:border-primary-fixed-dim'
        }`}
      >
        <input
          type="file"
          id="takeout-upload-input"
          accept=".json"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor="takeout-upload-input"
          className="cursor-pointer flex flex-col items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-border-subtle text-primary-fixed-dim text-lg shadow-inner" aria-hidden="true">
            <span className="material-symbols-outlined">map</span>
          </div>
          <div>
            <p className="font-label-md text-label-md font-semibold text-on-surface">
              Drag & drop Semantic JSON or <span className="text-primary underline hover:text-primary-fixed-dim">browse</span>
            </p>
            <p id="takeout-file-hint" className="font-label-sm text-[10px] text-on-surface-variant mt-1">
              Select your monthly Location History JSON (e.g. 2026_JANUARY.json)
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-error-container/10 border border-error/20 rounded-xl text-error-fixed-dim text-xs flex items-center gap-2" role="alert">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span> {error}
        </div>
      )}

      {previewEvents.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 
              className="font-label-sm text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant"
              aria-live="polite"
              aria-atomic="true"
            >
              Preview Ingestion (<span aria-label={`${previewEvents.length} trips ready to import`}>{previewEvents.length} trips</span>)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewEvents([])}
                className="px-3 py-1.5 rounded text-xs font-medium text-on-surface-variant hover:text-primary bg-transparent border border-transparent transition-all cursor-pointer"
                aria-label="Cancel carbon ledger import"
              >
                Clear
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-1.5 rounded text-xs font-bold text-surface-base bg-primary hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                aria-label="Commit parsed trips to ledger"
              >
                Commit to Ledger
              </button>
            </div>
          </div>

          <div 
            role="list"
            aria-label="Parsed trips preview"
            className="max-h-48 overflow-y-auto border border-border-subtle rounded-xl bg-surface-container/20 divide-y divide-border-subtle custom-scrollbar"
          >
            {previewEvents.map((event) => (
              <div 
                key={event.id} 
                role="listitem"
                className="p-3 flex items-center justify-between text-xs hover:bg-surface-container/30 transition-colors font-mono-jet"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-on-surface">
                    {event.description}
                  </span>
                  <span className="text-on-surface-variant text-[10px]">
                    {new Date(event.timestamp).toLocaleDateString()} • {event.rawQuantity.toFixed(2)} km
                  </span>
                </div>
                <div className="flex items-center gap-4 text-right">
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
    </section>
  );
}
