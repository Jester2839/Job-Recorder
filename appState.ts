// Globální stav aplikace - bez window objektu

export let currentUserRole: string | null = null;
export let currentEmployerId: string | null = null;
export let isFirstTimeUser: boolean = false;
export let currentlyFilteredData: any[] = [];
export let adminWorkerRecords: Record<string, any> = {};
export let exportConfig: any = null;

// Settery pro změny stavu
export function setCurrentUserRole(role: string | null) {
    currentUserRole = role;
}

export function setCurrentEmployerId(id: string | null) {
    currentEmployerId = id;
}

export function setIsFirstTimeUser(isFirst: boolean) {
    isFirstTimeUser = isFirst;
}

export function setCurrentlyFilteredData(data: any[]) {
    currentlyFilteredData = data;
}

export function setAdminWorkerRecords(records: Record<string, any>) {
    adminWorkerRecords = records;
}

export function setExportConfig(config: any) {
    exportConfig = config;
}

export function clearAppState() {
    currentUserRole = null;
    currentEmployerId = null;
    isFirstTimeUser = false;
    currentlyFilteredData = [];
    adminWorkerRecords = {};
    exportConfig = null;
}
