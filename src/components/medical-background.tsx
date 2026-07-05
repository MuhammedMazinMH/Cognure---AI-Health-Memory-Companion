// Medical-themed animated background for healthcare aesthetic.
// Soft gradient mesh with floating medical icon outlines that drift upward.
// SVG icons are low-opacity, CSS-animated, and never interfere with interactive elements.

export function MedicalBackground() {
  return (
    <>
      {/* Global styles for animations */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.06;
          }
          90% {
            opacity: 0.06;
          }
          100% {
            transform: translateY(-100vh);
            opacity: 0;
          }
        }

        .medical-icon-float {
          animation: float-up linear infinite;
          position: fixed;
          pointer-events: none;
          z-index: -1;
        }
      `}</style>

      {/* Gradient mesh background */}
      <div className="fixed inset-0 z-[-2] pointer-events-none">
        {/* Base warm cream background */}
        <div className="absolute inset-0 bg-background" />

        {/* Primary sage-to-cream gradient mesh */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(138, 154, 135, 0.15) 0%, 
                rgba(245, 242, 235, 0) 40%),
              linear-gradient(45deg, 
                rgba(232, 244, 248, 0.1) 0%, 
                rgba(245, 242, 235, 0) 50%),
              linear-gradient(90deg, 
                rgba(138, 154, 135, 0.08) 0%, 
                rgba(245, 242, 235, 0) 100%)
            `,
          }}
        />

        {/* Subtle blur overlay for depth */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      {/* Floating medical icons */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        {/* Heartbeat line - top left */}
        <svg
          className="medical-icon-float absolute"
          style={{ left: "10%", animationDuration: "18s", animationDelay: "0s" }}
          width="120"
          height="60"
          viewBox="0 0 120 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 30 L25 30 L30 15 L35 40 L40 25 L50 30 L115 30"
            stroke="rgba(138, 154, 135, 0.08)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* DNA helix - top right */}
        <svg
          className="medical-icon-float absolute"
          style={{
            right: "8%",
            animationDuration: "20s",
            animationDelay: "-3s",
          }}
          width="80"
          height="120"
          viewBox="0 0 80 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 10 Q50 30 40 50 Q30 70 40 90"
            stroke="rgba(138, 154, 135, 0.07)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M40 10 Q30 30 40 50 Q50 70 40 90"
            stroke="rgba(232, 244, 248, 0.08)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="30" cy="30" r="3" fill="rgba(138, 154, 135, 0.1)" />
          <circle cx="50" cy="30" r="3" fill="rgba(138, 154, 135, 0.1)" />
          <circle cx="35" cy="60" r="3" fill="rgba(138, 154, 135, 0.1)" />
          <circle cx="45" cy="60" r="3" fill="rgba(138, 154, 135, 0.1)" />
          <circle cx="40" cy="90" r="3" fill="rgba(138, 154, 135, 0.1)" />
        </svg>

        {/* Stethoscope - middle left */}
        <svg
          className="medical-icon-float absolute"
          style={{
            left: "15%",
            animationDuration: "19s",
            animationDelay: "-5s",
          }}
          width="100"
          height="100"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 15 Q40 30 40 50 Q40 70 50 80 Q60 70 60 50 Q60 30 50 15"
            stroke="rgba(138, 154, 135, 0.07)"
            strokeWidth="2"
          />
          <line
            x1="40"
            y1="50"
            x2="20"
            y2="60"
            stroke="rgba(232, 244, 248, 0.08)"
            strokeWidth="2"
          />
          <line
            x1="60"
            y1="50"
            x2="80"
            y2="60"
            stroke="rgba(232, 244, 248, 0.08)"
            strokeWidth="2"
          />
          <circle cx="20" cy="60" r="5" fill="rgba(138, 154, 135, 0.1)" />
          <circle cx="80" cy="60" r="5" fill="rgba(138, 154, 135, 0.1)" />
        </svg>

        {/* Pill capsule - right side */}
        <svg
          className="medical-icon-float absolute"
          style={{
            right: "12%",
            animationDuration: "17s",
            animationDelay: "-8s",
          }}
          width="90"
          height="50"
          viewBox="0 0 90 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse
            cx="25"
            cy="25"
            rx="18"
            ry="20"
            fill="rgba(138, 154, 135, 0.08)"
            stroke="rgba(138, 154, 135, 0.1)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="65"
            cy="25"
            rx="18"
            ry="20"
            fill="rgba(232, 244, 248, 0.07)"
            stroke="rgba(232, 244, 248, 0.09)"
            strokeWidth="1.5"
          />
          <line
            x1="43"
            y1="10"
            x2="43"
            y2="40"
            stroke="rgba(138, 154, 135, 0.08)"
            strokeWidth="1"
          />
        </svg>

        {/* Cell structure - bottom center */}
        <svg
          className="medical-icon-float absolute"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            animationDuration: "18.5s",
            animationDelay: "-2s",
          }}
          width="100"
          height="100"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="rgba(138, 154, 135, 0.08)"
            strokeWidth="2"
          />
          <circle cx="50" cy="50" r="8" fill="rgba(138, 154, 135, 0.1)" />
          <line
            x1="50"
            y1="15"
            x2="50"
            y2="85"
            stroke="rgba(232, 244, 248, 0.06)"
            strokeWidth="1"
          />
          <line
            x1="15"
            y1="50"
            x2="85"
            y2="50"
            stroke="rgba(232, 244, 248, 0.06)"
            strokeWidth="1"
          />
          <circle cx="50" cy="20" r="4" fill="rgba(138, 154, 135, 0.09)" />
          <circle cx="80" cy="50" r="4" fill="rgba(138, 154, 135, 0.09)" />
          <circle cx="50" cy="80" r="4" fill="rgba(138, 154, 135, 0.09)" />
          <circle cx="20" cy="50" r="4" fill="rgba(138, 154, 135, 0.09)" />
        </svg>

        {/* Additional floating heartbeat - far left, staggered */}
        <svg
          className="medical-icon-float absolute"
          style={{
            left: "5%",
            animationDuration: "19.5s",
            animationDelay: "-10s",
          }}
          width="100"
          height="50"
          viewBox="0 0 100 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 25 L20 25 L23 12 L27 35 L30 20 L40 25 L95 25"
            stroke="rgba(232, 244, 248, 0.08)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}
