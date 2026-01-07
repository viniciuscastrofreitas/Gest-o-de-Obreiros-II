import { Report } from '../types';
import { STORAGE_KEY } from '../constants';

export const saveReports = (reports: Report[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
};

export const loadReports = (): Report[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const exportData = (reports: Report[]) => {
  const dataStr = JSON.stringify(reports, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `backup_relatorios_${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const shareBackupData = async (reports: Report[]) => {
  const dataStr = JSON.stringify(reports, null, 2);
  const fileName = `backup_icm_${new Date().toISOString().split('T')[0]}.json`;
  const file = new File([dataStr], fileName, { type: 'application/json' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Backup Relatórios ICM',
        text: 'Segue o arquivo de backup dos relatórios de culto para restauração.',
      });
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        alert('Erro ao compartilhar o arquivo.');
      }
    }
  } else {
    alert('Seu navegador ou dispositivo não suporta o compartilhamento direto de arquivos. Utilize a opção "Exportar" para baixar o arquivo manualmente.');
  }
};

export const importData = (file: File): Promise<Report[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};