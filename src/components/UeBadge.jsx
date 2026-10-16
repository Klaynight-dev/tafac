import { Fragment, useId } from 'react'
import { pickInkOn, shadeHex } from '../colorContrast'
import { formatUeCode } from '../gradesSubjects'
import { useUeColor } from '../useUeColor'

// Figma "UE button" (toutatice, node 671:3353): a segment of the UE ring as a
// skeuomorphic ribbon, the UE's code curved along it. Rebuilt from the
// design's own geometry so the code and colour can follow the UE:
// - the segment is Figma's path (an arch: the ring's top), in the UE's colour;
// - its 1px inner edge is a stroke clipped to the shape (Figma's 2.9 kB
//   outlined border, for the same pixels), its gradient added with
//   plus-lighter so the outer edge catches the light;
// - five stacked shadows down and to the left, tinted with a dark shade of
//   the UE's colour (Figma's #660000 for its #B80004);
// - the code set on the arc the segment belongs to (centre ≈ (91.8, 99.1),
//   radius 75.1 at the middle of the text), so it bends like the ribbon: in
//   the design's #F0F0F0 when it reads on the UE's colour (4.5:1), a deep
//   shade of that colour otherwise (yellows, oranges).
const SEGMENT_PATH = 'M91.7426 4.00025C110.328 3.95769 128.525 9.33267 144.114 19.468C144.343 19.6172 144.502 19.8543 144.552 20.1233C144.602 20.3922 144.539 20.6701 144.379 20.8919L124.923 47.8469C124.617 48.2708 124.036 48.3876 123.59 48.1145C114.031 42.2593 103.037 39.1729 91.8324 39.1985C80.6276 39.2242 69.6498 42.3611 60.1205 48.26C59.6759 48.535 59.0936 48.4216 58.7855 47.9993L39.1928 21.1331C39.0316 20.912 38.9671 20.6337 39.016 20.3645C39.0649 20.0954 39.223 19.8575 39.4515 19.7073C54.9881 9.50067 73.1578 4.04298 91.7426 4.00025Z'
// The arc the code sits on, left to right over the top of the circle.
const TEXT_ARC = 'M48.7 37.6A75.1 75.1 0 0 1 134.9 37.6'
// Figma's shadows: [dx, dy, blur (stdDeviation), opacity].
const SHADOWS = [[-1, 1, 2, 0.36], [-4, 6, 3.5, 0.31], [-9, 13, 5, 0.18], [-16, 24, 5.5, 0.05], [-25, 37, 6.5, 0.01]]

// On the dark theme, the UE's colour as useUeColor lifts it.
function UeBadge({ code, color: scodocColor, className = '' }) {
  const id = useId().replace(/:/g, '')
  const color = useUeColor()(scodocColor)
  const shade = shadeHex(color, 0.55)
  const ink = pickInkOn(color)

  return (
    <svg
      viewBox="36 0 112 52"
      width="112"
      height="52"
      className={`ue-badge block shrink-0 overflow-visible ${className}`}
      role="img"
      aria-label={formatUeCode(code)}
    >
      <defs>
        <filter id={`${id}-shadow`} x="-60%" y="-40%" width="200%" height="260%" colorInterpolationFilters="sRGB">
          {SHADOWS.map(([dx, dy, blur, opacity], index) => (
            <Fragment key={index}>
              <feGaussianBlur in="SourceAlpha" stdDeviation={blur} />
              <feOffset dx={dx} dy={dy} result={`blur${index}`} />
              <feFlood floodColor={shade} floodOpacity={opacity} />
              <feComposite in2={`blur${index}`} operator="in" result={`shadow${index}`} />
            </Fragment>
          ))}
          <feMerge>
            {SHADOWS.map((_, index) => <feMergeNode key={index} in={`shadow${SHADOWS.length - 1 - index}`} />)}
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`${id}-edge`} x1="91.78" y1="4" x2="91.78" y2="48.41" gradientUnits="userSpaceOnUse">
          <stop stopColor="#515151" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={SEGMENT_PATH} />
        </clipPath>
        <path id={`${id}-arc`} d={TEXT_ARC} />
      </defs>
      <g filter={`url(#${id}-shadow)`}>
        <g>
          <path d={SEGMENT_PATH} fill={color} />
          <path
            d={SEGMENT_PATH}
            fill="none"
            stroke={`url(#${id}-edge)`}
            strokeWidth="2"
            clipPath={`url(#${id}-clip)`}
            style={{ mixBlendMode: 'plus-lighter' }}
          />
        </g>
      </g>
      <text
        fill={ink}
        fontSize="17"
        fontWeight="600"
        letterSpacing="0.2"
        className="font-display"
        aria-hidden="true"
      >
        <textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle" dominantBaseline="central">
          {formatUeCode(code)}
        </textPath>
      </text>
    </svg>
  )
}

export default UeBadge
