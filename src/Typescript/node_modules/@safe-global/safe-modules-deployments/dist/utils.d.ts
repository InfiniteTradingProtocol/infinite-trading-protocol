import { DeploymentFilter, Deployment } from './types';
export declare const findDeployment: (criteria: DeploymentFilter, deployments: Deployment[]) => Deployment | undefined;
export declare const applyFilterDefaults: (filter?: DeploymentFilter) => DeploymentFilter;
