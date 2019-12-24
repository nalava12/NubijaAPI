import * as superagent from 'superagent'
const baseURL = new URL('https://app.nubija.com')

//Make cookie persistent
const withCookies = superagent.agent()

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
  await withCookies.post(url.toJSON())
  .type('form')
  .send(loginForm)
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

function getRemainPeriod(): Promise<void> {
  let url = new URL(baseURL.toJSON())
  url.pathname = '/svc/svcInfo.do'
  return withCookies.get(url.toJSON()).then(res => {
     console.log(res)
  })
}

let initAPI = (id: string, pw: string) => loginAccount(id, pw).then(setMobile).then(mobile => loginAccount(id, pw, mobile))

const id = 'kimdu12345'
const pw = 'REDACTED'

initAPI(id, pw).then(getRemainPeriod)