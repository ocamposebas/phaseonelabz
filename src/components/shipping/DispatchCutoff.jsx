import "./DispatchCutoff.styles.css";
import { useEffect, useState } from "react";
import { Clock3, PackageCheck, Truck } from "lucide-react";
import { getDispatchCutoffState, padDispatchTime } from "./dispatchCutoffTime";

function TimeUnit({ value, label }) {
  return (
    <span className="dispatch-notice__unit">
      <b>{value}</b>
      <small>{label}</small>
    </span>
  );
}

export default function DispatchCutoff({ variant = "product" }) {
  const [dispatch, setDispatch] = useState(null);

  useEffect(() => {
    const refresh = () => setDispatch(getDispatchCutoffState(new Date()));
    let timer = 0;

    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      stop();
      refresh();

      if (!document.hidden) {
        timer = window.setInterval(refresh, 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isClosed = dispatch?.beforeCutoff === false;
  const hours = padDispatchTime(dispatch?.hours || 0);
  const minutes = padDispatchTime(dispatch?.minutes || 0);
  const seconds = padDispatchTime(dispatch?.seconds || 0);

  return (
    <section
      className={`dispatch-notice dispatch-notice--${variant} ${
        isClosed ? "is-closed" : "is-open"
      }`}
      aria-label="Daily order processing window"
      aria-live={isClosed ? "polite" : "off"}
    >
      <div className="dispatch-notice__accent" aria-hidden="true" />

      <div className="dispatch-notice__icon" aria-hidden="true">
        {isClosed ? <PackageCheck size={21} /> : <Truck size={21} />}
      </div>

      <div className="dispatch-notice__copy">
        <span className="dispatch-notice__kicker">
          <i />
          {isClosed ? "Next processing day" : "Processing window open"}
        </span>

        {dispatch ? (
          isClosed ? (
            <>
              <strong>Today’s 4:00 PM MT cutoff has passed</strong>
              <p>
                Orders placed now enter the processing queue for {dispatch.nextProcessingDate}.
              </p>
            </>
          ) : (
            <>
              <strong>Order before 4:00 PM Mountain Time</strong>
              <p>Complete checkout within the remaining time for processing today.</p>
            </>
          )
        ) : (
          <>
            <strong>Checking today’s processing window</strong>
            <p>Daily cutoff · 4:00 PM Mountain Time</p>
          </>
        )}
      </div>

      {dispatch?.beforeCutoff ? (
        <div
          className="dispatch-notice__timer"
          aria-label={`${hours} hours, ${minutes} minutes and ${seconds} seconds remaining`}
        >
          <TimeUnit value={hours} label="Hrs" />
          <i>:</i>
          <TimeUnit value={minutes} label="Min" />
          <i>:</i>
          <TimeUnit value={seconds} label="Sec" />
        </div>
      ) : (
        <div className="dispatch-notice__cutoff">
          <Clock3 size={14} />
          <span>4:00 PM</span>
          <small>MT</small>
        </div>
      )}
    </section>
  );
}
