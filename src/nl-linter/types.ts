export interface NLLinterDiagnostic {
  id: string;
  severity: 'warning' | 'error';
  message: string;
  start: number;
  end: number;
}

export interface NLRule {
  id: string;
  name: string;
  severity: 'warning' | 'error';
  evaluate: (text: string) => NLLinterDiagnostic[];
}
