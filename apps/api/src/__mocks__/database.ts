import { vi } from 'vitest';

// Deep mock factory for Prisma model methods
function mockModel() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
  };
}

export const prisma = {
  player: mockModel(),
  turnBank: mockModel(),
  playerSkill: mockModel(),
  playerEquipment: mockModel(),
  item: mockModel(),
  itemTemplate: mockModel(),
  dropTable: mockModel(),
  chestDropTable: mockModel(),
  craftingRecipe: mockModel(),
  playerRecipe: mockModel(),
  zone: mockModel(),
  zoneConnection: mockModel(),
  playerZoneDiscovery: mockModel(),
  $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(prisma)),
};
