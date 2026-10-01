import React from 'react';

/**
 * Ultra-Premium Realistic Automotive Engineering Truck Emblem
 * Heavy-duty commercial vehicle with realistic metallic chrome, xenon lighting,
 * aerodynamic cab, precision cargo container ribs, and dual-axle alloy wheels.
 */
export function TruckLogo({ size = 32, className = '' }) {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`truck-realistic-svg ${className}`}
      aria-label="FaizanBody Premium Automotive Emblem"
    >
      <defs>
        {/* Deep Executive Titanium Blue Cargo Body */}
        <linearGradient id={`cargoGrad_${uniqueId}`} x1="3" y1="9" x2="28" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="35%" stopColor="#1d4ed8" />
          <stop offset="70%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Cargo Roof Highlight Sheen */}
        <linearGradient id={`roofSheen_${uniqueId}`} x1="3" y1="9" x2="28" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>

        {/* Chrome Metallic Cab Finish */}
        <linearGradient id={`cabMetallic_${uniqueId}`} x1="27" y1="12" x2="45" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="15%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Aerodynamic Windshield Glass */}
        <linearGradient id={`glassGrad_${uniqueId}`} x1="30" y1="14" x2="40" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="40%" stopColor="#1e293b" />
          <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
        </linearGradient>

        {/* Chrome Grille and Bumper */}
        <linearGradient id={`chromeBumper_${uniqueId}`} x1="38" y1="28" x2="45" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#e2e8f0" />
          <stop offset="60%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Luxury Gold Bodywork Trim Accent */}
        <linearGradient id={`goldTrim_${uniqueId}`} x1="4" y1="22" x2="27" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Xenon Matrix Headlamp Glow */}
        <radialGradient id={`headlampGlow_${uniqueId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>

        {/* Wheel Hub Chrome */}
        <radialGradient id={`wheelHub_${uniqueId}`} cx="40%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="75%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>

        {/* Chassis Shadow */}
        <filter id={`softShadow_${uniqueId}`} x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
        </filter>
      </defs>

      <g filter={`url(#softShadow_${uniqueId})`}>
        {/* --- 1. CHASSIS / UNDERCARRIAGE --- */}
        <rect x="5" y="30" width="37" height="4.5" rx="1.5" fill="#0f172a" />
        {/* Steel Fuel Tank under container */}
        <rect x="18" y="29.5" width="8" height="4" rx="1" fill="#475569" stroke="#64748b" strokeWidth="0.5" />

        {/* --- 2. CARGO CONTAINER (Heavy Fabrication Body) --- */}
        {/* Main box */}
        <rect
          x="3"
          y="8.5"
          width="24.5"
          height="22"
          rx="2.5"
          fill={`url(#cargoGrad_${uniqueId})`}
        />
        {/* Top roof highlight sheen */}
        <path
          d="M4.5 9h21.5c1 0 1.5.5 1.5 1.2v1H3.5v-1c0-.7.5-1.2 1-1.2z"
          fill={`url(#roofSheen_${uniqueId})`}
        />
        {/* Container Precision Vertical Ribs (Fabrication Structure) */}
        <line x1="8" y1="12" x2="8" y2="28" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="12.5" y1="12" x2="12.5" y2="28" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="17" y1="12" x2="17" y2="28" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="21.5" y1="12" x2="21.5" y2="28" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" />

        {/* Executive Gold Horizon Pinstripe (Prestige Coachwork) */}
        <line x1="4.5" y1="20.5" x2="26" y2="20.5" stroke={`url(#goldTrim_${uniqueId})`} strokeWidth="1.4" strokeLinecap="round" />
        {/* Corner Bevels / Rivets */}
        <circle cx="5.5" cy="11" r="0.75" fill="#93c5fd" />
        <circle cx="25" cy="11" r="0.75" fill="#93c5fd" />
        <circle cx="5.5" cy="28" r="0.75" fill="#93c5fd" />
        <circle cx="25" cy="28" r="0.75" fill="#93c5fd" />

        {/* --- 3. AERODYNAMIC CABIN (Modern Heavy Hauler) --- */}
        {/* Roof Aerodynamic Wind Fairing / Spoiler */}
        <path
          d="M27 12.5C27 10 29 8 32 8h4.5c3.2 0 5 2 6 4.5l.5 1.5H27v-1.5z"
          fill="#334155"
        />
        {/* Marker lights on top fairing */}
        <circle cx="33" cy="9.2" r="0.6" fill="#fbbf24" />
        <circle cx="37" cy="9.2" r="0.6" fill="#fbbf24" />
        <circle cx="41" cy="9.5" r="0.6" fill="#fbbf24" />

        {/* Main Cab Outer Body (Sleek Contours) */}
        <path
          d="M27.5 14h8.2c2.2 0 4 .8 5.2 2.5l3.4 5c.6.9.9 2 .9 3.2V32c0 1.2-.8 2-2 2h-15.7V14z"
          fill={`url(#cabMetallic_${uniqueId})`}
        />

        {/* Tinted Aerodynamic Windshield & Side Window Glass */}
        <path
          d="M30 15.5h5.8c1.6 0 3 .6 3.9 1.9l2.8 4c.4.6.6 1.3.6 2.1H30v-8z"
          fill={`url(#glassGrad_${uniqueId})`}
        />
        {/* Glass Glare Reflection Line */}
        <path
          d="M32 16.5l6.5 6.2"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.6"
          strokeLinecap="round"
        />

        {/* Heavy-Duty Chrome Front Grille */}
        <rect x="42.2" y="24" width="3" height="6.5" rx="0.8" fill="#1e293b" />
        <line x1="42.5" y1="25.2" x2="44.8" y2="25.2" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
        <line x1="42.5" y1="26.8" x2="44.8" y2="26.8" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
        <line x1="42.5" y1="28.4" x2="44.8" y2="28.4" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />

        {/* Xenon Matrix Headlamp Assembly */}
        <rect x="43" y="30.5" width="2.2" height="2" rx="0.5" fill={`url(#headlampGlow_${uniqueId})`} />
        <circle cx="44.1" cy="31.5" r="0.6" fill="#e0f2fe" />

        {/* Heavy Chrome Front Bumper */}
        <path
          d="M38.5 32.5h6c.6 0 1 .4 1 1v.5c0 .6-.4 1-1 1h-6v-2.5z"
          fill={`url(#chromeBumper_${uniqueId})`}
        />

        {/* Aerodynamic Side Mirror */}
        <rect x="29" y="17" width="1.2" height="3" rx="0.4" fill="#0f172a" />
        <line x1="28.2" y1="18.5" x2="29" y2="18.5" stroke="#475569" strokeWidth="0.7" />

        {/* Door Seam & Chrome Handle */}
        <line x1="36" y1="21.5" x2="36" y2="31" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="1 1" />
        <rect x="34" y="24" width="1.8" height="0.6" rx="0.3" fill="#ffffff" />

        {/* --- 4. HEAVY-DUTY DUAL-AXLE ALLOY WHEELS --- */}
        {/* Rear Wheel 1 (Tire + Rim + Hub) */}
        <g className="wheel-rear-1">
          <circle cx="10" cy="34" r="5.2" fill="#0f172a" />
          <circle cx="10" cy="34" r="5" stroke="#334155" strokeWidth="0.8" />
          <circle cx="10" cy="34" r="3.2" fill={`url(#wheelHub_${uniqueId})`} />
          <circle cx="10" cy="34" r="1.4" fill="#0f172a" />
          <circle cx="10" cy="34" r="0.6" fill="#38bdf8" />
        </g>

        {/* Rear Wheel 2 (Tire + Rim + Hub) */}
        <g className="wheel-rear-2">
          <circle cx="17.5" cy="34" r="5.2" fill="#0f172a" />
          <circle cx="17.5" cy="34" r="5" stroke="#334155" strokeWidth="0.8" />
          <circle cx="17.5" cy="34" r="3.2" fill={`url(#wheelHub_${uniqueId})`} />
          <circle cx="17.5" cy="34" r="1.4" fill="#0f172a" />
          <circle cx="17.5" cy="34" r="0.6" fill="#38bdf8" />
        </g>

        {/* Front Steer Wheel (Tire + Rim + Hub) */}
        <g className="wheel-front">
          <circle cx="36.5" cy="34" r="5.2" fill="#0f172a" />
          <circle cx="36.5" cy="34" r="5" stroke="#334155" strokeWidth="0.8" />
          <circle cx="36.5" cy="34" r="3.2" fill={`url(#wheelHub_${uniqueId})`} />
          <circle cx="36.5" cy="34" r="1.4" fill="#0f172a" />
          <circle cx="36.5" cy="34" r="0.6" fill="#38bdf8" />
        </g>
      </g>
    </svg>
  );
}

export default TruckLogo;
