import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all text-slate-900">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="px-6 py-4 flex justify-between items-center bg-indigo-950 text-white">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Registro de Escala</span>
            <h3 className="text-lg font-black uppercase truncate max-w-[180px] tracking-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all">
            <span className="material-icons text-2xl">close</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        <div className="px-6 pb-6 bg-white">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-100 text-indigo-950 text-sm font-black rounded-xl uppercase tracking-[0.2em] active:scale-95 transition-all shadow-inner border-b-2 border-slate-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;