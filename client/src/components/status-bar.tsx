interface StatusBarProps {
  documentsCount: number;
  memoryUsage: string;
  storageUsage: string;
}

export default function StatusBar({ documentsCount, memoryUsage, storageUsage }: StatusBarProps) {
  return (
    <footer className="bg-white border-t border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto text-xs text-slate-500">
        <div className="flex items-center space-x-4">
          <span>
            Memory: <span className="font-medium text-slate-700">{memoryUsage}</span>
          </span>
          <span>
            Storage: <span className="font-medium text-slate-700">{storageUsage}</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>
            Documents: <span className="font-medium text-slate-700">{documentsCount}</span>
          </span>
          <span>Model: <span className="font-medium text-slate-700">GPT-4o</span></span>
          <span>Version: 1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
