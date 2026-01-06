
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
  
  // Estados para acordeão na aba Ociosidade
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
      alert(`⚠️ Por favor, preencha os campos obrigatórios.`);
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

  const handleDeleteReport = (id: string) => {
    if (confirm('Deseja apagar este registro?')) {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleShareWhatsApp = (report: Report) => {
    const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const text = `*RELATÓRIO DE CULTO - ${report.dayOfWeek}*\n` +
                 `📅 *Data:* ${formattedDate}\n` +
                 `🚪 *Portão:* ${report.portao}\n` +
                 `🎤 *Louvor:* ${report.louvor}\n` +
                 (report.palavra !== 'NÃO HOUVE' ? `📖 *Palavra:* ${report.palavra}\n` : '') +
                 `📜 *Texto:* ${report.textoBiblico}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareMonth = () => {
    const months = Array.from(new Set(reports.map(r => r.date.substring(0, 7)))).sort().reverse();
    if (months.length === 0) return alert('Nenhum dado para compartilhar.');

    setModalTitle('Relatório Mensal');
    setModalContent(
      <div className="grid gap-3">
        {months.map((m: string) => {
          const [year, month] = m.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' });
          return (
            <button
              key={m}
              onClick={() => {
                const monthReports = reports.filter(r => r.date.startsWith(m)).sort((a, b) => a.date.localeCompare(b.date));
                let text = `*RELATÓRIOS DE ${monthName.toUpperCase()} / ${year}*\n\n`;
                monthReports.forEach(r => {
                  const day = r.date.split('-')[2];
                  text += `📅 *Dia ${day} (${r.dayOfWeek}):*\n`;
                  text += `🚪 ${r.portao} | 🎤 ${r.louvor}${r.palavra !== 'NÃO HOUVE' ? ` | 📖 ${r.palavra}` : ''}\n`;
                  text += `📜 ${r.textoBiblico}\n\n`;
                });
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                setModalOpen(false);
              }}
              className="w-full py-5 bg-indigo-50 border border-indigo-100 rounded-xl text-lg font-black text-indigo-900 uppercase active:scale-95 transition-all"
            >
              {monthName} / {year}
            </button>
          );
        })}
      </div>
    );
    setModalOpen(true);
  };

  const handleBackup = () => exportData(reports);
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importData(file);
        setReports(imported);
        alert('Backup restaurado!');
      } catch (err) { alert('Erro no backup.'); }
    }
  };

  const filteredReports = useMemo(() => {
    const sorted = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!searchTerm) return sorted;
    const lowerSearch = searchTerm.toLowerCase();
    return sorted.filter(r => 
      r.portao.toLowerCase().includes(lowerSearch) ||
      r.louvor.toLowerCase().includes(lowerSearch) ||
      r.palavra.toLowerCase().includes(lowerSearch) ||
      r.textoBiblico.toLowerCase().includes(lowerSearch) ||
      r.date.includes(lowerSearch) ||
      r.dayOfWeek.toLowerCase().includes(lowerSearch)
    );
  }, [reports, searchTerm]);

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

          return {
            name: w,
            lastDate: lastExec ? new Date(lastExec.date + 'T00:00:00') : null,
            daysSince: daysSince
          };
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
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900">
      {!isOnline && (
        <div className="bg-rose-600 text-white text-center py-2 font-black text-[10px] uppercase tracking-widest sticky top-0 z-[60] shadow-md">
          Conexão Offline - Dados salvos localmente
        </div>
      )}

      {showToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-950/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-green-600 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border-2 border-white animate-in zoom-in-95">
            <span className="material-icons text-5xl">check_circle</span>
            <span className="font-black text-base uppercase tracking-wider text-center">Relatório Salvo!</span>
          </div>
        </div>
      )}

      {/* Header Fixo no Topo */}
      <header className="bg-indigo-950 text-white shadow-xl sticky top-0 z-40">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-800 rounded-xl flex items-center justify-center border border-indigo-700">
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="ID" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-tight leading-none">SANTO ANTÔNIO II</h1>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-0.5">Gestão Ministerial</p>
          </div>
        </div>
      </header>

      {/* Navegação Inferior Fixa */}
      <nav className="fixed bottom-0 left-0 right-0 bg-indigo-950/90 backdrop-blur-lg border-t border-indigo-800 z-50 flex items-center justify-around pb-safe px-2">
        {[
          { id: 'form', icon: 'add_circle', label: 'NOVO' },
          { id: 'history', icon: 'list_alt', label: 'HISTÓRICO' },
          { id: 'availability', icon: 'hourglass_empty', label: 'OCIOSIDADE' },
          { id: 'stats', icon: 'analytics', label: 'RESUMO' },
          { id: 'backup', icon: 'settings', label: 'SISTEMA' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 py-3 px-1 transition-all flex-1 min-w-0 ${
              activeTab === tab.id ? 'text-yellow-400 scale-110' : 'text-indigo-400 opacity-60'
            }`}
          >
            <span className="material-icons text-2xl">{tab.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter truncate w-full text-center">{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-md mx-auto px-4 mt-6">
        {activeTab === 'form' && (
          <div className="bg-white rounded-3xl shadow-md p-6 space-y-6 border border-slate-100 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <label className="text-xs font-black text-indigo-950 uppercase block tracking-wider text-center">Data do Culto</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-lg outline-none focus:border-indigo-600 shadow-inner text-center"
              />
              <div className="flex gap-2">
                <button onClick={() => setDate(getLocalDateStr(new Date()))} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${date === getLocalDateStr(new Date()) ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'}`}>Hoje</button>
                <button onClick={() => {
                  const d = new Date(); d.setDate(d.getDate() - 1);
                  setDate(getLocalDateStr(d));
                }} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${date !== getLocalDateStr(new Date()) ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'}`}>Ontem</button>
              </div>
              <div className="grid grid-cols-6 gap-1.5 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <button key={day} onClick={() => setDayOfWeek(day)} className={`py-2.5 rounded-lg font-black text-[10px] border-2 transition-all ${dayOfWeek === day ? 'bg-indigo-900 text-yellow-400 border-indigo-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{day}</button>
                ))}
              </div>
            </div>

            {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map((cat) => {
              const isOptionalDay = cat === 'Palavra' && (dayOfWeek === 'EBD' || dayOfWeek === 'SEG');
              const val = cat === 'Portão' ? portao : cat === 'Louvor' ? louvor : palavra;
              const set = cat === 'Portão' ? setPortao : cat === 'Louvor' ? setLouvor : setPalavra;

              return (
                <div key={cat} className="space-y-2">
                  <label className="text-[11px] font-black text-indigo-950 uppercase block tracking-widest ml-1">
                    {cat} {isOptionalDay && <span className="text-[9px] opacity-50 italic lowercase font-bold">(opcional)</span>}
                  </label>
                  <select 
                    value={val} 
                    onChange={(e) => set(e.target.value as WorkerName)}
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-indigo-600 appearance-none text-indigo-950"
                  >
                    <option value="">Selecione o obreiro...</option>
                    {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              );
            })}

            <div className="space-y-2">
              <label className="text-[11px] font-black text-indigo-950 uppercase block tracking-widest ml-1">Texto Bíblico / Mensagem</label>
              <textarea 
                value={textoBiblico}
                onChange={(e) => setTextoBiblico(e.target.value)}
                placeholder="Ex: Salmos 119:105"
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-base outline-none h-28 resize-none focus:border-indigo-600 text-slate-700"
              />
            </div>

            <button onClick={handleSaveReport} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 border-b-4 border-green-800">
              <span className="material-icons">save</span> Salvar Registro
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Pesquisar..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl font-bold text-sm outline-none shadow-sm border border-slate-200"
                />
                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              </div>
              <button onClick={handleShareMonth} className="bg-indigo-900 text-white px-4 rounded-2xl shadow-sm active:scale-95 transition-all">
                <span className="material-icons text-xl">ios_share</span>
              </button>
            </div>

            <div className="space-y-4">
              {filteredReports.map(report => (
                <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-50 flex justify-between items-center bg-indigo-50/20">
                    <div className="flex flex-col">
                      <span className="font-black text-base text-indigo-950">{new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{report.dayOfWeek}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleShareWhatsApp(report)} className="w-9 h-9 flex items-center justify-center text-emerald-600 bg-white rounded-lg border border-emerald-50"><span className="material-icons text-lg">share</span></button>
                      <button onClick={() => handleDeleteReport(report.id)} className="w-9 h-9 flex items-center justify-center text-rose-500 bg-white rounded-lg border border-rose-50"><span className="material-icons text-lg">delete</span></button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-black uppercase text-[8px] tracking-widest">Portão</span>
                      <span className="font-black text-slate-800">{report.portao}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-black uppercase text-[8px] tracking-widest">Louvor</span>
                      <span className="font-black text-slate-800">{report.louvor}</span>
                    </div>
                    {report.palavra !== 'NÃO HOUVE' && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-black uppercase text-[8px] tracking-widest">Palavra</span>
                        <span className="font-black text-slate-800">{report.palavra}</span>
                      </div>
                    )}
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border-l-4 border-indigo-400">
                      <p className="text-slate-600 font-bold text-xs leading-relaxed italic line-clamp-2">"{report.textoBiblico}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-4 animate-in fade-in duration-300 mb-10">
            <h2 className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-[0.2em] text-center">Controle de Ociosidade</h2>
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button 
                  onClick={() => toggleDay(day)}
                  className="w-full px-5 py-3 bg-indigo-950 text-white flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-lg text-yellow-400">calendar_today</span>
                    <span className="font-black text-sm uppercase tracking-widest">{day}</span>
                  </div>
                  <span className={`material-icons text-sm transition-transform ${expandedDays.has(day) ? 'rotate-180' : 'rotate-0'}`}>expand_more</span>
                </button>
                
                {expandedDays.has(day) && (
                  <div className="p-3 space-y-4 bg-slate-50/30">
                    {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map(task => {
                      // Ocultar subitem 'Palavra' na aba Ociosidade para os dias EBD e SEG
                      const skipPalavraInAvailability = task === 'Palavra' && (day === 'EBD' || day === 'SEG');
                      if (skipPalavraInAvailability) return null;

                      const taskKey = `${day}-${task}`;
                      const isExpanded = expandedTasks.has(taskKey);

                      return (
                        <div key={task} className="border-b border-slate-100 last:border-0 pb-2">
                          <button 
                            onClick={() => toggleTask(day, task)}
                            className="w-full flex items-center justify-between py-1"
                          >
                            <span className="text-indigo-900 font-black text-[11px] uppercase tracking-wider">{task}</span>
                            <span className={`material-icons text-indigo-300 text-sm transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>keyboard_arrow_down</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="space-y-1.5 mt-2">
                              {availabilityData[day][task].map((w) => (
                                <div key={w.name} className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-slate-100 shadow-xs">
                                  <div className="flex flex-col">
                                    <span className="font-black text-xs text-slate-800">{w.name}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                      {w.lastDate ? `Em: ${w.lastDate.toLocaleDateString('pt-BR')}` : 'Sem registro neste dia'}
                                    </span>
                                  </div>
                                  <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${w.daysSince === Infinity ? 'bg-indigo-900 text-white' : 'bg-yellow-400 text-indigo-950'}`}>
                                    {w.daysSince === Infinity ? 'Inédito' : `${w.daysSince}d`}
                                  </div>
                                </div>
                              ))}
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
          <div className="space-y-5 animate-in fade-in duration-300 mb-10">
            <h2 className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-[0.2em] text-center">Estatísticas Gerais</h2>
            <div className="grid gap-4">
              {WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE' && w !== 'NÃO HOUVE').map(worker => {
                const s = workerStats[worker];
                const total = s.portao + s.louvor + s.palavra;
                return (
                  <div key={worker} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-3 bg-indigo-950 text-white flex justify-between items-center">
                      <span className="font-black text-sm uppercase tracking-tight">{worker}</span>
                      <span className="text-[9px] font-black bg-yellow-400 text-indigo-950 px-2.5 py-1 rounded-full border border-white/10">{total} ATOS</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2 bg-slate-50/50">
                      <div className="bg-white p-2 rounded-xl border border-sky-50 flex flex-col items-center">
                        <span className="text-[7px] font-black text-sky-700 uppercase mb-0.5">Portão</span>
                        <span className="text-base font-black text-sky-950">{s.portao}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-violet-50 flex flex-col items-center">
                        <span className="text-[7px] font-black text-violet-700 uppercase mb-0.5">Louvor</span>
                        <span className="text-base font-black text-violet-950">{s.louvor}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-amber-50 flex flex-col items-center">
                        <span className="text-[7px] font-black text-amber-800 uppercase mb-0.5">Palavra</span>
                        <span className="text-base font-black text-amber-950">{s.palavra}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-white rounded-3xl shadow-md p-8 space-y-8 animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="text-center space-y-3">
              <div className="inline-block p-5 bg-indigo-50 rounded-2xl mb-1">
                <span className="material-icons text-4xl text-indigo-400">admin_panel_settings</span>
              </div>
              <h2 className="text-xl font-black text-indigo-950 uppercase">Sistema</h2>
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed">Gerencie os dados e realize cópias de segurança.</p>
            </div>
            <div className="space-y-3">
              <button onClick={handleBackup} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 uppercase tracking-widest shadow-md active:scale-95 transition-all border-b-4 border-black">
                <span className="material-icons text-xl">file_download</span> Exportar Backup
              </button>
              <label className="w-full bg-indigo-50 text-indigo-900 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-3 border-2 border-indigo-200 cursor-pointer uppercase tracking-widest active:scale-95 transition-all shadow-sm">
                <span className="material-icons text-xl">file_upload</span> Importar Backup
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>
              <div className="pt-8 border-t border-slate-100">
                <button onClick={() => confirm('APAGAR TUDO?') && setReports([])} className="w-full text-rose-600 py-3 text-[10px] font-black uppercase tracking-[0.2em] border border-rose-100 rounded-xl hover:bg-rose-50 transition-all">
                  Limpar Histórico Local
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-slate-300 font-black text-[9px] uppercase tracking-[0.4em] pb-32 px-8 leading-relaxed opacity-40">
        ICM SANTO ANTÔNIO II<br/>RELATÓRIO DE CULTO
      </footer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>{modalContent}</Modal>
    </div>
  );
};

export default App;
