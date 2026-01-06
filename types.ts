export type WorkerName = 
  | 'BENEDITO' | 'CLÁUDIO' | 'DAVID' | 'ETIEL' | 'FÁBIO'
  | 'LUIZ BORGES' | 'LUIZ CORREA' | 'MANOEL' 
  | 'REGINALDO' | 'ROBERTO' | 'TRANSMISSÃO' 
  | 'VALDEMIRO' | 'VINICIUS' | 'VISITANTE'
  | 'NÃO HOUVE';

export type DayOfWeek = 'EBD' | 'DOM' | 'SEG' | 'TER' | 'QUI' | 'SAB';

export type TaskCategory = 'Portão' | 'Louvor' | 'Palavra';

export interface Report {
  id: string;
  date: string; // ISO format
  dayOfWeek