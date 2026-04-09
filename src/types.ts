export interface User {
  id: number;
  username: string;
  role: 'user' | 'admin' | 'superadmin';
  status?: 'active' | 'blocked';
}

export interface Cabinet {
  id: number;
  name: string;
  details: string;
  type: 'direct' | 'group';
  image_url?: string | null;
}

export interface SubCabinet {
  id: number;
  cabinet_id: number;
  name: string;
  details: string;
  image_url?: string | null;
}

export interface Item {
  id: number;
  name: string;
  details: string;
  quantity: number;
  image_url: string | null;
  cabinet_id: number | null;
  sub_cabinet_id: number | null;
  cabinet_name?: string;
  sub_cabinet_name?: string;
  expiry_date?: string | null;
  min_threshold?: number;
}

export interface HistoryLog {
  id: number;
  item_name: string;
  cabinet_name?: string;
  sub_name?: string;
  action_type: 'store' | 'take' | 'create' | 'edit' | 'delete';
  quantity_change: number;
  timestamp: string;
}
