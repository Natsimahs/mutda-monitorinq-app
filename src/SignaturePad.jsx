// src/SignaturePad.jsx

import React, { useRef, useEffect } from 'react';

const SignaturePad = ({ onSignatureEnd }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault(); // Prevent scrolling on touch devices

    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Pass the signature data URL when drawing ends
    if (onSignatureEnd) {
      onSignatureEnd(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (onSignatureEnd) {
      onSignatureEnd(null); // Clear signature data
    }
  };

  return (
    <div className="signature-pad-container">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="signature-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      ></canvas>
      <button type="button" onClick={clearCanvas} className="clear-signature-button">
        Təmizlə
      </button>
    </div>
  );
};

export default SignaturePad;
