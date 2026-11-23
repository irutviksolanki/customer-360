export const sessionKey='gcc360.session.v1';
export const sessionStorage={
  async get(){return window.localStorage.getItem(sessionKey)},
  async set(value:string){window.localStorage.setItem(sessionKey,value)},
  async remove(){window.localStorage.removeItem(sessionKey)},
};
