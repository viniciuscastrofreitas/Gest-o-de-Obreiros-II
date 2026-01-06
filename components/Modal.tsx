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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-md transition-all text-slate-900">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="px-8 py-6 flex justify-between items-center bg-indigo-950 text-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Registro de Escala</span>
            <h3 className="text-xl font-black uppercase truncate max-w-[200px] tracking-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
            <span className="material-icons text-3xl">close</span>
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
        <div className="px-8 pb-8 bg-white">
          <button
            onClick={onClose}
            className="w-full py-6 bg-slate-100 text-indigo-950 text-base font-black rounded-2xl uppercase tracking-[0.2em] active:scale-95 transition-all shadow-inner border-b-4 border-slate-200"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;