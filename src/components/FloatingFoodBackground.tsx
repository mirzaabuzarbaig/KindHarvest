import React from "react";

const items = ["🍎","🍞","🍕","🥗","🍰","🍇","🥐","🍊"]; 

const positions = [
  { top: "10%", left: "5%", size: 44, delay: "0s" },
  { top: "25%", left: "80%", size: 56, delay: "0.6s" },
  { top: "70%", left: "15%", size: 40, delay: "1.2s" },
  { top: "60%", left: "75%", size: 48, delay: "1.8s" },
  { top: "35%", left: "45%", size: 52, delay: "0.9s" },
  { top: "82%", left: "55%", size: 42, delay: "1.5s" },
];

export default function FloatingFoodBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {positions.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: p.top,
            left: p.left,
            fontSize: p.size,
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.35))",
            animation: `floatY 6s ease-in-out infinite`,
            animationDelay: p.delay,
            opacity: 0.25,
            transform: "translateZ(0)"
          }}
          className="select-none will-change-transform">
          {items[i % items.length]}
        </span>
      ))}
      <style>{`
        @keyframes floatY {
          0%, 100% { transform: translateY(0) translateZ(0) rotate(0.001deg); }
          50% { transform: translateY(-18px) translateZ(0) rotate(0.001deg); }
        }
      `}</style>
    </div>
  );
}
