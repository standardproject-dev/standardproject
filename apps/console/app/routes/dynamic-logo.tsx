import type { Route } from "./+types/dynamic-logo";

export default function DynamicLogo(props: Route.ComponentProps) {

  const N = 24;
  const lines = Array.from({ length: N }, (_, i) => {
    const linear = i / (N - 1); // Linear distribution from 0 to 1
    const logarithmic = Math.log(i + 1) / Math.log(N); // Logarithmic distribution
    const weight = 0.5; // 0.5 means exactly in between
    const factor = linear * (1 - weight) + logarithmic * weight;
    const reverseFactor = 1 - factor; // Reverse the distribution
    const angleRadians = Math.PI + reverseFactor * Math.PI * 2;
    const stroke = 'rgb(0, 0, 0)'; // Color based on index
    return (
      <Line
        key={i}
        centerX={256}
        centerY={256}
        length={200}
        angleRadians={angleRadians}
        strokeWidth={1}
        stroke={stroke} // Color based on index
      />
    );
  });

  return (
    <div>
      <svg width={512} height={512}>
        { lines }
        <circle cx={256} cy={256} r={200} fill="none" stroke="black" strokeWidth={1} />
      </svg>
    </div>
  )
}

type LineProps = {
  centerX: number;
  centerY: number;
  length: number;
  angleRadians: number;
  stroke: string;
  strokeWidth: number;
}
const Line: React.FC<LineProps> = props => {

  const { centerX, centerY, length, angleRadians } = props;
  const offset = 1
  const x1 = Math.round(centerX + offset * Math.sin(angleRadians));
  const y1 = Math.round(centerY - offset * Math.cos(angleRadians));
  const x2 = Math.round(centerX + length * Math.sin(angleRadians));
  const y2 = Math.round(centerY - length * Math.cos(angleRadians));
  
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
    />
  )
}