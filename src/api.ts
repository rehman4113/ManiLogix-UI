export type Role = 'ADMIN'|'MANAGER'|'SUPPLIER'|'CUSTOMER';
export type OrderStatus = 'PENDING'|'CONFIRMED'|'SHIPPED'|'DELIVERED'|'CANCELLED';
export type Item = {id:number;supplierId:number;name:string;category:string|null;quantity:number;reorderLevel:number;unitPrice:number;active:boolean;needsPriceReview:boolean};
export type Supplier = {id:number;name:string;email:string;ownerUserId:number;contactNumber:string|null;address:string|null;company:string|null;active:boolean;createdAt:string};
export type Order = {id:number;customerId:number;supplierId:number;deliveryAddress:string;status:OrderStatus;createdAt:string;total:number;items:{itemId:number;quantity:number;unitPrice:number}[]};
export type Notification = {id:number;userId:number;orderId:number;kind:string;message:string;createdAt:string};
export type Page<T> = {content:T[];totalElements:number;totalPages:number;number:number;size:number};
export type Session = {token:string;expiresAt:number;role:Role;userId:number;email:string};
export class ApiError extends Error {constructor(public status:number,message:string){super(message)}}
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/,'');
export async function request<T>(path:string,session:Session|null,options:RequestInit={}):Promise<T>{
  const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(session?{Authorization:`Bearer ${session.token}`}:{}) ,...options.headers}});
  if(!response.ok){let message=`Request failed (${response.status})`;try{const body=await response.json();message=body.detail||body.message||body.error||message}catch{}throw new ApiError(response.status,message)}
  if(response.status===204||response.headers.get('content-length')==='0')return undefined as T;
  const body=await response.text();return body?JSON.parse(body) as T:undefined as T;
}
export function decodeToken(token:string):{userId:number;role:Role}{const payload=token.split('.')[1];if(!payload)throw new Error('Invalid login response');const claims=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));const role=claims.roles?.[0];if(!['ADMIN','MANAGER','SUPPLIER','CUSTOMER'].includes(role)||!Number(claims.sub))throw new Error('Invalid login response');return {userId:Number(claims.sub),role}}
export const api={
  signup:(email:string,password:string)=>request<void>('/api/auth/signup',null,{method:'POST',body:JSON.stringify({email,password})}),
  login:(email:string,password:string)=>request<{accessToken:string;expiresInSeconds:number}>('/api/auth/login',null,{method:'POST',body:JSON.stringify({email,password})}),
  createUser:(s:Session,input:{email:string;password:string;role:'MANAGER'|'SUPPLIER'})=>request<{id:number;email:string;role:Role}>('/api/auth/users',s,{method:'POST',body:JSON.stringify(input)}),
  inventory:(s:Session,page=0,size=20)=>request<Page<Item>>(`/api/inventory?page=${page}&size=${size}`,s),
  item:(s:Session,id:number)=>request<Item>(`/api/inventory/${id}`,s),
  saveItem:(s:Session,input:Omit<Item,'id'|'active'|'needsPriceReview'>,id?:number)=>request<Item>(`/api/inventory${id?`/${id}`:''}`,s,{method:id?'PUT':'POST',body:JSON.stringify(input)}),
  removeItem:(s:Session,id:number)=>request<void>(`/api/inventory/${id}`,s,{method:'DELETE'}),
  suppliers:(s:Session)=>request<Supplier[]>('/api/suppliers',s),
  supplier:(s:Session,id:number)=>request<Supplier>(`/api/suppliers/${id}`,s),
  saveSupplier:(s:Session,input:Pick<Supplier,'name'|'email'|'ownerUserId'|'contactNumber'|'address'|'company'>,id?:number)=>request<Supplier>(`/api/suppliers${id?`/${id}`:''}`,s,{method:id?'PATCH':'POST',body:JSON.stringify(input)}),
  removeSupplier:(s:Session,id:number)=>request<void>(`/api/suppliers/${id}`,s,{method:'DELETE'}),
  orders:(s:Session)=>request<Order[]>('/api/orders',s),
  order:(s:Session,id:number)=>request<Order>(`/api/orders/${id}`,s),
  placeOrder:(s:Session,input:{items:{itemId:number;quantity:number}[];deliveryAddress:string})=>request<Order>('/api/orders',s,{method:'POST',body:JSON.stringify(input)}),
  status:(s:Session,id:number,status:OrderStatus)=>request<Order>(`/api/orders/${id}/status?status=${status}`,s,{method:'PATCH'}),
  notifications:(s:Session,all=false)=>request<Notification[]>(`/api/notifications${all?'/all':''}`,s)
};
