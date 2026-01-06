import React, { useState, useEffect, useMemo } from 'react';
import { WORKERS, DAYS_OF_WEEK } from './constants';
import { Report, WorkerName, DayOfWeek, TaskCategory } from './types';
import { loadReports, saveReports, exportData, importData } from './utils/storage';
import Modal from './components/Modal';

const App: React.FC = () => {
  // Função robusta para pegar a data local YYYY-MM-DD sem erros de fuso
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'stats' | 'backup'>('form');
  const [showToast, setShowToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    setReports(loadReports());
  }, []);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const handleSaveReport = () => {
    const isSegunda = dayOfWeek === 'SEG';
    if (!date || !dayOfWeek || !portao || !louvor || (!isSegunda && !palavra)) {
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

  const handleDeleteReport = (id: string) => {
    if (confirm('Deseja apagar este registro do histórico?')) {
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

  const handleBackup = () => exportData(reports);
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importData(file);
      if (confirm('Restaurar dados de backup? Isso substituirá o histórico local.')) {
        setReports(data);
        alert('Dados restaurados com sucesso!');
      }
    } catch (err) { alert('Erro ao importar arquivo.'); }
    e.target.value = '';
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

  const consultHistory = (worker: WorkerName | '', category: TaskCategory) => {
    if (!worker) return;
    const history = reports.filter(r => {
      if (category === 'Portão') return r.portao === worker;
      if (category === 'Louvor') return r.louvor === worker;
      if (category === 'Palavra') return r.palavra === worker;
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setModalTitle(`${worker}`);
    setModalContent(
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{category}</span>
          <span className="bg-indigo-900 text-yellow-400 px-4 py-2 rounded-xl text-base font-black">{history.length} VEZES</span>
        </div>
        <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1">
          {history.length > 0 ? history.map(h => (
            <div key={h.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xl font-black text-slate-800">
              <span>{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              <span className="text-xs bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 uppercase text-indigo-900">{h.dayOfWeek}</span>
            </div>
          )) : <p className="text-slate-400 text-center py-10 text-lg font-bold">Nenhum registro encontrado.</p>}
        </div>
      </div>
    );
    setModalOpen(true);
  };

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
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900">
      {showToast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-green-600 text-white px-12 py-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-5 border-4 border-white animate-in zoom-in-90">
            <span className="material-icons text-8xl">verified</span>
            <span className="font-black text-2xl uppercase tracking-[0.1em] text-center">Salvo no Histórico!</span>
          </div>
        </div>
      )}

      <header className="bg-indigo-950 text-white shadow-2xl sticky top-0 z-40">
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-800 rounded-2xl flex items-center justify-center shadow-lg border border-indigo-700 overflow-hidden">
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="ID" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">ICM SANTO ANTÔNIO II</h1>
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">Gestão Ministerial</p>
            </div>
          </div>
        </div>
        <nav className="flex bg-indigo-900/50 backdrop-blur-md">
          {[
            { id: 'form', icon: 'edit_calendar', label: 'NOVO' },
            { id: 'history', icon: 'format_list_bulleted', label: 'HISTÓRICO' },
            { id: 'stats', icon: 'leaderboard', label: 'RESUMO' },
            { id: 'backup', icon: 'tune', label: 'SISTEMA' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-5 flex flex-col items-center gap-2 transition-all border-b-[6px] ${
                activeTab === tab.id ? 'border-yellow-400 text-yellow-400 bg-indigo-950 shadow-inner' : 'border-transparent text-indigo-400 opacity-60'
              }`}
            >
              <span className="material-icons text-3xl">{tab.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-md mx-auto px-5 mt-10">
        {activeTab === 'form' && (
          <div className="bg-white rounded-[3rem] shadow-2xl p-8 space-y-10 border border-slate-100 animate-in slide-in-from-bottom-5 duration-500">
            <div className="space-y-5">
              <label className="text-sm font-black text-indigo-950 uppercase block tracking-widest ml-1">Data do Culto</label>
              <div className="grid grid-cols-1 gap-5">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-2xl outline-none focus:border-indigo-600 transition-all shadow-inner text-center text-indigo-950"
                />
                <div className="flex gap-4">
                  <button onClick={() => setDate(getLocalDateStr(new Date()))} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-md ${date === getLocalDateStr(new Date()) ? 'bg-indigo-700 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-500'}`}>Hoje</button>
                  <button onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(getLocalDateStr(d));
                  }} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-md ${date !== getLocalDateStr(new Date()) ? 'bg-indigo-700 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-500'}`}>Ontem</button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2.5 mt-4">
                {DAYS_OF_WEEK.map(day => (
                  <button 
                    key={day} 
                    onClick={() => setDayOfWeek(day)} 
                    className={`py-4 rounded-xl font-black text-sm border-2 transition-all ${dayOfWeek === day ? 'bg-indigo-900 text-yellow-400 border-indigo-900 shadow-xl scale-110' : 'bg-white text-slate-400 border-slate-100'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {(['Portão', 'Louvor', 'Palavra'] as TaskCategory[]).map((cat) => {
              const val = cat === 'Portão' ? portao : cat === 'Louvor' ? louvor : palavra;
              const set = cat === 'Portão' ? setPortao : cat === 'Louvor' ? setLouvor : setPalavra;
              const isOptional = cat === 'Palavra' && dayOfWeek === 'SEG';

              return (
                <div key={cat} className="space-y-4">
                  <label className="text-sm font-black text-indigo-950 uppercase block tracking-widest ml-1">
                    {cat} {isOptional && <span className="text-[11px] opacity-60 lowercase italic font-bold">(opcional)</span>}
                  </label>
                  <select 
                    value={val} 
                    onChange={(e) => set(e.target.value as WorkerName)}
                    className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl outline-none focus:border-indigo-600 shadow-inner appearance-none transition-all text-indigo-950"
                  >
                    <option value="">Selecione...</option>
                    {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              );
            })}

            <div className="space-y-4">
              <label className="text-sm font-black text-indigo-950 uppercase block tracking-widest ml-1">Texto / Mensagem Bíblica</label>
              <textarea 
                value={textoBiblico}
                onChange={(e) => setTextoBiblico(e.target.value)}
                placeholder="Ex: Salmos 23:1-4"
                className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl font-bold text-xl outline-none h-40 shadow-inner resize-none focus:border-indigo-600 transition-all text-slate-700"
              />
            </div>

            <button onClick={handleSaveReport} className="w-full bg-green-600 text-white py-8 rounded-3xl font-black uppercase text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-5 mt-6 border-b-8 border-green-800">
              <span className="material-icons text-4xl">add_task</span> Salvar Escala
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar por obreiro ou texto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-6 bg-white rounded-[2rem] font-bold text-xl outline-none shadow-xl border border-slate-200"
              />
              <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-3xl">search</span>
            </div>

            <div className="space-y-8 relative">
              <div className="absolute left-10 top-0 bottom-0 w-1 bg-slate-200 -z-10 rounded-full"></div>
              {filteredReports.map(report => (
                <div key={report.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden ml-4">
                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                    <div className="flex flex-col">
                      <span className="font-black text-2xl text-indigo-950">{new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-sm font-black text-indigo-600 uppercase tracking-[0.3em]">{report.dayOfWeek}</span>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleShareWhatsApp(report)} className="w-14 h-14 flex items-center justify-center text-emerald-600 bg-white rounded-2xl shadow-sm border border-emerald-100 active:scale-90 transition-all"><span className="material-icons text-3xl">share</span></button>
                      <button onClick={() => handleDeleteReport(report.id)} className="w-14 h-14 flex items-center justify-center text-rose-500 bg-white rounded-2xl shadow-sm border border-rose-100 active:scale-90 transition-all"><span className="material-icons text-3xl">delete</span></button>
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-800"><span className="material-icons text-2xl">door_front</span></div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Portão</span>
                        <span className="font-black text-slate-900 text-xl">{report.portao}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-800"><span className="material-icons text-2xl">mic</span></div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Louvor</span>
                        <span className="font-black text-slate-900 text-xl">{report.louvor}</span>
                      </div>
                    </div>
                    {report.palavra !== 'NÃO HOUVE' && (
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800"><span className="material-icons text-2xl">menu_book</span></div>
                        <div className="flex flex-col">
                          <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Palavra</span>
                          <span className="font-black text-slate-900 text-xl">{report.palavra}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 p-6 bg-slate-50 rounded-3xl border-l-8 border-indigo-400">
                      <p className="text-slate-600 font-bold text-lg leading-relaxed italic">
                        "{report.textoBiblico}"
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-10 animate-in fade-in duration-300 mb-10">
            <h2 className="text-base font-black text-slate-500 uppercase px-1 tracking-[0.4em] text-center">Desempenho por Obreiro</h2>
            <div className="grid gap-8">
              {WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE' && w !== 'NÃO HOUVE').map(worker => {
                const s = workerStats[worker];
                const total = s.portao + s.louvor + s.palavra;
                return (
                  <div key={worker} className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
                    <div className="px-10 py-6 bg-indigo-950 text-white flex justify-between items-center">
                      <span className="font-black text-xl uppercase tracking-tight">{worker}</span>
                      <span className="text-xs font-black bg-yellow-400 text-indigo-950 px-5 py-2.5 rounded-full shadow-lg border-2 border-white/20">{total} ATOS</span>
                    </div>
                    <div className="p-6 grid grid-cols-3 gap-5">
                      <button onClick={() => consultHistory(worker, 'Portão')} className="bg-sky-50 p-6 rounded-[2rem] border-2 border-sky-200 flex flex-col items-center active:scale-95 transition-all shadow-sm">
                        <span className="text-[10px] font-black text-sky-700 uppercase mb-2">Portão</span>
                        <span className="text-3xl font-black text-sky-950">{s.portao}</span>
                      </button>
                      <button onClick={() => consultHistory(worker, 'Louvor')} className="bg-violet-50 p-6 rounded-[2rem] border-2 border-violet-200 flex flex-col items-center active:scale-95 transition-all shadow-sm">
                        <span className="text-[10px] font-black text-violet-700 uppercase mb-2">Louvor</span>
                        <span className="text-3xl font-black text-violet-950">{s.louvor}</span>
                      </button>
                      <button onClick={() => consultHistory(worker, 'Palavra')} className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-200 flex flex-col items-center active:scale-95 transition-all shadow-sm">
                        <span className="text-[10px] font-black text-amber-800 uppercase mb-2">Palavra</span>
                        <span className="text-3xl font-black text-amber-950">{s.palavra}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 space-y-12 animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="text-center space-y-5">
              <div className="inline-block p-8 bg-indigo-50 rounded-[2.5rem] mb-2 shadow-inner">
                <span className="material-icons text-8xl text-indigo-400">admin_panel_settings</span>
              </div>
              <h2 className="text-4xl font-black text-indigo-950 uppercase tracking-tight">Sistema</h2>
              <p className="text-base font-bold text-slate-400 px-4 leading-relaxed">Proteja seus dados. Exporte o backup regularmente para evitar perdas.</p>
            </div>
            <div className="space-y-6">
              <button onClick={handleBackup} className="w-full bg-slate-900 text-white py-7 rounded-3xl font-black text-xl flex items-center justify-center gap-5 uppercase tracking-widest shadow-2xl active:scale-95 transition-all border-b-8 border-black">
                <span className="material-icons text-3xl">cloud_download</span> Exportar Dados
              </button>
              <label className="w-full bg-indigo-50 text-indigo-900 py-7 rounded-3xl font-black text-xl flex items-center justify-center gap-5 border-4 border-indigo-200 cursor-pointer uppercase tracking-widest active:scale-95 transition-all shadow-xl">
                <span className="material-icons text-3xl">cloud_upload</span> Restaurar
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>
              <div className="pt-14 border-t-2 border-slate-100">
                <button onClick={() => confirm('CUIDADO! Isso apagará TODO o histórico. Confirmar?') && setReports([])} className="w-full text-rose-600 py-6 text-sm font-black uppercase tracking-[0.3em] border-2 border-rose-100 rounded-[2rem] hover:bg-rose-50 transition-all active:bg-rose-100">
                  Resetar Aplicativo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-24 text-center text-slate-400 font-black text-sm uppercase tracking-[0.5em] pb-20 px-10 leading-relaxed opacity-40">
        ICM SANTO ANTÔNIO II<br/>RELATÓRIO DE CULTO
      </footer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>{modalContent}</Modal>
    </div>
  );
};

export default App;