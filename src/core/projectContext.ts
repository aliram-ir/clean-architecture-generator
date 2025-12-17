import { DetectedLayers } from './layerDetector';
export interface ProjectContext {
    rootPath: string;
    solutionName: string;
    mode: 'solution' | 'project';
    layers: DetectedLayers;
}
