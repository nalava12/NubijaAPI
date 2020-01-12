import * as superagent from 'superagent'
const baseURL = new URL('https://app.nubija.com')

//Make cookie persistent
let withCookies = superagent.agent()

//Set user-agent to mobile
withCookies.set('User-Agent', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36')

async function loginAccount(id: string, pw: string, mobile?: string): Promise<void> {
  let loginForm = {
    mobile: mobile,
    memid: id,
    mempw: pw
  }
  let url = new URL(baseURL.toJSON())
  url.pathname = '/user/doLogin.do'
  let loginRes = await withCookies.post(url.toJSON())
    .type('form')
    .send(loginForm)
  if(loginRes.text.indexOf('등록된 사용자가 없거나 비밀번호가 잘못되었습니다.') != -1) {
    throw 'Invalid ID or password!'
  }
}

async function setMobile(): Promise<string> {
  let addMobileChkUrl = new URL(baseURL.toJSON())
  addMobileChkUrl.pathname = '/user/addMobileChk.do'
  let mobileRes = await withCookies.get(addMobileChkUrl.toJSON())

  //Parse form data (mobile)
  let mobile = mobileRes.text.substr(mobileRes.text.indexOf('value="') + 7)
  mobile = mobile.substr(0, mobile.indexOf('"'))
  withCookies.jar.setCookie('mobile=' + mobile)

  let setMobileUrl = new URL(baseURL.toJSON())
  setMobileUrl.pathname = '/user/setMobileDo.do'
  await withCookies.post(setMobileUrl.toJSON())
    .type('form')
    .send({mobile : mobile})

  //After set mobile, should logout to update JSESSIONID
  let logoutUrl = new URL(baseURL.toJSON())
  logoutUrl.pathname = '/user/logoutDo.do'
  let logoutRes = await superagent.get(logoutUrl.toJSON())

  //Update cookie 'JSESSIONID'
  withCookies.jar.setCookie(logoutRes.header['set-cookie'][0])

  return mobile
}

class Station {
  num: string
  name: string
  id: string
  lent: number
  park: number
  lat: number
  long: number
  addr: string
  constructor(num: string, name: string, id: string, lent: string, park: string, lat: string, long: string, addr: string) {
    this.num = num
    this.name = name
    this.id = id
    this.lent = parseInt(lent)
    this.park = parseInt(park)
    this.lat = parseFloat(lat)
    this.long = parseFloat(long)
    this.addr = addr
  }
}

export async function getStations(): Promise<Station[]> {
  let url = new URL(baseURL.toJSON())
  url.pathname = '/terminal/getTmMapState.do'
  let stationRes = await withCookies.get(url.toJSON())
  let terminals = stationRes.text.match(/terminalDrow.+;/g)
  if(terminals == null) {
    throw 'Invalid Data!'
  }
  return terminals.map(terminal => terminal.substr(14).slice(0, -3).split(/',\s*'/)).map(arr => {
    return new Station(arr[0], arr[1], arr[2], arr[5], arr[6], arr[7], arr[8], arr[12])
  })
}

interface Rack {
  num: string
  avail: boolean
}

export async function getStationRacks(stationId: string): Promise<Rack[]> {
  let url = new URL(baseURL.toJSON())
  url.pathname = '/rent/getRackLentRead.do'
  url.searchParams.set('tmid', stationId)
  let racksRes = await withCookies.get(url.toJSON())
  let allButtons = racksRes.text.match(/<button.+/g)
  if(allButtons == null) {
    throw 'Racks are not exist!'
  }
  let racks: Rack[] = allButtons.map(button => {
    return {
      num: button.substr(button.indexOf('">') + 2).slice(0, -9),
      avail: button.indexOf('rental_able') != -1
    }
  })
  return racks
}

export async function rentBike(stationId: string, rackNum: string): Promise<void> {
  let rentForm = {
    tmid: stationId,
    rackid: rackNum,
    fullrackid: stationId + rackNum,
    tmname: undefined
  }
  let url = new URL(baseURL.toJSON())
  url.pathname = '/rent/rentDo.do'
  let rentRes = await withCookies.post(url.toJSON())
    .type('form')
    .send(rentForm)
  if(rentRes.text.indexOf('오류입니다.') == -1) {
    throw 'Invalid station or rack id!'
  }
  return
}

export async function getRentStatus(): Promise<string> {
  let url = new URL(baseURL.toJSON())
  url.pathname = '/svc/rentInfo.do'
  let rentStatRes = await withCookies.get(url.toJSON())
  let trimmedStr = rentStatRes.text.substr(rentStatRes.text.indexOf('impact"> ') + 8).trim().replace(/\s+/g, ' ')
  trimmedStr = trimmedStr.substr(0, trimmedStr.indexOf('</span>'))
  if(trimmedStr.includes('반납') || trimmedStr.includes('대여')) {
    return trimmedStr
  } else {
    throw 'Cannot fetch rent status! May be not logined?'
  }
}

export function initAPI (id: string, pw: string) {
  //Reset cookie jar
  withCookies = superagent.agent()

  //Set user-agent to mobile
  withCookies.set('User-Agent', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36')

  //Login and set mobile
  return loginAccount(id, pw).then(setMobile).then(mobile => loginAccount(id, pw, mobile))
}
