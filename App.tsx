import React, { useState, useEffect, useMemo } from 'react';
import { WORKERS, DAYS_OF_WEEK } from './constants';
import { Report, WorkerName, DayOfWeek, TaskCategory } from './types';
import { loadReports, saveReports, exportData, importData } from './utils/storage';
import Modal from './components/Modal';

const App: React.FC = () => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'stats' | 'backup'>('form');
  const [showToast, setShowToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [shareMonth, setShareMonth] = useState(new Date().getMonth());
  const [shareYear, setShareYear] = useState(new Date().getFullYear());

  const [date, setDate] = useState(getTodayStr());
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
      alert(`⚠️ Por favor, preencha os campos obrigatórios (Data, Dia e Obreiros).`);
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
    setDate(getTodayStr());
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
    if (!worker) return alert('Selecione o obreiro para consultar.');
    const history = reports.filter(r => {
      if (category === 'Portão') return r.portao === worker;
      if (category === 'Louvor') return r.louvor === worker;
      if (category === 'Palavra') return r.palavra === worker;
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setModalTitle(`${worker}`);
    setModalContent(
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarefa: {category}</span>
          <span className="bg-indigo-900 text-yellow-400 px-3 py-1 rounded-lg text-[10px] font-black">{history.length} VEZES</span>
        </div>
        <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-1">
          {history.length > 0 ? history.map(h => (
            <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              <span className="font-black text-slate-700">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
              <span className="text-[9px] bg-indigo-50 px-2 py-1 rounded border font-black uppercase text-indigo-600">{h.dayOfWeek}</span>
            </div>
          )) : <p className="text-gray-400 text-center py-6 text-sm font-bold">Nenhum registro encontrado.</p>}
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
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {showToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-in zoom-in-95 duration-300">
          <div className="bg-green-600 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 border-4 border-white">
            <span className="material-icons text-4xl">check_circle</span>
            <span className="font-black text-sm uppercase tracking-widest">Salvo com Sucesso!</span>
          </div>
        </div>
      )}

      <header className="bg-indigo-900 text-white shadow-xl sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-800 rounded-xl flex items-center justify-center shadow-lg border border-indigo-700 overflow-hidden">
              <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="ID Obreiro" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">ICM SANTO ANTÔNIO II</h1>
              <p className="text-[9px] text-indigo-300 font-black uppercase tracking-[0.2em]">Gestão de Obreiros</p>
            </div>
          </div>
          <div className="text-[9px] font-black bg-indigo-950 px-3 py-1.5 rounded-full uppercase border border-indigo-800">{reports.length} CULTOS</div>
        </div>
        <nav className="flex bg-indigo-950">
          {[
            { id: 'form', icon: 'add_circle', label: 'NOVO' },
            { id: 'history', icon: 'history', label: 'HISTÓRICO' },
            { id: 'stats', icon: 'analytics', label: 'RESUMO' },
            { id: 'backup', icon: 'settings', label: 'SISTEMA' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all border-b-4 ${
                activeTab === tab.id ? 'border-yellow-400 text-yellow-400 bg-indigo-900' : 'border-transparent text-indigo-400 opacity-60'
              }`}
            >
              <span className="material-icons text-xl">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        {activeTab === 'form' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 border border-slate-100 animate-in fade-in duration-500">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-indigo-900 uppercase block tracking-widest ml-1">Data e Dia</label>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner"
                />
                <div className="flex gap-2">
                  <button onClick={() => setDate(getTodayStr())} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${date === getTodayStr() ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Hoje</button>
                  <button onClick={() => setDate(getYesterdayStr())} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${date === getYesterdayStr() ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Ontem</button>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1.5 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <button 
                    key={day} 
                    onClick={() => setDayOfWeek(day)} 
                    className={`py-2 rounded-lg font-black text-[10px] border-2 transition-all ${dayOfWeek === day ? 'bg-indigo-900 text-yellow-400 border-indigo-900' : 'bg-white text-slate-400 border-slate-100'}`}
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
                <div key={cat} className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-900 uppercase block tracking-widest ml-1">
                    {cat} {isOptional && <span className="text-[8px] opacity-50 lowercase italic">(opc)</span>}
                  </label>
                  <div className="flex gap-2">
                    <select 
                      value={val} 
                      onChange={(e) => set(e.target.value as WorkerName)}
                      className="flex-1 p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-xs outline-none focus:border-indigo-500 shadow-inner"
                    >
                      <option value="">Selecione...</option>
                      {WORKERS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <button onClick={() => consultHistory(val as any, cat)} className="bg-indigo-50 text-indigo-700 px-4 rounded-xl border border-indigo-100 active:scale-90 transition-all">
                      <span className="material-icons text-lg">history</span>
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-900 uppercase block tracking-widest ml-1">Texto / Mensagem</label>
              <textarea 
                value={textoBiblico}
                onChange={(e) => setTextoBiblico(e.target.value)}
                placeholder="Ex: Salmos 23"
                className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs outline-none h-20 shadow-inner resize-none focus:border-indigo-500 transition-all"
              />
            </div>

            <button onClick={handleSaveReport} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
              <span className="material-icons">check</span> Salvar Relatório
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar no histórico..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-white rounded-2xl font-bold text-xs outline-none shadow-md border border-slate-100"
              />
              <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            </div>

            <div className="space-y-4">
              {filteredReports.map(report => (
                <div key={report.id} className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex flex-col">
                      <span className="font-black text-xs text-slate-900">{new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{report.dayOfWeek}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleShareWhatsApp(report)} className="w-8 h-8 flex items-center justify-center text-emerald-600"><span className="material-icons text-lg">share</span></button>
                      <button onClick={() => handleDeleteReport(report.id)} className="w-8 h-8 flex items-center justify-center text-rose-400"><span className="material-icons text-lg">delete</span></button>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Portão</span>
                      <span className="font-black text-sky-700">{report.portao}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Louvor</span>
                      <span className="font-black text-violet-700">{report.louvor}</span>
                    </div>
                    {report.palavra !== 'NÃO HOUVE' && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase text-[9px]">Palavra</span>
                        <span className="font-black text-amber-700">{report.palavra}</span>
                      </div>
                    )}
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl text-slate-500 italic text-[10px]">"{report.textoBiblico}"</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h2 className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Resumo Ministerial</h2>
            <div className="grid gap-3">
              {WORKERS.filter(w => w !== 'TRANSMISSÃO' && w !== 'VISITANTE').map(worker => {
                const s = workerStats[worker];
                const total = s.portao + s.louvor + s.palavra;
                return (
                  <div key={worker} className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
                    <div className="px-5 py-3 bg-indigo-900 text-white flex justify-between items-center">
                      <span className="font-black text-xs uppercase">{worker}</span>
                      <span className="text-[9px] font-black bg-yellow-400 text-indigo-950 px-2 py-0.5 rounded-full">{total} ATOS</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <button onClick={() => consultHistory(worker, 'Portão')} className="bg-sky-50 p-2 rounded-xl border border-sky-100 flex flex-col items-center active:scale-95 transition-all">
                        <span className="text-[7px] font-black text-sky-400 uppercase mb-1">Portão</span>
                        <span className="text-lg font-black text-sky-900">{s.portao}</span>
                      </button>
                      <button onClick={() => consultHistory(worker, 'Louvor')} className="bg-violet-50 p-2 rounded-xl border border-violet-100 flex flex-col items-center active:scale-95 transition-all">
                        <span className="text-[7px] font-black text-violet-400 uppercase mb-1">Louvor</span>
                        <span className="text-lg font-black text-violet-900">{s.louvor}</span>
                      </button>
                      <button onClick={() => consultHistory(worker, 'Palavra')} className="bg-amber-50 p-2 rounded-xl border border-amber-100 flex flex-col items-center active:scale-95 transition-all">
                        <span className="text-[7px] font-black text-amber-500 uppercase mb-1">Palavra</span>
                        <span className="text-lg font-black text-amber-900">{s.palavra}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <span className="material-icons text-5xl text-indigo-200">cloud_done</span>
              <h2 className="text-xl font-black text-indigo-950 uppercase">Configurações</h2>
            </div>
            <div className="space-y-3">
              <button onClick={handleBackup} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest shadow-lg">
                <span className="material-icons text-sm">download</span> Exportar Backup
              </button>
              <label className="w-full bg-indigo-50 text-indigo-800 py-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-indigo-100 cursor-pointer uppercase tracking-widest">
                <span className="material-icons text-sm">upload_file</span> Restaurar Backup
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>
              <div className="pt-6">
                <button onClick={() => confirm('Apagar tudo?') && setReports([])} className="w-full text-rose-500 py-3 text-[10px] font-black uppercase tracking-widest border border-rose-100 rounded-xl">
                  Limpar Todos os Dados
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-slate-300 font-black text-[8px] uppercase tracking-[0.4em] pb-10 px-6">
        ICM SANTO ANTÔNIO II &bull; GESTÃO DE OBREIROS
      </footer>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>{modalContent}</Modal>
    </div>
  );
};

export default App;