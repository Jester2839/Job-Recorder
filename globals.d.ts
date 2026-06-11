





// Global interfaces
interface Window {
    currentUserRole: string | null;
    currentEmployerId: string | null;
    isFirstTimeUser: boolean;
    currentlyFilteredData: any[];
    adminWorkerRecords: Record<string, any[]>;
    exportConfig: any;
}

// Declarations for libraries loaded via CDN
declare const ExcelJS: any;
declare const saveAs: any;
