import { Check, Clock3 } from "lucide-react";
import { formatCoaDate } from "../../lib/coaModel.js";

export default function CoaBatchHistory({ records, selectedId, onSelect }) {
  if (!Array.isArray(records) || records.length < 2) return null;

  return (
    <section className="coa-history" aria-labelledby={`coa-history-${selectedId}`}>
      <div className="coa-history__heading">
        <div>
          <span>Batch history</span>
          <strong id={`coa-history-${selectedId}`}>Trace this product</strong>
        </div>
        <span>{records.length} records</span>
      </div>

      <div className="coa-history__list">
        {records.map((record) => {
          const selected = record.id === selectedId;
          return (
            <button
              key={record.id}
              type="button"
              className="coa-history__item"
              aria-pressed={selected}
              onClick={() => onSelect(record.id)}
            >
              <span className="coa-history__marker" aria-hidden="true">
                {selected ? <Check size={13} /> : <Clock3 size={13} />}
              </span>
              <span className="coa-history__identity">
                <strong>{record.batch || "Batch not reported"}</strong>
                <span>{formatCoaDate(record.testingDate)}</span>
              </span>
              <span className="coa-history__result">
                <strong>{record.purity || "—"}</strong>
                <span>
                  {record.isCurrentShippingLot ? "Current lot" : "Previous lot"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
