"use client";

import { motion, AnimatePresence } from "framer-motion";

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: { open: boolean; title: string; description: string; onConfirm: () => void; onCancel: () => void }): React.JSX.Element {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-slate-900">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onCancel} className="rounded-md border px-4 py-2 text-sm" type="button">Cancel</button>
              <button onClick={onConfirm} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white" type="button">Confirm</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}