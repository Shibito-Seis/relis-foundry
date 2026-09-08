declare const CONFIG: Record<string, any>;
declare const Hooks: {
  once(name: string, callback: (...args: any[]) => unknown): number;
  on(name: string, callback: (...args: any[]) => unknown): number;
};
declare const foundry: Record<string, any>;
declare const game: Record<string, any>;
declare const ui: Record<string, any>;
declare function renderTemplate(
  path: string,
  data: Record<string, unknown>,
): Promise<string>;

declare class Actor {
  static implementation: {
    create(data: Record<string, unknown>): Promise<Actor>;
  };
  name: string;
  type: string;
  system: any;
  items: any;
  uuid: string;
  isOwner: boolean;
  update(data: Record<string, unknown>): Promise<Actor>;
  createEmbeddedDocuments(
    documentName: string,
    data: Record<string, unknown>[],
  ): Promise<any[]>;
  deleteEmbeddedDocuments(documentName: string, ids: string[]): Promise<any[]>;
}

declare class Item {
  static implementation: {
    create(data: Record<string, unknown>): Promise<Item>;
  };
  id: string;
  name: string;
  type: string;
  system: any;
  parent: Actor | null;
  sheet: { render(force?: boolean): unknown };
  uuid: string;
  isOwner: boolean;
  update(data: Record<string, unknown>): Promise<Item>;
}

declare class Roll {
  constructor(formula: string, data?: Record<string, number>);
  total: number | null;
  dice: Array<{ total: number | null }>;
  evaluate(): Promise<Roll>;
}

declare const ChatMessage: {
  implementation: { create(data: Record<string, unknown>): Promise<unknown> };
  getSpeaker(data: Record<string, unknown>): Record<string, unknown>;
};
