"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAPI = exports.getRentStatus = exports.rentBike = exports.getStationRacks = exports.getStations = void 0;
const superagent = __importStar(require("superagent"));
const baseURL = new URL('https://app.nubija.com');
//Make cookie persistent
let withCookies = superagent.agent();
//Set user-agent to mobile
withCookies.set('User-Agent', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36');
function loginAccount(id, pw, mobile) {
    return __awaiter(this, void 0, void 0, function* () {
        let loginForm = {
            mobile: mobile,
            memid: id,
            mempw: pw
        };
        let url = new URL(baseURL.toJSON());
        url.pathname = '/user/doLogin.do';
        let loginRes = yield withCookies.post(url.toJSON())
            .type('form')
            .send(loginForm);
        if (loginRes.text.includes('등록된 사용자가 없거나 비밀번호가 잘못되었습니다.')) {
            throw 'Invalid ID or password!';
        }
    });
}
function setMobile() {
    return __awaiter(this, void 0, void 0, function* () {
        let addMobileChkUrl = new URL(baseURL.toJSON());
        addMobileChkUrl.pathname = '/user/addMobileChk.do';
        let mobileRes = yield withCookies.get(addMobileChkUrl.toJSON());
        //Parse form data (mobile)
        let mobile = mobileRes.text.substr(mobileRes.text.indexOf('value="') + 7);
        mobile = mobile.substr(0, mobile.indexOf('"'));
        withCookies.jar.setCookie('mobile=' + mobile);
        let setMobileUrl = new URL(baseURL.toJSON());
        setMobileUrl.pathname = '/user/setMobileDo.do';
        yield withCookies.post(setMobileUrl.toJSON())
            .type('form')
            .send({ mobile: mobile });
        //After set mobile, should logout to update JSESSIONID
        let logoutUrl = new URL(baseURL.toJSON());
        logoutUrl.pathname = '/user/logoutDo.do';
        let logoutRes = yield superagent.get(logoutUrl.toJSON());
        //Update cookie 'JSESSIONID'
        withCookies.jar.setCookie(logoutRes.header['set-cookie'][0]);
        return mobile;
    });
}
class Station {
    constructor(num, name, id, lent, park, lat, long, addr) {
        this.num = num;
        this.name = name;
        this.id = id;
        this.lent = parseInt(lent);
        this.park = parseInt(park);
        this.lat = parseFloat(lat);
        this.long = parseFloat(long);
        this.addr = addr;
    }
}
function getStations() {
    return __awaiter(this, void 0, void 0, function* () {
        let url = new URL(baseURL.toJSON());
        url.pathname = '/terminal/getTmMapState.do';
        let stationRes = yield withCookies.get(url.toJSON());
        let terminals = stationRes.text.match(/terminalDrow.+;/g);
        if (terminals == null) {
            throw 'Invalid Data!';
        }
        return terminals.map(terminal => terminal.substr(14).slice(0, -3).split(/',\s*'/)).map(arr => {
            return new Station(arr[0], arr[1], arr[2], arr[5], arr[6], arr[7], arr[8], arr[12]);
        });
    });
}
exports.getStations = getStations;
function getStationRacks(stationId) {
    return __awaiter(this, void 0, void 0, function* () {
        let url = new URL(baseURL.toJSON());
        url.pathname = '/rent/getRackLentRead.do';
        url.searchParams.set('tmid', stationId);
        let racksRes = yield withCookies.get(url.toJSON());
        let allButtons = racksRes.text.match(/<button.+/g);
        if (allButtons == null) {
            throw 'Racks are not exist!';
        }
        let racks = allButtons.map(button => {
            return {
                num: button.substr(button.indexOf('">') + 2).slice(0, -9),
                avail: button.includes('rental_able')
            };
        });
        return racks;
    });
}
exports.getStationRacks = getStationRacks;
function rentBike(stationId, rackNum, bikeNo) {
    return __awaiter(this, void 0, void 0, function* () {
        let rentForm = {
            tmid: stationId,
            rackid: rackNum,
            fullrackid: stationId + rackNum,
            bikeno: bikeNo,
            tmname: undefined
        };
        let url = new URL(baseURL.toJSON());
        url.pathname = '/rent/rentDo.do';
        let rentRes = yield withCookies.post(url.toJSON())
            .type('form')
            .send(rentForm);
        if (rentRes.text.includes('오류입니다.') || rentRes.text.includes('대여실패')) {
            if (rentRes.text.includes('자전거번호를 다시 확인하십시요!')) {
                throw 'Invalid Bike Num!';
            }
            throw 'Invalid request!';
        }
        return;
    });
}
exports.rentBike = rentBike;
function getRentStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        let url = new URL(baseURL.toJSON());
        url.pathname = '/svc/rentInfo.do';
        let rentStatRes = yield withCookies.get(url.toJSON());
        let trimmedStr = rentStatRes.text.substr(rentStatRes.text.indexOf('impact"> ') + 8).trim().replace(/\s+/g, ' ');
        trimmedStr = trimmedStr.substr(0, trimmedStr.indexOf('</span>'));
        if (trimmedStr.includes('반납') || trimmedStr.includes('대여')) {
            return trimmedStr;
        }
        else {
            throw 'Cannot fetch rent status! May be not logined?';
        }
    });
}
exports.getRentStatus = getRentStatus;
function initAPI(id, pw) {
    //Reset cookie jar
    withCookies = superagent.agent();
    //Set user-agent to mobile
    withCookies.set('User-Agent', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36');
    //Login and set mobile
    return loginAccount(id, pw).then(setMobile).then(mobile => loginAccount(id, pw, mobile));
}
exports.initAPI = initAPI;
//# sourceMappingURL=index.js.map