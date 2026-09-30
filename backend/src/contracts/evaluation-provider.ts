export type WritingTask = 1 | 2;
export type EvaluationStatus = 'completed' | 'limited';
export type CriterionCode = 'TA' | 'TR' | 'CC' | 'LR' | 'GRA';

export interface EvaluationRequest {
  idempotencyKey: string;
  essayId: string;
  versionId: string;
  task: WritingTask;
  promptSnapshot: string;
  imageSnapshot: string | null;
  body: string;
  promptVersion: string;
  schemaVersion: string;
}

export interface EvaluationResult {
  status: EvaluationStatus;
  provider: string;
  model: string;
  overallEstimatedBand: number | null;
  criteria: Array<{
    code: CriterionCode;
    estimatedBand: number | null;
    summary: string;
  }>;
  limitations: string[];
  rawUsage?: Record<string, number>;
}

export interface EvaluationProvider {
  evaluate(request: EvaluationRequest): Promise<EvaluationResult>;
}
