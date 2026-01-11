
export type WorkerName = 
  | 'BENEDITO' | 'CLÁUDIO' | 'DAVID' | 'ITIEL' | 'FÁBIO'
  | 'LUIZ BORGES' | 'LUIZ CORREA' | 'MANOEL' 
  | 'REGINALDO' | 'ROBERTO' | 'TRANSMISSÃO' 
  | 'VALDEMIRO' | 'VINICIUS' | 'VISITANTE'
  | 'NÃO HOUVE';

export type DayOfWeek = 'EBD' | 'DOM' | 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SAB';

export type TaskCategory = 'Portão' | 'Louvor' | 'Palavra';

export interface Report {
  id: string;
  date: string; // ISO format
  dayOfWeek: DayOfWeek;
  portao: WorkerName;
  louvor: WorkerName;
  palavra: WorkerName;
  textoBiblico: string;
  timestamp: number;
}

export interface WorkerStat {
  worker: WorkerName;
  count: number;
  dates: string[];
}

export type AppTab = 'form' | 'history' | 'stats' | 'availability' | 'backup';