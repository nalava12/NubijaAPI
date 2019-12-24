import * as superagent from 'superagent'
import { CookieAccessInfo } from 'cookiejar'
//import Axios from 'axios'
import * as qs from 'querystring'
const baseURL = new URL('https://app.nubija.com')

//Make cookie persistent
const withCookies = superagent.agent()
//const withCookies = superagent
//Set user-agent to mobile
withCookies.set('User-Agent', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36')

function loginAccount(id: string, pw: string, mobile?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let loginForm = {
      mobile: mobile,
      memid: id,
      mempw: pw
    }
    let url = new URL(baseURL.toJSON())
    url.pathname = '/user/doLogin.do'
    withCookies.post(url.toJSON())
    .type('form')
    .send(loginForm)
    .then(res => {
      res
      resolve()
    })
  })
}

function setMobile(): Promise<string> {
  return new Promise((resolve, reject) => {
    let addMobileChkUrl = new URL(baseURL.toJSON())
    addMobileChkUrl.pathname = '/user/addMobileChk.do'
    withCookies.get(addMobileChkUrl.toJSON()).then(res => {
      //Parse form data (mobile)
      let mobile = res.text.substr(res.text.indexOf('value="') + 7)
      mobile = mobile.substr(0, mobile.indexOf('"'))
      withCookies.jar.setCookie('mobile=' + mobile)

      console.log(withCookies.jar.getCookies(new CookieAccessInfo(addMobileChkUrl.hostname, addMobileChkUrl.pathname, true)))
      let setMobileUrl = new URL(baseURL.toJSON())
      setMobileUrl.pathname = '/user/setMobileDo.do'
      return withCookies.post(setMobileUrl.toJSON())
      .type('form')
      .send({mobile : mobile})
      .then(res => {
        console.log(withCookies.jar.getCookies(new CookieAccessInfo(addMobileChkUrl.hostname, addMobileChkUrl.pathname, true)))
        //After set mobile, should logout
        let logoutUrl = new URL(baseURL.toJSON())
        logoutUrl.pathname = '/user/logoutDo.do'
        superagent.get(logoutUrl.toJSON())
        .set('Cookie', withCookies.jar.getCookie('WMONID', new CookieAccessInfo(addMobileChkUrl.hostname, addMobileChkUrl.pathname, true)).toValueString())
        .then(res => {
          withCookies.jar.setCookie(res.header['set-cookie'][0])
          let mainUrl = new URL(baseURL.toJSON())
          mainUrl.pathname = '/main/index.vm'
          withCookies.get(mainUrl.toJSON()).then(_ => {
            res;
            resolve(mobile)
          })
        })
      })
    })
  })
}

function getRemainPeriod(): Promise<void> {
  let url = new URL(baseURL.toJSON())
  url.pathname = '/svc/svcInfo.do'
  return withCookies.get(url.toJSON()).then(res => {
     console.log(res)
  })
}

const id = 'kimdu12345'
const pw = 'REDACTED'

loginAccount(id, pw).then(setMobile).then(mobile => loginAccount(id, pw, mobile)).then(getRemainPeriod)