
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [date, setDate] = useState(getLocalDateStr(new Date()));
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek | ''>('');
  const [portao, setPortao] = useState<WorkerName | ''>('');
  const [louvor, setLouvor] = useState<WorkerName | ''>('');
  const [palavra, setPalavra] = useState<WorkerName | ''>('');
  const [textoBiblico, setTextoBiblico] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setReports(loadReports());
  }, []);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

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

  const handleSaveReport = () => {
    const isOptionalDay = dayOfWeek === 'SEG' || dayOfWeek === 'EBD';
    if (!date || !dayOfWeek || !portao || !louvor || (!isOptionalDay && !palavra)) {
      alert(`⚠️ Por favor, preencha todos os campos obrigatórios.`);
      return;
    }

    const newReport: Report = {
      id: crypto.randomUUID(),
      date,
      dayOfWeek: dayOfWeek as DayOfWeek,
      portao: portao as WorkerName,
      louvor: louvor as WorkerName,
      palavra: (palavra || 'NÃO HOUVE') as WorkerName,
      textoBiblico: textoBiblico.trim() || 'Não informado',
      timestamp: Date.now(),
    };

    setReports(prev => [newReport, ...prev]);
    setDate(getLocalDateStr(new Date()));
    setDayOfWeek('');
    setPortao('');
    setLouvor('');
    setPalavra('');
    setTextoBiblico('');
    
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
    const text = `*RELATÓRIO ICM - ${report.dayOfWeek}*\n📅 *Data:* ${formattedDate}\n🚪 *Portão:* ${report.portao}\n🎤 *Louvor:* ${report.louvor}\n${report.palavra !== 'NÃO HOUVE' ? `📖 *Palavra:* ${report.palavra}\n` : ''}📜 *Texto:* ${report.textoBiblico}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareMonth = () => {
    const months: string[] = [...new Set<string>(reports.map(r => r.date.substring(0, 7)))].sort().reverse();
    if (months.length === 0) return alert('Sem dados para compartilhar.');

    setModalTitle('Relatório Mensal');
    setModalContent(
      <div className="grid gap-4">
        {months.map(m => {
          const [year, month] = m.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' });
          return (
            <button
              key={m}
              onClick={() => {
                const monthReports = reports.filter(r => r.date.startsWith(m)).sort((a, b) => a.date.localeCompare(b.date));
                let text = `*RELATÓRIOS ICM - ${monthName.toUpperCase()} / ${year}*\n\n`;
                monthReports.forEach(r => {
                  const day = r.date.split('-')[2];
                  text += `📅 *Dia ${day} (${r.dayOfWeek}):*\n`;
                  text += `🚪 ${r.portao} | 🎤 ${r.louvor}${r.palavra !== 'NÃO HOUVE' ? ` | 📖 ${r.palavra}` : ''}\n📜 ${r.textoBiblico}\n\n`;
                });
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                setModalOpen(false);
              }}
              className="w-full py-5 bg-indigo-50 border-2 border-indigo-100 rounded-3xl text-lg font-black text-indigo-900 uppercase active:scale-95 transition-all shadow-sm"
            >
              {monthName} / {year}
            </button>
          );
        })}
      </div>
    );
    setModalOpen(true);
  };

  const showWorkerDetails = (worker: WorkerName, task: TaskCategory) => {
    const filtered = reports.filter(r => {
      if (task === 'Portão') return r.portao === worker;
      if (task === 'Louvor') return r.louvor === worker;
      if (task === 'Palavra') return r.palavra === worker && r.palavra !== 'NÃO HOUVE';
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setModalTitle(`${worker} - ${task}`);
    setModalContent(
      <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
        {filtered.length > 0 ? filtered.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
            <span className="font-black text-slate-800 text-lg">{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
            <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">{r.dayOfWeek}</span>
          </div>
        )) : <p className="text-center text-slate-400 py-4 font-bold">Nenhum registro encontrado.</p>}
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
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

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

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-40 font-sans text-slate-800">
      {/* Toast Notificação */}
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
          <div className="bg-indigo-950 text-amber-400 px-8 py-4 rounded-full shadow-2xl border border-white/10 flex items-center gap-3">
            <span className="material-icons text-2xl">verified</span>
            <span className="font-bold text-lg uppercase tracking-tight">Registro Salvo</span>
          </div>
        </div>
      )}

      {/* Header Responsivo */}
      <header className="bg-indigo-950 text-white shadow-2xl overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-16 flex items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-1 shadow-inner shrink-0">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" 
              alt="Obreiro" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-[11px] font-black tracking-[0.4em] uppercase text-indigo-300">Gestão de Obreiros</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter">SANTO ANTÔNIO II</h1>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              <span className="material-icons text-[12px] text-amber-400">equalizer</span>
              <span className="text-[10px] font-black uppercase tracking-wider">{reports.length} Cultos Registrados</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navegação Estilo Pílula Clássica */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-50">
        <div className="bg-white/90 backdrop-blur-2xl rounded-full shadow-[0_20px_50px_rgba(30,27,75,0.15)] border border-slate-200 p-2 flex items-center justify-between">
          {[
            { id: 'form', icon: 'add_circle', label: 'Novo' },
            { id: 'history', icon: 'list_alt', label: 'Histórico' },
            { id: 'availability', icon: 'hourglass_empty', label: 'Ociosidade' },
            { id: 'stats', icon: 'analytics', label: 'Ranking' },
            { id: 'backup', icon: 'settings', label: 'Ajustes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-1 rounded-full transition-all duration-300 ${
                activeTab === tab.id 
                ? 'bg-indigo-950 text-amber-400 shadow-lg scale-105' 
                : 'text-slate-400 hover:text-indigo-900'
              }`}
            >
              <span className="material-icons text-3xl">{tab.icon}</span>
              <span className="text-[10px] font-black uppercase mt-1 tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Área de Conteúdo */}
      <main className="max-w-2xl mx-auto px-5 -mt-8">
        {activeTab === 'form' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-500 space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] block text-center">Data do Culto</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-xl outline-none focus:border-indigo-600 transition-all text-center text-indigo-950 shadow-inner"
              />
              <div className="grid grid-cols-6 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button 
                    key={day} 
                    onClick={() => setDayOfWeek(day)} 
                    className={`py-4 rounded-2xl font-black text-xs transition-all border-2 ${dayOfWeek === day ? 'bg-indigo-950 text-amber-400 border-indigo-950 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map((cat) => {
                const isOptional = cat === 'Palavra' && (dayOfWeek === 'EBD' || dayOfWeek === 'SEG');
                const val = cat === 'Portão' ? portao : cat === 'Louvor' ? louvor : palavra;
                const set = cat === 'Portão' ? setPortao : cat === 'Louvor' ? setLouvor : setPalavra;

                return (
                  <div key={cat} className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-base font-black text-slate-500 uppercase tracking-widest">{cat}</label>
                      {isOptional && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase italic">Opcional</span>}
                    </div>
                    <div className="relative">
                      <select 
                        value={val} 
                        onChange={(e) => set(e.target.value as WorkerName)}
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-lg outline-none appearance-none focus:bg-white focus:border-indigo-600 transition-all text-slate-800 shadow-sm"
                      >
                        <option value="">Selecione...</option>
                        {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <span className="material-icons absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <label className="text-base font-black text-slate-500 uppercase tracking-widest px-2">Texto Bíblico / Mensagem</label>
              <textarea 
                value={textoBiblico}
                onChange={(e) => setTextoBiblico(e.target.value)}
                placeholder="Referência ou título da mensagem..."
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-medium text-lg outline-none h-32 resize-none focus:bg-white focus:border-indigo-600 transition-all text-slate-700 shadow-sm"
              />
            </div>

            <button onClick={handleSaveReport} className="w-full bg-indigo-950 text-amber-400 py-6 rounded-full font-black uppercase text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border-b-4 border-amber-600/30 mt-4">
              <span className="material-icons text-3xl">save_as</span> Confirmar Culto
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            <div className="flex gap-3">
              <div className="bg-white rounded-full p-2 shadow-xl border border-slate-200 flex-1 flex items-center gap-3 px-6">
                <span className="material-icons text-slate-300 text-2xl">search</span>
                <input 
                  type="text" 
                  placeholder="Pesquisar registros..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-4 bg-transparent outline-none font-bold text-lg text-slate-600"
                />
              </div>
              <button 
                onClick={handleShareMonth}
                className="bg-indigo-950 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all"
              >
                <span className="material-icons text-3xl">ios_share</span>
              </button>
            </div>

            <div className="space-y-6">
              {[...reports].filter(r => 
                r.portao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.louvor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.palavra.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.textoBiblico.toLowerCase().includes(searchTerm.toLowerCase())
              ).sort((a,b) => b.timestamp - a.timestamp).map(report => (
                <div key={report.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden group animate-in slide-in-from-left-4">
                  <div className="absolute top-0 left-0 w-2 h-full bg-indigo-900"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 block">{report.dayOfWeek}</span>
                      <h3 className="text-2xl font-black text-slate-800">{new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR')}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleShareWhatsApp(report)} className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"><span className="material-icons text-2xl">share</span></button>
                      <button onClick={() => confirm('Apagar permanentemente?') && setReports(prev => prev.filter(r => r.id !== report.id))} className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><span className="material-icons text-2xl">delete_outline</span></button>
                    </div>
                  </div>
                  <div className="grid gap-4 bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white text-indigo-900 flex items-center justify-center shadow-sm"><span className="material-icons text-xl">door_front</span></div>
                      <span className="text-lg font-black text-slate-700">{report.portao}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white text-indigo-900 flex items-center justify-center shadow-sm"><span className="material-icons text-xl">lyrics</span></div>
                      <span className="text-lg font-black text-slate-700">{report.louvor}</span>
                    </div>
                    {report.palavra !== 'NÃO HOUVE' && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white text-indigo-900 flex items-center justify-center shadow-sm"><span className="material-icons text-xl">menu_book</span></div>
                        <span className="text-lg font-black text-slate-700">{report.palavra}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 px-2 text-lg italic text-slate-500 font-medium border-l-4 border-slate-200 pl-4">
                    "{report.textoBiblico}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            <h2 className="text-[11px] font-black text-slate-400 uppercase text-center tracking-[0.5em] mb-8">Controle de Ociosidade</h2>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="bg-white rounded-[2rem] shadow-lg border border-slate-200 overflow-hidden mb-4">
                <button 
                  onClick={() => toggleDay(day)}
                  className={`w-full px-8 py-7 flex items-center justify-between transition-all ${expandedDays.has(day) ? 'bg-indigo-950 text-white' : 'bg-white text-slate-800'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`material-icons text-3xl ${expandedDays.has(day) ? 'text-amber-400' : 'text-indigo-600'}`}>calendar_month</span>
                    <span className="font-black text-xl uppercase tracking-widest">{day}</span>
                  </div>
                  <span className={`material-icons text-2xl transition-transform duration-300 ${expandedDays.has(day) ? 'rotate-180' : ''}`}>expand_circle_down</span>
                </button>
                
                {expandedDays.has(day) && (
                  <div className="p-6 space-y-6 bg-slate-50/50">
                    {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map(task => {
                      if (task === 'Palavra' && (day === 'EBD' || day === 'SEG')) return null;

                      const taskKey = `${day}-${task}`;
                      const isExpanded = expandedTasks.has(taskKey);

                      return (
                        <div key={task} className="border-b border-slate-200 last:border-0 pb-4 last:pb-0">
                          <button 
                            onClick={() => toggleTask(day, task)}
                            className="w-full flex items-center justify-between py-2"
                          >
                            <span className="text-indigo-900 font-black text-base uppercase tracking-widest">{task}</span>
                            <span className={`material-icons text-indigo-200 text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>stat_minus_1</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="space-y-2 mt-4 animate-in slide-in-from-top-2">
                              {availabilityData[day][task].map((w) => {
                                const isUrgent = w.daysSince > 21 || w.daysSince === Infinity;
                                return (
                                  <div key={w.name} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex flex-col">
                                      <span className="font-black text-lg text-slate-800">{w.name}</span>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                        {w.lastDate ? `FUNÇÃO EXECUTADA EM: ${w.lastDate.toLocaleDateString('pt-BR')}` : 'Sem registros'}
                                      </span>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase ${w.daysSince === Infinity ? 'bg-indigo-900 text-white' : isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
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

        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in fade-in duration-300 pb-10">
            <h2 className="text-center text-sm font-black text-slate-400 uppercase tracking-[0.4em]">Ranking de Atividades</h2>
            <div className="grid gap-6">
              {WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE' && w !== 'NÃO HOUVE').map(worker => {
                const s = workerStats[worker];
                const total = s.portao + s.louvor + s.palavra;
                return (
                  <div key={worker} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 bg-indigo-950 text-white flex justify-between items-center">
                      <span className="font-black text-xl tracking-tight uppercase">{worker}</span>
                      <div className="bg-amber-400 text-indigo-950 px-5 py-2 rounded-full font-black text-sm border-2 border-white/20">
                        {total} ATOS
                      </div>
                    </div>
                    <div className="p-6 grid grid-cols-3 gap-4 bg-slate-50/30">
                      {[
                        { label: 'Portão', value: s.portao, color: 'sky' },
                        { label: 'Louvor', value: s.louvor, color: 'violet' },
                        { label: 'Palavra', value: s.palavra, color: 'amber' }
                      ].map(item => (
                        <button 
                          key={item.label} 
                          onClick={() => showWorkerDetails(worker, item.label as TaskCategory)}
                          className="bg-white p-4 rounded-3xl border border-slate-100 flex flex-col items-center shadow-sm active:scale-95 transition-all"
                        >
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{item.label}</span>
                          <span className={`text-2xl font-black text-${item.color}-600`}>{item.value}</span>
                          <span className="material-icons text-[12px] text-slate-300 mt-1">history</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-white rounded-[3rem] shadow-2xl p-10 space-y-12 animate-in zoom-in-95 duration-300 border border-slate-100 mb-10 text-center">
            <div className="space-y-4">
              <div className="inline-block p-8 bg-indigo-50 rounded-[2.5rem] mb-2 text-indigo-600 shadow-inner">
                <span className="material-icons text-6xl">settings_suggest</span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tighter">AJUSTES</h2>
              <p className="text-base font-bold text-slate-400 max-w-[240px] mx-auto leading-relaxed">Gerencie a segurança dos seus dados e realize backups periódicos.</p>
            </div>
            
            <div className="grid gap-4">
              <button onClick={() => exportData(reports)} className="w-full bg-indigo-950 text-amber-400 py-6 rounded-full font-black text-xl flex items-center justify-center gap-4 uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
                <span className="material-icons text-3xl">cloud_download</span> Exportar Dados
              </button>
              <label className="w-full bg-white text-indigo-900 py-6 rounded-full font-black text-xl flex items-center justify-center gap-4 border-2 border-indigo-100 cursor-pointer uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-md">
                <span className="material-icons text-3xl">cloud_upload</span> Restaurar Backup
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>
              
              <div className="pt-10 border-t border-slate-100 mt-6">
                <button onClick={() => confirm('Apagar todo o histórico local?') && setReports([])} className="w-full text-rose-500 py-4 text-sm font-black uppercase tracking-[0.3em] border-2 border-rose-50 rounded-full hover:bg-rose-50 transition-all">
                  Redefinir Aplicativo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.6em] pb-40 px-12 leading-relaxed opacity-50">
        ICM SANTO ANTÔNIO II • GESTÃO DE OBREIROS
      </footer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>{modalContent}</Modal>
    </div>
  );
};

export default App;
