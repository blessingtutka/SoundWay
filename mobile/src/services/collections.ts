import { collection, CollectionReference, doc, DocumentReference, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  avatar?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  emailVerified?: boolean;
  connectedDeviceUUID?: string;
}

export interface Building {
  id: string;
  name: string;
  description?: string | null;
  mainBeacon?: string | null;
  createdAt?: Timestamp | Date;
}

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  currentActivity?: string | null;
  floor: number;
  building_id: string;
}

export interface Elevator {
  id: string;
  name: string;
  floors: number[];
  locationRoomId: string;
  building_id: string;
}

export interface Instruction {
  id: string;
  step_order: number;
  instruction_text: string;
  room_id: string;
  building_id: string;
}

export interface DistanceConf {
  id: string;
  room_id: string;
  building_id: string;
  intervals: {
    level: number;
    min: number;
    max: number;
  }[];
}

// MAIN
const usersCollection = collection(db, 'users') as CollectionReference<User>;
const userDoc = (uid: string) => doc(db, 'users', uid) as DocumentReference<User>;

const buildingsCollection = collection(db, 'buildings') as CollectionReference<Building>;
const buildingDoc = (id: string) => doc(db, 'buildings', id) as DocumentReference<Building>;

// ROOMS
const roomsCollection = (buildingId: string) => collection(db, `buildings/${buildingId}/rooms`) as CollectionReference<Room>;

const roomDoc = (buildingId: string, roomId: string) => doc(db, `buildings/${buildingId}/rooms/${roomId}`) as DocumentReference<Room>;

// INSTRUCTIONS
const instructionsCollection = (buildingId: string, roomId: string) =>
  collection(db, `buildings/${buildingId}/rooms/${roomId}/instructions`) as CollectionReference<Instruction>;

const instructionDoc = (buildingId: string, roomId: string, instructionId: string) =>
  doc(db, `buildings/${buildingId}/rooms/${roomId}/instructions/${instructionId}`) as DocumentReference<Instruction>;

// DISTANCE CONFIG
const distanceConfigsCollection = (buildingId: string, roomId: string) =>
  collection(db, `buildings/${buildingId}/rooms/${roomId}/distanceConfigs`) as CollectionReference<DistanceConf>;

const distanceConfigDoc = (buildingId: string, roomId: string, distanceId: string) =>
  doc(db, `buildings/${buildingId}/rooms/${roomId}/distanceConfigs/${distanceId}`) as DocumentReference<DistanceConf>;

// ELEVATORS
const elevatorsCollection = (buildingId: string) => collection(db, `buildings/${buildingId}/elevators`) as CollectionReference<Elevator>;

const elevatorDoc = (buildingId: string, elevatorId: string) =>
  doc(db, `buildings/${buildingId}/elevators/${elevatorId}`) as DocumentReference<Elevator>;

export {
  buildingDoc,
  buildingsCollection,
  distanceConfigDoc,
  distanceConfigsCollection,
  elevatorDoc,
  elevatorsCollection,
  instructionDoc,
  instructionsCollection,
  roomDoc,
  roomsCollection,
  userDoc,
  usersCollection,
};
