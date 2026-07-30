export const SCORE_WEIGHTS={positioning_clarity:15,information_architecture:10,visual_composition:15,typography:10,image_art_direction:10,design_system:10,trust_conversion:10,responsive:10,accessibility_performance:5,ai_template_distinction:5} as const;
export type ScoreAxis=keyof typeof SCORE_WEIGHTS;
export function calculateScore(scores:Record<ScoreAxis,number>){const v=Object.entries(SCORE_WEIGHTS).reduce((t,[a,w])=>{const s=scores[a as ScoreAxis];if(!Number.isFinite(s)||s<0||s>100)throw new Error(`Invalid score ${a}`);return t+s*w/100;},0);return Math.round(v*100)/100;}
export function evidenceCeiling(level:"A"|"B"|"C"){return level==="A"?85:level==="B"?93:100;}
