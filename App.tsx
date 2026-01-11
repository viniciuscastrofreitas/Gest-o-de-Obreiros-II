import React, { useState, useEffect, useMemo } from 'react';
import { WORKERS, DAYS_OF_WEEK } from './constants';
import { Report, WorkerName, DayOfWeek, TaskCategory, AppTab } from './types';
import { loadReports, saveReports, exportData, importData } from './utils/storage';
import Modal from './components/Modal';

const App: React.FC = () => {
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('form');
  const [showToast, setShowToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Estados do formulário
  const [date, setDate] = useState(getLocalDateStr(new Date()));
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | ''>('');
  const [portao, setPortao] = useState<WorkerName | ''>('');
  const [louvor, setLouvor] = useState<WorkerName | ''>('');
  const [palavra, setPalavra] = useState<WorkerName | ''>('');
  const [textoBiblico, setTextoBiblico] = useState('');
  
  // Estado de controle de edição
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  // Mapeamento de prioridade para ordenar EBD e DOM no mesmo dia
  const DAY_PRIORITY: Record<string, number> = {
    'DOM': 2, // Noite (Mais recente)
    'EBD': 1  // Manhã (Mais antigo)
  };

  // Função centralizada de ordenação: Data desc -> Turno desc -> Timestamp desc
  const sortReports = (a: Report, b: Report) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;

    const priorityA = DAY_PRIORITY[a.dayOfWeek] || 0;
    const priorityB = DAY_PRIORITY[b.dayOfWeek] || 0;
    const priorityCompare = priorityB - priorityA;
    if (priorityCompare !== 0) return priorityCompare;

    return b.timestamp - a.timestamp;
  };

  // Carregar dados iniciais
  useEffect(() => {
    const initialReports = loadReports();
    setReports(initialReports);
    const today = getLocalDateStr(new Date());
    calculateDayOfWeek(today);
  }, []);

  // Salvar sempre que mudar
  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  // Função isolada para calcular o dia da semana
  const calculateDayOfWeek = (selectedDateStr: string, currentDayValue: string = '') => {
    if (!selectedDateStr) return;
    
    const selectedDate = new Date(selectedDateStr + 'T00:00:00');
    const dayIndex = selectedDate.getDay(); 

    const dayMap: Record<number, DayOfWeek> = {
      1: 'SEG',
      2: 'TER',
      3: 'QUA',
      4: 'QUI',
      6: 'SAB'
    };

    if (dayIndex === 0) {
      if (currentDayValue !== 'EBD' && currentDayValue !== 'DOM') {
        setDayOfWeek('');
      }
    } else {
      const mappedDay = dayMap[dayIndex];
      if (mappedDay) {
        setDayOfWeek(mappedDay);
      } else {
        setDayOfWeek('');
      }
    }
  };

  // Efeito para detecção automática quando a data muda manualmente
  useEffect(() => {
    calculateDayOfWeek(date, dayOfWeek);
  }, [date]);

  // Lógica de regras de negócio por dia (Segunda e Quarta)
  useEffect(() => {
    const currentDay = dayOfWeek as string;

    if (currentDay === 'SEG') {
      setPalavra('NÃO HOUVE');
      if (louvor === 'NÃO HOUVE') setLouvor('');
    } else if (currentDay === 'QUA') {
      setPalavra('NÃO HOUVE');
      setLouvor('NÃO HOUVE');
      if (!textoBiblico || textoBiblico === 'Não informado' || textoBiblico === '') {
        setTextoBiblico('CULTO DE SENHORAS');
      }
    } else {
      if (palavra === 'NÃO HOUVE' && currentDay !== 'SEG' && currentDay !== 'QUA') {
         setPalavra('');
      }
      if (louvor === 'NÃO HOUVE' && currentDay !== 'QUA') {
        setLouvor('');
      }
      if (textoBiblico === 'CULTO DE SENHORAS' && currentDay !== 'QUA') {
        setTextoBiblico('');
      }
    }
  }, [dayOfWeek]);

  const toggleDay = (day: DayOfWeek) => {
    const newSet = new Set(expandedDays);
    if (newSet.has(day)) newSet.delete(day);
    else newSet.add(day);
    setExpandedDays(newSet);
  };

  const toggleTask = (day: DayOfWeek, task: TaskCategory) => {
    const key = `${day}-${task}`;
    const newSet = new Set(expandedTasks);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedTasks(newSet);
  };

  const resetForm = () => {
    const today = getLocalDateStr(new Date());
    setEditingReportId(null);
    setDate(today);
    setPortao('');
    setLouvor('');
    setPalavra('');
    setTextoBiblico('');
    calculateDayOfWeek(today);
  };

  const startEditing = (report: Report) => {
    setEditingReportId(report.id);
    setDate(report.date);
    setDayOfWeek(report.dayOfWeek);
    setPortao(report.portao);
    setLouvor(report.louvor);
    setPalavra(report.palavra);
    setTextoBiblico(report.textoBiblico);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    resetForm();
    alert('Edição cancelada.');
  };

  const handleSaveReport = () => {
    const isSpecialDay = dayOfWeek === 'SEG' || dayOfWeek === 'QUA';
    const isQua = dayOfWeek === 'QUA';

    if (!date || !dayOfWeek || !portao) {
      alert(`⚠️ Por favor, preencha a data e o obreiro do Portão.`);
      return;
    }

    if (!isQua && !louvor) {
      alert(`⚠️ Por favor, selecione o obreiro do Louvor.`);
      return;
    }

    if (!isSpecialDay && !palavra) {
      alert(`⚠️ Por favor, selecione o obreiro da Palavra.`);
      return;
    }

    if (editingReportId) {
      setReports(prev => prev.map(r => r.id === editingReportId ? {
        ...r,
        date,
        dayOfWeek: dayOfWeek as DayOfWeek,
        portao: portao as WorkerName,
        louvor: (louvor || 'NÃO HOUVE') as WorkerName,
        palavra: (palavra || 'NÃO HOUVE') as WorkerName,
        textoBiblico: textoBiblico.trim() || (isQua ? 'CULTO DE SENHORAS' : 'Não informado'),
      } : r));
      setEditingReportId(null);
    } else {
      const newReport: Report = {
        id: crypto.randomUUID(),
        date,
        dayOfWeek: dayOfWeek as DayOfWeek,
        portao: portao as WorkerName,
        louvor: (louvor || 'NÃO HOUVE') as WorkerName,
        palavra: (palavra || 'NÃO HOUVE') as WorkerName,
        textoBiblico: textoBiblico.trim() || (isQua ? 'CULTO DE SENHORAS' : 'Não informado'),
        timestamp: Date.now(),
      };
      setReports(prev => [newReport, ...prev]);
    }
    
    resetForm();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const importedData = await importData(file);
        if (Array.isArray(importedData)) {
          setReports(importedData);
          alert('Backup restaurado com sucesso!');
        }
      } catch (err) { alert('Erro ao importar arquivo.'); }
    }
  };

  const handleShareWhatsApp = (report: Report) => {
    const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const text = `*RELATÓRIO ICM - ${report.dayOfWeek}*\n*Data:* ${formattedDate}\n*Portão:* ${report.portao}\n${report.louvor !== 'NÃO HOUVE' ? `*Louvor:* ${report.louvor}\n` : ''}${report.palavra !== 'NÃO HOUVE' ? `*Palavra:* ${report.palavra}\n` : ''}${report.dayOfWeek !== 'QUA' ? `*Texto:* ${report.textoBiblico}` : 'CULTO DIRIGIDO PELO GRUPO DE SENHORAS'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareMonth = () => {
    const months: string[] = [...new Set<string>(reports.map(r => r.date.substring(0, 7)))].sort().reverse();
    if (months.length === 0) return alert('Sem dados para compartilhar.');

    setModalTitle('Relatório Mensal');
    setModalContent(
      <div className="grid gap-3">
        {months.map(m => {
          const [year, month] = m.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' });
          return (
            <button
              key={m}
              onClick={() => {
                const monthReports = reports.filter(r => r.date.startsWith(m)).sort(sortReports);
                let text = `*RELATÓRIOS ICM - ${monthName.toUpperCase()} / ${year}*\n\n`;
                monthReports.reverse().forEach(r => { // Reverse for share text (oldest to newest within the month)
                  const day = r.date.split('-')[2];
                  text += `*Dia ${day} (${r.dayOfWeek}):*\n`;
                  text += `Portão: ${r.portao}${r.louvor !== 'NÃO HOUVE' ? ` | Louvor: ${r.louvor}` : ''}${r.palavra !== 'NÃO HOUVE' ? ` | Palavra: ${r.palavra}` : ''}\n${r.dayOfWeek === 'QUA' ? 'CULTO DIRIGIDO PELO GRUPO DE SENHORAS' : `Texto: ${r.textoBiblico}`}\n\n`;
                });
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                setModalOpen(false);
              }}
              className="w-full py-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-base font-black text-indigo-900 uppercase active:scale-95 transition-all shadow-sm"
            >
              {monthName} / {year}
            </button>
          );
        })}
      </div>
    );
    setModalOpen(true);
  };

  const handleShareAll = () => {
    if (reports.length === 0) return alert('Sem dados para compartilhar.');
    let text = `*HISTÓRICO COMPLETO - ICM SANTO ANTÔNIO II*\n\n`;
    const sortedReports = [...reports].sort(sortReports);
    sortedReports.forEach(r => {
      const formattedDate = new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR');
      text += `*${formattedDate} (${r.dayOfWeek}):*\n`;
      text += `Portão: ${r.portao}${r.louvor !== 'NÃO HOUVE' ? ` | Louvor: ${r.louvor}` : ''}${r.palavra !== 'NÃO HOUVE' ? ` | Palavra: ${r.palavra}` : ''}\n${r.dayOfWeek === 'QUA' ? 'CULTO DIRIGIDO PELO GRUPO DE SENHORAS' : `Texto: ${r.textoBiblico}`}\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const showWorkerDetails = (worker: WorkerName, task: TaskCategory) => {
    const filtered = reports.filter(r => {
      if (task === 'Portão') return r.portao === worker;
      if (task === 'Louvor') return r.louvor === worker;
      if (task === 'Palavra') return r.palavra === worker && r.palavra !== 'NÃO HOUVE';
      return false;
    }).sort(sortReports);

    setModalTitle(`${worker} - ${task}`);
    setModalContent(
      <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
        {filtered.length > 0 ? filtered.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="font-black text-slate-800 text-base">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-tighter">{r.dayOfWeek}</span>
          </div>
        )) : <p className="text-center text-slate-400 py-3 font-bold text-sm">Nenhum registro encontrado.</p>}
      </div>
    );
    setModalOpen(true);
  };

  const availabilityData = useMemo(() => {
    const workers = WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE' && w !== 'NÃO HOUVE');
    const result: Record<DayOfWeek, Record<TaskCategory, any[]>> = {} as any;
    DAYS_OF_WEEK.forEach(day => {
      result[day] = { 'Portão': [], 'Louvor': [], 'Palavra': [] };
      (['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).forEach(task => {
        const workerList = workers.map(w => {
          const lastExec = reports
            .filter(r => r.dayOfWeek === day && (
              (task === 'Portão' && r.portao === w) ||
              (task === 'Louvor' && r.louvor === w) ||
              (task === 'Palavra' && r.palavra === w)
            ))
            .sort(sortReports)[0];
          const diffTime = lastExec ? new Date().getTime() - new Date(lastExec.date + 'T00:00:00').getTime() : Infinity;
          const daysSince = lastExec ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : Infinity;
          return { name: w, lastDate: lastExec ? new Date(lastExec.date + 'T00:00:00') : null, daysSince };
        });
        result[day][task] = workerList.sort((a, b) => b.daysSince - a.daysSince);
      });
    });
    return result;
  }, [reports]);

  const workerStats = useMemo(() => {
    const stats: Record<string, { portao: number, louvor: number, palavra: number }> = {};
    WORKERS.forEach(w => { stats[w] = { portao: 0, louvor: 0, palavra: 0 }; });
    reports.forEach(r => {
      if (stats[r.portao]) stats[r.portao].portao++;
      if (stats[r.louvor]) stats[r.louvor].louvor++;
      if (stats[r.palavra] && r.palavra !== 'NÃO HOUVE') stats[r.palavra].palavra++;
    });
    return stats;
  }, [reports]);

  const isSunday = new Date(date + 'T00:00:00').getDay() === 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32 font-sans text-slate-800">
      {/* Toast Notificação */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
          <div className="bg-indigo-950 text-amber-400 px-6 py-3 rounded-full shadow-xl border border-white/10 flex items-center gap-2">
            <span className="material-icons text-xl">verified</span>
            <span className="font-bold text-sm uppercase tracking-tight">{editingReportId ? 'Relatório Atualizado' : 'Registro Salvo'}</span>
          </div>
        </div>
      )}

      {/* Header Responsivo */}
      <header className="bg-indigo-950 text-white shadow-2xl overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 pt-6 pb-12 flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-1 shadow-inner shrink-0">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" 
              alt="Obreiro" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-300">Gestão de Obreiros</span>
            </div>
            <h1 className="text-xl font-black tracking-tighter">SANTO ANTÔNIO II</h1>
            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
              <span className="material-icons text-[10px] text-amber-400">equalizer</span>
              <span className="text-[9px] font-black uppercase tracking-wider">{reports.length} Cultos Registrados</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navegação Estilo Pílula */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-md z-50">
        <div className="bg-white/95 backdrop-blur-2xl rounded-full shadow-[0_15px_40px_rgba(30,27,75,0.12)] border border-slate-100 p-1.5 flex items-center justify-between">
          {[
            { id: 'form', icon: 'add_circle', label: editingReportId ? 'Edit' : 'Novo' },
            { id: 'history', icon: 'list_alt', label: 'Histórico' },
            { id: 'availability', icon: 'hourglass_empty', label: 'Ocioso' },
            { id: 'stats', icon: 'analytics', label: 'Ranking' },
            { id: 'backup', icon: 'settings', label: 'Ajustes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-0.5 rounded-full transition-all duration-300 ${
                activeTab === tab.id 
                ? 'bg-indigo-950 text-amber-400 shadow-lg scale-105' 
                : 'text-slate-400 hover:text-indigo-900'
              }`}
            >
              <span className="material-icons text-2xl">{tab.icon}</span>
              <span className="text-[9px] font-black uppercase mt-0.5 tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 -mt-6">
        {activeTab === 'form' && (
          <div className={`bg-white rounded-[2rem] shadow-xl p-6 border ${editingReportId ? 'border-amber-400 border-2' : 'border-slate-100'} animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-6`}>
            {editingReportId && (
              <div className="bg-amber-100 text-amber-900 p-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest">
                <span className="material-icons text-sm">edit</span> Editando Registro
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Data do Culto</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-indigo-600 transition-all text-center text-indigo-950 shadow-inner"
              />
              
              {isSunday ? (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center italic">Domingo: Qual o culto?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setDayOfWeek('EBD')}
                      className={`py-4 rounded-xl font-black text-xs uppercase transition-all border ${dayOfWeek === 'EBD' ? 'bg-indigo-950 text-amber-400 border-indigo-950 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      Manhã (EBD)
                    </button>
                    <button 
                      onClick={() => setDayOfWeek('DOM')}
                      className={`py-4 rounded-xl font-black text-xs uppercase transition-all border ${dayOfWeek === 'DOM' ? 'bg-indigo-950 text-amber-400 border-indigo-950 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                      Noite (Culto)
                    </button>
                  </div>
                </div>
              ) : dayOfWeek && (
                <div className="text-center py-1">
                  <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border border-indigo-100">
                    Dia: {dayOfWeek}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map((cat) => {
                if (dayOfWeek === 'QUA' && cat !== 'Portão') return null; 
                if (cat === 'Palavra' && dayOfWeek === 'SEG') return null;

                const val = cat === 'Portão' ? portao : cat === 'Louvor' ? louvor : palavra;
                const set = cat === 'Portão' ? setPortao : cat === 'Louvor' ? setLouvor : setPalavra;

                return (
                  <div key={cat} className="space-y-2 animate-in fade-in duration-300">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">{cat}</label>
                    <div className="relative">
                      <select 
                        value={val} 
                        onChange={(e) => set(e.target.value as WorkerName)}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-base outline-none appearance-none focus:bg-white focus:border-indigo-600 transition-all text-slate-800 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xl">expand_more</span>
                    </div>
                  </div>
                );
              })}

              {dayOfWeek === 'SEG' && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-[10px] font-bold text-center italic uppercase tracking-tight text-amber-800">
                  Segunda-feira: Não há escala de Palavra.
                </div>
              )}
              {dayOfWeek === 'QUA' && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-[10px] font-bold text-center italic uppercase tracking-tight text-indigo-800">
                  🌸 CULTO DIRIGIDO PELO GRUPO DE SENHORAS
                </div>
              )}
            </div>

            {dayOfWeek !== 'QUA' && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                  {dayOfWeek === 'SEG' ? 'Texto / Leitura' : 'Texto / Mensagem'}
                </label>
                <textarea 
                  value={textoBiblico}
                  onChange={(e) => setTextoBiblico(e.target.value)}
                  placeholder="Referência..."
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-base outline-none h-24 resize-none focus:bg-white focus:border-indigo-600 transition-all text-slate-700 shadow-sm"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button 
                onClick={handleSaveReport} 
                className={`w-full ${editingReportId ? 'bg-amber-500 border-amber-600' : 'bg-indigo-950 border-amber-600/30'} text-white py-4 rounded-full font-black uppercase text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 mt-2`}
              >
                <span className="material-icons text-2xl">{editingReportId ? 'update' : 'save_as'}</span> 
                {editingReportId ? 'Atualizar' : 'Confirmar'}
              </button>
              
              {editingReportId && (
                <button onClick={cancelEdit} className="w-full text-slate-400 py-3 font-black uppercase text-[10px] tracking-widest">
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>
        )}

        {/* Histórico */}
        {activeTab === 'history' && (
          <div className="space-y-5 pb-10">
            <div className="flex gap-2">
              <div className="bg-white rounded-full px-5 py-3 shadow-lg border border-slate-100 flex-1 flex items-center gap-2">
                <span className="material-icons text-slate-300 text-xl">search</span>
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent outline-none font-bold text-base text-slate-600"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleShareMonth} className="bg-indigo-950 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                  <span className="material-icons text-xl">calendar_month</span>
                </button>
                <button onClick={handleShareAll} className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
                  <span className="material-icons text-xl">auto_stories</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {[...reports].filter(r => 
                r.portao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.louvor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.palavra.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.textoBiblico.toLowerCase().includes(searchTerm.toLowerCase())
              ).sort(sortReports).map(report => (
                <div key={report.id} className="bg-white rounded-[1.5rem] p-6 shadow-md border border-slate-100 relative overflow-hidden animate-in slide-in-from-left-4">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-900"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5 block">{report.dayOfWeek}</span>
                      <h3 className="text-xl font-black text-slate-800">{new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEditing(report)} className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><span className="material-icons text-base">edit</span></button>
                      <button onClick={() => handleShareWhatsApp(report)} className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><span className="material-icons text-base">share</span></button>
                      <button onClick={() => confirm('Apagar?') && setReports(prev => prev.filter(r => r.id !== report.id))} className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center"><span className="material-icons text-base">delete</span></button>
                    </div>
                  </div>
                  <div className="grid gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="material-icons text-indigo-900 text-lg">door_front</span>
                      <span className="text-base font-black text-slate-700">{report.portao}</span>
                    </div>
                    {report.louvor !== 'NÃO HOUVE' && (
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-indigo-900 text-lg">lyrics</span>
                        <span className="text-base font-black text-slate-700">{report.louvor}</span>
                      </div>
                    )}
                    {report.palavra !== 'NÃO HOUVE' && (
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-indigo-900 text-lg">menu_book</span>
                        <span className="text-base font-black text-slate-700">{report.palavra}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm italic text-slate-500 font-medium border-l-2 border-slate-200 pl-3">
                    {report.dayOfWeek === 'QUA' ? '🌸 CULTO DIRIGIDO PELO GRUPO DE SENHORAS' : `"${report.textoBiblico}"`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aba Ociosidade */}
        {activeTab === 'availability' && (
          <div className="space-y-4 pb-10">
            <h2 className="text-[10px] font-black text-slate-400 uppercase text-center tracking-[0.4em] mb-4">Controle de Ociosidade</h2>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="bg-white rounded-[1.5rem] shadow border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleDay(day)}
                  className={`w-full px-6 py-5 flex items-center justify-between transition-all ${expandedDays.has(day) ? 'bg-indigo-950 text-white' : 'bg-white text-slate-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-icons text-2xl ${expandedDays.has(day) ? 'text-amber-400' : 'text-indigo-600'}`}>calendar_month</span>
                    <span className="font-black text-lg uppercase tracking-wider">{day}</span>
                  </div>
                  <span className={`material-icons text-xl transition-transform duration-300 ${expandedDays.has(day) ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                
                {expandedDays.has(day) && (
                  <div className="p-4 space-y-4 bg-slate-50/50">
                    {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map(task => {
                      if (task === 'Palavra' && (day === 'EBD' || day === 'SEG' || day === 'QUA')) return null;
                      if (task === 'Louvor' && day === 'QUA') return null;

                      const taskKey = `${day}-${task}`;
                      const isExpanded = expandedTasks.has(taskKey);

                      return (
                        <div key={task} className="border-b border-slate-200 last:border-0 pb-2 last:pb-0">
                          <button onClick={() => toggleTask(day, task)} className="w-full flex items-center justify-between py-1.5">
                            <span className="text-indigo-900 font-black text-sm uppercase tracking-widest">{task}</span>
                            <span className={`material-icons text-indigo-200 text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>unfold_more</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="space-y-2 mt-2 animate-in slide-in-from-top-2">
                              {availabilityData[day][task].map((w) => {
                                const isUrgent = w.daysSince > 21 || w.daysSince === Infinity;
                                return (
                                  <div key={w.name} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex flex-col">
                                      <span className="font-black text-base text-slate-800">{w.name}</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        {w.lastDate ? `Última em: ${w.lastDate.toLocaleDateString('pt-BR')}` : 'Sem registros'}
                                      </span>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${w.daysSince === Infinity ? 'bg-indigo-950 text-white' : isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                      {w.daysSince === Infinity ? '-' : `${w.daysSince}d`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Estatísticas */}
        {activeTab === 'stats' && (
          <div className="space-y-6 pb-10">
            <h2 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Ranking de Atividades</h2>
            <div className="grid gap-4">
              {WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE' && w !== 'NÃO HOUVE').map(worker => {
                const s = workerStats[worker];
                const total = s.portao + s.louvor + s.palavra;
                return (
                  <div key={worker} className="bg-white rounded-[1.5rem] shadow-lg border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 bg-indigo-950 text-white flex justify-between items-center">
                      <span className="font-black text-lg tracking-tight uppercase">{worker}</span>
                      <div className="bg-amber-400 text-indigo-950 px-4 py-1.5 rounded-full font-black text-xs">
                        {total} ATOS
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-3 bg-slate-50/30">
                      {[
                        { label: 'Portão', value: s.portao, color: 'sky' },
                        { label: 'Louvor', value: s.louvor, color: 'violet' },
                        { label: 'Palavra', value: s.palavra, color: 'amber' }
                      ].map(item => (
                        <button key={item.label} onClick={() => showWorkerDetails(worker, item.label as TaskCategory)} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center shadow-sm active:scale-95 transition-all">
                          <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{item.label}</span>
                          <span className={`text-xl font-black text-${item.color}-600`}>{item.value}</span>
                          <span className="material-icons text-[10px] text-slate-300">history</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ajustes e Backup */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 space-y-8 border border-slate-100 mb-10 text-center">
            <div className="space-y-2">
              <div className="inline-block p-6 bg-indigo-50 rounded-[2rem] mb-2 text-indigo-600 shadow-inner">
                <span className="material-icons text-5xl">settings_suggest</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Ajustes</h2>
              <p className="text-sm font-bold text-slate-400 max-w-[200px] mx-auto">Segurança e Backup.</p>
            </div>
            
            <div className="grid gap-3">
              <button 
                onClick={() => exportData(reports)} 
                className="w-full bg-indigo-950 text-amber-400 py-4 rounded-full font-black text-base flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                <span className="material-icons text-2xl">cloud_download</span> Exportar JSON
              </button>
              
              <label className="w-full bg-white text-indigo-900 py-4 rounded-full font-black text-base flex items-center justify-center gap-3 border-2 border-indigo-50 cursor-pointer uppercase tracking-widest shadow-sm active:scale-95 transition-all">
                <span className="material-icons text-2xl">cloud_upload</span> Restaurar Backup
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>
              
              <div className="pt-8 mt-4 border-t border-slate-50">
                <button onClick={() => confirm('Apagar tudo?') && setReports([])} className="w-full text-rose-400 py-3 text-[10px] font-black uppercase tracking-widest border border-rose-50 rounded-full">
                  Redefinir App
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-slate-300 font-black text-[9px] uppercase tracking-[0.4em] pb-32 px-10 opacity-50">
        ICM SANTO ANTÔNIO II
      </footer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>{modalContent}</Modal>
    </div>
  );
};

export default App;