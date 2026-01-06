
export type WorkerName = 
  | 'BENEDITO' | 'CLÁUDIO' | 'DAVID' | 'ETIEL' 
  | 'LUIZ BORGES' | 'LUIZ CORREA' | 'TRANSMISSÃO' 
  | 'MANOEL' | 'REGINALDO' | 'ROBERTO' 
  | 'VALDEMIRO' | 'VINICIUS' | 'VISITANTE'
  | 'NÃO HOUVE';

export type DayOfWeek = 'EBD' | 'DOM' | 'SEG' | 'TER' | 'QUI' | 'SAB';

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
