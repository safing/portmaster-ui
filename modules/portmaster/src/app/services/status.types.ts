import { SecurityLevel } from "./core.types";
import { ReleaseLevel } from './config.types';

export interface CaptivePortal {
    URL: string;
    IP: string;
    Domain: string;
}

export enum Status {
    Off = 0,
    Error = 1,
    Warning = 2,
    Operational = 3
}

export enum OnlineStatus {
    Unknown = 0,
    Offline = 1,
    Limited = 2, // local network only,
    Portal = 3,
    SemiOnline = 4,
    Online = 5,
}

export interface Threat<T = any> {
    ID: string;
    Name: string;
    Description: string;
    AdditionalData: T;
    MitigationLevel: SecurityLevel;
    Started: number;
    Ended: number;
}

export interface CoreStatus {
    ActiveSecurityLevel: SecurityLevel;
    SelectedSecurityLeveL: SecurityLevel;
    ThreatMitigationLevel: SecurityLevel;
    OnlineStatus: OnlineStatus;
    Threats: Threat[];
}

export interface Module {
    Enabled: boolean;
    FailureID: string;
    FailureMsg: string;
    FaillureStatus: string;
    Name: string;
    Status: Status;
}

export interface Subsystem {
    ConfigKeySpace: string;
    Description: string;
    ExpertiseLevel: string;
    FailureStatus: FailureStatus;
    ID: string;
    Modules: Module[];
    Name: string;
    ReleaseLevel: ReleaseLevel;
    ToggleOptionKey: string;
}