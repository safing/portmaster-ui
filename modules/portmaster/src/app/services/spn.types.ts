import { GeoCoordinates, IntelEntity } from ".";
import { Record } from "./portapi.types";

export interface SPNStatus extends Record {
  Status: 'failed' | 'disabled' | 'connecting' | 'connected';
  HomeHubID: string;
  ConnectedIP: string;
  ConnectedTransport: string;
  ConnectedSince: string | null;
}

export interface Pin extends Record {
  ID: string;
  Name: string;
  FirstSeen: string;
  EntityV4?: IntelEntity | null;
  EntityV6?: IntelEntity | null;
  States: string[];
  SessionActive: boolean;
  HopDistance: number;
  ConnectedTo: {
    [key: string]: Lane,
  };
  Route: string[] | null;
}

export interface Lane {
  HubID: string;
  Capacity: number;
  Latency: number;
}

export function getPinCoords(p: Pin): GeoCoordinates | null {
  if (p.EntityV4 && p.EntityV4.Coordinates) {
    return p.EntityV4.Coordinates;
  }
  return p.EntityV6?.Coordinates || null;
}
