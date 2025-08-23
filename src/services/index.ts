// src/services/index.ts
export { dataLoader } from './dataLoader';
export { workerService } from './workerService';
export { reportService } from './reportService'; // Add this line
export type { DataLoaderService } from './dataLoader';
export type { WorkerService } from './workerService';
export type { ReportService, ReportDataSources, ReportOptions } from './reportService'; // Add this line