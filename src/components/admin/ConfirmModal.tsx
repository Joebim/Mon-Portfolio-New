'use client';

import { useEffect, useRef } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemTitle?: string;
  itemType?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isProcessing?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  itemTitle,
  itemType,
  confirmLabel = 'DELETE',
  cancelLabel = 'CANCEL',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus cancel button for safe keyboard accessibility
    setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#141210] border border-white/15 p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-none border ${
              variant === 'danger'
                ? 'bg-red-500/10 border-red-500/25 text-red-400'
                : 'bg-ember/10 border-ember/25 text-ember'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
            >
              {variant === 'danger' ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              )}
            </svg>
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="text-base font-semibold text-paper tracking-tight">{title}</h3>
            <p className="text-xs text-[#999] leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Item badge preview */}
        {itemTitle && (
          <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-paper truncate">{itemTitle}</span>
            {itemType && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-ember px-2 py-0.5 rounded bg-ember/10 border border-ember/20 flex-none">
                {itemType}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-white/15 text-[#888] font-mono text-[9px] hover:text-paper hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl font-mono text-[9px] font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2 ${
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'
                : 'bg-ember hover:bg-ember-soft text-ink shadow-lg shadow-ember/20'
            }`}
          >
            {isProcessing ? 'DELETING...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
