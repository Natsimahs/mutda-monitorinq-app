import React, { useRef, useEffect, useState } from 'react';

const SignaturePad = ({ onSignatureEnd, width = 400, height = 150 }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [hasSignature, setHasSignature] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#222');
  const [lineWidth, setLineWidth] = useState(2.5);

  // Canvas ölçüsünü dinamik, retina dəstəyi ilə
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height, strokeColor, lineWidth]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const event = e.touches ? e.touches[0] : e;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    isDrawing.current = true;
    lastPos.current = getPos(e);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (onSignatureEnd) {
      onSignatureEnd(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onSignatureEnd) {
      onSignatureEnd(null);
    }
  };

  return (
    <div className="signature-pad-container">
      <div className="signature-toolbar">
        <label>
          Rəng:
          <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} />
        </label>
        <label>
          Qələm qalınlığı:
          <input type="range" min={1} max={7} step={0.5} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} />
        </label>
        <button type="button" onClick={clearCanvas} className="clear-signature-button" disabled={!hasSignature}>
          Təmizlə
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="signature-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      ></canvas>
    </div>
  );
};

export default SignaturePad;
