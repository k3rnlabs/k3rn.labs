export type AuditMode = "captures" | "url" | "repository";
export type EvidenceLevel = "A" | "B" | "C";
export type AuditRunStatus = "DRAFT"|"INPUTS_VALIDATED"|"PAGE_MAPPED"|"VISUAL_AUDITED"|"AI_FINGERPRINT_AUDITED"|"CRO_AUDITED"|"ART_DIRECTION_AUDITED"|"TECHNICAL_AUDITED"|"TECHNICAL_SKIPPED"|"PRIORITIZED"|"PROMPTS_PACKAGED"|"IMPLEMENTATION_PENDING"|"VERIFICATION_PENDING"|"VERIFIED"|"FINAL_REVIEWED"|"COMPLETE"|"BLOCKED"|"FAILED";
export type Severity = "P0"|"P1"|"P2"|"P3";
export type FindingStatus = "OPEN"|"APPROVED"|"IN_PROGRESS"|"RESOLVED"|"PARTIALLY_RESOLVED"|"UNCHANGED"|"REGRESSED"|"REJECTED";
export interface EvidenceItem {artifact:string;region?:[number,number,number,number]|null;note:string;command?:string|null;file?:string|null;line?:number|null;}
export interface AuditFinding {id:string;runId:string;category:string;severity:Severity;viewport:Array<"desktop"|"tablet"|"mobile"|"all"|"technical">;sectionId:string;title:string;observation:string;evidence:EvidenceItem[];impact:string;recommendation:string;skills:string[];effort:"XS"|"S"|"M"|"L"|"XL";confidence:number;status:FindingStatus;verification:string;dependencies:string[];lotId?:string|null;}
export interface AuditRun {id:string;projectId:string;mode:AuditMode;evidenceLevel:EvidenceLevel;status:AuditRunStatus;currentGate?:string|null;limitations:string[];createdAt:string;updatedAt?:string|null;}
