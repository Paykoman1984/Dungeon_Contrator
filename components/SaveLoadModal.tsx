
import React, { useState } from 'react';
import { useGame } from '../services/GameContext';
import { Save, Copy, Upload, Check, AlertCircle, X } from 'lucide-react';

interface SaveLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ isOpen, onClose }) => {
    const { state, importSave } = useGame();
    const [mode, setMode] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
    const [importString, setImportString] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

    if (!isOpen) return null;

    const saveString = JSON.stringify(state, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(saveString).then(() => {
            setStatus('SUCCESS');
            setTimeout(() => setStatus('IDLE'), 2000);
        }).catch(() => {
            setStatus('ERROR'); // Fallback if clipboard API fails
        });
    };

    const handleImport = () => {
        const success = importSave(importString);
        if (success) {
            setStatus('SUCCESS');
            setTimeout(() => {
                setStatus('IDLE');
                onClose();
            }, 1000);
        } else {
            setStatus('ERROR');
            setTimeout(() => setStatus('IDLE'), 3000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Save size={20} className="text-indigo-400" />
                        Manage Save Data
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button 
                        onClick={() => { setMode('EXPORT'); setStatus('IDLE'); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'EXPORT' ? 'bg-indigo-900/20 text-indigo-300 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Export Save
                    </button>
                    <button 
                        onClick={() => { setMode('IMPORT'); setStatus('IDLE'); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'IMPORT' ? 'bg-indigo-900/20 text-indigo-300 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Import Save
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-grow overflow-hidden flex flex-col">
                    {mode === 'EXPORT' ? (
                        <div className="space-y-4 flex flex-col h-full">
                            <p className="text-sm text-slate-400">
                                Copy this text to save your progress externally. You can paste it back later to restore your guild.
                            </p>
                            <textarea
                                readOnly
                                value={saveString}
                                onClick={(e) => e.currentTarget.select()}
                                className="bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs text-slate-400 w-full flex-grow max-h-60 resize-none focus:outline-none focus:border-indigo-500"
                            />
                            <button 
                                onClick={handleCopy}
                                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${status === 'SUCCESS' ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                            >
                                {status === 'SUCCESS' ? <Check size={18} /> : <Copy size={18} />}
                                {status === 'SUCCESS' ? 'Copied to Clipboard' : 'Copy Save String'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 flex flex-col h-full">
                            <p className="text-sm text-slate-400">
                                Paste your save string below to restore your progress. <span className="text-red-400">Warning: This will overwrite your current game.</span>
                            </p>
                            <textarea
                                value={importString}
                                onChange={(e) => setImportString(e.target.value)}
                                placeholder='Paste JSON string here...'
                                className="w-full bg-slate-950 p-3 rounded border border-slate-800 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500 flex-grow resize-none h-40"
                            />
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={handleImport}
                                    disabled={!importString}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all 
                                        ${status === 'SUCCESS' ? 'bg-green-600 text-white' : 
                                        status === 'ERROR' ? 'bg-red-600 text-white' :
                                        'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                >
                                    {status === 'SUCCESS' ? <Check size={18} /> : 
                                    status === 'ERROR' ? <AlertCircle size={18} /> : 
                                    <Upload size={18} />}
                                    {status === 'SUCCESS' ? 'Save Loaded!' : 
                                    status === 'ERROR' ? 'Invalid Save Data' : 
                                    'Load Save'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
