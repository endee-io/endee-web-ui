import { GoInfo } from 'react-icons/go'

function Tooltip({tip} : {tip : string}) {
    return (
        <div className="group relative">
            <GoInfo className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 border shadow-sm border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs normal-case rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {tip}
            </div>
        </div>
    )
}

export default Tooltip