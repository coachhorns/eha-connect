import { openDB, DBSchema } from 'idb'

interface ScorekeeperDB extends DBSchema {
  games: {
    key: string
    value: any // Full Game State object
  }
  mutations: {
    key: number
    value: {
      id?: number
      gameId: string
      type: string // e.g. 'ADD_POINTS', 'UPDATE_CLOCK'
      payload: any
      timestamp: number
    }
    indexes: { 'by-game': string }
  }
}

const DB_NAME = 'eha-scorekeeper'
const DB_VERSION = 1

export async function initDB() {
  return openDB<ScorekeeperDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('games')) {
        db.createObjectStore('games')
      }
      if (!db.objectStoreNames.contains('mutations')) {
        const store = db.createObjectStore('mutations', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('by-game', 'gameId')
      }
    },
  })
}

export async function saveGameLocally(gameId: string, data: any) {
  const db = await initDB()
  await db.put('games', data, gameId)
}

export async function getGameLocally(gameId: string) {
  const db = await initDB()
  return db.get('games', gameId)
}

export async function queueMutation(gameId: string, type: string, payload: any) {
  const db = await initDB()
  await db.add('mutations', {
    gameId,
    type,
    payload,
    timestamp: Date.now(),
  })
}

export async function getQueuedMutations(gameId: string) {
  const db = await initDB()
  return db.getAllFromIndex('mutations', 'by-game', gameId)
}

export async function clearMutation(id: number) {
  const db = await initDB()
  await db.delete('mutations', id)
}
