import { useEffect, useRef, useState } from "react";
import { FileSignature, Keyboard, PenLine, RotateCcw } from "lucide-react";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 260;

export default function SignatureCapture({
  customerName = "",
  hasError = false,
  onChange,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const inkRef = useRef(false);
  const lastPointRef = useRef(null);
  const [mode, setMode] = useState("draw");
  const [signerName, setSignerName] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState("");

  useEffect(() => {
    const cleanCustomerName = String(customerName || "").trim();
    if (cleanCustomerName && !signerName) setSignerName(cleanCustomerName);
  }, [customerName, signerName]);

  useEffect(() => {
    if (mode !== "draw") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#2563eb";

    if (signatureImage) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      image.src = signatureImage;
    }
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

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const beginDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
    canvas.setPointerCapture?.(event.pointerId);
  };

  const continueDrawing = (event) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);

    context.beginPath();
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    inkRef.current = true;
    lastPointRef.current = point;
  };

  const finishDrawing = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    drawingRef.current = false;
    lastPointRef.current = null;
    canvas.releasePointerCapture?.(event.pointerId);
    if (inkRef.current || signatureImage) {
      setSignatureImage(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    inkRef.current = false;
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
            onPointerDown={beginDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
            onPointerLeave={(event) => {
              if (drawingRef.current && event.buttons === 0) finishDrawing(event);
            }}
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
