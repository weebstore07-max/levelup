import React from 'react';

export interface FreezePassConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isActivating?: boolean;
}

export const FreezePassConfirmationModal: React.FC<FreezePassConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isActivating = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-[#D8CFBF] rounded-[20px] p-6 md:p-8 max-w-md w-full shadow-xl flex flex-col gap-6 text-[#2C2825] relative">
        
        {/* Header & Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-2xl">
            ❄️
          </div>
          <div>
            <h3 className="font-display-lg text-xl font-bold text-primary">
              Activate Freeze Pass?
            </h3>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              Your Freeze Pass will protect your next qualifying missed study day.
            </p>
            <p className="text-[11px] text-[#8C8275] mt-2 font-medium">
              You can use only one Freeze Pass per calendar month.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E1D6]">
          <button
            type="button"
            onClick={onClose}
            disabled={isActivating}
            className="py-2.5 px-4 rounded-xl border border-outline-variant font-bold text-xs hover:bg-surface-container-high transition-colors cursor-pointer text-[#2C2825] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isActivating}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isActivating ? (
              <>
                <span className="animate-spin text-sm">⏳</span> Activating...
              </>
            ) : (
              'Activate Freeze Pass'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default FreezePassConfirmationModal;
