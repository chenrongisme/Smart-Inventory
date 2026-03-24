export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

export interface Cabinet {
  id: number;
  name: string;
  details: string;
  type: 'direct' | 'group';
}

export interface SubCabinet {
  id: number;
  cabinet_id: number;
  name: string;
  details: string;
}

export interface Item {
  id: number;
  name: string;
  details: string;
  quantity: number;
  image_url: string | null;
  cabinet_id: number | null;
  sub_cabinet_id: number | null;
}

export interface HistoryLog {
  id: number;
  item_name: string;
  action_type: 'store' | 'take' | 'create' | 'edit' | 'delete';
  quantity_change: number;
  timestamp: string;
}
