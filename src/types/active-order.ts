import type { ActiveOrder, ActiveOrderItem, ActiveOrderStatus } from "@/types/database";

export type ActiveOrderListItem = ActiveOrder & {
  creator_name: string;
  item_count: number;
};

export type ActiveOrderDetail = ActiveOrder & {
  creator_name: string;
  items: ActiveOrderItem[];
};

export type ActiveOrderItemInput = {
  menu_id: string;
  quantity: number;
};

export type CreateActiveOrderInput = {
  notes: string;
  items: ActiveOrderItemInput[];
  customer_name?: string;  
};

export type AddActiveOrderItemInput = {
  active_order_id: string;
  menu_id: string;
  quantity: number;
};

export type UpdateActiveOrderItemQuantityInput = {
  id: string;
  quantity: number;
};

export type RemoveActiveOrderItemInput = {
  id: string;
};

export type UpdateActiveOrderNotesInput = {
  id: string;
  notes: string;
};

export type CancelActiveOrderInput = {
  id: string;
};

export type CheckoutActiveOrderInput = {
  active_order_id: string;
  payment_method_id: string;
  customer_phone: string;
  notes: string;
};

export type ActiveOrderListFilter = {
  status?: ActiveOrderStatus;
};
