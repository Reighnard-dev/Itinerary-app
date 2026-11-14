export default function TravelBackground() {
  return (
    <div className="travel-editorial-bg" aria-hidden="true">
      {/* Warm Ambient Glows (Top-Right Golden Haze & Soft Edge Washes) */}
      <div className="bg-golden-glow top-right" />
      <div className="bg-golden-glow mid-left" />
      <div className="bg-sage-glow bottom-left" />
      <div className="bg-sage-glow bottom-right" />

      {/* SVG Canvas for Organic Mountains, Contours, and Trails */}
      <svg
        className="bg-vector-canvas"
        viewBox="0 0 1440 1000"
        preserveAspectRatio="xMidYMin slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Paper Grain Filter */}
          <filter id="roam-paper-grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" result="noise" />
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0
                      0.33 0.33 0.33 0 0
                      0.33 0.33 0.33 0 0
                      0 0 0 0.04 0"
            />
          </filter>

          {/* Soft Sage Linear Gradients for Mountain Silhouettes */}
          <linearGradient id="sage-left-back" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d5e0d1" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#c5d4c0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e2ebd0" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sage-left-mid" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#bfcfbb" stopOpacity="0.6" />
            <stop offset="65%" stopColor="#b2c5ae" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d9e6d4" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sage-left-front" x1="0%" y1="0%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#acc1a7" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#9fb59a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#cfded0" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sage-right-back" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8e3d4" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#c7d5c3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f0f5ec" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sage-right-mid" x1="100%" y1="10%" x2="0%" y2="90%">
            <stop offset="0%" stopColor="#c3d3bf" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#b4c7b0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#e3ede1" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sage-right-front" x1="100%" y1="20%" x2="10%" y2="100%">
            <stop offset="0%" stopColor="#aec3aa" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#9fb69a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#dce8da" stopOpacity="0" />
          </linearGradient>

          {/* Warm Sand Dune Gradient */}
          <linearGradient id="sand-warm-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#edd8b2" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#f3e6cf" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#fbf7ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Paper Grain Overlay across canvas */}
        <rect width="100%" height="100%" filter="url(#roam-paper-grain)" opacity="0.6" />

        {/* ========================================================= */}
        {/* LEFT MARGIN: ORGANIC SAGE HILLS & CONTOURS                 */}
        {/* ========================================================= */}

        {/* Left Warm Sand Underlay */}
        <path
          d="M -50,680 C 40,650 120,700 170,760 C 220,820 180,910 120,970 C 60,1030 -30,1050 -50,1050 Z"
          fill="url(#sand-warm-left)"
        />

        {/* Left Layer 1 - Background Sage Hill */}
        <path
          d="M -50,380 C 30,370 110,410 140,470 C 170,530 130,600 80,660 C 20,730 -40,780 -50,790 Z"
          fill="url(#sage-left-back)"
        />

        {/* Left Layer 2 - Midground Sage Curve */}
        <path
          d="M -50,490 C 20,480 90,520 120,580 C 150,650 90,720 40,790 C -10,850 -40,880 -50,890 Z"
          fill="url(#sage-left-mid)"
        />

        {/* Left Layer 3 - Foreground Sage Slope */}
        <path
          d="M -50,830 C 10,810 80,840 130,890 C 180,950 140,1010 80,1060 L -50,1060 Z"
          fill="url(#sage-left-front)"
        />

        {/* Left Topographic Elevation Contour Lines */}
        <g className="topo-contours" stroke="#beaf96" strokeWidth="1" fill="none" opacity="0.32">
          {/* Contour 1 */}
          <path d="M -40,70 C 50,85 115,135 75,215 C 35,285 145,365 85,485 C 35,585 115,685 -20,765" />
          {/* Contour 2 */}
          <path d="M -40,110 C 60,125 135,175 95,255 C 55,325 165,405 105,525 C 55,625 135,725 0,805" />
          {/* Contour 3 */}
          <path d="M -40,150 C 70,165 155,215 115,295 C 75,365 185,445 125,565 C 75,665 155,765 20,845" />
          {/* Contour 4 */}
          <path d="M -40,190 C 80,205 175,255 135,335 C 95,405 205,485 145,605 C 95,705 175,805 40,885" />
          {/* Contour 5 */}
          <path d="M -40,230 C 90,245 195,295 155,375 C 115,445 225,525 165,645 C 115,745 195,845 60,925" />
          {/* Contour 6 */}
          <path d="M -40,270 C 100,285 215,335 175,415 C 135,485 245,565 185,685 C 135,785 215,885 80,965" />
          {/* Contour 7 (Subtle lower curve) */}
          <path d="M -40,320 C 115,330 235,385 195,465 C 155,535 265,615 205,735 C 155,835 235,935 100,1005" />
        </g>

        {/* Left Dashed Explorer Route Trail */}
        <path
          className="topo-trail"
          d="M -30,210 C 85,190 145,290 85,395 C 25,485 140,575 55,695 C 10,760 -10,810 -30,830"
          stroke="#b49767"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          fill="none"
          opacity="0.42"
        />

        {/* ========================================================= */}
        {/* RIGHT MARGIN: CONCENTRIC RIDGE TOPOGRAPHY & MOUNTAINS      */}
        {/* ========================================================= */}

        {/* Right Layer 1 - Background Sage Mountain Silhouette */}
        <path
          d="M 1490,520 C 1420,530 1350,580 1310,650 C 1270,720 1300,810 1360,890 C 1410,950 1470,980 1490,990 Z"
          fill="url(#sage-right-back)"
        />

        {/* Right Layer 2 - Midground Sage Ridge */}
        <path
          d="M 1490,660 C 1410,670 1330,730 1280,810 C 1240,880 1270,960 1340,1030 L 1490,1030 Z"
          fill="url(#sage-right-mid)"
        />

        {/* Right Layer 3 - Foreground Rolling Ridge */}
        <path
          d="M 1490,780 C 1430,785 1370,835 1330,895 C 1290,955 1310,1015 1360,1060 L 1490,1060 Z"
          fill="url(#sage-right-front)"
        />

        {/* Right Concentric Mountain Elevation Topography Lines */}
        <g className="topo-contours" stroke="#beaf96" strokeWidth="1" fill="none" opacity="0.32">
          {/* Ring 1 (Innermost elevation peak) */}
          <path d="M 1370,120 C 1395,95 1430,110 1445,145 C 1455,180 1430,215 1395,225 C 1360,230 1335,200 1330,165 C 1325,135 1350,110 1370,120 Z" />
          {/* Ring 2 */}
          <path d="M 1345,80 C 1385,50 1440,70 1465,115 C 1485,160 1465,225 1425,250 C 1380,270 1320,245 1300,195 C 1285,150 1310,100 1345,80 Z" />
          {/* Ring 3 */}
          <path d="M 1315,40 C 1375,0 1455,25 1485,85 C 1515,145 1495,235 1445,280 C 1395,315 1305,290 1270,230 C 1240,170 1265,95 1315,40 Z" />
          {/* Ring 4 */}
          <path d="M 1280,-5 C 1360,-45 1475,-15 1510,55 C 1545,125 1525,245 1465,310 C 1405,360 1285,335 1235,260 C 1195,190 1215,90 1280,-5 Z" />
          {/* Ring 5 (Expands into visible margin beside hero) */}
          <path d="M 1240,-45 C 1340,-90 1490,-55 1535,25 C 1575,105 1555,255 1485,340 C 1415,405 1265,380 1200,295 C 1145,215 1165,85 1240,-45 Z" />
          {/* Ring 6 */}
          <path d="M 1200,-85 C 1320,-135 1505,-95 1560,-5 C 1605,85 1585,265 1505,370 C 1425,450 1245,425 1165,330 C 1095,240 1115,75 1200,-85 Z" />
          {/* Ring 7 (Gentle outer contour curve) */}
          <path d="M 1160,-125 C 1300,-180 1520,-135 1585,-35 C 1635,65 1615,275 1525,400 C 1435,495 1225,470 1130,365 C 1045,265 1065,65 1160,-125 Z" />
          {/* Ring 8 */}
          <path d="M 1110,-165 C 1275,-225 1535,-175 1610,-65 C 1665,45 1645,285 1545,430 C 1445,540 1205,515 1095,400 C 995,290 1015,55 1110,-165 Z" />
        </g>

        {/* Right Dashed Trail with Scenic Route Waypoints */}
        <path
          className="topo-trail"
          d="M 1030,590 C 1110,540 1200,590 1270,550 C 1340,510 1400,550 1480,510"
          stroke="#b49767"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          fill="none"
          opacity="0.45"
        />

        {/* Map Pin Waypoint Icon on the Trail (matching reference image) */}
        <g className="topo-waypoint" transform="translate(1270, 545)" opacity="0.65">
          <path
            d="M 0,-14 C -4.5,-14 -8,-10.5 -8,-6 C -8,0 0,8 0,8 C 0,8 8,0 8,-6 C 8,-10.5 4.5,-14 0,-14 Z"
            fill="#cca23c"
          />
          <circle cx="0" cy="-6" r="2.5" fill="#fcf8ef" />
        </g>

        {/* Secondary subtle waypoint on left trail */}
        <g className="topo-waypoint" transform="translate(85, 395)" opacity="0.45">
          <circle cx="0" cy="0" r="3" fill="#b49767" />
          <circle cx="0" cy="0" r="6" stroke="#b49767" strokeWidth="0.8" fill="none" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}
