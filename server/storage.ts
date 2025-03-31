import { users, type User, type InsertUser, savedItems, type SavedItem, type InsertSavedItem, openaiRequests, type OpenaiRequest, type InsertOpenaiRequest } from "@shared/schema";

// Interface with all CRUD methods needed
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Saved items methods
  getSavedItemsByUserId(userId: number): Promise<SavedItem[]>;
  getSavedItemById(id: number): Promise<SavedItem | undefined>;
  createSavedItem(item: InsertSavedItem): Promise<SavedItem>;
  deleteSavedItem(id: number): Promise<boolean>;

  // OpenAI request methods
  createOpenaiRequest(request: InsertOpenaiRequest): Promise<OpenaiRequest>;
  getOpenaiRequestsByUserId(userId: number): Promise<OpenaiRequest[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private savedItems: Map<number, SavedItem>;
  private openaiRequests: Map<number, OpenaiRequest>;
  currentUserId: number;
  currentSavedItemId: number;
  currentOpenaiRequestId: number;

  constructor() {
    this.users = new Map();
    this.savedItems = new Map();
    this.openaiRequests = new Map();
    this.currentUserId = 1;
    this.currentSavedItemId = 1;
    this.currentOpenaiRequestId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Saved items methods
  async getSavedItemsByUserId(userId: number): Promise<SavedItem[]> {
    return Array.from(this.savedItems.values()).filter(
      (item) => item.userId === userId
    );
  }

  async getSavedItemById(id: number): Promise<SavedItem | undefined> {
    return this.savedItems.get(id);
  }

  async createSavedItem(insertItem: InsertSavedItem): Promise<SavedItem> {
    const id = this.currentSavedItemId++;
    const now = new Date();
    const item: SavedItem = { 
      ...insertItem, 
      id, 
      dateCreated: now 
    };
    this.savedItems.set(id, item);
    return item;
  }

  async deleteSavedItem(id: number): Promise<boolean> {
    return this.savedItems.delete(id);
  }

  // OpenAI request methods
  async createOpenaiRequest(insertRequest: InsertOpenaiRequest): Promise<OpenaiRequest> {
    const id = this.currentOpenaiRequestId++;
    const now = new Date();
    const request: OpenaiRequest = {
      ...insertRequest,
      id,
      dateCreated: now
    };
    this.openaiRequests.set(id, request);
    return request;
  }

  async getOpenaiRequestsByUserId(userId: number): Promise<OpenaiRequest[]> {
    return Array.from(this.openaiRequests.values()).filter(
      (request) => request.userId === userId
    );
  }
}

export const storage = new MemStorage();
