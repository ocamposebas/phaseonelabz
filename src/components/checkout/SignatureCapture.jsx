import { useEffect, useRef, useState } from "react";
import { FileSignature, Keyboard, PenLine, RotateCcw } from "lucide-react";

const MINIMUM_STROKE_DISTANCE = 10;

export default function SignatureCapture({
  customerName = "",
  hasError = false,
  onChange,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const activeInputRef = useRef(null);
  const lastPointRef = useRef(null);
  const strokeDistanceRef = useRef(0);
  const strokeSegmentsRef = useRef(0);
  const signatureImageRef = useRef("");
  const [mode, setMode] = useState("draw");
  const [signerName, setSignerName] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState("");

  useEffect(() => {
    signatureImageRef.current = signatureImage;
  }, [signatureImage]);

  useEffect(() => {
    const cleanCustomerName = String(customerName || "").trim();
    if (cleanCustomerName && !signerName) setSignerName(cleanCustomerName);
  }, [customerName, signerName]);

  useEffect(() => {
    if (mode !== "draw") return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let resizeFrame = 0;
    let disposed = false;

    const configureContext = () => {
      const context = canvas.getContext("2d");
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = Math.max(3 * pixelRatio, 4);
      context.strokeStyle = "#2563eb";
      return context;
    };

    const paintStoredSignature = () => {
      const context = configureContext();
      context.clearRect(0, 0, canvas.width, canvas.height);

      const storedImage = signatureImageRef.current;
      if (!storedImage) return;

      const image = new Image();
      image.onload = () => {
        if (
          !disposed &&
          !drawingRef.current &&
          storedImage === signatureImageRef.current
        ) {
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
      };
      image.src = storedImage;
    };

    const resizeCanvas = () => {
      if (disposed || drawingRef.current) return;

      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const nextWidth = Math.max(1, Math.round(rect.width * pixelRatio));
      const nextHeight = Math.max(1, Math.round(rect.height * pixelRatio));

      if (canvas.width === nextWidth && canvas.height === nextHeight) {
        configureContext();
        return;
      }

      canvas.width = nextWidth;
      canvas.height = nextHeight;
      paintStoredSignature();
    };

    const getPoint = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();

      return {
        x: ((clientX - rect.left) / Math.max(rect.width, 1)) * canvas.width,
        y: ((clientY - rect.top) / Math.max(rect.height, 1)) * canvas.height,
      };
    };

    const preventEvent = (event) => {
      if (event.cancelable) event.preventDefault();
    };

    const beginDrawing = (clientX, clientY, inputId, event) => {
      if (drawingRef.current) {
        preventEvent(event);
        return;
      }

      preventEvent(event);
      drawingRef.current = true;
      activeInputRef.current = inputId;
      lastPointRef.current = getPoint(clientX, clientY);
      strokeDistanceRef.current = 0;
      strokeSegmentsRef.current = 0;
      configureContext();
    };

    const continueDrawing = (clientX, clientY, inputId, event) => {
      if (
        !drawingRef.current ||
        activeInputRef.current !== inputId ||
        !lastPointRef.current
      ) {
        return;
      }

      preventEvent(event);
      const context = configureContext();
      const point = getPoint(clientX, clientY);
      const deltaX = point.x - lastPointRef.current.x;
      const deltaY = point.y - lastPointRef.current.y;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);

      context.beginPath();
      context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();

      strokeDistanceRef.current +=
        Math.hypot(deltaX, deltaY) / Math.max(pixelRatio, 1);
      strokeSegmentsRef.current += 1;
      lastPointRef.current = point;
    };

    const finishDrawing = (inputId, event) => {
      if (
        !drawingRef.current ||
        activeInputRef.current !== inputId
      ) {
        return;
      }

      preventEvent(event);
      drawingRef.current = false;
      activeInputRef.current = null;
      lastPointRef.current = null;

      const validStroke =
        strokeSegmentsRef.current >= 2 &&
        strokeDistanceRef.current >= MINIMUM_STROKE_DISTANCE;

      if (validStroke) {
        const nextImage = canvas.toDataURL("image/png");
        signatureImageRef.current = nextImage;
        setSignatureImage(nextImage);
      } else {
        paintStoredSignature();
      }
    };

    const supportsPointerEvents = "PointerEvent" in window;
    const listeners = [];

    const listen = (target, name, handler, options) => {
      target.addEventListener(name, handler, options);
      listeners.push(() => target.removeEventListener(name, handler, options));
    };

    if (supportsPointerEvents) {
      const onPointerDown = (event) => {
        if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
          return;
        }

        const inputId = `pointer-${event.pointerId}`;
        beginDrawing(event.clientX, event.clientY, inputId, event);

        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // Window-level pointerup still finishes the stroke.
        }
      };
      const onPointerMove = (event) => {
        continueDrawing(
          event.clientX,
          event.clientY,
          `pointer-${event.pointerId}`,
          event,
        );
      };
      const onPointerEnd = (event) => {
        const inputId = `pointer-${event.pointerId}`;
        finishDrawing(inputId, event);

        try {
          if (canvas.hasPointerCapture?.(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Capture may already have been released by the browser.
        }
      };

      listen(canvas, "pointerdown", onPointerDown, { passive: false });
      listen(canvas, "pointermove", onPointerMove, { passive: false });
      listen(canvas, "pointerup", onPointerEnd, { passive: false });
      listen(canvas, "pointercancel", onPointerEnd, { passive: false });
      listen(window, "pointerup", onPointerEnd, { passive: false });
    } else {
      const findTouch = (touchList, identifier) =>
        Array.from(touchList || []).find(
          (touch) => touch.identifier === identifier,
        );
      const onTouchStart = (event) => {
        const touch = event.changedTouches?.[0];
        if (!touch) return;
        beginDrawing(
          touch.clientX,
          touch.clientY,
          `touch-${touch.identifier}`,
          event,
        );
      };
      const onTouchMove = (event) => {
        const identifier = Number(
          String(activeInputRef.current || "").replace("touch-", ""),
        );
        const touch = findTouch(event.touches, identifier);
        if (!touch) return;
        continueDrawing(
          touch.clientX,
          touch.clientY,
          `touch-${touch.identifier}`,
          event,
        );
      };
      const onTouchEnd = (event) => {
        const identifier = Number(
          String(activeInputRef.current || "").replace("touch-", ""),
        );
        const touch = findTouch(event.changedTouches, identifier);
        finishDrawing(
          touch ? `touch-${touch.identifier}` : activeInputRef.current,
          event,
        );
      };
      const onMouseDown = (event) => {
        if (event.button !== 0) return;
        beginDrawing(event.clientX, event.clientY, "mouse", event);
      };
      const onMouseMove = (event) => {
        continueDrawing(event.clientX, event.clientY, "mouse", event);
      };
      const onMouseUp = (event) => finishDrawing("mouse", event);

      listen(canvas, "touchstart", onTouchStart, { passive: false });
      listen(canvas, "touchmove", onTouchMove, { passive: false });
      listen(canvas, "touchend", onTouchEnd, { passive: false });
      listen(canvas, "touchcancel", onTouchEnd, { passive: false });
      listen(canvas, "mousedown", onMouseDown, { passive: false });
      listen(window, "mousemove", onMouseMove, { passive: false });
      listen(window, "mouseup", onMouseUp, { passive: false });
    }

    listen(
      canvas,
      "contextmenu",
      (event) => preventEvent(event),
      { passive: false },
    );

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            window.cancelAnimationFrame(resizeFrame);
            resizeFrame = window.requestAnimationFrame(resizeCanvas);
          })
        : null;

    resizeObserver?.observe(canvas);
    resizeFrame = window.requestAnimationFrame(resizeCanvas);

    return () => {
      disposed = true;
      drawingRef.current = false;
      activeInputRef.current = null;
      lastPointRef.current = null;
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      listeners.forEach((removeListener) => removeListener());
    };
  }, [mode]);

  useEffect(() => {
    const cleanSignerName = signerName.trim();
    const cleanTypedSignature = typedSignature.trim();
    const valid =
      cleanSignerName.length >= 3 &&
      (mode === "draw"
        ? Boolean(signatureImage)
        : cleanTypedSignature.length >= 3);

    onChange?.({
      version: "2026-07-27",
      mode,
      signerName: cleanSignerName,
      typedSignature: mode === "type" ? cleanTypedSignature : "",
      signatureImage: mode === "draw" ? signatureImage : "",
      valid,
    });
  }, [mode, onChange, signatureImage, signerName, typedSignature]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    signatureImageRef.current = "";
    strokeDistanceRef.current = 0;
    strokeSegmentsRef.current = 0;
    setSignatureImage("");
  };

  return (
    <section className={`signature-panel ${hasError ? "has-error" : ""}`}>
      <div className="signature-heading">
        <span className="signature-icon">
          <FileSignature size={20} />
        </span>
        <div>
          <strong>Electronic signature</strong>
          <small>
            Sign with your finger or mouse, or type your full legal name.
          </small>
        </div>
        <span className="signature-required">Required</span>
      </div>

      <div className="signature-tabs" role="tablist" aria-label="Signature method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "draw"}
          className={mode === "draw" ? "is-active" : ""}
          onClick={() => setMode("draw")}
        >
          <PenLine size={15} /> Draw
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "type"}
          className={mode === "type" ? "is-active" : ""}
          onClick={() => setMode("type")}
        >
          <Keyboard size={15} /> Type
        </button>
      </div>

      <label className="signature-name-field">
        <span>Full legal name</span>
        <input
          type="text"
          value={signerName}
          onChange={(event) => {
            setSignerName(event.target.value);
            if (mode === "type") setTypedSignature(event.target.value);
          }}
          placeholder="Name of the person accepting this agreement"
          autoComplete="name"
          maxLength={100}
        />
      </label>

      {mode === "draw" ? (
        <div className="signature-canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label="Draw your electronic signature"
            role="application"
          />
          {!signatureImage && (
            <span className="signature-canvas-placeholder">Sign here</span>
          )}
          <span className="signature-line" aria-hidden="true" />
          <button
            type="button"
            className="signature-clear"
            onClick={clearSignature}
            disabled={!signatureImage}
          >
            <RotateCcw size={13} /> Clear
          </button>
        </div>
      ) : (
        <label className="typed-signature-field">
          <span>Typed signature</span>
          <input
            type="text"
            value={typedSignature}
            onChange={(event) => setTypedSignature(event.target.value)}
            placeholder="Type your signature"
            maxLength={100}
          />
        </label>
      )}

      <p>
        By signing, you intend this electronic signature to have the same effect
        as a handwritten signature. A signed purchase agreement will be emailed
        after payment is confirmed.
      </p>
    </section>
  );
}
