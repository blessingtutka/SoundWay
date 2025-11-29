import { getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import {
  Building,
  buildingsCollection,
  DistanceConf,
  distanceConfigsCollection,
  Instruction,
  instructionsCollection,
  Room,
  roomsCollection,
} from './collections';

import { buildingDoc, distanceConfigDoc, instructionDoc, roomDoc } from './collections';

import { db } from './firebase';

import { or, orderBy } from 'firebase/firestore';

export const RoomDataService = {
  async getDistanceConfigs(buildingId: string, roomId: string): Promise<DistanceConf[]> {
    const snapshot = await getDocs(distanceConfigsCollection(buildingId, roomId));
    return snapshot.docs.map((doc) => {
      const { id: _, ...data } = doc.data();
      return { id: doc.id, ...data };
    });
  },

  async getInstructions(buildingId: string, roomId: string): Promise<Instruction[]> {
    // order instructions by step_order
    const q = query(instructionsCollection(buildingId, roomId), orderBy('step_order', 'asc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const { id: _, ...data } = doc.data();
      return { id: doc.id, ...data };
    });
  },
};

export interface RoomDetails extends Room {
  instructions: Instruction[];
  distanceConfigs: DistanceConf[];
}

export const RoomQueryService = {
  async getRoom(buildingId: string, value: string): Promise<Room | null> {
    const col = roomsCollection(buildingId);

    const q = query(
      col,
      or(
        where('name', '>=', value),
        where('name', '<=', value + '\uf8ff'),
        where('currentActivity', '>=', value),
        where('currentActivity', '<=', value + '\uf8ff'),
        where('description', '>=', value),
        where('description', '<=', value + '\uf8ff'),
      ),
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const doc = snap.docs[0];
      const { id: _, ...data } = doc.data();
      return { id: doc.id, ...data };
    }

    return null;
  },

  async getRoomDetails(buildingId: string, value: string): Promise<RoomDetails | null> {
    const room = await RoomQueryService.getRoom(buildingId, value);

    if (room) {
      const [instructions, distanceConfigs] = await Promise.all([
        RoomDataService.getInstructions(buildingId, room.id),
        RoomDataService.getDistanceConfigs(buildingId, room.id),
      ]);

      return {
        ...room,
        instructions,
        distanceConfigs,
      };
    }

    return null;
  },
};

export const BuildingService = {
  async getBuildingByBeacon(macAddress: string): Promise<Building | null> {
    try {
      // const normalizedMac = macAddress.replace(/:/g, '').toUpperCase();
      const normalizedMac = macAddress;

      const q = query(buildingsCollection, where('mainBeacon', '>=', normalizedMac), where('mainBeacon', '<=', normalizedMac + '\uf8ff'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || null,
        mainBeacon: data.mainBeacon || null,
        createdAt: data.createdAt || undefined,
      };
    } catch (error) {
      console.error('Error fetching building by beacon:', error);
      throw new Error('Failed to find building by beacon');
    }
  },

  async getAllBuildings(): Promise<Building[]> {
    const snapshot = await getDocs(buildingsCollection);
    return snapshot.docs.map((doc) => {
      const { id: _, ...data } = doc.data();
      return { id: doc.id, ...data };
    });
  },

  async getRooms(buildingId: string): Promise<Room[]> {
    const snapshot = await getDocs(roomsCollection(buildingId));
    return snapshot.docs.map((doc) => {
      const { id: _, ...data } = doc.data();
      return { id: doc.id, ...data };
    });
  },
};

// Type for import data
export interface ImportData {
  buildings: Building[];
  rooms: Room[];
  instructions: Instruction[];
  distanceConfigs: DistanceConf[];
}

export async function importAllData(data: ImportData): Promise<void> {
  const batch = writeBatch(db);

  try {
    //
    // Import buildings
    //
    data.buildings.forEach((b) => {
      const ref = buildingDoc(b.id);
      batch.set(ref, {
        id: b.id,
        name: b.name,
        description: b.description ?? null,
        mainBeacon: b.mainBeacon ?? null,
        createdAt: serverTimestamp(),
      });
    });

    //
    // Import rooms
    //
    data.rooms.forEach((r) => {
      const ref = roomDoc(r.building_id, r.id);
      batch.set(ref, {
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        currentActivity: r.currentActivity ?? null,
        floor: r.floor,
        building_id: r.building_id,
      });
    });

    //
    // Import instructions
    //
    data.instructions.forEach((i) => {
      const ref = instructionDoc(i.building_id, i.room_id, i.id);
      batch.set(ref, {
        id: i.id,
        step_order: i.step_order,
        instruction_text: i.instruction_text,
        room_id: i.room_id,
        building_id: i.building_id,
      });
    });

    //
    // Distance Config
    //
    data.distanceConfigs.forEach((d) => {
      const ref = distanceConfigDoc(d.building_id, d.room_id, d.id);
      batch.set(ref, {
        id: d.id,
        room_id: d.room_id,
        intervals: d.intervals,
        building_id: d.building_id,
      });
    });

    await batch.commit();
    console.log('All data imported successfully!');
  } catch (err) {
    console.error('Error importing:', err);
    throw err;
  }
}
