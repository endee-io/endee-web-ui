import { GoInfo } from 'react-icons/go';

function Tooltip({ tip }: { tip: string }) {
    return (
        <div className="group relative">
            <GoInfo className="w-3 h-3 text-slate-400" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 border shadow-sm border-slate-200 bg-slate-50 text-slate-600 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {tip}
            </div>
        </div>
    );
}

export default Tooltip;
