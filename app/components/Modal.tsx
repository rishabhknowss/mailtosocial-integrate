import React from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/navigation';

interface ModalProps {
  onClose?: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
}

const Modal = ({ onClose, children, title, showCloseButton = true }: ModalProps) => {
  const router = useRouter();

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseClick(e);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={handleOverlayClick}>
      <div className="bg-[#1a1a1a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {showCloseButton && (
            <div className="flex justify-end">
              <button
                onClick={handleCloseClick}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {title && <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the root level
  return typeof window !== 'undefined'
    ? ReactDOM.createPortal(modalContent, document.body)
    : null;
};

export default Modal; 