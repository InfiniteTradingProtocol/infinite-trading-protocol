import { DeploymentFilter, Deployment } from './types';
export declare const getSafeWebAuthnSignerFactoryDeployment: (filter?: DeploymentFilter) => Deployment | undefined;
export declare const getSafeWebAuthnShareSignerDeployment: (filter?: DeploymentFilter) => Deployment | undefined;
export declare const getDaimoP256VerifierDeployment: (filter?: DeploymentFilter) => Deployment | undefined;
export declare const getFCLP256VerifierDeployment: (filter?: DeploymentFilter) => Deployment | undefined;
