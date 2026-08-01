import { cn } from "@/lib/utils"
import { Grainient } from "@/components/mirava/grainient"

type MiravaGrainProps = {
  className?: string
}

export function MiravaGrain({ className }: MiravaGrainProps) {
  return <Grainient className={cn("mirava-react-grain", className)} color1="#9d9f99" color2="#30322f" color3="#090a0a" colorBalance={0.22} warpStrength={0.45} warpFrequency={2.8} warpSpeed={0} warpAmplitude={95} blendAngle={-18} blendSoftness={0.18} rotationAmount={110} noiseScale={1.35} grainAmount={0.075} grainScale={1.4} grainAnimated={false} contrast={1.12} gamma={1.08} saturation={0} centerX={-0.08} centerY={0.02} zoom={1.1} timeSpeed={0} animated={false} />
}
