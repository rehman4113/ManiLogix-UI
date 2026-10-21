// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import App from './App';
import {api,decodeToken,type Session} from './api';

const sampleSession:Session={token:'signed-token',expiresAt:Date.now()+60000,role:'CUSTOMER',userId:5,email:'customer@example.com'};
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.restoreAllMocks();vi.stubGlobal('scrollTo',vi.fn())});
afterEach(cleanup);

describe('demo preview',()=>{
 it('labels sample data and does not make API calls',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch');
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:/explore the workspace/i}));
  expect(await screen.findByText(/sample data\. changes are disabled/i)).toBeTruthy();
  expect(screen.getAllByText('Northstar Components').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:'Inventory'}));
  expect(await screen.findByText('Precision valve assembly')).toBeTruthy();
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('persists the theme preference',()=>{
  render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'Toggle theme'}));
  expect(localStorage.getItem('manilogix-theme')).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
 });
});

describe('live API contract',()=>{
 it('sends the existing order body with bearer auth',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:3}),{status:201,headers:{'Content-Type':'application/json'}}));
  await api.placeOrder(sampleSession,{items:[{itemId:21,quantity:2}],deliveryAddress:'1 Main Street'});
  const [url,options]=fetchMock.mock.calls[0];
  expect(url).toBe('/api/orders');
  expect(options?.method).toBe('POST');
  expect(JSON.parse(String(options?.body))).toEqual({items:[{itemId:21,quantity:2}],deliveryAddress:'1 Main Street'});
  expect((options?.headers as Record<string,string>).Authorization).toBe('Bearer signed-token');
 });
 it('uses the backend status query parameter and handles 409',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({message:'Invalid order transition'}),{status:409,headers:{'Content-Type':'application/json'}}));
  await expect(api.status(sampleSession,3,'SHIPPED')).rejects.toMatchObject({status:409});
  expect(fetchMock.mock.calls[0][0]).toBe('/api/orders/3/status?status=SHIPPED');
  expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
 });
 it('loads role from the backend JWT claim',()=>{
  const token=['x',btoa(JSON.stringify({sub:'7',roles:['SUPPLIER']})),'y'].join('.');
  expect(decodeToken(token)).toEqual({userId:7,role:'SUPPLIER'});
 });
 it('does not show admin navigation to customer',async()=>{
  sessionStorage.setItem('manilogix-session',JSON.stringify(sampleSession));
  vi.spyOn(globalThis,'fetch').mockImplementation(async url=>new Response(JSON.stringify(String(url).includes('inventory')?{content:[],totalElements:0,totalPages:0,number:0,size:20}:[]),{status:200,headers:{'Content-Type':'application/json'}}));
  render(<App/>);
  await waitFor(()=>expect(screen.getByRole('navigation',{name:'Main navigation'})).toBeTruthy());
  expect(screen.queryByRole('button',{name:/Team accounts/i})).toBeNull();
 });
});
