// src/types/game.ts

export interface BaseEntity {
    name: string;
    desc?: string;
    hp?: number;
    mp?: number;
    str?: number;
    agi?: number;
    int?: number;
    base_dmg?: number;
    range?: string;
    skills?: any[];
}

export interface GameState {
    environment: string;
    turn_count: number;
    player_gold: number;
    player_inventory: {
        weapons: string[];
        armors: string[];
        items: Record<string, number>;
    };
    player_class: BaseEntity | null;
    player_weapon: BaseEntity | null;
    player_armor: any | null;
    player_item: any | null;
    player_item_count: number;
    player_hp: number;
    player_mp: number;
    player_status: string;
    // AI 状态
    ai_class: BaseEntity | null;
    ai_weapon: BaseEntity | null;
    ai_armor: any | null;
    ai_item: any | null;
    ai_item_count: number;
    ai_hp: number;
    ai_mp: number;
    ai_status: string;
}

export interface GameSnapshot {
    thread_id: string;
    next_node: string | null;
    game_over: boolean;
    state: GameState;
    combat_log: string;
}

// 👈 请特别注意这个接口是否完整复制，并且带有 export 关键字
export interface GameMeta {
    characters: Record<string, any>;
    weapons: Record<string, any>;
    armors: Record<string, any>;
    items: Record<string, any>;
}