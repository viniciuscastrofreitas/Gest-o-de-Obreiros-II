
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 flex justify-between items-center bg-indigo-900 text-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Consulta de Atividade</span>
            <h3 className="text-sm font-black uppercase truncate max-w-[200px]">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <span className="material-icons text-xl">close</span>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        <div className="px-6 pb-6 bg-white">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gray-100 text-indigo-900 text-xs font-black rounded-xl uppercase tracking-widest hover:bg-gray-200 active:scale-95 transition-all shadow-sm"
          >
            Fechar Consulta
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
