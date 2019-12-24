import Axios from 'axios'
import * as qs from 'querystring'
const baseURL = new URL('http://app.nubija.com')

let withCookie = Axios.create({
  withCredentials: true
})

type Cookies = string

function loginAccount(id: string, pw: string): Promise<LoginToken> {
  return new Promise((resolve, reject) => {
    let loginForm = {
      memid: id,
      mempw: pw
    }
    let url = new URL(baseURL.toJSON())
    url.pathname = '/user/doLogin.do'
    console.log(url.toJSON())
    withCookie.post(url.toJSON(), qs.stringify(loginForm), {headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }}).then(resolve)
  })
}

async function getRemainPeriod(): Promise<void> {
  let url = new URL(baseURL.toJSON())
  url.pathname = ''
}

loginAccount('kimdu12345', 'a1234567890').then(console.log)