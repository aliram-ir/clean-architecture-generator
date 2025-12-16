export interface ProjectContext {
    rootPath: string;
    solutionName: string;
    mode: 'solution' | 'project';
    layers: DetectedLayers;
}

export interface DetectedLayers {
    domain: string;
    application: string;
    infrastructure: string;
    shared?: string;
    di?: string;
    api?: string;
}
