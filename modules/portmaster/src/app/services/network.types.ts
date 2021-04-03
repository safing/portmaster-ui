import { Record } from './portapi.types';

export enum Verdict {
  Undecided = 0,
  Undeterminable = 1,
  Accept = 2,
  Block = 3,
  Drop = 4,
  RerouteToNs = 5,
  RerouteToTunnel = 6,
  Failed = 7
}

export enum IPProtocol {
  ICMP = 1,
  IGMP = 2,
  TCP = 6,
  UDP = 17,
  ICMPv6 = 589,
  UDPLite = 136,
  RAW = 255, // TODO(ppacher): what is RAW used for?
}

export enum IPVersion {
  V4 = 4,
  V6 = 6,
}

export interface IntelEntity {
  // Protocol is the IP protocol used to connect/communicate
  // the the described entity.
  Protocol: IPProtocol;
  // Port is the remote port number used.
  Port: number;
  // Domain is the domain name of the entity. This may either
  // be the domain name used in the DNS request or the
  // named returned from reverse PTR lookup.
  Domain: string;
  // CNAME is a list of CNAMEs that have been used
  // to resolve this entity.
  CNAME: string[] | null;
  // IP is the IP address of the entity.
  IP: string;
  // Country holds the country of residence of the IP address.
  Country: string;
  // ASN holds the number of the autonoumous system that operates
  // the IP.
  ASN: number;
  // ASOrg holds the AS owner name.
  ASOrg: string;
  // BlockedByLists holds a list of filter list IDs that
  // would have blocked the entity.
  BlockedByLists: string[] | null;
  // BlockedEntities holds a list of entities that have been
  // blocked by filter lists. Those entities can be ASNs, domains,
  // CNAMEs, IPs or Countries.
  BlockedEntities: string[] | null;
  // ListOccurences maps the blocked entity (see BlockedEntities)
  // to a list of filter-list IDs that contains it.
  ListOccurences: { [key: string]: string[] } | null;
}

export enum ScopeIdentifier {
  IncomingHost = "IH",
  IncomingLAN = "IL",
  IncomingInternet = "II",
  IncomingInvalid = "IX",
  PeerHost = "PH",
  PeerLAN = "PL",
  PeerInternet = "PI",
  PeerInvalid = "PX"
}

export const ScopeTranslation: { [key: string]: string } = {
  [ScopeIdentifier.IncomingHost]: "Localhost Incoming",
  [ScopeIdentifier.IncomingLAN]: "Incoming local network connections",
  [ScopeIdentifier.IncomingInternet]: "Incoming global connections",
  [ScopeIdentifier.PeerHost]: "Localhost Outgoing",
  [ScopeIdentifier.PeerLAN]: "Local Peer-to-Peer",
  [ScopeIdentifier.PeerInternet]: "Global Peer-to-Peer",
  [ScopeIdentifier.IncomingInvalid]: "N/A",
  [ScopeIdentifier.PeerInvalid]: "N/A",
}

export interface ProcessContext {
  BinaryPath: string;
  ProcessName: string;
  ProfileName: string;
  PID: number;
  Profile: string;
  Source: string
}

// Reason justifies the decision on a connection
// verdict.
export interface Reason {
  // Msg holds a human readable message of the reason.
  Msg: string;
  // OptionKey, if available, holds the key of the
  // configuration option that caused the verdict.
  OptionKey: string;
  // Profile holds the profile the option setting has
  // been configured in.
  Profile: string;
  // Context may holds additional data about the reason.
  Context: any;
}

export interface Connection extends Record {
  // ID is a unique ID for the connection.
  ID: string;
  // Scope defines the scope of the connection. It's an somewhat
  // weired field that may contain a ScopeIdentifier or a string.
  // In case of a string it may eventually be interpreted as a
  // domain name.
  Scope: ScopeIdentifier | string;
  // IPVersion is the version of the IP protocol used.
  IPVersion: IPVersion;
  // Inbound is true if the connection is incoming to
  // hte local system.
  Inbound: boolean;
  // IPProtocol is the protocol used by the connection.
  IPProtocol: IPProtocol;
  // LocalIP is the local IP address that is involved into
  // the connection.
  LocalIP: string;
  // LocalPort is the local port that is involved into the
  // connection.
  LocalPort: number;
  // Entity describes the remote entity that is part of the
  // connection.
  Entity: IntelEntity;
  // Verdict defines the final verdict.
  Verdict: Verdict;
  // Reason is the reason justifying the verdict of the connection.
  Reason: Reason;
  // Started holds the number of seconds in UNIX epoch time at which
  // the connection was initiated.
  Started: number;
  // End dholds the number of seconds in UNIX epoch time at which
  // the connection was considered terminated.
  Ended: number;
  // Tunneled is set to true if the connection was tunneled through the
  // SPN.
  Tunneled: boolean;
  // VerdictPermanent is set to true if the connection was marked and
  // handed back to the operating system.
  VerdictPermanent: boolean;
  // Inspecting is set to true if the connection is being inspected.
  Inspecting: boolean;
  // Encrypted is set to true if the connection is estimated as being
  // encrypted. Interpreting this field must be done with care!
  Encrypted: boolean;
  // Internal is set to true if this connection is done by the Portmaster
  // or any associated helper processes/binaries itself.
  Internal: boolean;
  // ProcessContext holds additional information about the process
  // that initated the connection.
  ProcessContext: ProcessContext;
  // ProfileRevisionCounter is used to track changes to the process
  // profile.
  ProfileRevisionCounter: number;
}

export interface ReasonContext {
  [key: string]: any;
}
